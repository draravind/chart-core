import type { Candle } from '../../types';
import type { IndicatorDef, IndicatorSeries } from '../types';
import { drawPolyline, cellAt } from '../draw';

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

type HighsSettings = {
  color1y: string;
  color2y: string;
  color3y: string;
  colorAll: string;
};

const TIERS: { key: HighKey; field: keyof HighsSettings; label: string; dash: number[] | null }[] = [
  { key: 'high1y', field: 'color1y', label: '1Y', dash: [4, 3] },
  { key: 'high2y', field: 'color2y', label: '2Y', dash: [4, 3] },
  { key: 'high3y', field: 'color3y', label: '3Y', dash: [4, 3] },
  { key: 'highAll', field: 'colorAll', label: 'ATH', dash: null },
];

/**
 * Data-backed rolling-highs indicator. A rolling max needs full price history
 * to be correct, so this reads the precomputed `high1y…highAll` columns off
 * each bar rather than computing in-browser (no warm-up). One toggle → four
 * lines (1Y / 2Y / 3Y / ATH).
 */
export const highsDef: IndicatorDef<HighsSettings> = {
  key: 'highs',
  label: 'Highs',
  longLabel: 'Rolling Highs',
  pane: 'price',
  settingsSchema: [
    { key: 'color1y', label: '1Y', kind: 'color', default: 'var(--high-1y)' },
    { key: 'color2y', label: '2Y', kind: 'color', default: 'var(--high-2y)' },
    { key: 'color3y', label: '3Y', kind: 'color', default: 'var(--high-3y)' },
    { key: 'colorAll', label: 'ATH', kind: 'color', default: 'var(--high-all)' },
  ],
  warmupBars: () => 0,
  compute: (input) => ({
    series: {
      high1y: colToArray(input.bars, 'high1y'),
      high2y: colToArray(input.bars, 'high2y'),
      high3y: colToArray(input.bars, 'high3y'),
      highAll: colToArray(input.bars, 'highAll'),
    },
  }),
  draw: (ctx, series, scale, s, resolveColor) => {
    for (const tier of TIERS) {
      const values = series[tier.key];
      if (!values) continue;
      const st = {
        color: resolveColor(s[tier.field]),
        width: 1.1,
        opacity: 0.5,
        dash: tier.dash,
      };
      drawPolyline(ctx, scale, values, st, (g) =>
        highVisibleAt(tier.key, g, series, scale.data),
      );
    }
  },
  autofitKeys: () => ['high1y', 'high2y', 'high3y', 'highAll'],
  legend: (series, idx, s, ctx) =>
    TIERS.map((tier) => ({
      color: s[tier.field],
      label: tier.label,
      value: cellAt(series[tier.key], idx, ctx.priceFmt),
    })),
};
