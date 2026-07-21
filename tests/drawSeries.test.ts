import { describe, it, expect } from 'vitest';
import * as d3 from 'd3';
import {
  barMetrics,
  barRects,
  drawSeries,
  type DrawSeriesParams,
} from '../src/utils/drawSeries';
import { registerIndicator } from '../src/indicators/registry';
import type { Candle } from '../src/types';
import type { IndicatorDef, IndicatorSeries } from '../src/indicators/types';
import { BAR_THICKNESS_STEPS, BAR_STUB_FRACTION } from '../src/appearance/registry';

const STEPS = BAR_THICKNESS_STEPS;
const STUB = BAR_STUB_FRACTION;

// Log price scale mirroring the chart's yPrice mapping, plus the device-dot
// snapping the painter applies.
const yPrice = d3.scaleLog().domain([10, 1000]).range([400, 0]);
const yDev = (v: number) => Math.round(yPrice(v) * 2);

/** Metrics at dpr 2 for a given REFERENCE device spacing (= CSS step × 2). */
const atRef = (ref: number, steps: readonly number[] = STEPS) =>
  barMetrics(ref / 2, 2, steps, STUB);

describe('the shipped ladder is well-formed', () => {
  it('is strictly increasing, positive, and finite', () => {
    expect(STEPS.length).toBeGreaterThan(0);
    STEPS.forEach((v, i) => {
      expect(Number.isFinite(v) && v > 0).toBe(true);
      if (i > 0) expect(v).toBeGreaterThan(STEPS[i - 1]);
    });
  });
});

