import type { IndicatorDef } from '../types';
import { rsi, round2 } from '../talibMath';
import { drawLines } from '../draw';

export type RsiParams = { period: number };

/** TA-Lib RSI — Wilder momentum oscillator (0–100). Bounded subpane. */
export const rsiDef: IndicatorDef<RsiParams> = {
  key: 'ti:rsi',
  label: 'RSI',
  longLabel: 'Relative Strength Index',
  pane: {
    subpane: 'rsi',
    scaleHint: { fixedDomain: [0, 100], guideLines: [30, 70] },
  },
  defaultParams: { period: 14 },
  formatParams: (p) => String(p.period),
  paramSpecs: [{ key: 'period', label: 'Length', kind: 'number', min: 1 }],
  warmupBars: (p) => p.period + Math.max(250, 5 * p.period),
  compute: (input, p) => {
    const out = rsi(input.c, p.period);
    for (let i = 0; i < out.length; i++) out[i] = round2(out[i]);
    return { rsi: out };
  },
  draw: (ctx, series, scale, style) => drawLines(ctx, series, scale, style),
  defaultStyle: {
    lines: [
      {
        seriesKey: 'rsi',
        colorVar: 'var(--rsi-line)',
        labelColorVar: 'var(--rsi-line)',
        label: 'RSI',
        width: 1.3,
      },
    ],
    tooltipGroup: 'ti:rsi',
    tooltipTitle: 'RSI',
  },
};
