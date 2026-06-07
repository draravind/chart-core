import type { IndicatorDef } from '../types';
import { rollingMax, rollingMin, round2 } from '../talibMath';
import { drawLines } from '../draw';

export type WillrParams = { period: number };

/**
 * TA-Lib WILLR — `−100·(HH − close)/(HH − LL)` over `period`; `HH === LL → 0`.
 * Bounded subpane −100..0 (−20/−80 guides). Lookback `period−1`.
 */
export const willrDef: IndicatorDef<WillrParams> = {
  key: 'ti:willr',
  label: 'WILLR',
  pane: {
    subpane: 'willr',
    scaleHint: { fixedDomain: [-100, 0], guideLines: [-20, -80] },
  },
  defaultParams: { period: 14 },
  warmupBars: (p) => p.period - 1 + Math.max(250, 5 * p.period),
  compute: (input, p) => {
    const n = input.c.length;
    const hh = rollingMax(input.h, p.period);
    const ll = rollingMin(input.l, p.period);
    const out = new Float64Array(n);
    out.fill(NaN);
    for (let i = 0; i < n; i++) {
      if (Number.isNaN(hh[i]) || Number.isNaN(ll[i])) continue;
      const range = hh[i] - ll[i];
      out[i] = round2(range === 0 ? 0 : (-100 * (hh[i] - input.c[i])) / range);
    }
    return { willr: out };
  },
  draw: (ctx, series, scale, style) => drawLines(ctx, series, scale, style),
  defaultStyle: {
    lines: [
      {
        seriesKey: 'willr',
        colorVar: 'var(--willr-line)',
        labelColorVar: 'var(--willr-line)',
        label: 'WILLR',
        width: 1.3,
      },
    ],
    tooltipGroup: 'ti:willr',
    tooltipTitle: 'WILLR',
  },
};
