// ---------------------------------------------------------------------------
// Chart appearance config — the global, user-editable visual contract.
//
// Mirrors the indicator framework's controlled-prop + sparse-delta model: the
// app holds an `AppearanceOverrides` (a recursively-optional `DeepPartial`),
// persists it via `onAppearanceChange`, and Chart resolves the effective merge
// over `APPEARANCE_DEFAULTS` via `effectiveAppearance` (see ./registry).
//
// Color tokens flow through `colors` (a flat `cssVar → value` map) which Chart
// injects as inline CSS custom properties on the chart wrapper — so any canvas
// or SVG element already reading a `var(--chart-*)` picks them up with ZERO
// draw-code changes. Genuine non-color scalars (gradient stops, axis opacity,
// tick size, crosshair dash, wick width) are threaded explicitly into draw code.
// ---------------------------------------------------------------------------

/** Recursively-optional — the shape of a sparse persisted delta. */
export type DeepPartial<T> = T extends (infer U)[]
  ? DeepPartial<U>[]
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;

/** Fields common to every pattern's label chip. */
export type LabelStyle = {
  labelBg: string;
  labelBgOpacity: number;
  /** The chip TEXT color (the label STRING itself is computed content). */
  labelTextColor: string;
  labelFontSize: number;
};

/** base_breakout: resistance line + breakout dot + on-line stat text + label. */
export type BaseBreakoutStyle = LabelStyle & {
  lineColor: string;
  lineWidth: number;
  lineOpacity: number;
  lineDash: string;
  statColor: string;
  dotFill: string;
};

/** consolidation: shaded range box + label. */
export type ConsolidationStyle = LabelStyle & {
  boxFill: string;
  boxFillOpacity: number;
};

/** high_tight_flag: pole diagonal + flag box + label. */
export type HighTightFlagStyle = LabelStyle & {
  poleColor: string;
  poleWidth: number;
  poleOpacity: number;
  flagFill: string;
  flagFillOpacity: number;
};

/** gap_up: shaded band between prev-high ↔ gap-low + label. */
export type GapUpStyle = LabelStyle & {
  bandFill: string;
  bandFillOpacity: number;
};

/** volume_breakout: up-triangle below the bar low + label. */
export type VolumeBreakoutStyle = LabelStyle & {
  markerColor: string;
  markerOpacity: number;
};

/** golden_cross: dot at the crossover price + label. */
export type GoldenCrossStyle = LabelStyle & {
  dotFill: string;
};

/** nr7: thin high/low range lines + down-arrow + label. */
export type Nr7Style = LabelStyle & {
  lineColor: string;
  lineWidth: number;
  lineOpacity: number;
  markerColor: string;
  markerOpacity: number;
};

/** unusual_volume: diamond marker at the bar + label. */
export type UnusualVolumeStyle = LabelStyle & {
  markerColor: string;
  markerOpacity: number;
};

/** volume_dryup: diamond marker at the bar + label. */
export type VolumeDryupStyle = LabelStyle & {
  markerColor: string;
  markerOpacity: number;
};

/** pocket_pivot: up-arrow at the bar + label. */
export type PocketPivotStyle = LabelStyle & {
  markerColor: string;
  markerOpacity: number;
};

/** inside_day: mother-bar high/low lines + outlined inside-bar box + label. */
export type InsideDayStyle = LabelStyle & {
  lineColor: string;
  lineWidth: number;
  lineOpacity: number;
  boxStroke: string;
  boxStrokeWidth: number;
  boxStrokeOpacity: number;
};

/** pullback_to_ema: dot at (event bar, ema value) + short tick + label. */
export type PullbackToEmaStyle = LabelStyle & {
  dotFill: string;
  lineColor: string;
  lineWidth: number;
  lineOpacity: number;
};

export type PatternStyles = {
  base_breakout: BaseBreakoutStyle;
  consolidation: ConsolidationStyle;
  high_tight_flag: HighTightFlagStyle;
  gap_up: GapUpStyle;
  volume_breakout: VolumeBreakoutStyle;
  golden_cross: GoldenCrossStyle;
  nr7: Nr7Style;
  unusual_volume: UnusualVolumeStyle;
  volume_dryup: VolumeDryupStyle;
  pocket_pivot: PocketPivotStyle;
  inside_day: InsideDayStyle;
  pullback_to_ema: PullbackToEmaStyle;
};

export type ChartAppearance = {
  // Color tokens → injected as `--<key>` inline CSS vars on the wrapper.
  // Key = CSS var name WITHOUT the leading `--`. Value = hex (or a var() expr).
  // e.g. 'chart-positive', 'chart-negative', 'chart-axis-label',
  //      'chart-separator', 'subpane-guide'. Defaults to `{}` — absence means
  //      "use the CSS var as authored in chart-core.css", so zero-config visuals
  //      are byte-identical and `onAppearanceChange` payloads stay tiny.
  colors: Record<string, string>;
  // Non-CSS-var scalars threaded explicitly into draw code:
  background: { topColor: string; bottomColor: string; radius: number };
  candle: { wickWidth: number };
  axis: { opacity: number; tickSize: number };
  crosshair: { color: string; opacity: number; dash: string };
  // Per-pattern typed styles (the three renderers have disjoint field sets).
  patterns: PatternStyles;
};

/** The ONLY persisted source of truth — a sparse delta over the defaults. */
export type AppearanceOverrides = DeepPartial<ChartAppearance>;
