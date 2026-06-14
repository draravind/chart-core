import * as d3 from 'd3';

import type { PatternMarker } from '../types';
import { barIndexForDate } from '../../utils/dateBarIndex';
import type { ChartPatternCtx } from '../mountChartPatternOverlay';

// Deferred pure-geometry constants (not user-meaningful styling in v1).
const LABEL_PADDING_X = 8;
const LABEL_PADDING_Y = 4;

type Markers = {
  start_date: string;
  end_date: string;
  range_high: number;
  range_low: number;
  consolidation_days?: number;
  tightness?: number;
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

export function renderConsolidation(
  detection: PatternMarker,
  target: d3.Selection<SVGGElement, unknown, null, undefined>,
  labelTarget: d3.Selection<SVGGElement, unknown, null, undefined>,
  ctx: ChartPatternCtx,
): void {
  const m = detection.markers as unknown as Markers;
  if (!m?.start_date || !m?.end_date) return;
  if (!Number.isFinite(m.range_high) || !Number.isFinite(m.range_low)) return;

  const st = ctx.patternStyle.consolidation;
  const rc = ctx.resolveColor;
  const LABEL_FONT_SIZE = st.labelFontSize;

  const startIdx = barIndexForDate(ctx.bars, m.start_date);
  const endIdx = barIndexForDate(ctx.bars, m.end_date);
  if (startIdx == null || endIdx == null) return;
  const xStart = xForBar(startIdx, ctx);
  const xEnd = xForBar(endIdx, ctx);
  if (xStart == null || xEnd == null) return;

  const xLeft = xStart;
  const xRight = xEnd + ctx.bandwidth; // include the last bar's width (like HTF flag)
  // Use the marker's explicit range — NOT recomputed from bars. Normalize the
  // hi/lo order defensively: a well-formed marker has range_high >= range_low,
  // but if they ever arrive swapped, yTop/yBot stay ordered so the box keeps a
  // non-zero height and the hover bounds (y0 <= y1) remain hittable.
  const yTop = ctx.yPrice(Math.max(m.range_high, m.range_low));
  const yBot = ctx.yPrice(Math.min(m.range_high, m.range_low));

  // Shaded box — clipped layer (`target`). The SVG overlay sits ABOVE the
  // candle canvas (z-index 1 vs 0), so this paints OVER the candles;
  // fill-opacity 0.10 keeps them readable through it (like the HTF flag box).
  target
    .append('rect')
    .attr('class', 'consol-box')
    .attr('x', xLeft)
    .attr('y', yTop)
    .attr('width', Math.max(0, xRight - xLeft))
    .attr('height', Math.max(0, yBot - yTop))
    .attr('fill', rc(st.boxFill))
    .attr('fill-opacity', st.boxFillOpacity)
    .attr('stroke', 'none');

  // Label text.
  const days = m.consolidation_days;
  const widthPct =
    m.range_low > 0 ? ((m.range_high - m.range_low) / m.range_low) * 100 : null;
  const parts = ['Consolidation'];
  if (typeof days === 'number') parts.push(`${Math.round(days)}d`);
  if (widthPct != null) parts.push(`${widthPct.toFixed(1)}%`);
  let labelText = parts.join(' · ');
  if (typeof m.tightness === 'number' && Number.isFinite(m.tightness))
    labelText += ` (${m.tightness.toFixed(2)}x ATR)`;

  // Label chip — unclipped layer (`labelTarget`), centered under the box,
  // hidden until hover (display:none toggled by the overlay handle). In the
  // SVG overlay → paints above the candle canvas, so the chip is unobscured.
  const chipH = LABEL_FONT_SIZE + 2 * LABEL_PADDING_Y;
  const labelGroup = labelTarget
    .append('g')
    .attr('class', 'consol-label')
    .style('display', 'none');
  const text = labelGroup
    .append('text')
    .attr('class', 'consol-label-text')
    .attr('x', LABEL_PADDING_X)
    .attr('y', chipH / 2)
    .attr('dominant-baseline', 'central')
    .attr('font-size', LABEL_FONT_SIZE)
    .attr('fill', rc(st.labelTextColor))
    .attr('font-weight', 600)
    .text(labelText);
  const textW = text.node()?.getBBox().width ?? labelText.length * 7;
  const chipW = textW + 2 * LABEL_PADDING_X;
  const boxCenterX = (xLeft + xRight) / 2;
  labelGroup.attr(
    'transform',
    `translate(${boxCenterX - chipW / 2},${yBot + 6})`,
  ); // below range_low
  labelGroup
    .insert('rect', 'text')
    .attr('class', 'consol-label-bg')
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', chipW)
    .attr('height', chipH)
    .attr('rx', 3)
    .attr('fill', rc(st.labelBg))
    .attr('fill-opacity', st.labelBgOpacity);

  // Register hover region (local/pre-pan x bounds; price-pixel y bounds).
  const labelNode = labelGroup.node();
  if (labelNode)
    ctx.registerHover?.({
      x0: xLeft,
      x1: xRight,
      y0: yTop,
      y1: yBot,
      label: labelNode,
    });
}
