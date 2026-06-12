import { describe, it, expect } from 'vitest';
import type { Candle, QuarterlyResult } from '../src/types';
import type { IndicatorInput } from '../src/indicators/types';
import {
  quarterlyResultsDef,
  computeYoYGrowth,
  filterColumnsBySpacing,
  readQrMeta,
} from '../src/indicators/builtins/quarterlyResults';
import {
  getIndicator,
  defaultConfigFor,
  SUBPANE_ORDER,
} from '../src/indicators/registry';

const DAY = 86_400_000;
const addDays = (iso: string, d: number): string =>
  new Date(new Date(iso).getTime() + d * DAY).toISOString().slice(0, 10);

function dailyBars(startIso: string, n: number): Candle[] {
  const out: Candle[] = [];
  for (let i = 0; i < n; i++) {
    const date = addDays(startIso, i);
    out.push({ date, open: 100, high: 100, low: 100, close: 100, volume: 0 });
  }
  return out;
}

function makeInput(
  bars: Candle[],
  rows: QuarterlyResult[],
  market: 'US' | 'India' = 'India',
): IndicatorInput {
  const n = bars.length;
  const c = Float64Array.from(bars.map((b) => b.close));
  return {
    o: c.slice(),
    h: c.slice(),
    l: c.slice(),
    c,
    v: new Float64Array(n),
    bars,
    quarterlyResults: rows,
    market,
  };
}

describe('computeYoYGrowth', () => {
  it('quarterly cadence matches the ~365d-back row, not adjacent quarters', () => {
    // Five quarters ~91d apart; eps rises each quarter.
    const base = '2024-01-15';
    const rows: QuarterlyResult[] = [0, 91, 182, 273, 364].map((d, i) => ({
      label: `Q${i}`,
      date: addDays(base, d),
      eps: 100 + i * 10, // 100,110,120,130,140
    }));
    const g = computeYoYGrowth(rows, 'eps');
    // Last row (140) vs the 4-back row (100): (140-100)/100*100 = 40.
    expect(g[4]).toBeCloseTo(40, 6);
    // The first four rows have no year-ago base within tolerance.
    expect(Number.isNaN(g[0])).toBe(true);
    expect(Number.isNaN(g[3])).toBe(true);
  });

  it('annual cadence matches the 1-back row', () => {
    const rows: QuarterlyResult[] = [
      { label: 'FY24', date: '2024-03-31', eps: 50 },
      { label: 'FY25', date: '2025-03-31', eps: 60 },
    ];
    const g = computeYoYGrowth(rows, 'eps');
    expect(Number.isNaN(g[0])).toBe(true);
    expect(g[1]).toBeCloseTo(20, 6); // (60-50)/50*100
  });

  it('tolerance edges: 39d ok, 41d NaN', () => {
    const cur = '2025-06-15';
    const target = addDays(cur, -365);
    const ok: QuarterlyResult[] = [
      { label: 'base', date: addDays(target, 39), eps: 100 },
      { label: 'cur', date: cur, eps: 110 },
    ];
    const bad: QuarterlyResult[] = [
      { label: 'base', date: addDays(target, 41), eps: 100 },
      { label: 'cur', date: cur, eps: 110 },
    ];
    expect(computeYoYGrowth(ok, 'eps')[1]).toBeCloseTo(10, 6);
    expect(Number.isNaN(computeYoYGrowth(bad, 'eps')[1])).toBe(true);
  });

  it('missing or zero base → NaN', () => {
    const cur = '2025-06-15';
    const target = addDays(cur, -365);
    const missing: QuarterlyResult[] = [
      { label: 'base', date: target, rps: 5 }, // no eps
      { label: 'cur', date: cur, eps: 110 },
    ];
    const zero: QuarterlyResult[] = [
      { label: 'base', date: target, eps: 0 },
      { label: 'cur', date: cur, eps: 110 },
    ];
    expect(Number.isNaN(computeYoYGrowth(missing, 'eps')[1])).toBe(true);
    expect(Number.isNaN(computeYoYGrowth(zero, 'eps')[1])).toBe(true);
  });

  it('negative base uses |base| (−2 → +1 ⇒ +150%)', () => {
    const cur = '2025-06-15';
    const target = addDays(cur, -365);
    const rows: QuarterlyResult[] = [
      { label: 'base', date: target, eps: -2 },
      { label: 'cur', date: cur, eps: 1 },
    ];
    expect(computeYoYGrowth(rows, 'eps')[1]).toBeCloseTo(150, 6);
  });
});

