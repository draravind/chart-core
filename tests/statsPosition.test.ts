import { describe, it, expect } from 'vitest';
import {
  resolveStatsPosition,
  clampStatsToPane,
  anchorFromDrop,
  defaultStatsPosition,
  defaultPanelPosition,
  normalizeStatsPosition,
  migrateLegacy,
} from '../src/stats/position';
import type { StatsPaneRect } from '../src/stats/types';

const PW = 200;
const PH = 100;
const pane = (o: Partial<StatsPaneRect> = {}): StatsPaneRect => ({
  left: 0,
  top: 0,
  width: 1200,
  height: 700,
  ...o,
});

describe('resolveStatsPosition', () => {
  it('bottom-right keeps a constant right gap across widths', () => {
    for (const width of [1800, 1400]) {
      const { left } = resolveStatsPosition(
        { v: 2, ax: 1, ay: 1, dx: -10, dy: -10 },
        pane({ width }),
        PW,
        PH,
      );
      expect(width - (left + PW)).toBe(10);
    }
  });

  it('bottom-right keeps a constant bottom gap across heights', () => {
    for (const height of [800, 500]) {
      const { top } = resolveStatsPosition(
        { v: 2, ax: 1, ay: 1, dx: -10, dy: -10 },
        pane({ height }),
        PW,
        PH,
      );
      expect(height - (top + PH)).toBe(10);
    }
  });

  it('middle-right stays vertically centred on height change', () => {
    for (const height of [700, 400]) {
      const p = pane({ height });
      const { top } = resolveStatsPosition(
        { v: 2, ax: 1, ay: 0.5, dx: -10, dy: 0 },
        p,
        PW,
        PH,
      );
      expect(top + PH / 2).toBe(p.top + height / 2);
    }
  });

  it('top-left is size-independent', () => {
    const a = resolveStatsPosition({ v: 2, ax: 0, ay: 0, dx: 8, dy: 8 }, pane({ width: 800, height: 400 }), PW, PH);
    const b = resolveStatsPosition({ v: 2, ax: 0, ay: 0, dx: 8, dy: 8 }, pane({ width: 1600, height: 900 }), PW, PH);
    expect(a).toEqual({ left: 8, top: 8 });
    expect(b).toEqual({ left: 8, top: 8 });
  });

  it('non-zero pane offsets shift the output', () => {
    const { left, top } = resolveStatsPosition(
      { v: 2, ax: 0, ay: 0, dx: 8, dy: 8 },
      pane({ left: 100, top: 50 }),
      PW,
      PH,
    );
    expect({ left, top }).toEqual({ left: 108, top: 58 });
  });

  it('panel larger than the pane resolves finite, left of pane.left; clamp pins it', () => {
    const p = pane({ width: 150 });
    const { left } = resolveStatsPosition({ v: 2, ax: 1, ay: 0, dx: 0, dy: 0 }, p, PW, PH);
    expect(Number.isFinite(left)).toBe(true);
    expect(left).toBeLessThan(p.left);
    const clamped = clampStatsToPane(left, 0, p, PW, PH);
    expect(clamped.left).toBe(p.left);
  });

  it("re-resolves when the panel's own size changes (gap holds)", () => {
    const p = pane();
    for (const [w, h] of [[120, 40], [400, 260]] as const) {
      const { left, top } = resolveStatsPosition({ v: 2, ax: 1, ay: 1, dx: -10, dy: -10 }, p, w, h);
      expect(p.width - (left + w)).toBe(10);
      expect(p.height - (top + h)).toBe(10);
    }
  });
});

