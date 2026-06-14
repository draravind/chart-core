import type * as d3 from 'd3';

import type { PatternMarker } from '../types';
import { barIndexForDate } from '../../utils/dateBarIndex';
import type { ChartPatternCtx } from '../mountChartPatternOverlay';
import { chipHeight, drawLabelChip, drawMarker, MARKER_SIZE, xForBar } from './_shared';

const ARROW_GAP = 4; // gap between the high line and the arrow tip

type Markers = {
  event_date: string;
  bar_high: number;
  bar_low: number;
};

export function renderNr7(
  detection: PatternMarker,
  target: d3.Selection<SVGGElement, unknown, null, undefined>,
  labelTarget: d3.Selection<SVGGElement, unknown, null, undefined>,
  ctx: ChartPatternCtx,
): void {
  const m = detection.markers as unknown as Markers;
  if (!m?.event_date) return;
  if (!Number.isFinite(m.bar_high) || !Number.isFinite(m.bar_low)) return;

  const st = ctx.patternStyle.nr7;
  const rc = ctx.resolveColor;

  const idx = barIndexForDate(ctx.bars, m.event_date);
  if (idx == null) return;
  const xLeft = xForBar(idx, ctx);
  if (xLeft == null) return;

  const xRight = xLeft + ctx.bandwidth;
  const xCenter = xLeft + ctx.bandwidth / 2;
  const yHigh = ctx.yPrice(m.bar_high);
  const yLow = ctx.yPrice(m.bar_low);

  for (const y of [yHigh, yLow]) {
    target
      .append('line')
      .attr('class', 'nr7-range')
      .attr('x1', xLeft)
      .attr('y1', y)
      .attr('x2', xRight)
      .attr('y2', y)
      .attr('stroke', rc(st.lineColor))
      .attr('stroke-opacity', st.lineOpacity)
      .attr('stroke-width', st.lineWidth)
      .attr('stroke-linecap', 'round');
  }

  // Down-arrow above the bar, tip pointing at the high.
  const tipY = yHigh - ARROW_GAP;
  drawMarker(target, {
    x: xCenter,
    y: tipY,
    kind: 'arrowDown',
    color: st.markerColor,
    opacity: st.markerOpacity,
    rc,
  });

  drawLabelChip(labelTarget, {
    x: xCenter,
    y: tipY - MARKER_SIZE * 1.6 - chipHeight(st.labelFontSize) - 2,
    text: 'NR7',
    style: st,
    rc,
    center: true,
    className: 'nr7-label',
  });
}
