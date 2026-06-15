import type { Candle } from '../types';
import { barIndexForDate } from '../utils/dateBarIndex';
import type { DrawingAnchor } from './types';

// PURE ruler measurement between two anchors. `bars` counts trading-bar span
// (order-independent); `priceDelta`/`pricePct` are signed from `a` to `b`.
export type RulerStats = {
  bars: number;
  priceDelta: number;
  pricePct: number;
  startDate: string;
  endDate: string;
  direction: 'up' | 'down' | 'flat';
};

export function computeRulerStats(
  a: DrawingAnchor,
  b: DrawingAnchor,
  data: readonly Candle[],
): RulerStats {
  const ia = barIndexForDate(data, a.date);
  const ib = barIndexForDate(data, b.date);
  const bars = ia != null && ib != null ? Math.abs(ib - ia) : 0;
  const priceDelta = b.price - a.price;
  const pricePct = a.price !== 0 ? (priceDelta / a.price) * 100 : 0;
  const direction = priceDelta > 0 ? 'up' : priceDelta < 0 ? 'down' : 'flat';
  const startDate = a.date <= b.date ? a.date : b.date;
  const endDate = a.date <= b.date ? b.date : a.date;
  return { bars, priceDelta, pricePct, startDate, endDate, direction };
}
