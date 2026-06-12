import type { IndicatorDef } from '../types';
import { dx, round2 } from '../talibMath';
import { drawLines, cellAt, fmt2 } from '../draw';

export type DxSettings = { period: number; lineColor: string };

/** TA-Lib DX — raw directional index (0–100), lookback `period`. Bounded subpane. */
export const dxDef: IndicatorDef<DxSettings> = {
  key: 'ti:dx',
  label: 'DX',
  longLabel: 'Directional Movement Index',
  pane: { subpane: 'dx' },
  settingsSchema: [
    { key: 'period', label: 'Length', kind: 'number', default: 14, min: 1 },
    { key: 'lineColor', label: 'Line', kind: 'color', default: 'var(--dx-line)' },
  ],
  formatParams: (s) => String(s.period),
  warmupBars: (s) => s.period + Math.max(250, 5 * s.period),
  compute: (input, s) => {
    const out = dx(input.h, input.l, input.c, s.period);
    for (let i = 0; i < out.length; i++) out[i] = round2(out[i]);
    return { series: { dx: out } };
  },
  draw: (ctx, series, scale, s, resolveColor) =>
    drawLines(ctx, series, scale, [
      { key: 'dx', st: { color: resolveColor(s.lineColor), width: 1.3 } },
    ]),
  autofitKeys: () => ['dx'],
  domain: () => ({ fixedDomain: [0, 100] }),
  legend: (series, idx, s) => [
    { color: s.lineColor, label: 'DX', value: cellAt(series.dx, idx, fmt2) },
  ],
};
