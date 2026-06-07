import type { IndicatorDef } from '../types';
import { tema, round2 } from '../talibMath';
import { drawLines } from '../draw';

export type TemaParams = { period: number };

/** TA-Lib TEMA — `3·EMA − 3·EMA(EMA) + EMA(EMA(EMA))`, lookback `3(period−1)`. */
export const temaDef: IndicatorDef<TemaParams> = {
  key: 'ti:tema',
  label: 'TEMA',
  pane: 'price',
  defaultParams: { period: 20 },
  warmupBars: (p) => 3 * (p.period - 1) + Math.max(250, 5 * p.period),
  compute: (input, p) => {
    const out = tema(input.c, p.period);
    for (let i = 0; i < out.length; i++) out[i] = round2(out[i]);
    return { tema: out };
  },
  draw: (ctx, series, scale, style) => drawLines(ctx, series, scale, style),
  defaultStyle: {
    lines: [
      {
        seriesKey: 'tema',
        colorVar: 'var(--ti-tema)',
        labelColorVar: 'var(--ti-tema)',
        label: 'TEMA',
        width: 1.2,
      },
    ],
    tooltipGroup: 'ti:tema',
    tooltipTitle: 'TEMA',
  },
};
