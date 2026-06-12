import type { IndicatorDrawScale, IndicatorSeries } from './types';

/** Resolved (rgb) stroke style handed to the canvas painters. Lives here (not
 *  in types.ts) — it's a draw-layer detail, not part of the public contract. */
export type LineStyle = {
  color: string;
  width: number;
  dash?: number[] | null;
  opacity?: number;
};

/** Legend-matching value format: grouped en-US, 2dp. Shared by simple defs. */
export const fmt2 = (v: number): string =>
  v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Format a series value at `idx`; `''` on NaN / out-of-bounds / missing. */
export function cellAt(
  values: Float64Array | undefined,
  idx: number,
  fmt: (v: number) => string,
): string {
  if (!values || idx < 0 || idx >= values.length) return '';
  const v = values[idx];
  return Number.isNaN(v) ? '' : fmt(v);
}

/**
 * Paint a single indicator line on canvas across the render window. `defined`
 * gates each global bar index — a `false` breaks the line into a new subpath
 * (NaN-gap behaviour matching d3's `.defined()`), so gaps render as breaks
 * rather than dragged-to-zero segments.
 */
export function drawPolyline(
  ctx: CanvasRenderingContext2D,
  scale: IndicatorDrawScale,
  values: Float64Array,
  style: LineStyle,
  defined: (globalIdx: number) => boolean,
): void {
  const { xScale, bandwidth, renderStart, renderEnd } = scale;
  ctx.save();
  ctx.beginPath();
  ctx.lineWidth = style.width;
  ctx.strokeStyle = style.color;
  ctx.globalAlpha = style.opacity ?? 1;
  ctx.setLineDash(style.dash ?? []);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'butt';
  let penDown = false;
  for (let g = renderStart; g < renderEnd; g++) {
    if (!defined(g)) {
      penDown = false;
      continue;
    }
    const x = xScale(g)! + bandwidth / 2;
    const y = scale.y(values[g]);
    if (penDown) ctx.lineTo(x, y);
    else {
      ctx.moveTo(x, y);
      penDown = true;
    }
  }
  ctx.stroke();
  ctx.restore();
}

/**
 * Default multi-line painter: draw every line (gated on a finite value).
 * Callers pass only real lines as `{ key, st }` — there is no width-0 skip.
 */
export function drawLines(
  ctx: CanvasRenderingContext2D,
  series: IndicatorSeries,
  scale: IndicatorDrawScale,
  lines: { key: string; st: LineStyle }[],
): void {
  for (const line of lines) {
    const values = series[line.key];
    if (!values) continue;
    drawPolyline(ctx, scale, values, line.st, (g) => !Number.isNaN(values[g]));
  }
}

/**
 * Paint vertical bars from the zero line to each finite value across the render
 * window. Used for the MACD histogram; bars above zero use `style.color`, below
 * use `negColor` (falls back to `style.color`). The zero pixel is derived from
 * the subpane scale so the bars sit on the pane's own zero crossing.
 */
export function drawHistogram(
  ctx: CanvasRenderingContext2D,
  scale: IndicatorDrawScale,
  values: Float64Array,
  style: LineStyle,
  negColor?: string,
): void {
  const { xScale, bandwidth, renderStart, renderEnd } = scale;
  const zeroY = scale.y(0);
  const barW = Math.max(1, bandwidth);
  ctx.save();
  ctx.globalAlpha = style.opacity ?? 1;
  for (let g = renderStart; g < renderEnd; g++) {
    const v = values[g];
    if (Number.isNaN(v)) continue;
    const x = xScale(g)! + bandwidth / 2 - barW / 2;
    const y = scale.y(v);
    ctx.fillStyle = v >= 0 ? style.color : (negColor ?? style.color);
    const top = Math.min(y, zeroY);
    const h = Math.max(1, Math.abs(zeroY - y));
    ctx.fillRect(x, top, barW, h);
  }
  ctx.restore();
}

/**
 * Paint dashed horizontal guide lines at the given subpane VALUES (e.g. RSI
 * 30/70, the MACD zero line). Drawn across the full render window width.
 */
export function drawGuideLines(
  ctx: CanvasRenderingContext2D,
  scale: IndicatorDrawScale,
  levels: number[],
  color: string,
  opts?: { dash?: number[]; opacity?: number; width?: number },
): void {
  const { xScale, bandwidth, renderStart, renderEnd } = scale;
  if (renderEnd <= renderStart || levels.length === 0) return;
  const x0 = xScale(renderStart)! + bandwidth / 2;
  const x1 = xScale(renderEnd - 1)! + bandwidth / 2;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = opts?.width ?? 1;
  ctx.globalAlpha = opts?.opacity ?? 0.25;
  ctx.setLineDash(opts?.dash ?? [3, 3]);
  for (const level of levels) {
    const y = scale.y(level);
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x1, y);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Paint filled marker dots on the line at every bar the `marked` predicate
 * selects (and that has a finite value). Used for the RS-line signal markers.
 */
export function drawDots(
  ctx: CanvasRenderingContext2D,
  scale: IndicatorDrawScale,
  values: Float64Array,
  style: LineStyle,
  marked: (globalIdx: number) => boolean,
  radius = 2.5,
): void {
  const { xScale, bandwidth, renderStart, renderEnd } = scale;
  ctx.save();
  ctx.fillStyle = style.color;
  ctx.globalAlpha = style.opacity ?? 1;
  for (let g = renderStart; g < renderEnd; g++) {
    if (!marked(g) || Number.isNaN(values[g])) continue;
    const x = xScale(g)! + bandwidth / 2;
    ctx.beginPath();
    ctx.arc(x, scale.y(values[g]), radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
