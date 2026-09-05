import { projectAnchor } from '../projection';
import { hitTextBox } from '../hitTest';
import { wrapText } from '../wrapText';
import type { TextDrawing } from '../types';
import {
  drawHandle,
  styleOf,
  type DrawCtx,
  type DrawLayers,
  type DrawnHit,
} from './_shared';

// A text comment box: SVG <rect> + wrapping <text> (pans for free with the inner
// group, no foreignObject quirks). Fixed width (`eff.boxWidth`); text wraps onto
// new <tspan> lines and the box height grows with the line count. Drawn in the
// unclipped label layer so it isn't sliced at the viewport edge. Editing happens
// on-canvas in an HTML <textarea>; while a box is being edited its SVG body is
// skipped (`ctx.editingId`) so the two don't double-draw.
export function renderText(
  shape: TextDrawing,
  layers: DrawLayers,
  ctx: DrawCtx,
): DrawnHit {
  const eff = styleOf(shape);
  const rc = ctx.resolveColor;
  const p = projectAnchor(shape.a, ctx.s);
  const padX = 6;
  const padY = 4;
  const lineHeight = Math.round(eff.fontSize * 1.35);
  const editing = ctx.editingId != null && ctx.editingId === shape.id;

  const g = layers.label
    .append('g')
    .attr('transform', `translate(${p.x},${p.y})`)
    .style('pointer-events', 'none');

  // One text node, used first to MEASURE (getComputedTextLength) and then to
  // hold the wrapped tspans. An empty box shows a placeholder so it stays
  // selectable.
  const raw = eff.text || 'Text';
  const text = g
    .append('text')
    .attr('x', padX)
    .attr('y', padY)
    .attr('dominant-baseline', 'hanging')
    .attr('font-size', eff.fontSize)
    .style('font-family', 'var(--font-family-base)')
    .attr('fill', rc(eff.color));
  const node = text.node();
  const measure = (s: string): number => {
    if (!node) return s.length * eff.fontSize * 0.6;
    node.textContent = s;
    return node.getComputedTextLength();
  };
  const lines = wrapText(raw, eff.boxWidth, measure);
  if (node) node.textContent = '';
  lines.forEach((ln, i) => {
    text
      .append('tspan')
      .attr('x', padX)
      .attr('dy', i === 0 ? 0 : lineHeight)
      // A zero-width space keeps an empty wrapped line from collapsing.
      .text(ln.length === 0 ? '\u200b' : ln);
  });
  if (editing) text.style('visibility', 'hidden');

  const boxW = eff.boxWidth + 2 * padX;
  const boxH = lines.length * lineHeight + 2 * padY;
  g.insert('rect', 'text')
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', boxW)
    .attr('height', boxH)
    .attr('rx', 3)
    .attr('fill', rc(eff.bgColor))
    // While editing, the HTML editor paints its own background on top.
    .attr('fill-opacity', editing ? 0 : eff.bgOpacity)
    .attr('stroke', ctx.selected && !editing ? rc(eff.color) : 'none')
    .attr('stroke-width', ctx.selected && !editing ? 1 : 0);

  if (ctx.selected && !editing)
    drawHandle(
      layers.label,
      p.x,
      p.y,
      rc(eff.color),
      rc('var(--chart-drawing-handle)'),
    );

  // Box origin is the anchor (top-left), in panned-local space.
  const box = { x: p.x, y: p.y, width: boxW, height: boxH };
  return (mx, my, tx) => hitTextBox(mx - tx, my, box);
}
