import type * as d3 from 'd3';

import type { PatternMarker } from '../types';
import { barIndexForDate } from '../../utils/dateBarIndex';
import type { ChartPatternCtx } from '../mountChartPatternOverlay';
import { chipHeight, drawLabelChip, xForBar } from './_shared';

type Markers = {
  inside_date: string;
  inside_high: number;
  inside_low: number;
  mother_date: string;
  mother_high: number;
  mother_low: number;
};

export function renderInsideDay(
  detection: PatternMarker,
  target: d3.Selection<SVGGElement, unknown, null, undefined>,
  labelTarget: d3.Selection<SVGGElement, unknown, null, undefined>,
  ctx: ChartPatternCtx,
): void {
  const m = detection.markers as unknown as Markers;
  if (!m?.inside_date || !m?.mother_date) return;
  if (
    !Number.isFinite(m.inside_high) ||
    !Number.isFinite(m.inside_low) ||
    !Number.isFinite(m.mother_high) ||
    !Number.isFinite(m.mother_low)
  ) {
    return;
  }

  const st = ctx.patternStyle.inside_day;
  const rc = ctx.resolveColor;

  const motherIdx = barIndexForDate(ctx.bars, m.mother_date);
  const insideIdx = barIndexForDate(ctx.bars, m.inside_date);
  if (motherIdx == null || insideIdx == null) return;
  const xMother = xForBar(motherIdx, ctx);
  const xInside = xForBar(insideIdx, ctx);
  if (xMother == null || xInside == null) return;

  // Mother high/low lines span from the mother bar's left to the inside bar's right.
  const xLineLeft = xMother;
  const xLineRight = xInside + ctx.bandwidth;
  const yMotherHigh = ctx.yPrice(m.mother_high);
  const yMotherLow = ctx.yPrice(m.mother_low);

  for (const y of [yMotherHigh, yMotherLow]) {
    target
      .append('line')
      .attr('class', 'inside-day-mother')
      .attr('x1', xLineLeft)
      .attr('y1', y)
      .attr('x2', xLineRight)
      .attr('y2', y)
      .attr('stroke', rc(st.lineColor))
      .attr('stroke-opacity', st.lineOpacity)
      .attr('stroke-width', st.lineWidth)
      .attr('stroke-linecap', 'round');
  }

  // Outlined inside-bar box.
  const yInsideTop = ctx.yPrice(Math.max(m.inside_high, m.inside_low));
  const yInsideBot = ctx.yPrice(Math.min(m.inside_high, m.inside_low));
  target
    .append('rect')
    .attr('class', 'inside-day-box')
    .attr('x', xInside)
    .attr('y', yInsideTop)
    .attr('width', Math.max(0, ctx.bandwidth))
    .attr('height', Math.max(0, yInsideBot - yInsideTop))
    .attr('fill', 'none')
    .attr('stroke', rc(st.boxStroke))
    .attr('stroke-opacity', st.boxStrokeOpacity)
    .attr('stroke-width', st.boxStrokeWidth);

  drawLabelChip(labelTarget, {
    x: xLineRight + 6,
    y: yMotherHigh - chipHeight(st.labelFontSize) / 2,
    text: 'Inside day',
    style: st,
    rc,
    className: 'inside-day-label',
  });
}
