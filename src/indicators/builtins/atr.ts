import type { IndicatorDef } from '../types';
import { atr, round2 } from '../talibMath';
import { drawLines } from '../draw';

export type AtrParams = { period: number };

/** TA-Lib ATR — Wilder-smoothed true range (price units, ≥0). Autofit subpane. */
export const atrDef: IndicatorDef<AtrParams> = {
  key: 'ti:atr',
  label: 'ATR',
  longLabel: 'Average True Range',
  pane: { subpane: 'atr' },
  defaultParams: { period: 14 },
  formatParams: (p) => String(p.period),
  paramSpecs: [{ key: 'period', label: 'Length', kind: 'number', min: 1 }],
  warmupBars: (p) => p.period + Math.max(250, 5 * p.period),
  compute: (input, p) => {
    const out = atr(input.h, input.l, input.c, p.period);
    for (let i = 0; i < out.length; i++) out[i] = round2(out[i]);
    return { atr: out };
  },
  draw: (ctx, series, scale, style) => drawLines(ctx, series, scale, style),
  defaultStyle: {
    lines: [
      {
        seriesKey: 'atr',
        colorVar: 'var(--atr-line)',
        labelColorVar: 'var(--atr-line)',
        label: 'ATR',
        width: 1.3,
      },
    ],
    tooltipGroup: 'ti:atr',
    tooltipTitle: 'ATR',
  },
};