describe('quarterlyResultsDef.compute — alignment + step fill', () => {
  it('exact date lands on its bar; values NaN before the first anchor', () => {
    const bars = dailyBars('2025-01-01', 100);
    const rows: QuarterlyResult[] = [
      { label: 'Q', date: bars[50].date, eps: 12.5, rps: 200 },
    ];
    const s = quarterlyResultsDef.compute(makeInput(bars, rows), { display: 0 });
    expect(s.anchor[50]).toBe(0); // row ordinal 0
    expect(Number.isNaN(s.anchor[49])).toBe(true);
    expect(s.eps[50]).toBeCloseTo(12.5, 6);
    expect(s.eps[99]).toBeCloseTo(12.5, 6); // step-filled to the end
    expect(Number.isNaN(s.eps[49])).toBe(true); // before the first anchor
  });

  it('a weekend date snaps to the nearest preceding bar', () => {
    const bars: Candle[] = [
      '2025-01-01',
      '2025-01-02',
      '2025-01-03',
      '2025-01-06',
      '2025-01-07',
    ].map((date) => ({
      date,
      open: 100,
      high: 100,
      low: 100,
      close: 100,
      volume: 0,
    }));
    const rows: QuarterlyResult[] = [
      { label: 'Q', date: '2025-01-04', eps: 5 }, // Saturday → preceding bar idx 2
    ];
    const s = quarterlyResultsDef.compute(makeInput(bars, rows), { display: 0 });
    expect(s.anchor[2]).toBe(0);
    expect(Number.isNaN(s.anchor[3])).toBe(true);
  });

  it('out-of-range rows produce no anchor but still serve as growth bases', () => {
    const bars = dailyBars('2025-01-01', 100);
    const inRange = bars[80].date;
    const oldDate = addDays(inRange, -365); // before bars[0] → out of range
    const rows: QuarterlyResult[] = [
      { label: 'old', date: oldDate, eps: 100 },
      { label: 'new', date: inRange, eps: 120 },
    ];
    const s = quarterlyResultsDef.compute(makeInput(bars, rows), { display: 0 });
    // No anchor for the out-of-range row anywhere; only the in-range one.
    const anchorCount = Array.from(s.anchor).filter(
      (v) => !Number.isNaN(v),
    ).length;
    expect(anchorCount).toBe(1);
    expect(s.anchor[80]).toBe(1); // ordinal of 'new' (sorted ascending)
    // Growth at the in-range bar reflects the out-of-range base.
    expect(s.epsGrowth[80]).toBeCloseTo(20, 6);
  });
});

describe('quarterlyResultsDef meta channel', () => {
  const bars = dailyBars('2025-01-01', 60);
  const rows: QuarterlyResult[] = [
    { label: 'Q1', date: bars[30].date, eps: 12.34, rps: 2250.5 },
    { label: 'Q2', date: bars[50].date, rps: 99 }, // missing eps
  ];

  it('readQrMeta resolves through a warmup-slice (shared buffer)', () => {
    const s = quarterlyResultsDef.compute(makeInput(bars, rows), { display: 0 });
    const meta = readQrMeta(s.anchor.subarray(5));
    expect(meta).toBeDefined();
    expect(meta!.mode).toBe('text');
  });

  it('US market bakes $, India bakes ₹, en-US 2dp grouping, -- for missing', () => {
    const us = readQrMeta(
      quarterlyResultsDef.compute(makeInput(bars, rows, 'US'), { display: 0 })
        .anchor,
    )!;
    expect(us.rows[0].rpsText).toBe('$2,250.50');
    expect(us.rows[0].epsText).toBe('$12.34');
    expect(us.rows[1].epsText).toBe('--'); // missing eps

    const india = readQrMeta(
      quarterlyResultsDef.compute(makeInput(bars, rows, 'India'), {
        display: 0,
      }).anchor,
    )!;
    expect(india.rows[0].rpsText).toBe('₹2,250.50');
  });

  it('display:1 bakes bars mode; growth strings format as +x.x%', () => {
    const cur = '2025-06-15';
    const target = addDays(cur, -365);
    const yoyRows: QuarterlyResult[] = [
      { label: 'base', date: target, eps: 100, rps: 100 },
      { label: 'cur', date: cur, eps: 115, rps: 100 },
    ];
    const yoyBars = dailyBars(target, 400);
    const meta = readQrMeta(
      quarterlyResultsDef.compute(makeInput(yoyBars, yoyRows), { display: 1 })
        .anchor,
    )!;
    expect(meta.mode).toBe('bars');
    expect(meta.rows[1].epsGrowthText).toBe('+15.0%');
    expect(meta.rows[1].epsGrowthUp).toBe(true);
  });
});

describe('filterColumnsBySpacing', () => {
  it('keeps the newest, drops older columns within minSpacing', () => {
    const keep = filterColumnsBySpacing([0, 50, 100, 150], 70);
    expect(keep[3]).toBe(true); // newest always kept
    expect(keep[2]).toBe(false); // 50px from 150 → dropped
    expect(keep[1]).toBe(true); // 100px from 150 → kept
    expect(keep[0]).toBe(false); // 50px from 50 → dropped
  });

  it('sparse input keeps everything', () => {
    expect(filterColumnsBySpacing([0, 100, 200], 70)).toEqual([
      true,
      true,
      true,
    ]);
  });
});

describe('quarterlyResults registration + colors', () => {
  it('is registered and stacks first in SUBPANE_ORDER', () => {
    expect(getIndicator('results')).toBeDefined();
    expect(SUBPANE_ORDER[0]).toBe('results');
  });

  it('paneHeightFactor is 1.7', () => {
    expect(quarterlyResultsDef.paneHeightFactor).toBe(1.7);
  });

  it('scaleHintFor switches with display', () => {
    const text = quarterlyResultsDef.scaleHintFor!({ display: 0 });
    expect(text).toEqual({ fixedDomain: [0, 1], hideAxis: true });
    const bars = quarterlyResultsDef.scaleHintFor!({ display: 1 });
    expect(bars?.includeZero).toBe(true);
    expect(bars?.guideLines).toEqual([0]);
  });

  it('colorOverrides.eps wins without mutating defaultStyle', () => {
    const cfg = defaultConfigFor('results', {
      colorOverrides: { eps: '#123456' },
    });
    const epsLine = cfg!.style.lines.find((l) => l.seriesKey === 'eps')!;
    expect(epsLine.colorVar).toBe('#123456');
    // The shared singleton is untouched.
    const defEps = quarterlyResultsDef.defaultStyle.lines.find(
      (l) => l.seriesKey === 'eps',
    )!;
    expect(defEps.colorVar).toBe('var(--qr-eps)');
  });
});
