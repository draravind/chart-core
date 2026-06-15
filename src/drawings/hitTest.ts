// PURE hit-test geometry. Operates on ALREADY-projected pixels (the mount caches
// per-frame projected points and detranslates panned-shape coords before calling
// these). A `handle` hit (an endpoint grab) takes priority over a `body` hit.

export const HANDLE_RADIUS = 5;
export const HIT_TOLERANCE = 6;

export type Hit = { kind: 'handle'; index: number } | { kind: 'body' } | null;

// Generous grab radius around an endpoint handle: the drawn handle radius plus
// the pointer tolerance.
const HANDLE_GRAB = HANDLE_RADIUS + HIT_TOLERANCE;

type Pt = { x: number; y: number };

// Distance from point (px,py) to the segment (x0,y0)-(x1,y1).
export function distToSegment(
  px: number,
  py: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): number {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - x0, py - y0);
  let t = ((px - x0) * dx + (py - y0) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = x0 + t * dx;
  const cy = y0 + t * dy;
  return Math.hypot(px - cx, py - cy);
}

// Two-endpoint segment (trendline / ray / ruler): endpoint handles first, then
// the body.
export function hitSegment(mx: number, my: number, p0: Pt, p1: Pt): Hit {
  if (Math.hypot(mx - p0.x, my - p0.y) <= HANDLE_GRAB)
    return { kind: 'handle', index: 0 };
  if (Math.hypot(mx - p1.x, my - p1.y) <= HANDLE_GRAB)
    return { kind: 'handle', index: 1 };
  if (distToSegment(mx, my, p0.x, p0.y, p1.x, p1.y) <= HIT_TOLERANCE)
    return { kind: 'body' };
  return null;
}

// Horizontal line — spans the full viewport width at constant y; hit is purely
// `|my - y|` (the line does not pan in x).
export function hitHLine(mx: number, my: number, y: number, width: number): Hit {
  if (Math.abs(my - y) <= HIT_TOLERANCE && mx >= 0 && mx <= width)
    return { kind: 'body' };
  return null;
}

// Vertical line — constant x spanning the price pane height.
export function hitVLine(
  mx: number,
  my: number,
  x: number,
  priceHeight: number,
): Hit {
  if (Math.abs(mx - x) <= HIT_TOLERANCE && my >= 0 && my <= priceHeight)
    return { kind: 'body' };
  return null;
}

// Text box — a rect `{x,y,width,height}` (top-left origin).
export function hitTextBox(
  mx: number,
  my: number,
  box: { x: number; y: number; width: number; height: number },
): Hit {
  if (
    mx >= box.x &&
    mx <= box.x + box.width &&
    my >= box.y &&
    my <= box.y + box.height
  )
    return { kind: 'body' };
  return null;
}

// Single-anchor ray (hray): one endpoint handle at `a`, body along the segment
// `a`→`end`. A hit on the far (non-anchor) end is treated as a body hit since the
// shape has only one movable anchor.
export function hitAnchoredSegment(mx: number, my: number, a: Pt, end: Pt): Hit {
  if (Math.hypot(mx - a.x, my - a.y) <= HANDLE_GRAB)
    return { kind: 'handle', index: 0 };
  if (distToSegment(mx, my, a.x, a.y, end.x, end.y) <= HIT_TOLERANCE)
    return { kind: 'body' };
  return null;
}
