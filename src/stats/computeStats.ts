// Pure, React-free port of the "Price stats" Pine table math. Reads the LATEST
// bar of the supplied (warmup+data) history and produces a small view-model the
// floating panel renders. The caller concatenates warmupSeed+data; this fn only
// reads the last index — `trueRange` self-seeds index 0 as NaN and `sma` skips
// the leading NaN, so the chain is correct at the right edge.

import type { Candle } from '../types';
import type { StatsMarket, StatsTableData } from './types';
import { toColumns } from '../utils/toColumns';
import { trueRange, sma, round2 } from '../indicators/talibMath';

// 'text' = default primary text (sector/industry/PE/values with no threshold).
// 'muted' = dim secondary (header labels, blanked cells). The four threshold
// bands (strong/up/neutral/down) carry the Pine color semantics.
export type StatsLevel = 'strong' | 'up' | 'neutral' | 'down' | 'text' | 'muted';

export type StatsCell = { text: string; level: StatsLevel };

// A merged row spans all columns (Pine merge_cells); a cells row holds up to 3.
export type StatsRow =
  | { kind: 'merged'; cell: StatsCell }
  | { kind: 'cells'; cells: StatsCell[] };

export type StatsViewModel = { rows: StatsRow[] };

const EMPTY: StatsCell = { text: '', level: 'muted' };

/** Pine f_formatNumber: < 10 → one decimal, else rounded to an integer. */
function formatNumber(v: number): string {
  return v < 10 ? v.toFixed(1) : String(Math.round(v));
}

/** Finite, non-zero share count (Pine na/nz guard); else null → blank cell. */
function validShare(x: number | undefined): number | null {
  return typeof x === 'number' && Number.isFinite(x) && x !== 0 ? x : null;
}

/** ATR threshold bands (on the FULL ATR value, not the halved display value). */
function atrLevel(atr: number): StatsLevel {
  return atr > 5 ? 'strong' : atr > 4 ? 'up' : atr > 3 ? 'neutral' : 'down';
}

function atrCell(series: Float64Array): StatsCell {
  const v = series.length ? series[series.length - 1] : NaN;
  const atr = v * 100;
  // Non-finite covers both the short-history NaN warm-up and the ±Infinity a
  // zero close injects into the normalized-TR chain — blank the cell for both.
  if (!Number.isFinite(atr)) return EMPTY;
  return { text: `${formatNumber(atr * 0.5)} %`, level: atrLevel(atr) };
}

/**
 * Latest-bar stats view-model. `combinedBars` is warmupSeed+data (caller-built);
 * fundamentals come from `statsTable`; `market` drives Mkt-Cap units/thresholds.
 */
export function computeStats(
  combinedBars: readonly Candle[],
  statsTable: StatsTableData | undefined,
  market: StatsMarket,
): StatsViewModel {
  const n = combinedBars.length;
  if (n === 0) return { rows: [] };

  const { h, l, c } = toColumns(combinedBars);
  const closeLast = c[n - 1];
  // Pine: market cap uses the PRIOR close (Close[1]); PE uses the current close.
  const closePrev = n >= 2 ? c[n - 2] : c[n - 1];

  // ATR rows: normalized true range (ta.atr(1)/close), then SMA over the windows.
  const tr = trueRange(h, l, c);
  const trNorm = new Float64Array(n);
  for (let i = 0; i < n; i++) trNorm[i] = tr[i] / c[i];
  const atr1 = atrCell(sma(trNorm, 125)); // ATR 6M
  const atr2 = atrCell(sma(trNorm, 63)); // ATR 3M
  const atr3 = atrCell(sma(trNorm, 21)); // ATR 1M

  const t = statsTable ?? {};
  const sector = (t.sector ?? '').trim();
  const industry = (t.industry ?? '').trim();
  const so = validShare(t.sharesOutstanding);
  const ffPct = validShare(t.freeFloatPercent);

  // Free Float % — app supplies the published percentage directly; library only
  // formats it + applies the color bands. A 0/NaN % blanks the cell.
  let ffCell: StatsCell = EMPTY;
  if (ffPct !== null) {
    const level: StatsLevel =
      ffPct >= 60
        ? 'neutral'
        : ffPct >= 30
          ? 'up'
          : ffPct >= 20
            ? 'neutral'
            : 'down';
    ffCell = { text: `${formatNumber(ffPct)} %`, level };
  }

  // Market cap — units & thresholds differ by market; uses the PRIOR close.
  let mcCell: StatsCell = EMPTY;
  if (so !== null) {
    if (market === 'US') {
      const mc = (so * closePrev) / 1e6;
      if (mc !== 0 && Number.isFinite(mc)) {
        const text =
          mc > 1000 ? `${formatNumber(mc / 1000)} B` : `${formatNumber(mc)} M`;
        const level: StatsLevel = mc >= 2000 ? 'up' : mc >= 250 ? 'neutral' : 'down';
        mcCell = { text, level };
      }
    } else {
      const mc = (so * closePrev) / 1e10;
      if (mc !== 0 && Number.isFinite(mc)) {
        const level: StatsLevel = mc >= 5 ? 'up' : mc >= 1 ? 'neutral' : 'down';
        mcCell = { text: `${formatNumber(mc)} K`, level };
      }
    }
  }

  // PE — current close / round2(eps). Pine rounds EPS to 2dp BEFORE dividing;
  // eps rounds-to-0 → blank (divide-by-zero), negative EPS → negative PE kept.
  let peCell: StatsCell = EMPTY;
  if (typeof t.eps === 'number' && Number.isFinite(t.eps)) {
    const epsR = round2(t.eps);
    if (epsR !== 0) {
      const pe = Math.round((closeLast / epsR) * 10) / 10;
      peCell = { text: String(pe), level: 'text' };
    }
  }

  const hasFundamentals =
    sector !== '' ||
    industry !== '' ||
    mcCell.text !== '' ||
    ffCell.text !== '' ||
    peCell.text !== '';

  const rows: StatsRow[] = [];
  if (hasFundamentals) {
    rows.push({ kind: 'merged', cell: { text: sector, level: 'text' } });
    rows.push({ kind: 'merged', cell: { text: industry, level: 'text' } });
    rows.push({
      kind: 'cells',
      cells: [
        { text: 'Mkt Cap', level: 'muted' },
        { text: 'Free Float', level: 'muted' },
        { text: 'PE Ratio', level: 'muted' },
      ],
    });
    rows.push({ kind: 'cells', cells: [mcCell, ffCell, peCell] });
  }

  rows.push({
    kind: 'cells',
    cells: [
      { text: 'ATR 6M', level: 'muted' },
      { text: 'ATR 3M', level: 'muted' },
      { text: 'ATR 1M', level: 'muted' },
    ],
  });
  rows.push({ kind: 'cells', cells: [atr1, atr2, atr3] });

  return { rows };
}
