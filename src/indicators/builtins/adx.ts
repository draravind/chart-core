import type { IndicatorDef } from '../types';
import { adx, round2 } from '../talibMath';
import { drawLines, cellAt, fmt2 } from '../draw';

export type AdxSettings = { period: number; lineColor: string };

/** TA-Lib ADX — Wilder-smoothed DX (trend strength, 0–100), lookback `2·period−1`. */
export const adxDef: IndicatorDef<AdxSettings> = {
  key: 'ti:adx',
  label: 'ADX',
  longLabel: 'Average Directional Index',
  pane: { subpane: 'adx' },
  settingsSchema: [
    { key: 'period', label: 'Length', kind: 'number', default: 14, min: 1 },
    { key: 'lineColor', label: 'Line', kind: 'color', default: 'var(--adx-line)' },
  ],
  formatParams: (s) => String(s.period),
  warmupBars: (s) => 2 * s.period - 1 + Math.max(250, 5 * s.period),
  compute: (input, s) => {
    const out = adx(input.h, input.l, input.c, s.period);
    for (let i = 0; i < out.length; i++) out[i] = round2(out[i]);
    return { series: { adx: out } };
  },
  draw: (ctx, series, scale, s, resolveColor) =>
    drawLines(ctx, series, scale, [
      { key: 'adx', st: { color: resolveColor(s.lineColor), width: 1.3 } },
    ]),
  autofitKeys: () => ['adx'],
  domain: () => ({ fixedDomain: [0, 100] }),
  legend: (series, idx, s) => [
    { color: s.lineColor, label: 'ADX', value: cellAt(series.adx, idx, fmt2) },
  ],
};
