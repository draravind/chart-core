import { describe, it, expect } from 'vitest';
import {
  rawMaxVisibleBars,
  maxVisibleBarsForWidth,
  MIN_VISIBLE_BARS,
  MIN_BAR_STEP_PX,
} from '../src/utils/chartCalculations';

describe('rawMaxVisibleBars', () => {
  it('fits floor((width - chrome) / step) bar slots', () => {
    // (1200 - 78) / 2 = 561
    expect(rawMaxVisibleBars(1200)).toBe(561);
  });

  it('respects MIN_BAR_STEP_PX = 2', () => {
    expect(MIN_BAR_STEP_PX).toBe(2);
  });
});

describe('maxVisibleBarsForWidth — mark snapping (D4/D5)', () => {
  it('snaps a ~1200px chart to the 2Y mark (504)', () => {
    expect(maxVisibleBarsForWidth(1200)).toBe(504);
  });

  it('stays at 2Y until 3Y (756) fits (needs ≥1590px)', () => {
    expect(maxVisibleBarsForWidth(1300)).toBe(504);
  });

  it('reaches 3Y (756) on a wide monitor', () => {
    expect(maxVisibleBarsForWidth(1600)).toBe(756);
  });

  it('reaches 5Y (1260) on an ultrawide monitor', () => {
    expect(maxVisibleBarsForWidth(2600)).toBe(1260);
  });
});

describe('maxVisibleBarsForWidth — narrow fallback', () => {
  it('falls back to the raw cap when even 3M does not fit', () => {
    // raw = floor((200 - 78) / 2) = 61; no mark ≤ 61 → raw fallback, no throw.
    expect(maxVisibleBarsForWidth(200)).toBe(61);
  });

  it('snaps to 6M (132) on a small panel', () => {
    // raw = floor((400 - 78) / 2) = 161 → largest mark ≤ 161 is 132 (6M).
    expect(maxVisibleBarsForWidth(400)).toBe(132);
  });
});

// The render-scope clamp Chart.tsx applies: cap a too-wide value, floor a too-small one.
const clamp = (visibleBars: number, cap: number) =>
  Math.max(MIN_VISIBLE_BARS, Math.min(visibleBars, cap));

describe('cap clamp logic', () => {
  it('corrects an over-wide value down to the cap', () => {
    const cap = maxVisibleBarsForWidth(1200); // 504
    expect(clamp(900, cap)).toBe(504);
  });

  it('floors a value below MIN_VISIBLE_BARS', () => {
    expect(clamp(3, 504)).toBe(MIN_VISIBLE_BARS);
  });

  it('leaves an in-range value untouched', () => {
    expect(clamp(252, 504)).toBe(252);
  });
});
