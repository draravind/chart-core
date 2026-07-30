import { RANGES } from '../types';

export type RangeKey = '3M' | '6M' | '1Y' | '2Y' | '3Y' | '5Y' | '10Y' | '20Y';

/**
 * @deprecated Bar counts per named range assuming DAILY bars (252/yr) — the
 * assumption is baked into the name. Use `rangeMarks`, which measures the
 * series' own cadence, so the same ladder works on any bar interval. Kept
 * exported (public API) for consumers not yet migrated.
 */
export const RANGE_DAYS: Record<'3M' | '6M' | '1Y' | '2Y' | '3Y' | '5Y', number> =
  {
    '3M': 66,
    '6M': 132,
    '1Y': 252,
    '2Y': 504,
    '3Y': 756,
    '5Y': 1260,
  };

/** Named range → calendar years. Interval-agnostic: bars/year is measured. */
export const RANGE_YEARS: Record<RangeKey, number> = {
  '3M': 0.25,
  '6M': 0.5,
  '1Y': 1,
  '2Y': 2,
  '3Y': 3,
  '5Y': 5,
  '10Y': 10,
  '20Y': 20,
};

/** Usability floor for a derived mark — 3 bars is not a view worth a label. */
export const MIN_MARK_BARS = 30;

export type RangeMark = { key: RangeKey; bars: number };

/** The legacy daily ladder as marks — default for `marks`-less consumers. */
export const DEFAULT_RANGE_MARKS: RangeMark[] = (
  ['3M', '6M', '1Y', '2Y', '3Y', '5Y'] as const
).map((key) => ({ key, bars: RANGE_DAYS[key] }));

export const MIN_BAR_STEP_PX = 2; // min px per bar slot to stay readable (D2)
export const MIN_VISIBLE_BARS = 10; // zoom-in floor (cap owner is consistent both ends)
// Non-plot horizontal chrome; equals MARGIN.right(60) + RIGHT_BUFFER(18) in Chart.tsx.
// Kept here (documented) so the cap math stays unit-testable; keep in sync with Chart.tsx.
const CHART_CHROME_PX = 78;

// Raw pixel cap: how many bar slots fit while each stays >= MIN_BAR_STEP_PX wide.
export function rawMaxVisibleBars(containerWidth: number): number {
  return Math.floor((containerWidth - CHART_CHROME_PX) / MIN_BAR_STEP_PX);
}

const MS_PER_CALENDAR_DAY = 24 * 60 * 60 * 1000;
const DAYS_PER_YEAR = 365.25;
/** Fallback when the cadence can't be measured (unparseable or 1-bar series). */
export const DEFAULT_BARS_PER_YEAR = 252;

/**
 * Implied bars per year, measured from the mean calendar span per bar. MEAN, not
 * median: most daily gaps are exactly one day, so a median gap reports 365/yr for
 * a daily series. Measured against the real EOD parquet this yields daily 246–257
 * and weekly ~52.2, stable down to a ~20-bar window.
 */
export function barsPerYear(data: readonly { date: string }[]): number {
  const n = data.length;
  if (n < 2) return DEFAULT_BARS_PER_YEAR;
  const first = Date.parse(data[0].date);
  const last = Date.parse(data[n - 1].date);
  if (!Number.isFinite(first) || !Number.isFinite(last) || last <= first) {
    return DEFAULT_BARS_PER_YEAR;
  }
  const meanGapDays = (last - first) / MS_PER_CALENDAR_DAY / (n - 1);
  return DAYS_PER_YEAR / meanGapDays;
}

/**
 * The named-range ladder in bar counts for THIS series: years × measured
 * bars/year. Drops marks too tight to be a view (< MIN_MARK_BARS) and marks the
 * history can't fill (> dataLength).
 */
export function rangeMarks(
  data: readonly { date: string }[],
  dataLength: number,
): RangeMark[] {
  const bpy = barsPerYear(data);
  return RANGES.map((key) => ({
    key,
    bars: Math.round(RANGE_YEARS[key] * bpy),
  })).filter((m) => m.bars >= MIN_MARK_BARS && m.bars <= dataLength);
}