describe('barMetrics — thickness ladder', () => {
  it('steps up on the stated side of every shipped breakpoint (dpr 2)', () => {
    const expected: [number, number][] = [
      [5, 2],
      [12, 2],
      [13, 3],
      [26, 3],
      [27, 4],
      [33, 4],
      [34, 5],
      [39, 5],
      [40, 6],
      [46, 6],
      [47, 7],
      [53, 7],
      [54, 8],
      [200, 8],
    ];
    for (const [ref, markW] of expected) {
      expect(atRef(ref).markW, `ref=${ref}`).toBe(markW);
    }
  });

  it('caps at the ladder length — a 3-entry ladder maxes at 5 dots', () => {
    const short = [10, 20, 30];
    for (const ref of [5, 10, 20, 30, 100, 1000]) {
      expect(atRef(ref, short).markW).toBeLessThanOrEqual(5);
    }
    expect(atRef(1000, short).markW).toBe(5);
  });

  it('holds the floor and the cap at every density and zoom', () => {
    for (const dpr of [1, 2, 3]) {
      for (let step = 1; step <= 60; step += 0.5) {
        const m = barMetrics(step, dpr, STEPS, STUB);
        expect(m.markW).toBeGreaterThanOrEqual(Math.floor(dpr));
        expect(m.markW).toBeLessThanOrEqual(Math.round(4 * dpr));
      }
    }
  });

  it('scales with density — same CSS step is the same physical thickness', () => {
    for (const step of [3, 5, 8, 12, 20, 30]) {
      const per = [1, 2, 3].map((dpr) => barMetrics(step, dpr, STEPS, STUB).markW / dpr);
      for (const v of per) expect(Math.abs(v - per[1])).toBeLessThanOrEqual(0.5);
    }
  });

  it('returns non-negative integers', () => {
    for (const dpr of [1, 2, 3]) {
      for (let step = 1; step <= 60; step += 0.25) {
        const m = barMetrics(step, dpr, STEPS, STUB);
        for (const v of [m.markW, m.sideW]) {
          expect(Number.isInteger(v)).toBe(true);
          expect(v).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });
});

describe('barMetrics — stub reach', () => {
  it('never lets a stub hide under the stem', () => {
    for (const dpr of [1, 2, 3]) {
      for (let step = 1; step <= 60; step += 0.25) {
        const m = barMetrics(step, dpr, STEPS, STUB);
        expect(m.sideW).toBeGreaterThanOrEqual(m.markW);
      }
    }
  });

  // The bar spans 2 × stubFraction of its slot (the stub reaches stubFraction
  // out from the centre on each side). Derived, not hardcoded, so retuning
  // BAR_STUB_FRACTION doesn't silently rot this into a false pass.
  // Exact bound: 2 × the halfSpan rounding (±0.5) + 1 when markW is odd.
  it('fills the expected slot fraction above the tick cutoff', () => {
    for (const dpr of [1, 2, 3]) {
      for (let step = 3; step <= 60; step += 0.25) {
        const m = barMetrics(step, dpr, STEPS, STUB);
        if (!m.drawTicks) continue;
        const s = step * dpr;
        const footprint = m.markW + 2 * m.sideW;
        const nominal = Math.round(STUB * s) - Math.floor(m.markW / 2);
        if (nominal >= m.markW) {
          // Slot-fraction rule governs.
          expect(Math.abs(footprint - 2 * STUB * s), `dpr=${dpr} step=${step}`)
            .toBeLessThanOrEqual(2);
        } else {
          // `sideW >= markW` floor governs (a stub is never thinner than the
          // stem). It overshoots the slot fraction by design, but must still
          // never make neighbouring bars overlap.
          expect(footprint, `dpr=${dpr} step=${step}`).toBeLessThanOrEqual(Math.ceil(s));
        }
      }
    }
  });

  // Rung-to-rung it can dip by one dot (markW steps up, halfSpan doesn't), so
  // compare across a full rung — the point is that it TRACKS ZOOM rather than
  // sitting at a thickness-derived constant.
  it('keeps growing with zoom (never collapses to a stub bar)', () => {
    for (let ref = 14; ref <= 58; ref += 2) {
      expect(atRef(ref).sideW, `ref=${ref}`).toBeGreaterThan(atRef(ref - 8).sideW);
    }
    // At full zoom the stub tracks the slot fraction, NOT the stem thickness —
    // the guard against stubs collapsing to a thickness-derived constant.
    const wide = atRef(58);
    expect(wide.sideW).toBeGreaterThan(wide.markW);
    expect(Math.abs(wide.sideW - (STUB * 58 - wide.markW / 2))).toBeLessThanOrEqual(1);
  });
});

describe('barMetrics — tick cutoff', () => {
  it('switches stubs off below 3 CSS px of spacing, on at or above', () => {
    for (const dpr of [1, 2, 3]) {
      expect(barMetrics(2.99, dpr, STEPS, STUB).drawTicks).toBe(false);
      expect(barMetrics(3, dpr, STEPS, STUB).drawTicks).toBe(true);
      expect(barMetrics(3.01, dpr, STEPS, STUB).drawTicks).toBe(true);
    }
  });

  it('bars touch but never overlap at the cutoff', () => {
    for (const dpr of [1, 2, 3]) {
      const m = barMetrics(3, dpr, STEPS, STUB);
      expect(m.markW + 2 * m.sideW).toBeLessThanOrEqual(3 * dpr);
    }
  });
});

describe('barRects — centring', () => {
  const d = { open: 150, high: 250, low: 100, close: 200 };
  const CENTRES = [100, 100.25, 100.5, 100.75];

  it('paints exactly markW columns for an odd width at any fractional centre', () => {
    const m = { markW: 3, sideW: 5, drawTicks: true };
    for (const cx of CENTRES) {
      const [stem] = barRects(d, cx, m, yDev);
      expect(stem[2]).toBe(3);
      expect(Number.isInteger(stem[0])).toBe(true);
    }
  });

  it('has no systematic sideways bias at odd OR even width', () => {
    for (const markW of [2, 3]) {
      const m = { markW, sideW: 6, drawTicks: true };
      const errors: number[] = [];
      for (let cx = 100; cx < 104; cx += 0.05) {
        const [stem] = barRects(d, cx, m, yDev);
        const err = stem[0] + markW / 2 - cx;
        expect(Math.abs(err)).toBeLessThanOrEqual(0.5);
        errors.push(err);
      }
      const mean = errors.reduce((a, b) => a + b, 0) / errors.length;
      expect(Math.abs(mean), `markW=${markW}`).toBeLessThan(0.05);
    }
  });
});

describe('barRects — stub geometry', () => {
  const m = { markW: 2, sideW: 6, drawTicks: true };
  // Math.round rounds toward +∞, so an origin just left of 0 yields -0. That is
  // the same pixel as 0 to fillRect, but not to Object.is (what `toBe` uses).
  const norm = (v: number) => v + 0;

  for (const cx of [120, 137.4, 0.5]) {
    describe(`cx=${cx}`, () => {
      const rectsFor = (d: {
        open: number;
        high: number;
        low: number;
        close: number;
      }) => {
        const [stem, open, close] = barRects(d, cx, m, yDev);
        return { stem, open, close };
      };

      it('open stub meets the stem bottom when open == low', () => {
        const { stem, open } = rectsFor({ open: 100, high: 250, low: 100, close: 200 });
        expect(open[1] + m.markW).toBe(stem[1] + stem[3]);
      });

      it('open stub meets the stem top when open == high', () => {
        const { stem, open } = rectsFor({ open: 250, high: 250, low: 100, close: 200 });
        expect(open[1]).toBe(stem[1]);
      });

      it('close stub meets the stem bottom when close == low', () => {
        const { stem, close } = rectsFor({ open: 200, high: 250, low: 100, close: 100 });
        expect(close[1] + m.markW).toBe(stem[1] + stem[3]);
      });

      it('close stub meets the stem top when close == high', () => {
        const { stem, close } = rectsFor({ open: 200, high: 250, low: 100, close: 250 });
        expect(close[1]).toBe(stem[1]);
      });

      it('open and close stubs are equal length and flank the stem', () => {
        const { stem, open, close } = rectsFor({
          open: 150,
          high: 250,
          low: 100,
          close: 200,
        });
        expect(open[2]).toBe(close[2]);
        expect(norm(open[0] + open[2])).toBe(norm(stem[0]));
        expect(close[0]).toBe(norm(stem[0] + m.markW));
        expect(open[3]).toBe(m.markW);
        expect(close[3]).toBe(m.markW);
      });

      it('doji: open == close puts both stubs at the same y', () => {
        const { open, close } = rectsFor({ open: 175, high: 250, low: 100, close: 175 });
        expect(open[1]).toBe(close[1]);
      });
    });
  }

  it('emits the stem only when ticks are off', () => {
    const rects = barRects(
      { open: 150, high: 250, low: 100, close: 200 },
      120,
      { markW: 2, sideW: 2, drawTicks: false },
      yDev,
    );
    expect(rects).toHaveLength(1);
  });
});

// --- Pane clipping ----------------------------------------------------------
//
// A manual price domain (y-axis scale drag, or the vertical body pan it
// unlocks) maps prices outside [0, priceHeight]. Containment of candles/bars and
// price-pane indicators is the CLIP's job — the geometry is emitted unchanged.

/** `[x, y, w, h]` in absolute device dots. */
type Rect = [number, number, number, number];

type Transform = { a: number; d: number; e: number; f: number };

/**
 * Recording stand-in for `CanvasRenderingContext2D`. Tracks a scale+translate
 * transform (all `drawSeries` ever sets) plus the save/restore stack, so every
 * `fillRect` and `clip` is resolved to absolute device coordinates — which is
 * where the clip law is actually expressed.
 */
function fakeCtx() {
  let t: Transform = { a: 1, d: 1, e: 0, f: 0 };
  let clip: Rect | null = null;
  const stack: { t: Transform; clip: Rect | null }[] = [];
  let pending: Rect | null = null;
  const clips: Rect[] = [];
  const fills: Rect[] = [];
  const toDevice = (x: number, y: number, w: number, h: number): Rect => [
    t.a * x + t.e,
    t.d * y + t.f,
    t.a * w,
    t.d * h,
  ];
  const ctx = {
    fillStyle: '',
    save() {
      stack.push({ t: { ...t }, clip });
    },
    restore() {
      const prev = stack.pop();
      if (prev) {
        t = prev.t;
        clip = prev.clip;
      }
    },
    setTransform(a: number, _b: number, _c: number, d: number, e: number, f: number) {
      t = { a, d, e, f };
    },
    translate(x: number, y: number) {
      t = { ...t, e: t.e + t.a * x, f: t.f + t.d * y };
    },
    beginPath() {
      pending = null;
    },
    rect(x: number, y: number, w: number, h: number) {
      pending = toDevice(x, y, w, h);
    },
    roundRect(x: number, y: number, w: number, h: number) {
      pending = toDevice(x, y, w, h);
    },
    clip() {
      if (pending) {
        clip = pending;
        clips.push(pending);
      }
    },
    fill() {},
    clearRect() {},
    fillRect(x: number, y: number, w: number, h: number) {
      fills.push(toDevice(x, y, w, h));
    },
    createLinearGradient() {
      return { addColorStop() {} };
    },
    clips,
    fills,
    /** The clip in force right now — what a def's `draw` would paint under. */
    activeClip: () => clip,
  };
  return ctx;
}

const HR = 2;
const VR = 2;
const MARGIN_TOP = 4;
const MARGIN_BOTTOM = 20;
const MARGIN_LEFT = 8;
const PRICE_HEIGHT = 300;
const FULL_HEIGHT = 500; // price pane + subpanes
const RIGHT_BUFFER = 60;
const WIDTH = 800;

const clipBars: Candle[] = [
  { date: '2024-01-02', open: 150, high: 160, low: 20, close: 155, volume: 1000 },
  { date: '2024-01-03', open: 155, high: 170, low: 30, close: 140, volume: 2000 },
];

// Deliberately compressed MANUAL domain: the bars' lows sit far below it, so
// yPrice maps them well past `priceHeight` — the exact bug condition.
const manualYPrice = d3.scaleLog().domain([140, 180]).range([PRICE_HEIGHT, 0]);

/** A def that records, at draw time, which clip it was painting under. */
function drawnDef(
  key: string,
  pane: IndicatorDef['pane'],
  log: { key: string; clip: Rect | null }[],
): IndicatorDef {
  return {
    key,
    label: key,
    pane,
    settingsSchema: [],
    warmupBars: () => 0,
    compute: () => ({ series: {} as IndicatorSeries }),
    draw: (ctx) => {
      log.push({
        key,
        clip: (ctx as unknown as ReturnType<typeof fakeCtx>).activeClip(),
      });
    },
    legend: () => [],
  };
}

function clipParams(indicators: DrawSeriesParams['indicators'] = []): DrawSeriesParams {
  const xScale = d3
    .scaleBand<number>()
    .domain(clipBars.map((_, i) => i))
    .range([0, WIDTH - RIGHT_BUFFER])
    .paddingInner(0.3);
  return {
    hRatio: HR,
    vRatio: VR,
    cssWidth: MARGIN_LEFT + WIDTH,
    cssHeight: MARGIN_TOP + FULL_HEIGHT + MARGIN_BOTTOM,
    marginLeft: MARGIN_LEFT,
    marginTop: MARGIN_TOP,
    marginBottom: MARGIN_BOTTOM,
    rightBuffer: RIGHT_BUFFER,
    width: WIDTH,
    fullHeight: FULL_HEIGHT,
    priceHeight: PRICE_HEIGHT,
    bandwidth: xScale.bandwidth(),
    step: xScale.step(),
    baseTranslateX: 0,
    renderStart: 0,
    renderEnd: clipBars.length,
    renderSlice: clipBars,
    chartType: 'candlestick',
    xScale,
    yPrice: manualYPrice,
    subpaneScales: new Map([
      ['test', d3.scaleLinear().domain([0, 1]).range([FULL_HEIGHT, PRICE_HEIGHT])],
    ]),
    data: clipBars,
    colors: { positive: '#0f0', negative: '#f00' },
    background: { topColor: '#000', bottomColor: '#111', radius: 4 },
    candle: { wickWidth: 1 },
    indicators,
    resolveColor: (v) => v,
  };
}

const PRICE_CLIP_BOTTOM = Math.round((MARGIN_TOP + PRICE_HEIGHT) * VR);
const FULL_CLIP_BOTTOM = Math.round(
  (MARGIN_TOP + FULL_HEIGHT + MARGIN_BOTTOM) * VR,
);

describe('drawSeries — pane clipping', () => {
  it('clips the candle pass to the price pane, not the full viewport', () => {
    const ctx = fakeCtx();
    drawSeries(ctx as unknown as CanvasRenderingContext2D, clipParams());
    const [priceClip] = ctx.clips;
    expect(priceClip[0]).toBe(Math.round(MARGIN_LEFT * HR));
    expect(priceClip[2]).toBe(
      Math.round((MARGIN_LEFT + WIDTH - RIGHT_BUFFER) * HR) -
        Math.round(MARGIN_LEFT * HR),
    );
    expect(priceClip[1]).toBe(0);
    expect(priceClip[3]).toBe(PRICE_CLIP_BOTTOM);
    expect(priceClip[3]).toBeLessThan(FULL_CLIP_BOTTOM);
  });

  it('gives the subpane pass the full viewport, independent of the price clip', () => {
    const ctx = fakeCtx();
    drawSeries(ctx as unknown as CanvasRenderingContext2D, clipParams());
    expect(ctx.clips).toHaveLength(2);
    const [, subClip] = ctx.clips;
    expect(subClip[1]).toBe(0);
    // Not the intersection of the two — `restore()` popped the price clip.
    expect(subClip[3]).toBe(FULL_CLIP_BOTTOM);
    // And nothing is clipped once both passes are done.
    expect(ctx.activeClip()).toBeNull();
  });

  it('splits indicators by pane across the two passes', () => {
    const log: { key: string; clip: Rect | null }[] = [];
    registerIndicator(drawnDef('test:price', 'price', log));
    registerIndicator(drawnDef('test:sub', { subpane: 'test' }, log));
    const cfg = (defKey: string) => ({
      config: {
        id: defKey,
        defKey,
        label: defKey,
        enabled: true,
        settings: {},
        settingsOverrides: {},
      },
      series: {} as IndicatorSeries,
    });
    const ctx = fakeCtx();
    // Listed subpane-first, so config order alone would draw them the other way
    // round — the pane filter, not the order, decides which pass each runs in.
    drawSeries(
      ctx as unknown as CanvasRenderingContext2D,
      clipParams([cfg('test:sub'), cfg('test:price')]),
    );
    expect(log.map((e) => e.key)).toEqual(['test:price', 'test:sub']);
    expect(log[0].clip?.[3]).toBe(PRICE_CLIP_BOTTOM);
    expect(log[1].clip?.[3]).toBe(FULL_CLIP_BOTTOM);
  });

  it('still emits the out-of-pane candle geometry unchanged (clip-only fix)', () => {
    const ctx = fakeCtx();
    drawSeries(ctx as unknown as CanvasRenderingContext2D, clipParams());
    const oy = MARGIN_TOP * VR;
    const lowDev = Math.round(oy + manualYPrice(clipBars[0].low) * VR);
    expect(lowDev).toBeGreaterThan(PRICE_CLIP_BOTTOM);
    // The wick rect for bar 0 reaches that y — containment comes from the clip.
    const bottoms = ctx.fills.map((r) => r[1] + r[3]);
    expect(Math.max(...bottoms)).toBeGreaterThanOrEqual(lowDev);
  });
});
