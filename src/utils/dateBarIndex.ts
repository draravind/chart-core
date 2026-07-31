import type { Candle } from '../types';

// EOD data is sorted ascending by date. Returns the bar index for an exact
// date match; if the date is between two loaded bars, returns the nearest
// preceding bar. Returns null when the date is older than the leftmost bar
// or newer than the rightmost — callers treat null as "render no overlay
// this frame" so a stale anchor never silently snaps to bar 0.
export function barIndexForDate(
  data: readonly Candle[],
  isoDate: string,
): number | null {
  if (data.length === 0) return null;
  if (isoDate < data[0].date) return null;
  if (isoDate > data[data.length - 1].date) return null;
  let lo = 0;
  let hi = data.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    const d = data[mid].date;
    if (d === isoDate) return mid;
    if (d < isoDate) lo = mid + 1;
    else hi = mid - 1;
  }
  // No exact match — `lo` points to the first bar after the target. The
  // nearest preceding bar is `lo - 1`. Both ends were ruled out above, so
  // this is always in [0, data.length - 1].
  return lo - 1;
}

export function dateForBarIndex(data: Candle[], idx: number): string {
  if (data.length === 0) return '';
  const clamped = Math.max(0, Math.min(data.length - 1, idx));
  return data[clamped].date;
}

const ONE_DAY_MS = 86_400_000;

// Median calendar-day gap (ms) between consecutive recent bars. Robust to
// weekends/holidays; used to synthesize/read ISO dates for drawing anchors that
// sit in the empty space to the right of the last candle. Falls back to one day
// when there aren't two bars to measure.
export function medianStepMs(
  data: readonly Candle[],
  lookback = 20,
): number {
  const n = data.length;
  if (n < 2) return ONE_DAY_MS;
  const diffs: number[] = [];
  for (let i = Math.max(1, n - lookback); i < n; i++) {
    diffs.push(Date.parse(data[i].date) - Date.parse(data[i - 1].date));
  }
  diffs.sort((a, b) => a - b);
  const m = diffs[diffs.length >> 1];
  return m > 0 ? m : ONE_DAY_MS;
}

// ISO (YYYY-MM-DD) date `extraBars` median-steps past the last bar. Zero-padded
// (via toISOString) so string `<`/`>` ordering — used everywhere anchors are
// compared — stays valid.
export function futureDateForExtraBars(
  data: readonly Candle[],
  extraBars: number,
): string {
  if (data.length === 0) return '';
  const lastMs = Date.parse(data[data.length - 1].date);
  return new Date(lastMs + extraBars * medianStepMs(data))
    .toISOString()
    .slice(0, 10);
}

// Rounded number of median-steps a future ISO date sits past the last bar
// (clamped at 0 — never negative). Inverse of `futureDateForExtraBars`.
export function extraBarsForFutureDate(
  data: readonly Candle[],
  isoDate: string,
): number {
  if (data.length === 0) return 0;
  const lastMs = Date.parse(data[data.length - 1].date);
  const steps = (Date.parse(isoDate) - lastMs) / medianStepMs(data);
  return Math.max(0, Math.round(steps));
}

// Bar index for any ISO date. In range → the exact/nearest-preceding bar. Past
// the last bar or before the first, extrapolates with the median bar step, so
// the returned index may be >= data.length or negative. Never null — used by
// overlay anchors, which must stay placeable anywhere on the time axis.
//
// `Math.floor` (not round) on the step difference, because a bar IS a period:
// any date falling inside it belongs to it. A weekly bar is labelled with the
// week's first trading day, so a date 4 days past that label is still that bar
// (floor(4/7) = 0); rounding would push it a bar into the future.
export function barIndexForDateProjected(
  data: readonly Candle[],
  isoDate: string,
): number {
  if (data.length === 0) return 0;
  const inRange = barIndexForDate(data, isoDate);
  if (inRange != null) return inRange;
  const step = medianStepMs(data);
  const t = Date.parse(isoDate);
  if (isoDate < data[0].date) {
    return Math.floor((t - Date.parse(data[0].date)) / step);
  }
  const lastIdx = data.length - 1;
  return lastIdx + Math.floor((t - Date.parse(data[lastIdx].date)) / step);
}

// Inverse of `barIndexForDateProjected`. An index inside [0, len-1] returns that
// bar's real date; outside, a synthesized ISO date `idx` median-steps beyond the
// corresponding end. Zero-padded (via toISOString) so string `<`/`>` ordering,
// which anchors are compared with, stays valid.
export function dateForBarIndexProjected(
  data: readonly Candle[],
  idx: number,
): string {
  if (data.length === 0) return '';
  const lastIdx = data.length - 1;
  if (idx >= 0 && idx <= lastIdx) return data[Math.round(idx)].date;
  const step = medianStepMs(data);
  const anchorIdx = idx < 0 ? 0 : lastIdx;
  const ms = Date.parse(data[anchorIdx].date) + (idx - anchorIdx) * step;
  return new Date(ms).toISOString().slice(0, 10);
}
