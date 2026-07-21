import { describe, it, expect, vi } from 'vitest';
import * as d3 from 'd3';
import {
  barMetrics,
  barRects,
  barSlotAt,
  drawSeries,
  type DrawSeriesParams,
} from '../src/utils/drawSeries';
import { registerIndicator } from '../src/indicators/registry';
import { drawGuideLines, drawLines } from '../src/indicators/draw';
import { CANDLE_SOURCE } from '../src/indicators/hitRegions';
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
  const stack: { t: Transform; clip: Rect | null; alpha: number }[] = [];
  let pending: Rect | null = null;
  const clips: Rect[] = [];
  const fills: Rect[] = [];
  const toDevice = (x: number, y: number, w: number, h: number): Rect => [
    t.a * x + t.e,
    t.d * y + t.f,
    t.a * w,
    t.d * h,
  ];
  const fillAlphas: number[] = [];
  const ctx = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineJoin: '',
    lineCap: '',
    font: '',
    textAlign: '',
    textBaseline: '',
    globalAlpha: 1,
    save() {
      stack.push({ t: { ...t }, clip, alpha: ctx.globalAlpha });
    },
    restore() {
      const prev = stack.pop();
      if (prev) {
        t = prev.t;
        clip = prev.clip;
        ctx.globalAlpha = prev.alpha;
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
      fillAlphas.push(ctx.globalAlpha);
    },
    createLinearGradient() {
      return { addColorStop() {} };
    },
    // Path/text no-ops so the shared indicator painters can run against this.
    moveTo() {},
    lineTo() {},
    stroke() {},
    setLineDash() {},
    arc() {},
    fillText() {},
    measureText() {
      return { width: 10 };
    },
    clips,
    fills,
    fillAlphas,
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
    candle: { opacity: 1 },
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

// --- Candle geometry law: the wick is a fraction of the BODY -----------------

/** `drawCandles` pushes [wick, body] per bar, positives before negatives, so
 *  bar 0 (an up bar in `clipBars`) is fills[0] (wick) + fills[1] (body). */
function wickAndBodyAt(bandwidth: number): { wick: number; body: number } {
  const ctx = fakeCtx();
  drawSeries(ctx as unknown as CanvasRenderingContext2D, {
    ...clipParams(),
    bandwidth,
  });
  return { wick: ctx.fills[0][2], body: ctx.fills[1][2] };
}

describe('drawCandles — wick tracks the body', () => {
  it('is exactly 1 CSS px at the default ~250-bar density (no visual change)', () => {
    // ~1000px of plot over 250 bars ⇒ step 4, bandwidth 0.7 × step = 2.8.
    const { wick, body } = wickAndBodyAt(2.8);
    expect(body).toBe(6); // 3 CSS px
    expect(wick).toBe(HR); // 1 CSS px, exactly as before the change
  });

  it('thickens with the body under zoom and never exceeds it', () => {
    let prevWick = 0;
    for (let bandwidth = 1; bandwidth <= 60; bandwidth += 0.5) {
      const { wick, body } = wickAndBodyAt(bandwidth);
      expect(wick).toBeGreaterThanOrEqual(Math.max(1, Math.floor(HR)));
      expect(wick).toBeLessThanOrEqual(body);
      expect(wick).toBeGreaterThanOrEqual(prevWick); // monotone in zoom
      prevWick = wick;
    }
    // And it genuinely grows — a fixed 1 CSS px would end where it started.
    expect(prevWick).toBeGreaterThan(HR);
  });
});

describe('drawSeries — candle opacity', () => {
  it('applies globalAlpha to the series pass and restores it before indicators', () => {
    const log: number[] = [];
    registerIndicator({
      key: 'test:alpha',
      label: 'alpha',
      pane: 'price',
      settingsSchema: [],
      warmupBars: () => 0,
      compute: () => ({ series: {} as IndicatorSeries }),
      draw: (ctx) => {
        log.push((ctx as unknown as { globalAlpha: number }).globalAlpha);
      },
      legend: () => [],
    });
    const ctx = fakeCtx();
    drawSeries(ctx as unknown as CanvasRenderingContext2D, {
      ...clipParams([indicatorCfg('test:alpha')]),
      candle: { opacity: 0.4 },
    });
    // Every candle rect painted at the configured alpha …
    expect(ctx.fillAlphas.every((a) => a === 0.4)).toBe(true);
    // … and the indicator pass sees a clean slate (the save/restore block).
    expect(log).toEqual([1]);
  });
});

// --- Paint-time hit regions -------------------------------------------------

function indicatorCfg(defKey: string, series: IndicatorSeries = {}) {
  return {
    config: {
      id: `cfg-${defKey}`,
      defKey,
      label: defKey,
      enabled: true,
      settings: {},
      settingsOverrides: {},
    },
    series,
  };
}

/** A def that paints N lines through the shared painter (which declares for it). */
function linesDef(key: string, lineKeys: string[]): IndicatorDef {
  return {
    key,
    label: key,
    pane: 'price',
    settingsSchema: [],
    warmupBars: () => 0,
    compute: () => ({ series: {} as IndicatorSeries }),
    draw: (ctx, series, scale) => {
      drawLines(
        ctx,
        series,
        scale,
        lineKeys.map((k) => ({ key: k, st: { color: '#fff', width: 1 } })),
      );
    },
    legend: () => [],
  };
}

const lineSeries = (keys: string[]): IndicatorSeries =>
  Object.fromEntries(
    keys.map((k) => [k, Float64Array.from(clipBars.map(() => 150))]),
  );

describe('drawSeries — hit regions', () => {
  it('records one region per painted line, all stamped with the config id', () => {
    const keys = ['a', 'b', 'c', 'd'];
    registerIndicator(linesDef('test:four', keys));
    const ctx = fakeCtx();
    const regions = drawSeries(
      ctx as unknown as CanvasRenderingContext2D,
      clipParams([indicatorCfg('test:four', lineSeries(keys))]),
    );
    const mine = regions.filter((r) => r.sourceId === 'cfg-test:four');
    expect(mine).toHaveLength(4);
    expect(mine.every((r) => r.interpolate)).toBe(true);
  });

  it('paints price-pane indicators BENEATH the candles, and declares them first', () => {
    // Both halves of one rule: an EMA must not cut across a candle body, and —
    // because pickHitRegion walks in reverse — the candle must win the click
    // where they overlap. Paint order is what enforces both, so assert it.
    registerIndicator(linesDef('test:under', ['a']));
    const ctx = fakeCtx();
    const regions = drawSeries(
      ctx as unknown as CanvasRenderingContext2D,
      clipParams([indicatorCfg('test:under', lineSeries(['a']))]),
    );
    const lineAt = regions.findIndex((r) => r.sourceId === 'cfg-test:under');
    const candleAt = regions.findIndex((r) => r.sourceId === CANDLE_SOURCE);
    expect(lineAt).toBeGreaterThanOrEqual(0);
    expect(candleAt).toBeGreaterThan(lineAt);
  });

  it('guide lines declare nothing (decoration, not a clickable object)', () => {
    registerIndicator({
      key: 'test:guides',
      label: 'guides',
      pane: { subpane: 'test' },
      settingsSchema: [],
      warmupBars: () => 0,
      compute: () => ({ series: {} as IndicatorSeries }),
      draw: (ctx, _series, scale) => {
        drawGuideLines(ctx, scale, [0.5], '#fff');
      },
      legend: () => [],
    });
    const ctx = fakeCtx();
    const regions = drawSeries(
      ctx as unknown as CanvasRenderingContext2D,
      clipParams([indicatorCfg('test:guides')]),
    );
    expect(regions.some((r) => r.sourceId === 'cfg-test:guides')).toBe(false);
  });

  it('candles declare the body half-width; bars the wider stem+stubs slot', () => {
    // A realistic zoom: the 2-bar fixture's natural bandwidth spans half the
    // chart, where BOTH widths saturate against the slot clamp and the
    // candle-vs-bar distinction is invisible.
    const zoomed = { step: 10, bandwidth: 7 };
    const ctx = fakeCtx();
    const candleRegions = drawSeries(
      ctx as unknown as CanvasRenderingContext2D,
      { ...clipParams(), ...zoomed },
    );
    const candle = candleRegions.find((r) => r.sourceId === CANDLE_SOURCE)!;
    // The body rect the painter actually emitted, back in CSS px.
    expect(candle.halfWidth).toBeCloseTo(ctx.fills[1][2] / (2 * HR), 10);
    // high→low at the bar, in panned-local CSS.
    expect(candle.spanAt(0)).toEqual([
      manualYPrice(clipBars[0].high),
      manualYPrice(clipBars[0].low),
    ]);
    expect(candle.spanAt(99)).toBeNull();
    expect(candle.interpolate).toBe(false);

    const barParams: DrawSeriesParams = {
      ...clipParams(),
      ...zoomed,
      chartType: 'bar',
    };
    const bar = drawSeries(
      fakeCtx() as unknown as CanvasRenderingContext2D,
      barParams,
    ).find((r) => r.sourceId === CANDLE_SOURCE)!;
    const m = barMetrics(barParams.step, HR, STEPS, STUB);
    expect(bar.halfWidth).toBeCloseTo(
      barSlotAt(barParams, m, 0).width / (2 * HR),
      10,
    );
    // A bar's stubs reach past the candle body, so its region is wider.
    expect(bar.halfWidth).toBeGreaterThan(candle.halfWidth);
  });

  it('warns ONCE about a def that paints but declares nothing, and never about one that does', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    registerIndicator({
      key: 'test:silent',
      label: 'silent',
      pane: 'price',
      settingsSchema: [],
      warmupBars: () => 0,
      compute: () => ({ series: {} as IndicatorSeries }),
      draw: (ctx) => ctx.fillRect(0, 0, 1, 1), // paints, declares nothing
      legend: () => [],
    });
    registerIndicator(linesDef('test:declares', ['a']));
    const params = clipParams([
      indicatorCfg('test:silent'),
      indicatorCfg('test:declares', lineSeries(['a'])),
    ]);
    // Repaint several times — the seen-set is module-level, so a pan must not
    // re-warn every frame.
    for (let i = 0; i < 3; i++)
      drawSeries(fakeCtx() as unknown as CanvasRenderingContext2D, params);
    const mine = warn.mock.calls.filter((c) => String(c[0]).includes('test:'));
    expect(mine).toHaveLength(1);
    expect(String(mine[0][0])).toContain('test:silent');
    warn.mockRestore();
  });
});
