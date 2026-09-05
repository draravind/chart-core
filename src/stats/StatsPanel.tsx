import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { StatsLevel, StatsViewModel } from './computeStats';
import type {
  StatsPosition,
  LegacyStatsPosition,
  StatsPaneRect,
  StatsSize,
} from './types';
import {
  resolveStatsPosition,
  clampStatsToPane,
  anchorFromDrop,
  defaultStatsPosition,
  migrateLegacy,
} from './position';
import styles from './stats.module.css';

type Props = {
  model: StatsViewModel;
  size: StatsSize;
  // The main price pane, in frame-space px — the box is anchored to and confined
  // within this, never over the price-axis gutter or the time strip. The chart
  // resolves it once in its `layout` memo; the panel never re-measures its host.
  pane: StatsPaneRect;
  // Persisted placement, ALREADY normalised by Chart: a v:2 anchor, a legacy
  // {x,y} (migrated on first measured paint), or null for the default placement.
  position: StatsPosition | LegacyStatsPosition | null;
  // Fired once per drag, on pointerup, with the anchored drop position.
  onPositionChange?: (p: StatsPosition) => void;
};

const SIZE_CLASS: Record<StatsSize, string> = {
  tiny: styles.sizeTiny,
  small: styles.sizeSmall,
  normal: styles.sizeNormal,
  large: styles.sizeLarge,
};

const LEVEL_CLASS: Record<StatsLevel, string> = {
  strong: styles.lvlStrong,
  up: styles.lvlUp,
  neutral: styles.lvlNeutral,
  down: styles.lvlDown,
  text: styles.lvlText,
  muted: styles.lvlMuted,
};

/**
 * Floating latest-bar stats table, draggable anywhere over the main price pane.
 * Its placement is stored as a normalised anchor (corner/edge fraction + fixed
 * pixel offset) and re-resolved to pixels every render, so it holds its corner
 * when the chart resizes. The host spans the frame but ignores pointer events;
 * the panel itself is interactive (whole panel = drag handle) and clamps to stay
 * inside the price pane. Static snapshot — does not update on hover/pan.
 */
export default function StatsPanel({
  model,
  size,
  pane,
  position,
  onPositionChange,
}: Props) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  // Measured panel size — the ONLY thing an effect writes (genuine DOM read).
  // The host is no longer measured; its geometry is the `pane` prop.
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

  const measure = () => {
    const panel = panelRef.current;
    if (!panel) return null;
    const r = panel.getBoundingClientRect();
    return { panelW: r.width, panelH: r.height };
  };

  // Effect 1 — measure the panel on mount + track its resizes (only DOM-sync
  // effect). The host is not observed: its size is the `pane` prop from Chart.
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const sync = () => {
      const m = measure();
      if (!m) return;
      // Skip no-op updates: ResizeObserver fires an initial callback on observe()
      // with unchanged geometry; a fresh object would force a wasted re-render.
      setMeasured((prev) =>
        prev && prev.panelW === m.panelW && prev.panelH === m.panelH ? prev : m,
      );
    };
    sync(); // synchronous seed before first paint → no flicker
    const ro = new ResizeObserver(sync);
    ro.observe(panel);
    return () => ro.disconnect();
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
        : defaultStatsPosition();

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

  if (model.rows.length === 0) return null;

  return (
    <div className={styles.statsHost} data-chart-stats="">
      <div
        ref={panelRef}
        className={`${styles.statsPanel} ${SIZE_CLASS[size]} ${dragging ? styles.dragging : ''}`}
        style={
          rendered
            ? { left: rendered.left, top: rendered.top }
            : { visibility: 'hidden' }
        }
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        <table className={styles.statsTable}>
          <tbody>
            {model.rows.map((row, ri) =>
              row.kind === 'merged' ? (
                <tr key={ri}>
                  <td colSpan={3} className={LEVEL_CLASS[row.cell.level]}>
                    {row.cell.text}
                  </td>
                </tr>
              ) : (
                <tr key={ri}>
                  {row.cells.map((cell, ci) => (
                    <td key={ci} className={LEVEL_CLASS[cell.level]}>
                      {cell.text}
                    </td>
                  ))}
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
