import { describe, it, expect } from 'vitest';
import {
  clampPanDeltaPx,
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

describe('clampPanDeltaPx', () => {
  const len = 1000;
  const visibleBars = 100;
  const step = 10; // px per bar slot
  const { minOffset, maxOffset } = panOffsetLimits(len, visibleBars);

  it('passes an in-range delta through untouched, both directions', () => {
    expect(clampPanDeltaPx(250, 0, minOffset, maxOffset, step)).toBe(250);
    expect(clampPanDeltaPx(-250, 0, minOffset, maxOffset, step)).toBe(-250);
    expect(clampPanDeltaPx(0, 0, minOffset, maxOffset, step)).toBe(0);
  });

  it('clamps a backward overshoot to the maxOffset edge', () => {
    // dx > 0 pans back in time; from offset 0 the room is (999 - 0) * 10.
    expect(clampPanDeltaPx(99999, 0, minOffset, maxOffset, step)).toBe(
      (maxOffset - 0) * step,
    );
    expect(clampPanDeltaPx(99999, 500, minOffset, maxOffset, step)).toBe(
      (maxOffset - 500) * step,
    );
  });

  it('clamps a forward overshoot to the minOffset edge', () => {
    expect(clampPanDeltaPx(-99999, 0, minOffset, maxOffset, step)).toBe(
      (minOffset - 0) * step,
    );
    expect(clampPanDeltaPx(-99999, -50, minOffset, maxOffset, step)).toBe(
      (minOffset + 50) * step,
    );
  });

  it('freezes motion further out when already parked at a limit, but not motion back in', () => {
    // Parked at the backward limit: more backward drag yields nothing.
    expect(clampPanDeltaPx(400, maxOffset, minOffset, maxOffset, step)).toBe(0);
    expect(clampPanDeltaPx(-400, maxOffset, minOffset, maxOffset, step)).toBe(
      -400,
    );
    // Parked at the forward limit: mirror image.
    expect(clampPanDeltaPx(-400, minOffset, minOffset, maxOffset, step)).toBe(0);
    expect(clampPanDeltaPx(400, minOffset, minOffset, maxOffset, step)).toBe(
      400,
    );
  });

  // Chart.tsx's onMove: the delta is measured from the mousedown anchor, and the
  // anchor is moved by whatever the clamp discarded. Without that re-anchoring the
  // pointer banks travel past the limit and a reversal has to spend it again
  // before the chart moves — a dead zone the size of the overshoot.
  function dragger(startOffset: number, min: number, max: number, step: number) {
    let anchorX = 0;
    return (clientX: number) => {
      const raw = clientX - anchorX;
      const dx = clampPanDeltaPx(raw, startOffset, min, max, step);
      if (dx !== raw) anchorX += raw - dx;
      return dx;
    };
  }

  it('reverses immediately after overshooting the limit — no dead zone', () => {
    const move = dragger(0, minOffset, maxOffset, step);
    const dxMax = (maxOffset - 0) * step;
    expect(move(dxMax)).toBe(dxMax); // pinned at the limit
    expect(move(dxMax + 150)).toBe(dxMax); // 150px past it: still pinned
    expect(move(dxMax + 149)).toBe(dxMax - 1); // one px back moves one px
    expect(move(dxMax + 120)).toBe(dxMax - 30); // 30px back moves 30px
  });

  it('re-anchors at the forward limit too', () => {
    const move = dragger(0, minOffset, maxOffset, step);
    const dxMin = (minOffset - 0) * step;
    expect(move(dxMin - 400)).toBe(dxMin);
    expect(move(dxMin - 399)).toBe(dxMin + 1);
  });

  it('keeps 0 inside the window for a fractional minOffset, given a clamped startOffset', () => {
    // trading_app rounds visibleBars, but the library does not require a host to.
    const fracBars = 100.6;
    const lim = panOffsetLimits(len, fracBars);
    expect(lim.minOffset).toBeCloseTo(-99.6);
    // A host offset past the fractional forward limit, clamped as Chart.tsx now
    // does at mousedown — without this the window inverts and dx=0 moves.
    const startOffset = clampPanOffset(-200, len, fracBars);
    expect(startOffset).toBeCloseTo(lim.minOffset);
    expect(
      clampPanDeltaPx(0, startOffset, lim.minOffset, lim.maxOffset, step),
    ).toBe(0);
    expect(
      clampPanDeltaPx(-500, startOffset, lim.minOffset, lim.maxOffset, step),
    ).toBe(0);
    expect(
      clampPanDeltaPx(500, startOffset, lim.minOffset, lim.maxOffset, step),
    ).toBe(500);
  });
});
