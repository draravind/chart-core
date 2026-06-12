import { describe, it, expect } from 'vitest';
import {
  applySubpaneDrag,
  computeSubpaneBands,
  computeSubpaneDomain,
} from '../src/indicators/subpaneLayout';
import { rsLineDef } from '../src/indicators/builtins/rsLine';

describe('def autofit-key selection (the new Chart-side seam)', () => {
  it('rsLineDef.autofitKeys returns only [rs] — the 0/1 signal is excluded', () => {
    const settings = {
      lookback: 252,
      lineColor: 'var(--rs-line)',
      signalColor: 'var(--rs-signal)',
    };
    expect(rsLineDef.autofitKeys!(settings)).toEqual(['rs']);
  });
});

const RATIOS = { heightRatio: 0.13, floorRatio: 0.45 };

describe('computeSubpaneBands (D1 height policy)', () => {
  it('no subpanes → price fills the whole space, fullHeight == total', () => {
    const r = computeSubpaneBands({
      totalHeight: 1000,
      subpaneKeys: [],
      ...RATIOS,
    });
    expect(r.subpanes).toHaveLength(0);
    expect(r.priceHeight).toBe(1000);
    expect(r.fullHeight).toBe(1000);
  });

  it('few panes use the fixed per-pane height; price stays above the floor', () => {
    // Volume is an ordinary subpane now; model it as a `'volume'` band.
    const r = computeSubpaneBands({
      totalHeight: 1000,
      subpaneKeys: ['volume', 'rsi', 'macd'],
      ...RATIOS,
    });
    // Fixed height = 13% each; price = 1000 - 3*130 = 610 ≥ floor 450.
    expect(r.subpanes.map((p) => p.height)).toEqual([130, 130, 130]);
    expect(r.priceHeight).toBeCloseTo(610, 6);
    // Panes stack flush below the price pane (no gap).
    expect(r.subpanes[0].top).toBeCloseTo(610, 6);
    expect(r.subpanes[1].top).toBeCloseTo(r.subpanes[0].bottom, 6);
    expect(r.subpanes[2].top).toBeCloseTo(r.subpanes[1].bottom, 6);
    // fullHeight is the lowest pane bottom and equals the total height.
    expect(r.fullHeight).toBeCloseTo(1000, 6);
    expect(r.subpanes[r.subpanes.length - 1].bottom).toBeCloseTo(r.fullHeight, 6);
  });

  it('many panes pin the price floor and split the leftover zone equally', () => {
    const keys = ['volume', 'rsi', 'macd', 'stoch', 'willr', 'adx', 'atr'];
    const r = computeSubpaneBands({
      totalHeight: 1000,
      subpaneKeys: keys,
      ...RATIOS,
    });
    // 7 panes at fixed 130 would drop price below the 450 floor → floor pins.
    expect(r.priceHeight).toBeCloseTo(450, 6);
    const leftover = 1000 - 450;
    const expected = leftover / keys.length;
    for (const p of r.subpanes) expect(p.height).toBeCloseTo(expected, 6);
    expect(r.fullHeight).toBeCloseTo(1000, 6);
  });
});

describe('computeSubpaneDomain', () => {
  const lineOf = (vals: number[], isMarker = false) => ({
    values: Float64Array.from(vals),
    isMarker,
  });

  it('fixedDomain wins outright (bounded oscillator)', () => {
    const d = computeSubpaneDomain({
      hint: { fixedDomain: [0, 100] },
      lines: [lineOf([12, 88, 50])],
      visStart: 0,
      visEnd: 3,
      defaultPad: 0.08,
    });
    expect(d).toEqual([0, 100]);
  });

  it('autofit pads symmetrically about zero when zeroLine is set', () => {
    const d = computeSubpaneDomain({
      hint: { zeroLine: true, autofitPadding: 0 },
      lines: [lineOf([-2, 5, -1])],
      visStart: 0,
      visEnd: 3,
      defaultPad: 0.08,
    });
    // m = max(|-2|,|5|) = 5, pad 0 → symmetric [-5, 5].
    expect(d).toEqual([-5, 5]);
  });

  it('REGRESSION: a 0/1 marker series does not affect the autofit domain', () => {
    const real = lineOf([100, 101, 99, 102]);
    const marker = lineOf([0, 1, 0, 1], true); // RS signal-style marker
    const withMarker = computeSubpaneDomain({
      hint: undefined,
      lines: [real, marker],
      visStart: 0,
      visEnd: 4,
      defaultPad: 0,
    });
    const withoutMarker = computeSubpaneDomain({
      hint: undefined,
      lines: [real],
      visStart: 0,
      visEnd: 4,
      defaultPad: 0,
    });
    expect(withMarker).toEqual(withoutMarker);
    // The marker's 0/1 values must NOT pull the low end down to 0.
    expect(withMarker![0]).toBe(99);
    expect(withMarker![1]).toBe(102);
  });

  it('returns null when no finite value exists in the window', () => {
    const d = computeSubpaneDomain({
      hint: undefined,
      lines: [lineOf([NaN, NaN])],
      visStart: 0,
      visEnd: 2,
      defaultPad: 0.08,
    });
    expect(d).toBeNull();
  });

  it('degenerate single-value window pads proportionally (no zero crossing)', () => {
    const d = computeSubpaneDomain({
      hint: undefined,
      lines: [lineOf([50, 50, 50])],
      visStart: 0,
      visEnd: 3,
      defaultPad: 0.08,
    });
    // spread = |50| * 0.1 = 5 → [45, 55].
    expect(d).toEqual([45, 55]);
  });

  it('includeZero spans zero for all-positive series', () => {
    const d = computeSubpaneDomain({
      hint: { includeZero: true, autofitPadding: 0 },
      lines: [lineOf([10, 20, 30])],
      visStart: 0,
      visEnd: 3,
      defaultPad: 0.08,
    });
    // lo clamped to 0, hi 30, pad 0 → [0, 30].
    expect(d).toEqual([0, 30]);
  });

  it('includeZero spans below zero for negative series', () => {
    const d = computeSubpaneDomain({
      hint: { includeZero: true, autofitPadding: 0 },
      lines: [lineOf([-5, -2, 8])],
      visStart: 0,
      visEnd: 3,
      defaultPad: 0.08,
    });
    expect(d).toEqual([-5, 8]); // already spans zero; unchanged
  });

  it('fixedDomain still wins over includeZero', () => {
    const d = computeSubpaneDomain({
      hint: { includeZero: true, fixedDomain: [0, 1] },
      lines: [lineOf([10, 20])],
      visStart: 0,
      visEnd: 2,
      defaultPad: 0.08,
    });
    expect(d).toEqual([0, 1]);
  });
});

