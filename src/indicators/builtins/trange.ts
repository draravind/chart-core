import type { IndicatorDef } from '../types';
import { trueRange, round2 } from '../talibMath';
import { drawLines } from '../draw';

export type TrangeParams = Record<string, never>;

/** TA-Lib TRANGE — per-bar true range (≥0), `tr[0] = NaN`. Autofit subpane. */
export const trangeDef: IndicatorDef<TrangeParams> = {
  key: 'ti:trange',
  label: 'TRANGE',
  longLabel: 'True Range',
  pane: { subpane: 'trange' },
  defaultParams: {},
  warmupBars: () => 1 + 250,
  compute: (input) => {
    const out = trueRange(input.h, input.l, input.c);
    for (let i = 0; i < out.length; i++) out[i] = round2(out[i]);
    return { trange: out };
  },
  draw: (ctx, series, scale, style) => drawLines(ctx, series, scale, style),
  defaultStyle: {
    lines: [
      {
        seriesKey: 'trange',
        colorVar: 'var(--trange-line)',
        labelColorVar: 'var(--trange-line)',
        label: 'TRANGE',
        width: 1.3,
      },
    ],
    tooltipGroup: 'ti:trange',
    tooltipTitle: 'TRANGE',
  },
};
