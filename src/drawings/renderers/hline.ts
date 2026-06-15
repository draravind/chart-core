import { yForPrice } from '../projection';
import { hitHLine } from '../hitTest';
import type { HorizontalLineDrawing } from '../types';
import {
  applyLine,
  styleOf,
  type DrawCtx,
  type DrawLayers,
  type DrawnHit,
} from './_shared';

// A constant-price line spanning the full viewport width. Drawn in the UN-PANNED
// `flat` layer at `[0, width]` so it never leaves a gap on one side as the chart
// pans; its hit-test is purely `|my - y|` (no x detranslate).
export function renderHLine(
  shape: HorizontalLineDrawing,
  layers: DrawLayers,
  ctx: DrawCtx,
): DrawnHit {
  const eff = styleOf(shape);
  const y = yForPrice(shape.price, ctx.s);

  // Skip painting (but keep hit) when the price scrolls outside the price pane,
  // so the line doesn't bleed into the subpanes (the flat layer is unclipped).
  if (y >= -2 && y <= ctx.s.priceHeight + 2) {
    const line = layers.flat
      .append('line')
      .attr('x1', 0)
      .attr('y1', y)
      .attr('x2', ctx.s.width)
      .attr('y2', y);
    applyLine(line, eff, ctx.resolveColor);
    if (ctx.selected) line.attr('stroke-width', eff.width + 1.5);
  }

  return (mx, my) => hitHLine(mx, my, y, ctx.s.width);
}
