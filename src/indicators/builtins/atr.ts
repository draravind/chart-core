import type { IndicatorDef } from '../types';
import { atr, round2 } from '../talibMath';
import { drawLines, cellAt, fmt2 } from '../draw';
import { lineStyleFrom } from '../lineSettings';

export type AtrSettings = { period: number; lineColor: string };

/** TA-Lib ATR — Wilder-smoothed true range (price units, ≥0). Autofit subpane. */
export const atrDef: IndicatorDef<AtrSettings> = {
  key: 'ti:atr',
  label: 'ATR',
  longLabel: 'Average True Range',
  pane: { subpane: 'atr' },
  settingsSchema: [
    { key: 'period', label: 'Length', kind: 'number', default: 14, min: 1 },
    { key: 'line', label: 'Line', kind: 'line', default: { color: 'var(--atr-line)', width: 1.3 } },
  ],
  formatParams: (s) => String(s.period),
  warmupBars: (s) => s.period + Math.max(250, 5 * s.period),
  compute: (input, s) => {
    const out = atr(input.h, input.l, input.c, s.period);
    for (let i = 0; i < out.length; i++) out[i] = round2(out[i]);
    return { series: { atr: out } };
  },
  draw: (ctx, series, scale, s, resolveColor) =>
    drawLines(ctx, series, scale, [
      { key: 'atr', st: lineStyleFrom(s, 'line', resolveColor) },
    ]),
  autofitKeys: () => ['atr'],
  legend: (series, idx, s) => [
    { color: s.lineColor, label: 'ATR', value: cellAt(series.atr, idx, fmt2) },
  ],
};
