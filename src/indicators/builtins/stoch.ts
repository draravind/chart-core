import type { IndicatorDef } from '../types';
import { rawStochK, maDispatch, round2 } from '../talibMath';
import { drawLines, cellAt, fmt2 } from '../draw';
import { lineStyleFrom } from '../lineSettings';
import { MA_TYPE_OPTIONS } from '../settingsOptions';

export type StochSettings = {
  fastk: number;
  slowk: number;
  slowk_matype: number;
  slowd: number;
  slowd_matype: number;
  kColor: string;
  dColor: string;
};

/**
 * TA-Lib STOCH (slow stochastic). Raw %K → `slowk = MA[slowk_matype](%K, slowk)`
 * → `slowd = MA[slowd_matype](slowk, slowd)`. Bounded subpane 0–100 (20/80
 * guides). %K solid, %D dashed.
 */
export const stochDef: IndicatorDef<StochSettings> = {
  key: 'ti:stoch',
  label: 'STOCH',
  longLabel: 'Stochastic',
  pane: { subpane: 'stoch' },
  settingsSchema: [
    { key: 'fastk', label: '%K length', kind: 'number', default: 5, min: 1 },
    { key: 'slowk', label: '%K smoothing', kind: 'number', default: 3, min: 1 },
    { key: 'slowk_matype', label: '%K moving average', kind: 'enum', default: 0, options: MA_TYPE_OPTIONS },
    { key: 'slowd', label: '%D smoothing', kind: 'number', default: 3, min: 1 },
    { key: 'slowd_matype', label: '%D moving average', kind: 'enum', default: 0, options: MA_TYPE_OPTIONS },
    { key: 'k', label: '%K', kind: 'line', default: { color: 'var(--stoch-k)', width: 1.3 } },
    { key: 'd', label: '%D', kind: 'line', default: { color: 'var(--stoch-d)', width: 1.1, style: 1 } },
  ],
  formatParams: (s) => `${s.fastk},${s.slowk},${s.slowd}`,
  warmupBars: (s) =>
    s.fastk - 1 + (s.slowk - 1) + (s.slowd - 1) + Math.max(250, 5 * s.fastk),
  compute: (input, s) => {
    const rawK = rawStochK(input.h, input.l, input.c, s.fastk);
    const slowkArr = maDispatch(s.slowk_matype, rawK, s.slowk);
    const slowdArr = maDispatch(s.slowd_matype, slowkArr, s.slowd);
    for (let i = 0; i < slowkArr.length; i++) {
      // TA-Lib aligns BOTH outputs to the slowd lookback — mask slowk where
      // slowd has no value yet.
      if (Number.isNaN(slowdArr[i])) slowkArr[i] = NaN;
      slowkArr[i] = round2(slowkArr[i]);
      slowdArr[i] = round2(slowdArr[i]);
    }
    return { series: { slowk: slowkArr, slowd: slowdArr } };
  },
  draw: (ctx, series, scale, s, resolveColor) =>
    drawLines(ctx, series, scale, [
      { key: 'slowk', st: lineStyleFrom(s, 'k', resolveColor) },
      { key: 'slowd', st: lineStyleFrom(s, 'd', resolveColor) },
    ]),
  autofitKeys: () => ['slowk', 'slowd'],
  domain: () => ({ fixedDomain: [0, 100], guideLines: [20, 80] }),
  legend: (series, idx, s) => [
    { color: s.kColor, label: '%K', value: cellAt(series.slowk, idx, fmt2) },
    { color: s.dColor, label: '%D', value: cellAt(series.slowd, idx, fmt2) },
  ],
};
