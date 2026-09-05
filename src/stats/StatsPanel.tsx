import type { StatsLevel, StatsViewModel } from './computeStats';
import type {
  StatsPosition,
  LegacyStatsPosition,
  StatsPaneRect,
  StatsSize,
} from './types';
import { defaultStatsPosition } from './position';
import { useDraggablePanel } from '../panel/useDraggablePanel';
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
 * inside the price pane. Static snapshot — does not update on hover/pan. The
 * measure/anchor/drag/clamp lifecycle is the shared `useDraggablePanel` hook.
 */
export default function StatsPanel({
  model,
  size,
  pane,
  position,
  onPositionChange,
}: Props) {
  const { panelRef, rendered, dragging, handlers } = useDraggablePanel({
    pane,
    position,
    onPositionChange,
    defaultPosition: defaultStatsPosition(),
  });

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
        {...handlers}
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
