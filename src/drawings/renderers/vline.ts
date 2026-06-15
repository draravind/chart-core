import { xForDate } from '../projection';
import { hitVLine } from '../hitTest';
import type { VerticalLineDrawing } from '../types';
import {
  applyLine,
  styleOf,
  type DrawCtx,
  type DrawLayers,
  type DrawnHit,
} from './_shared';

// A constant-date vertical line down the price pane. Drawn in the panned layer
// (its x rides the bar), so the hit closure detranslates the pointer.
export function renderVLine(
  shape: VerticalLineDrawing,
  layers: DrawLayers,
  ctx: DrawCtx,
): DrawnHit {
  const eff = styleOf(shape);
  const x = xForDate(shape.date, ctx.s);

  const line = layers.pan
    .append('line')
    .attr('x1', x)
    .attr('y1', 0)
    .attr('x2', x)
    .attr('y2', ctx.s.priceHeight);
  applyLine(line, eff, ctx.resolveColor);
  if (ctx.selected) line.attr('stroke-width', eff.width + 1.5);

  return (mx, my, tx) => hitVLine(mx - tx, my, x, ctx.s.priceHeight);
}
