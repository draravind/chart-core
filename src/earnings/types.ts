// Public contract for the corner-pinned "Quarterly Earnings" table — the last
// six reported quarters, each with EPS, revenue-per-share and net margin, each
// of those with its year-over-year change, plus a per-quarter score dot. The box
// reuses the Price-Stats panel's anchor/drag machinery, so its placement types
// are the very same ones (`../stats/types`).

import type { StatsLevel } from '../stats/computeStats';

export type { StatsPosition, StatsPaneRect, StatsSize } from '../stats/types';

/** One baked cell — text + a colour level mapped to the shared `--stats-*`
 * tokens. Level is the union the Price-Stats panel already uses. */
export type EarningsCell = { text: string; level: StatsLevel };

/** One displayed quarter. `label` is the col-0 body (e.g. "Mar-26"); `cells`
 * are columns 1-7 in order: EPS, EPS-YoY, RPS, RPS-YoY, NPM, NPM-YoY, Score. */
export type EarningsRow = { label: string; cells: EarningsCell[] };

/** The rendered box: the six data rows plus the top-left free-float % cell. An
 * empty `rows` means nothing resolved — the panel draws nothing. */
export type EarningsViewModel = { rows: EarningsRow[]; freeFloat: EarningsCell };
