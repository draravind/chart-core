// ---------------------------------------------------------------------------
// X-axis time-tick selection — the model every serious trading chart uses
// (TradingView / Highcharts / ECharts / d3-time), extracted pure so the cadence
// ladder + contextual labelling can be node-tested without a DOM.
//
// The old approach placed a tick at EVERY month boundary and, if any two were
// closer than a threshold, threw away all month labels and fell back to bare
// years. Calendar boundaries are NOT evenly spaced in bar-index (19–23 trading
// days a month, and the current partial month has just 1–2), so that `.some()`
// check tripped on the edge partial month and collapsed the whole axis to
// "2025 2026".
//
// Instead: pick ONE uniform cadence (day → week → month → quarter → half-year →
// year → 2y/5y/10y) whose TYPICAL on-screen spacing clears the label width, place
// ticks at that cadence's calendar boundaries, then greedily drop any single
// label that would still collide. One contextual formatter promotes each tick to
// the coarsest unit it starts — day → month name at a month start → year at
// January — giving the familiar one-row "… Nov Dec 2026 Feb …" axis with no
// all-or-nothing fallback.
// ---------------------------------------------------------------------------

export type TimeTick = { index: number; label: string };

const MONTH_ABBR = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// Days since the UTC epoch for a 'YYYY-MM-DD' date string. Used only to bucket
// weeks; month/year/day come from string prefixes so there is no timezone skew
// (`new Date('2026-01-01')` + local formatting would render Dec 31 west of UTC).
function dayNumber(dateStr: string): number {
  return Math.floor(Date.parse(dateStr) / 86_400_000);
}
// Monday-based week bucket (1970-01-01 is a Thursday, hence the +3).
function weekBucket(dateStr: string): number {
  return Math.floor((dayNumber(dateStr) + 3) / 7);
}

function median(xs: number[]): number {
  if (xs.length === 0) return Infinity;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * Contextual label for the bar at `i`: the year at a January/year start, the
 * month name at a month start (with the year appended on the FIRST visible tick
 * so the axis is always anchored to a year), otherwise the day of month.
 */
export function labelForTick(
  dateAt: (i: number) => string,
  i: number,
  isFirst: boolean,
): string {
  const s = dateAt(i);
  const prev = i > 0 ? dateAt(i - 1) : undefined;
  const year = s.slice(0, 4);
  const month = MONTH_ABBR[+s.slice(5, 7) - 1] ?? '';
  const day = +s.slice(8, 10);
  const yearStart = !prev || s.slice(0, 4) !== prev.slice(0, 4);
  const monthStart = !prev || s.slice(0, 7) !== prev.slice(0, 7);
  if (yearStart) return year;
  if (monthStart) return isFirst ? `${month} ${year}` : month;
  return isFirst ? `${month} ${day}` : String(day);
}

/**
 * Choose x-axis ticks as indices into the bar series. `dateAt(i)` yields the
 * i-th bar's date string; ticks are scanned over [from, to); `step` is pixels
 * per bar and `minGapPx` the closest two labels may sit.
 */
export function chooseTimeTicks(params: {
  dateAt: (i: number) => string;
  from: number;
  to: number;
  step: number;
  minGapPx: number;
}): TimeTick[] {
  const { dateAt, from, to, step, minGapPx } = params;
  const start = Math.max(1, from);
  const end = to;
  if (end <= start || step <= 0) return [];
  const minGapBars = minGapPx / step;

  const monthNum = (i: number) => +dateAt(i).slice(5, 7);
  const yearNum = (i: number) => +dateAt(i).slice(0, 4);
  const newMonth = (i: number) => dateAt(i).slice(0, 7) !== dateAt(i - 1).slice(0, 7);
  const newYear = (i: number) => dateAt(i).slice(0, 4) !== dateAt(i - 1).slice(0, 4);
  const newWeek = (i: number) => weekBucket(dateAt(i)) !== weekBucket(dateAt(i - 1));

  const collect = (pred: (i: number) => boolean): number[] => {
    const out: number[] = [];
    for (let i = start; i < end; i++) if (pred(i)) out.push(i);
    return out;
  };

  // Cadence ladder, finest → coarsest.
  const cadences: Array<() => number[]> = [
    () => {
      const o: number[] = [];
      for (let i = start; i < end; i++) o.push(i);
      return o;
    }, // every bar
    () => collect(newWeek),
    () => collect(newMonth),
    () => collect((i) => newMonth(i) && (monthNum(i) - 1) % 3 === 0), // quarter
    () => collect((i) => newMonth(i) && (monthNum(i) === 1 || monthNum(i) === 7)), // half-year
    () => collect(newYear),
    () => collect((i) => newYear(i) && yearNum(i) % 2 === 0),
    () => collect((i) => newYear(i) && yearNum(i) % 5 === 0),
    () => collect((i) => newYear(i) && yearNum(i) % 10 === 0),
  ];

  // Pick the finest cadence whose TYPICAL (median) gap clears the label width.
  // Median, not min, is what stops one short edge month from disqualifying an
  // otherwise-roomy monthly axis; the stray tight pair is handled by the thin
  // pass below.
  let chosen: number[] = [];
  for (const gen of cadences) {
    chosen = gen();
    const gaps: number[] = [];
    for (let k = 1; k < chosen.length; k++) gaps.push(chosen[k] - chosen[k - 1]);
    if (median(gaps) >= minGapBars || chosen.length <= 1) break;
  }

  // Per-label overlap thinning (ECharts `hideOverlap` style): keep a tick only if
  // it clears the last kept one. This is what drops the 1-bar current month at the
  // edge instead of nuking every month label.
  const kept: number[] = [];
  for (const v of chosen) {
    const last = kept[kept.length - 1];
    if (last === undefined || v - last >= minGapBars) kept.push(v);
  }

  return kept.map((i, k) => ({ index: i, label: labelForTick(dateAt, i, k === 0) }));
}
