import type * as d3 from 'd3';

import type { Candle } from '../types';
import { barIndexForDate } from '../utils/dateBarIndex';
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
// Out of range (`barIndexForDate` returns null both before the first and after
// the last bar) it CLAMPS to the nearest end bar's center — never NaN. A
// `{date, price}` anchor cannot represent future empty space, so the right clamp
// is the last bar; ray *extension* into future space is handled by `extendRay`.
export function xForDate(date: string, s: ProjScale): number {
  if (s.dataLength === 0) return 0;
  const idx = barIndexForDate(s.data, date);
  if (idx != null) return (s.xScale(idx) ?? 0) + s.bandwidth / 2;
  // Out of range: clamp to nearest end bar.
  if (date < s.data[0].date) return (s.xScale(0) ?? 0) + s.bandwidth / 2;
  return (s.xScale(s.dataLength - 1) ?? 0) + s.bandwidth / 2;
}

export function yForPrice(price: number, s: ProjScale): number {
  const y = s.yPrice(price);
  return Number.isFinite(y) ? y : s.priceHeight;
}

// Inverse of `xForDate`: snap a local x to the nearest real bar's date. Cannot
// return a future date (v1 restricts placement to the in-data range). The bar
// center for index j is `base + j*step + bandwidth/2` (paddingOuter is 0, so
// `base = xScale(0)`); invert and clamp into `[0, dataLength-1]`.
export function dateForX(x: number, s: ProjScale): string {
  if (s.dataLength === 0) return '';
  const base = s.xScale(0) ?? 0;
  let j = Math.round((x - base - s.bandwidth / 2) / s.step);
  j = Math.max(0, Math.min(s.dataLength - 1, j));
  return s.data[j].date;
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
