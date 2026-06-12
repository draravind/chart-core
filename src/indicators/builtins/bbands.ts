import type { IndicatorDef } from '../types';
import { maDispatch, maLookback, stddevPop, round2 } from '../talibMath';
import { drawLines, cellAt } from '../draw';
import { MA_TYPE_OPTIONS } from '../settingsOptions';

export type BbandsSettings = {
  period: number;
  nbdevup: number;
  nbdevdn: number;
  matype: number;
  upperColor: string;
  midColor: string;
  lowerColor: string;
};

/**
 * TA-Lib BBANDS — middle band = `MA[matype](close, period)`; upper/lower bands
 * `mid ± nbdev·popStdDev` (population stddev, ddof=0). matype subset 0..4
 * (SMA/EMA/WMA/DEMA/TEMA). Price-pane overlay (three lines).
 */
export const bbandsDef: IndicatorDef<BbandsSettings> = {
  key: 'ti:bbands',
  label: 'BBANDS',
  longLabel: 'Bollinger Bands',
  pane: 'price',
  settingsSchema: [
    { key: 'period', label: 'Length', kind: 'number', default: 20, min: 1 },
    { key: 'nbdevup', label: 'Upper band', kind: 'number', default: 2, min: 0, step: 0.1 },
    { key: 'nbdevdn', label: 'Lower band', kind: 'number', default: 2, min: 0, step: 0.1 },
    { key: 'matype', label: 'Moving average type', kind: 'enum', default: 0, options: MA_TYPE_OPTIONS },
    { key: 'upperColor', label: 'Upper', kind: 'color', default: 'var(--bb-upper)' },
    { key: 'midColor', label: 'Mid', kind: 'color', default: 'var(--bb-mid)' },
    { key: 'lowerColor', label: 'Lower', kind: 'color', default: 'var(--bb-lower)' },
  ],
  formatParams: (s) => `${s.period},${s.nbdevup}`,
  warmupBars: (s) =>
    Math.max(maLookback(s.matype, s.period), s.period - 1) +
    Math.max(250, 5 * s.period),
  compute: (input, s) => {
    const n = input.c.length;
    const mid = maDispatch(s.matype, input.c, s.period);
    const std = stddevPop(input.c, s.period);
    const upperband = new Float64Array(n);
    const middleband = new Float64Array(n);
    const lowerband = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      // A band exists only where BOTH the MA and the stddev are valid.
      if (Number.isNaN(mid[i]) || Number.isNaN(std[i])) {
        upperband[i] = NaN;
        middleband[i] = NaN;
        lowerband[i] = NaN;
        continue;
      }
      middleband[i] = round2(mid[i]);
      upperband[i] = round2(mid[i] + s.nbdevup * std[i]);
      lowerband[i] = round2(mid[i] - s.nbdevdn * std[i]);
    }
    return { series: { upperband, middleband, lowerband } };
  },
  draw: (ctx, series, scale, s, resolveColor) =>
    drawLines(ctx, series, scale, [
      { key: 'upperband', st: { color: resolveColor(s.upperColor), width: 1, dash: [4, 3], opacity: 0.8 } },
      { key: 'middleband', st: { color: resolveColor(s.midColor), width: 1.2 } },
      { key: 'lowerband', st: { color: resolveColor(s.lowerColor), width: 1, dash: [4, 3], opacity: 0.8 } },
    ]),
  autofitKeys: () => ['upperband', 'middleband', 'lowerband'],
  legend: (series, idx, s, ctx) => [
    { color: s.upperColor, label: 'Upper', value: cellAt(series.upperband, idx, ctx.priceFmt) },
    { color: s.midColor, label: 'Mid', value: cellAt(series.middleband, idx, ctx.priceFmt) },
    { color: s.lowerColor, label: 'Lower', value: cellAt(series.lowerband, idx, ctx.priceFmt) },
  ],
};
