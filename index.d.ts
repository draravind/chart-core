import type * as d3_2 from 'd3';
import { default as default_2 } from 'react';
import { JSX } from 'react';

export declare type AdxSettings = {
    period: number;
    lineColor: string;
};

export declare const APPEARANCE_DEFAULTS: ChartAppearance;

/** The ONLY persisted source of truth — a sparse delta over the defaults. */
export declare type AppearanceOverrides = DeepPartial<ChartAppearance>;

export declare type AtrSettings = {
    period: number;
    lineColor: string;
};

export declare type AutoFitMode = 'price' | 'priceAndOverlays';

export declare function barIndexForDate(data: readonly Candle[], isoDate: string): number | null;

/** base_breakout: resistance line + breakout dot + on-line stat text + label. */
export declare type BaseBreakoutStyle = LabelStyle & {
    lineColor: string;
    lineWidth: number;
    lineOpacity: number;
    lineDash: string;
    statColor: string;
    dotFill: string;
};

export declare type BbandsSettings = {
    period: number;
    nbdevup: number;
    nbdevdn: number;
    matype: number;
    upperColor: string;
    midColor: string;
    lowerColor: string;
};

export declare type Candle = {
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

export declare const Chart: default_2.MemoExoticComponent<({ data, warmupSeed, benchmarkClose, quarterlyResults, subpaneHeights, onSubpaneHeightsChange, visibleBars, onVisibleBarsChange, onMaxVisibleBarsChange, panOffset, onPanOffsetChange, chartType, indicators, onIndicatorsChange, autoFitMode, onAutoFitModeChange, infoBarExpanded, onInfoBarExpandedChange, symbol, bare, priceFormatter, patterns, patternsEnabled, visiblePatterns, statsTable, statsEnabled, statsMarket, statsPosition, onStatsPositionChange, statsSize, appearance, onAppearanceChange, children, }: Props_4) => default_2.JSX.Element>;

export declare type ChartAppearance = {
    colors: Record<string, string>;
    background: {
        topColor: string;
        bottomColor: string;
        radius: number;
    };
    candle: {
        wickWidth: number;
    };
    axis: {
        opacity: number;
        tickSize: number;
    };
    crosshair: {
        color: string;
        opacity: number;
        dash: string;
    };
    patterns: PatternStyles;
};

export declare function ChartControls({ chartType, onChartTypeChange, indicators, onIndicatorsChange, patternsEnabled, onPatternsToggle, visiblePatterns, onVisiblePatternsChange, statsEnabled, onStatsToggle, className, }: Props): JSX.Element;

declare type ChartOverlayContextValue = {
    tradeHost: SVGGElement | null;
    triggerHost: SVGGElement | null;
    priceBottomPx: number;
    marginRight: number;
    reportOverlayPriceBounds: (layer: ChartOverlayLayer, bounds: {
        min: number;
        max: number;
    } | null) => void;
    subscribeBackgroundPointerDown: (cb: () => void) => () => void;
};

export declare type ChartOverlayLayer = 'trade' | 'trigger';

export declare type ChartScaleApi = {
    data: Candle[];
    xScale: d3_2.ScaleBand<number>;
    yPrice: d3_2.ScaleLogarithmic<number, number>;
    subpaneScales: Map<string, d3_2.ScaleLinear<number, number>>;
    readonly ySub?: d3_2.ScaleLinear<number, number> | null;
    step: number;
    bandwidth: number;
    baseTranslateX: number;
    priceHeight: number;
    width: number;
    visibleBars: number;
    visibleBarsInt: number;
    visibleStartIdx: number;
    dataLength: number;
    indicators: ResolvedIndicator[];
    subscribe(cb: (api: ChartScaleApi, reason: ChartScaleReason) => void): () => void;
};

export declare type ChartScaleReason = 'pan' | 'rescale';

export declare type ChartType = 'candlestick' | 'bar';

/** TA-Lib ADX — Wilder smoothing of DX, seed at `2·period−1`. */
export declare function computeAdx(high: Float64Array, low: Float64Array, close: Float64Array, period: number): Float64Array;

/**
 * TA-Lib ATR — Wilder smoothing of the true range, seed at index `period` with
 * `mean(TR[1..period])`. Lookback `period`.
 */
export declare function computeAtr(high: Float64Array, low: Float64Array, close: Float64Array, period: number): Float64Array;

/**
 * TA-Lib DX — directional movement index, lookback `period`. Builds Wilder-
 * accumulated TR/+DM/−DM totals (DI form), then
 * `dx = 100·|+DI − −DI| / (+DI + −DI)` (denominator 0 → 0). Reused by ADX.
 */
export declare function computeDx(high: Float64Array, low: Float64Array, close: Float64Array, period: number): Float64Array;

/**
 * Exponential moving average matching pandas `ewm(span, adjust=False).mean()`.
 * Seeds `ema[0] = close[0]`, recurses `ema[i] = α·c[i] + (1−α)·ema[i−1]` with
 * `α = 2/(span+1)`, rounds to 2 dp. A NaN close resets the seam (next valid
 * close re-seeds), so gaps render as breaks rather than dragged-to-zero lines.
 */
export declare function computeEMA(close: Float64Array, span: number): Float64Array;

/** Expanding (all-history) running max — the ATH degenerate of rolling. */
export declare function computeExpandingMax(high: Float64Array): Float64Array;

/**
 * Trailing rolling max over `window` bars, `min_periods=1` (so early bars use
 * the partial window), rounded to 2 dp. O(N) via a monotonic decreasing deque
 * of indices. Matches pandas `rolling(window, min_periods=1).max()`.
 */
export declare function computeRollingHigh(high: Float64Array, window: number): Float64Array;

export declare function computeVolumeStats(data: {
    date: string;
    volume: number;
}[], smaWindow?: number, yearDays?: number): VolumeStats;

/** Accepted `defaultConfigFor` overrides — id/enabled plus the sparse settings
 *  delta map (the only persisted source of truth). */
declare type ConfigOverrides = {
    id?: string;
    enabled?: boolean;
    settingsOverrides?: Record<string, unknown>;
};

/** consolidation: shaded range box + label. */
export declare type ConsolidationStyle = LabelStyle & {
    boxFill: string;
    boxFillOpacity: number;
};

/** Dash array for a line-style index: solid → null, dashed → [4,3], dotted → [1,2]. */
export declare function dashFor(style: number): number[] | null;

export declare function dateForBarIndex(data: Candle[], idx: number): string;

/** Recursively-optional — the shape of a sparse persisted delta. */
export declare type DeepPartial<T> = T extends (infer U)[] ? DeepPartial<U>[] : T extends object ? {
    [K in keyof T]?: DeepPartial<T[K]>;
} : T;

/**
 * Build a default `IndicatorConfig` for a registry key from the def's
 * `settingsSchema` + any user deltas. Hosts call this to surface an indicator
 * in `ChartControls`, and the legend re-runs it on every edit so param-dependent
 * defaults (EMA re-banding) re-derive. Returns `undefined` for an unknown key.
 */
export declare function defaultConfigFor(defKey: string, overrides?: ConfigOverrides): IndicatorConfig | undefined;

/** Double EMA: `2·EMA − EMA(EMA)`, lookback `2(period−1)`. */
export declare function dema(src: Float64Array, period: number): Float64Array;

export declare type DemaSettings = {
    period: number;
    lineColor: string;
};

/**
 * Subpane scale SHAPE (replaces the old `SubpaneScaleHint` + `scaleHintFor`).
 * Bounded oscillators pin a `fixedDomain` (+ optional `guideLines`); unbounded
 * ones autofit, optionally forced symmetric about a `zeroLine` or extended to
 * span zero (`includeZero`). Which series drive the autofit is NOT here — that
 * is the def's single `autofitKeys`. This carries scale shape only.
 */
export declare type DomainSpec = {
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

export declare type DxSettings = {
    period: number;
    lineColor: string;
};

/**
 * Resolve effective appearance from a sparse delta — deep-merge
 * `APPEARANCE_DEFAULTS` ← overrides. Pure (never mutates the defaults or the
 * input). Per-field reset = omitting the key from the delta. The analogue of
 * `effectiveSettings` for the indicator framework.
 */
export declare function effectiveAppearance(overrides?: AppearanceOverrides): ChartAppearance;

/**
 * TA-Lib EMA: seed at `firstValid + period − 1` with the SMA of the first
 * `period` finite samples, then `e[i] = k·src[i] + (1−k)·e[i−1]`, `k = 2/(p+1)`.
 * Operates from the first finite index, so chaining EMA(EMA) compounds the
 * lookback (offset `period−1` each stage) exactly as TA-Lib's DEMA/TEMA/MACD do.
 */
export declare function emaTalib(src: Float64Array, period: number): Float64Array;

export declare type EmaTalibSettings = {
    period: number;
    lineColor: string;
    labelColor: string;
};

/**
 * Short legend summary for a config (e.g. "12,26,9" for MACD), via the def's
 * `formatParams`. Empty string when the def has none (no-param indicators).
 */
export declare function formatIndicatorParams(config: IndicatorConfig): string;

export declare const formatPrice: (value: number | null | undefined) => string;

export declare const formatVolume: (value: number | null | undefined) => string;

export declare const formatVolumeTick: (value: number | null | undefined) => string;

/** gap_up: shaded band between prev-high ↔ gap-low + label. */
export declare type GapUpStyle = LabelStyle & {
    bandFill: string;
    bandFillOpacity: number;
};

export declare function getIndicator(key: string): IndicatorDef<any> | undefined;

/** golden_cross: dot at the crossover price + label. */
export declare type GoldenCrossStyle = LabelStyle & {
    dotFill: string;
};

/** high_tight_flag: pole diagonal + flag box + label. */
export declare type HighTightFlagStyle = LabelStyle & {
    poleColor: string;
    poleWidth: number;
    poleOpacity: number;
    flagFill: string;
    flagFillOpacity: number;
};

/**
 * A resolved, app-supplied indicator instance. One per drawn entry.
 * `settings` is the effective merge (base → derived → overrides), read by
 * compute/draw/domain/legend; `settingsOverrides` is the ONLY persisted source
 * of truth (sparse deltas).
 */
export declare type IndicatorConfig = {
    id: string;
    defKey: string;
    label: string;
    enabled: boolean;
    settings: Record<string, unknown>;
    settingsOverrides: Record<string, unknown>;
};

/**
 * The unit of modularity. Every `S`-typed callback uses METHOD syntax (not an
 * arrow-typed property): under `strictFunctionTypes` an arrow property makes
 * `IndicatorDef<S>` unassignable to the erased `IndicatorDef` (TS2322); methods
 * are bivariance-exempt.
 */
export declare type IndicatorDef<S = Record<string, unknown>> = {
    /** Registry key, e.g. `ti:ema` / `highs`. */
    key: string;
    /** Compact label for the legend row + crosshair tooltips, e.g. `BBANDS`. */
    label: string;
    /** Full human name for the settings popover title, e.g. `Bollinger Bands`.
     *  Falls back to `label` when absent. */
    longLabel?: string;
    pane: 'price' | {
        subpane: string;
    };
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
    compute(input: IndicatorInput, s: S): {
        series: IndicatorSeries;
        meta?: unknown;
    };
    /** Paint the indicator. `resolveColor` resolves a color-field expr (var() or
     *  raw hex) to rgb; `meta` is the per-instance compute payload. */
    draw(ctx: CanvasRenderingContext2D, series: IndicatorSeries, scale: IndicatorDrawScale, s: S, resolveColor: (expr: string) => string, meta?: unknown): void;
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
    legend(series: IndicatorSeries, idx: number, s: S, ctx: {
        priceFmt: (v: number) => string;
    }): LegendRow[];
    /** Short legend summary, e.g. "50" for EMA, "12,26,9" for MACD. */
    formatParams?(s: S): string;
    /** Default subpane height multiplier (1 when absent). */
    paneHeightFactor?: number;
};

/** Geometry + source bars handed to `IndicatorDef.draw`. */
declare type IndicatorDrawScale = {
    xScale: d3_2.ScaleBand<number>;
    yPrice: d3_2.ScaleLogarithmic<number, number>;
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

/** OHLCV columns + the source bars, fed to `compute`. */
export declare type IndicatorInput = {
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

/** Where the indicator draws — the price overlay, or a named subpane. */
export declare type IndicatorPane = 'price' | {
    subpane: string;
};

/** One Float64Array per drawn line. NaN marks a gap (no value at that bar). */
export declare type IndicatorSeries = Record<string, Float64Array>;

/** inside_day: mother-bar high/low lines + outlined inside-bar box + label. */
export declare type InsideDayStyle = LabelStyle & {
    lineColor: string;
    lineWidth: number;
    lineOpacity: number;
    boxStroke: string;
    boxStrokeWidth: number;
    boxStrokeOpacity: number;
};

/** Fields common to every pattern's label chip. */
export declare type LabelStyle = {
    labelBg: string;
    labelBgOpacity: number;
    /** The chip TEXT color (the label STRING itself is computed content). */
    labelTextColor: string;
    labelFontSize: number;
};

/** One legend row: a color expr (resolved by the legend), a formatted live
 *  value (null/'' = no value cell), and an optional per-row label. */
export declare type LegendRow = {
    color: string;
    value: string | null;
    label?: string;
};

/** Line-style enum for the grouped `line` settings field; `value` indexes here
 *  and maps to a canvas dash array via `dashFor`. */
export declare const LINE_STYLE_OPTIONS: {
    label: string;
    value: number;
}[];

/** Resolved (rgb) stroke style handed to the canvas painters. Lives here (not
 *  in types.ts) — it's a draw-layer detail, not part of the public contract. */
declare type LineStyle = {
    color: string;
    width: number;
    dash?: number[] | null;
    opacity?: number;
};

/**
 * Build a resolved `LineStyle` from effective settings, reading the four scalar
 * sub-keys a grouped `line` field expands into (`${prefix}Color/Width/Style/
 * Opacity`). `style` maps to a dash array via `dashFor`; the color expr is
 * resolved (var() or raw hex) to rgb via `resolveColor`.
 */
export declare function lineStyleFrom(s: Record<string, unknown>, prefix: string, resolveColor: (expr: string) => string): LineStyle;

export declare function listIndicators(): IndicatorDef[];

export declare type MacdSettings = {
    fast: number;
    slow: number;
    signal: number;
    macdColor: string;
    macdsignalColor: string;
    histUpColor: string;
    histDownColor: string;
};

/**
 * Dispatch a moving average by TA-Lib `matype` over our supported subset:
 * 0=SMA, 1=EMA, 2=WMA, 3=DEMA, 4=TEMA. Other matypes are unsupported and fall
 * back to SMA.
 */
export declare function maDispatch(matype: number, src: Float64Array, period: number): Float64Array;

export declare function maxVisibleBarsForWidth(containerWidth: number): number;

export declare const MIN_BAR_STEP_PX = 2;

export declare const MIN_VISIBLE_BARS = 10;

export declare type NatrSettings = {
    period: number;
    lineColor: string;
};

/** nr7: thin high/low range lines + down-arrow + label. */
export declare type Nr7Style = LabelStyle & {
    lineColor: string;
    lineWidth: number;
    lineOpacity: number;
    markerColor: string;
    markerOpacity: number;
};

/** Canonical left-to-right ordering for price-pane overlays in the picker. */
export declare const OVERLAY_ORDER: string[];

export declare const panButtonClass: string;

export declare const PATTERN_CATALOG: PatternCatalogEntry[];

export declare const PATTERN_NAMES: string[];

export declare type PatternCatalogEntry = {
    name: string;
    label: string;
};

export declare type PatternMarker = {
    pattern_name: string;
    detected_on: string;
    markers: Record<string, unknown>;
};

export declare type PatternStyles = {
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

/** pocket_pivot: up-arrow at the bar + label. */
export declare type PocketPivotStyle = LabelStyle & {
    markerColor: string;
    markerOpacity: number;
};

declare type Props = {
    chartType: ChartType;
    onChartTypeChange: (t: ChartType) => void;
    indicators: IndicatorConfig[];
    onIndicatorsChange: (indicators: IndicatorConfig[]) => void;
    patternsEnabled: boolean;
    onPatternsToggle: () => void;
    visiblePatterns?: string[];
    onVisiblePatternsChange?: (names: string[]) => void;
    statsEnabled: boolean;
    onStatsToggle: () => void;
    className?: string;
};

declare type Props_2 = {
    appearance: AppearanceOverrides;
    onAppearanceChange: (next: AppearanceOverrides) => void;
    resolveColor: (expr: string) => string;
    onClose: () => void;
    style?: React.CSSProperties;
};

declare type Props_3 = {
    visibleBars: number;
    onVisibleBarsChange: (n: number) => void;
    maxVisibleBars: number;
    onPanReset?: () => void;
};

declare type Props_4 = {
    data: Candle[] | undefined;
    warmupSeed?: Candle[];
    benchmarkClose?: Record<string, number>;
    quarterlyResults?: QuarterlyResult[];
    subpaneHeights?: Record<string, number> | null;
    onSubpaneHeightsChange?: (h: Record<string, number>) => void;
    visibleBars: number;
    onVisibleBarsChange?: (n: number | ((prev: number) => number)) => void;
    onMaxVisibleBarsChange?: (n: number) => void;
    panOffset: number;
    onPanOffsetChange: (n: number | ((prev: number) => number)) => void;
    chartType: ChartType;
    indicators: IndicatorConfig[];
    onIndicatorsChange: (indicators: IndicatorConfig[]) => void;
    autoFitMode: AutoFitMode;
    onAutoFitModeChange: (m: AutoFitMode) => void;
    infoBarExpanded: boolean;
    onInfoBarExpandedChange: (v: boolean | ((prev: boolean) => boolean)) => void;
    symbol: string | null;
    bare?: boolean;
    priceFormatter?: (value: number) => string;
    patterns?: PatternMarker[];
    patternsEnabled?: boolean;
    visiblePatterns?: string[];
    statsTable?: StatsTableData;
    statsEnabled?: boolean;
    statsMarket?: StatsMarket;
    statsPosition?: StatsPosition | null;
    onStatsPositionChange?: (p: StatsPosition) => void;
    statsSize?: StatsSize;
    appearance?: AppearanceOverrides;
    onAppearanceChange?: (next: AppearanceOverrides) => void;
    children?: default_2.ReactNode;
};

/** pullback_to_ema: dot at (event bar, ema value) + short tick + label. */
export declare type PullbackToEmaStyle = LabelStyle & {
    dotFill: string;
    lineColor: string;
    lineWidth: number;
    lineOpacity: number;
};

/** One reported fiscal period (quarterly or annual cadence). */
export declare type QuarterlyResult = {
    label: string;
    date: string;
    eps?: number;
    rps?: number;
};

export declare type QuarterlyResultsSettings = {
    display: number;
    epsColor: string;
    rpsColor: string;
    growthUpColor: string;
    growthDownColor: string;
    labelColor: string;
};

export declare const RANGE_DAYS: Record<RangeKey_2, number>;

export declare type RangeKey = '3M' | '6M' | '1Y' | '2Y' | '3Y' | '5Y';

declare type RangeKey_2 = '3M' | '6M' | '1Y' | '2Y' | '3Y' | '5Y';

export declare const RANGES: RangeKey[];

/**
 * Raw stochastic %K over `period`: `100·(closeSrc − LL)/(HH − LL)`, where HH/LL
 * are the rolling max/min of `highSrc`/`lowSrc`. `HH === LL → 0` (TA-Lib).
 * Lookback `period−1`. For price stochastics pass (high, low, close); for
 * STOCHRSI pass the RSI series as all three.
 */
export declare function rawStochK(highSrc: Float64Array, lowSrc: Float64Array, closeSrc: Float64Array, period: number): Float64Array;

export declare function registerIndicator<S>(def: IndicatorDef<S>): void;

/** What Chart publishes on `scaleApi.indicators` for the crosshair/autofit.
 *  `meta` is the per-instance compute payload threaded to `draw`. */
export declare type ResolvedIndicator = {
    config: IndicatorConfig;
    series: IndicatorSeries;
    meta?: unknown;
};

/** Trailing rolling max over a FULL `period` window (lookback `period−1`). O(N) deque. */
export declare function rollingMax(src: Float64Array, period: number): Float64Array;

/** Trailing rolling min over a FULL `period` window (lookback `period−1`). O(N) deque. */
export declare function rollingMin(src: Float64Array, period: number): Float64Array;

/**
 * TA-Lib RSI (Wilder). `diff = close[i] − close[i−1]` (i ≥ 1); gains/losses are
 * Wilder-smoothed with seed = mean of the first `period` samples at index
 * `period`. `RS = avgGain/avgLoss`; `rsi = 100 − 100/(1+RS)`; `avgLoss = 0 → 100`.
 * Lookback `period`.
 */
export declare function rsi(close: Float64Array, period: number): Float64Array;

export declare type RsiSettings = {
    period: number;
    lineColor: string;
};

export declare type RsSettings = {
    lookback: number;
    lineColor: string;
    signalColor: string;
};

export declare function SettingsDialog({ appearance, onAppearanceChange, resolveColor, onClose, style, }: Props_2): JSX.Element;

export declare type SettingsField = (SettingsFieldBase & {
    kind: 'color';
    default: string;
}) | (SettingsFieldBase & {
    kind: 'number';
    default: number;
    min?: number;
    max?: number;
    step?: number;
}) | (SettingsFieldBase & {
    kind: 'enum';
    default: number;
    options: {
        label: string;
        value: number;
    }[];
}) | (SettingsFieldBase & {
    kind: 'toggle';
    default: boolean;
}) | (SettingsFieldBase & {
    kind: 'line';
    default: {
        color: string;
        width: number;
        style?: number;
        opacity?: number;
    };
});

/** One typed, user-editable setting. Drives both the popover control (kind →
 *  control type) and the static defaults (`defaultsFromSchema`). A `color`
 *  field's `default` is a CSS-var expression (`var(--rsi-line)`); a user
 *  override is raw hex — the framework resolves either to rgb via `resolveColor`
 *  at draw/legend time. */
declare type SettingsFieldBase = {
    key: string;
    label: string;
};

/**
 * Simple moving average, lookback `period−1` from the first finite sample.
 * O(N) running sum.
 */
export declare function sma(src: Float64Array, period: number): Float64Array;

export declare type SmaSettings = {
    period: number;
    lineColor: string;
};

export declare type Stage2Settings = {
    smaPeriod: number;
    slopeLookback: number;
    slopeMin: number;
    minPeriods: number;
    bandColor: string;
};

export declare type StatsMarket = 'India' | 'US';

/** Free-drag placement: pixels from the chart-wrapper's top-left. */
export declare type StatsPosition = {
    x: number;
    y: number;
};

export declare type StatsSize = 'tiny' | 'small' | 'normal' | 'large';

/**
 * Raw, app-owned financials for the symbol. All optional — absent/invalid inputs
 * blank the dependent cell; if every fundamental is absent the panel collapses to
 * an ATR-only view. The library does the close-dependent math + market formatting.
 */
export declare type StatsTableData = {
    sector?: string;
    industry?: string;
    sharesOutstanding?: number;
    /** Pre-computed free-float % (e.g. 45.09). The panel formats + color-bands it
     * directly — the library no longer derives the ratio from a raw share count. */
    freeFloatPercent?: number;
    eps?: number;
};

/**
 * Population standard deviation over a rolling `period` window (ddof=0),
 * `sqrt(mean(x²) − mean(x)²)`, lookback `period−1`. The variance is clamped at
 * 0 before the root to absorb float cancellation near a flat window.
 */
export declare function stddevPop(src: Float64Array, period: number): Float64Array;

export declare type StochfSettings = {
    fastk: number;
    fastd: number;
    fastd_matype: number;
    kColor: string;
    dColor: string;
};

export declare type StochrsiSettings = {
    timeperiod: number;
    fastk: number;
    fastd: number;
    fastd_matype: number;
    kColor: string;
    dColor: string;
};

export declare type StochSettings = {
    fastk: number;
    slowk: number;
    slowk_matype: number;
    slowd: number;
    slowd_matype: number;
    kColor: string;
    dColor: string;
};

/** Canonical top-to-bottom subpane stacking order (stable across toggles).
 *  `volume` stacks directly below price, exactly where the legacy volume zone
 *  sat. `results` and the oscillators follow. */
export declare const SUBPANE_ORDER: string[];

/** Triple EMA: `3·EMA − 3·EMA(EMA) + EMA(EMA(EMA))`, lookback `3(period−1)`. */
export declare function tema(src: Float64Array, period: number): Float64Array;

export declare type TemaSettings = {
    period: number;
    lineColor: string;
};

export declare type TrangeSettings = {
    lineColor: string;
};

/**
 * Per-bar true range: `tr[0] = NaN`; for `i ≥ 1`,
 * `max(high−low, |high−prevClose|, |low−prevClose|)`.
 */
export declare function trueRange(high: Float64Array, low: Float64Array, close: Float64Array): Float64Array;

/** unusual_volume: diamond marker at the bar + label. */
export declare type UnusualVolumeStyle = LabelStyle & {
    markerColor: string;
    markerOpacity: number;
};

/** Subscribe to bare-chart background mousedowns (to clear overlay selection). */
export declare function useBackgroundPointerDown(): ChartOverlayContextValue['subscribeBackgroundPointerDown'];

/** Geometry for placing floating toolbar buttons over the price area. */
export declare function useChartGeometry(): {
    priceBottomPx: number;
    marginRight: number;
};

/** The host <g> for the given layer, or null until the engine has mounted it. */
export declare function useChartOverlayHost(layer: ChartOverlayLayer): SVGGElement | null;

export declare function useChartScale(): ChartScaleApi;

/** Reporter for an overlay layer to contribute its price extent to auto-fit. */
export declare function useReportOverlayPriceBounds(): ChartOverlayContextValue['reportOverlayPriceBounds'];

/** volume_breakout: up-triangle below the bar low + label. */
export declare type VolumeBreakoutStyle = LabelStyle & {
    markerColor: string;
    markerOpacity: number;
};

/** volume_dryup: diamond marker at the bar + label. */
export declare type VolumeDryupStyle = LabelStyle & {
    markerColor: string;
    markerOpacity: number;
};

export declare type VolumeLabel = {
    index: number;
    text: 'HVE' | 'HVY';
};

export declare type VolumeStats = {
    /** Per-index trailing 30-bar SMA of volume; undefined for the first 29 bars. */
    sma: (number | undefined)[];
    /** At most two markers: HVE always (if data has volume), HVY unless it ties HVE's bar. */
    labels: VolumeLabel[];
};

/**
 * Wilder smoothing (RSI/ATR/ADX form). Seed at `firstSampleIdx + period − 1`
 * with the mean of the first `period` samples, then
 * `w[i] = (w[i−1]·(p−1) + x[i]) / p`. `firstSampleIdx` is where valid samples
 * begin (1 for diff/TR series, `period` for the DX series feeding ADX).
 */
export declare function wilderSmooth(x: Float64Array, period: number, firstSampleIdx: number): Float64Array;

/**
 * Wilder running accumulation (DI form): seed = sum of the first `period`
 * samples, then `sm[i] = sm[i−1] − sm[i−1]/period + x[i]`. Used for the
 * TR/+DM/−DM totals inside DX.
 */
export declare function wilderSum(x: Float64Array, period: number, firstSampleIdx: number): Float64Array;

export declare type WillrSettings = {
    period: number;
    lineColor: string;
};

/**
 * Linearly-weighted MA (weights oldest=1 … newest=period, divisor p(p+1)/2),
 * lookback `period−1`. O(N) via a rolling weighted sum + plain sum.
 */
export declare function wma(src: Float64Array, period: number): Float64Array;

export declare type WmaSettings = {
    period: number;
    lineColor: string;
};

export declare function ZoomSlider({ visibleBars, onVisibleBarsChange, maxVisibleBars, onPanReset, }: Props_3): JSX.Element;

export { }
