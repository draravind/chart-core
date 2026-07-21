import type * as d3 from 'd3';
import type { Candle, ChartType } from '../types';
import type { ResolvedIndicator } from '../indicators/types';
import type { CandleAppearance } from '../appearance/types';
import type { HitRegion } from '../indicators/hitRegions';
import { CANDLE_SOURCE } from '../indicators/hitRegions';
import { getIndicator } from '../indicators/registry';
import {
  BAR_THICKNESS_STEPS,
  BAR_STUB_FRACTION,
  CANDLE_WICK_FRACTION,
} from '../appearance/registry';

export type SeriesColors = { positive: string; negative: string };

export type DrawSeriesParams = {
  /** Device dots per CSS px, per axis. Derived from the actual backing-store
   *  size ÷ the CSS size — NOT from `devicePixelRatio`, so a fractional element
   *  width or a fractional density stays exact. */
  hRatio: number;
  vRatio: number;
  cssWidth: number;
  cssHeight: number;
  marginLeft: number;
  marginTop: number;
  marginBottom: number;
  rightBuffer: number;
  width: number;
  fullHeight: number;
  priceHeight: number;
  bandwidth: number;
  /** CSS px between adjacent bar origins (the band scale's `step()`). Drives the
   *  bar thickness ladder — `bandwidth` alone can't, it's 0.7 × step. */
  step: number;
  baseTranslateX: number;
  renderStart: number;
  renderEnd: number;
  renderSlice: readonly Candle[];
  chartType: ChartType;
  xScale: d3.ScaleBand<number>;
  yPrice: d3.ScaleLogarithmic<number, number>;
  // Per-subpane linear y-scales keyed by subpane name. A subpane indicator draws
  // only when its pane's scale is present.
  subpaneScales: Map<string, d3.ScaleLinear<number, number>>;
  data: readonly Candle[];
  colors: SeriesColors;
  // Background gradient (resolved rgb) + corner radius, threaded from appearance.
  background: { topColor: string; bottomColor: string; radius: number };
  // Price-series appearance (opacity). The wick is derived from the body — see
  // CANDLE_WICK_FRACTION — so it is a renderer law, not a setting.
  candle: CandleAppearance;
  indicators: ResolvedIndicator[];
  resolveColor: (varExpr: string) => string;
};

/**
 * Paint the high-count read-only series (candles/bars, indicator lines — volume
 * is now a registered subpane indicator painted via `drawIndicators`) onto the
 * single canvas. Mirrors the engine's SVG joins exactly: same xScale/yPrice
 * instances, same clips (`#chart-price-viewport` for the price pane,
 * `#chart-viewport` for the subpanes), same pan translate, so the canvas
 * overlays the (flag-gated) SVG within ±1px.
 *
 * Returns the paint-time hit regions in PAINT ORDER (price-pane indicators, then
 * the candles/bars on top of them, then the subpane indicators) — `pickHitRegion`
 * walks them in reverse so a later-painted mark wins, which is what makes a
 * candle beat an indicator line crossing it. Rebuilt every frame, so it can
 * never go stale.
 */
