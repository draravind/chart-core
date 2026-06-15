import type * as d3 from 'd3';

import { effectiveDrawingStyle, type EffectiveDrawingStyle } from '../defaults';
import { HANDLE_RADIUS, type Hit } from '../hitTest';
import type { ProjScale } from '../projection';
import type { DrawingShape } from '../types';

export type Sel = d3.Selection<SVGGElement, unknown, null, undefined>;

// The three z-ordered layers the mount hands each renderer:
//  - pan:   clipped + x-panned inner group (vline/trendline/ray/ruler bodies)
//  - flat:  un-panned group (hline body — full viewport width at a fixed price)
//  - label: unclipped + x-panned group (endpoint handles, ruler chips, text)
export type DrawLayers = { pan: Sel; flat: Sel; label: Sel };

export type DrawCtx = {
  s: ProjScale;
  resolveColor: (expr: string) => string;
  selected: boolean;
};

// A renderer returns a hit closure: `(mx, my, tx)` are viewport coords + the live
// pan translate; the closure detranslates panned shapes (`mx - tx`) itself.
export type DrawnHit = (mx: number, my: number, tx: number) => Hit;

// SVG dash-array for a line style (0 solid | 1 dashed | 2 dotted), scaled to the
// stroke width so dashes stay legible as the line thickens.
export function dashArray(style: number, width: number): string | null {
  if (style === 1) return `${Math.max(4, width * 3)},${Math.max(3, width * 2)}`;
  if (style === 2) return `${Math.max(1, width)},${Math.max(2, width * 2)}`;
  return null;
}

export function styleOf(shape: DrawingShape): EffectiveDrawingStyle {
  return effectiveDrawingStyle(shape.style);
}

// Endpoint grab handle (white fill, shape-colored ring). pointer-events: none so
// the underlying overlayRect keeps the mousedown — hit-testing is manual.
export function drawHandle(
  label: Sel,
  x: number,
  y: number,
  color: string,
): void {
  label
    .append('circle')
    .attr('cx', x)
    .attr('cy', y)
    .attr('r', HANDLE_RADIUS)
    .attr('fill', '#ffffff')
    .attr('stroke', color)
    .attr('stroke-width', 1.5)
    .style('pointer-events', 'none');
}

// Apply the resolved line style to a <line>/<polyline> selection. Generic over
// the element type so a concrete `Selection<SVGLineElement>` passes (the d3
// Selection type is effectively invariant on its element).
export function applyLine<E extends d3.BaseType>(
  sel: d3.Selection<E, unknown, null, undefined>,
  eff: EffectiveDrawingStyle,
  rc: (expr: string) => string,
): void {
  const da = dashArray(eff.style, eff.width);
  sel
    .attr('stroke', rc(eff.color))
    .attr('stroke-width', eff.width)
    .attr('stroke-opacity', eff.opacity)
    .attr('stroke-linecap', 'round')
    .style('pointer-events', 'none');
  if (da) sel.attr('stroke-dasharray', da);
  else sel.attr('stroke-dasharray', null);
}
