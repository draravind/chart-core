import { useCallback, useEffect, useRef, useState } from 'react';
import type { DOMAttributes, PointerEvent as ReactPointerEvent } from 'react';
import type {
  StatsPosition,
  LegacyStatsPosition,
  StatsPaneRect,
} from '../stats/types';
import {
  resolveStatsPosition,
  clampStatsToPane,
  anchorFromDrop,
  migrateLegacy,
} from '../stats/position';

// The measure/anchor/drag/clamp lifecycle shared by every corner-pinned chart
// box (Price-Stats + Earnings). Lifted verbatim out of StatsPanel so a second
// panel does not carry a private copy of the drag guards — the parts a copy
// would have got subtly wrong (the ResizeObserver no-op identity check, the
// anchor precedence, the `dragging`-gated raw pixels, clamping at all three
// sites, the mid-drag override invalidation, the one-shot legacy backfill).
//
// The only per-panel seam is `defaultPosition` — the corner a never-dragged box
// starts in. The legacy {x,y} branch stays inside the hook; a caller that never
// passes that shape (the earnings box) simply never exercises it.

export type DraggablePanel = {
  // Callback ref for the panel div. A callback ref (not a RefObject) so the panel
  // is measured whenever the node MOUNTS — including a mount that happens after
  // the first render, e.g. a box whose model is empty until an async feed lands.
  // A one-shot mount effect would miss that later mount and leave the box hidden.
  panelRef: (node: HTMLDivElement | null) => void;
  // Resolved-and-clamped frame-space pixels, or null while the panel is not yet
  // measured (render it hidden until this is non-null).
  rendered: { left: number; top: number } | null;
  dragging: boolean;
  handlers: Pick<
    DOMAttributes<HTMLDivElement>,
    'onPointerDown' | 'onPointerMove' | 'onPointerUp' | 'onPointerCancel'
  >;
};

