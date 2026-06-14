import type * as d3 from 'd3';

import type { PatternMarker } from '../types';
import { barIndexForDate } from '../../utils/dateBarIndex';
import type { ChartPatternCtx } from '../mountChartPatternOverlay';
import { chipHeight, drawLabelChip, drawMarker, MARKER_SIZE, xForBar } from './_shared';

type Markers = {
  event_date: string;
  ema_value: number;
  ema_level?: string;
};

export function renderPullbackToEma(
  detection: PatternMarker,
  target: d3.Selection<SVGGElement, unknown, null, undefined>,
  labelTarget: d3.Selection<SVGGElement, unknown, null, undefined>,
  ctx: ChartPatternCtx,
): void {
  const m = detection.markers as unknown as Markers;
  if (!m?.event_date || !Number.isFinite(m.ema_value)) return;

  const st = ctx.patternStyle.pullback_to_ema;
  const rc = ctx.resolveColor;

  const idx = barIndexForDate(ctx.bars, m.event_date);
  if (idx == null) return;
  const xLeft = xForBar(idx, ctx);
  if (xLeft == null) return;

  const xCenter = xLeft + ctx.bandwidth / 2;
  const y = ctx.yPrice(m.ema_value);

  // Short horizontal tick through the dot, spanning the bar width.
  target
    .append('line')
    .attr('class', 'pullback-ema-tick')
    .attr('x1', xLeft)
    .attr('y1', y)
    .attr('x2', xLeft + ctx.bandwidth)
    .attr('y2', y)
    .attr('stroke', rc(st.lineColor))
    .attr('stroke-opacity', st.lineOpacity)
    .attr('stroke-width', st.lineWidth)
    .attr('stroke-linecap', 'round');

  drawMarker(target, {
    x: xCenter,
    y,
    kind: 'dot',
    color: st.dotFill,
    rc,
  });

  const level = m.ema_level ? ` ${m.ema_level}` : '';
  drawLabelChip(labelTarget, {
    x: xCenter + MARKER_SIZE + 4,
    y: y - chipHeight(st.labelFontSize) / 2,
    text: `Pullback to${level}`,
    style: st,
    rc,
    className: 'pullback-ema-label',
  });
}
