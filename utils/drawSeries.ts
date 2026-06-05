import type * as d3 from 'd3';
import type { Candle, ChartType } from '../types';
import type { IndicatorConfig, IndicatorSeries } from '../indicators/types';
import { getIndicator } from '../indicators/registry';

const VOL_OPACITY_STANDARD = 0.35;
const VOL_OPACITY_FADED = 0.12;

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
  gap: number;
  volumeHeight: number;
  hasVolume: boolean;
  volMax: number;
  volSma: (number | undefined)[];
  bandwidth: number;
  baseTranslateX: number;
  renderStart: number;
  renderEnd: number;
  renderSlice: readonly Candle[];
  chartType: ChartType;
  xScale: d3.ScaleBand<number>;
  yPrice: d3.ScaleLogarithmic<number, number>;
  data: readonly Candle[];
  colors: SeriesColors;
  indicators: { config: IndicatorConfig; series: IndicatorSeries }[];
  resolveColor: (varExpr: string) => string;
};

/**
 * Paint the high-count read-only series (volume bars, candles/bars, indicator
 * lines) onto the single canvas. Mirrors the engine's SVG joins exactly: same
 * xScale/yPrice instances, same `#chart-viewport` clip, same pan translate, so
 * the canvas overlays the (flag-gated) SVG within ±1px.
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
  bg.addColorStop(0, '#776a5a');
  bg.addColorStop(1, '#6e7b8b');
  ctx.save();
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(0, 0, p.cssWidth, bgHeight, 12);
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

  drawVolume(ctx, p);
  if (p.chartType === 'bar') drawBars(ctx, p);
  else drawCandles(ctx, p);
  drawIndicators(ctx, p);

  ctx.restore();
}

function drawVolume(ctx: CanvasRenderingContext2D, p: DrawSeriesParams): void {
  if (!p.hasVolume) return;
  const { xScale, bandwidth, renderStart, renderSlice, volSma, colors } = p;
  const volMax = p.volMax || 1;
  const yBase = p.priceHeight + p.gap;
  const volH = p.volumeHeight;
  // yVol(v) = volH - (v/volMax)*volH ; bar height = volH - yVol = (v/volMax)*volH
  const buckets: Record<string, { x: number; y: number; w: number; h: number }[]> = {
    posStd: [],
    posFaded: [],
    negStd: [],
    negFaded: [],
  };
  for (let i = 0; i < renderSlice.length; i++) {
    const g = i + renderStart;
    const d = renderSlice[i];
    if (d.volume <= 0) continue;
    const x = xScale(g)!;
    const h = (d.volume / volMax) * volH;
    const y = yBase + (volH - h);
    const sma = volSma[g];
    const faded = sma !== undefined && d.volume < sma;
    const up = d.close >= d.open;
    const key = up ? (faded ? 'posFaded' : 'posStd') : faded ? 'negFaded' : 'negStd';
    buckets[key].push({ x, y, w: bandwidth, h });
  }
  const paint = (rects: { x: number; y: number; w: number; h: number }[], color: string, alpha: number) => {
    if (rects.length === 0) return;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    for (const r of rects) ctx.fillRect(r.x, r.y, r.w, r.h);
  };
  paint(buckets.posStd, colors.positive, VOL_OPACITY_STANDARD);
  paint(buckets.posFaded, colors.positive, VOL_OPACITY_FADED);
  paint(buckets.negStd, colors.negative, VOL_OPACITY_STANDARD);
  paint(buckets.negFaded, colors.negative, VOL_OPACITY_FADED);
  ctx.globalAlpha = 1;
}

function drawCandles(ctx: CanvasRenderingContext2D, p: DrawSeriesParams): void {
  const { xScale, yPrice, bandwidth, renderStart, renderSlice, colors } = p;
  const posWicks = new Path2D();
  const negWicks = new Path2D();
  const posBodies: { x: number; y: number; w: number; h: number }[] = [];
  const negBodies: { x: number; y: number; w: number; h: number }[] = [];
  const bw = Math.max(1, Math.round(bandwidth));
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
  ctx.lineWidth = 1.25;
  ctx.strokeStyle = colors.positive;
  ctx.stroke(posWicks);
  ctx.strokeStyle = colors.negative;
  ctx.stroke(negWicks);
  ctx.fillStyle = colors.positive;
  for (const b of posBodies) ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.fillStyle = colors.negative;
  for (const b of negBodies) ctx.fillRect(b.x, b.y, b.w, b.h);
}

function drawBars(ctx: CanvasRenderingContext2D, p: DrawSeriesParams): void {
  const { xScale, yPrice, bandwidth, renderStart, renderSlice, colors } = p;
  const tickLen = bandwidth / 2;
  const posPath = new Path2D();
  const negPath = new Path2D();
  for (let i = 0; i < renderSlice.length; i++) {
    const g = i + renderStart;
    const d = renderSlice[i];
    const x0 = xScale(g)!;
    const cx = Math.round(x0 + bandwidth / 2) + 0.5;
    const path = d.close >= d.open ? posPath : negPath;
    // stem
    path.moveTo(cx, yPrice(d.high));
    path.lineTo(cx, yPrice(d.low));
    // open tick (left)
    const yo = Math.round(yPrice(d.open)) + 0.5;
    path.moveTo(x0, yo);
    path.lineTo(x0 + tickLen, yo);
    // close tick (right)
    const yc = Math.round(yPrice(d.close)) + 0.5;
    path.moveTo(x0 + tickLen, yc);
    path.lineTo(x0 + bandwidth, yc);
  }
  ctx.lineWidth = 1.25;
  ctx.strokeStyle = colors.positive;
  ctx.stroke(posPath);
  ctx.strokeStyle = colors.negative;
  ctx.stroke(negPath);
}

function drawIndicators(ctx: CanvasRenderingContext2D, p: DrawSeriesParams): void {
  if (p.indicators.length === 0) return;
  const scale = {
    xScale: p.xScale,
    yPrice: p.yPrice,
    bandwidth: p.bandwidth,
    data: p.data,
    renderStart: p.renderStart,
    renderEnd: p.renderEnd,
  };
  for (const { config, series } of p.indicators) {
    const def = getIndicator(config.defKey);
    if (!def) continue;
    if (def.pane !== 'price') {
      throw new Error('subpane indicators not yet supported');
    }
    const resolved = config.style.lines.map((l) => ({
      seriesKey: l.seriesKey,
      color: p.resolveColor(l.colorVar),
      width: l.width,
      dash: l.dash,
      opacity: l.opacity,
    }));
    def.draw(ctx, series, scale, resolved);
  }
}
