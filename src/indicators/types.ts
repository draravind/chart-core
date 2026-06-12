import type * as d3 from 'd3';
import type { Candle, QuarterlyResult } from '../types';
import type { StatsMarket } from '../stats/types';

// ---------------------------------------------------------------------------
// Pillar 3 — modular in-browser indicator framework.
//
// An indicator is a self-contained definition (compute + draw + warm-up + style)
// registered once on import. The app instantiates `IndicatorConfig`s (one drawn
// entry = one parametrisation) and Chart resolves each via the registry,
// computes its series over `concat(warmupSeed, data)`, slices back to the
// display window, and paints it on the canvas series layer.
// ---------------------------------------------------------------------------

/**
 * Per-subpane scale hint. Bounded oscillators pin a `fixedDomain` (+ optional
 * `guideLines` at notable levels); unbounded ones autofit over their drawn
 * series, optionally forced symmetric about a `zeroLine`. `autofitPadding` is a
 * fractional pad applied to an autofit domain (default 8%).
 */
export type SubpaneScaleHint = {
  fixedDomain?: [number, number];
  guideLines?: number[];
  zeroLine?: boolean;
  autofitPadding?: number;
  /** Suppress the pane's right axis (a meaningless scale, e.g. the Results
   *  text-mode pane whose `fixedDomain` [0,1] carries no value semantics). */
  hideAxis?: boolean;
  /** Force the autofit domain to span zero (bars-from-zero panes), so bars
   *  always rest on a visible zero crossing. Ignored when `fixedDomain` wins. */
  includeZero?: boolean;
  /** Fixed pixel headroom reserved above the autofit max (so a label drawn on
   *  the tallest bar clears the pane's top border). Unlike `autofitPadding` —
   *  a fraction of the domain that scales with pane height — this is a constant
   *  number of pixels regardless of pane size. Applied where the scale is built
   *  (pane pixel height is known there). Ignored when `fixedDomain` wins. */
  topPadPx?: number;
};

/**
 * Where the indicator draws — the price overlay, or a named subpane. A subpane
 * indicator may carry a `scaleHint` describing how its pane scales (fixed vs.
 * autofit, guide lines, zero line).
 */
export type IndicatorPane =
  | 'price'
  | { subpane: string; scaleHint?: SubpaneScaleHint };

/** One Float64Array per drawn line. NaN marks a gap (no value at that bar). */
export type IndicatorSeries = Record<string, Float64Array>;

/** Sparse per-line color override: seriesKey → raw hex. Persisted source of truth. */
export type ColorOverrides = Record<string, string>;

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
  /** Sparse reported-period rows (quarterly/annual). Present only when an
   *  indicator that needs them (Results) is enabled; the def aligns each row to
   *  a bar itself. */
  quarterlyResults?: readonly QuarterlyResult[];
  /** Symbol market — drives currency formatting in defs that bake display
   *  strings at compute time (Results). Absent ⇒ def falls back to a default. */
  market?: StatsMarket;
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
  /** Pixel bounds of the pane being drawn into (top < bottom). Lets a subpane
   *  draw lay out text rows + clip to its band. Present for every pane. */
  paneTop?: number;
  paneBottom?: number;
};

/**
 * One user-editable param, driving a control in the legend popover. `number`
 * renders an `<input type="number">` (optional min/max/step); `enum` renders a
 * `<select>` over `options` (display label + numeric value).
 */
export type ParamSpec =
  | {
      key: string;
      label: string;
      kind: 'number';
      min?: number;
      max?: number;
      step?: number;
    }
  | {
      key: string;
      label: string;
      kind: 'enum';
      options: { label: string; value: number }[];
    };

export type IndicatorDef<P = Record<string, unknown>> = {
  /** Registry key, e.g. `ema` / `highs`. */
  key: string;
  /** Compact label for the legend row + crosshair tooltips, e.g. `BBANDS`. */
  label: string;
  /** Full human name for the param popover title, e.g. `Bollinger Bands`.
   *  Falls back to `label` when absent. */
  longLabel?: string;
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
  /** Params-aware override of the static `pane.scaleHint` — used when the hint
   *  must switch with a param (e.g. Results' `display` enum picks a text vs.
   *  bars pane). Returns `undefined` to fall through to `pane.scaleHint`.
   *  MUST be declared with method syntax, not an arrow-typed property: under
   *  `strictFunctionTypes` an arrow property makes `IndicatorDef<P>` unassignable
   *  to the erased `IndicatorDef` (TS2322); methods are bivariance-exempt. Same
   *  constraint as `formatParams` above. */
  scaleHintFor?(params: P): SubpaneScaleHint | undefined;
  /** Default subpane height multiplier (1 when absent). A def whose layout needs
   *  more vertical room (Results' five-row text ≈1.7×) declares it here; the user
   *  can still override via divider drag. When several defs share a pane, the max
   *  factor wins. */
  paneHeightFactor?: number;
  /** Optional params-aware factory color for a line. Returns only the colors it
   *  wants to vary (e.g. EMA bands its one `ema` line by period); width/dash/label
   *  stay in `defaultStyle`. `undefined` → fall through to `defaultStyle` colors.
   *  Layered under any user override in `defaultConfigFor`. */
  defaultLineColor?(
    params: P,
    seriesKey: string,
  ): { colorVar: string; labelColorVar: string } | undefined;
  /** Short legend summary, e.g. "50" for EMA, "12,26,9" for MACD. Declared as a
   *  method (not an arrow property) so `IndicatorDef<P>` stays assignable to the
   *  erased `IndicatorDef` — matching `compute`/`warmupBars`. */
  formatParams?(params: P): string;
  /** Ordered editable params. The popover renders one control per entry (kind →
   *  control type). Params absent here are not user-editable (stay at default,
   *  never shown) — this subsumes any need for a `hiddenParams` field. */
  paramSpecs?: ParamSpec[];
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
  /** Sparse per-line color overrides (seriesKey → raw hex). The persisted source
   *  of truth; `style.lines[].colorVar/labelColorVar` are recomputed from it. */
  colorOverrides?: ColorOverrides;
};

/** What Chart publishes on `scaleApi.indicators` for the crosshair/autofit. */
export type ResolvedIndicator = {
  config: IndicatorConfig;
  series: IndicatorSeries;
};