describe('computeSubpaneBands — heightFactors / userHeights', () => {
  it('a factor-1.7 pane gets 1.7× the flat height', () => {
    const r = computeSubpaneBands({
      totalHeight: 1000,
      subpaneKeys: ['results'],
      ...RATIOS,
      heightFactors: { results: 1.7 },
    });
    // flat = 1000*0.13 = 130 → ×1.7 = 221.
    expect(r.subpanes[0].height).toBeCloseTo(221, 6);
    // priceHeight = 1000 - 221 = 779.
    expect(r.priceHeight).toBeCloseTo(779, 6);
  });

  it('the volume factor (1.154) reproduces ~15% of chart height', () => {
    const r = computeSubpaneBands({
      totalHeight: 1000,
      subpaneKeys: ['volume'],
      ...RATIOS,
      heightFactors: { volume: 1.154 },
    });
    // flat = 130 → ×1.154 = 150.02 ≈ the legacy 15% volume zone.
    expect(r.subpanes[0].height).toBeCloseTo(150.02, 6);
    expect(r.priceHeight).toBeCloseTo(849.98, 6);
  });

  it('omitting heightFactors is byte-identical to the flat policy', () => {
    const args = {
      totalHeight: 1000,
      subpaneKeys: ['rsi', 'macd'],
      ...RATIOS,
    };
    const flat = computeSubpaneBands(args);
    const withAllOnes = computeSubpaneBands({
      ...args,
      heightFactors: { rsi: 1, macd: 1 },
    });
    expect(withAllOnes).toEqual(flat);
  });

  it('floor redistribution scales proportionally (bigger pane stays bigger)', () => {
    const r = computeSubpaneBands({
      totalHeight: 1000,
      subpaneKeys: ['a', 'b', 'c'],
      ...RATIOS,
      heightFactors: { a: 1, b: 3, c: 3 },
    });
    // desired a=130, b=390, c=390 → price would be 90 < floor 450 → floor pins,
    // all scaled by leftover/sumDesired; the 3:1 ratio is preserved.
    expect(r.priceHeight).toBeCloseTo(450, 6);
    expect(r.subpanes[1].height / r.subpanes[0].height).toBeCloseTo(3, 6);
  });

  it('userHeights override the factor default; other panes keep defaults', () => {
    const r = computeSubpaneBands({
      totalHeight: 1000,
      subpaneKeys: ['results', 'rsi'],
      ...RATIOS,
      heightFactors: { results: 1.7 },
      userHeights: { results: 0.2 }, // 200px, overriding the 1.7 factor
    });
    expect(r.subpanes[0].height).toBeCloseTo(200, 6);
    expect(r.subpanes[1].height).toBeCloseTo(130, 6); // rsi keeps the flat default
  });
});

describe('applySubpaneDrag', () => {
  // Two panes, flat 130 each. priceHeight is passed explicitly below (550) as a
  // standalone clamp-logic fixture, independent of the computed band layout.
  const bands = computeSubpaneBands({
    totalHeight: 1000,
    subpaneKeys: ['a', 'b'],
    ...RATIOS,
  }).subpanes;
  const common = {
    bands,
    priceHeight: 550,
    totalHeight: 1000,
    minPanePx: 24,
    floorRatio: 0.45,
  };

  it('divider 0 dragged down shrinks subpane 0 and grows price', () => {
    const m = applySubpaneDrag({ ...common, dividerIndex: 0, dy: 40 });
    expect(m.a).toBeCloseTo(0.09, 6); // (130-40)/1000
    expect(m.b).toBeCloseTo(0.13, 6); // unchanged
  });

  it('divider 0 dragged up clamps at the price floor', () => {
    // maxUp = priceHeight - floor = 550 - 450 = 100 → dy clamped to -100.
    const m = applySubpaneDrag({ ...common, dividerIndex: 0, dy: -200 });
    expect(m.a).toBeCloseTo(0.23, 6); // (130 + 100)/1000
  });

  it('a divider between two panes trades only those two', () => {
    const m = applySubpaneDrag({ ...common, dividerIndex: 1, dy: 30 });
    expect(m.a).toBeCloseTo(0.16, 6); // 130+30
    expect(m.b).toBeCloseTo(0.1, 6); // 130-30
  });

  it('enforces the 24px subpane minimum', () => {
    const m = applySubpaneDrag({ ...common, dividerIndex: 0, dy: 999 });
    expect(m.a).toBeCloseTo(0.024, 6); // clamped to 24px
  });

  it('returns a fraction for every pane key', () => {
    const m = applySubpaneDrag({ ...common, dividerIndex: 0, dy: 10 });
    expect(Object.keys(m).sort()).toEqual(['a', 'b']);
  });
});
