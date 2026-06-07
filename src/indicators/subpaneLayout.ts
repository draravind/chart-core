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
  subGap: number;
};

/**
 * D1 height policy. Each active subpane gets a fixed share (`heightRatio`) of
 * the chart with a gap (`gapRatio`) above it; the price pane shrinks toward
 * `floorRatio` as panes stack, after which the leftover zone splits equally
 * among the panes (per-pane height clamped ≥ 4px). Panes stack top→bottom below
 * the volume area; `fullHeight` is the lowest pane's bottom (== `totalHeight`).
 */
export function computeSubpaneBands(params: {
  totalHeight: number;
  volumeHeight: number;
  gap: number;
  subpaneKeys: string[];
  heightRatio: number;
  gapRatio: number;
  floorRatio: number;
}): SubpaneBandsResult {
  const { totalHeight, volumeHeight, gap, subpaneKeys } = params;
  const nSub = subpaneKeys.length;
  const subGap = nSub > 0 ? totalHeight * params.gapRatio : 0;
  const desiredPane = totalHeight * params.heightRatio;
  const gapZone = nSub * subGap;
  let priceHeight =
    totalHeight - volumeHeight - gap - gapZone - nSub * desiredPane;
  let paneHeight = desiredPane;
  const floor = totalHeight * params.floorRatio;
  if (nSub > 0 && priceHeight < floor) {
    priceHeight = floor;
    const leftover = totalHeight - floor - volumeHeight - gap - gapZone;
    paneHeight = Math.max(4, leftover / nSub);
  }
  if (nSub === 0) priceHeight = totalHeight - volumeHeight - gap;

  const subpanes: SubpaneBand[] = [];
  let cursor = priceHeight + gap + volumeHeight;
  for (const key of subpaneKeys) {
    cursor += subGap;
    const top = cursor;
    const bottom = top + paneHeight;
    subpanes.push({ key, top, bottom, height: paneHeight });
    cursor = bottom;
  }
  const fullHeight = nSub > 0 ? cursor : priceHeight + gap + volumeHeight;
  return { priceHeight, subpanes, fullHeight, subGap };
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
  const padFactor = hint?.autofitPadding ?? defaultPad;
  if (hint?.zeroLine) {
    const m = Math.max(Math.abs(lo), Math.abs(hi)) || 1;
    const pad = m * padFactor;
    return [-(m + pad), m + pad];
  }
  if (hi > lo) {
    const pad = (hi - lo) * padFactor;
    return [lo - pad, hi + pad];
  }
  const spread = lo !== 0 ? Math.abs(lo) * 0.1 : 1;
  return [lo - spread, lo + spread];
}
