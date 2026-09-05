import type { Candle } from '../types';
import { barIndexForDate, extraBarsForFutureDate } from '../utils/dateBarIndex';
import { DRAWING_DEFAULTS } from './defaults';
import type { DrawingAnchor, DrawingStyle } from './types';

// Bar index of an anchor, extended past the last candle so a ruler dragged into
// future space still measures a meaningful span. Null only when the anchor sits
// before the first bar (left-clamp region), matching the pre-future behavior.
function effectiveBarIndex(
  data: readonly Candle[],
  date: string,
): number | null {
  const idx = barIndexForDate(data, date);
  if (idx != null) return idx;
  if (data.length > 0 && date > data[data.length - 1].date) {
    return data.length - 1 + extraBarsForFutureDate(data, date);
  }
  return null;
}

// PURE ruler measurement between two anchors. `bars` counts trading-bar span
// (order-independent); `priceDelta`/`pricePct` are signed from `a` to `b`;
// `calendarDays` is the wall-clock span and `volume` sums the bars touched.
export type RulerStats = {
  bars: number;
  priceDelta: number;
  pricePct: number;
  startDate: string;
  endDate: string;
  direction: 'up' | 'down' | 'flat';
  calendarDays: number;
  volume: number;
};

const ONE_DAY_MS = 86_400_000;

export function computeRulerStats(
  a: DrawingAnchor,
  b: DrawingAnchor,
  data: readonly Candle[],
): RulerStats {
  const ia = effectiveBarIndex(data, a.date);
  const ib = effectiveBarIndex(data, b.date);
  const bars = ia != null && ib != null ? Math.abs(ib - ia) : 0;
  const priceDelta = b.price - a.price;
  const pricePct = a.price !== 0 ? (priceDelta / a.price) * 100 : 0;
  const direction = priceDelta > 0 ? 'up' : priceDelta < 0 ? 'down' : 'flat';
  const startDate = a.date <= b.date ? a.date : b.date;
  const endDate = a.date <= b.date ? b.date : a.date;

  // Both anchors are 'YYYY-MM-DD' (a future end is synthesized in the same
  // format), which `Date.parse` reads as UTC midnight — an exact whole-day gap
  // with no timezone drift.
  const calendarDays = Math.round(
    (Date.parse(endDate) - Date.parse(startDate)) / ONE_DAY_MS,
  );

  // Sum the real bars the span touches. `effectiveBarIndex` runs past the last
  // bar in future space and is null before bar 0, so clamp to the real range
  // (both endpoints inclusive) rather than reading `undefined` off the ends. A
  // null endpoint (before bar 0) contributes nothing.
  let volume = 0;
  if (ia != null && ib != null && data.length > 0) {
    const lo = Math.max(0, Math.min(ia, ib));
    const hi = Math.min(data.length - 1, Math.max(ia, ib));
    for (let i = lo; i <= hi; i++) volume += data[i].volume;
  }

  return { bars, priceDelta, pricePct, startDate, endDate, direction, calendarDays, volume };
}

// Direction colour, but never overriding an explicit pick: an explicit
// `style.color` always wins (keeping the popup's Color field live); otherwise
// green for an up-move, red for a down-move, the drawing default when flat.
// Returns a RESOLVED colour (calls `resolveColor` on the chosen expression).
export function directionFill(
  stats: Pick<RulerStats, 'direction'>,
  style: DrawingStyle | undefined,
  resolveColor: (expr: string) => string,
): string {
  if (style?.color !== undefined) return resolveColor(style.color);
  const expr =
    stats.direction === 'up'
      ? 'var(--chart-positive)'
      : stats.direction === 'down'
        ? 'var(--chart-negative)'
        : DRAWING_DEFAULTS.color;
  return resolveColor(expr);
}