export function drawSeries(
  ctx: CanvasRenderingContext2D,
  p: DrawSeriesParams,
): HitRegion[] {
  const { hRatio, vRatio } = p;
  const regions: HitRegion[] = [];

  // Reset transform + clear the full backing store (so a symbol switch can
  // never leave ghost pixels from the prior symbol).
  ctx.setTransform(hRatio, 0, 0, vRatio, 0, 0);
  ctx.clearRect(0, 0, p.cssWidth, p.cssHeight);

  // Background gradient — the canvas is the BOTTOM layer, so it owns the chart
  // background (the SVG above it is transparent). Matches the old SVG bgRect:
  // full chart box, rounded corners, vertical gradient bottom→top. Drawn before
  // the viewport clip so it also fills the axis gutter / volume pane.
  const bgHeight = p.fullHeight + p.marginTop + p.marginBottom;
  const bg = ctx.createLinearGradient(0, bgHeight, 0, 0);
  bg.addColorStop(0, p.background.bottomColor);
  bg.addColorStop(1, p.background.topColor);
  ctx.save();
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(0, 0, p.cssWidth, bgHeight, p.background.radius);
  ctx.fill();
  ctx.restore();

  // Price pane: candles/bars + every price-scale indicator stop at the divider.
  // Under a manual domain (Y-axis scale drag, or the vertical body pan that drag
  // unlocks) yPrice can map well outside [0, priceHeight]; without this they
  // would paint over the volume / RS panes below.
  //
  // Indicators paint FIRST so the price series lands on top of them: an EMA is
  // context for the price, not something that should cut across a candle body.
  // This also settles the click: regions are walked in reverse, so painting the
  // candles last makes them win wherever a line crosses one.
  ctx.save();
  clipAndPan(ctx, p, p.marginTop + p.priceHeight);
  drawIndicators(ctx, p, false, regions);
  if (p.chartType === 'bar') drawBars(ctx, p, regions);
  else drawCandles(ctx, p, regions);
  ctx.restore();

  // Subpanes: full viewport clip; each subpane def self-clips to its own band.
  ctx.save();
  clipAndPan(ctx, p, p.marginTop + p.fullHeight + p.marginBottom);
  drawIndicators(ctx, p, true, regions);
  ctx.restore();

  return regions;
}

/** Apply the viewport clip and re-establish the panned CSS transform.
 *  Set in BITMAP space on whole device pixels: a clip edge at a fractional
 *  device position antialiases whatever it cuts, which would leave the
 *  right-most bars haloed no matter how exact their own geometry is. The x
 *  bounds match #chart-viewport (applied before the pan translate, exactly as
 *  the SVG clipWrapper sits outside the panned chartGroup). Caller must have
 *  `save()`d — the matching `restore()` pops the clip, which is what keeps the
 *  two passes independent. */
function clipAndPan(
  ctx: CanvasRenderingContext2D,
  p: DrawSeriesParams,
  bottomCss: number,
): void {
  const clipX0 = Math.round(p.marginLeft * p.hRatio);
  const clipX1 = Math.round((p.marginLeft + p.width - p.rightBuffer) * p.hRatio);
  const clipY1 = Math.round(bottomCss * p.vRatio);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.beginPath();
  ctx.rect(clipX0, 0, clipX1 - clipX0, clipY1);
  ctx.clip();
  // Back to CSS space, panned — the composition of the old
  // translate(marginLeft, marginTop) + translate(baseTranslateX, 0).
  ctx.setTransform(p.hRatio, 0, 0, p.vRatio, 0, 0);
  ctx.translate(p.marginLeft + p.baseTranslateX, p.marginTop);
}

// Absolute device-pixel origin of the panned pane coordinate space — the point
// the CSS-space (0,0) of the chart group lands on in the backing store.
const originX = (p: DrawSeriesParams): number =>
  (p.marginLeft + p.baseTranslateX) * p.hRatio;
const originY = (p: DrawSeriesParams): number => p.marginTop * p.vRatio;

/** `[x, y, w, h]` in absolute device dots. */
export type DeviceRect = [number, number, number, number];

function paint(
  ctx: CanvasRenderingContext2D,
  color: string,
  rects: readonly DeviceRect[],
): void {
  ctx.fillStyle = color;
  for (const r of rects) ctx.fillRect(r[0], r[1], r[2], r[3]);
}

