import type { IndicatorDef } from '../types';
import { adx, round2 } from '../talibMath';
import { drawLines } from '../draw';

export type AdxParams = { period: number };

/** TA-Lib ADX — Wilder-smoothed DX (trend strength, 0–100), lookback `2·period−1`. */
export const adxDef: IndicatorDef<AdxParams> = {
  key: 'ti:adx',
  label: 'ADX',
  longLabel: 'Average Directional Index',
  pane: { subpane: 'adx', scaleHint: { fixedDomain: [0, 100] } },
  defaultParams: { period: 14 },
  formatParams: (p) => String(p.period),
  paramSpecs: [{ key: 'period', label: 'Length', kind: 'number', min: 1 }],
  warmupBars: (p) => 2 * p.period - 1 + Math.max(250, 5 * p.period),
  compute: (input, p) => {
    const out = adx(input.h, input.l, input.c, p.period);
    for (let i = 0; i < out.length; i++) out[i] = round2(out[i]);
    return { adx: out };
  },
  draw: (ctx, series, scale, style) => drawLines(ctx, series, scale, style),
  defaultStyle: {
    lines: [
      {
        seriesKey: 'adx',
        colorVar: 'var(--adx-line)',
        labelColorVar: 'var(--adx-line)',
        label: 'ADX',
        width: 1.3,
      },
    ],
    tooltipGroup: 'ti:adx',
    tooltipTitle: 'ADX',
  },
};
