import type { IndicatorDef } from '../types';
import { dx, round2 } from '../talibMath';
import { drawLines } from '../draw';

export type DxParams = { period: number };

/** TA-Lib DX — raw directional index (0–100), lookback `period`. Bounded subpane. */
export const dxDef: IndicatorDef<DxParams> = {
  key: 'ti:dx',
  label: 'DX',
  longLabel: 'Directional Movement Index',
  pane: { subpane: 'dx', scaleHint: { fixedDomain: [0, 100] } },
  defaultParams: { period: 14 },
  formatParams: (p) => String(p.period),
  paramSpecs: [{ key: 'period', label: 'Length', kind: 'number', min: 1 }],
  warmupBars: (p) => p.period + Math.max(250, 5 * p.period),
  compute: (input, p) => {
    const out = dx(input.h, input.l, input.c, p.period);
    for (let i = 0; i < out.length; i++) out[i] = round2(out[i]);
    return { dx: out };
  },
  draw: (ctx, series, scale, style) => drawLines(ctx, series, scale, style),
  defaultStyle: {
    lines: [
      {
        seriesKey: 'dx',
        colorVar: 'var(--dx-line)',
        labelColorVar: 'var(--dx-line)',
        label: 'DX',
        width: 1.3,
      },
    ],
    tooltipGroup: 'ti:dx',
    tooltipTitle: 'DX',
  },
};