function drawCandles(
  ctx: CanvasRenderingContext2D,
  p: DrawSeriesParams,
  regions: HitRegion[],
): void {
  const { xScale, yPrice, bandwidth, renderStart, renderSlice, colors } = p;
  const ox = originX(p);
  const oy = originY(p);
  const minH = Math.max(1, Math.floor(p.vRatio));
  // Body width law is UNCHANGED (odd CSS-px band), only its rendering moved to
  // device dots. Even widths have no center column, forcing a crisp wick off to
  // one side.
  let bw = Math.max(1, Math.round(bandwidth));
  if (bw % 2 === 0) bw = Math.max(1, bw - 1);
  const bodyW = Math.max(1, Math.round(bw * p.hRatio));
  // The wick is a FRACTION OF THE BODY, not a fixed CSS width: the body scales
  // with zoom, so a pinned wick becomes a hairline under a fat body. Floored at
  // one CSS px (a fractional stroke width is what made the old wick antialias on
  // both edges) and capped at the body so it can never swallow it. At the
  // default ~250-bar view the floor wins, so the wick is still exactly 1 CSS px.
  const wickW = Math.min(
    bodyW,
    Math.max(
      Math.max(1, Math.floor(p.hRatio)),
      Math.round(bodyW * CANDLE_WICK_FRACTION),
    ),
  );
  const pos: DeviceRect[] = [];
  const neg: DeviceRect[] = [];
  for (let i = 0; i < renderSlice.length; i++) {
    const g = i + renderStart;
    const d = renderSlice[i];
    // Both the body and the wick round OUT of the same unrounded center, so
    // they stay concentric instead of drifting apart under zoom/pan.
    const cx = ox + (xScale(g)! + bandwidth / 2) * p.hRatio;
    const yDev = (v: number) => Math.round(oy + yPrice(v) * p.vRatio);
    const rects = d.close >= d.open ? pos : neg;
    const yHigh = yDev(d.high);
    rects.push([
      Math.round(cx - wickW / 2),
      yHigh,
      wickW,
      Math.max(minH, yDev(d.low) - yHigh),
    ]);
    const yTop = yDev(Math.max(d.open, d.close));
    rects.push([
      Math.round(cx - bodyW / 2),
      yTop,
      bodyW,
      Math.max(minH, yDev(Math.min(d.open, d.close)) - yTop),
    ]);
  }
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // Inside the save/restore so the alpha can never leak into the indicator pass.
  ctx.globalAlpha = p.candle.opacity;
  paint(ctx, colors.positive, pos);
  paint(ctx, colors.negative, neg);
  ctx.restore();

  // Candle mode uses the BODY half-width, not the slot: the slot is wider than
  // the body, which would make the inter-bar gaps hittable.
  regions.push(candleRegion(p, bodyW / (2 * p.hRatio)));
}

/** The price series' own hit region — high→low at each bar, in panned-local CSS.
 *  Candles go through the same mechanism as every indicator (no special case);
 *  because they paint first they sit at the bottom of the reversed walk, so an
 *  indicator line over a candle always wins. */
function candleRegion(p: DrawSeriesParams, halfWidth: number): HitRegion {
  return {
    sourceId: CANDLE_SOURCE,
    spanAt: (g) => {
      const d = p.data[g];
      if (!d) return null;
      return [p.yPrice(d.high), p.yPrice(d.low)];
    },
    halfWidth,
    interpolate: false,
  };
}

// --- Bar zoom law -----------------------------------------------------------

/** Density the thickness ladder is authored at — every breakpoint below is a
 *  device spacing on a 2x screen. */
const REF_DPR = 2;
/** Floor: 1 CSS px, i.e. `floor(hRatio)` dots. Never a sub-CSS-px hairline. */
const BASE_DOTS = 2;
/** 3 CSS px of bar spacing — below it a 90%-of-slot bar overlaps its neighbour,
 *  so the open/close stubs switch off. Keyed off the REFERENCE spacing, so it is
 *  a flat 3 CSS px at every density (TradingView's own test compares a CSS
 *  length to a dot count and so drifts with dpr; that is not copied). */
const TICK_MIN_REF_SPACING = 6;

export type BarMetrics = {
  /** Device dots — thickness of BOTH the stem and the stubs. */
  markW: number;
  /** Device dots — how far each stub reaches out past the stem. */
  sideW: number;
  drawTicks: boolean;
};

