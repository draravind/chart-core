import type { IndicatorDef } from '../types';
import { rsi, rawStochK, maDispatch, round2 } from '../talibMath';
import { drawLines, cellAt, fmt2 } from '../draw';
import { lineStyleFrom } from '../lineSettings';
import { MA_TYPE_OPTIONS } from '../settingsOptions';

export type StochrsiSettings = {
  timeperiod: number;
  fastk: number;
  fastd: number;
  fastd_matype: number;
  kColor: string;
  dColor: string;
};

/**
 * TA-Lib STOCHRSI. `rsi = RSI(close, timeperiod)`, then STOCHF applied to the
 * RSI series (RSI is the single price → HH/LL are rolling max/min of RSI):
 * `fastk = 100·(rsi − LL)/(HH − LL)`; `fastd = MA(fastk, fastd)`. Bounded
 * subpane 0–100 (20/80 guides).
 */
export const stochrsiDef: IndicatorDef<StochrsiSettings> = {
  key: 'ti:stochrsi',
  label: 'STOCHRSI',
  longLabel: 'Stochastic RSI',
  pane: { subpane: 'stochrsi' },
  settingsSchema: [
    { key: 'timeperiod', label: 'RSI length', kind: 'number', default: 14, min: 1 },
    { key: 'fastk', label: '%K length', kind: 'number', default: 5, min: 1 },
    { key: 'fastd', label: '%D smoothing', kind: 'number', default: 3, min: 1 },
    { key: 'fastd_matype', label: '%D moving average', kind: 'enum', default: 0, options: MA_TYPE_OPTIONS },
    { key: 'k', label: '%K', kind: 'line', default: { color: 'var(--stoch-k)', width: 1.3 } },
    { key: 'd', label: '%D', kind: 'line', default: { color: 'var(--stoch-d)', width: 1.1, style: 1 } },
  ],
  formatParams: (s) => `${s.timeperiod},${s.fastk},${s.fastd}`,
  warmupBars: (s) =>
    s.timeperiod + (s.fastk - 1) + (s.fastd - 1) + Math.max(250, 5 * s.timeperiod),
  compute: (input, s) => {
    const r = rsi(input.c, s.timeperiod);
    const fastk = rawStochK(r, r, r, s.fastk);
    const fastd = maDispatch(s.fastd_matype, fastk, s.fastd);
    for (let i = 0; i < fastk.length; i++) {
      // TA-Lib aligns fastk to the fastd lookback — mask where fastd is unset.
      if (Number.isNaN(fastd[i])) fastk[i] = NaN;
      fastk[i] = round2(fastk[i]);
      fastd[i] = round2(fastd[i]);
    }
    return { series: { fastk, fastd } };
  },
  draw: (ctx, series, scale, s, resolveColor) =>
    drawLines(ctx, series, scale, [
      { key: 'fastk', st: lineStyleFrom(s, 'k', resolveColor) },
      { key: 'fastd', st: lineStyleFrom(s, 'd', resolveColor) },
    ]),
  autofitKeys: () => ['fastk', 'fastd'],
  domain: () => ({ fixedDomain: [0, 100], guideLines: [20, 80] }),
  legend: (series, idx, s) => [
    { color: s.kColor, label: '%K', value: cellAt(series.fastk, idx, fmt2) },
    { color: s.dColor, label: '%D', value: cellAt(series.fastd, idx, fmt2) },
  ],
};
