import { projectAnchor } from '../projection';
import { hitSegment } from '../hitTest';
import type { TrendLineDrawing } from '../types';
import {
  applyLine,
  drawHandle,
  styleOf,
  type DrawCtx,
  type DrawLayers,
  type DrawnHit,
} from './_shared';

// A finite line segment between two anchors. Body + both endpoint handles pan
// in x, so the hit closure detranslates the pointer (`mx - tx`).
export function renderTrendline(
  shape: TrendLineDrawing,
  layers: DrawLayers,
  ctx: DrawCtx,
): DrawnHit {
  const eff = styleOf(shape);
  const pa = projectAnchor(shape.a, ctx.s);
  const pb = projectAnchor(shape.b, ctx.s);

  const line = layers.pan
    .append('line')
    .attr('x1', pa.x)
    .attr('y1', pa.y)
    .attr('x2', pb.x)
    .attr('y2', pb.y);
  applyLine(line, eff, ctx.resolveColor);

  if (ctx.selected) {
    const c = ctx.resolveColor(eff.color);
    drawHandle(layers.label, pa.x, pa.y, c);
    drawHandle(layers.label, pb.x, pb.y, c);
  }

  return (mx, my, tx) => hitSegment(mx - tx, my, pa, pb);
}
