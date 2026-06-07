import type { IndicatorDef } from '../types';
import { emaTalib, round2 } from '../talibMath';
import { drawLines } from '../draw';

export type EmaTalibParams = { period: number };

/**
 * TA-Lib EMA (SMA-seeded) — registry key `ti:ema`, SEPARATE from the legacy
 * `ema` (pandas-seeded `computeEMA`). Price-pane overlay.
 */
export const emaTalibDef: IndicatorDef<EmaTalibParams> = {
  key: 'ti:ema',
  label: 'EMA',
  pane: 'price',
  defaultParams: { period: 20 },
  warmupBars: (p) => p.period - 1 + Math.max(250, 5 * p.period),
  compute: (input, p) => {
    const out = emaTalib(input.c, p.period);
    for (let i = 0; i < out.length; i++) out[i] = round2(out[i]);
    return { ema: out };
  },
  draw: (ctx, series, scale, style) => drawLines(ctx, series, scale, style),
  defaultStyle: {
    lines: [
      {
        seriesKey: 'ema',
        colorVar: 'var(--ti-ema)',
        labelColorVar: 'var(--ti-ema)',
        label: 'EMA',
        width: 1.2,
      },
    ],
    tooltipGroup: 'ti:ema',
    tooltipTitle: 'EMA',
  },
};
