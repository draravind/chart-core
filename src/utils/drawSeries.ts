import type * as d3 from 'd3';
import type { Candle, ChartType } from '../types';
import type { ResolvedIndicator } from '../indicators/types';
import { getIndicator } from '../indicators/registry';

export type SeriesColors = { positive: string; negative: string };

export type DrawSeriesParams = {
  dpr: number;
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
  // Candle/bar stroke width, threaded from appearance.
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
  const { dpr } = p;

  // Reset transform + clear the full backing store (so a symbol switch can
  // never leave ghost pixels from the prior symbol).
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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
  ctx.translate(p.marginLeft, p.marginTop);
  // Clip matches #chart-viewport (applied before the pan translate, exactly as
  // the SVG clipWrapper sits outside the panned chartGroup).
  ctx.beginPath();
  ctx.rect(
    0,
    -p.marginTop,
    p.width - p.rightBuffer,
    p.fullHeight + p.marginTop + p.marginBottom,
  );
  ctx.clip();
  ctx.translate(p.baseTranslateX, 0);

  if (p.chartType === 'bar') drawBars(ctx, p);
  else drawCandles(ctx, p);
  drawIndicators(ctx, p);

  ctx.restore();
}

function drawCandles(ctx: CanvasRenderingContext2D, p: DrawSeriesParams): void {
  const { xScale, yPrice, bandwidth, renderStart, renderSlice, colors } = p;
  const posWicks = new Path2D();
  const negWicks = new Path2D();
  const posBodies: { x: number; y: number; w: number; h: number }[] = [];
  const negBodies: { x: number; y: number; w: number; h: number }[] = [];
  // Snap body to an odd width so a true middle column exists for the wick.
  // Even widths have no center column, forcing a crisp 1px wick off to one side.
  let bw = Math.max(1, Math.round(bandwidth));
  if (bw % 2 === 0) bw = Math.max(1, bw - 1);
  for (let i = 0; i < renderSlice.length; i++) {
    const g = i + renderStart;
    const d = renderSlice[i];
    const x0 = xScale(g)!;
    const up = d.close >= d.open;
    // Derive the wick center from the body's rounded geometry (not an
    // independent round of x0+bandwidth/2). Rounding x0 and bandwidth on two
    // separate paths lets the centers drift up to ~1px apart as the subpixel
    // offset shifts under zoom/pan. +0.5 keeps the 1px stroke crisp.
    const bx = Math.round(x0);
    const cx = bx + Math.floor(bw / 2) + 0.5;
    const wick = up ? posWicks : negWicks;
    wick.moveTo(cx, yPrice(d.high));
    wick.lineTo(cx, yPrice(d.low));
    const yTop = yPrice(Math.max(d.open, d.close));
    const h = Math.max(1, Math.abs(yPrice(d.open) - yPrice(d.close)));
    (up ? posBodies : negBodies).push({ x: bx, y: yTop, w: bw, h });
  }
  ctx.lineWidth = p.candle.wickWidth;
  ctx.strokeStyle = colors.positive;
  ctx.stroke(posWicks);
  ctx.strokeStyle = colors.negative;
  ctx.stroke(negWicks);
  ctx.fillStyle = colors.positive;
  for (const b of posBodies) ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.fillStyle = colors.negative;
  for (const b of negBodies) ctx.fillRect(b.x, b.y, b.w, b.h);
}

export type BarSegments = {
  stem: { x: number; yHigh: number; yLow: number };
  openTick: { x0: number; x1: number; y: number };
  closeTick: { x0: number; x1: number; y: number };
};

// All y's snapped identically so a tick whose price equals an extreme lands
// exactly on the stem end; ticks terminate at the stem center cx so they meet
// the stem horizontally too.
export function barSegments(
  d: Pick<Candle, 'open' | 'high' | 'low' | 'close'>,
  x0: number,
  bandwidth: number,
  yPrice: (v: number) => number,
): BarSegments {
  const snap = (v: number) => Math.round(yPrice(v)) + 0.5;
  const cx = Math.round(x0 + bandwidth / 2) + 0.5;
  return {
    stem: { x: cx, yHigh: snap(d.high), yLow: snap(d.low) },
    openTick: { x0, x1: cx, y: snap(d.open) },
    closeTick: { x0: cx, x1: x0 + bandwidth, y: snap(d.close) },
  };
}

function drawBars(ctx: CanvasRenderingContext2D, p: DrawSeriesParams): void {
  const { xScale, yPrice, bandwidth, renderStart, renderSlice, colors } = p;
  const posPath = new Path2D();
  const negPath = new Path2D();
  for (let i = 0; i < renderSlice.length; i++) {
    const g = i + renderStart;
    const d = renderSlice[i];
    const seg = barSegments(d, xScale(g)!, bandwidth, yPrice);
    const path = d.close >= d.open ? posPath : negPath;
    path.moveTo(seg.stem.x, seg.stem.yHigh);
    path.lineTo(seg.stem.x, seg.stem.yLow);
    path.moveTo(seg.openTick.x0, seg.openTick.y);
    path.lineTo(seg.openTick.x1, seg.openTick.y);
    path.moveTo(seg.closeTick.x0, seg.closeTick.y);
    path.lineTo(seg.closeTick.x1, seg.closeTick.y);
  }
  ctx.lineWidth = p.candle.wickWidth;
  ctx.strokeStyle = colors.positive;
  ctx.stroke(posPath);
  ctx.strokeStyle = colors.negative;
  ctx.stroke(negPath);
}

function drawIndicators(ctx: CanvasRenderingContext2D, p: DrawSeriesParams): void {
  if (p.indicators.length === 0) return;
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
    };
    def.draw(ctx, series, scale, config.settings, p.resolveColor, meta);
  }
}
