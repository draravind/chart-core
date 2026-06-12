import type { IndicatorDef } from '../types';
import { dema, round2 } from '../talibMath';
import { drawLines, cellAt } from '../draw';

export type DemaSettings = { period: number; lineColor: string };

/** TA-Lib DEMA — `2·EMA − EMA(EMA)`, lookback `2(period−1)`. Price-pane overlay. */
export const demaDef: IndicatorDef<DemaSettings> = {
  key: 'ti:dema',
  label: 'DEMA',
  longLabel: 'Double Exponential Moving Average',
  pane: 'price',
  settingsSchema: [
    { key: 'period', label: 'Length', kind: 'number', default: 20, min: 1 },
    { key: 'lineColor', label: 'Line', kind: 'color', default: 'var(--ti-dema)' },
  ],
  formatParams: (s) => String(s.period),
  warmupBars: (s) => 2 * (s.period - 1) + Math.max(250, 5 * s.period),
  compute: (input, s) => {
    const out = dema(input.c, s.period);
    for (let i = 0; i < out.length; i++) out[i] = round2(out[i]);
    return { series: { dema: out } };
  },
  draw: (ctx, series, scale, s, resolveColor) =>
    drawLines(ctx, series, scale, [
      { key: 'dema', st: { color: resolveColor(s.lineColor), width: 1.2 } },
    ]),
  autofitKeys: () => ['dema'],
  legend: (series, idx, s, ctx) => [
    { color: s.lineColor, label: 'DEMA', value: cellAt(series.dema, idx, ctx.priceFmt) },
  ],
};
