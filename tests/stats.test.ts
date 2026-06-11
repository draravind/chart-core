import { describe, it, expect } from 'vitest';
import type { Candle } from '../src/types';
import { computeStats } from '../src/stats/computeStats';
import type {
  StatsCell,
  StatsRow,
  StatsViewModel,
} from '../src/stats/computeStats';
import type { StatsMarket, StatsTableData } from '../src/stats/types';

// ---- builders ---------------------------------------------------------------

// Constant-volatility bars: close==100, high/low at ±r → TR==200r, trNorm==2r,
// so SMA(any window) == 2r and ATR == 200r at the last index regardless of window.
function constBars(n: number, r: number): Candle[] {
  const out: Candle[] = [];
  for (let i = 0; i < n; i++) {
    out.push({
      date: `d${i}`,
      open: 100,
      high: 100 * (1 + r),
      low: 100 * (1 - r),
      close: 100,
      volume: 0,
    });
  }
  return out;
}

// Bars from an explicit close list (high/low track close at ±1% — irrelevant to
// the fundamentals math, which only reads close).
function closeBars(closes: number[]): Candle[] {
  return closes.map((c, i) => ({
    date: `d${i}`,
    open: c,
    high: c * 1.01,
    low: c * 0.99,
    close: c,
    volume: 0,
  }));
}

function cells(row: StatsRow): StatsCell[] {
  return row.kind === 'cells' ? row.cells : [];
}

// Fundamentals present → value row is rows[3]; ATR value row is always last.
function fundValues(m: StatsViewModel): StatsCell[] {
  return cells(m.rows[3]);
}
function atrValues(m: StatsViewModel): StatsCell[] {
  return cells(m.rows[m.rows.length - 1]);
}

const noFund: StatsTableData = {};

// ---- ATR parity -------------------------------------------------------------

describe('computeStats — ATR rows', () => {
  it('constant volatility: all three ATR windows equal, *0.5 display, level by band', () => {
    // r=0.03 → trNorm 0.06 → ATR 6.0 (>5 strong); display formatNumber(3.0)="3.0".
    const m = computeStats(constBars(130, 0.03), noFund, 'India');
    const [a6, a3, a1] = atrValues(m);
    expect(a6).toEqual({ text: '3.0 %', level: 'strong' });
    expect(a3).toEqual({ text: '3.0 %', level: 'strong' });
    expect(a1).toEqual({ text: '3.0 %', level: 'strong' });
  });

  it('threshold bands map correctly across up/neutral/down', () => {
    // up: ATR 4.4
    expect(atrValues(computeStats(constBars(130, 0.022), noFund, 'India'))[0]).toEqual(
      { text: '2.2 %', level: 'up' },
    );
    // neutral: ATR 3.6
    expect(atrValues(computeStats(constBars(130, 0.018), noFund, 'India'))[0]).toEqual(
      { text: '1.8 %', level: 'neutral' },
    );
    // down: ATR 2.0
    expect(atrValues(computeStats(constBars(130, 0.01), noFund, 'India'))[0]).toEqual(
      { text: '1.0 %', level: 'down' },
    );
  });

  it('distinct windows reflect recency (1M=fast, 6M=slow blend)', () => {
    // 129 bars @ trNorm 0.02 (r=0.01) then 21 bars @ trNorm 0.06 (r=0.03).
    const bars = [...constBars(129, 0.01), ...constBars(21, 0.03)];
    const [a6, a3, a1] = atrValues(computeStats(bars, noFund, 'India'));
    // 1M (last 21) = 0.06 → ATR 6.0 strong.
    expect(a1).toEqual({ text: '3.0 %', level: 'strong' });
    // 3M (last 63 = 42×0.02 + 21×0.06)/63 → ATR 3.333 → neutral; *0.5=1.667→"1.7".
    expect(a3).toEqual({ text: '1.7 %', level: 'neutral' });
    // 6M (last 125 = 104×0.02 + 21×0.06)/125 → ATR 2.672 → down; *0.5=1.336→"1.3".
    expect(a6).toEqual({ text: '1.3 %', level: 'down' });
  });

  it('short history (<126 bars) blanks ATR-6M with no stale value', () => {
    const m = computeStats(constBars(100, 0.03), noFund, 'India');
    const [a6, a3, a1] = atrValues(m);
    expect(a6).toEqual({ text: '', level: 'muted' }); // sma(125) all-NaN
    expect(a3.text).toBe('3.0 %'); // sma(63) ok
    expect(a1.text).toBe('3.0 %'); // sma(21) ok
  });

  it('zero close inside the window blanks the cells instead of "Infinity %"', () => {
    // close=0 → trNorm Infinity at that bar; every window still holding it
    // yields a non-finite SMA at the last index — must blank, not render.
    const bars = constBars(130, 0.03);
    bars[125] = { ...bars[125], close: 0 };
    const [a6, a3, a1] = atrValues(computeStats(bars, noFund, 'India'));
    expect(a6).toEqual({ text: '', level: 'muted' });
    expect(a3).toEqual({ text: '', level: 'muted' });
    expect(a1).toEqual({ text: '', level: 'muted' });
  });
});

