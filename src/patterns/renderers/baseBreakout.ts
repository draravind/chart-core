import * as d3 from 'd3';

import type { PatternMarker } from '../types';
import { barIndexForDate } from '../../utils/dateBarIndex';
import type { ChartPatternCtx } from '../mountChartPatternOverlay';

const LINE_COLOR = '#252525';
const DOT_FILL = '#252525';
const LABEL_BG = '#252525';
const LABEL_BG_OPACITY = 0.7;
const LABEL_TEXT_COLOR = '#ffffff';
const LABEL_FONT_SIZE = 11;
const LABEL_PADDING_X = 8;
const LABEL_PADDING_Y = 4;

// Base-stats annotation (days lasted + depth %) drawn directly on the
// resistance line — no background chip, centered on the base's midpoint bar.
const STAT_COLOR = '#252525';
const STAT_FONT_SIZE = 10;
const STAT_BASELINE_OFFSET = 6; // gap above the resistance line for the stat row

type Level = {
  label?: string;
  price: number;
  start: string; // pivot date
  end: string; // breakout date
  base_days?: number;
  base_depth_pct?: number;
};

type Markers = {
  levels?: Level[];
  score?: number;
};

// Same extrapolation as TradeOverlay.xForBar — returns null for indices to the
// left of bar 0, and extrapolates past the last data bar using the step pitch.
function xForBar(idx: number, ctx: ChartPatternCtx): number | null {
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

export function renderBaseBreakout(
  detection: PatternMarker,
  target: d3.Selection<SVGGElement, unknown, null, undefined>,
  labelTarget: d3.Selection<SVGGElement, unknown, null, undefined>,
  ctx: ChartPatternCtx,
): void {
  const m = detection.markers as unknown as Markers;
  if (!Array.isArray(m?.levels) || m.levels.length === 0) return;

  // Right end of the last drawn resistance line — fallback anchor for the chip
  // when the last-bar x can't be resolved (mirrors HTF's `?? flagXRight`).
  let lastLineRight: number | null = null;

  for (const level of m.levels) {
    const startIdx = barIndexForDate(ctx.bars, level.start);
    const endIdx = barIndexForDate(ctx.bars, level.end);
    if (startIdx == null || endIdx == null) continue;

    const xStart = xForBar(startIdx, ctx);
    const xEnd = xForBar(endIdx, ctx);
    if (xStart == null || xEnd == null) continue;

    const y = ctx.yPrice(level.price);
    const x1 = xStart + ctx.bandwidth / 2;
    const x2 = xEnd + ctx.bandwidth / 2;
    lastLineRight = x2;

    target
      .append('line')
      .attr('class', 'bb-resistance')
      .attr('x1', x1)
      .attr('y1', y)
      .attr('x2', x2)
      .attr('y2', y)
      .attr('stroke', LINE_COLOR)
      .attr('stroke-opacity', 0.5)
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '5 4')
      .attr('stroke-linecap', 'round');

    target
      .append('circle')
      .attr('class', 'bb-breakout-dot')
      .attr('cx', x2)
      .attr('cy', y)
      .attr('r', 3)
      .attr('fill', DOT_FILL);

    // Base stats on the line: number of days the base lasted and the depth of
    // its low below the resistance, stacked above the line on the bar at the
    // midpoint of the base. No background — bare text directly on the line.
    const midIdx = Math.round((startIdx + endIdx) / 2);
    const xMid = xForBar(midIdx, ctx);
    if (
      xMid != null &&
      typeof level.base_days === 'number' &&
      typeof level.base_depth_pct === 'number'
    ) {
      const statX = xMid + ctx.bandwidth / 2;
      const statY = y - STAT_BASELINE_OFFSET;

      target
        .append('text')
        .attr('class', 'bb-stat')
        .attr('x', statX)
        .attr('y', statY)
        .attr('text-anchor', 'middle')
        .attr('font-size', STAT_FONT_SIZE)
        .attr('fill', STAT_COLOR)
        .attr('font-weight', 600)
        .text(
          `${Math.round(level.base_days)}d · ${level.base_depth_pct.toFixed(1)}%`,
        );
    }
  }

  // Label chip: built once per detection, level with the first level's
  // resistance line, positioned just past the last displayed bar.
  const firstLevel = m.levels[0];
  const labelY = ctx.yPrice(firstLevel.price);
  const labelText = 'Base breakout';

  const lastBarX = xForBar(ctx.dataLength - 1, ctx);
  const labelX = (lastBarX ?? lastLineRight ?? 0) + ctx.bandwidth + 2 * ctx.step + 4;
  const chipH = LABEL_FONT_SIZE + 2 * LABEL_PADDING_Y;
  // Center the chip on the resistance line: the group's rect spans y=0..chipH,
  // so offset the group up by half its height to straddle the line.
  const labelGroup = labelTarget
    .append('g')
    .attr('class', 'bb-label')
    .attr('transform', `translate(${labelX},${labelY - chipH / 2})`);

  const text = labelGroup
    .append('text')
    .attr('class', 'bb-label-text')
    .attr('x', LABEL_PADDING_X)
    .attr('y', chipH / 2)
    .attr('dominant-baseline', 'central')
    .attr('font-size', LABEL_FONT_SIZE)
    .attr('fill', LABEL_TEXT_COLOR)
    .attr('font-weight', 600)
    .text(labelText);

  // Measure rendered text width so the chip wraps the text precisely.
  const textNode = text.node();
  const textW = textNode ? textNode.getBBox().width : labelText.length * 7;
  const chipW = textW + 2 * LABEL_PADDING_X;

  labelGroup
    .insert('rect', 'text')
    .attr('class', 'bb-label-bg')
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', chipW)
    .attr('height', chipH)
    .attr('rx', 3)
    .attr('fill', LABEL_BG)
    .attr('fill-opacity', LABEL_BG_OPACITY);
}
