import type { IndicatorDef } from '../types';
import { computeEMA } from '../compute';
import { drawPolyline } from '../draw';

export type EmaParams = { span: number };

// Bars needed so the seeded ewm converges to <1% error: (1−α)^n < 0.01.
function warmupForSpan(span: number): number {
  const alpha = 2 / (span + 1);
  return Math.ceil(Math.log(0.01) / Math.log(1 - alpha));
}

/** Single parametric EMA. One line, drawn on the price pane. */
export const emaDef: IndicatorDef<EmaParams> = {
  key: 'ema',
  label: 'EMA',
  pane: 'price',
  defaultParams: { span: 50 },
  warmupBars: (p) => warmupForSpan(p.span),
  compute: (input, p) => ({ ema: computeEMA(input.c, p.span) }),
  draw: (ctx, series, scale, style) => {
    const values = series.ema;
    if (!values) return;
    for (const line of style) {
      drawPolyline(ctx, scale, values, line, (g) => !Number.isNaN(values[g]));
    }
  },
  defaultStyle: {
    lines: [
      {
        seriesKey: 'ema',
        colorVar: 'var(--ema-50)',
        labelColorVar: 'var(--chart-ema-50-label)',
        label: 'EMA 50',
        width: 1.2,
      },
    ],
    tooltipGroup: 'ema',
  },
};
