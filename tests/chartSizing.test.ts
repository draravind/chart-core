import { describe, it, expect } from 'vitest';
import { resolveChartSizing } from '../src/chartSizing';

// The chart's real MARGIN / RIGHT_BUFFER (Chart.tsx), so the too-small threshold
// here matches production: usableWidth = width − right(60) − rightBuffer(18).
const MARGIN = { top: 4, right: 60, bottom: 30, left: 0 };
const RIGHT_BUFFER = 18;
const base = { margin: MARGIN, rightBuffer: RIGHT_BUFFER };

describe('resolveChartSizing — no height floor (re-draw-to-fit)', () => {
  it('a 200px box draws a 166px chart, NOT the old 300px floor', () => {
    const s = resolveChartSizing({
      measuredWidth: 800,
      measuredHeight: 200,
      ...base,
    });
    expect(s.draw).toBe(true);
    // totalHeight = 200 − top(4) − bottom(30) = 166. The old code floored at 300.
    expect(s.totalHeight).toBe(166);
    expect(s.height).toBe(200);
  });

  it('totalHeight tracks the box height 1:1', () => {
    for (const h of [120, 346, 500, 900]) {
      const s = resolveChartSizing({ measuredWidth: 800, measuredHeight: h, ...base });
      expect(s.totalHeight).toBe(h - MARGIN.top - MARGIN.bottom);
      expect(s.height).toBe(h);
    }
  });

  it('a tall box is unchanged from the old behaviour (648 → 614)', () => {
    const s = resolveChartSizing({ measuredWidth: 1000, measuredHeight: 648, ...base });
    // The 300 floor never bound above 334px, so this matches the pre-change math.
    expect(s.totalHeight).toBe(614);
  });
});

describe('resolveChartSizing — the draw gate', () => {
  it('is not drawn while unmeasured (either axis 0)', () => {
    expect(resolveChartSizing({ measuredWidth: 0, measuredHeight: 0, ...base }).draw).toBe(
      false,
    );
    expect(resolveChartSizing({ measuredWidth: 800, measuredHeight: 0, ...base }).draw).toBe(
      false,
    );
    expect(resolveChartSizing({ measuredWidth: 0, measuredHeight: 400, ...base }).draw).toBe(
      false,
    );
  });

  it('unmeasured is NOT flagged tooSmall (no spurious dev warning)', () => {
    expect(
      resolveChartSizing({ measuredWidth: 0, measuredHeight: 0, ...base }).tooSmall,
    ).toBe(false);
  });

  it('too narrow to place one bar → draw:false, tooSmall:true (~78px threshold)', () => {
    // usableWidth = width − 60 − 18. At 78 it is exactly 0 → too small.
    const at78 = resolveChartSizing({ measuredWidth: 78, measuredHeight: 400, ...base });
    expect(at78.draw).toBe(false);
    expect(at78.tooSmall).toBe(true);

    const at79 = resolveChartSizing({ measuredWidth: 79, measuredHeight: 400, ...base });
    expect(at79.draw).toBe(true);
    expect(at79.tooSmall).toBe(false);
  });
});

describe('resolveChartSizing — non-negative clamps (collapsed-box backstop)', () => {
  it('never returns a negative width or height', () => {
    const s = resolveChartSizing({ measuredWidth: 79, measuredHeight: 10, ...base });
    // height 10 − 34 margins would be negative; clamped to 1.
    expect(s.totalHeight).toBe(1);
    expect(s.width).toBeGreaterThanOrEqual(1);
  });
});

describe('resolveChartSizing — effective = prop ?? measured', () => {
  it('an explicit width/height overrides the measured box per axis', () => {
    const s = resolveChartSizing({
      propWidth: 500,
      propHeight: 300,
      measuredWidth: 800,
      measuredHeight: 900,
      ...base,
    });
    expect(s.height).toBe(300);
    expect(s.totalHeight).toBe(300 - MARGIN.top - MARGIN.bottom);
    expect(s.width).toBe(500 - MARGIN.left - MARGIN.right);
  });

  it('a prop sizes the chart even when the container measures 0 (SSR/jsdom path)', () => {
    const s = resolveChartSizing({
      propWidth: 640,
      propHeight: 480,
      measuredWidth: 0,
      measuredHeight: 0,
      ...base,
    });
    expect(s.draw).toBe(true);
    expect(s.height).toBe(480);
  });

  it('one axis from a prop, the other from measurement', () => {
    const s = resolveChartSizing({
      propHeight: 400,
      measuredWidth: 800,
      measuredHeight: 0,
      ...base,
    });
    expect(s.draw).toBe(true); // width measured (800), height from prop (400)
    expect(s.height).toBe(400);
    expect(s.width).toBe(800 - MARGIN.left - MARGIN.right);
  });
});