describe('anchorFromDrop', () => {
  const p = pane();
  // Zone centres (box centre lands in the near/mid/far third of each axis).
  const xs = { near: 40, mid: p.width / 2 - PW / 2, far: p.width - PW - 40 };
  const ys = { near: 30, mid: p.height / 2 - PH / 2, far: p.height - PH - 30 };

  it('snaps each of the nine zones to the right anchor', () => {
    const want: Record<string, number> = { near: 0, mid: 0.5, far: 1 };
    for (const zx of ['near', 'mid', 'far'] as const)
      for (const zy of ['near', 'mid', 'far'] as const) {
        const a = anchorFromDrop(xs[zx], ys[zy], p, PW, PH);
        expect([a.ax, a.ay]).toEqual([want[zx], want[zy]]);
      }
  });

  it('boundaries at exactly 1/3 and 2/3 fall to the < side', () => {
    // cx === 1/3 → not < 1/3 → 0.5;  cx === 2/3 → not < 2/3 → 1.
    const leftAtThird = (p.width / 3) - PW / 2 + p.left;
    const leftAtTwoThird = (p.width * 2) / 3 - PW / 2 + p.left;
    expect(anchorFromDrop(leftAtThird, 0, p, PW, PH).ax).toBe(0.5);
    expect(anchorFromDrop(leftAtTwoThird, 0, p, PW, PH).ax).toBe(1);
  });

  it('round-trips resolve(anchorFromDrop(px)) === px in all nine zones', () => {
    for (const x of Object.values(xs))
      for (const y of Object.values(ys)) {
        const a = anchorFromDrop(x, y, p, PW, PH);
        const r = resolveStatsPosition(a, p, PW, PH);
        expect(r.left).toBeCloseTo(x, 6);
        expect(r.top).toBeCloseTo(y, 6);
      }
  });

  it('a drop outside the pane must be clamped first (the handler contract)', () => {
    const outside = { x: p.width + 300, y: p.height + 300 };
    const naive = resolveStatsPosition(anchorFromDrop(outside.x, outside.y, p, PW, PH), p, PW, PH);
    const clamped = clampStatsToPane(outside.x, outside.y, p, PW, PH);
    expect(naive.left).not.toBe(clamped.left);
    const good = resolveStatsPosition(
      anchorFromDrop(clamped.left, clamped.top, p, PW, PH),
      p,
      PW,
      PH,
    );
    expect(good.left).toBeCloseTo(clamped.left, 6);
    expect(good.top).toBeCloseTo(clamped.top, 6);
  });

  it('degenerate width:0 falls back to centre with no NaN', () => {
    const a = anchorFromDrop(10, 10, pane({ width: 0 }), PW, PH);
    expect(a.ax).toBe(0.5);
    expect(Number.isFinite(a.dx)).toBe(true);
    expect(Number.isFinite(a.dy)).toBe(true);
  });

  it('panel wider than the pane still round-trips', () => {
    const narrow = pane({ width: 150 });
    const a = anchorFromDrop(-30, 20, narrow, PW, PH);
    const r = resolveStatsPosition(a, narrow, PW, PH);
    expect(r.left).toBeCloseTo(-30, 6);
    expect(r.top).toBeCloseTo(20, 6);
  });
});

describe('clampStatsToPane', () => {
  it('passes an inside position through', () => {
    expect(clampStatsToPane(50, 30, pane(), PW, PH)).toEqual({ left: 50, top: 30 });
  });

  it('pins overshoot to the bottom-right limit', () => {
    const p = pane({ width: 800, height: 600 });
    expect(clampStatsToPane(9999, 9999, p, PW, PH)).toEqual({ left: 600, top: 500 });
  });

  it('pins undershoot to pane.left/pane.top (not 0)', () => {
    const p = pane({ left: 100, top: 50 });
    expect(clampStatsToPane(-20, -5, p, PW, PH)).toEqual({ left: 100, top: 50 });
  });

  it('panel larger than the pane pins to pane.left/pane.top', () => {
    const p = pane({ left: 100, top: 50, width: 150, height: 80 });
    expect(clampStatsToPane(40, 40, p, PW, PH)).toEqual({ left: 100, top: 50 });
  });
});

