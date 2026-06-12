import type { SubpaneScaleHint } from './types';

// ---------------------------------------------------------------------------
// Pure subpane layout + scale math, extracted from Chart so it can be unit
// tested independently (D1 height policy + autofit-domain marker exclusion).
// ---------------------------------------------------------------------------

export type SubpaneBand = {
  key: string;
  top: number;
  bottom: number;
  height: number;
};

export type SubpaneBandsResult = {
  priceHeight: number;
  subpanes: SubpaneBand[];
  fullHeight: number;
};

/**
 * D1 height policy. Each active subpane gets a default share (`heightRatio` ×
 * its `heightFactors` multiplier) of the chart; a user-dragged `userHeights[key]`
 * (fraction of `totalHeight`) overrides that default. The price pane shrinks
 * toward `floorRatio` as panes stack, after which every pane's desired height is
 * scaled DOWN proportionally so the floor is honored (per-pane height clamped ≥
 * 4px). Panes stack flush top→bottom below the volume area (separated only by the
 * 1px divider line); `fullHeight` is the lowest pane's bottom (== `totalHeight`).
 *
 * With neither `heightFactors` nor `userHeights` supplied (all factors 1) this
 * is byte-identical to the original flat policy.
 */
export function computeSubpaneBands(params: {
  totalHeight: number;
  volumeHeight: number;
  gap: number;
  subpaneKeys: string[];
  heightRatio: number;
  floorRatio: number;
  /** Per-key default height multiplier (from defs' `paneHeightFactor`; max wins
   *  when several defs share a pane). Absent key → 1. */
  heightFactors?: Record<string, number>;
  /** User-dragged heights as fractions of `totalHeight`; wins over the factor
   *  default for that key. */
  userHeights?: Record<string, number>;
}): SubpaneBandsResult {
  const { totalHeight, volumeHeight, gap, subpaneKeys } = params;
  const nSub = subpaneKeys.length;

  // Per-pane desired heights (user override > factor default).
  const desired = subpaneKeys.map((key) => {
    const u = params.userHeights?.[key];
    if (u != null) return u * totalHeight;
    const factor = params.heightFactors?.[key] ?? 1;
    return totalHeight * params.heightRatio * factor;
  });
  const sumDesired = desired.reduce((a, b) => a + b, 0);

  let priceHeight = totalHeight - volumeHeight - gap - sumDesired;
  let heights = desired;
  const floor = totalHeight * params.floorRatio;
  if (nSub > 0 && priceHeight < floor) {
    priceHeight = floor;
    const leftover = totalHeight - floor - volumeHeight - gap;
    // Scale every pane's desired height proportionally so the bigger pane stays
    // proportionally bigger (per-pane clamp ≥ 4px).
    const scale = sumDesired > 0 ? leftover / sumDesired : 0;
    heights = desired.map((h) => Math.max(4, h * scale));
  }
  if (nSub === 0) priceHeight = totalHeight - volumeHeight - gap;

  const subpanes: SubpaneBand[] = [];
  let cursor = priceHeight + gap + volumeHeight;
  for (let i = 0; i < subpaneKeys.length; i++) {
    const top = cursor;
    const bottom = top + heights[i];
    subpanes.push({ key: subpaneKeys[i], top, bottom, height: heights[i] });
    cursor = bottom;
  }
  const fullHeight = nSub > 0 ? cursor : priceHeight + gap + volumeHeight;
  return { priceHeight, subpanes, fullHeight };
}

/**
 * Apply a divider drag, returning the full per-key height map (fractions of
 * `totalHeight`) to persist + feed back into `computeSubpaneBands` as
 * `userHeights`. `dividerIndex` 0 = the divider above `subpanes[0]` (trades
 * space with the price pane); `i > 0` = the divider between `subpanes[i-1]` and
 * `subpanes[i]` (trades space between those two panes only). `dy > 0` moves the
 * divider down. Clamps: every subpane ≥ `minPanePx`, price ≥ `floorRatio ×
 * totalHeight`.
 */
