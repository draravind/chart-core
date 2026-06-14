import type * as d3 from 'd3';
import type { Candle, QuarterlyResult } from '../types';
import type { StatsMarket } from '../stats/types';

// ---------------------------------------------------------------------------
// Pillar 3 — modular in-browser indicator framework.
//
// An indicator is a self-contained definition (compute + draw + warm-up +
// settings) registered once on import. Each def owns a free-form, typed
// `settings` blob (declared via `settingsSchema`) and reads its own colors /
// flags / modes from it in `compute`/`draw`/`domain`/`legend`. The framework
// persists settings as opaque deltas (`settingsOverrides`) and hands the
// effective merge back. The app instantiates `IndicatorConfig`s (one drawn
// entry = one parametrisation); Chart resolves each via the registry, computes
// its series over `concat(warmupSeed, data)`, slices back to the display
// window, and paints it on the canvas series layer.
// ---------------------------------------------------------------------------

/** One typed, user-editable setting. Drives both the popover control (kind →
 *  control type) and the static defaults (`defaultsFromSchema`). A `color`
 *  field's `default` is a CSS-var expression (`var(--rsi-line)`); a user
 *  override is raw hex — the framework resolves either to rgb via `resolveColor`
 *  at draw/legend time. */
export type SettingsFieldBase = { key: string; label: string };
export type SettingsField =
  | (SettingsFieldBase & { kind: 'color'; default: string })
  | (SettingsFieldBase & {
      kind: 'number';
      default: number;
      min?: number;
      max?: number;
      step?: number;
    })
  | (SettingsFieldBase & {
      kind: 'enum';
      default: number;
      options: { label: string; value: number }[];
    })
  | (SettingsFieldBase & { kind: 'toggle'; default: boolean })
  // A grouped line control (TradingView-style). The `key` is a PREFIX, not an
  // object slot: it EXPANDS (in `defaultsFromSchema`) into four ordinary scalar
  // settings keys — `${key}Color`, `${key}Width`, `${key}Style`, `${key}Opacity`
  // (`style` = index into `LINE_STYLE_OPTIONS`). Keeping storage scalar preserves
  // the shallow-spread `effectiveSettings`, EMA's per-period re-banding, and the
  // `'lineColor' in settingsOverrides` invariants.
  | (SettingsFieldBase & {
      kind: 'line';
      default: { color: string; width: number; style?: number; opacity?: number };
    });

/** One legend row: a color expr (resolved by the legend), a formatted live
 *  value (null/'' = no value cell), and an optional per-row label. */
export type LegendRow = {
  color: string;
  value: string | null;
  label?: string;
};

/**
 * Subpane scale SHAPE (replaces the old `SubpaneScaleHint` + `scaleHintFor`).
 * Bounded oscillators pin a `fixedDomain` (+ optional `guideLines`); unbounded
 * ones autofit, optionally forced symmetric about a `zeroLine` or extended to
 * span zero (`includeZero`). Which series drive the autofit is NOT here — that
 * is the def's single `autofitKeys`. This carries scale shape only.
 */
export type DomainSpec = {
  fixedDomain?: [number, number];
  guideLines?: number[];
  zeroLine?: boolean;
  autofitPadding?: number;
  /** Force the autofit domain to span zero (bars-from-zero panes). Ignored when
   *  `fixedDomain` wins. */
  includeZero?: boolean;
  /** Fixed pixel headroom reserved above the autofit max (so a label drawn on
   *  the tallest bar clears the pane's top border). Applied where the scale is
   *  built (pane pixel height is known there). Ignored when `fixedDomain` wins. */
  topPadPx?: number;
  /** Suppress the pane's right axis (a meaningless scale, e.g. the Results
   *  text-mode pane whose `fixedDomain` [0,1] carries no value semantics). */
  hideAxis?: boolean;
  /** Pane right-axis tick formatter (e.g. Volume's K/M/B). Absent → default. */
  tickFormat?: (value: number) => string;
};

