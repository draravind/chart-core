import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { GripHorizontal, Trash2 } from 'lucide-react';
import { cn } from '../internal/cn';
import { useDraggablePanel } from '../panel/useDraggablePanel';
import { defaultPanelPosition } from '../stats/position';
import type { StatsPaneRect, StatsPosition, LegacyStatsPosition } from '../stats/types';
import type { DrawingTool } from '../drawings/types';
import { DRAW_TOOLS } from './drawTools';
import { useDismissable } from './useDismissable';
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

  // "Delete all" wipes every drawing at once, so it asks first: the click opens a
  // small confirm popover anchored to the button, and only its Delete fires the
  // clear. An outside press or Escape (via the shared dismissal stack) closes it,
  // as does the drawings going to zero from under it.
  const [confirmOpen, setConfirmOpen] = useState(false);
  const trashRef = useRef<HTMLButtonElement | null>(null);
  const confirmRef = useRef<HTMLDivElement | null>(null);
  const closeConfirm = () => setConfirmOpen(false);
  // `trashRef` is in the layer so the button's own toggle click isn't read as an
  // outside press (which would dismiss-then-reopen).
  useDismissable(confirmOpen, closeConfirm, [confirmRef, trashRef]);
  useEffect(() => {
    if (p.drawingCount === 0) setConfirmOpen(false);
  }, [p.drawingCount]);

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
            <div className={styles.trashWrap}>
              <button
                ref={trashRef}
                type="button"
                title="Delete all"
                aria-label="Delete all drawings"
                aria-haspopup="dialog"
                aria-expanded={confirmOpen}
                className={cn(styles.toolBtn, confirmOpen && styles.toolBtnActive)}
                disabled={p.drawingCount === 0}
                onClick={() => setConfirmOpen((o) => !o)}
              >
                <Trash2 size={16} />
              </button>
              {confirmOpen && (
                <div
                  ref={confirmRef}
                  className={styles.confirmPopover}
                  role="dialog"
                  aria-label="Delete all drawings"
                >
                  <div className={styles.confirmText}>Delete all drawings?</div>
                  <div className={styles.confirmActions}>
                    <button
                      type="button"
                      className={styles.confirmCancel}
                      onClick={closeConfirm}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className={styles.confirmDelete}
                      onClick={() => {
                        closeConfirm();
                        p.onDeleteAll?.();
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
