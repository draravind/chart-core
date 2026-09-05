import type { StatsLevel } from '../stats/computeStats';
import type { EarningsViewModel } from './types';
import type { StatsPosition, StatsPaneRect, StatsSize } from './types';
import { defaultPanelPosition } from '../stats/position';
import { useDraggablePanel } from '../panel/useDraggablePanel';
import styles from './earnings.module.css';

type Props = {
  model: EarningsViewModel;
  size: StatsSize;
  // The main price pane, in frame-space px — the box anchors to and stays inside
  // this. Resolved once by the chart's layout memo (same rect the stats box uses).
  pane: StatsPaneRect;
  // Persisted placement, ALREADY normalised by Chart to a v:2 anchor or null. A
  // brand-new preference key, so there is no legacy {x,y} shape to migrate.
  position: StatsPosition | null;
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

// Static column titles for columns 1-7. Change columns are honestly "YoY".
const COL_TITLES = ['EPS', 'YoY', 'RPS', 'YoY', 'NPM', 'YoY', 'Score'];

// The score dot sits in the last data column; the quarter label in the first.
const SCORE_COL = COL_TITLES.length - 1;

/**
 * Corner-pinned quarterly-earnings table: six reported quarters (newest on top),
 * each with EPS, revenue-per-share and net margin, each with its year-over-year
 * change, plus a score dot. Free-float % fills the top-left header cell. Shares
 * the Price-Stats box's measure/anchor/drag/clamp lifecycle
 * (`useDraggablePanel`); default corner is top-right. Static snapshot.
 */
export default function EarningsPanel({
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
    defaultPosition: defaultPanelPosition(1, 0, -8, 8),
  });

  if (model.rows.length === 0) return null;

  return (
    <div className={styles.earningsHost} data-chart-earnings="">
      <div
        ref={panelRef}
        className={`${styles.earningsPanel} ${SIZE_CLASS[size]} ${dragging ? styles.dragging : ''}`}
        style={
          rendered
            ? { left: rendered.left, top: rendered.top }
            : { visibility: 'hidden' }
        }
        {...handlers}
      >
        <table className={styles.earningsTable}>
          <tbody>
            <tr>
              <td className={`${styles.label} ${LEVEL_CLASS[model.freeFloat.level]}`}>
                {model.freeFloat.text}
              </td>
              {COL_TITLES.map((title, ci) => (
                <td
                  key={ci}
                  className={`${LEVEL_CLASS.muted} ${ci === SCORE_COL ? styles.score : ''}`}
                >
                  {title}
                </td>
              ))}
            </tr>
            {model.rows.map((row, ri) => (
              <tr key={ri}>
                <td className={`${styles.label} ${LEVEL_CLASS.text}`}>
                  {row.label}
                </td>
                {row.cells.map((cell, ci) => (
                  <td
                    key={ci}
                    className={`${LEVEL_CLASS[cell.level]} ${ci === SCORE_COL ? styles.score : ''}`}
                  >
                    {cell.text}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