// ---- Fundamentals -----------------------------------------------------------

describe('computeStats — fundamentals', () => {
  it('Free Float % is passed through directly; bands map', () => {
    const base = closeBars([100, 100, 100]);
    const ff = (pct: number) =>
      fundValues(computeStats(base, { freeFloatPercent: pct }, 'India'))[1];
    // 30% → up
    expect(ff(30)).toEqual({ text: '30 %', level: 'up' });
    // 60% → neutral
    expect(ff(60)).toEqual({ text: '60 %', level: 'neutral' });
    // 20% → neutral
    expect(ff(20)).toEqual({ text: '20 %', level: 'neutral' });
    // 15% → down (one decimal, <10? no — 15 rounds to "15")
    expect(ff(15)).toEqual({ text: '15 %', level: 'down' });
  });

  it('India Mkt Cap uses prior close, units ₹1000cr (K), threshold boundaries', () => {
    // closePrev=100, closeLast=200 → mc must use 100.
    const bars = closeBars([100, 100, 200]);
    const mc = (shares: number) =>
      fundValues(computeStats(bars, { sharesOutstanding: shares }, 'India'))[0];
    // shares 5e8 → mc 5 → up, "5.0 K" (5<10 → one decimal; if it used
    // closeLast=200 it'd be mc 10 → "10 K")
    expect(mc(5e8)).toEqual({ text: '5.0 K', level: 'up' });
    // mc 1 → neutral boundary, one-decimal label
    expect(mc(1e8)).toEqual({ text: '1.0 K', level: 'neutral' });
    // mc 0.5 → down, one-decimal label
    expect(mc(5e7)).toEqual({ text: '0.5 K', level: 'down' });
  });

  it('US Mkt Cap: M vs B branch + thresholds', () => {
    const bars = closeBars([100, 100, 100]);
    const mc = (shares: number) =>
      fundValues(computeStats(bars, { sharesOutstanding: shares }, 'US'))[0];
    // mc 2000 (>1000) → B branch, formatNumber(2)→"2.0 B"; 2000>=2000 → up
    expect(mc(2e7)).toEqual({ text: '2.0 B', level: 'up' });
    // mc 500 → M branch, neutral
    expect(mc(5e6)).toEqual({ text: '500 M', level: 'neutral' });
    // mc 100 → M branch, down
    expect(mc(1e6)).toEqual({ text: '100 M', level: 'down' });
  });

  it('PE uses last close, EPS rounded to 2dp before dividing, negatives kept', () => {
    // closeLast=200 → PE 200/8 = 25
    const bars = closeBars([100, 100, 200]);
    expect(fundValues(computeStats(bars, { eps: 8 }, 'India'))[2]).toEqual({
      text: '25',
      level: 'text',
    });
    // negative EPS → negative PE, not blanked
    expect(fundValues(computeStats(bars, { eps: -8 }, 'India'))[2]).toEqual({
      text: '-25',
      level: 'text',
    });
    // round-to-2dp BEFORE dividing: closeLast=100, eps 1.004 → round2=1 → PE 100
    // (dividing by the raw 1.004 would give 99.6).
    const bars2 = closeBars([100, 100, 100]);
    expect(fundValues(computeStats(bars2, { eps: 1.004 }, 'India'))[2].text).toBe('100');
  });

  it('PE blanks when EPS rounds to 0', () => {
    // sector keeps the fundamental block visible so the blanked PE cell exists.
    const bars = closeBars([100, 100, 200]);
    expect(
      fundValues(computeStats(bars, { sector: 'X', eps: 0.004 }, 'India'))[2].text,
    ).toBe('');
    expect(
      fundValues(computeStats(bars, { sector: 'X', eps: 0 }, 'India'))[2].text,
    ).toBe('');
  });
});

