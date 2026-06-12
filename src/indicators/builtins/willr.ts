import type { IndicatorDef } from '../types';
import { rollingMax, rollingMin, round2 } from '../talibMath';
import { drawLines, cellAt, fmt2 } from '../draw';

export type WillrSettings = { period: number; lineColor: string };

/**
 * TA-Lib WILLR — `−100·(HH − close)/(HH − LL)` over `period`; `HH === LL → 0`.
 * Bounded subpane −100..0 (−20/−80 guides). Lookback `period−1`.
 */
export const willrDef: IndicatorDef<WillrSettings> = {
  key: 'ti:willr',
  label: 'WILLR',
  longLabel: 'Williams %R',
  pane: { subpane: 'willr' },
  settingsSchema: [
    { key: 'period', label: 'Length', kind: 'number', default: 14, min: 1 },
    { key: 'lineColor', label: 'Line', kind: 'color', default: 'var(--willr-line)' },
  ],
  formatParams: (s) => String(s.period),
  warmupBars: (s) => s.period - 1 + Math.max(250, 5 * s.period),
  compute: (input, s) => {
    const n = input.c.length;
    const hh = rollingMax(input.h, s.period);
    const ll = rollingMin(input.l, s.period);
    const out = new Float64Array(n);
    out.fill(NaN);
    for (let i = 0; i < n; i++) {
      if (Number.isNaN(hh[i]) || Number.isNaN(ll[i])) continue;
      const range = hh[i] - ll[i];
      out[i] = round2(range === 0 ? 0 : (-100 * (hh[i] - input.c[i])) / range);
    }
    return { series: { willr: out } };
  },
  draw: (ctx, series, scale, s, resolveColor) =>
    drawLines(ctx, series, scale, [
      { key: 'willr', st: { color: resolveColor(s.lineColor), width: 1.3 } },
    ]),
  autofitKeys: () => ['willr'],
  domain: () => ({ fixedDomain: [-100, 0], guideLines: [-20, -80] }),
  legend: (series, idx, s) => [
    { color: s.lineColor, label: 'WILLR', value: cellAt(series.willr, idx, fmt2) },
  ],
};
