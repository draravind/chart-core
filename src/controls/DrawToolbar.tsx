import type { PointerEvent as ReactPointerEvent } from 'react';
import { GripHorizontal, Trash2 } from 'lucide-react';
import { cn } from '../internal/cn';
import { useDraggablePanel } from '../panel/useDraggablePanel';
import { defaultPanelPosition } from '../stats/position';
import type { StatsPaneRect, StatsPosition, LegacyStatsPosition } from '../stats/types';
import type { DrawingTool } from '../drawings/types';
import { DRAW_TOOLS } from './drawTools';
import styles from './DrawToolbar.module.css';

type Props = {
  activeTool: DrawingTool;
  onToolChange: (t: DrawingTool) => void;
  // Count only — the card never inspects a shape. `undefined` ⇒ the host wired no
  // drawings channel, so the trash button is not rendered at all (an enabled-
  // looking control bound to a no-op is worse than an absent one).
  drawingCount: number;
  onDeleteAll?: () => void;
  pane: StatsPaneRect;
  position: StatsPosition | LegacyStatsPosition | null;
  onPositionChange?: (p: StatsPosition) => void;
};

/**
 * A vertical, icon-only drawing-tool palette floating over the main price pane.
 * Draggable by a grip handle at the top; its placement is stored as a normalised
 * anchor and re-resolved every render, exactly like the Price-Stats / Earnings
 * boxes (shared `useDraggablePanel`). The tool buttons stay pure click targets —
 * only the grip begins a drag.
 */
export default function DrawToolbar(p: Props) {
  const { panelRef, rendered, dragging, handlers } = useDraggablePanel({
    pane: p.pane,
    position: p.position,
    onPositionChange: p.onPositionChange,
    defaultPosition: defaultPanelPosition(0, 0.5, 8, 0),
  });
  // Destructure the hook's onPointerDown so the grip gate cannot be undone by a
  // spread reorder; the other three handlers sit on the card untouched (pointer
  // capture is taken on the card node, so they retarget there after capture).
  const { onPointerDown: beginDrag, ...dragHandlers } = handlers;
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    // Grip only: elsewhere the press must reach the button underneath.
    if (!(e.target as HTMLElement).closest('[data-drag-handle]')) return;
    beginDrag?.(e);
  };

  return (
    <div className={styles.host} data-chart-drawtoolbar="">
      <div
        ref={panelRef}
        role="toolbar"
        aria-orientation="vertical"
        aria-label="Drawing tools"
        className={cn(styles.card, dragging && styles.dragging)}
        style={
          rendered
            ? { left: rendered.left, top: rendered.top }
            : { visibility: 'hidden' }
        }
        {...dragHandlers}
        onPointerDown={onPointerDown}
      >
        <div
          className={styles.grip}
          data-drag-handle=""
          title="Drag to move"
          aria-hidden="true"
        >
          <GripHorizontal size={14} />
        </div>
        {DRAW_TOOLS.map(({ tool, label, Icon }) => (
          <button
            key={tool}
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={p.activeTool === tool}
            className={cn(
              styles.toolBtn,
              p.activeTool === tool && styles.toolBtnActive,
            )}
            onClick={() => p.onToolChange(tool)}
          >
            <Icon size={16} />
          </button>
        ))}
        {p.onDeleteAll && (
          <>
            <div className={styles.divider} />
            <button
              type="button"
              title="Delete all"
              aria-label="Delete all drawings"
              className={styles.toolBtn}
              disabled={p.drawingCount === 0}
              onClick={p.onDeleteAll}
            >
              <Trash2 size={16} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
