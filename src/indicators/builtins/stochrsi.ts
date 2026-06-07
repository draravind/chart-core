import type { IndicatorDef } from '../types';
import { rsi, rawStochK, maDispatch, round2 } from '../talibMath';
import { drawLines } from '../draw';
import { MA_TYPE_OPTIONS } from '../paramSpecs';

export type StochrsiParams = {
  timeperiod: number;
  fastk: number;
  fastd: number;
  fastd_matype: number;
};

/**
 * TA-Lib STOCHRSI. `rsi = RSI(close, timeperiod)`, then STOCHF applied to the
 * RSI series (RSI is the single price → HH/LL are rolling max/min of RSI):
 * `fastk = 100·(rsi − LL)/(HH − LL)`; `fastd = MA(fastk, fastd)`. Bounded
 * subpane 0–100 (20/80 guides).
 */
export const stochrsiDef: IndicatorDef<StochrsiParams> = {
  key: 'ti:stochrsi',
  label: 'STOCHRSI',
  longLabel: 'Stochastic RSI',
  pane: {
    subpane: 'stochrsi',
    scaleHint: { fixedDomain: [0, 100], guideLines: [20, 80] },
  },
  defaultParams: { timeperiod: 14, fastk: 5, fastd: 3, fastd_matype: 0 },
  formatParams: (p) => `${p.timeperiod},${p.fastk},${p.fastd}`,
  paramSpecs: [
    { key: 'timeperiod', label: 'RSI length', kind: 'number', min: 1 },
    { key: 'fastk', label: '%K length', kind: 'number', min: 1 },
    { key: 'fastd', label: '%D smoothing', kind: 'number', min: 1 },
    { key: 'fastd_matype', label: '%D moving average', kind: 'enum', options: MA_TYPE_OPTIONS },
  ],
  warmupBars: (p) =>
    p.timeperiod + (p.fastk - 1) + (p.fastd - 1) + Math.max(250, 5 * p.timeperiod),
  compute: (input, p) => {
    const r = rsi(input.c, p.timeperiod);
    const fastk = rawStochK(r, r, r, p.fastk);
    const fastd = maDispatch(p.fastd_matype, fastk, p.fastd);
    for (let i = 0; i < fastk.length; i++) {
      // TA-Lib aligns fastk to the fastd lookback — mask where fastd is unset.
      if (Number.isNaN(fastd[i])) fastk[i] = NaN;
      fastk[i] = round2(fastk[i]);
      fastd[i] = round2(fastd[i]);
    }
    return { fastk, fastd };
  },
  draw: (ctx, series, scale, style) => drawLines(ctx, series, scale, style),
  defaultStyle: {
    lines: [
      {
        seriesKey: 'fastk',
        colorVar: 'var(--stoch-k)',
        labelColorVar: 'var(--stoch-k)',
        label: '%K',
        width: 1.3,
      },
      {
        seriesKey: 'fastd',
        colorVar: 'var(--stoch-d)',
        labelColorVar: 'var(--stoch-d)',
        label: '%D',
        width: 1.1,
        dash: [4, 3],
      },
    ],
    tooltipGroup: 'ti:stochrsi',
    tooltipTitle: 'STOCHRSI',
  },
};
