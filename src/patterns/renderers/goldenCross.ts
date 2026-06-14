import type * as d3 from 'd3';

import type { PatternMarker } from '../types';
import { barIndexForDate } from '../../utils/dateBarIndex';
import type { ChartPatternCtx } from '../mountChartPatternOverlay';
import { chipHeight, drawLabelChip, drawMarker, MARKER_SIZE, xForBar } from './_shared';

type Markers = {
  cross_date: string;
  cross_price: number;
};

export function renderGoldenCross(
  detection: PatternMarker,
  target: d3.Selection<SVGGElement, unknown, null, undefined>,
  labelTarget: d3.Selection<SVGGElement, unknown, null, undefined>,
  ctx: ChartPatternCtx,
): void {
  const m = detection.markers as unknown as Markers;
  if (!m?.cross_date || !Number.isFinite(m.cross_price)) return;

  const st = ctx.patternStyle.golden_cross;
  const rc = ctx.resolveColor;

  const idx = barIndexForDate(ctx.bars, m.cross_date);
  if (idx == null) return;
  const xLeft = xForBar(idx, ctx);
  if (xLeft == null) return;

  const xCenter = xLeft + ctx.bandwidth / 2;
  const y = ctx.yPrice(m.cross_price);

  drawMarker(target, {
    x: xCenter,
    y,
    kind: 'dot',
    color: st.dotFill,
    rc,
  });

  drawLabelChip(labelTarget, {
    x: xCenter + MARKER_SIZE + 4,
    y: y - chipHeight(st.labelFontSize) / 2,
    text: 'Golden cross',
    style: st,
    rc,
    className: 'golden-cross-label',
  });
}
