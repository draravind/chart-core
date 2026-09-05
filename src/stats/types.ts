// Public contract for the floating "Price Stats" panel — a latest-bar snapshot
// of per-symbol fundamentals (app-supplied) + price-derived ATR rows.

export type StatsMarket = 'India' | 'US';

/**
 * Raw, app-owned financials for the symbol. All optional — absent/invalid inputs
 * blank the dependent cell; if every fundamental is absent the panel collapses to
 * an ATR-only view. The library does the close-dependent math + market formatting.
 */
export type StatsTableData = {
  sector?: string;
  industry?: string;
  sharesOutstanding?: number;
  /** Pre-computed free-float % (e.g. 45.09). The panel formats + color-bands it
   * directly — the library no longer derives the ratio from a raw share count. */
  freeFloatPercent?: number;
  eps?: number;
};

/** Anchored placement in the main price pane. ax/ay ∈ {0,0.5,1}; dx/dy fixed px.
 *  `v` is the stored-shape version; the reader dispatches on it, never on keys. */
export type StatsPosition = { v: 2; ax: number; ay: number; dx: number; dy: number };
/** Pre-anchor persisted shape (pixels from frame top-left). Read + migrated, never written. */
export type LegacyStatsPosition = { x: number; y: number };
export type StatsPaneRect = { left: number; top: number; width: number; height: number };

export type StatsSize = 'tiny' | 'small' | 'normal' | 'large';
