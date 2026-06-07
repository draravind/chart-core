import type { IndicatorDef } from '../types';
import { emaTalib, emaTalibAt, round2 } from '../talibMath';
import { drawPolyline, drawHistogram } from '../draw';

export type MacdParams = { fast: number; slow: number; signal: number };

/**
 * TA-Lib MACD — `macd = EMA(fast) − EMA(slow)`; `signal = EMA(macd, signal)`;
 * `hist = macd − signal`. All three outputs are aligned to the signal lookback
 * `(slow−1)+(signal−1)` (TA-Lib emits the macd line from there too). Unbounded
 * subpane with a zero line; histogram drawn as bars. `slow` must exceed `fast`.
 */
export const macdDef: IndicatorDef<MacdParams> = {
  key: 'ti:macd',
  label: 'MACD',
  longLabel: 'Moving Average Convergence Divergence',
  pane: { subpane: 'macd', scaleHint: { zeroLine: true } },
  defaultParams: { fast: 12, slow: 26, signal: 9 },
  formatParams: (p) => `${p.fast},${p.slow},${p.signal}`,
  paramSpecs: [
    { key: 'fast', label: 'Fast', kind: 'number', min: 1 },
    { key: 'slow', label: 'Slow', kind: 'number', min: 1 },
    { key: 'signal', label: 'Signal', kind: 'number', min: 1 },
  ],
  warmupBars: (p) =>
    p.slow - 1 + (p.signal - 1) + Math.max(250, 5 * p.slow),
  compute: (input, p) => {
    const n = input.c.length;
    // TA-Lib seeds BOTH EMAs at index `slow−1` so they share a start point: the
    // fast EMA seeds with the SMA of its `fast` values ending at `slow−1` (NOT
    // its own earlier `fast−1` seed), the slow EMA with SMA of the first `slow`.
    const emaFast = emaTalibAt(input.c, p.fast, p.slow - 1);
    const emaSlow = emaTalib(input.c, p.slow);
    const macdLine = new Float64Array(n);
    macdLine.fill(NaN);
    for (let i = 0; i < n; i++) {
      if (!Number.isNaN(emaFast[i]) && !Number.isNaN(emaSlow[i]))
        macdLine[i] = emaFast[i] - emaSlow[i];
    }
    const signalLine = emaTalib(macdLine, p.signal);
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
    return { macd, macdsignal, macdhist };
  },
  draw: (ctx, series, scale, style) => {
    const histStyle = style.find((s) => s.seriesKey === 'macdhist');
    const downColor = style.find((s) => s.seriesKey === 'macdhist_down')?.color;
    if (histStyle && series.macdhist) {
      drawHistogram(ctx, scale, series.macdhist, histStyle, downColor);
    }
    for (const line of style) {
      if (line.seriesKey === 'macdhist' || line.width === 0) continue;
      const values = series[line.seriesKey];
      if (!values) continue;
      drawPolyline(ctx, scale, values, line, (g) => !Number.isNaN(values[g]));
    }
  },
  defaultStyle: {
    lines: [
      {
        seriesKey: 'macd',
        colorVar: 'var(--macd-line)',
        labelColorVar: 'var(--macd-line)',
        label: 'MACD',
        width: 1.3,
      },
      {
        seriesKey: 'macdsignal',
        colorVar: 'var(--macd-signal)',
        labelColorVar: 'var(--macd-signal)',
        label: 'Signal',
        width: 1.1,
      },
      {
        // Histogram contributes to the pane domain (non-zero width) but is drawn
        // as bars, not a polyline. Up bars use this color.
        seriesKey: 'macdhist',
        colorVar: 'var(--macd-hist-up)',
        labelColorVar: 'var(--macd-hist-up)',
        label: 'Hist',
        width: 1,
      },
      {
        // Marker-only (width 0): carries the down-bar color for the histogram;
        // no series array, excluded from autofit and polyline drawing.
        seriesKey: 'macdhist_down',
        colorVar: 'var(--macd-hist-down)',
        labelColorVar: 'var(--macd-hist-down)',
        label: 'HistDown',
        width: 0,
      },
    ],
    tooltipGroup: 'ti:macd',
    tooltipTitle: 'MACD',
  },
};
