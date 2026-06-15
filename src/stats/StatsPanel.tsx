import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { StatsLevel, StatsViewModel } from './computeStats';
import type { StatsPosition, StatsSize } from './types';
import { clampStatsPosition, defaultStatsPosition } from './position';
import styles from './stats.module.css';

type Props = {
  model: StatsViewModel;
  size: StatsSize;
  // Price-axis gutter (MARGIN.right): the default (nothing persisted) placement
  // sits top-right, inset by this so the panel doesn't overlap the price axis.
  marginRight: number;
  // Persisted drop position (wrapper pixels), or null for the default placement.
  position: StatsPosition | null;
  // Fired once per drag, on pointerup, with the clamped drop position.
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
 * Floating latest-bar stats table, free-draggable anywhere over `.chartWrapper`.
 * The host spans the wrapper but ignores pointer events; the panel itself is
 * interactive (whole panel = drag handle) and clamps to stay fully visible on
 * render, drag, and resize. Static snapshot — does not update on hover/pan.
 */
export default function StatsPanel({
  model,
  size,
  marginRight,
  position,
  onPositionChange,
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  // Measured geometry — the ONLY thing an effect writes (genuine DOM read).
  const [measured, setMeasured] = useState<{
    hostW: number;
    hostH: number;
    panelW: number;
    panelH: number;
  } | null>(null);
  // Transient local position during/after a drag; null = defer to the prop/default.
  const [dragOverride, setDragOverride] = useState<StatsPosition | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragStateRef = useRef<{
    pointerId: number;
    mx: number;
    my: number;
    startX: number;
    startY: number;
  } | null>(null);

  const measure = () => {
    const host = hostRef.current;
    const panel = panelRef.current;
    if (!host || !panel) return null;
    const hostRect = host.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    return {
      hostW: hostRect.width,
      hostH: hostRect.height,
      panelW: panelRect.width,
      panelH: panelRect.height,
    };
  };

  // Effect 1 — measure on mount + track resizes (the only DOM-sync effect).
  useLayoutEffect(() => {
    const host = hostRef.current;
    const panel = panelRef.current;
    if (!host || !panel) return;
    const sync = () => {
      const m = measure();
      if (!m) return;
      // Skip no-op updates: ResizeObserver fires an initial callback on observe()
      // with unchanged geometry; a fresh object would force a wasted re-render.
      setMeasured((prev) =>
        prev &&
        prev.hostW === m.hostW &&
        prev.hostH === m.hostH &&
        prev.panelW === m.panelW &&
        prev.panelH === m.panelH
          ? prev
          : m,
      );
    };
    sync(); // synchronous seed before first paint → no flicker
    const ro = new ResizeObserver(sync);
    ro.observe(host);
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

  // Derived during render — no effects, no stored position.
  const defaultPos = measured
    ? defaultStatsPosition(measured.hostW, measured.panelW, marginRight)
    : null;
  const rawPos = dragOverride ?? position ?? defaultPos; // live drag > persisted > default
  const effectivePos =
    rawPos && measured
      ? clampStatsPosition(
          rawPos,
          measured.hostW,
          measured.hostH,
          measured.panelW,
          measured.panelH,
        )
      : rawPos;

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!effectivePos) return;
    e.stopPropagation();
    e.preventDefault();
    panelRef.current?.setPointerCapture(e.pointerId);
    dragStateRef.current = {
      pointerId: e.pointerId,
      mx: e.clientX,
      my: e.clientY,
      startX: effectivePos.x,
      startY: effectivePos.y,
    };
    setDragging(true);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (!drag || e.pointerId !== drag.pointerId) return;
    e.stopPropagation();
    if (!measured) return;
    const next = clampStatsPosition(
      {
        x: drag.startX + (e.clientX - drag.mx),
        y: drag.startY + (e.clientY - drag.my),
      },
      measured.hostW,
      measured.hostH,
      measured.panelW,
      measured.panelH,
    );
    setDragOverride(next);
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (!drag || e.pointerId !== drag.pointerId) return;
    e.stopPropagation();
    if (!measured) return;
    const dropped = clampStatsPosition(
      {
        x: drag.startX + (e.clientX - drag.mx),
        y: drag.startY + (e.clientY - drag.my),
      },
      measured.hostW,
      measured.hostH,
      measured.panelW,
      measured.panelH,
    );
    setDragOverride(dropped);
    onPositionChange?.(dropped);
    dragStateRef.current = null;
    setDragging(false);
    panelRef.current?.releasePointerCapture(e.pointerId);
  };

  // Cancelled gesture: keep the last move as a local override, do NOT persist.
  const onPointerCancel = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (!drag || e.pointerId !== drag.pointerId) return;
    e.stopPropagation();
    dragStateRef.current = null;
    setDragging(false);
    panelRef.current?.releasePointerCapture(e.pointerId);
  };

  if (model.rows.length === 0) return null;

  return (
    <div ref={hostRef} className={styles.statsHost} data-chart-stats="">
      <div
        ref={panelRef}
        className={`${styles.statsPanel} ${SIZE_CLASS[size]} ${dragging ? styles.dragging : ''}`}
        style={
          effectivePos
            ? { left: effectivePos.x, top: effectivePos.y }
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
