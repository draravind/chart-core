import { projectAnchor } from '../projection';
import { hitSegment } from '../hitTest';
import { computeRulerStats, directionFill } from '../rulerStats';
import { formatVolume } from '../../utils/chartCalculations';
import type { RulerDrawing } from '../types';
import {
  applyLine,
  drawHandle,
  styleOf,
  type DrawCtx,
  type DrawLayers,
  type DrawnHit,
} from './_shared';

// A persistent measure tool: a segment between two anchors plus a two-line stats
// chip near the second anchor — Δprice / % on the first line, bars / days /
// volume on the second. The line and chip are coloured by direction (green up,
// red down) unless the shape carries an explicit colour override, which wins.
// Saved/movable/deletable like every other drawing.
export function renderRuler(
  shape: RulerDrawing,
  layers: DrawLayers,
  ctx: DrawCtx,
): DrawnHit {
  const eff = styleOf(shape);
  const pa = projectAnchor(shape.a, ctx.s);
  const pb = projectAnchor(shape.b, ctx.s);
  const rc = ctx.resolveColor;

  const stats = computeRulerStats(shape.a, shape.b, ctx.s.data);
  const dirColor = directionFill(stats, shape.style, rc);

  const line = layers.pan
    .append('line')
    .attr('x1', pa.x)
    .attr('y1', pa.y)
    .attr('x2', pb.x)
    .attr('y2', pb.y);
  applyLine(line, eff, rc);
  // Direction colour is the default; applyLine already honoured an explicit
  // override, so re-stroking with the same resolved value is a no-op there.
  line.attr('stroke', dirColor);

  const sign = stats.priceDelta >= 0 ? '+' : '';
  const line1 = `${sign}${stats.priceDelta.toFixed(2)}  (${sign}${stats.pricePct.toFixed(2)}%)`;
  const line2 = `${stats.bars} bars · ${stats.calendarDays}d · ${formatVolume(stats.volume)}`;
  const padX = 6;
  const padY = 4;
  const lineHeight = 12;
  const boxH = 2 * lineHeight + 2 * padY;

  const chip = layers.label
    .append('g')
    .attr('transform', `translate(${pb.x + 8},${pb.y - boxH - 4})`)
    .style('pointer-events', 'none');
  const text = chip
    .append('text')
    .attr('x', padX)
    .attr('y', padY)
    .attr('dominant-baseline', 'hanging')
    .style('font-size', 'var(--text-3xs)')
    .style('font-weight', 'var(--font-weight-semibold)')
    .attr('fill', rc('var(--chart-drawing-label-text)'));
  text.append('tspan').attr('x', padX).attr('dy', 0).text(line1);
  text.append('tspan').attr('x', padX).attr('dy', lineHeight).text(line2);
  const tw = text.node()?.getBBox().width ?? Math.max(line1.length, line2.length) * 6;
  chip
    .insert('rect', 'text')
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', tw + 2 * padX)
    .attr('height', boxH)
    .attr('rx', 3)
    .attr('fill', dirColor)
    .attr('fill-opacity', 0.85);

  if (ctx.selected) {
    const handleFill = rc('var(--chart-drawing-handle)');
    drawHandle(layers.label, pa.x, pa.y, dirColor, handleFill);
    drawHandle(layers.label, pb.x, pb.y, dirColor, handleFill);
  }

  return (mx, my, tx) => hitSegment(mx - tx, my, pa, pb);
}
