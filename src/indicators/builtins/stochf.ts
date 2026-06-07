import type { IndicatorDef } from '../types';
import { rawStochK, maDispatch, round2 } from '../talibMath';
import { drawLines } from '../draw';
import { MA_TYPE_OPTIONS } from '../paramSpecs';

export type StochfParams = { fastk: number; fastd: number; fastd_matype: number };

/**
 * TA-Lib STOCHF (fast stochastic). `fastk` = raw %K; `fastd = MA[fastd_matype]
 * (%K, fastd)`. Bounded subpane 0–100 (20/80 guides).
 */
export const stochfDef: IndicatorDef<StochfParams> = {
  key: 'ti:stochf',
  label: 'STOCHF',
  longLabel: 'Stochastic Fast',
  pane: {
    subpane: 'stochf',
    scaleHint: { fixedDomain: [0, 100], guideLines: [20, 80] },
  },
  defaultParams: { fastk: 5, fastd: 3, fastd_matype: 0 },
  formatParams: (p) => `${p.fastk},${p.fastd}`,
  paramSpecs: [
    { key: 'fastk', label: '%K length', kind: 'number', min: 1 },
    { key: 'fastd', label: '%D smoothing', kind: 'number', min: 1 },
    { key: 'fastd_matype', label: '%D moving average', kind: 'enum', options: MA_TYPE_OPTIONS },
  ],
  warmupBars: (p) =>
    p.fastk - 1 + (p.fastd - 1) + Math.max(250, 5 * p.fastk),
  compute: (input, p) => {
    const fastk = rawStochK(input.h, input.l, input.c, p.fastk);
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
    tooltipGroup: 'ti:stochf',
    tooltipTitle: 'STOCHF',
  },
};
