# CODEMAP — chart-core symbol index

**Purpose:** a read-before-you-grep navigation aid. Skim the region you need, jump
straight to the file and symbol. This is **not** an API contract — `src/index.ts`
is the source of truth for what's public, and the code is the source of truth for
signatures. When they disagree, trust the code.

**Last generated:** 2026-06-08. To regenerate, re-run the per-region Explore
fan-out (one read-only sub-agent per region cluster below; each reads the real
source and returns path + key exported symbols + one-line purpose).

**Caveat:** code moves. Treat every signature here as a hint, not a guarantee;
update entries when you happen to touch a file and find them stale.

Regions: [Entry & types](#entry--types) · [Chart core](#chart-core) ·
[Controls](#controls) · [Indicator framework](#indicator-framework) ·
[Built-in indicators](#built-in-indicators) · [Patterns](#patterns) ·
[Utils](#utils) · [Internal](#internal) · [Config / build / tests](#config--build--tests)

---

## Entry & types

### `src/index.ts`

Public barrel — the only import surface for consumers (never deep-import). Re-exports:

- `export * from './types'` → `Candle`, `QuarterlyResult`, `ChartType`, `AutoFitMode`,
  `RangeKey`, `RANGES`, `ChartScaleReason`, `ChartScaleApi`.
- From `utils/chartCalculations`: `RANGE_DAYS`, `formatPrice`, `formatVolume`,
  `formatVolumeTick`, `computeVolumeStats`, types `VolumeLabel`, `VolumeStats`.
- From `patterns/types`: `PatternMarker`.
- From `stats/types`: `StatsTableData`, `StatsMarket`, `StatsPosition`, `StatsSize`
  (the price-stats panel's public props; compute/component stay internal).
- From `utils/dateBarIndex`: `barIndexForDate`, `dateForBarIndex`.
- `panButtonClass: string` — hashed CSS class of the reset-pan button (from
  `Chart.module.css`), re-exported so overlay plugins reuse the bundled styling.
- From `indicators/registry`: `registerIndicator`, `getIndicator`,
  `listIndicators`, `defaultConfigFor`, `formatIndicatorParams`, `OVERLAY_ORDER`,
  `SUBPANE_ORDER`.
- From `indicators/compute`: `computeEMA`, `computeRollingHigh`, `computeExpandingMax`.
- Indicator types from `indicators/types`: `IndicatorDef`, `IndicatorConfig`,
  `IndicatorSeries`, `IndicatorPane`, `IndicatorInput`, `ResolvedIndicator`,
  `SettingsField`, `LegendRow`, `DomainSpec`.
- TA-Lib primitives from `indicators/talibMath`: `sma`, `wma`, `emaTalib`, `dema`,
  `tema`, `maDispatch`, `rsi`, `rawStochK`, `computeDx` (=`dx`), `computeAdx`
  (=`adx`), `computeAtr` (=`atr`), `trueRange`, `stddevPop`, `rollingMin`,
  `rollingMax`, `wilderSmooth`, `wilderSum`.
- Per-indicator `*Settings` types from each builtin (`SmaSettings` …
  `TrangeSettings`, plus `RsSettings`, `Stage2Settings`,
  `QuarterlyResultsSettings`).
- `Chart` (default), `ChartControls` (default).
- From `context`: `useChartScale`, `useChartOverlayHost`, `useChartGeometry`,
  `useReportOverlayPriceBounds`, `useBackgroundPointerDown`, type `ChartOverlayLayer`.

### `src/types.ts`

- `Candle` — OHLCV bar: `{date, open, high, low, close, volume}` + optional
  precomputed historical highs (`high1y?`, `high2y?`, `high3y?`, `highAll?`) and
  deprecated `ema10?…ema200?` fields.
- `QuarterlyResult` — one reported fiscal period: `{label, date, eps?, rps?}`
  (consumed by the `results` subpane indicator via the `quarterlyResults` Chart prop).
- `ChartType` = `'candlestick' | 'bar'`; `AutoFitMode` = `'price' | 'priceAndOverlays'`.
- `RangeKey` = `'3M' | '6M' | '1Y'`; `RANGES` — the three keys as a const array.
- `ChartScaleReason` = `'pan' | 'rescale'`.
- `ChartScaleApi` — the stable, mutated-in-place geometry object overlay plugins
  read: `data`, `xScale`, `yPrice`, `subpaneScales` (Map), `ySub` (deprecated),
  `step`, `bandwidth`, `baseTranslateX`, `priceHeight`, `width`, `visibleBars`,
  `visibleBarsInt`, `visibleStartIdx`, `dataLength`, `indicators`
  (`ResolvedIndicator[]`), `subscribe(cb)`.

---

## Chart core

### `src/Chart.tsx`

- `default Chart` (React.FC) — the main chart component. Props include `data`,
  `warmupSeed`, `benchmarkClose`, `visibleBars`/`onVisibleBarsChange`,
  `panOffset`/`onPanOffsetChange`, `chartType`, `indicators`/`onIndicatorsChange`,
  `autoFitMode`/`onAutoFitModeChange`, `infoBarExpanded`/`onInfoBarExpandedChange`,
  `symbol`, `bare`, `priceFormatter`, `patterns`, `patternsEnabled`,
  `quarterlyResults` (Results subpane rows), `subpaneHeights`/`onSubpaneHeightsChange`
  (persisted per-pane drag heights), `children`. Owns canvas rendering, pan/zoom,
  the published `ChartScaleApi`, overlay hosts, the draggable subpane dividers, and
  the bundled pattern overlay. Only default export.

### `src/context.tsx`

- `createChartScaleApi() → {api, notify(reason)}` — factory for the scale API plus
  its notification dispatch.
- `ChartScaleProvider` / `useChartScale() → ChartScaleApi` — provider + hook;
  the hook throws outside a `Chart`. Overlay plugins subscribe via `api.subscribe`.
- `ChartOverlayLayer` = `'trade' | 'trigger'` — the two z-stacked SVG host zones.
- `ChartOverlayContextValue`, `ChartOverlayProvider`.
- `useChartOverlayHost(layer) → SVGGElement | null` — the `<g>` to mount overlay
  shapes into (null until mounted).
- `useChartGeometry() → {priceBottomPx, marginRight}` — for positioning toolbar buttons.
- `useReportOverlayPriceBounds() → (layer, bounds | null) => void` — reports
  overlay price extents back to auto-fit.
- `useBackgroundPointerDown() → (cb) => () => void` — subscribe to chart-background
  mousedowns (pan-drag init).

### `src/Chart.module.css`

Scoped styles for the chart shell: `.chartWrapper`/`.chartWrapperBare`,
`.seriesCanvas`, `.chartSvg`, `.empty`, `.resetPanBtn` (exported as
`panButtonClass`), auto-fit button, and the legend + param-popover UI classes.

---

## Controls

### `src/controls/ChartControls.tsx`

- `default ChartControls` (React.FC) — control panel: range buttons, chart-type
  toggle, indicator picker (split into overlays vs. oscillators), patterns toggle.
  Props: `ranges`, `activeRange`/`onRangeChange`, `chartType`/`onChartTypeChange`,
  `indicators`/`onIndicatorsChange`, `patternsEnabled`/`onPatternsToggle`,
  `className`. Uses `listIndicators()` + `defaultConfigFor()` to populate/seed.

### `src/controls/IndicatorLegend.tsx`

- `default IndicatorLegend` (React.FC) — on-chart legend with live values and the
  per-indicator param/color popover. Props: `indicators`/`onIndicatorsChange`,
  `resolved`, `subpanes`, `marginTop`, `marginLeft`, `barCount`,
  `expanded`/`onExpandedChange`, `subscribeHoverIndex`, `priceFormatter`,
  `resolveColor`. Subscribes to a hover index so only the legend re-renders on
  crosshair move. Live values + dot come from the def's `legend()`; the popover
  iterates `def.settingsSchema` (number/enum/toggle/color controls reading
  `config.settings`), commit/reset route through `defaultConfigFor` over
  `settingsOverrides`. Internal: `NumberField`, `EnumField`, `ToggleField`,
  `ColorField` (prop `{label, colorExpr}`), `ParamPopover`, `LegendBlock`.

---

## Indicator framework

### `src/indicators/types.ts`

- `IndicatorDef<S>` — the unit of modularity. Every `S`-typed callback uses
  method syntax (bivariance under `strictFunctionTypes`). Fields: `key`, `label`,
  `longLabel?`, `pane`, `settingsSchema: SettingsField[]` (drives the popover +
  static defaults), `deriveDefaults?(s)` (param-dependent defaults, e.g. EMA bands
  its color from period — replaces `defaultLineColor`), `warmupBars(s)`,
  `compute(input, s) → {series, meta?}` (`meta` = the per-instance non-numeric
  payload lane, e.g. Quarterly Results' formatted rows), `draw(ctx, series, scale,
  s, resolveColor, meta?)`, `autofitKeys?(s) → string[]` (which series drive the
  scale — used by BOTH price + subpane loops), `domain?(series, s) → DomainSpec`
  (subpane scale SHAPE only; absent ⇒ plain autofit), `legend(series, idx, s,
  {priceFmt}) → LegendRow[]` (required), `formatParams?(s)`, `paneHeightFactor?`.
- `SettingsField` — one typed editable setting: `color | number | enum | toggle`
  (a `color` default is a `var()` expr; a user override is raw hex).
- `LegendRow` — `{color, value: string|null, label?}` (one live legend row).
- `DomainSpec` — subpane scale shape: `{fixedDomain?, guideLines?, zeroLine?,
  autofitPadding?, includeZero?, topPadPx?, hideAxis?, tickFormat?}` (replaces the
  old `SubpaneScaleHint` + `scaleHintFor`; carries shape only — `autofitKeys` owns
  which series autofit).
- `IndicatorPane` = `'price' | {subpane: string}`.
- `IndicatorSeries` = `Record<string, Float64Array>` (one line per key; NaN = gap).
- `IndicatorInput` — `{o,h,l,c,v: Float64Array; bars; benchmarkClose?;
  quarterlyResults?; market?; displayStart?}`.
- `IndicatorDrawScale` — adds `paneTop?/paneBottom?` (pixel band bounds).
- `IndicatorConfig` — resolved user instance: `{id, defKey, label, enabled,
  settings, settingsOverrides}` (`settings` = effective merge; `settingsOverrides`
  = the only persisted source of truth, sparse deltas).
- `ResolvedIndicator` — `{config, series, meta?}` (Chart-published; `meta` threads
  the compute payload to `draw`).

### `src/indicators/registry.ts`

- `registerIndicator<P>(def) → void` — register a def in the global key→def map.
- `getIndicator(key) → IndicatorDef<any> | undefined` — lookup by key (`ti:*` for
  TA-Lib defs, e.g. `ti:ema`; legacy keys unprefixed, e.g. `highs`, `rs`).
- `listIndicators() → IndicatorDef[]`.
- `defaultsFromSchema(schema) → Record<string, unknown>` — static defaults off the
  schema (the single base-settings source).
- `effectiveSettings(def, overrides) → S` — the delta ladder:
  `base → {...base,...overrides} → deriveDefaults(merged) →
  {...base,...derived,...overrides}` (user delta wins over derived). Pure.
- `defaultConfigFor(defKey, overrides?) → IndicatorConfig | undefined` — factory
  from `{id?, enabled?, settingsOverrides?}` → `{settings, settingsOverrides, …}`.
- `formatIndicatorParams(config) → string` — delegates to the def's `formatParams`
  hook (e.g. MACD → `"12,26,9"`), reading `config.settings`.
- `OVERLAY_ORDER` / `SUBPANE_ORDER: string[]` — canonical picker/stacking order.
- Imports every builtin so they self-register on module load.

### `src/indicators/compute.ts`

Legacy, non-TA-Lib compute helpers (also part of the public barrel):

- `computeEMA(close, span) → Float64Array` — pandas-seeded EMA (`α=2/(span+1)`,
  resets on NaN).
- `computeRollingHigh(high, window) → Float64Array` — O(N) rolling max via
  monotonic deque, `min_periods=1`.
- `computeExpandingMax(high) → Float64Array` — all-history running max (ATH).

### `src/indicators/draw.ts`

Canvas painters + small legend helpers shared by builtin hooks:

- `LineStyle` = `{color, width, dash?, opacity?}` — resolved (rgb) stroke style
  (draw-layer local; not in `types.ts`).
- `fmt2(v)` / `cellAt(values, idx, fmt)` — legend cell formatting (`''` on
  NaN/oob); reused by simple defs' `legend`.
- `drawPolyline(ctx, scale, values, style, defined)` — line painter; `defined`
  predicate breaks the line on NaN/false.
- `drawLines(ctx, series, scale, lines: {key, st}[])` — default multi-line painter
  (caller passes only real lines — no width-0 skip).
- `drawHistogram(ctx, scale, values, style, negColor?)` — bars from zero, dual
  color (MACD).
- `drawGuideLines(ctx, scale, levels[], color, opts?)` — dashed horizontal guides
  (RSI 30/70, MACD zero line).
- `drawDots(ctx, scale, values, style, marked, radius?)` — markers on selected bars
  (RS-line signals).

### `src/indicators/settingsOptions.ts`

- `MA_TYPE_OPTIONS: {label, value}[]` — enum-field options for the `matype` selector
  (0=SMA, 1=EMA, 2=WMA, 3=DEMA, 4=TEMA); shared by BBANDS/STOCH/STOCHF/STOCHRSI.

### `src/indicators/subpaneLayout.ts`

- `computeSubpaneBands(params) → SubpaneBandsResult` — D1 height policy: each active
  subpane gets a default share (× per-key `heightFactors`) with gaps, overridable by
  `userHeights` (drag); the price pane shrinks toward `floorRatio`, leftover scaled
  proportionally (min ~4px each). All-factors-1 ≡ the original flat policy.
- `computeSubpaneDomain(params) → [number, number] | null` — autofit domain:
  `fixedDomain` wins, else scan non-marker lines, optionally `includeZero`, force
  symmetry about zero, apply padding.
- `applySubpaneDrag(params) → Record<string, number>` — pure divider-drag math:
  `dividerIndex` 0 trades the price pane with subpane 0, `i>0` trades panes
  `i-1`/`i`; clamps (subpane ≥ `minPanePx`, price ≥ `floorRatio`); returns the full
  per-key height map as `totalHeight` fractions (persist as `userHeights`).
- `SubpaneBand` = `{key, top, bottom, height}` — one subpane's layout rect.
  (Note: `IndicatorLegend` also passes around a lighter `{key, top}` band shape.)

### `src/indicators/talibMath.ts`

TA-Lib-faithful pure primitives — the source of truth for indicator math. Every
function returns a **full-length** `Float64Array` with NaN in warm-up positions; no
rounding in primitives (builtins round once on the final value).

- MAs: `sma`, `wma`, `emaTalib`, `emaTalibAt(src, period, seedIdx)`, `dema`, `tema`,
  `maDispatch(matype, src, period)`, `maLookback(matype, period)`.
- Smoothing: `wilderSmooth(x, period, firstSampleIdx)`, `wilderSum(...)`.
- Rolling extrema: `rollingMax`, `rollingMin` (O(N) deque).
- Volatility/direction: `trueRange`, `atr`, `dx`, `adx`.
- Momentum: `rsi`, `rawStochK`.
- Stats/util: `stddevPop`, `round2`, `firstValid`.

---

## Built-in indicators

`src/indicators/builtins/*.ts` — 22 files. **Shared shape:** each exports a
`*Settings` type **and** a `*Def: IndicatorDef<*Settings>` const that self-registers
via the registry import. Each `*Settings` carries the numeric/enum params PLUS a
`color`-field per drawn element (key listed in the def's `settingsSchema`). Each is
a thin wrapper over `talibMath` primitives (compute) + `draw` helpers (render), and
declares `autofitKeys` (+ a `domain` for bounded/special subpanes) and a `legend`.

| File             | Settings type (params shown; every def also has color fields)   | Computes                                                                              |
| ---------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `sma.ts`         | `SmaSettings {period, lineColor}`                              | Simple moving average                                                                 |
| `wma.ts`         | `WmaSettings {period, …}`                                      | Linearly-weighted MA                                                                  |
| `emaTalib.ts`    | `EmaTalibSettings {period, lineColor, labelColor}`            | TA-Lib EMA; period-banded colors via `deriveDefaults` (10/20/50/200)                  |
| `dema.ts`        | `DemaSettings {period, …}`                                     | Double EMA                                                                            |
| `tema.ts`        | `TemaSettings {period, …}`                                     | Triple EMA                                                                            |
| `rsi.ts`         | `RsiSettings {period, lineColor}`                             | Wilder RSI (0–100); `domain` guides at 30/70                                          |
| `macd.ts`        | `MacdSettings {fast, slow, signal, macd, macdsignal, histUpColor, histDownColor}` | MACD line + signal + histogram (dual-color bars; `histDownColor` is a first-class field, no carrier) |
| `bbands.ts`      | `BbandsSettings {period, nbdevup, nbdevdn, matype, upperColor, midColor, lowerColor}` | Bollinger Bands (MA ± n·stddev)                                         |
| `stoch.ts`       | `StochSettings {fastk, slowk, slowk_matype, slowd, slowd_matype, kColor, dColor}` | Slow stochastic %K/%D; guides 20/80                              |
| `stochf.ts`      | `StochfSettings {fastk, fastd, fastd_matype, kColor, dColor}` | Fast stochastic; guides 20/80                                                         |
| `stochrsi.ts`    | `StochrsiSettings {timeperiod, fastk, fastd, fastd_matype, kColor, dColor}` | Stochastic of RSI; guides 20/80                                             |
| `willr.ts`       | `WillrSettings {period, lineColor}`                           | Williams %R (−100..0); guides −20/−80                                                 |
| `adx.ts`         | `AdxSettings {period, lineColor}`                             | Average directional index (trend strength)                                            |
| `dx.ts`          | `DxSettings {period, lineColor}`                              | Raw directional index                                                                 |
| `atr.ts`         | `AtrSettings {period, lineColor}`                             | Average true range (price units); plain-autofit (no `domain`)                         |
| `natr.ts`        | `NatrSettings {period, lineColor}`                            | Normalized ATR (percent); plain-autofit                                              |
| `trange.ts`      | `TrangeSettings {lineColor}`                                  | Per-bar true range (**no numeric params**)                                            |
| `rollingHigh.ts` | `HighsSettings` (local; `color1y/2y/3y/All`)                  | `highsDef` — data-backed 1Y/2Y/3Y/ATH highs read off `bars[].high*` columns           |
| `rsLine.ts`      | `RsSettings {lookback, lineColor, signalColor}`              | RS line (stock/benchmark, rebased to 100) + signal dots; `autofitKeys: ['rs']` excludes the 0/1 `signal` |
| `stage2.ts`      | `Stage2Settings {smaPeriod, slopeLookback, slopeMin, minPeriods, bandColor}` | Stage-2 advancing band (green price-pane band; `autofitKeys: []` so it never moves the price domain) |
| `quarterlyResults.ts` | `QuarterlyResultsSettings {display, epsColor, rpsColor, growthUpColor, growthDownColor, labelColor}` | Quarterly Results subpane (RPS+EPS, core-computed YoY growth); Text/Bars via `display`; formatted rows ride `compute`'s `meta` (no WeakMap); `domain`/`autofitKeys` switch on `display`; `paneHeightFactor 1.7` |
| `volume.ts`      | `VolumeSettings {smaPeriod, smaFade, milestones, standardOpacity, fadeOpacity, upColor, downColor, labelColor}` | Volume subpane indicator. Custom 4-bucket draw (up/down × above/below SMA, faded opacity); `volumeUp`/`volumeDown` autofit the pane; `volSma`/`volLabel` are data channels; HVE/HVY labels + K/M/B axis (`domain.tickFormat`); reads opacities from settings; `paneHeightFactor 1.154`; reuses `computeVolumeStats` |

---

## Patterns

### `src/patterns/mountChartPatternOverlay.ts`

- `mountChartPatternOverlay(parent: SVGGElement) → ChartPatternOverlayHandle` —
  builds a D3 SVG overlay (clipped pattern shapes + unclipped labels), manages data
  joins, hover regions, and pan/pointer state.
- `ChartPatternOverlayHandle` — `{update(), updateScales(), setTransform(),
setPointer(), destroy()}`.
- `ChartPatternCtx` — render context: detections, bars, `xScale`, `yPrice`,
  dimensions, optional hover-registration callback.
- `ChartPatternScaleCtx` — scale-only subset of the context.
- `HoverRegion` — `{x0, x1, y0, y1, label: SVGGElement}`.

### `src/patterns/types.ts`

- `PatternMarker` — `{pattern_name: string; detected_on: string; markers:
Record<string, unknown>}`. Structural mirror of the app's API marker shape.

### `src/patterns/renderers/index.ts`

- `RendererFn` = `(detection, target, labelTarget, ctx) => void`.
- `renderers: Record<string, RendererFn>` — dispatch table keyed by `pattern_name`:
  `high_tight_flag`, `base_breakout`, `consolidation`.

### `src/patterns/renderers/baseBreakout.ts`

- `renderBaseBreakout(detection, target, labelTarget, ctx)` — dashed resistance
  lines per level (with breakout dots), base-stats text (days + depth %), right-side
  label chip.

### `src/patterns/renderers/consolidation.ts`

- `renderConsolidation(...)` — shaded range box (start→end, range_high/low) + a
  hidden-until-hover label chip (duration, width %, ATR tightness).

### `src/patterns/renderers/highTightFlag.ts`

- `renderHighTightFlag(...)` — pole diagonal + flag box + label chip (tier
  High/Low, `pole_gain_pct` score).

---

## Price stats

### `src/stats/types.ts`

- `StatsMarket` = `'India' | 'US'` — drives Mkt-Cap units/thresholds.
- `StatsTableData` — app-supplied raw financials: `{sector?, industry?,
  sharesOutstanding?, freeFloatPercent?, eps?}` (all optional; absent → blanked).
- `StatsPosition` = `{x, y}` — free-drag placement in pixels from the
  chart-wrapper top-left. `null` prop → default top-right placement.
- `StatsSize` = `'tiny' | 'small' | 'normal' | 'large'` (default `'small'`).

### `src/stats/computeStats.ts`

- `computeStats(combinedBars, statsTable, market) → StatsViewModel` — pure, React-
  free port of the "Price stats" Pine math. Reads the LAST index of the
  caller-built warmup+data history; mc uses the PRIOR close, PE the LAST close.
- `StatsViewModel` = `{rows: StatsRow[]}`; `StatsRow` = merged (colSpan-3) or cells
  (≤3); `StatsCell` = `{text, level}`; `StatsLevel` =
  `'strong'|'up'|'neutral'|'down'|'text'|'muted'`.
- ATR rows: `sma(trueRange/close, {125,63,21})*100`; display halves the value,
  color bands on the full value; blank when the last index is non-finite
  (<~126 bars, or ±Infinity from a zero close).

### `src/stats/position.ts`

- `clampStatsPosition(pos, hostW, hostH, panelW, panelH)` — keeps the panel fully
  inside the host bounds (pins to 0 when the panel exceeds the host).
- `defaultStatsPosition(hostW, panelW, marginRight)` — top-right placement, left
  of the price-axis gutter: `{x: max(0, hostW − panelW − marginRight − 8), y: 8}`.

### `src/stats/StatsPanel.tsx`

- `StatsPanel` (default) — floating HTML table over `.chartWrapper`, free-draggable
  (whole panel = drag handle, pointer capture; host stays `pointer-events:none`,
  panel is `auto`). Props: `model`, `size`, `marginRight` (default-placement
  gutter), `position: StatsPosition | null`, `onPositionChange?` (fired on drag
  end with the clamped drop). Null position → measured default placement (local
  only, never persisted); a ResizeObserver on host + panel re-clamps on resize.
- `src/stats/stats.module.css` — panel chrome (grab/grabbing cursors,
  `touch-action:none`) + 4 size presets + one color class per level (reads
  `--stats-*` tokens directly); panel geometry is inline `left`/`top`.

---

## Utils

### `src/utils/chartCalculations.ts`

- `RangeKey` (structurally identical to `types.ts`'s; canonical one is from types),
  `RANGE_DAYS: Record<RangeKey, number>` (66/132/252 trading days).
- `formatPrice(value) → string` (en-IN, 2dp); `formatVolume(value) → string`
  (B/M/K, 2dp); `formatVolumeTick(value) → string` (B/M/K, integer ticks).
- `VolumeLabel` = `{index, text: 'HVE' | 'HVY'}`; `VolumeStats` = `{sma, labels}`.
- `computeVolumeStats(data, smaWindow, yearDays) → VolumeStats` — trailing 30-bar
  volume SMA + highest-volume-ever (HVE) / highest-in-year (HVY) markers.

### `src/utils/dateBarIndex.ts`

- `barIndexForDate(data, isoDate) → number | null` — binary search; nearest
  preceding bar on miss; null if out of range.
- `dateForBarIndex(data, idx) → string` — ISO date for an index, clamped.

### `src/utils/drawSeries.ts`

- `drawSeries(ctx, p: DrawSeriesParams) → void` — single-canvas painter for
  candles/bars + indicator lines (volume is now the `volume` subpane indicator,
  painted via `drawIndicators`); applies background gradient, `#chart-viewport`
  clip, and pan transform; clears the backing store each call. `drawIndicators`
  calls `def.draw(ctx, series, scale, config.settings, resolveColor, meta)`.
- `SeriesColors` = `{positive, negative}`; `DrawSeriesParams` — dpr, dimensions,
  scales (`xScale`, `yPrice`, `subpaneScales`), render slice bounds, chart type,
  colors, indicators, color resolver.

### `src/utils/resolveChartColors.ts`

- `createColorResolver(host: HTMLElement) → ColorResolver` — resolves CSS-variable
  expressions (`var(--chart-*)`, `color-mix()`) to concrete RGB via a hidden probe
  `<span>`; caches per expression; fallback `#888888`.
- `ColorResolver` = `{resolve(varExpr) → string; destroy()}`.

### `src/utils/toColumns.ts`

- `toColumns(bars) → OHLCVColumns` — transpose `Candle[]` to separate Float64Array
  columns; memoized on array identity.
- `OHLCVColumns` = `{o, h, l, c, v: Float64Array}`.

### `src/utils/toHex6.ts`

- `toHex6(color) → string` — normalize rgb/rgba/`color(srgb)`/hex to `#rrggbb`
  (alpha dropped); fallback `#888888`. For `<input type="color">`.

---

## Internal

### `src/internal/cn.ts`

- `cn(...parts) → string` — join truthy class-name parts with spaces.

---

## Config / build / tests

- **`package.json`** — `pnpm build` → `vite build`; `pnpm test` → `vitest run`.
  Entry `src/index.ts`. Peers kept external: react, react-dom, react/jsx-runtime,
  d3, lucide-react.
- **`vite.config.ts`** — library mode, ESM-only output; `vite-plugin-dts` with
  `rollupTypes` → single `dist/index.d.ts`; `cssCodeSplit: false` → one
  `dist/style.css`.
- **`vitest.config.ts`** — `node` environment; tests in `tests/**/*.test.ts`.
- **`tsconfig.json`** — ES2023, esnext + bundler resolution, strict, react-jsx,
  `emitDeclarationOnly`, rootDir `src`, outDir `dist`.
- **`pyproject.toml`** — Python dev tooling only (numpy/pandas/ta-lib) for TA-Lib
  reference fixtures; not shipped.
- **`config/talib_indicators.csv`** — catalog of ~158 TA-Lib indicators (columns:
  Group, Code, Name, Inputs, Description, Included); `Included=Yes` marks the ~40
  production indicators, the rest are reference.
- **`src/styles/chart-core.css`** — the public CSS token contract under
  `:where(:root)`: chart colors, SVG stroke aliases, TA-Lib overlay vars, subpane
  vars, price-stats panel vars (`--stats-*`), layout/surface/spacing/typography
  tokens. Bundled into `dist/style.css`.
- **`.github/workflows/build.yml`** — on push to `main`, runs `pnpm build`, rewrites
  package.json to be root-relative, and force-publishes `index.js` + `index.d.ts` +
  `style.css` + `package.json` to an orphan **`dist` branch**. Consumers install
  from `dist`.
- **`tests/`**:
  - `parity.test.ts` — 17 builtins match TA-Lib within 0.01, against
    `src/indicators/__fixtures__/talib_fixtures.json`.
  - `subpaneLayout.test.ts` — subpane height allocation (factors/userHeights/floor
    redistribution) + domain autofit (incl. `includeZero`) + `applySubpaneDrag` +
    the def-level `autofitKeys` selection seam (`rsLineDef.autofitKeys → ['rs']`).
  - `quarterlyResults.test.ts` — YoY growth matching, row→bar alignment + step fill,
    `compute.meta` row strings (currency/format), `domain`/`autofitKeys` switch on
    `display`, column spacing, settings colors.
  - `indicatorColors.test.ts` — EMA `deriveDefaults` band colors, override
    precedence + reset, `effectiveSettings` purity.
  - `toHex6.test.ts` — color-format normalization.
  - `stats.test.ts` — price-stats math: ATR parity + bands, short-history blank,
    fundamentals (FF%/PE/Mkt-Cap India·US), PE/guard edge cases, collapse.
  - `statsPosition.test.ts` — stats-panel drag geometry: clamp bounds + default
    top-right placement.
