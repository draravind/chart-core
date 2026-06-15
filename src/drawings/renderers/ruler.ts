import { projectAnchor } from '../projection';
import { hitSegment } from '../hitTest';
import { computeRulerStats } from '../rulerStats';
import type { RulerDrawing } from '../types';
import {
  applyLine,
  drawHandle,
  styleOf,
  type DrawCtx,
  type DrawLayers,
  type DrawnHit,
} from './_shared';

// A persistent measure tool: a segment between two anchors plus a stats chip
// (bars / Δprice / %) near the second anchor. Saved/movable/deletable like every
// other drawing.
export function renderRuler(
  shape: RulerDrawing,
  layers: DrawLayers,
  ctx: DrawCtx,
): DrawnHit {
  const eff = styleOf(shape);
  const pa = projectAnchor(shape.a, ctx.s);
  const pb = projectAnchor(shape.b, ctx.s);
  const rc = ctx.resolveColor;

  const line = layers.pan
    .append('line')
    .attr('x1', pa.x)
    .attr('y1', pa.y)
    .attr('x2', pb.x)
    .attr('y2', pb.y);
  applyLine(line, eff, rc);

  const stats = computeRulerStats(shape.a, shape.b, ctx.s.data);
  const sign = stats.priceDelta >= 0 ? '+' : '';
  const label = `${stats.bars} bars  ${sign}${stats.priceDelta.toFixed(2)} (${sign}${stats.pricePct.toFixed(2)}%)`;
  const fontSize = 10;
  const padX = 6;
  const padY = 4;

  const chip = layers.label
    .append('g')
    .attr('transform', `translate(${pb.x + 8},${pb.y - (fontSize + 2 * padY) - 4})`)
    .style('pointer-events', 'none');
  const text = chip
    .append('text')
    .attr('x', padX)
    .attr('y', padY)
    .attr('dominant-baseline', 'hanging')
    .attr('font-size', fontSize)
    .attr('font-weight', 600)
    .attr('fill', '#ffffff')
    .text(label);
  const tw = text.node()?.getBBox().width ?? label.length * 6;
  chip
    .insert('rect', 'text')
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', tw + 2 * padX)
    .attr('height', fontSize + 2 * padY)
    .attr('rx', 3)
    .attr('fill', rc(eff.color))
    .attr('fill-opacity', 0.85);

  if (ctx.selected) {
    const c = rc(eff.color);
    drawHandle(layers.label, pa.x, pa.y, c);
    drawHandle(layers.label, pb.x, pb.y, c);
  }

  return (mx, my, tx) => hitSegment(mx - tx, my, pa, pb);
}