// ---- Guards & collapse ------------------------------------------------------

describe('computeStats — guards & collapse', () => {
  it('missing/0/NaN share counts blank the dependent cell', () => {
    const bars = closeBars([100, 100, 100]);
    // sector keeps the block visible so blanked dependent cells exist to inspect.
    // outstanding missing → mc blanks; ff is now independent and still renders.
    let v = fundValues(
      computeStats(bars, { sector: 'X', freeFloatPercent: 30 }, 'India'),
    );
    expect(v[0].text).toBe(''); // mc (needs outstanding)
    expect(v[1].text).toBe('30 %'); // ff independent of outstanding
    // outstanding 0 → mc blanks (ff still renders)
    v = fundValues(
      computeStats(
        bars,
        { sector: 'X', sharesOutstanding: 0, freeFloatPercent: 30 },
        'India',
      ),
    );
    expect(v[0].text).toBe('');
    expect(v[1].text).toBe('30 %');
    // free float NaN → ff blank, mc present
    v = fundValues(
      computeStats(
        bars,
        { sector: 'X', sharesOutstanding: 1e8, freeFloatPercent: NaN },
        'India',
      ),
    );
    expect(v[0].text).not.toBe(''); // mc present
    expect(v[1].text).toBe(''); // ff blank
  });

  it('missing/0/NaN free-float % blanks only the ff cell', () => {
    const bars = closeBars([100, 100, 100]);
    // sector keeps the block visible; outstanding present so mc/the rest render.
    const ffCell = (table: StatsTableData) =>
      fundValues(computeStats(bars, { sector: 'X', sharesOutstanding: 1e8, ...table }, 'India'))[1];
    expect(ffCell({})).toEqual({ text: '', level: 'muted' }); // missing
    expect(ffCell({ freeFloatPercent: 0 })).toEqual({ text: '', level: 'muted' }); // 0
    expect(ffCell({ freeFloatPercent: NaN })).toEqual({ text: '', level: 'muted' }); // NaN
    // a present % still gets the % suffix + color band (library owns formatting)
    expect(ffCell({ freeFloatPercent: 45 })).toEqual({ text: '45 %', level: 'up' });
    // the rest of the panel still renders (mc present)
    const v = fundValues(
      computeStats(bars, { sector: 'X', sharesOutstanding: 1e8 }, 'India'),
    );
    expect(v[0].text).not.toBe('');
  });

  it('all-absent fundamentals → ATR-only view-model (collapse)', () => {
    const m = computeStats(constBars(130, 0.03), undefined, 'India');
    // Only the ATR header + ATR values rows remain.
    expect(m.rows).toHaveLength(2);
    expect(cells(m.rows[0])[0].text).toBe('ATR 6M');
    expect(atrValues(m)[0].text).toBe('3.0 %');
  });

  it('any present fundamental keeps the full fundamental block (with blanks)', () => {
    const m = computeStats(constBars(130, 0.03), { sector: 'Tech' }, 'India');
    expect(m.rows[0]).toEqual({ kind: 'merged', cell: { text: 'Tech', level: 'text' } });
    expect(m.rows[1]).toEqual({ kind: 'merged', cell: { text: '', level: 'text' } });
    // header + values + ATR header + ATR values
    expect(m.rows).toHaveLength(6);
  });
});

// ---- formatNumber edge cases (via mc labels) --------------------------------

describe('computeStats — formatNumber', () => {
  it('< 10 → one decimal; >= 10 → rounded integer', () => {
    const bars = closeBars([100, 100, 100]);
    const mc = (shares: number, market: StatsMarket) =>
      fundValues(computeStats(bars, { sharesOutstanding: shares }, market))[0].text;
    // India mc 0.5 → "0.5 K" (one decimal)
    expect(mc(5e7, 'India')).toBe('0.5 K');
    // India mc 50 → "50 K" (rounded)
    expect(mc(5e9, 'India')).toBe('50 K');
  });
});
