import { describe, it, expect } from 'vitest';
import { rulerLabelTop } from '../src/drawings/renderers/ruler';

// The readout pill sits below the box (top = maxY + gap) when it fits, flips
// above (top = minY - gap - pillH) when the box runs to the pane floor, and
// clamps inside the pane when neither side has room.
const PILL_H = 32;
const GAP = 6;
const PANE = 400;

describe('rulerLabelTop', () => {
  it('sits below a box mid-pane', () => {
    const minY = 100;
    const maxY = 150;
    expect(rulerLabelTop(minY, maxY, PILL_H, PANE, GAP)).toBe(maxY + GAP);
  });

  it('stays below at the exact-fit boundary (inclusive)', () => {
    // maxY + gap + pillH === priceHeight
    const maxY = PANE - GAP - PILL_H; // 362
    const minY = maxY - 40;
    expect(rulerLabelTop(minY, maxY, PILL_H, PANE, GAP)).toBe(maxY + GAP);
  });

  it('flips above one pixel tighter', () => {
    const maxY = PANE - GAP - PILL_H + 1; // 363 — below would overflow by 1
    const minY = maxY - 40;
    expect(rulerLabelTop(minY, maxY, PILL_H, PANE, GAP)).toBe(minY - GAP - PILL_H);
  });

  it('clamps inside the pane when the box hugs both top and floor', () => {
    // minY at the very top, maxY at the floor: neither side fits.
    const minY = 0;
    const maxY = PANE;
    const top = rulerLabelTop(minY, maxY, PILL_H, PANE, GAP);
    expect(top).toBeGreaterThanOrEqual(0);
    expect(top).toBeLessThanOrEqual(PANE - PILL_H);
  });

  it('never returns a negative top when the pill is taller than the pane', () => {
    const tiny = 20; // pillH (32) > pane (20)
    expect(rulerLabelTop(0, tiny, PILL_H, tiny, GAP)).toBe(0);
  });
});