/** Where the indicator draws — the price overlay, or a named subpane. */
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
  /** Sparse reported-period rows (quarterly/annual). Present only when an
   *  indicator that needs them (Results) is enabled; the def aligns each row to
   *  a bar itself. */
  quarterlyResults?: readonly QuarterlyResult[];
  /** Symbol market — drives currency formatting in defs that bake display
   *  strings at compute time (Results). Absent ⇒ def falls back to a default. */
  market?: StatsMarket;
  /** Index (into the warmup-prefixed arrays) at which the display window begins
   *  — i.e. `warmupSeed.length`. Lets a def scope display-only stats (Volume's
   *  HVE/HVY + cold-start SMA) to the rendered bars rather than the seeded
   *  prefix. Absent ⇒ defs treat the whole input as the display region. */
  displayStart?: number;
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
 * The unit of modularity. Every `S`-typed callback uses METHOD syntax (not an
 * arrow-typed property): under `strictFunctionTypes` an arrow property makes
 * `IndicatorDef<S>` unassignable to the erased `IndicatorDef` (TS2322); methods
 * are bivariance-exempt.
 */
export type IndicatorDef<S = Record<string, unknown>> = {
  /** Registry key, e.g. `ti:ema` / `highs`. */
  key: string;
  /** Compact label for the legend row + crosshair tooltips, e.g. `BBANDS`. */
  label: string;
  /** Full human name for the settings popover title, e.g. `Bollinger Bands`.
   *  Falls back to `label` when absent. */
  longLabel?: string;
  pane: 'price' | { subpane: string };
  /** Ordered editable settings. Drives the popover + the static defaults. */
  settingsSchema: SettingsField[];
  /** Param-dependent defaults layered under user overrides (e.g. EMA bands its
   *  line color from the period). Replaces the old `defaultLineColor`. */
  deriveDefaults?(s: S): Partial<S>;
  /** Older bars needed to seed the computation (drives the warm-up fetch). */
  warmupBars(s: S): number;
  /** Returns numeric series PLUS an optional non-numeric per-instance payload
   *  (`meta`) — the explicit lane for computed non-array data (e.g. Quarterly
   *  Results' formatted row strings). The framework slices only the
   *  `Float64Array`s back to the display window; `meta` threads through
   *  untouched to `draw`. A user SETTING never rides `meta`. */
  compute(input: IndicatorInput, s: S): { series: IndicatorSeries; meta?: unknown };
  /** Paint the indicator. `resolveColor` resolves a color-field expr (var() or
   *  raw hex) to rgb; `meta` is the per-instance compute payload. */
  draw(
    ctx: CanvasRenderingContext2D,
    series: IndicatorSeries,
    scale: IndicatorDrawScale,
    s: S,
    resolveColor: (expr: string) => string,
    meta?: unknown,
  ): void;
  /** Which of this def's series the scale autofits over — read by BOTH the
   *  subpane and price-pane scaling loops (replaces the old implicit
   *  `width !== 0` set). A fixed-domain oscillator may return `[]`. */
  autofitKeys?(s: S): string[];
  /** Subpane scale SHAPE only (fixed/guide/zero/pad/…); the framework computes
   *  lo/hi via `computeSubpaneDomain` + the pixel `topPadPx` math. Optional —
   *  absent ⇒ plain autofit. Price-pane defs omit it. */
  domain?(series: IndicatorSeries, s: S): DomainSpec | null;
  /** Live legend rows at the queried bar. `ctx.priceFmt` formats prices (price-
   *  pane overlays use it; subpane defs ignore it). Required. */
  legend(
    series: IndicatorSeries,
    idx: number,
    s: S,
    ctx: { priceFmt: (v: number) => string },
  ): LegendRow[];
  /** Short legend summary, e.g. "50" for EMA, "12,26,9" for MACD. */
  formatParams?(s: S): string;
  /** Default subpane height multiplier (1 when absent). */
  paneHeightFactor?: number;
};

/**
 * A resolved, app-supplied indicator instance. One per drawn entry.
 * `settings` is the effective merge (base → derived → overrides), read by
 * compute/draw/domain/legend; `settingsOverrides` is the ONLY persisted source
 * of truth (sparse deltas).
 */
export type IndicatorConfig = {
  id: string;
  defKey: string;
  label: string;
  enabled: boolean;
  settings: Record<string, unknown>;
  settingsOverrides: Record<string, unknown>;
};

/** What Chart publishes on `scaleApi.indicators` for the crosshair/autofit.
 *  `meta` is the per-instance compute payload threaded to `draw`. */
export type ResolvedIndicator = {
  config: IndicatorConfig;
  series: IndicatorSeries;
  meta?: unknown;
};
