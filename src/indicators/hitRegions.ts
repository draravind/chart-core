import { distToSegment } from '../drawings/hitTest';

// ---------------------------------------------------------------------------
// Paint-time hit regions — the same "whatever draws a mark declares what it
// covered" contract the drawing renderers already use, extended to indicators
// and to the candles themselves.
//
// A region is a CLOSURE over the arrays + scale the painter already had, so
// recording costs one small object per painted element per frame (not a
// rasterised pick map), and it can never go stale: the chart rebuilds every
// region on every repaint from the values and projection it actually used.
//
// Coordinate space is panned-local CSS px throughout — the space
// `xScale(g) + bandwidth/2` and `scale.y(v)` naturally produce. Callers
// detranslate the pointer by `baseTranslateX` before testing (exactly what the
// drawing hit test does with its `tx` argument).
// ---------------------------------------------------------------------------

/** `sourceId` of the price series' own region (candles / OHLC bars). */
export const CANDLE_SOURCE = '__candles__';

// Named distinctly from `drawings/hitTest`'s `HIT_TOLERANCE` (which this module
// imports alongside `distToSegment`): a bare `HIT_TOLERANCE` here is not a
// collision today, but it shadows in the reader's head and a future `export *`
// would break.
/** Pointer→line proximity, CSS px. Line-like regions only. */
export const REGION_HIT_TOLERANCE = 6;
/** Forgiveness around a FILLED mark (columns, candles), CSS px. */
export const FILLED_HIT_PAD = 2;

export type HitRegion = {
  /** Indicator config id, or `CANDLE_SOURCE`. */
  sourceId: string;
  /** Vertical extent painted at bar `g`, panned-local CSS px; null = nothing
   *  was painted there (a NaN gap, a skipped column, an unflagged bar). */
  spanAt: (g: number) => readonly [number, number] | null;
  /** Half-width of the mark at a bar, CSS px. 0 for lines (the tolerance
   *  covers them). */
  halfWidth: number;
  /** Line-like: also test the interpolated segments to the adjacent bars. */
  interpolate: boolean;
};

/** What a painter hands the sink — the framework stamps `sourceId`. */
export type HitRegionSpec = Omit<HitRegion, 'sourceId'>;

/** Per-indicator sink handed to `IndicatorDef.draw` via the draw scale. */
export type HitRegionSink = { add(region: HitRegionSpec): void };

// A filled mark is tested by CONTAINMENT, a line by PROXIMITY — conflating them
// is a bug: the line tolerance on a 3px-wide candle body would make it hittable
// ±7.5px, nearly two bars either side.
function hitsFilled(
  mx: number,
  my: number,
  barIdx: number,
  r: HitRegion,
  centerXAt: (g: number) => number,
  step: number,
): boolean {
  const span = r.spanAt(barIdx);
  if (!span) return false;
  // The `step / 2` clamp is what guarantees a filled region can never reach
  // past the midpoint into the next bar's slot, at any zoom.
  const halfX = Math.min(step / 2, r.halfWidth + FILLED_HIT_PAD);
  if (Math.abs(mx - centerXAt(barIdx)) > halfX) return false;
  const top = Math.min(span[0], span[1]) - FILLED_HIT_PAD;
  const bottom = Math.max(span[0], span[1]) + FILLED_HIT_PAD;
  return my >= top && my <= bottom;
}

function hitsPolyline(
  mx: number,
  my: number,
  barIdx: number,
  r: HitRegion,
  centerXAt: (g: number) => number,
  neighbours: number,
  tolerance: number,
): boolean {
  let prevX = 0;
  let prevY = 0;
  let penDown = false;
  for (let g = barIdx - neighbours; g <= barIdx + neighbours; g++) {
    const span = r.spanAt(g);
    if (!span) {
      // A gap breaks the polyline, so a segment is never drawn across it —
      // the painter's own `defined` logic is what defines the gaps.
      penDown = false;
      continue;
    }
    const x = centerXAt(g);
    const y = (span[0] + span[1]) / 2;
    if (penDown && distToSegment(mx, my, prevX, prevY, x, y) <= tolerance)
      return true;
    prevX = x;
    prevY = y;
    penDown = true;
  }
  return false;
}

/**
 * Topmost region under `(mx, my)` at bar `barIdx`, or null. `regions` are in
 * paint order; the walk is reversed so later-painted marks win (an indicator
 * line over a candle always beats the candle).
 *
 * `step` (CSS px between adjacent bar centres) sizes the neighbour search for
 * line-like regions: zoomed fully out the bars are sub-pixel, so the nearest
 * piece of a line can be many bars away and a fixed ±1 window would miss a
 * click that visually landed on it.
 */
export function pickHitRegion(
  mx: number,
  my: number,
  barIdx: number,
  regions: readonly HitRegion[],
  centerXAt: (g: number) => number,
  step: number,
  tolerance: number = REGION_HIT_TOLERANCE,
): HitRegion | null {
  if (!Number.isFinite(barIdx) || regions.length === 0) return null;
  const neighbours = Math.max(1, Math.ceil(tolerance / Math.max(step, 1e-6)));
  for (let i = regions.length - 1; i >= 0; i--) {
    const r = regions[i];
    const hit = r.interpolate
      ? hitsPolyline(mx, my, barIdx, r, centerXAt, neighbours, tolerance)
      : hitsFilled(mx, my, barIdx, r, centerXAt, step);
    if (hit) return r;
  }
  return null;
}
