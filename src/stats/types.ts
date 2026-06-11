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

/** Free-drag placement: pixels from the chart-wrapper's top-left. */
export type StatsPosition = { x: number; y: number };

export type StatsSize = 'tiny' | 'small' | 'normal' | 'large';
