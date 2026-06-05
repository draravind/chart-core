import type { Candle } from '../../types';
import type { IndicatorDef, IndicatorSeries } from '../types';
import { drawPolyline } from '../draw';

type HighKey = 'high1y' | 'high2y' | 'high3y' | 'highAll';

function colToArray(bars: readonly Candle[], key: HighKey): Float64Array {
  const out = new Float64Array(bars.length);
  for (let i = 0; i < bars.length; i++) {
    const v = bars[i][key];
    out[i] = v == null ? NaN : v;
  }
  return out;
}

/**
 * Replicates the engine's old `isHighVisible` gate (Chart.tsx) on the resolved
 * series: hide a tier when it equals the bar's own high, or when it sits within
 * 1% of the next-wider tier (so coincident rolling maxima don't double-draw).
 * ATH always shows when present.
 */
function highVisibleAt(
  seriesKey: HighKey,
  g: number,
  series: IndicatorSeries,
  data: readonly Candle[],
): boolean {
  const v = series[seriesKey][g];
  if (Number.isNaN(v)) return false;
  const bar = data[g];
  if (bar && v === bar.high) return false;
  if (seriesKey === 'highAll') return true;
  const nextKey: HighKey =
    seriesKey === 'high1y'
      ? 'high2y'
      : seriesKey === 'high2y'
        ? 'high3y'
        : 'highAll';
  const next = series[nextKey][g];
  if (Number.isNaN(next)) return false;
  return Math.abs(v - next) / next > 0.01;
}

/**
 * Data-backed rolling-highs indicator. A rolling max needs full price history
 * to be correct, so this reads the precomputed `high1y…highAll` columns off
 * each bar rather than computing in-browser (no warm-up). One toggle → four
 * lines (1Y / 2Y / 3Y / ATH).
 */
export const highsDef: IndicatorDef = {
  key: 'highs',
  label: 'Highs',
  pane: 'price',
  defaultParams: {},
  warmupBars: () => 0,
  compute: (input) => ({
    high1y: colToArray(input.bars, 'high1y'),
    high2y: colToArray(input.bars, 'high2y'),
    high3y: colToArray(input.bars, 'high3y'),
    highAll: colToArray(input.bars, 'highAll'),
  }),
  draw: (ctx, series, scale, style) => {
    for (const line of style) {
      const values = series[line.seriesKey];
      if (!values) continue;
      drawPolyline(ctx, scale, values, line, (g) =>
        highVisibleAt(line.seriesKey as HighKey, g, series, scale.data),
      );
    }
  },
  defaultStyle: {
    lines: [
      {
        seriesKey: 'high1y',
        colorVar: 'var(--high-1y)',
        labelColorVar: 'var(--chart-high-1y-label)',
        label: '1Y',
        width: 1.1,
        opacity: 0.5,
        dash: [4, 3],
      },
      {
        seriesKey: 'high2y',
        colorVar: 'var(--high-2y)',
        labelColorVar: 'var(--chart-high-2y-label)',
        label: '2Y',
        width: 1.1,
        opacity: 0.5,
        dash: [4, 3],
      },
      {
        seriesKey: 'high3y',
        colorVar: 'var(--high-3y)',
        labelColorVar: 'var(--chart-high-3y-label)',
        label: '3Y',
        width: 1.1,
        opacity: 0.5,
        dash: [4, 3],
      },
      {
        seriesKey: 'highAll',
        colorVar: 'var(--high-all)',
        labelColorVar: 'var(--chart-high-all-label)',
        label: 'ATH',
        width: 1.1,
        opacity: 0.5,
        dash: null,
      },
    ],
    tooltipGroup: 'highs',
    tooltipTitle: 'Highs',
  },
};
