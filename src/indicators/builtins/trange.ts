import type { IndicatorDef } from '../types';
import { trueRange, round2 } from '../talibMath';
import { drawLines, cellAt, fmt2 } from '../draw';

export type TrangeSettings = { lineColor: string };

/** TA-Lib TRANGE — per-bar true range (≥0), `tr[0] = NaN`. Autofit subpane. */
export const trangeDef: IndicatorDef<TrangeSettings> = {
  key: 'ti:trange',
  label: 'TRANGE',
  longLabel: 'True Range',
  pane: { subpane: 'trange' },
  settingsSchema: [
    { key: 'lineColor', label: 'Line', kind: 'color', default: 'var(--trange-line)' },
  ],
  warmupBars: () => 1 + 250,
  compute: (input) => {
    const out = trueRange(input.h, input.l, input.c);
    for (let i = 0; i < out.length; i++) out[i] = round2(out[i]);
    return { series: { trange: out } };
  },
  draw: (ctx, series, scale, s, resolveColor) =>
    drawLines(ctx, series, scale, [
      { key: 'trange', st: { color: resolveColor(s.lineColor), width: 1.3 } },
    ]),
  autofitKeys: () => ['trange'],
  legend: (series, idx, s) => [
    { color: s.lineColor, label: 'TRANGE', value: cellAt(series.trange, idx, fmt2) },
  ],
};
