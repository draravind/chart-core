import { describe, it, expect } from 'vitest';
import {
  clampPanOffset,
  panOffsetLimits,
  maxVisibleBarsForWidth,
} from '../src/utils/chartCalculations';

// The engine's pan model (Chart.tsx layout memo):
//   visStart = max(0, floor(len - visibleBars - offset))
//   visEnd   = min(len, ceil(len - offset))
// The visible slice is data.slice(visStart, visEnd).
function viewport(len: number, visibleBars: number, offset: number) {
  const visStart = Math.max(0, Math.floor(len - visibleBars - offset));
  const visEnd = Math.min(len, Math.ceil(len - offset));
  return { visStart, visEnd, count: Math.max(0, visEnd - visStart) };
}

describe('panOffsetLimits', () => {
  it('stops forward with the newest bar against the left edge', () => {
    const len = 1000;
    const visibleBars = 100;
    const { minOffset } = panOffsetLimits(len, visibleBars);
    expect(minOffset).toBe(-99);
    const v = viewport(len, visibleBars, minOffset);
    expect(v.visStart).toBe(len - 1);
    expect(v.visEnd).toBe(len);
    expect(v.count).toBe(1); // exactly one real candle remains
  });

  it('stops backward with the oldest bar against the right edge', () => {
    const len = 1000;
    const visibleBars = 100;
    const { maxOffset } = panOffsetLimits(len, visibleBars);
    expect(maxOffset).toBe(len - 1);
    const v = viewport(len, visibleBars, maxOffset);
    expect(v.visStart).toBe(0);
    expect(v.visEnd).toBe(1);
    expect(v.count).toBe(1);
  });

  it('never yields an empty or negative-ended slice at either extreme', () => {
    for (const len of [1, 2, 50, 1000, 5481]) {
      for (const visibleBars of [10, 100, 959, 4000]) {
        const { minOffset, maxOffset } = panOffsetLimits(len, visibleBars);
        for (const off of [minOffset, maxOffset, 0]) {
          const v = viewport(len, visibleBars, off);
          // A negative visEnd would slice from the END of the array — the trap
          // the one-candle rule exists to prevent.
          expect(v.visEnd).toBeGreaterThanOrEqual(0);
          expect(v.count).toBeGreaterThanOrEqual(1);
        }
      }
    }
  });

  it('is symmetric: one screenful of empty space beyond each end', () => {
    const len = 1000;
    for (const visibleBars of [10, 100, 959]) {
      const { minOffset, maxOffset } = panOffsetLimits(len, visibleBars);
      const emptyRight = -minOffset;
      // Backward: slots left of bar 0 = visibleBars - (bars still on screen).
      const back = viewport(len, visibleBars, maxOffset);
      const emptyLeft = visibleBars - back.count;
      expect(emptyRight).toBe(visibleBars - 1);
      expect(emptyLeft).toBe(visibleBars - 1);
    }
  });

  it('reaches any anchor placed within the display ceiling, at full zoom-out', () => {
    // Overlay plugins bound anchor placement by `maxVisibleBars - 1`. That is
    // exactly the empty space the most-zoomed-out view can pan into, so nothing
    // droppable is ever stranded.
    const len = 1150;
    const ceiling = maxVisibleBarsForWidth(2000); // (2000 - 78) / 2 = 961
    expect(ceiling).toBe(961);
    const buffer = ceiling - 1;

    const { minOffset, maxOffset } = panOffsetLimits(len, ceiling);

    // Slot indices the viewport spans at each extreme, from the engine's own
    // formulas BEFORE the [0, len] clamps — i.e. what is on screen, including
    // empty space. The clamps only decide which of those slots hold candles.
    const rightmostSlot = Math.ceil(len - minOffset) - 1;
    const leftmostSlot = Math.floor(len - ceiling - maxOffset);

    // Every anchor the overlay can place must fall inside that span.
    expect(rightmostSlot).toBeGreaterThanOrEqual(len - 1 + buffer);
    expect(leftmostSlot).toBeLessThanOrEqual(-buffer);
  });

  it('clamps offsets outside the range and passes through those inside', () => {
    const len = 1000;
    expect(clampPanOffset(-5000, len, 100)).toBe(-99);
    expect(clampPanOffset(5000, len, 100)).toBe(999);
    expect(clampPanOffset(42, len, 100)).toBe(42);
    expect(clampPanOffset(0, len, 100)).toBe(0);
  });

  it('degrades safely for a single-bar series', () => {
    const { minOffset, maxOffset } = panOffsetLimits(1, 100);
    expect(maxOffset).toBe(0);
    expect(viewport(1, 100, maxOffset).count).toBe(1);
    expect(viewport(1, 100, minOffset).count).toBe(1);
  });
});
