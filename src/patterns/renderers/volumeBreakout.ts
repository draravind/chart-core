import type * as d3 from 'd3';

import type { PatternMarker } from '../types';
import { barIndexForDate } from '../../utils/dateBarIndex';
import type { ChartPatternCtx } from '../mountChartPatternOverlay';
import { drawLabelChip, drawMarker, MARKER_SIZE, xForBar } from './_shared';

const TIP_GAP = 6; // gap between the bar low and the up-triangle tip

type Markers = {
  event_date: string;
  anchor_low: number;
  volume_ratio?: number;
};

export function renderVolumeBreakout(
  detection: PatternMarker,
  target: d3.Selection<SVGGElement, unknown, null, undefined>,
  labelTarget: d3.Selection<SVGGElement, unknown, null, undefined>,
  ctx: ChartPatternCtx,
): void {
  const m = detection.markers as unknown as Markers;
  if (!m?.event_date || !Number.isFinite(m.anchor_low)) return;

  const st = ctx.patternStyle.volume_breakout;
  const rc = ctx.resolveColor;

  const idx = barIndexForDate(ctx.bars, m.event_date);
  if (idx == null) return;
  const xLeft = xForBar(idx, ctx);
  if (xLeft == null) return;

  const xCenter = xLeft + ctx.bandwidth / 2;
  const tipY = ctx.yPrice(m.anchor_low) + TIP_GAP;

  drawMarker(target, {
    x: xCenter,
    y: tipY,
    kind: 'arrowUp',
    color: st.markerColor,
    opacity: st.markerOpacity,
    rc,
  });

  const ratio =
    typeof m.volume_ratio === 'number' && Number.isFinite(m.volume_ratio)
      ? ` · ${m.volume_ratio.toFixed(1)}x`
      : '';
  drawLabelChip(labelTarget, {
    x: xCenter,
    y: tipY + MARKER_SIZE * 1.6 + 4,
    text: `Vol breakout${ratio}`,
    style: st,
    rc,
    center: true,
    className: 'volume-breakout-label',
  });
}
