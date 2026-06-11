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
  const [livePos, setLivePos] = useState<StatsPosition | null>(position);
  const [dragging, setDragging] = useState(false);
  const dragStateRef = useRef<{
    pointerId: number;
    mx: number;
    my: number;
    startX: number;
    startY: number;
  } | null>(null);

  // Mirror of `livePos` for imperative reads in the drag handlers — drag-end
  // must fire `onPositionChange` OUTSIDE the state updater (updaters must be
  // pure; StrictMode double-invokes them, which would double-fire the persist).
  const livePosRef = useRef<StatsPosition | null>(position);
  useEffect(() => {
    livePosRef.current = livePos;
  }, [livePos]);

  // Sync from the persisted prop when not dragging (e.g. pref cleared/loaded).
  useEffect(() => {
    if (!dragStateRef.current) setLivePos(position);
  }, [position]);

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

  // Default placement when nothing is persisted — local only, never persisted.
  useLayoutEffect(() => {
    if (livePos !== null) return;
    const m = measure();
    if (!m) return;
    setLivePos(defaultStatsPosition(m.hostW, m.panelW, marginRight));
  }, [livePos, marginRight]);

  // Re-clamp when the host or the panel itself resizes (the panel grows when
  // async fundamentals arrive, and on statsSize changes). While nothing is
  // persisted, re-derive the default instead so the panel tracks its growing
  // width and stays left of the axis gutter. Local only — never persisted.
  const hasPersisted = position !== null;
  useEffect(() => {
    const host = hostRef.current;
    const panel = panelRef.current;
    if (!host || !panel) return;
    const ro = new ResizeObserver(() => {
      if (dragStateRef.current) return;
      const m = measure();
      if (!m) return;
      setLivePos((pos) => {
        if (pos === null) return pos;
        return hasPersisted
          ? clampStatsPosition(pos, m.hostW, m.hostH, m.panelW, m.panelH)
          : defaultStatsPosition(m.hostW, m.panelW, marginRight);
      });
    });
    ro.observe(host);
    ro.observe(panel);
    return () => ro.disconnect();
  }, [hasPersisted, marginRight]);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!livePos) return;
    e.stopPropagation();
    e.preventDefault();
    panelRef.current?.setPointerCapture(e.pointerId);
    dragStateRef.current = {
      pointerId: e.pointerId,
      mx: e.clientX,
      my: e.clientY,
      startX: livePos.x,
      startY: livePos.y,
    };
    setDragging(true);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (!drag || e.pointerId !== drag.pointerId) return;
    e.stopPropagation();
    const m = measure();
    if (!m) return;
    const next = clampStatsPosition(
      {
        x: drag.startX + (e.clientX - drag.mx),
        y: drag.startY + (e.clientY - drag.my),
      },
      m.hostW,
      m.hostH,
      m.panelW,
      m.panelH,
    );
    livePosRef.current = next;
    setLivePos(next);
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (!drag || e.pointerId !== drag.pointerId) return;
    e.stopPropagation();
    dragStateRef.current = null;
    setDragging(false);
    panelRef.current?.releasePointerCapture(e.pointerId);
    const m = measure();
    const pos = livePosRef.current;
    if (pos === null) return;
    const clamped = m
      ? clampStatsPosition(pos, m.hostW, m.hostH, m.panelW, m.panelH)
      : pos;
    livePosRef.current = clamped;
    setLivePos(clamped);
    onPositionChange?.(clamped);
  };

  if (model.rows.length === 0) return null;

  return (
    <div ref={hostRef} className={styles.statsHost} data-chart-stats="">
      <div
        ref={panelRef}
        className={`${styles.statsPanel} ${SIZE_CLASS[size]} ${dragging ? styles.dragging : ''}`}
        style={
          livePos
            ? { left: livePos.x, top: livePos.y }
            : { visibility: 'hidden' }
        }
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
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
