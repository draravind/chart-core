import * as d3 from 'd3';

import type { PatternMarker } from '../types';
import { barIndexForDate } from '../../utils/dateBarIndex';
import type { ChartPatternCtx } from '../mountChartPatternOverlay';

// Deferred pure-geometry constants (not user-meaningful styling in v1).
const LABEL_PADDING_X = 8;
const LABEL_PADDING_Y = 4;

type Markers = {
  segments: { pole: [string, string]; flag: [string, string] };
  score?: number; // pole_gain_pct (e.g. 75.0 means 75%)
  tier?: 'low' | 'high';
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

export function renderHighTightFlag(
  detection: PatternMarker,
  target: d3.Selection<SVGGElement, unknown, null, undefined>,
  labelTarget: d3.Selection<SVGGElement, unknown, null, undefined>,
  ctx: ChartPatternCtx,
): void {
  const m = detection.markers as unknown as Markers;
  if (!m?.segments?.pole || !m?.segments?.flag) return;

  const st = ctx.patternStyle.high_tight_flag;
  const rc = ctx.resolveColor;
  const LABEL_FONT_SIZE = st.labelFontSize;

  const poleStartIdx = barIndexForDate(ctx.bars, m.segments.pole[0]);
  const poleEndIdx = barIndexForDate(ctx.bars, m.segments.pole[1]);
  const flagStartIdx = barIndexForDate(ctx.bars, m.segments.flag[0]);
  const flagEndIdx = barIndexForDate(ctx.bars, m.segments.flag[1]);
  if (
    poleStartIdx == null ||
    poleEndIdx == null ||
    flagStartIdx == null ||
    flagEndIdx == null
  ) {
    return;
  }

  const xPoleStart = xForBar(poleStartIdx, ctx);
  const xPoleEnd = xForBar(poleEndIdx, ctx);
  const xFlagStart = xForBar(flagStartIdx, ctx);
  const xFlagEnd = xForBar(flagEndIdx, ctx);
  if (
    xPoleStart == null ||
    xPoleEnd == null ||
    xFlagStart == null ||
    xFlagEnd == null
  ) {
    return;
  }

  const poleStartBar = ctx.bars[poleStartIdx];
  const poleEndBar = ctx.bars[poleEndIdx];
  const yPoleStart = ctx.yPrice(poleStartBar.high);
  const yPoleEnd = ctx.yPrice(poleEndBar.high);

  // Flag rectangle bounds: vertical extent is the actual bar range.
  let flagHigh = -Infinity;
  let flagLow = Infinity;
  for (let i = flagStartIdx; i <= flagEndIdx; i++) {
    const b = ctx.bars[i];
    if (b.high > flagHigh) flagHigh = b.high;
    if (b.low < flagLow) flagLow = b.low;
  }
  if (!Number.isFinite(flagHigh) || !Number.isFinite(flagLow)) return;

  const flagXLeft = xFlagStart;
  const flagXRight = xFlagEnd + ctx.bandwidth;
  const flagYTop = ctx.yPrice(flagHigh);
  const flagYBot = ctx.yPrice(flagLow);

  // Pole diagonal: bar-center to bar-center.
  const poleX1 = xPoleStart + ctx.bandwidth / 2;
  const poleX2 = xPoleEnd + ctx.bandwidth / 2;

  target
    .append('line')
    .attr('class', 'htf-pole')
    .attr('x1', poleX1)
    .attr('y1', yPoleStart)
    .attr('x2', poleX2)
    .attr('y2', yPoleEnd)
    .attr('stroke', rc(st.poleColor))
    .attr('stroke-opacity', st.poleOpacity)
    .attr('stroke-width', st.poleWidth)
    .attr('stroke-linecap', 'round');

  target
    .append('rect')
    .attr('class', 'htf-flag')
    .attr('x', flagXLeft)
    .attr('y', flagYTop)
    .attr('width', Math.max(0, flagXRight - flagXLeft))
    .attr('height', Math.max(0, flagYBot - flagYTop))
    .attr('fill', rc(st.flagFill))
    .attr('fill-opacity', st.flagFillOpacity)
    .attr('stroke', 'none');

  const score = m.score;
  const scorePart =
    score != null && Number.isFinite(score) ? ` ${Math.round(score)}%` : '';
  const tierWord = m.tier === 'high' ? 'High' : m.tier === 'low' ? 'Low' : null;
  const labelText = `${tierWord ? `${tierWord} tight flag` : 'Tight flag'}${scorePart}`;

  // Position the label chip just to the right of the last displayed bar,
  // level with the top of the flag — the chip is rendered outside the
  // price-viewport clip so it can extend past the right edge of the data
  // plot without being cut off.
  const lastBarX = xForBar(ctx.dataLength - 1, ctx);
  const labelX = (lastBarX ?? flagXRight) + ctx.bandwidth + 2 * ctx.step + 4;
  const labelGroup = labelTarget
    .append('g')
    .attr('class', 'htf-label')
    .attr('transform', `translate(${labelX},${flagYTop})`);

  const chipH = LABEL_FONT_SIZE + 2 * LABEL_PADDING_Y;

  const text = labelGroup
    .append('text')
    .attr('class', 'htf-label-text')
    .attr('x', LABEL_PADDING_X)
    .attr('y', chipH / 2)
    .attr('dominant-baseline', 'central')
    .attr('font-size', LABEL_FONT_SIZE)
    .attr('fill', rc(st.labelTextColor))
    .attr('font-weight', 600)
    .text(labelText);

  // Measure rendered text width so the chip wraps the text precisely.
  const textNode = text.node();
  const textW = textNode ? textNode.getBBox().width : labelText.length * 7;
  const chipW = textW + 2 * LABEL_PADDING_X;

  labelGroup
    .insert('rect', 'text')
    .attr('class', 'htf-label-bg')
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', chipW)
    .attr('height', chipH)
    .attr('rx', 3)
    .attr('fill', rc(st.labelBg))
    .attr('fill-opacity', st.labelBgOpacity);
}
