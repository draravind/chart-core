import type * as d3 from 'd3';
import type { ResolvedIndicator } from './indicators/types';

// Plan A shape — identical to the app's `EodBar` (services/api.ts), including the
// optional indicator columns, so `EodBar[]` flows into `Chart`'s `data: Candle[]`
// by structural compatibility with no rename and no cross-package import.
//
// Plan B: EMAs now compute in-browser, so the `ema*` columns are DEAD (kept on
// the type for read-tolerance until the backend follow-up drops them). The
// `high*` columns stay live — the rolling-highs indicator is data-backed and
// reads them off each bar.
export type Candle = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  ema10?: number;
  ema20?: number;
  ema50?: number;
  ema200?: number;
  high1y?: number;
  high2y?: number;
  high3y?: number;
  highAll?: number;
};

/** One reported fiscal period (quarterly or annual cadence). */
export type QuarterlyResult = {
  label: string; // e.g. "Q3 FY25" / "FY25"
  date: string; // 'YYYY-MM-DD' period end
  eps?: number; // earnings per share, ccy/share
  rps?: number; // revenue per share, ccy/share
};

export type ChartType = 'candlestick' | 'bar';

export type AutoFitMode = 'price' | 'priceAndOverlays';

export type RangeKey = '3M' | '6M' | '1Y';
export const RANGES: RangeKey[] = ['3M', '6M', '1Y'];

// The published, app-readable scale/geometry API — today's `HandlerState`
// (StockChart.tsx) plus a reason-tagged subscriber list. The object identity is
// stable for a Chart instance; fields are mutated in place each time geometry is
// rebuilt. Plugins read fields on demand and subscribe for change notifications.
export type ChartScaleReason = 'pan' | 'rescale';

export type ChartScaleApi = {
  data: Candle[];
  xScale: d3.ScaleBand<number>;
  yPrice: d3.ScaleLogarithmic<number, number>;
  // Per-subpane linear y-scales, keyed by subpane name ('rs', 'rsi', 'macd', …).
  // Each scale's range encodes its band geometry. Empty when no subpane
  // indicator is active.
  subpaneScales: Map<string, d3.ScaleLinear<number, number>>;
  // Deprecated back-compat alias: the 'rs' subpane scale (or null). Prefer
  // `subpaneScales`. Implemented as a getter over `subpaneScales`.
  readonly ySub?: d3.ScaleLinear<number, number> | null;
  step: number;
  bandwidth: number;
  baseTranslateX: number;
  priceHeight: number;
  width: number;
  visibleBars: number;
  visibleBarsInt: number;
  visibleStartIdx: number;
  dataLength: number;
  // Resolved in-browser indicators (config + computed series, aligned to
  // `data`). The crosshair + autofit read these; overlay plugins do not.
  indicators: ResolvedIndicator[];
  // 'pan'     -> high-frequency translate; plugin calls overlay.setTransform only.
  // 'rescale' -> geometry rebuilt; plugin calls overlay.updateScales (full positionAll).
  // The 'pan' notification fires SYNCHRONOUSLY inside the pan rAF so the plugin's
  // setTransform lands in the same frame as the chartGroup translate.
  subscribe(cb: (api: ChartScaleApi, reason: ChartScaleReason) => void): () => void;
};
