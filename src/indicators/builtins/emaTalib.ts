import type { IndicatorDef } from '../types';
import { emaTalib, round2 } from '../talibMath';
import { drawLines } from '../draw';

export type EmaTalibParams = { period: number };

// Period-banded factory colors, restoring the pre-refactor per-period EMA
// styling (10 blue / 20 gray / 50 red / 200 green). Half-open bands (exact
// cutoff falls into the upper band); cutoffs 15/30/75. Reuses the legacy
// --ema-N / --chart-ema-N-label tokens (still defined in chart-core.css).
function emaBandColor(period: number): { colorVar: string; labelColorVar: string } {
  if (period < 15)
    return { colorVar: 'var(--ema-10)', labelColorVar: 'var(--chart-ema-10-label)' };
  if (period < 30)
    return { colorVar: 'var(--ema-20)', labelColorVar: 'var(--chart-ema-20-label)' };
  if (period < 75)
    return { colorVar: 'var(--ema-50)', labelColorVar: 'var(--chart-ema-50-label)' };
  return { colorVar: 'var(--ema-200)', labelColorVar: 'var(--chart-ema-200-label)' };
}

/**
 * TA-Lib EMA (SMA-seeded) — registry key `ti:ema`, SEPARATE from the legacy
 * `ema` (pandas-seeded `computeEMA`). Price-pane overlay.
 */
export const emaTalibDef: IndicatorDef<EmaTalibParams> = {
  key: 'ti:ema',
  label: 'EMA',
  longLabel: 'Exponential Moving Average',
  pane: 'price',
  defaultParams: { period: 20 },
  formatParams: (p) => String(p.period),
  paramSpecs: [{ key: 'period', label: 'Length', kind: 'number', min: 1 }],
  warmupBars: (p) => p.period - 1 + Math.max(250, 5 * p.period),
  compute: (input, p) => {
    const out = emaTalib(input.c, p.period);
    for (let i = 0; i < out.length; i++) out[i] = round2(out[i]);
    return { ema: out };
  },
  draw: (ctx, series, scale, style) => drawLines(ctx, series, scale, style),
  // Factory color is period-banded; the `var(--ti-ema)` in defaultStyle is now a
  // dead generic fallback (every EMA gets a band color via this hook).
  defaultLineColor: (p, seriesKey) =>
    seriesKey === 'ema' ? emaBandColor(p.period) : undefined,
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
