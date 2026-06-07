import type { IndicatorDef } from '../types';
import { maDispatch, maLookback, stddevPop, round2 } from '../talibMath';
import { drawLines } from '../draw';

export type BbandsParams = {
  period: number;
  nbdevup: number;
  nbdevdn: number;
  matype: number;
};

/**
 * TA-Lib BBANDS — middle band = `MA[matype](close, period)`; upper/lower bands
 * `mid ± nbdev·popStdDev` (population stddev, ddof=0). matype subset 0..4
 * (SMA/EMA/WMA/DEMA/TEMA). Price-pane overlay (three lines).
 */
export const bbandsDef: IndicatorDef<BbandsParams> = {
  key: 'ti:bbands',
  label: 'BBANDS',
  pane: 'price',
  defaultParams: { period: 20, nbdevup: 2, nbdevdn: 2, matype: 0 },
  warmupBars: (p) =>
    Math.max(maLookback(p.matype, p.period), p.period - 1) +
    Math.max(250, 5 * p.period),
  compute: (input, p) => {
    const n = input.c.length;
    const mid = maDispatch(p.matype, input.c, p.period);
    const std = stddevPop(input.c, p.period);
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
      upperband[i] = round2(mid[i] + p.nbdevup * std[i]);
      lowerband[i] = round2(mid[i] - p.nbdevdn * std[i]);
    }
    return { upperband, middleband, lowerband };
  },
  draw: (ctx, series, scale, style) => drawLines(ctx, series, scale, style),
  defaultStyle: {
    lines: [
      {
        seriesKey: 'upperband',
        colorVar: 'var(--bb-upper)',
        labelColorVar: 'var(--bb-upper)',
        label: 'Upper',
        width: 1,
        dash: [4, 3],
        opacity: 0.8,
      },
      {
        seriesKey: 'middleband',
        colorVar: 'var(--bb-mid)',
        labelColorVar: 'var(--bb-mid)',
        label: 'Mid',
        width: 1.2,
      },
      {
        seriesKey: 'lowerband',
        colorVar: 'var(--bb-lower)',
        labelColorVar: 'var(--bb-lower)',
        label: 'Lower',
        width: 1,
        dash: [4, 3],
        opacity: 0.8,
      },
    ],
    tooltipGroup: 'ti:bbands',
    tooltipTitle: 'BB',
  },
};
