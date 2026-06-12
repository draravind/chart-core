import type { IndicatorDef } from '../types';
import { emaTalib, round2 } from '../talibMath';
import { drawLines, cellAt } from '../draw';

export type EmaTalibSettings = {
  period: number;
  lineColor: string;
  labelColor: string;
};

// Period-banded factory colors, restoring the pre-refactor per-period EMA
// styling (10 blue / 20 gray / 50 red / 200 green). Half-open bands (exact
// cutoff falls into the upper band); cutoffs 15/30/75. Reuses the legacy
// --ema-N / --chart-ema-N-label tokens (still defined in chart-core.css). The
// line and label tokens are distinct, so both ride their own color fields.
function emaBandColor(period: number): { line: string; label: string } {
  if (period < 15)
    return { line: 'var(--ema-10)', label: 'var(--chart-ema-10-label)' };
  if (period < 30)
    return { line: 'var(--ema-20)', label: 'var(--chart-ema-20-label)' };
  if (period < 75)
    return { line: 'var(--ema-50)', label: 'var(--chart-ema-50-label)' };
  return { line: 'var(--ema-200)', label: 'var(--chart-ema-200-label)' };
}

/**
 * TA-Lib EMA (SMA-seeded) — registry key `ti:ema`, SEPARATE from the legacy
 * `ema` (pandas-seeded `computeEMA`). Price-pane overlay. The line/label colors
 * are period-banded via `deriveDefaults` (layered under any user override).
 */
export const emaTalibDef: IndicatorDef<EmaTalibSettings> = {
  key: 'ti:ema',
  label: 'EMA',
  longLabel: 'Exponential Moving Average',
  pane: 'price',
  settingsSchema: [
    { key: 'period', label: 'Length', kind: 'number', default: 20, min: 1 },
    { key: 'lineColor', label: 'Line', kind: 'color', default: 'var(--ti-ema)' },
    { key: 'labelColor', label: 'Label', kind: 'color', default: 'var(--ti-ema)' },
  ],
  deriveDefaults: (s) => {
    const b = emaBandColor(s.period);
    return { lineColor: b.line, labelColor: b.label };
  },
  formatParams: (s) => String(s.period),
  warmupBars: (s) => s.period - 1 + Math.max(250, 5 * s.period),
  compute: (input, s) => {
    const out = emaTalib(input.c, s.period);
    for (let i = 0; i < out.length; i++) out[i] = round2(out[i]);
    return { series: { ema: out } };
  },
  draw: (ctx, series, scale, s, resolveColor) =>
    drawLines(ctx, series, scale, [
      { key: 'ema', st: { color: resolveColor(s.lineColor), width: 1.2 } },
    ]),
  autofitKeys: () => ['ema'],
  legend: (series, idx, s, ctx) => [
    { color: s.labelColor, label: 'EMA', value: cellAt(series.ema, idx, ctx.priceFmt) },
  ],
};
