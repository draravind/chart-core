// Pure geometry for the free-draggable Price Stats panel. Kept out of the
// component so it can be unit-tested in the node (no-DOM) test environment.

import type { StatsPosition } from './types';

/** Clamp a panel position so the panel stays fully inside the host bounds. */
export function clampStatsPosition(
  pos: StatsPosition,
  hostW: number,
  hostH: number,
  panelW: number,
  panelH: number,
): StatsPosition {
  return {
    x: Math.min(Math.max(0, pos.x), Math.max(0, hostW - panelW)),
    y: Math.min(Math.max(0, pos.y), Math.max(0, hostH - panelH)),
  };
}

/** Default placement: top-right, left of the price-axis label gutter. Floored
 * at 0 so a host narrower than panel+gutter pins to the left edge instead of
 * pushing the panel off-screen. */
export function defaultStatsPosition(
  hostW: number,
  panelW: number,
  marginRight: number,
): StatsPosition {
  return { x: Math.max(0, hostW - panelW - marginRight - 8), y: 8 };
}
