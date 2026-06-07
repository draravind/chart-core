import type { IndicatorDef } from '../types';
import { atr, round2 } from '../talibMath';
import { drawLines } from '../draw';

export type NatrParams = { period: number };

/** TA-Lib NATR — `100·ATR/close` (percent, ≥0). Autofit subpane. */
export const natrDef: IndicatorDef<NatrParams> = {
  key: 'ti:natr',
  label: 'NATR',
  longLabel: 'Normalized Average True Range',
  pane: { subpane: 'natr' },
  defaultParams: { period: 14 },
  formatParams: (p) => String(p.period),
  paramSpecs: [{ key: 'period', label: 'Length', kind: 'number', min: 1 }],
  warmupBars: (p) => p.period + Math.max(250, 5 * p.period),
  compute: (input, p) => {
    const n = input.c.length;
    const a = atr(input.h, input.l, input.c, p.period);
    const out = new Float64Array(n);
    out.fill(NaN);
    for (let i = 0; i < n; i++) {
      if (Number.isNaN(a[i]) || input.c[i] === 0) continue;
      out[i] = round2((100 * a[i]) / input.c[i]);
    }
    return { natr: out };
  },
  draw: (ctx, series, scale, style) => drawLines(ctx, series, scale, style),
  defaultStyle: {
    lines: [
      {
        seriesKey: 'natr',
        colorVar: 'var(--natr-line)',
        labelColorVar: 'var(--natr-line)',
        label: 'NATR',
        width: 1.3,
      },
    ],
    tooltipGroup: 'ti:natr',
    tooltipTitle: 'NATR',
  },
};
