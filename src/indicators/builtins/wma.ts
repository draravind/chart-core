import type { IndicatorDef } from '../types';
import { wma, round2 } from '../talibMath';
import { drawLines, cellAt } from '../draw';

export type WmaSettings = { period: number; lineColor: string };

/** TA-Lib WMA — linearly-weighted moving average. Price-pane overlay. */
export const wmaDef: IndicatorDef<WmaSettings> = {
  key: 'ti:wma',
  label: 'WMA',
  longLabel: 'Weighted Moving Average',
  pane: 'price',
  settingsSchema: [
    { key: 'period', label: 'Length', kind: 'number', default: 20, min: 1 },
    { key: 'lineColor', label: 'Line', kind: 'color', default: 'var(--ti-wma)' },
  ],
  formatParams: (s) => String(s.period),
  warmupBars: (s) => s.period - 1 + Math.max(250, 5 * s.period),
  compute: (input, s) => {
    const out = wma(input.c, s.period);
    for (let i = 0; i < out.length; i++) out[i] = round2(out[i]);
    return { series: { wma: out } };
  },
  draw: (ctx, series, scale, s, resolveColor) =>
    drawLines(ctx, series, scale, [
      { key: 'wma', st: { color: resolveColor(s.lineColor), width: 1.2 } },
    ]),
  autofitKeys: () => ['wma'],
  legend: (series, idx, s, ctx) => [
    { color: s.lineColor, label: 'WMA', value: cellAt(series.wma, idx, ctx.priceFmt) },
  ],
};
