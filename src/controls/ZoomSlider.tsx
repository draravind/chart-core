import { RANGES } from '../types';
import { RANGE_DAYS, MIN_VISIBLE_BARS } from '../utils/chartCalculations';
import styles from './ZoomSlider.module.css';

type Props = {
  visibleBars: number;
  onVisibleBarsChange: (n: number) => void;
  // Readability-derived cap surfaced by Chart's onMaxVisibleBarsChange. Bounds
  // the slider's max and decides which range marks render (D4: only reachable
  // marks appear — no greyed/disabled marks).
  maxVisibleBars: number;
  // Reset pan to the latest bar when the value lands on a named-range mark
  // (mirrors the old range-pill behavior). Free-drag between marks leaves pan as-is.
  onPanReset?: () => void;
};

// Zoom slider with named range marks (3M/6M/1Y/2Y/3Y/5Y). Replaces the old range
// pills (D3). Its top end is the readability cap owned by chart-core; only marks
// that fit the cap render. The track maps bar-count → position LOGARITHMICALLY:
// the range marks roughly double (66/132/252/504…), so a linear track crams the
// short ranges against the left edge. The range input itself operates in log-space
// (min/max/value are ln(bars)) so the native thumb and the mark labels both land
// at the same log positions; we exponentiate on commit and ln() on read.
export default function ZoomSlider({
  visibleBars,
  onVisibleBarsChange,
  maxVisibleBars,
  onPanReset,
}: Props) {
  // Slider starts at the 3M mark — the tightest *named* range — not the
  // MIN_VISIBLE_BARS zoom-in floor (the wheel can still zoom in below 3M; the
  // slider thumb just pins to its left edge there). On a degenerately narrow
  // screen where even 3M exceeds the cap, fall back so min never overshoots max.
  const max = Math.max(MIN_VISIBLE_BARS, maxVisibleBars);
  const min = Math.min(RANGE_DAYS['3M'], max);
  const value = Math.max(min, Math.min(visibleBars, max));

  const logMin = Math.log(min);
  const logMax = Math.log(max);
  const logSpan = logMax - logMin;

  // Reachable marks only (D4): a range mark renders iff its bar count fits the cap.
  const marks = RANGES.map((key) => ({ key, bars: RANGE_DAYS[key] })).filter(
    (m) => m.bars >= min && m.bars <= max,
  );
  // Log position along the track (0..100%); guards the degenerate min===max track.
  const pct = (bars: number) =>
    logSpan > 0 ? ((Math.log(bars) - logMin) / logSpan) * 100 : 0;

  const commit = (bars: number) => {
    const next = Math.max(min, Math.min(bars, max));
    onVisibleBarsChange(next);
    // Snapped onto a mark → reset pan to latest (like the old pills).
    if (marks.some((m) => m.bars === next)) onPanReset?.();
  };

  return (
    <div className={styles.zoomSlider}>
      <input
        type="range"
        min={logMin}
        max={logMax}
        step="any"
        value={Math.log(value)}
        onChange={(e) => commit(Math.round(Math.exp(Number(e.target.value))))}
        aria-label="Zoom (visible range)"
      />
      <div className={styles.marks}>
        {marks.map((m) => (
          <button
            key={m.key}
            type="button"
            className={styles.mark}
            style={{ left: `${pct(m.bars)}%` }}
            onClick={() => commit(m.bars)}
          >
            {m.key}
          </button>
        ))}
      </div>
    </div>
  );
}
