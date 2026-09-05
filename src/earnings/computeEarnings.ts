// Pure, React-free math for the corner-pinned "Quarterly Earnings" table. Takes
// the sparse per-symbol quarterly rows (the same feed the Results subpane reads)
// plus the published free-float %, and bakes every cell — text + colour level —
// so the panel only maps a level to a CSS class.
//
// Cell colouring is a faithful port of the third-party Pine box (© jeswinjoy);
// only the per-quarter SCORE was reworked into the 3-state rule below. The change
// columns are honestly labelled "YoY": the math compares to the quarter ~one year
// back (the ±40-day match `computeYoYGrowth` already does), not the prior quarter.

import type { QuarterlyResult } from '../types';
import type { StatsLevel } from '../stats/computeStats';
import {
  computeYoYGrowth,
  yearAgoIndex,
} from '../indicators/builtins/quarterlyResults';
import type { EarningsCell, EarningsRow, EarningsViewModel } from './types';

// --- Score tuning (all named + at the top so the rule is easy to retune) ------

// Below these year-ago LEVELS a growth % is unreliable (a tiny base explodes any
// ratio), so the score judges on the current level instead — the "base guard".
const EPS_BASE_FLOOR = 0.5; // ₹
const RPS_BASE_FLOOR = 1.0; // ₹

// On a usable base, an EPS falling this far year-over-year is real deterioration.
const GROWTH_DETERIORATION = -25; // %

// The margin↔growth curve: GREEN if ANY tier clears. A fat-margin business needs
// only positive growth; a thin-margin one must be growing hard to earn a green.
const GREEN_TIERS: { margin: number; gEps: number; gRev: number }[] = [
  { margin: 20, gEps: 0, gRev: 0 },
  { margin: 10, gEps: 10, gRev: 10 },
  { margin: 5, gEps: 25, gRev: 25 },
  { margin: 0, gEps: 40, gRev: 40 }, // thin-margin hyper-grower
];

// Base-guard GREEN: with no trustworthy year-ago level, only a fat margin earns green.
const BASE_GUARD_GREEN_MARGIN = 20; // %

const NEWEST_ROWS = 6; // quarters displayed (newest on top)

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const BLANK: EarningsCell = { text: '', level: 'muted' };

function num(x: number | undefined): number {
  return typeof x === 'number' && Number.isFinite(x) ? x : NaN;
}

/** Stored dates are the period-end month offset by +1 (first-of-next-month, see
 * the backend `_parse_result_month`), so the quarter's own month is one back:
 * "2026-04-01" → "Mar-26". */
function quarterLabel(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return iso;
  const d = new Date(t);
  let m = d.getUTCMonth() - 1;
  let y = d.getUTCFullYear();
  if (m < 0) {
    m = 11;
    y -= 1;
  }
  return `${MONTHS[m]}-${String(y % 100).padStart(2, '0')}`;
}

/** Pine f_formatNumber for the value cells: one decimal below 10, else integer,
 * no currency symbol (the box is compact). */
function fmtValue(v: number): string {
  return v < 10 ? v.toFixed(1) : String(Math.round(v));
}

/** EPS / revenue-per-share cell (Pine `fcell`): coloured against the trailing
 * four-quarter average — > 1.75× lime, > 1.25× green, else amber if positive,
 * red if ≤ 0. A non-finite trailing average (short history) reads as amber. */
function valueCell(values: number[], i: number): EarningsCell {
  const v = values[i];
  if (!Number.isFinite(v)) return BLANK;
  let sum = 0;
  let ok = true;
  for (let k = 1; k <= 4; k++) {
    const t = i - k >= 0 ? values[i - k] : NaN;
    if (!Number.isFinite(t)) {
      ok = false;
      break;
    }
    sum += t;
  }
  const trail = ok ? sum / 4 : NaN;
  const level: StatsLevel =
    v > 0
      ? v > trail * 1.75
        ? 'strong'
        : v > trail * 1.25
          ? 'up'
          : 'neutral'
      : 'down';
  return { text: fmtValue(v), level };
}

/** Net-margin cell (Pine `fcell2`, NPM%): ≤ 5 red, ≤ 12 amber, else green. */
function npmCell(v: number): EarningsCell {
  if (!Number.isFinite(v)) return BLANK;
  const level: StatsLevel = v <= 5 ? 'down' : v <= 12 ? 'neutral' : 'up';
  const text = (v < 10 ? v.toFixed(1) : String(Math.round(v))) + '%';
  return { text, level };
}

/** A year-over-year change cell (Pine `fyoy`). `level` is the current period's
 * own value (a ≤ 0 level forces red whatever the growth says). EPS/revenue:
 * > 25 green, > −5 amber, else red. Net-margin (`isNpm`): ≥ 0 green, else red. */
