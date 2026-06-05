import type { IndicatorDrawScale, ResolvedLineStyle } from './types';

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
  style: ResolvedLineStyle,
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
 * Paint filled marker dots on the line at every bar the `marked` predicate
 * selects (and that has a finite value). Used for the RS-line signal markers.
 */
export function drawDots(
  ctx: CanvasRenderingContext2D,
  scale: IndicatorDrawScale,
  values: Float64Array,
  style: ResolvedLineStyle,
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