/**
 * The whole bar zoom law. `markW` climbs the ladder with zoom (floored at 1 CSS
 * px, capped by the ladder's length); `sideW` is a slot fraction measured from
 * the bar centre and is INDEPENDENT of thickness, floored at one stem width so a
 * drawn stub can never hide under the stem.
 */
export function barMetrics(
  step: number,
  hRatio: number,
  steps: readonly number[],
  stubFraction: number,
): BarMetrics {
  const ref = step * REF_DPR; // spacing at the density the ladder is authored at
  const s = step * hRatio; // spacing at the actual density
  let refDots = BASE_DOTS;
  for (const b of steps) if (ref >= b) refDots++;
  // Convert the rung's dot count to the local density — this is what makes the
  // same CSS zoom pick the same physical thickness on every screen.
  const markW = Math.max(
    Math.max(1, Math.floor(hRatio)),
    Math.round((refDots * hRatio) / REF_DPR),
  );
  const halfSpan = Math.round(stubFraction * s);
  return {
    markW,
    sideW: Math.max(markW, halfSpan - Math.floor(markW / 2)),
    drawTicks: ref >= TICK_MIN_REF_SPACING,
  };
}

/**
 * The device-dot rectangles for one bar: stem, then (when `drawTicks`) the open
 * and close stubs. `cx` is the UNROUNDED device centre — rounding the left edge
 * out of it, rather than rounding the centre first, is what keeps an odd `markW`
 * centred on the true bar centre that indicators and overlays use.
 */
export function barRects(
  d: Pick<Candle, 'open' | 'high' | 'low' | 'close'>,
  cx: number,
  m: BarMetrics,
  yDev: (v: number) => number,
): DeviceRect[] {
  const { markW, sideW } = m;
  const left = Math.round(cx - markW / 2);
  const top = yDev(d.high);
  const h = Math.max(markW, yDev(d.low) - top);
  const rects: DeviceRect[] = [[left, top, markW, h]];
  if (m.drawTicks) {
    // Pin each stub inside the stem's own vertical extent so an open == high /
    // close == low stub still meets the stem end exactly.
    const clampY = (v: number) =>
      Math.min(Math.max(yDev(v), top), top + h - markW);
    rects.push([left - sideW, clampY(d.open), sideW, markW]);
    rects.push([left + markW, clampY(d.close), sideW, markW]);
  }
  return rects;
}

/** The device-dot column the bar at `g` occupies — the shared slot histogram
 *  subpanes (volume, MACD) paint into so they line up dot for dot. Clamped to
 *  the spacing so columns never overlap below the stub cutoff. */
export function barSlotAt(p: DrawSeriesParams, m: BarMetrics, g: number) {
  const cx = originX(p) + (p.xScale(g)! + p.bandwidth / 2) * p.hRatio;
  const width = Math.min(
    m.markW + 2 * m.sideW,
    Math.max(m.markW, Math.floor(p.step * p.hRatio)),
  );
  return { left: Math.round(cx - width / 2), width };
}

function frameBarMetrics(p: DrawSeriesParams): BarMetrics {
  return barMetrics(p.step, p.hRatio, BAR_THICKNESS_STEPS, BAR_STUB_FRACTION);
}

