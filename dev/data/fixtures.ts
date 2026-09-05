import type {
  PatternMarker,
  QuarterlyResult,
  StatsTableData,
} from '../../src/index';

// Hand-authored sample data so the Patterns / Earnings / Stats toggles render
// something for the default symbol (the parquet carries no markers or
// fundamentals). Every date below is an EXACT bar date taken from
// dev/public/eod/RELIANCE.json: barIndexForDate returns null outside the loaded
// range and the overlay then paints nothing, silently
// (src/utils/dateBarIndex.ts). tests/devFixtures.test.ts guards that.
//
// Only the 9 patterns whose marker shapes are pinned in
// tests/patternRenderers.test.ts are used (the other 3 registered renderers —
// high_tight_flag / base_breakout / consolidation — are renderable but their
// marker shapes aren't fixed in that test, so they're left out).
export const SAMPLE_PATTERNS: PatternMarker[] = [
  {
    pattern_name: 'gap_up',
    detected_on: '2025-01-24',
    markers: { gap_date: '2025-01-24', prev_high: 1273, gap_low: 1243.5, gap_pct: 2.5 },
  },
  {
    pattern_name: 'volume_breakout',
    detected_on: '2025-09-03',
    markers: { event_date: '2025-09-03', anchor_low: 1360.5, volume_ratio: 3.4 },
  },
  {
    pattern_name: 'golden_cross',
    detected_on: '2025-12-15',
    markers: { cross_date: '2025-12-15', cross_price: 1556.2 },
  },
  {
    pattern_name: 'nr7',
    detected_on: '2026-03-12',
    markers: { event_date: '2026-03-12', bar_high: 1410.9, bar_low: 1381.1 },
  },
  {
    pattern_name: 'unusual_volume',
    detected_on: '2026-04-29',
    markers: { event_date: '2026-04-29', anchor_low: 1391.3, volume_ratio: 2.6 },
  },
  {
    pattern_name: 'volume_dryup',
    detected_on: '2026-06-12',
    markers: { event_date: '2026-06-12', anchor_low: 1262.5, volume_ratio: 0.4 },
  },
  {
    pattern_name: 'pocket_pivot',
    detected_on: '2026-07-13',
    markers: { event_date: '2026-07-13', anchor_low: 1295 },
  },
  {
    pattern_name: 'inside_day',
    detected_on: '2026-08-24',
    markers: {
      inside_date: '2026-08-24',
      inside_high: 1329,
      inside_low: 1324,
      mother_date: '2026-08-10',
      mother_high: 1332.9,
      mother_low: 1321.3,
    },
  },
  {
    pattern_name: 'pullback_to_ema',
    detected_on: '2026-08-31',
    markers: { event_date: '2026-08-31', ema_value: 1290, ema_level: 'EMA 50' },
  },
];

// Eight reported quarters on real bar dates (quarter-ends snapped to the nearest
// trading day). Feeds BOTH earnings surfaces — the subpane (`quarterlyResults`)
// and the floating box (`earningsResults`). Values rise so YoY resolves once
// four quarters accumulate.
export const SAMPLE_QUARTERS: QuarterlyResult[] = [
  { label: 'Q1 FY25', date: '2024-06-28', eps: 22.4, rps: 168, npm: 8.1 },
  { label: 'Q2 FY25', date: '2024-09-30', eps: 24.1, rps: 172, npm: 8.4 },
  { label: 'Q3 FY25', date: '2024-12-31', eps: 25.6, rps: 179, npm: 8.6 },
  { label: 'Q4 FY25', date: '2025-03-28', eps: 27.0, rps: 185, npm: 8.9 },
  { label: 'Q1 FY26', date: '2025-06-30', eps: 26.2, rps: 181, npm: 8.5 },
  { label: 'Q2 FY26', date: '2025-09-30', eps: 28.9, rps: 190, npm: 9.1 },
  { label: 'Q3 FY26', date: '2025-12-31', eps: 30.4, rps: 197, npm: 9.3 },
  { label: 'Q4 FY26', date: '2026-03-30', eps: 31.8, rps: 204, npm: 9.5 },
];

// Latest-bar fundamentals for the floating Price-Stats box (the library derives
// the ATR rows from the bars itself).
export const SAMPLE_STATS: StatsTableData = {
  sector: 'Energy',
  industry: 'Refineries & Marketing',
  sharesOutstanding: 13_532_000_000,
  freeFloatPercent: 49.2,
  eps: 31.8,
};

// Published free-float % for the earnings box (a sibling of SAMPLE_STATS's).
export const SAMPLE_FREE_FLOAT_PERCENT = 49.2;
