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
  const { xScale, yPrice, bandwidth, renderStart, renderEnd } = scale;
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
    const y = yPrice(values[g]);
    if (penDown) ctx.lineTo(x, y);
    else {
      ctx.moveTo(x, y);
      penDown = true;
    }
  }
  ctx.stroke();
  ctx.restore();
}