export function useDraggablePanel(opts: {
  pane: StatsPaneRect;
  // Persisted placement, ALREADY normalised by Chart: a v:2 anchor, a legacy
  // {x,y} (migrated on first measured paint), or null for the default.
  position: StatsPosition | LegacyStatsPosition | null;
  // Fired once per drag, on pointerup, with the anchored drop position.
  onPositionChange?: (p: StatsPosition) => void;
  // Per-panel default corner, used when `position` is null.
  defaultPosition: StatsPosition;
}): DraggablePanel {
  const { pane, position, onPositionChange, defaultPosition } = opts;

  // The live panel node (imperative use: pointer capture) + the observer bound to
  // it. Both kept in refs so the callback ref can tear down and re-bind on remount.
  const panelRef = useRef<HTMLDivElement | null>(null);
  const roRef = useRef<ResizeObserver | null>(null);
  // Measured panel size — set from the callback ref below. The host is not
  // measured; its geometry is the `pane` prop.
  const [measured, setMeasured] = useState<{
    panelW: number;
    panelH: number;
  } | null>(null);
  // Anchored local override after a drop/cancel; null = defer to the prop/default.
  const [dragOverride, setDragOverride] = useState<StatsPosition | null>(null);
  // In-flight drag pixels — read ONLY while `dragging` (see render).
  const [dragPx, setDragPx] = useState<{ left: number; top: number } | null>(
    null,
  );
  const [dragging, setDragging] = useState(false);
  const dragStateRef = useRef<{
    pointerId: number;
    mx: number;
    my: number;
    startX: number;
    startY: number;
  } | null>(null);
  // One-shot legacy backfill guard, keyed on the legacy value's identity.
  const backfilledRef = useRef<LegacyStatsPosition | null>(null);

  // Measure the panel whenever it mounts, and track its resizes. A CALLBACK ref
  // (not a mount effect) so a node that appears on a LATER render is still
  // measured: a corner box whose model is empty until an async feed arrives
  // renders nothing at first, so the div — and this ref — attach only once the
  // data lands. A `useLayoutEffect(…, [])` runs before that and never re-runs,
  // leaving `measured` null and the box hidden forever (the bug this replaces).
  const setPanelNode = useCallback((node: HTMLDivElement | null) => {
    if (roRef.current) {
      roRef.current.disconnect();
      roRef.current = null;
    }
    panelRef.current = node;
    if (!node) return;
    const sync = () => {
      const r = node.getBoundingClientRect();
      const m = { panelW: r.width, panelH: r.height };
      // Skip no-op updates: ResizeObserver fires an initial callback on observe()
      // with unchanged geometry; a fresh object would force a wasted re-render.
      setMeasured((prev) =>
        prev && prev.panelW === m.panelW && prev.panelH === m.panelH ? prev : m,
      );
    };
    sync(); // synchronous seed on attach → no flicker
    const ro = new ResizeObserver(sync);
    ro.observe(node);
    roRef.current = ro;
  }, []);

  // Effect 2 — drop the stale local override when the persisted prop changes.
  // An invalidation, not a copy: when the parent persists our drop the override
  // clears with no visible change; when the prop is cleared externally we fall
  // back to the default. Guarded so it never fires mid-drag.
  useEffect(() => {
    if (!dragStateRef.current) setDragOverride(null);
  }, [position]);

  // The persisted prop, discriminated. Chart hands down a normalised value, so
  // a non-v2 object is the legacy {x,y} shape.
  const legacyProp =
    position && !('v' in position) ? (position as LegacyStatsPosition) : null;

  // Which anchor to resolve: live-committed override > prop (v:2, or migrated
  // legacy) > default. Legacy migration needs the measured panel; until then the
  // anchor is null and the panel stays hidden (same measurement gate as before).
  const anchorPos: StatsPosition | null = dragOverride
    ? dragOverride
    : position && 'v' in position
      ? (position as StatsPosition)
      : legacyProp
        ? measured
          ? migrateLegacy(legacyProp, pane, measured.panelW, measured.panelH)
          : null
        : defaultPosition;

  // Resolve to pixels each render (anchor → concrete left/top for this pane +
  // panel size), then clamp into the pane. While dragging, follow the raw drag
  // pixels instead. Gate on `dragging`, not `dragPx ?? …`: nothing else
  // invalidates dragPx, so a bare ?? would freeze the box on the drop pixels.
  let rendered: { left: number; top: number } | null = null;
  if (measured && anchorPos) {
    if (dragging && dragPx) {
      rendered = dragPx;
    } else {
      const r = resolveStatsPosition(
        anchorPos,
        pane,
        measured.panelW,
        measured.panelH,
      );
      rendered = clampStatsToPane(
        r.left,
        r.top,
        pane,
        measured.panelW,
        measured.panelH,
      );
    }
  }

  // One-shot backfill of a legacy value into a real anchor — fired only once the
  // panel is measured, so the persisted value is never a NaN backed out of an
  // unmeasured panel. Ref-guarded on the legacy identity so a re-render, a new
  // `pane` identity, or an ignored callback cannot loop. Same migrated value the
  // render derives, so screen and save agree.
  useEffect(() => {
    if (!legacyProp || !measured) return;
    if (backfilledRef.current === legacyProp) return;
    backfilledRef.current = legacyProp;
    onPositionChange?.(
      migrateLegacy(legacyProp, pane, measured.panelW, measured.panelH),
    );
  }, [legacyProp, measured, pane, onPositionChange]);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!rendered) return;
    e.stopPropagation();
    e.preventDefault();
    panelRef.current?.setPointerCapture(e.pointerId);
    // Seed from the rendered (resolved-and-clamped) pixels, not the stored anchor.
    dragStateRef.current = {
      pointerId: e.pointerId,
      mx: e.clientX,
      my: e.clientY,
      startX: rendered.left,
      startY: rendered.top,
    };
    setDragging(true);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (!drag || e.pointerId !== drag.pointerId) return;
    e.stopPropagation();
    if (!measured) return;
    const clamped = clampStatsToPane(
      drag.startX + (e.clientX - drag.mx),
      drag.startY + (e.clientY - drag.my),
      pane,
      measured.panelW,
      measured.panelH,
    );
    setDragPx(clamped);
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (!drag || e.pointerId !== drag.pointerId) return;
    e.stopPropagation();
    if (!measured) return;
    const clamped = clampStatsToPane(
      drag.startX + (e.clientX - drag.mx),
      drag.startY + (e.clientY - drag.my),
      pane,
      measured.panelW,
      measured.panelH,
    );
    const anchored = anchorFromDrop(
      clamped.left,
      clamped.top,
      pane,
      measured.panelW,
      measured.panelH,
    );
    onPositionChange?.(anchored);
    setDragOverride(anchored);
    setDragPx(null);
    dragStateRef.current = null;
    setDragging(false);
    panelRef.current?.releasePointerCapture(e.pointerId);
  };

  // Cancelled gesture: anchor the last drag pixels and keep them locally (do NOT
  // persist); with no drag pixels, leave the override untouched.
  const onPointerCancel = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (!drag || e.pointerId !== drag.pointerId) return;
    e.stopPropagation();
    if (dragPx && measured) {
      setDragOverride(
        anchorFromDrop(
          dragPx.left,
          dragPx.top,
          pane,
          measured.panelW,
          measured.panelH,
        ),
      );
    }
    setDragPx(null);
    dragStateRef.current = null;
    setDragging(false);
    panelRef.current?.releasePointerCapture(e.pointerId);
  };

  return {
    panelRef: setPanelNode,
    rendered,
    dragging,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel },
  };
}
