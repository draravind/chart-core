import type * as d3 from 'd3';

import type { PatternMarker } from '../types';
import { barIndexForDate } from '../../utils/dateBarIndex';
import type { ChartPatternCtx } from '../mountChartPatternOverlay';
import { drawLabelChip, drawMarker, MARKER_SIZE, xForBar } from './_shared';

const MARKER_GAP = 8; // gap between the bar low and the diamond center

type Markers = {
  event_date: string;
  anchor_low: number;
  volume_ratio?: number;
};

export function renderVolumeDryup(
  detection: PatternMarker,
  target: d3.Selection<SVGGElement, unknown, null, undefined>,
  labelTarget: d3.Selection<SVGGElement, unknown, null, undefined>,
  ctx: ChartPatternCtx,
): void {
  const m = detection.markers as unknown as Markers;
  if (!m?.event_date || !Number.isFinite(m.anchor_low)) return;

  const st = ctx.patternStyle.volume_dryup;
  const rc = ctx.resolveColor;

  const idx = barIndexForDate(ctx.bars, m.event_date);
  if (idx == null) return;
  const xLeft = xForBar(idx, ctx);
  if (xLeft == null) return;

  const xCenter = xLeft + ctx.bandwidth / 2;
  const cy = ctx.yPrice(m.anchor_low) + MARKER_GAP;

  drawMarker(target, {
    x: xCenter,
    y: cy,
    kind: 'diamond',
    color: st.markerColor,
    opacity: st.markerOpacity,
    rc,
  });

  drawLabelChip(labelTarget, {
    x: xCenter,
    y: cy + MARKER_SIZE + 4,
    text: 'Volume dry-up',
    style: st,
    rc,
    center: true,
    className: 'volume-dryup-label',
  });
}
