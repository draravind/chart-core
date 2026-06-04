import type { Candle } from '../types';

// EOD data is sorted ascending by date. Returns the bar index for an exact
// date match; if the date is between two loaded bars, returns the nearest
// preceding bar. Returns null when the date is older than the leftmost bar
// or newer than the rightmost — callers treat null as "render no overlay
// this frame" so a stale anchor never silently snaps to bar 0.
export function barIndexForDate(
  data: Candle[],
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
