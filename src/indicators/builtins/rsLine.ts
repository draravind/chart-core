import type { IndicatorDef, IndicatorInput } from '../types';
import { computeRollingHigh } from '../compute';
import { drawPolyline, drawDots, cellAt, fmt2 } from '../draw';

export type RsSettings = {
  lookback: number;
  lineColor: string;
  signalColor: string;
};

const round2 = (v: number): number => Math.round(v * 100) / 100;

/**
 * Relative-strength line — `stock_close / benchmark_close` — drawn on its own
 * subpane below price/volume, with dot markers on bars where the
 * "RS-new-high-before-price" signal fires. The benchmark close arrives on
 * `input.benchmarkClose` (date-aligned upstream); absent ⇒ NaN/no-op.
 */
export const rsLineDef: IndicatorDef<RsSettings> = {
  key: 'rs',
  label: 'RS Line',
  longLabel: 'Relative Strength Line',
  pane: { subpane: 'rs' },
  settingsSchema: [
    { key: 'lookback', label: 'Lookback', kind: 'number', default: 252, min: 1 },
    { key: 'lineColor', label: 'RS', kind: 'color', default: 'var(--rs-line)' },
    { key: 'signalColor', label: 'Signal', kind: 'color', default: 'var(--rs-signal)' },
  ],
  formatParams: (s) => String(s.lookback),
  warmupBars: (s) => s.lookback,
  compute: (input: IndicatorInput, s) => {
    const n = input.c.length;
    const rs = new Float64Array(n);
    const signal = new Float64Array(n); // 0/1 (IndicatorSeries has no bool array)
    const bench = input.benchmarkClose;
    if (!bench) {
      rs.fill(NaN);
      return { series: { rs, signal } };
    }
    // rs_line = stock_close / benchmark_close, rebased to 100 at the first
    // aligned bar (standard "price-relative" RS convention). The benchmark may
    // be on a vastly larger scale than the stock (e.g. a broad index in the
    // tens of thousands vs a sub-₹100 stock), making the raw ratio ~1e-3..1e-1
    // — which the 2dp rounding below would flatten into a constant/staircase.
    // Rebasing by a constant positive factor lands the line in a well-resolved
    // O(100) range for any benchmark/stock scale and leaves the new-high signal
    // logic unchanged (a constant scale preserves rolling-high bar positions).
    // The 2dp rounding keeps the `rs[i] === rsHigh[i]` test an exact compare of
    // identically-rounded quantities (computeRollingHigh also rounds to 2dp).
    const raw = new Float64Array(n);
    let refRatio = NaN;
    for (let i = 0; i < n; i++) {
      const b = bench[i];
      const r = Number.isNaN(b) || b === 0 ? NaN : input.c[i] / b;
      raw[i] = r;
      if (Number.isNaN(refRatio) && !Number.isNaN(r)) refRatio = r;
    }
    const scale = Number.isNaN(refRatio) || refRatio === 0 ? NaN : 100 / refRatio;
    for (let i = 0; i < n; i++) {
      rs[i] = Number.isNaN(raw[i]) ? NaN : round2(raw[i] * scale);
    }
    const rsHigh = computeRollingHigh(rs, s.lookback);
    const priceHigh = computeRollingHigh(input.h, s.lookback);
    for (let i = 0; i < n; i++) {
      const atRsHigh = !Number.isNaN(rs[i]) && rs[i] === rsHigh[i];
      const belowPriceHigh =
        !Number.isNaN(input.h[i]) &&
        !Number.isNaN(priceHigh[i]) &&
        input.h[i] < priceHigh[i];
      signal[i] = atRsHigh && belowPriceHigh ? 1 : 0;
    }
    return { series: { rs, signal } };
  },
  draw: (ctx, series, scale, s, resolveColor) => {
    const rs = series.rs;
    const signal = series.signal;
    if (!rs) return;
    drawPolyline(
      ctx,
      scale,
      rs,
      { color: resolveColor(s.lineColor), width: 1.3 },
      (g) => !Number.isNaN(rs[g]),
    );
    if (signal)
      drawDots(
        ctx,
        scale,
        rs,
        { color: resolveColor(s.signalColor), width: 1.3 },
        (g) => signal[g] === 1 && !Number.isNaN(rs[g]),
      );
  },
  // The 0/1 `signal` series is a marker — excluded from autofit so it never
  // pulls the RS domain down to 0.
  autofitKeys: () => ['rs'],
  legend: (series, idx, s) => [
    { color: s.lineColor, label: 'RS', value: cellAt(series.rs, idx, fmt2) },
  ],
};
