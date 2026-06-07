import type { IndicatorDef } from '../types';
import { dema, round2 } from '../talibMath';
import { drawLines } from '../draw';

export type DemaParams = { period: number };

/** TA-Lib DEMA — `2·EMA − EMA(EMA)`, lookback `2(period−1)`. Price-pane overlay. */
export const demaDef: IndicatorDef<DemaParams> = {
  key: 'ti:dema',
  label: 'DEMA',
  longLabel: 'Double Exponential Moving Average',
  pane: 'price',
  defaultParams: { period: 20 },
  formatParams: (p) => String(p.period),
  paramSpecs: [{ key: 'period', label: 'Length', kind: 'number', min: 1 }],
  warmupBars: (p) => 2 * (p.period - 1) + Math.max(250, 5 * p.period),
  compute: (input, p) => {
    const out = dema(input.c, p.period);
    for (let i = 0; i < out.length; i++) out[i] = round2(out[i]);
    return { dema: out };
  },
  draw: (ctx, series, scale, style) => drawLines(ctx, series, scale, style),
  defaultStyle: {
    lines: [
      {
        seriesKey: 'dema',
        colorVar: 'var(--ti-dema)',
        labelColorVar: 'var(--ti-dema)',
        label: 'DEMA',
        width: 1.2,
      },
    ],
    tooltipGroup: 'ti:dema',
    tooltipTitle: 'DEMA',
  },
};
