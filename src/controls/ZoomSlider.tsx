import {
  DEFAULT_RANGE_MARKS,
  MIN_VISIBLE_BARS,
  RANGE_DAYS,
  type RangeMark,
} from '../utils/chartCalculations';
import styles from './ZoomSlider.module.css';

type Props = {
  visibleBars: number;
  onVisibleBarsChange: (n: number) => void;
  // Readability-derived cap surfaced by Chart's onMaxVisibleBarsChange. Bounds
  // the slider's max and decides which range marks render (D4: only reachable
  // marks appear — no greyed/disabled marks).
  maxVisibleBars: number;
  // The named-range ladder in BAR counts, derived from the series' own cadence
  // and surfaced by Chart's onRangeMarksChange. Defaults to the legacy daily
  // ladder so consumers that don't plumb it through are unaffected.
  marks?: readonly RangeMark[];
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
  marks: marksProp,
  onPanReset,
}: Props) {
  const max = Math.max(MIN_VISIBLE_BARS, maxVisibleBars);
  // Reachable marks only (D4): a range mark renders iff its bar count fits the cap.
  const marks = (marksProp ?? DEFAULT_RANGE_MARKS).filter((m) => m.bars <= max);
  // Slider starts at the TIGHTEST reachable named range — not the
  // MIN_VISIBLE_BARS zoom-in floor (the wheel can still zoom in below it; the
  // slider thumb just pins to its left edge there). Derived from the marks, not
  // a daily constant: on a weekly series the tightest mark is 1Y ≈ 52 bars, and
  // a hardcoded 66 would both pin the left end at 66 *weeks* and filter that
  // mark out. On a degenerately narrow screen where no mark fits, fall back so
  // min never overshoots max.
  const min = marks.length
    ? Math.min(...marks.map((m) => m.bars))
    : Math.min(RANGE_DAYS['3M'], max);
  const value = Math.max(min, Math.min(visibleBars, max));

  const logMin = Math.log(min);
  const logMax = Math.log(max);
  const logSpan = logMax - logMin;
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
