import type * as d3 from 'd3';
import type { Candle } from '../types';

// ---------------------------------------------------------------------------
// Pillar 3 — modular in-browser indicator framework.
//
// An indicator is a self-contained definition (compute + draw + warm-up + style)
// registered once on import. The app instantiates `IndicatorConfig`s (one drawn
// entry = one parametrisation) and Chart resolves each via the registry,
// computes its series over `concat(warmupSeed, data)`, slices back to the
// display window, and paints it on the canvas series layer.
// ---------------------------------------------------------------------------

/** Where the indicator draws. Only the price overlay is implemented today. */
export type IndicatorPane = 'price' | { subpane: string };

/** One Float64Array per drawn line. NaN marks a gap (no value at that bar). */
export type IndicatorSeries = Record<string, Float64Array>;

/** OHLCV columns + the source bars, fed to `compute`. */
export type IndicatorInput = {
  o: Float64Array;
  h: Float64Array;
  l: Float64Array;
  c: Float64Array;
  v: Float64Array;
  /** The source bars (length matches the arrays); data-backed defs read columns off these. */
  bars: readonly Candle[];
  /** Benchmark close, date-aligned to `bars`. Present only when an indicator that
   *  needs it (RS line) is enabled. `ema`/`highs` ignore it. */
  benchmarkClose?: Float64Array;
};

/**
 * Style for one drawn line. `seriesKey` matches a key in the def's
 * `IndicatorSeries`; `colorVar`/`labelColorVar` are CSS-var expressions resolved
 * to rgb at draw time (canvas cannot consume CSS vars directly).
 */
export type IndicatorLineStyle = {
  seriesKey: string;
  /** Line color, e.g. `var(--ema-50)`. */
  colorVar: string;
  /** Tooltip value color, e.g. `var(--chart-ema-50-label)`. */
  labelColorVar: string;
  /** Tooltip label for this line, e.g. `EMA 50` or `1Y`. */
  label: string;
  width: number;
  dash?: number[] | null;
  opacity?: number;
};

export type IndicatorStyle = {
  /** Ordered list of drawn lines (one for EMA, four for highs). */
  lines: IndicatorLineStyle[];
  /** Configs sharing a `tooltipGroup` render on the same crosshair row. */
  tooltipGroup: string;
  /** Optional row title rendered once at the start of the group (e.g. `Highs`). */
  tooltipTitle?: string;
};

/** Resolved (rgb) per-line style handed to `IndicatorDef.draw`. */
export type ResolvedLineStyle = {
  seriesKey: string;
  color: string;
  width: number;
  dash?: number[] | null;
  opacity?: number;
};

/** Geometry + source bars handed to `IndicatorDef.draw`. */
export type IndicatorDrawScale = {
  xScale: d3.ScaleBand<number>;
  yPrice: d3.ScaleLogarithmic<number, number>; // kept for price-pane readers
  /** Per-indicator value→pixel projection (price log scale or a subpane scale). */
  y: (value: number) => number;
  bandwidth: number;
  /** Display-window bars (aligned to the indicator series). */
  data: readonly Candle[];
  /** Render window into `data` (buffered visible slice). */
  renderStart: number;
  renderEnd: number;
};

export type IndicatorDef<P = Record<string, unknown>> = {
  /** Registry key, e.g. `ema` / `highs`. */
  key: string;
  label: string;
  pane: IndicatorPane;
  defaultParams: P;
  /** Older bars needed to seed the computation (drives the warm-up fetch). */
  warmupBars(params: P): number;
  compute(input: IndicatorInput, params: P): IndicatorSeries;
  draw(
    ctx: CanvasRenderingContext2D,
    series: IndicatorSeries,
    scale: IndicatorDrawScale,
    style: ResolvedLineStyle[],
  ): void;
  defaultStyle: IndicatorStyle;
};

/**
 * A resolved, app-supplied indicator instance. One per drawn entry — four EMA
 * configs (one line each) + one highs config (four lines). `useChartSettings`
 * produces these from its persisted per-key booleans.
 */
export type IndicatorConfig = {
  id: string;
  defKey: string;
  params: Record<string, unknown>;
  label: string;
  enabled: boolean;
  style: IndicatorStyle;
};

/** What Chart publishes on `scaleApi.indicators` for the crosshair/autofit. */
export type ResolvedIndicator = {
  config: IndicatorConfig;
  series: IndicatorSeries;
};
