// Interactive, persistent drawing tools (trend lines, rays, h/v lines, text,
// ruler). Anchors are `{date, price}` — ISO date + price — so a drawing survives
// `warmupSeed` prepends / re-slices / new bars, exactly like the date-anchored
// pattern overlays. The host owns and persists the `drawings[]` array via the
// standard controlled-prop contract (`drawings` / `onDrawingsChange`).

export type DrawingAnchor = { date: string; price: number };

// Per-shape style overrides. All optional — `effectiveDrawingStyle` fills the
// gaps from `DRAWING_DEFAULTS`. `style`: 0 solid | 1 dashed | 2 dotted (matches
// the indicator `LINE_STYLE_OPTIONS` encoding). The text* fields apply only to
// text drawings.
export type DrawingStyle = {
  color?: string;
  width?: number;
  style?: number; // 0 solid | 1 dashed | 2 dotted
  opacity?: number;
  text?: string;
  fontSize?: number;
  bgColor?: string;
  bgOpacity?: number;
};

// `v` is an optional version tag for forward-compatible read-tolerance. New
// fields are always optional-with-default so older payloads keep deserializing.
type DrawingBase = { id: string; locked?: boolean; style?: DrawingStyle; v?: number };

export type TrendLineDrawing = DrawingBase & {
  type: 'trendline';
  a: DrawingAnchor;
  b: DrawingAnchor;
};
export type HorizontalLineDrawing = DrawingBase & { type: 'hline'; price: number };
export type VerticalLineDrawing = DrawingBase & { type: 'vline'; date: string };
export type HorizontalRayDrawing = DrawingBase & { type: 'hray'; a: DrawingAnchor };
export type RayDrawing = DrawingBase & {
  type: 'ray';
  a: DrawingAnchor;
  b: DrawingAnchor;
};
export type TextDrawing = DrawingBase & { type: 'text'; a: DrawingAnchor };
export type RulerDrawing = DrawingBase & {
  type: 'ruler';
  a: DrawingAnchor;
  b: DrawingAnchor;
};

export type DrawingShape =
  | TrendLineDrawing
  | HorizontalLineDrawing
  | VerticalLineDrawing
  | HorizontalRayDrawing
  | RayDrawing
  | TextDrawing
  | RulerDrawing;

export type DrawingType = DrawingShape['type'];
// The active tool held ephemerally by the host (default 'cursor' = no drawing).
export type DrawingTool = DrawingType | 'cursor';

function isAnchor(a: unknown): a is DrawingAnchor {
  return (
    !!a &&
    typeof a === 'object' &&
    typeof (a as { date?: unknown }).date === 'string' &&
    typeof (a as { price?: unknown }).price === 'number' &&
    Number.isFinite((a as { price: number }).price)
  );
}

// Read-tolerance: validate a persisted (possibly older/partial) payload, drop
// unrenderable shapes (`null`), and ROUND-TRIP unknown `type`s rather than
// crashing — a newer host writing a shape this build doesn't render still
// survives a load→save cycle. `drawings` starts empty for existing hosts, so no
// backfill migration is needed.
export function normalizeDrawing(raw: unknown): DrawingShape | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || r.id === '') return null;
  if (typeof r.type !== 'string') return null;
  switch (r.type) {
    case 'trendline':
    case 'ray':
    case 'ruler':
      return isAnchor(r.a) && isAnchor(r.b) ? (raw as DrawingShape) : null;
    case 'hray':
    case 'text':
      return isAnchor(r.a) ? (raw as DrawingShape) : null;
    case 'hline':
      return typeof r.price === 'number' && Number.isFinite(r.price)
        ? (raw as DrawingShape)
        : null;
    case 'vline':
      return typeof r.date === 'string' ? (raw as DrawingShape) : null;
    default:
      // Unknown type — preserve it (forward-compat) instead of dropping it.
      return raw as DrawingShape;
  }
}
