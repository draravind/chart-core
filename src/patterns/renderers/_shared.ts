import type * as d3 from 'd3';

import type { LabelStyle } from '../../appearance/types';
import type { ChartPatternCtx } from '../mountChartPatternOverlay';

// Shared pattern-renderer primitives. The original three renderers
// (highTightFlag/baseBreakout/consolidation) keep their inline copies; the nine
// patterns added later import these so chip + marker geometry is written once.

// Pure-geometry constants (not user-meaningful styling).
export const LABEL_PADDING_X = 8;
export const LABEL_PADDING_Y = 4;
export const MARKER_SIZE = 6;

type Sel = d3.Selection<SVGGElement, unknown, null, undefined>;

/** Chip height for a given label font size (font + symmetric vertical pad). */
export const chipHeight = (fontSize: number): number =>
  fontSize + 2 * LABEL_PADDING_Y;

// Same extrapolation as TradeOverlay.xForBar — returns null for indices to the
// left of bar 0, and extrapolates past the last data bar using the step pitch.
export function xForBar(idx: number, ctx: ChartPatternCtx): number | null {
  if (ctx.dataLength === 0) return null;
  if (idx >= 0 && idx < ctx.dataLength) {
    return ctx.xScale(idx) ?? null;
  }
  if (idx >= ctx.dataLength) {
    const lastX = ctx.xScale(ctx.dataLength - 1) ?? null;
    if (lastX == null) return null;
    return lastX + (idx - (ctx.dataLength - 1)) * ctx.step;
  }
  return null;
}

/**
 * Append a label chip (background rect + text) into `labelTarget`. `x`/`y` are
 * the chip's top-left; pass `center: true` to treat `x` as the chip's center.
 * The chip is measured after the text paints so the rect wraps it precisely.
 * Returns the group + measured size so callers can register hover or stack.
 */
export function drawLabelChip(
  labelTarget: Sel,
  opts: {
    x: number;
    y: number;
    text: string;
    style: LabelStyle;
    rc: (expr: string) => string;
    center?: boolean;
    className?: string;
  },
): { group: Sel; width: number; height: number } {
  const { x, y, text, style, rc, center = false, className } = opts;
  const fontSize = style.labelFontSize;
  const h = chipHeight(fontSize);

  const group = labelTarget.append('g');
  if (className) group.attr('class', className);

  const textEl = group
    .append('text')
    .attr('x', LABEL_PADDING_X)
    .attr('y', h / 2)
    .attr('dominant-baseline', 'central')
    .attr('font-size', fontSize)
    .attr('fill', rc(style.labelTextColor))
    .attr('font-weight', 600)
    .text(text);

  const textW = textEl.node()?.getBBox().width ?? text.length * 7;
  const w = textW + 2 * LABEL_PADDING_X;

  group
    .insert('rect', 'text')
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', w)
    .attr('height', h)
    .attr('rx', 3)
    .attr('fill', rc(style.labelBg))
    .attr('fill-opacity', style.labelBgOpacity);

  const tx = center ? x - w / 2 : x;
  group.attr('transform', `translate(${tx},${y})`);
  return { group, width: w, height: h };
}

export type MarkerKind = 'arrowUp' | 'arrowDown' | 'dot' | 'diamond';

/**
 * Draw a small marker glyph centered at (x, y). For arrows, (x, y) is the
 * pointing tip (arrowUp points up from a base below; arrowDown points down from
 * a base above). For dot/diamond, (x, y) is the center.
 */
export function drawMarker(
  target: Sel,
  opts: {
    x: number;
    y: number;
    kind: MarkerKind;
    color: string;
    opacity?: number;
    size?: number;
    rc: (expr: string) => string;
  },
): void {
  const { x, y, kind, color, opacity = 1, size = MARKER_SIZE, rc } = opts;
  const fill = rc(color);
  const h = size * 1.6; // arrow body length

  if (kind === 'dot') {
    target
      .append('circle')
      .attr('cx', x)
      .attr('cy', y)
      .attr('r', size * 0.6)
      .attr('fill', fill)
      .attr('fill-opacity', opacity);
    return;
  }

  let points: string;
  if (kind === 'arrowUp') {
    points = `${x},${y} ${x - size},${y + h} ${x + size},${y + h}`;
  } else if (kind === 'arrowDown') {
    points = `${x},${y} ${x - size},${y - h} ${x + size},${y - h}`;
  } else {
    // diamond
    points = `${x},${y - size} ${x + size},${y} ${x},${y + size} ${x - size},${y}`;
  }

  target
    .append('polygon')
    .attr('points', points)
    .attr('fill', fill)
    .attr('fill-opacity', opacity);
}
