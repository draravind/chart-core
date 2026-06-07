import type { IndicatorDef } from '../types';
import { sma, round2 } from '../talibMath';
import { drawLines } from '../draw';

export type SmaParams = { period: number };

/** TA-Lib SMA — arithmetic mean over the window. Price-pane overlay. */
export const smaDef: IndicatorDef<SmaParams> = {
  key: 'ti:sma',
  label: 'SMA',
  pane: 'price',
  defaultParams: { period: 20 },
  warmupBars: (p) => p.period - 1 + Math.max(250, 5 * p.period),
  compute: (input, p) => {
    const out = sma(input.c, p.period);
    for (let i = 0; i < out.length; i++) out[i] = round2(out[i]);
    return { sma: out };
  },
  draw: (ctx, series, scale, style) => drawLines(ctx, series, scale, style),
  defaultStyle: {
    lines: [
      {
        seriesKey: 'sma',
        colorVar: 'var(--ti-sma)',
        labelColorVar: 'var(--ti-sma)',
        label: 'SMA',
        width: 1.2,
      },
    ],
    tooltipGroup: 'ti:sma',
    tooltipTitle: 'SMA',
  },
};
