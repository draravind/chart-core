// Pure geometry for the free-draggable Price Stats panel. Kept out of the
// component so it can be unit-tested in the node (no-DOM) test environment.
// Everything is expressed against the main price-pane rect (frame-space px),
// following the `classifyChartRegion` precedent (src/gestures/chartRegion.ts):
// pure functions that take their geometry explicitly.

import type {
  StatsPosition,
  LegacyStatsPosition,
  StatsPaneRect,
} from './types';

/** Resolve the stored anchor to concrete frame-space pixels for the current
 * pane + panel size:
 *   left = pane.left + ax*(pane.width  - panelW) + dx
 *   top  = pane.top  + ay*(pane.height - panelH) + dy
 * so (1,1) holds a constant gap to the bottom-right at any size. */
export function resolveStatsPosition(
  pos: StatsPosition,
  pane: StatsPaneRect,
  panelW: number,
  panelH: number,
): { left: number; top: number } {
  return {
    left: pane.left + pos.ax * (pane.width - panelW) + pos.dx,
    top: pane.top + pos.ay * (pane.height - panelH) + pos.dy,
  };
}

/** Clamp frame-space pixels so the panel stays fully inside the price pane
 * (into `[pane.left, pane.left + max(0, pane.width − panelW)]`, y-analogue),
 * i.e. against the pane, not against 0. */
export function clampStatsToPane(
  left: number,
  top: number,
  pane: StatsPaneRect,
  panelW: number,
  panelH: number,
): { left: number; top: number } {
  return {
    left: Math.min(
      Math.max(pane.left, left),
      pane.left + Math.max(0, pane.width - panelW),
    ),
    top: Math.min(
      Math.max(pane.top, top),
      pane.top + Math.max(0, pane.height - panelH),
    ),
  };
}

/** Snap an anchor from a drop's box-centre fraction (per axis to {0,0.5,1}) and
 * back out the fixed pixel offset. INPUT MUST ALREADY BE CLAMPED into the pane —
 * anchoring an unclamped drop then render-clamping it jumps the box on release
 * (measured 180px). This function assumes clamped input and does not re-clamp. */
export function anchorFromDrop(
  left: number,
  top: number,
  pane: StatsPaneRect,
  panelW: number,
  panelH: number,
): StatsPosition {
  const cx = pane.width ? (left + panelW / 2 - pane.left) / pane.width : 0.5;
  const cy = pane.height ? (top + panelH / 2 - pane.top) / pane.height : 0.5;
  const ax = cx < 1 / 3 ? 0 : cx < 2 / 3 ? 0.5 : 1;
  const ay = cy < 1 / 3 ? 0 : cy < 2 / 3 ? 0.5 : 1;
  return {
    v: 2,
    ax,
    ay,
    dx: left - (pane.left + ax * (pane.width - panelW)),
    dy: top - (pane.top + ay * (pane.height - panelH)),
  };
}

/** Default placement: top-right, 8px inset. A plain constant — the price-axis
 * gutter now lives outside the pane rect, so nothing size-dependent is needed.
 * Local only, never persisted. */
export function defaultStatsPosition(): StatsPosition {
  return { v: 2, ax: 1, ay: 0, dx: -8, dy: 8 };
}

/** Read-tolerance on the untrusted persisted prop, mirroring `normalizeDrawing`.
 * Dispatch on `v`: v===2 → require ax/ay/dx/dy finite else null; no `v` → legacy,
 * only if x/y finite; any other `v` or non-object → null (caller renders default).
 * An unknown `v` (a newer build's shape) round-trips to null → the default, which
 * is local-only and never overwritten — same forward-compat outcome as
 * `normalizeDrawing` on an unknown `type`, reached without storing geometry we
 * cannot draw. */
export function normalizeStatsPosition(
  raw: unknown,
): StatsPosition | LegacyStatsPosition | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (r.v === 2) {
    return fin(r.ax) && fin(r.ay) && fin(r.dx) && fin(r.dy)
      ? (raw as StatsPosition)
      : null;
  }
  if (r.v === undefined) {
    return fin(r.x) && fin(r.y) ? (raw as LegacyStatsPosition) : null;
  }
  return null;
}

/** Migrate a legacy frame-space pixel position: clamp into the pane (same origin
 * as the pane rect), then snap to an anchor. */
export function migrateLegacy(
  old: LegacyStatsPosition,
  pane: StatsPaneRect,
  panelW: number,
  panelH: number,
): StatsPosition {
  const clamped = clampStatsToPane(old.x, old.y, pane, panelW, panelH);
  return anchorFromDrop(clamped.left, clamped.top, pane, panelW, panelH);
}

function fin(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}
