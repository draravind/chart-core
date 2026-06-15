import { projectAnchor } from '../projection';
import { hitAnchoredSegment } from '../hitTest';
import type { HorizontalRayDrawing } from '../types';
import {
  applyLine,
  drawHandle,
  styleOf,
  type DrawCtx,
  type DrawLayers,
  type DrawnHit,
} from './_shared';

// A horizontal ray from a single anchor extending right. Drawn in the panned +
// clipped layer; we overshoot far past the last bar so the price-viewport clip
// trims it to the right edge on every pan frame (no re-render needed).
export function renderHRay(
  shape: HorizontalRayDrawing,
  layers: DrawLayers,
  ctx: DrawCtx,
): DrawnHit {
  const eff = styleOf(shape);
  const p = projectAnchor(shape.a, ctx.s);
  const x2 = p.x + Math.max(ctx.s.width * 3, (ctx.s.dataLength + 50) * ctx.s.step);

  const line = layers.pan
    .append('line')
    .attr('x1', p.x)
    .attr('y1', p.y)
    .attr('x2', x2)
    .attr('y2', p.y);
  applyLine(line, eff, ctx.resolveColor);

  if (ctx.selected) drawHandle(layers.label, p.x, p.y, ctx.resolveColor(eff.color));

  return (mx, my, tx) =>
    hitAnchoredSegment(mx - tx, my, p, { x: x2, y: p.y });
}
