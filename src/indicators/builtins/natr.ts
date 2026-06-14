import type { IndicatorDef } from '../types';
import { atr, round2 } from '../talibMath';
import { drawLines, cellAt, fmt2 } from '../draw';
import { lineStyleFrom } from '../lineSettings';

export type NatrSettings = { period: number; lineColor: string };

/** TA-Lib NATR — `100·ATR/close` (percent, ≥0). Autofit subpane. */
export const natrDef: IndicatorDef<NatrSettings> = {
  key: 'ti:natr',
  label: 'NATR',
  longLabel: 'Normalized Average True Range',
  pane: { subpane: 'natr' },
  settingsSchema: [
    { key: 'period', label: 'Length', kind: 'number', default: 14, min: 1 },
    { key: 'line', label: 'Line', kind: 'line', default: { color: 'var(--natr-line)', width: 1.3 } },
  ],
  formatParams: (s) => String(s.period),
  warmupBars: (s) => s.period + Math.max(250, 5 * s.period),
  compute: (input, s) => {
    const n = input.c.length;
    const a = atr(input.h, input.l, input.c, s.period);
    const out = new Float64Array(n);
    out.fill(NaN);
    for (let i = 0; i < n; i++) {
      if (Number.isNaN(a[i]) || input.c[i] === 0) continue;
      out[i] = round2((100 * a[i]) / input.c[i]);
    }
    return { series: { natr: out } };
  },
  draw: (ctx, series, scale, s, resolveColor) =>
    drawLines(ctx, series, scale, [
      { key: 'natr', st: lineStyleFrom(s, 'line', resolveColor) },
    ]),
  autofitKeys: () => ['natr'],
  legend: (series, idx, s) => [
    { color: s.lineColor, label: 'NATR', value: cellAt(series.natr, idx, fmt2) },
  ],
};
