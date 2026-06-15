import type { DrawingAnchor, DrawingShape, DrawingTool, DrawingType } from './types';
import type { Hit } from './hitTest';

// PURE state-machine reducer — the single source of truth for clicks-per-tool +
// pan-suppression. `Chart` does I/O only (maps pointers to anchors, persists),
// then routes discrete events through `reduceDrawing`. The drag MOVE math (per-
// frame working copy) lives in `Chart` because it needs live scale access; this
// reducer owns placement, drag start, drag commit, escape, and select/deselect.

export type DraftState =
  | { phase: 'idle' }
  | { phase: 'placing'; tool: DrawingType; anchors: DrawingAnchor[] }
  | { phase: 'dragging'; id: string; grab: Hit; origin: DrawingShape };

export type ReduceEvent =
  | {
      type: 'down';
      anchor: DrawingAnchor;
      target?: { id: string; hit: Hit; shape: DrawingShape } | null;
    }
  // The committed (dragged) working copy is handed back on mouseup.
  | { type: 'up'; working?: DrawingShape | null }
  | { type: 'escape' };

export type ReduceCtx = { tool: DrawingTool; makeId: () => string };

export type ReduceResult = {
  draft: DraftState;
  // A newly placed shape OR an edited (dragged) shape to persist (replace-by-id).
  commit?: DrawingShape;
  // undefined = no change; null = clear selection.
  selectId?: string | null;
  // true => the pointer was consumed; suppress the pan-drag + bg-deselect.
  consumedPointer: boolean;
};

// Clicks (placed anchors) each tool needs before it commits.
const CLICKS: Record<DrawingType, number> = {
  trendline: 2,
  ray: 2,
  ruler: 2,
  hline: 1,
  vline: 1,
  hray: 1,
  text: 1,
};

export function clicksFor(type: DrawingType): number {
  return CLICKS[type];
}

export function buildDrawing(
  type: DrawingType,
  anchors: DrawingAnchor[],
  id: string,
): DrawingShape {
  switch (type) {
    case 'trendline':
      return { id, type, a: anchors[0], b: anchors[1] };
    case 'ray':
      return { id, type, a: anchors[0], b: anchors[1] };
    case 'ruler':
      return { id, type, a: anchors[0], b: anchors[1] };
    case 'hline':
      return { id, type, price: anchors[0].price };
    case 'vline':
      return { id, type, date: anchors[0].date };
    case 'hray':
      return { id, type, a: anchors[0] };
    case 'text':
      return { id, type, a: anchors[0] };
  }
}

export function reduceDrawing(
  state: DraftState,
  ev: ReduceEvent,
  ctx: ReduceCtx,
): ReduceResult {
  const { tool, makeId } = ctx;

  if (ev.type === 'escape') {
    return { draft: { phase: 'idle' }, consumedPointer: state.phase !== 'idle' };
  }

  if (ev.type === 'up') {
    if (state.phase === 'dragging') {
      return {
        draft: { phase: 'idle' },
        commit: ev.working ?? state.origin,
        consumedPointer: true,
      };
    }
    return { draft: state, consumedPointer: state.phase !== 'idle' };
  }

  // ev.type === 'down'
  const { anchor, target } = ev;

  // Mid-placement: append this click; commit once enough anchors are collected.
  if (state.phase === 'placing') {
    const anchors = [...state.anchors, anchor];
    if (anchors.length >= clicksFor(state.tool)) {
      const shape = buildDrawing(state.tool, anchors, makeId());
      return {
        draft: { phase: 'idle' },
        commit: shape,
        selectId: shape.id,
        consumedPointer: true,
      };
    }
    return {
      draft: { phase: 'placing', tool: state.tool, anchors },
      consumedPointer: true,
    };
  }

  // Idle + a tool is active → start (or one-click commit) a placement.
  if (tool !== 'cursor') {
    const t = tool;
    if (clicksFor(t) === 1) {
      const shape = buildDrawing(t, [anchor], makeId());
      return {
        draft: { phase: 'idle' },
        commit: shape,
        selectId: shape.id,
        consumedPointer: true,
      };
    }
    return {
      draft: { phase: 'placing', tool: t, anchors: [anchor] },
      consumedPointer: true,
    };
  }

  // Idle + cursor: a hit starts a select/drag; a pure miss deselects + pans.
  if (target) {
    return {
      draft: { phase: 'dragging', id: target.id, grab: target.hit, origin: target.shape },
      selectId: target.id,
      consumedPointer: true,
    };
  }
  return { draft: { phase: 'idle' }, selectId: null, consumedPointer: false };
}
