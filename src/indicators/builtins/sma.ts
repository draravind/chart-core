import type { IndicatorDef } from '../types';
import { sma, round2 } from '../talibMath';
import { drawLines, cellAt } from '../draw';
import { lineStyleFrom } from '../lineSettings';

export type SmaSettings = { period: number; lineColor: string };

/** TA-Lib SMA — arithmetic mean over the window. Price-pane overlay. */
export const smaDef: IndicatorDef<SmaSettings> = {
  key: 'ti:sma',
  label: 'SMA',
  longLabel: 'Simple Moving Average',
  pane: 'price',
  settingsSchema: [
    { key: 'period', label: 'Length', kind: 'number', default: 20, min: 1 },
    { key: 'line', label: 'Line', kind: 'line', default: { color: 'var(--ti-sma)', width: 1.2 } },
  ],
  formatParams: (s) => String(s.period),
  warmupBars: (s) => s.period - 1 + Math.max(250, 5 * s.period),
  compute: (input, s) => {
    const out = sma(input.c, s.period);
    for (let i = 0; i < out.length; i++) out[i] = round2(out[i]);
    return { series: { sma: out } };
  },
  draw: (ctx, series, scale, s, resolveColor) =>
    drawLines(ctx, series, scale, [
      { key: 'sma', st: lineStyleFrom(s, 'line', resolveColor) },
    ]),
  autofitKeys: () => ['sma'],
  legend: (series, idx, s, ctx) => [
    { color: s.lineColor, label: 'SMA', value: cellAt(series.sma, idx, ctx.priceFmt) },
  ],
};