describe('defaultPanelPosition', () => {
  it('returns the literal anchor it is given', () => {
    expect(defaultPanelPosition(1, 0, -8, 8)).toEqual({ v: 2, ax: 1, ay: 0, dx: -8, dy: 8 });
    expect(defaultPanelPosition(0, 1, 4, -4)).toEqual({ v: 2, ax: 0, ay: 1, dx: 4, dy: -4 });
  });

  it('the earnings (top-right) and stats (bottom-right) defaults resolve to different pixels', () => {
    // The regression this guards is the two boxes landing on top of each other:
    // both are right-anchored, but the earnings box sits at the top and the stats
    // box at the bottom, so their resolved top differs by the pane's height.
    const p = pane();
    const earnings = resolveStatsPosition(defaultPanelPosition(1, 0, -8, 8), p, PW, PH);
    const stats = resolveStatsPosition(defaultStatsPosition(), p, PW, PH);
    expect(earnings.left).toBe(stats.left); // same right edge
    expect(earnings.top).not.toBe(stats.top); // different vertical corner
    expect(earnings.top).toBe(8); // top-right, 8px down
    expect(stats.top).toBe(p.height - PH - 8); // bottom-right, 8px up
  });
});

describe('defaultStatsPosition', () => {
  it('is the fixed bottom-right anchor', () => {
    expect(defaultStatsPosition()).toEqual({ v: 2, ax: 1, ay: 1, dx: -8, dy: -8 });
  });

  it('resolves to an 8px inset from the bottom-right at two widths', () => {
    for (const width of [1200, 900]) {
      const p = pane({ width });
      const { left, top } = resolveStatsPosition(defaultStatsPosition(), p, PW, PH);
      expect(width - (left + PW)).toBe(8);
      expect(p.height - (top + PH)).toBe(8);
    }
  });
});

describe('normalizeStatsPosition', () => {
  it('passes a finite v:2 anchor', () => {
    const v2 = { v: 2, ax: 1, ay: 0, dx: -8, dy: 8 };
    expect(normalizeStatsPosition(v2)).toBe(v2);
  });

  it('reads a legacy {x,y}', () => {
    const legacy = { x: 12, y: 34 };
    expect(normalizeStatsPosition(legacy)).toBe(legacy);
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['empty object', {}],
    ['non-numeric legacy', { x: 'a', y: 2 }],
    ['NaN anchor field', { v: 2, ax: NaN, ay: 0, dx: 0, dy: 0 }],
    ['missing offsets', { v: 2, ax: 1, ay: 0 }],
    ['string', 'nope'],
    ['array', []],
    ['unknown version', { v: 3, ax: 1, ay: 0, dx: 0, dy: 0 }],
    ['string version', { v: '2', ax: 1, ay: 0, dx: 0, dy: 0 }],
  ])('rejects %s → null', (_label, raw) => {
    expect(normalizeStatsPosition(raw)).toBeNull();
  });
});

describe('migrateLegacy', () => {
  it('bottom-right pixels → {ax:1,ay:1} restoring the position', () => {
    const p = pane();
    const a = migrateLegacy({ x: 1000, y: 600 }, p, PW, PH);
    expect([a.ax, a.ay]).toEqual([1, 1]);
    const r = resolveStatsPosition(a, p, PW, PH);
    expect(r).toEqual({ left: 1000, top: 600 });
  });

  it('top-left {8,8} against a top:4 pane → {ax:0,ay:0,dx:8,dy:4} → back to 8,8', () => {
    const p = pane({ top: 4, height: 696 });
    const a = migrateLegacy({ x: 8, y: 8 }, p, PW, PH);
    expect(a).toEqual({ v: 2, ax: 0, ay: 0, dx: 8, dy: 4 });
    expect(resolveStatsPosition(a, p, PW, PH)).toEqual({ left: 8, top: 8 });
  });

  it('a value parked over the axis is clamped into the pane first', () => {
    const p = pane({ width: 1200 });
    // x beyond the pane's right edge (over the price-axis gutter in the old model).
    const a = migrateLegacy({ x: 1190, y: 50 }, p, PW, PH);
    const r = resolveStatsPosition(a, p, PW, PH);
    expect(r.left).toBeLessThanOrEqual(p.left + p.width - PW);
    expect(r.left + PW).toBeLessThanOrEqual(p.left + p.width);
  });
});
