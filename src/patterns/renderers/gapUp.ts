import type * as d3 from 'd3';

import type { PatternMarker } from '../types';
import { barIndexForDate } from '../../utils/dateBarIndex';
import type { ChartPatternCtx } from '../mountChartPatternOverlay';
import { chipHeight, drawLabelChip, xForBar } from './_shared';

// Small fixed rightward extension of the gap band (there is no gap-fill date to
// bound it to, so the band just trails a few step-pitches past the gap bar).
const BAND_EXTENSION_STEPS = 3;

type Markers = {
  gap_date: string;
  prev_high: number;
  gap_low: number;
  gap_pct?: number;
};

export function renderGapUp(
  detection: PatternMarker,
  target: d3.Selection<SVGGElement, unknown, null, undefined>,
  labelTarget: d3.Selection<SVGGElement, unknown, null, undefined>,
  ctx: ChartPatternCtx,
): void {
  const m = detection.markers as unknown as Markers;
  if (!m?.gap_date) return;
  if (!Number.isFinite(m.prev_high) || !Number.isFinite(m.gap_low)) return;

  const st = ctx.patternStyle.gap_up;
  const rc = ctx.resolveColor;

  const idx = barIndexForDate(ctx.bars, m.gap_date);
  if (idx == null) return;
  const xLeft = xForBar(idx, ctx);
  if (xLeft == null) return;

  const xRight = xLeft + ctx.bandwidth + BAND_EXTENSION_STEPS * ctx.step;
  const yTop = ctx.yPrice(Math.max(m.prev_high, m.gap_low));
  const yBot = ctx.yPrice(Math.min(m.prev_high, m.gap_low));

  target
    .append('rect')
    .attr('class', 'gap-up-band')
    .attr('x', xLeft)
    .attr('y', yTop)
    .attr('width', Math.max(0, xRight - xLeft))
    .attr('height', Math.max(0, yBot - yTop))
    .attr('fill', rc(st.bandFill))
    .attr('fill-opacity', st.bandFillOpacity)
    .attr('stroke', 'none');

  const pct =
    typeof m.gap_pct === 'number' && Number.isFinite(m.gap_pct)
      ? ` · ${m.gap_pct.toFixed(1)}%`
      : '';
  const midY = (yTop + yBot) / 2;
  drawLabelChip(labelTarget, {
    x: xRight + 6,
    y: midY - chipHeight(st.labelFontSize) / 2,
    text: `Gap up${pct}`,
    style: st,
    rc,
    className: 'gap-up-label',
  });
}