function drawBars(
  ctx: CanvasRenderingContext2D,
  p: DrawSeriesParams,
  regions: HitRegion[],
): void {
  const { xScale, yPrice, bandwidth, renderStart, renderSlice, colors } = p;
  const m = frameBarMetrics(p);
  const ox = originX(p);
  const oy = originY(p);
  const yDev = (v: number) => Math.round(oy + yPrice(v) * p.vRatio);
  const pos: DeviceRect[] = [];
  const neg: DeviceRect[] = [];
  for (let i = 0; i < renderSlice.length; i++) {
    const g = i + renderStart;
    const d = renderSlice[i];
    // Snap the ACCUMULATED coordinate (origin + pan + scale output). Snapping
    // xScale(g) alone lets the pan offset reintroduce a subpixel drift.
    const cx = ox + (xScale(g)! + bandwidth / 2) * p.hRatio;
    (d.close >= d.open ? pos : neg).push(...barRects(d, cx, m, yDev));
  }
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = p.candle.opacity;
  paint(ctx, colors.positive, pos);
  paint(ctx, colors.negative, neg);
  ctx.restore();

  // An OHLC bar is a stem PLUS open/close stubs reaching `sideW` each side, so
  // bar mode is wider than candle mode. `barSlotAt` already computes exactly
  // that (clamped so columns never overlap) — reuse it rather than restating
  // the ladder maths.
  const slotW = barSlotAt(p, m, p.renderStart).width;
  regions.push(candleRegion(p, slotW / (2 * p.hRatio)));
}

// Defs already warned about, so a pan (which repaints every frame) doesn't spam
// the console. MODULE-level on purpose: a call-local set would warn per frame.
const warnedUndeclaredDefs = new Set<string>();

/** Paint one pane group: `subpaneOnly=false` draws the price-scale indicators
 *  (under the price-pane clip), `true` draws the subpane ones. */
function drawIndicators(
  ctx: CanvasRenderingContext2D,
  p: DrawSeriesParams,
  subpaneOnly: boolean,
  regions: HitRegion[],
): void {
  if (p.indicators.length === 0) return;
  // Recomputed from `g` on demand rather than tabulated per frame, so a
  // histogram column is the SAME arithmetic as the bar above it by construction
  // (and candle mode needs no second code path).
  const m = frameBarMetrics(p);
  const barSlot = (g: number) => barSlotAt(p, m, g);
  const ox = originX(p);
  const oy = originY(p);
  for (const { config, series, meta } of p.indicators) {
    const def = getIndicator(config.defKey);
    if (!def) continue;
    const isSubpane = typeof def.pane === 'object' && 'subpane' in def.pane;
    if (isSubpane !== subpaneOnly) continue;
    let y: (value: number) => number;
    let paneRange: number[];
    if (isSubpane) {
      const key = (def.pane as { subpane: string }).subpane;
      const subScale = p.subpaneScales.get(key);
      if (!subScale) continue; // pane inactive / no finite values to scale
      y = subScale;
      paneRange = subScale.range();
    } else {
      y = p.yPrice;
      paneRange = p.yPrice.range();
    }
    // A FRESH sink per indicator, stamping this config's id, so no def can
    // mis-attribute a region to another instance.
    const before = regions.length;
    const hit = {
      add: (region: Omit<HitRegion, 'sourceId'>) =>
        regions.push({ ...region, sourceId: config.id }),
    };
    const scale = {
      hit,
      xScale: p.xScale,
      yPrice: p.yPrice,
      y: (value: number) => y(value),
      bandwidth: p.bandwidth,
      data: p.data,
      renderStart: p.renderStart,
      renderEnd: p.renderEnd,
      paneTop: Math.min(...paneRange),
      paneBottom: Math.max(...paneRange),
      hRatio: p.hRatio,
      vRatio: p.vRatio,
      originX: ox,
      originY: oy,
      barSlot,
    };
    def.draw(ctx, series, scale, config.settings, p.resolveColor, meta);
    // The sink is a side channel, so nothing FORCES a def to use it (unlike the
    // drawing renderers, whose hit closure is a required return value). Without
    // this, a hand-written def that forgets to declare is silently unclickable
    // with no error anywhere; caught the first time anyone runs it instead.
    if (
      import.meta.env?.DEV &&
      regions.length === before &&
      !warnedUndeclaredDefs.has(def.key)
    ) {
      warnedUndeclaredDefs.add(def.key);
      console.warn(
        `[chart-core] indicator "${def.key}" declared no hit regions — ` +
          'double-clicking its marks will not open its settings. Call ' +
          '`scale.hit?.add(...)` from its draw (see indicators/hitRegions.ts).',
      );
    }
  }
}
