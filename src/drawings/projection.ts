import type * as d3 from 'd3';

import type { Candle } from '../types';
import {
  barIndexForDate,
  extraBarsForFutureDate,
  futureDateForExtraBars,
} from '../utils/dateBarIndex';
import type { DrawingAnchor } from './types';

// PURE anchor <-> pixel math. All x values are in the PANNED inner-group's local
// space (what `xScale` outputs, i.e. before the `baseTranslateX` pan translate);
// callers detranslate viewport coords (`mx - baseTranslateX`) before passing x in.
// All y values are in chart-inner space (y never pans).
export type ProjScale = {
  xScale: d3.ScaleBand<number>;
  yPrice: d3.ScaleLogarithmic<number, number>;
  step: number;
  bandwidth: number;
  dataLength: number;
  width: number;
  priceHeight: number;
  data: Candle[];
};

// Center x of the bar a date anchors to. In range: `xScale(idx) + bandwidth/2`.
// Before the first bar it CLAMPS to bar 0. Past the last bar a `{date, price}`
// anchor CAN live in the empty future space: we project it `extraBars * step`
// to the right of the last bar's center (the same step spacing candles use), so
// a trendline endpoint dropped to the right of the last candle stays put.
export function xForDate(date: string, s: ProjScale): number {
  if (s.dataLength === 0) return 0;
  const idx = barIndexForDate(s.data, date);
  if (idx != null) return (s.xScale(idx) ?? 0) + s.bandwidth / 2;
  if (date < s.data[0].date) return (s.xScale(0) ?? 0) + s.bandwidth / 2;
  // Beyond the last bar: project into the empty future space.
  const lastX = (s.xScale(s.dataLength - 1) ?? 0) + s.bandwidth / 2;
  return lastX + extraBarsForFutureDate(s.data, date) * s.step;
}

export function yForPrice(price: number, s: ProjScale): number {
  const y = s.yPrice(price);
  return Number.isFinite(y) ? y : s.priceHeight;
}

// Inverse of `xForDate`: snap a local x to a bar date. The bar center for index
// j is `base + j*step + bandwidth/2` (paddingOuter is 0, so `base = xScale(0)`).
// Left of bar 0 clamps to bar 0. Right of the last bar returns a SYNTHESIZED
// future date `extraBars` median-steps past the last candle, capped to the
// empty region panning can expose (~one screen of bars), so drawings can be
// placed/dragged into future space but not off to infinity.
export function dateForX(x: number, s: ProjScale): string {
  if (s.dataLength === 0) return '';
  const base = s.xScale(0) ?? 0;
  let j = Math.round((x - base - s.bandwidth / 2) / s.step);
  if (j < 0) j = 0;
  if (j <= s.dataLength - 1) return s.data[j].date;
  const maxFutureBars = Math.max(0, Math.ceil(s.width / s.step));
  const extraBars = Math.min(j - (s.dataLength - 1), maxFutureBars);
  return futureDateForExtraBars(s.data, extraBars);
}

export function priceForY(y: number, s: ProjScale): number {
  return s.yPrice.invert(y);
}

export function projectAnchor(
  a: DrawingAnchor,
  s: ProjScale,
): { x: number; y: number } {
  return { x: xForDate(a.date, s), y: yForPrice(a.price, s) };
}

// Extend the ray from p0 THROUGH p1 and beyond, clipping at the price-pane box
// `[0,width] x [0,priceHeight]`. Returns the forward exit point (never retracts
// before p1). Handles future empty space to the right of the last bar — the ray
// projects past it even though a new anchor cannot be placed there.
export function extendRay(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  width: number,
  priceHeight: number,
): { x2: number; y2: number } {
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  if (dx === 0 && dy === 0) return { x2: p1.x, y2: p1.y };
  let tMax = Infinity;
  if (dx > 0) tMax = Math.min(tMax, (width - p0.x) / dx);
  else if (dx < 0) tMax = Math.min(tMax, (0 - p0.x) / dx);
  if (dy > 0) tMax = Math.min(tMax, (priceHeight - p0.y) / dy);
  else if (dy < 0) tMax = Math.min(tMax, (0 - p0.y) / dy);
  if (!Number.isFinite(tMax)) tMax = 1;
  // Always reach at least p1 even if it sits outside the box.
  tMax = Math.max(tMax, 1);
  return { x2: p0.x + dx * tMax, y2: p0.y + dy * tMax };
}
