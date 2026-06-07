import { describe, it, expect } from 'vitest';
import {
  computeSubpaneBands,
  computeSubpaneDomain,
} from '../src/indicators/subpaneLayout';

const RATIOS = { heightRatio: 0.13, gapRatio: 0.02, floorRatio: 0.45 };

describe('computeSubpaneBands (D1 height policy)', () => {
  it('no subpanes → price fills the non-volume space, fullHeight == total', () => {
    const r = computeSubpaneBands({
      totalHeight: 1000,
      volumeHeight: 150,
      gap: 0,
      subpaneKeys: [],
      ...RATIOS,
    });
    expect(r.subpanes).toHaveLength(0);
    expect(r.priceHeight).toBe(850);
    expect(r.fullHeight).toBe(1000);
  });

  it('few panes use the fixed per-pane height; price stays above the floor', () => {
    const r = computeSubpaneBands({
      totalHeight: 1000,
      volumeHeight: 150,
      gap: 0,
      subpaneKeys: ['rsi', 'macd'],
      ...RATIOS,
    });
    // Fixed height = 13% each; price = 1000 - 150 - 2*130 - 2*20 = 550 ≥ floor 450.
    expect(r.subpanes.map((p) => p.height)).toEqual([130, 130]);
    expect(r.priceHeight).toBeCloseTo(550, 6);
    // Panes stack contiguously below the volume area, each below a gap.
    expect(r.subpanes[0].top).toBeCloseTo(550 + 150 + 20, 6);
    expect(r.subpanes[1].top).toBeCloseTo(r.subpanes[0].bottom + 20, 6);
    // fullHeight is the lowest pane bottom and equals the total height.
    expect(r.fullHeight).toBeCloseTo(1000, 6);
    expect(r.subpanes[r.subpanes.length - 1].bottom).toBeCloseTo(r.fullHeight, 6);
  });

  it('many panes pin the price floor and split the leftover zone equally', () => {
    const keys = ['rsi', 'macd', 'stoch', 'willr', 'adx', 'atr'];
    const r = computeSubpaneBands({
      totalHeight: 1000,
      volumeHeight: 150,
      gap: 0,
      subpaneKeys: keys,
      ...RATIOS,
    });
    // 6 panes at fixed 130 would drop price below the 450 floor → floor pins.
    expect(r.priceHeight).toBeCloseTo(450, 6);
    const leftover = 1000 - 450 - 150 - 0 - keys.length * 20;
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
});
