import { projectAnchor } from '../projection';
import { hitTextBox } from '../hitTest';
import type { TextDrawing } from '../types';
import {
  drawHandle,
  styleOf,
  type DrawCtx,
  type DrawLayers,
  type DrawnHit,
} from './_shared';

// A text comment box: SVG <rect> + <text> (pans for free with the inner group, no
// foreignObject quirks). Drawn in the unclipped label layer so it isn't sliced at
// the viewport edge; editing happens in the style popup.
export function renderText(
  shape: TextDrawing,
  layers: DrawLayers,
  ctx: DrawCtx,
): DrawnHit {
  const eff = styleOf(shape);
  const rc = ctx.resolveColor;
  const p = projectAnchor(shape.a, ctx.s);
  const label = eff.text || 'Text';
  const padX = 6;
  const padY = 4;

  const g = layers.label
    .append('g')
    .attr('transform', `translate(${p.x},${p.y})`)
    .style('pointer-events', 'none');
  const text = g
    .append('text')
    .attr('x', padX)
    .attr('y', padY)
    .attr('dominant-baseline', 'hanging')
    .attr('font-size', eff.fontSize)
    .attr('fill', rc(eff.color))
    .text(label);
  const tw = text.node()?.getBBox().width ?? label.length * 7;
  const boxW = tw + 2 * padX;
  const boxH = eff.fontSize + 2 * padY;
  g.insert('rect', 'text')
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', boxW)
    .attr('height', boxH)
    .attr('rx', 3)
    .attr('fill', rc(eff.bgColor))
    .attr('fill-opacity', eff.bgOpacity)
    .attr('stroke', ctx.selected ? rc(eff.color) : 'none')
    .attr('stroke-width', ctx.selected ? 1 : 0);

  if (ctx.selected) drawHandle(layers.label, p.x, p.y, rc(eff.color));

  // Box origin is the anchor (top-left), in panned-local space.
  const box = { x: p.x, y: p.y, width: boxW, height: boxH };
  return (mx, my, tx) => hitTextBox(mx - tx, my, box);
}
