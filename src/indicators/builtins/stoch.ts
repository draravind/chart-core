import type { IndicatorDef } from '../types';
import { rawStochK, maDispatch, round2 } from '../talibMath';
import { drawLines } from '../draw';

export type StochParams = {
  fastk: number;
  slowk: number;
  slowk_matype: number;
  slowd: number;
  slowd_matype: number;
};

/**
 * TA-Lib STOCH (slow stochastic). Raw %K → `slowk = MA[slowk_matype](%K, slowk)`
 * → `slowd = MA[slowd_matype](slowk, slowd)`. Bounded subpane 0–100 (20/80
 * guides). %K solid, %D dashed.
 */
export const stochDef: IndicatorDef<StochParams> = {
  key: 'ti:stoch',
  label: 'STOCH',
  pane: {
    subpane: 'stoch',
    scaleHint: { fixedDomain: [0, 100], guideLines: [20, 80] },
  },
  defaultParams: {
    fastk: 5,
    slowk: 3,
    slowk_matype: 0,
    slowd: 3,
    slowd_matype: 0,
  },
  warmupBars: (p) =>
    p.fastk - 1 + (p.slowk - 1) + (p.slowd - 1) + Math.max(250, 5 * p.fastk),
  compute: (input, p) => {
    const rawK = rawStochK(input.h, input.l, input.c, p.fastk);
    const slowkArr = maDispatch(p.slowk_matype, rawK, p.slowk);
    const slowdArr = maDispatch(p.slowd_matype, slowkArr, p.slowd);
    for (let i = 0; i < slowkArr.length; i++) {
      // TA-Lib aligns BOTH outputs to the slowd lookback — mask slowk where
      // slowd has no value yet.
      if (Number.isNaN(slowdArr[i])) slowkArr[i] = NaN;
      slowkArr[i] = round2(slowkArr[i]);
      slowdArr[i] = round2(slowdArr[i]);
    }
    return { slowk: slowkArr, slowd: slowdArr };
  },
  draw: (ctx, series, scale, style) => drawLines(ctx, series, scale, style),
  defaultStyle: {
    lines: [
      {
        seriesKey: 'slowk',
        colorVar: 'var(--stoch-k)',
        labelColorVar: 'var(--stoch-k)',
        label: '%K',
        width: 1.3,
      },
      {
        seriesKey: 'slowd',
        colorVar: 'var(--stoch-d)',
        labelColorVar: 'var(--stoch-d)',
        label: '%D',
        width: 1.1,
        dash: [4, 3],
      },
    ],
    tooltipGroup: 'ti:stoch',
    tooltipTitle: 'STOCH',
  },
};
