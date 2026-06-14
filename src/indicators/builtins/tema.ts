import type { IndicatorDef } from '../types';
import { tema, round2 } from '../talibMath';
import { drawLines, cellAt } from '../draw';
import { lineStyleFrom } from '../lineSettings';

export type TemaSettings = { period: number; lineColor: string };

/** TA-Lib TEMA — `3·EMA − 3·EMA(EMA) + EMA(EMA(EMA))`, lookback `3(period−1)`. */
export const temaDef: IndicatorDef<TemaSettings> = {
  key: 'ti:tema',
  label: 'TEMA',
  longLabel: 'Triple Exponential Moving Average',
  pane: 'price',
  settingsSchema: [
    { key: 'period', label: 'Length', kind: 'number', default: 20, min: 1 },
    { key: 'line', label: 'Line', kind: 'line', default: { color: 'var(--ti-tema)', width: 1.2 } },
  ],
  formatParams: (s) => String(s.period),
  warmupBars: (s) => 3 * (s.period - 1) + Math.max(250, 5 * s.period),
  compute: (input, s) => {
    const out = tema(input.c, s.period);
    for (let i = 0; i < out.length; i++) out[i] = round2(out[i]);
    return { series: { tema: out } };
  },
  draw: (ctx, series, scale, s, resolveColor) =>
    drawLines(ctx, series, scale, [
      { key: 'tema', st: lineStyleFrom(s, 'line', resolveColor) },
    ]),
  autofitKeys: () => ['tema'],
  legend: (series, idx, s, ctx) => [
    { color: s.lineColor, label: 'TEMA', value: cellAt(series.tema, idx, ctx.priceFmt) },
  ],
};
