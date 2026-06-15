import { projectAnchor, extendRay } from '../projection';
import { distToSegment, hitSegment, HIT_TOLERANCE } from '../hitTest';
import type { RayDrawing } from '../types';
import {
  applyLine,
  drawHandle,
  styleOf,
  type DrawCtx,
  type DrawLayers,
  type DrawnHit,
} from './_shared';

// A ray from anchor `a` through anchor `b`, extended to the pane edge (projects
// into future empty space past the last bar via `extendRay`). Handles sit at the
// two real anchors; the body runs from `a` to the clipped exit point.
export function renderRay(
  shape: RayDrawing,
  layers: DrawLayers,
  ctx: DrawCtx,
): DrawnHit {
  const eff = styleOf(shape);
  const pa = projectAnchor(shape.a, ctx.s);
  const pb = projectAnchor(shape.b, ctx.s);
  const exit = extendRay(pa, pb, ctx.s.width, ctx.s.priceHeight);

  const line = layers.pan
    .append('line')
    .attr('x1', pa.x)
    .attr('y1', pa.y)
    .attr('x2', exit.x2)
    .attr('y2', exit.y2);
  applyLine(line, eff, ctx.resolveColor);

  if (ctx.selected) {
    const c = ctx.resolveColor(eff.color);
    drawHandle(layers.label, pa.x, pa.y, c);
    drawHandle(layers.label, pb.x, pb.y, c);
  }

  return (mx, my, tx) => {
    const lx = mx - tx;
    const h = hitSegment(lx, my, pa, pb);
    if (h && h.kind === 'handle') return h;
    if (distToSegment(lx, my, pa.x, pa.y, exit.x2, exit.y2) <= HIT_TOLERANCE)
      return { kind: 'body' };
    return null;
  };
}
