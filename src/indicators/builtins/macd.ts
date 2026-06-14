import type { IndicatorDef } from '../types';
import { emaTalib, emaTalibAt, round2 } from '../talibMath';
import { drawLines, drawHistogram, cellAt, fmt2 } from '../draw';
import { lineStyleFrom } from '../lineSettings';

export type MacdSettings = {
  fast: number;
  slow: number;
  signal: number;
  macdColor: string;
  macdsignalColor: string;
  histUpColor: string;
  histDownColor: string;
};

/**
 * TA-Lib MACD — `macd = EMA(fast) − EMA(slow)`; `signal = EMA(macd, signal)`;
 * `hist = macd − signal`. All three outputs are aligned to the signal lookback
 * `(slow−1)+(signal−1)` (TA-Lib emits the macd line from there too). Unbounded
 * subpane with a zero line; histogram drawn as bars. `slow` must exceed `fast`.
 */
export const macdDef: IndicatorDef<MacdSettings> = {
  key: 'ti:macd',
  label: 'MACD',
  longLabel: 'Moving Average Convergence Divergence',
  pane: { subpane: 'macd' },
  settingsSchema: [
    { key: 'fast', label: 'Fast', kind: 'number', default: 12, min: 1 },
    { key: 'slow', label: 'Slow', kind: 'number', default: 26, min: 1 },
    { key: 'signal', label: 'Signal', kind: 'number', default: 9, min: 1 },
    { key: 'macd', label: 'MACD', kind: 'line', default: { color: 'var(--macd-line)', width: 1.3 } },
    { key: 'macdsignal', label: 'Signal', kind: 'line', default: { color: 'var(--macd-signal)', width: 1.1 } },
    { key: 'histUpColor', label: 'Hist +', kind: 'color', default: 'var(--macd-hist-up)' },
    { key: 'histDownColor', label: 'Hist −', kind: 'color', default: 'var(--macd-hist-down)' },
  ],
  formatParams: (s) => `${s.fast},${s.slow},${s.signal}`,
  warmupBars: (s) =>
    s.slow - 1 + (s.signal - 1) + Math.max(250, 5 * s.slow),
  compute: (input, s) => {
    const n = input.c.length;
    // TA-Lib seeds BOTH EMAs at index `slow−1` so they share a start point: the
    // fast EMA seeds with the SMA of its `fast` values ending at `slow−1` (NOT
    // its own earlier `fast−1` seed), the slow EMA with SMA of the first `slow`.
    const emaFast = emaTalibAt(input.c, s.fast, s.slow - 1);
    const emaSlow = emaTalib(input.c, s.slow);
    const macdLine = new Float64Array(n);
    macdLine.fill(NaN);
    for (let i = 0; i < n; i++) {
      if (!Number.isNaN(emaFast[i]) && !Number.isNaN(emaSlow[i]))
        macdLine[i] = emaFast[i] - emaSlow[i];
    }
    const signalLine = emaTalib(macdLine, s.signal);
    const macd = new Float64Array(n);
    const macdsignal = new Float64Array(n);
    const macdhist = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      // Align the macd line to the signal lookback (TA-Lib-exact).
      if (Number.isNaN(signalLine[i])) {
        macd[i] = NaN;
        macdsignal[i] = NaN;
        macdhist[i] = NaN;
        continue;
      }
      macd[i] = round2(macdLine[i]);
      macdsignal[i] = round2(signalLine[i]);
      macdhist[i] = round2(macdLine[i] - signalLine[i]);
    }
    return { series: { macd, macdsignal, macdhist } };
  },
  draw: (ctx, series, scale, s, resolveColor) => {
    if (series.macdhist) {
      drawHistogram(
        ctx,
        scale,
        series.macdhist,
        { color: resolveColor(s.histUpColor), width: 1 },
        resolveColor(s.histDownColor),
      );
    }
    drawLines(ctx, series, scale, [
      { key: 'macd', st: lineStyleFrom(s, 'macd', resolveColor) },
      { key: 'macdsignal', st: lineStyleFrom(s, 'macdsignal', resolveColor) },
    ]);
  },
  autofitKeys: () => ['macd', 'macdsignal', 'macdhist'],
  domain: () => ({ zeroLine: true }),
  legend: (series, idx, s) => [
    { color: s.macdColor, label: 'MACD', value: cellAt(series.macd, idx, fmt2) },
    { color: s.macdsignalColor, label: 'Signal', value: cellAt(series.macdsignal, idx, fmt2) },
    { color: s.histUpColor, label: 'Hist', value: cellAt(series.macdhist, idx, fmt2) },
  ],
};
