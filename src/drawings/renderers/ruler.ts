import { projectAnchor } from '../projection';
import { hitSegment, hitTextBox, HIT_TOLERANCE } from '../hitTest';
import { computeRulerStats, directionFill } from '../rulerStats';
import { formatVolume } from '../../utils/chartCalculations';
import type { RulerDrawing } from '../types';
import {
  applyLine,
  drawArrowHead,
  drawHandle,
  styleOf,
  type DrawCtx,
  type DrawLayers,
  type DrawnHit,
} from './_shared';

// Vertical placement of the readout pill: below the box by default, above when
// the box runs to the pane floor, clamped inside the pane when neither side has
// room (a tiny pane). PURE so the flip is unit-testable.
export function rulerLabelTop(
  minY: number,
  maxY: number,
  pillH: number,
  priceHeight: number,
  gap: number,
): number {
  const below = maxY + gap;
  if (below + pillH <= priceHeight) return below;
  const above = minY - gap - pillH;
  if (above >= 0) return above;
  return Math.max(0, Math.min(priceHeight - pillH, below));
}

// A persistent measure tool drawn as a TradingView-style measure box: a
// direction-coloured shaded rect spanning the price×time range (green up, red
// down, or an explicit colour override), a contained vertical arrow pointing the
// way price moved, and a two-line readout pill — Δprice / Δ% then bars / days /
// volume — below the box (above it when there's no room below). The box fill and
// arrow honour the popup's Colour / Width / Style / Opacity fields.
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

  const minX = Math.min(pa.x, pb.x);
  const maxX = Math.max(pa.x, pb.x);
  const minY = Math.min(pa.y, pb.y);
  const maxY = Math.max(pa.y, pb.y);
  const boxW = maxX - minX;
  const boxH = maxY - minY;
  const midX = (pa.x + pb.x) / 2;

  // Shaded box body — no border.
  layers.pan
    .append('rect')
    .attr('x', minX)
    .attr('y', minY)
    .attr('width', boxW)
    .attr('height', boxH)
    .attr('fill', dirColor)
    .attr('fill-opacity', 0.28 * eff.opacity)
    .style('pointer-events', 'none');

  // Direction arrow: a vertical shaft at the box's horizontal centre with a
  // filled head whose tip lands ON the destination edge. Skipped on a flat /
  // near-flat drag — there's no room for the head, and `Math.sign(0)` would draw
  // an inverted stub.
  const headLength = 8;
  const dy = pb.y - pa.y;
  if (Math.abs(dy) >= headLength) {
    const dir = dy > 0 ? 1 : -1;
    const tipY = pb.y;
    const shaft = layers.pan
      .append('line')
      .attr('x1', midX)
      .attr('y1', pa.y)
      .attr('x2', midX)
      .attr('y2', tipY - dir * headLength);
    // applyLine honours the popup's Width / Style / Opacity; re-stroke direction
    // colour on top (a no-op when an explicit colour override already won).
    applyLine(shaft, eff, rc);
    shaft.attr('stroke', dirColor);
    drawArrowHead(layers.pan, { x: midX, tipY, dir, color: dirColor, size: headLength });
  }

  const sign = stats.priceDelta >= 0 ? '+' : '';
  const line1 = `${sign}${stats.priceDelta.toFixed(2)}  (${sign}${stats.pricePct.toFixed(2)}%)`;
  const line2 = `${stats.bars} bars · ${stats.calendarDays}d · ${formatVolume(stats.volume)}`;
  const padX = 6;
  const padY = 4;
  const lineHeight = 12;
  const pillH = 2 * lineHeight + 2 * padY;
  const gap = 6;

  const chip = layers.label.append('g').style('pointer-events', 'none');
  const text = chip
    .append('text')
    .attr('dominant-baseline', 'hanging')
    .attr('text-anchor', 'middle')
    .style('font-size', 'var(--text-3xs)')
    .style('font-weight', 'var(--font-weight-semibold)')
    .attr('fill', rc('var(--chart-drawing-label-text)'));
  const t1 = text.append('tspan').attr('dy', 0).text(line1);
  const t2 = text.append('tspan').attr('dy', lineHeight).text(line2);
  const tw = text.node()?.getBBox().width ?? Math.max(line1.length, line2.length) * 6;
  const w = tw + 2 * padX;
  const cx = w / 2;
  text.attr('x', cx).attr('y', padY);
  t1.attr('x', cx);
  t2.attr('x', cx);
  const top = rulerLabelTop(minY, maxY, pillH, ctx.s.priceHeight, gap);
  chip.attr('transform', `translate(${midX - w / 2},${top})`);
  chip
    .insert('rect', 'text')
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', w)
    .attr('height', pillH)
    .attr('rx', 3)
    .attr('fill', dirColor)
    .attr('fill-opacity', 0.85);

  if (ctx.selected) {
    const handleFill = rc('var(--chart-drawing-handle)');
    drawHandle(layers.label, pa.x, pa.y, dirColor, handleFill);
    drawHandle(layers.label, pb.x, pb.y, dirColor, handleFill);
  }

  // Endpoint handles first (reuse `hitSegment` for its handle checks — the grab
  // radius const isn't exported), then a body hit anywhere inside the box rect,
  // inflated by the pointer tolerance so a flat / single-bar box stays grabbable.
  const box = { x: minX, y: minY, width: boxW, height: boxH };
  return (mx, my, tx) => {
    const seg = hitSegment(mx - tx, my, pa, pb);
    if (seg && seg.kind === 'handle') return seg;
    return hitTextBox(mx - tx, my, box, HIT_TOLERANCE);
  };
}