export function applySubpaneDrag(params: {
  bands: SubpaneBand[];
  priceHeight: number;
  totalHeight: number;
  dividerIndex: number;
  dy: number;
  minPanePx: number;
  floorRatio: number;
}): Record<string, number> {
  const { bands, priceHeight, totalHeight, dividerIndex, minPanePx, floorRatio } =
    params;
  const heights = bands.map((b) => b.height);
  let dy = params.dy;

  if (dividerIndex <= 0) {
    // Topmost divider: price ↔ subpanes[0]. Down (dy>0) grows price, shrinks
    // pane 0. Clamp pane 0 ≥ min (dy>0) and price ≥ floor (dy<0).
    const floor = totalHeight * floorRatio;
    const maxDown = heights[0] - minPanePx; // pane 0 floor
    const maxUp = priceHeight - floor; // price floor (dy can go to -maxUp)
    dy = Math.max(-maxUp, Math.min(maxDown, dy));
    heights[0] -= dy;
  } else {
    const a = dividerIndex - 1; // pane above the divider — grows on dy>0
    const b = dividerIndex; // pane below — shrinks on dy>0
    const maxDown = heights[b] - minPanePx;
    const maxUp = heights[a] - minPanePx;
    dy = Math.max(-maxUp, Math.min(maxDown, dy));
    heights[a] += dy;
    heights[b] -= dy;
  }

  const out: Record<string, number> = {};
  for (let i = 0; i < bands.length; i++) {
    out[bands[i].key] = heights[i] / totalHeight;
  }
  return out;
}

export type DomainLine = { values: Float64Array; isMarker: boolean };

/**
 * Compute a subpane's value domain. `fixedDomain` wins outright; otherwise
 * autofit over the non-marker lines across [visStart, visEnd). Marker lines
 * (e.g. a 0/1 signal) are excluded so they never poison the domain. Symmetric
 * about 0 when `zeroLine`; degenerate (single value) windows pad proportionally.
 * Returns `null` when no finite value exists.
 */
export function computeSubpaneDomain(params: {
  hint: SubpaneScaleHint | undefined;
  lines: DomainLine[];
  visStart: number;
  visEnd: number;
  defaultPad: number;
}): [number, number] | null {
  const { hint, lines, visStart, visEnd, defaultPad } = params;
  if (hint?.fixedDomain) return hint.fixedDomain;
  let lo = Infinity;
  let hi = -Infinity;
  for (const line of lines) {
    if (line.isMarker) continue;
    const arr = line.values;
    for (let g = visStart; g < visEnd && g < arr.length; g++) {
      const v = arr[g];
      if (!Number.isNaN(v)) {
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
    }
  }
  if (!Number.isFinite(lo)) return null;
  // `includeZero` extends the domain to span 0. A side that is clamped TO 0
  // (i.e. all values sat on one side of zero) is the zero baseline, not a data
  // extreme — it should hug its border exactly so bars rest on the divider, so
  // that side is excluded from padding (only the data-extreme side pads).
  let padLo = true;
  let padHi = true;
  if (hint?.includeZero) {
    if (lo > 0) {
      lo = 0;
      padLo = false;
    }
    if (hi < 0) {
      hi = 0;
      padHi = false;
    }
  }
  const padFactor = hint?.autofitPadding ?? defaultPad;
  if (hint?.zeroLine) {
    const m = Math.max(Math.abs(lo), Math.abs(hi)) || 1;
    const pad = m * padFactor;
    return [-(m + pad), m + pad];
  }
  if (hi > lo) {
    const pad = (hi - lo) * padFactor;
    return [lo - (padLo ? pad : 0), hi + (padHi ? pad : 0)];
  }
  const spread = lo !== 0 ? Math.abs(lo) * 0.1 : 1;
  return [lo - spread, lo + spread];
}