function yoyCell(dif: number, level: number, isNpm: boolean): EarningsCell {
  if (!Number.isFinite(dif)) return BLANK;
  let lvl: StatsLevel;
  if (level > 0) {
    lvl = isNpm
      ? dif >= 0
        ? 'up'
        : 'down'
      : dif > 25
        ? 'up'
        : dif > -5
          ? 'neutral'
          : 'down';
  } else {
    lvl = 'down';
  }
  const r = Math.round(dif);
  return { text: `${r >= 0 ? '+' : ''}${r}%`, level: lvl };
}

/** Free-float % (Pine top-left cell): > 60 amber, > 30 green, > 20 amber, else red. */
function freeFloatCell(ff: number | undefined): EarningsCell {
  if (ff == null || !Number.isFinite(ff)) return { text: '--', level: 'muted' };
  const level: StatsLevel =
    ff > 60 ? 'neutral' : ff > 30 ? 'up' : ff > 20 ? 'neutral' : 'down';
  const text = (ff < 10 ? ff.toFixed(1) : String(Math.round(ff))) + '%';
  return { text, level };
}

/** The improved 3-state per-quarter score (see the module header + tuning
 * constants). Red = a loss or a real year-over-year drop; green = the
 * margin↔growth curve clears; amber = everything positive but sub-threshold. */
function scoreCell(
  eps: number,
  rps: number,
  margin: number,
  gEps: number,
  gRev: number,
  epsBase: number,
  rpsBase: number,
): EarningsCell {
  const levelBad =
    !Number.isFinite(eps) || eps <= 0 || !Number.isFinite(rps) || rps <= 0;
  const marginKnown = Number.isFinite(margin);
  const baseUsable =
    Number.isFinite(epsBase) &&
    Number.isFinite(rpsBase) &&
    Math.abs(epsBase) >= EPS_BASE_FLOOR &&
    Math.abs(rpsBase) >= RPS_BASE_FLOOR;

  let level: StatsLevel;
  if (baseUsable) {
    if (levelBad || gEps < GROWTH_DETERIORATION) {
      level = 'down';
    } else if (
      marginKnown &&
      GREEN_TIERS.some(
        (t) => margin > t.margin && gEps > t.gEps && gRev > t.gRev,
      )
    ) {
      level = 'up';
    } else {
      level = 'neutral';
    }
  } else if (levelBad) {
    level = 'down';
  } else if (marginKnown && margin > BASE_GUARD_GREEN_MARGIN) {
    level = 'up';
  } else {
    level = 'neutral';
  }
  return { text: '●', level };
}

/**
 * Build the earnings box view-model from the (unsorted, unvalidated) quarterly
 * rows and the published free-float %. Owns every guard: garbage dates are
 * dropped, rows are sorted ascending, and the newest six are returned newest-
 * first. The four older quarters beyond the six still feed the trailing average
 * and the year-ago match.
 */
export function computeEarnings(
  results: readonly QuarterlyResult[] | undefined,
  freeFloatPercent: number | undefined,
): EarningsViewModel {
  const freeFloat = freeFloatCell(freeFloatPercent);
  const clean = (results ?? []).filter((r) =>
    Number.isFinite(new Date(r.date).getTime()),
  );
  const sorted = [...clean].sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0,
  );
  const n = sorted.length;
  if (n === 0) return { rows: [], freeFloat };

  const times = sorted.map((r) => new Date(r.date).getTime());
  const eps = sorted.map((r) => num(r.eps));
  const rps = sorted.map((r) => num(r.rps));
  const npm = sorted.map((r) => num(r.npm));
  const gEps = computeYoYGrowth(sorted, 'eps');
  const gRps = computeYoYGrowth(sorted, 'rps');
  // NPM year-over-year is computed inline (computeYoYGrowth handles only eps/rps
  // and its signature is frozen), using the very same year-ago match.
  const gNpm = new Float64Array(n).fill(NaN);
  for (let i = 0; i < n; i++) {
    const cur = npm[i];
    if (!Number.isFinite(cur)) continue;
    const j = yearAgoIndex(times, i);
    if (j < 0) continue;
    const base = npm[j];
    if (!Number.isFinite(base) || base === 0) continue;
    gNpm[i] = ((cur - base) / Math.abs(base)) * 100;
  }

  const rows: EarningsRow[] = [];
  for (let i = n - 1; i >= Math.max(0, n - NEWEST_ROWS); i--) {
    const j = yearAgoIndex(times, i);
    const epsBase = j >= 0 ? eps[j] : NaN;
    const rpsBase = j >= 0 ? rps[j] : NaN;
    rows.push({
      label: quarterLabel(sorted[i].date),
      cells: [
        valueCell(eps, i),
        yoyCell(gEps[i], eps[i], false),
        valueCell(rps, i),
        yoyCell(gRps[i], rps[i], false),
        npmCell(npm[i]),
        yoyCell(gNpm[i], npm[i], true),
        scoreCell(eps[i], rps[i], npm[i], gEps[i], gRps[i], epsBase, rpsBase),
      ],
    });
  }
  return { rows, freeFloat };
}
