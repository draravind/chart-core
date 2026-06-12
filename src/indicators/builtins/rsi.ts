import type { IndicatorDef } from '../types';
import { rsi, round2 } from '../talibMath';
import { drawLines, cellAt, fmt2 } from '../draw';

export type RsiSettings = { period: number; lineColor: string };

/** TA-Lib RSI — Wilder momentum oscillator (0–100). Bounded subpane. */
export const rsiDef: IndicatorDef<RsiSettings> = {
  key: 'ti:rsi',
  label: 'RSI',
  longLabel: 'Relative Strength Index',
  pane: { subpane: 'rsi' },
  settingsSchema: [
    { key: 'period', label: 'Length', kind: 'number', default: 14, min: 1 },
    { key: 'lineColor', label: 'Line', kind: 'color', default: 'var(--rsi-line)' },
  ],
  formatParams: (s) => String(s.period),
  warmupBars: (s) => s.period + Math.max(250, 5 * s.period),
  compute: (input, s) => {
    const out = rsi(input.c, s.period);
    for (let i = 0; i < out.length; i++) out[i] = round2(out[i]);
    return { series: { rsi: out } };
  },
  draw: (ctx, series, scale, s, resolveColor) =>
    drawLines(ctx, series, scale, [
      { key: 'rsi', st: { color: resolveColor(s.lineColor), width: 1.3 } },
    ]),
  autofitKeys: () => ['rsi'],
  domain: () => ({ fixedDomain: [0, 100], guideLines: [30, 70] }),
  legend: (series, idx, s) => [
    { color: s.lineColor, label: 'RSI', value: cellAt(series.rsi, idx, fmt2) },
  ],
};