/**
 * The zoom-out cap (D1/D5): purely the READABILITY limit in pixels — the most bar
 * slots that each stay >= MIN_BAR_STEP_PX wide.
 *
 * Deliberately NOT snapped to a named range. The mark ladder is geometric, so its
 * rungs land at different bar counts per interval (weekly jumps 5Y=522 straight to
 * 10Y=1044). A snapped cap therefore stops each interval at a different bar WIDTH:
 * on a ~1700px pane daily reached ~2.2px per bar (OHLC ticks suppressed, bars
 * degraded to lines) while weekly stopped at ~3.1px with ticks still drawn — and
 * which interval was the restrictive one flipped with the pane width. Measuring
 * pixels makes the visual floor identical by construction, for every interval and
 * every width. The slider's top end is no longer a named mark; the marks
 * themselves still render (ZoomSlider filters them against this cap).
 */
export function maxVisibleBarsForWidth(containerWidth: number): number {
  return Math.max(MIN_VISIBLE_BARS, rawMaxVisibleBars(containerWidth));
}

export const formatPrice = (value: number | null | undefined): string => {
  if (value == null) return '';
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const formatVolume = (value: number | null | undefined): string => {
  if (value == null) return '';
  if (value >= 1e9) return (value / 1e9).toFixed(2) + 'B';
  if (value >= 1e6) return (value / 1e6).toFixed(2) + 'M';
  if (value >= 1e3) return (value / 1e3).toFixed(0) + 'K';
  return value.toString();
};

export const formatVolumeTick = (value: number | null | undefined): string => {
  if (value == null) return '';
  if (value >= 1e9) return Math.round(value / 1e9) + 'B';
  if (value >= 1e6) return Math.round(value / 1e6) + 'M';
  if (value >= 1e3) return Math.round(value / 1e3) + 'K';
  return value.toString();
};

export type VolumeLabel = { index: number; text: 'HVE' | 'HVY' };

export type VolumeStats = {
  /** Per-index trailing 30-bar SMA of volume; undefined for the first 29 bars. */
  sma: (number | undefined)[];
  /** At most two markers: HVE always (if data has volume), HVY unless it ties HVE's bar. */
  labels: VolumeLabel[];
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function computeVolumeStats(
  data: { date: string; volume: number }[],
  smaWindow = 30,
  yearDays = 365,
): VolumeStats {
  const n = data.length;
  const sma: (number | undefined)[] = new Array(n).fill(undefined);

  // Trailing SMA via running-sum sliding window.
  let runningSum = 0;
  for (let i = 0; i < n; i++) {
    runningSum += data[i].volume;
    if (i >= smaWindow) runningSum -= data[i - smaWindow].volume;
    if (i >= smaWindow - 1) sma[i] = runningSum / smaWindow;
  }

  const labels: VolumeLabel[] = [];
  if (n === 0) return { sma, labels };

  // HVE — index of the all-time max volume; latest index wins ties.
  let hve = -1;
  let hveVol = 0;
  for (let i = 0; i < n; i++) {
    if (data[i].volume > 0 && data[i].volume >= hveVol) {
      hve = i;
      hveVol = data[i].volume;
    }
  }
  if (hve === -1) return { sma, labels }; // all volumes 0 / empty

  // HVY — max volume within the trailing `yearDays` window before the last bar.
  const cutoff = new Date(data[n - 1].date).getTime() - yearDays * MS_PER_DAY;
  let hvy = -1;
  let hvyVol = 0;
  for (let i = 0; i < n; i++) {
    if (new Date(data[i].date).getTime() < cutoff) continue;
    if (data[i].volume > 0 && data[i].volume >= hvyVol) {
      hvy = i;
      hvyVol = data[i].volume;
    }
  }

  labels.push({ index: hve, text: 'HVE' });
  if (hvy !== -1 && hvy !== hve) labels.push({ index: hvy, text: 'HVY' });

  return { sma, labels };
}
