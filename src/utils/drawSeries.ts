import type * as d3 from 'd3';
import type { Candle, ChartType } from '../types';
import type { ResolvedIndicator } from '../indicators/types';
import { getIndicator } from '../indicators/registry';
import { BAR_THICKNESS_STEPS, BAR_STUB_FRACTION } from '../appearance/registry';

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
  // Candle wick width (CSS px, quantised to whole device dots at draw time).
  candle: { wickWidth: number };
  indicators: ResolvedIndicator[];
  resolveColor: (varExpr: string) => string;
};

/**
 * Paint the high-count read-only series (candles/bars, indicator lines — volume
 * is now a registered subpane indicator painted via `drawIndicators`) onto the
 * single canvas. Mirrors the engine's SVG joins exactly: same xScale/yPrice
 * instances, same `#chart-viewport` clip, same pan translate, so the canvas
 * overlays the (flag-gated) SVG within ±1px.
 */
export function drawSeries(ctx: CanvasRenderingContext2D, p: DrawSeriesParams): void {
  const { hRatio, vRatio } = p;

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

  ctx.save();
  // Clip matches #chart-viewport (applied before the pan translate, exactly as
  // the SVG clipWrapper sits outside the panned chartGroup). Set in BITMAP space
  // on whole device pixels: a clip edge at a fractional device position
  // antialiases whatever it cuts, which would leave the right-most bars haloed
  // no matter how exact their own geometry is. The transform is then restored by
  // hand rather than by `restore()`, which would pop the clip with it.
  const clipX0 = Math.round(p.marginLeft * hRatio);
  const clipX1 = Math.round((p.marginLeft + p.width - p.rightBuffer) * hRatio);
  const clipY0 = 0;
  const clipY1 = Math.round(
    (p.marginTop + p.fullHeight + p.marginBottom) * vRatio,
  );
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.beginPath();
  ctx.rect(clipX0, clipY0, clipX1 - clipX0, clipY1 - clipY0);
  ctx.clip();
  // Back to CSS space, panned — the composition of the old
  // translate(marginLeft, marginTop) + translate(baseTranslateX, 0).
  ctx.setTransform(hRatio, 0, 0, vRatio, 0, 0);
  ctx.translate(p.marginLeft + p.baseTranslateX, p.marginTop);

  if (p.chartType === 'bar') drawBars(ctx, p);
  else drawCandles(ctx, p);
  drawIndicators(ctx, p);

  ctx.restore();
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

function drawCandles(ctx: CanvasRenderingContext2D, p: DrawSeriesParams): void {
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
  // Whole device dots, floored at one CSS px — a fractional stroke width is what
  // made the old wick antialias on both edges.
  const wickW = Math.max(
    Math.max(1, Math.floor(p.hRatio)),
    Math.round(p.candle.wickWidth * p.hRatio),
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
  paint(ctx, colors.positive, pos);
  paint(ctx, colors.negative, neg);
  ctx.restore();
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

function drawBars(ctx: CanvasRenderingContext2D, p: DrawSeriesParams): void {
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
  paint(ctx, colors.positive, pos);
  paint(ctx, colors.negative, neg);
  ctx.restore();
}

function drawIndicators(ctx: CanvasRenderingContext2D, p: DrawSeriesParams): void {
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
    const scale = {
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
  }
}
