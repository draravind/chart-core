import type { IndicatorDef } from '../types';
import { wma, round2 } from '../talibMath';
import { drawLines } from '../draw';

export type WmaParams = { period: number };

/** TA-Lib WMA — linearly-weighted moving average. Price-pane overlay. */
export const wmaDef: IndicatorDef<WmaParams> = {
  key: 'ti:wma',
  label: 'WMA',
  longLabel: 'Weighted Moving Average',
  pane: 'price',
  defaultParams: { period: 20 },
  formatParams: (p) => String(p.period),
  paramSpecs: [{ key: 'period', label: 'Length', kind: 'number', min: 1 }],
  warmupBars: (p) => p.period - 1 + Math.max(250, 5 * p.period),
  compute: (input, p) => {
    const out = wma(input.c, p.period);
    for (let i = 0; i < out.length; i++) out[i] = round2(out[i]);
    return { wma: out };
  },
  draw: (ctx, series, scale, style) => drawLines(ctx, series, scale, style),
  defaultStyle: {
    lines: [
      {
        seriesKey: 'wma',
        colorVar: 'var(--ti-wma)',
        labelColorVar: 'var(--ti-wma)',
        label: 'WMA',
        width: 1.2,
      },
    ],
    tooltipGroup: 'ti:wma',
    tooltipTitle: 'WMA',
  },
};
