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
[Controls](#controls) · [Appearance](#appearance) · [Indicator framework](#indicator-framework) ·
[Built-in indicators](#built-in-indicators) · [Patterns](#patterns) ·
[Utils](#utils) · [Internal](#internal) · [Config / build / tests](#config--build--tests)

---

## Entry & types

### `src/index.ts`

Public barrel — the only import surface for consumers (never deep-import). Re-exports:

- `export * from './types'` → `Candle`, `QuarterlyResult`, `ChartType`, `AutoFitMode`,
  `RangeKey`, `RANGES`, `ChartScaleReason`, `ChartScaleApi`.
- From `utils/chartCalculations`: `RANGE_DAYS` (deprecated), `RANGE_YEARS`,
  `MIN_MARK_BARS`, `DEFAULT_BARS_PER_YEAR`, `DEFAULT_RANGE_MARKS`,
  `MIN_BAR_STEP_PX`, `MIN_VISIBLE_BARS`, `barsPerYear`, `rangeMarks`,
  `maxVisibleBarsForWidth`, `formatPrice`, `formatVolume`, `formatVolumeTick`,
  `computeVolumeStats`, types `RangeMark`, `VolumeLabel`, `VolumeStats`.
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
- From `indicators/hitRegions` (public now that `IndicatorDrawScale.hit` is part
  of the draw contract): types `HitRegion`, `HitRegionSpec`, `HitRegionSink`, and
  `CANDLE_SOURCE`, `REGION_HIT_TOLERANCE`, `FILLED_HIT_PAD`, `pickHitRegion`.
- TA-Lib primitives from `indicators/talibMath`: `sma`, `wma`, `emaTalib`, `dema`,
  `tema`, `maDispatch`, `rsi`, `rawStochK`, `computeDx` (=`dx`), `computeAdx`
  (=`adx`), `computeAtr` (=`atr`), `trueRange`, `stddevPop`, `rollingMin`,
  `rollingMax`, `wilderSmooth`, `wilderSum`.
- Per-indicator `*Settings` types from each builtin (`SmaSettings` …
  `TrangeSettings`, plus `RsSettings`, `Stage2Settings`,
  `QuarterlyResultsSettings`).
- `Chart` (default), `ChartControls` (default), `ZoomSlider` (default).
- From `drawings/types`: `DrawingShape`, `DrawingType`, `DrawingTool`,
  `DrawingAnchor`, `DrawingStyle`, the per-type drawing types, `normalizeDrawing`;
  from `drawings/defaults`: `DRAWING_DEFAULTS`, `effectiveDrawingStyle`. (The mount
  handle + renderers stay internal, like the pattern overlay.)
- From `context`: `useChartScale`, `useChartOverlayHost`, `useChartGeometry`,
  `useReportOverlayPriceBounds`, `useBackgroundPointerDown`, type `ChartOverlayLayer`.

### `src/types.ts`

- `Candle` — OHLCV bar: `{date, open, high, low, close, volume}` + optional
  precomputed historical highs (`high1y?`, `high2y?`, `high3y?`, `highAll?`) and
  deprecated `ema10?…ema200?` fields.
- `QuarterlyResult` — one reported fiscal period: `{label, date, eps?, rps?}`
  (consumed by the `results` subpane indicator via the `quarterlyResults` Chart prop).
- `ChartType` = `'candlestick' | 'bar'`; `AutoFitMode` = `'price' | 'priceAndOverlays'`.
- `RangeKey` = `'3M' | '6M' | '1Y' | '2Y' | '3Y' | '5Y'`; `RANGES` — the six keys
  as a const array (the zoom-slider's named range marks).
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
  `onMaxVisibleBarsChange` (surfaces the width-derived zoom-out cap; chart-core
  also self-enforces it — clamps the wheel, corrects a too-wide prop post-measure,
  and caps all draw geometry via a render-scope `cappedVisibleBars`),
  `onRangeMarksChange` (surfaces the series-derived `rangeMarks` ladder for a
  host-rendered `ZoomSlider` — the host has no series to measure),
  `panOffset`/`onPanOffsetChange`, `chartType`, `indicators`/`onIndicatorsChange`,
  `autoFitMode`/`onAutoFitModeChange`, `infoBarExpanded`/`onInfoBarExpandedChange`,
  `symbol`, `bare`, `priceFormatter`, `patterns`, `patternsEnabled`,
  `quarterlyResults` (Results subpane rows), `subpaneHeights`/`onSubpaneHeightsChange`
  (persisted per-pane drag heights), `children`. Owns canvas rendering, pan/zoom,
  the published `ChartScaleApi`, overlay hosts, the draggable subpane dividers, and
  the bundled pattern overlay. Only default export.
- **Double-click to edit** — the overlay rect (price pane AND subpanes) carries a
  `dblclick` that resolves, first hit wins: a drawing (`hitTest`), then a
  paint-time region (`pickHitRegion` over `hitRegionsRef`, the array `drawSeries`
  returns each repaint), else nothing. A `CANDLE_SOURCE` hit opens the Candles
  popup (only when `onAppearanceChange` is supplied), any other id opens that
  indicator's popover. The pointer is detranslated by `baseTranslateX` and the bar
  index derived exactly as the crosshair does it, INCLUDING its two bounds
  guards. A `justPlacedAtRef` timestamp swallows the dblclick that belongs to a
  drawing placement (by then the tool has already reset to `cursor`, so a
  tool-based guard cannot work).
- `CenterPanel` state — the one centred floating editor
  (`candles | indicator | drawing | null`); opening it closes the gear dialog and
  vice-versa. Subjects are held BY ID and re-resolved against the live
  `indicators` / `effectiveDrawings` at render, so a panel whose subject vanishes
  (legend `×`, Delete key, symbol switch) disappears on its own. Placement is the
  `.centeredPanel` class, applied alongside each popup's own surface class.

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
`panButtonClass`), auto-fit button, the legend + param-popover UI classes,
`.fieldResetBtn` (the per-field ↺, always visible — unlike the hover-revealed
`.legendBtn`), and
`.centeredPanel` (the double-click editors' centred placement + an explicit
`z-index: 4`, since a centred legend popover would otherwise inherit 3 and sit
under the drawing-popup layer).

---

## Controls

### `src/controls/ChartControls.tsx`

- `default ChartControls` (React.FC) — control panel: chart-type toggle, indicator
  picker (split into overlays vs. oscillators), patterns dropdown (master "Show
  patterns" + a checkbox per `PATTERN_CATALOG` entry), stats toggle. The old range
  pills were removed — zoom is now the `ZoomSlider` the host mounts in its header.
  Props: `chartType`/`onChartTypeChange`, `indicators`/`onIndicatorsChange`,
  `patternsEnabled`/`onPatternsToggle`, `visiblePatterns`/`onVisiblePatternsChange`
  (per-pattern visibility; undefined ⇒ all visible), `statsEnabled`/`onStatsToggle`,
  `className`. Uses `listIndicators()` + `defaultConfigFor()` to populate/seed.

### `src/controls/ZoomSlider.tsx`

- `default ZoomSlider` (React.FC) — range-input zoom control with named range
  marks (3M…20Y), replacing the old range pills. Props: `visibleBars`,
  `onVisibleBarsChange: (n) => void`, `maxVisibleBars` (the readability cap
  surfaced by Chart's `onMaxVisibleBarsChange`), `marks?` (the series-derived
  `RangeMark[]` from Chart's `onRangeMarksChange`; defaults to
  `DEFAULT_RANGE_MARKS`, the legacy daily ladder), `onPanReset?`.
  `max = maxVisibleBars` and `min` = the SMALLEST surviving mark (not a daily
  constant — on a weekly series the tightest mark is 1Y ≈ 52 bars, and a
  hardcoded 66 would both pin the left end at 66 *weeks* and filter that mark
  out); only marks whose `bars ≤ maxVisibleBars` render (D4 — no greyed marks). Landing on a
  mark's bar count calls `onPanReset?.()` (mirrors the old pill behavior). The
  track is **log-scaled** (the input operates in `ln(bars)` space, `step="any"`)
  so the roughly-doubling marks (66/132/252/504…) spread evenly instead of
  crowding the left edge.

### `src/controls/IndicatorLegend.tsx`

- `default IndicatorLegend` (React.FC) — on-chart legend with live values and the
  per-indicator param/color popover. Props: `indicators`/`onIndicatorsChange`,
  `resolved`, `subpanes`, `marginTop`, `marginLeft`, `barCount`,
  `expanded`/`onExpandedChange`, `subscribeHoverIndex`, `priceFormatter`,
  `resolveColor`. Subscribes to a hover index so only the legend re-renders on
  crosshair move. Live values + dot come from the def's `legend()`; the popover
  iterates `def.settingsSchema` (number/enum/toggle/color/**line** controls reading
  `config.settings`), commit/reset route through `defaultConfigFor` over
  `settingsOverrides`. Field components are imported from `SettingsFields.tsx`
  (extracted); `case 'line'` renders `LineField` whose four sub-controls each
  commit/reset a scalar `${key}X` key (no framework change). The popover itself
  lives in `IndicatorSettingsPopover.tsx` (shared with Chart's centred
  double-click panel); commit/reset delegate to `indicators/applySettings.ts`.
  Internal: `LegendBlock`.

### `src/controls/IndicatorSettingsPopover.tsx`

- `default IndicatorSettingsPopover` (React.FC) — the per-indicator settings
  popover, extracted from `IndicatorLegend` so BOTH the legend gear (anchored
  under its row via `.legendPopover`) and Chart's double-click panel (centred via
  `.centeredPanel`) render one implementation. Props: `config`, `def`,
  `onCommit`/`onReset`/`onResetKeys`, `resolveColor?`, `onClose`, `className?`,
  `style?`. Placement-agnostic; closes on outside-mousedown + Escape; root
  carries `data-chart-wheel-scroll`.

### `src/controls/CandleSettingsPopup.tsx`

- `default CandleSettingsPopup` (React.FC) — the focused "Candles" popup a
  double-click on a candle opens. Props: `appearance`, `onAppearanceChange`,
  `resolveColor`, `onClose`, `className?`, `style?`. Body is the shared
  `CandleRows` (up/down colour over the `--candle-up`/`--candle-down` tokens plus
  opacity), so it and the gear dialog's Candles section are one definition.

### `src/controls/appearanceFields.tsx`

- Shared appearance-editing vocabulary lifted out of `SettingsDialog`: the
  sparse-delta path helpers `getAt` / `setIn` / `deleteIn`, `makeAppearanceRows`
  (returns `eff`, `commit`, `reset`, `colorVarRow`, `colorRow`, `numberRow`,
  `sliderRow` bound to one `{appearance, onAppearanceChange, resolveColor}`), and
  `CandleRows` — the candle rows rendered by both the gear dialog and
  `CandleSettingsPopup`.

### `src/controls/SettingsFields.tsx`

- Shared settings-field control vocabulary (extracted from `IndicatorLegend`, reused
  by it + `SettingsDialog`): `NumberField`, `EnumField`, `ToggleField`, `ColorField`
  (swatch + hex + reset ↺), `SliderField` (0..1 range + readout), `LineField` (grouped
  TradingView-style row: color swatch · style select · width stepper · opacity
  slider · group reset, over a `line` field's four `${prefix}X` scalar sub-keys).
  Depends only on `Chart.module.css` + `toHex6`. The ↺ resets use
  `.fieldResetBtn`, NOT `.legendBtn` — the latter is chart chrome hidden until its
  `.legendItem` row is hovered, which left the reset permanently invisible in
  every surface that isn't the legend (gear dialog, Candles popup, drawing popup).

### `src/controls/SettingsDialog.tsx`

- `default SettingsDialog` (React.FC) — gear-triggered appearance dialog. Props:
  `appearance: AppearanceOverrides`, `onAppearanceChange`, `resolveColor`,
  `onClose`, `style?`. Sections: **Chart appearance** (price up/down — the
  chart-wide `--chart-positive`/`--chart-negative` pair, also read by the OHLC
  readout, Volume's default bars, the `--qr-growth-*` aliases and the ruler;
  background top/bottom/radius; axis color/opacity/tick; crosshair color/opacity/
  dash; separator/guide; a **Candles** group rendering the shared `CandleRows`)
  and **Patterns** (one group per `pattern_name`). Rows + path helpers come from
  `appearanceFields.tsx`; each control commits a sparse `AppearanceOverrides`
  delta via immutable `setIn`, per-field reset prunes the path (`deleteIn`). Mounted inside `Chart` (it owns
  `resolveColor` off `wrapperRef`), NOT `ChartControls`. Root carries
  `data-chart-wheel-scroll` (whole panel is a no-zoom zone) and the scroll body
  uses the shared `.panelScrollBody` class, so the wrapper's native wheel handler
  yields the wheel instead of zooming the chart (same contract on
  `IndicatorLegend`'s param popover root).

### `src/controls/AutoFitMenu.tsx`

- `default AutoFitMenu` (React.FC) — right-click checklist for the "A" auto-fit
  button; picks which contributor groups feed the price+overlays fit. Props:
  `contributors: {key,label}[]`, `excluded: string[]`, `onExcludedChange`,
  `onClose`, `style?`. Checked = included; toggling a row adds/removes its group
  key from the persisted `excluded` set (`'trade'`/`'trigger'`/an indicator
  `defKey`). Mirrors `SettingsDialog`'s click-outside (`mousedown`) + Escape close
  handling. Mounted inside `Chart` next to the "A" button; opened via the button's
  `onContextMenu` (only in `priceAndOverlays` mode with `priceZoom === 1`).

---

## Appearance

### `src/appearance/types.ts`

- `ChartAppearance` — the global visual contract: `colors: Record<string,string>`
  (CSS-var name without `--` → value; injected as inline custom props on the
  wrapper), plus non-color scalars `background {topColor, bottomColor, radius}`,
  `candle: CandleAppearance` (`{opacity}` — applied as `globalAlpha` around the
  candle/bar paint pass), `axis {opacity, tickSize}`, `crosshair {color, opacity,
  dash}`, and `patterns` (per-pattern styles). `CandleAppearance` is named once
  and referenced by `DrawSeriesParams` + Chart's draw-state cache too (the group
  passes through those untouched). Candle COLOURS are not here — they are the
  `--candle-up` / `--candle-down` tokens inside `colors`. The OHLC-bar geometry
  law is deliberately NOT here — it is baked in `registry.ts` (see
  `BAR_THICKNESS_STEPS`, `CANDLE_WICK_FRACTION`), since it describes renderer
  behaviour rather than a per-user preference.
- `BaseBreakoutStyle` / `ConsolidationStyle` / `HighTightFlagStyle` / `GapUpStyle` /
  `VolumeBreakoutStyle` / `GoldenCrossStyle` / `Nr7Style` / `UnusualVolumeStyle` /
  `VolumeDryupStyle` / `PocketPivotStyle` / `InsideDayStyle` / `PullbackToEmaStyle` —
  disjoint per-pattern field sets (each extends a shared `LabelStyle` chip).
  `PatternStyles` bundles all twelve.
- `AppearanceOverrides = DeepPartial<ChartAppearance>` — the ONLY persisted source
  (sparse delta); `DeepPartial<T>` is a local recursively-optional utility type.

### `src/appearance/registry.ts`

- `APPEARANCE_DEFAULTS: ChartAppearance` — the single source of baked defaults
  (migrated literals: bg `#776a5a`/`#6e7b8b` r12, axis 0.12/4, candle opacity 1,
  crosshair currentColor/0.3/'3,3', and all twelve patterns' consts); `colors`
  starts `{}`.
- `effectiveAppearance(overrides?) → ChartAppearance` — pure deep-merge defaults ←
  overrides (per-field reset = omit the key). The analogue of `effectiveSettings`.
  Unknown keys pass through, so a delta still carrying the removed
  `candle.wickWidth` is an inert orphan (no shim, no backfill).
- `BAR_THICKNESS_STEPS` / `BAR_STUB_FRACTION` / `CANDLE_WICK_FRACTION` — the
  OHLC-bar geometry law, read by `drawSeries.barMetrics` / `drawCandles`. Baked
  constants, NOT part of `ChartAppearance` and not user-editable: they describe
  renderer behaviour, not per-user taste. `CANDLE_WICK_FRACTION` (1/6) makes the
  wick track the BODY under zoom — floored at 1 CSS px (so the default ~250-bar
  view is byte-identical to the old fixed 1px wick) and capped at the body. Each
  is written exactly once; retuning means editing here and republishing.

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
- `SettingsField` — one typed editable setting: `color | number | enum | toggle |
line`. A `color` default is a `var()` expr; a user override is raw hex. A `line`
  field's `key` is a PREFIX (default `{color, width, style?, opacity?}`) that
  EXPANDS into four scalar sub-keys (`${key}Color/Width/Style/Opacity`) in
  `defaultsFromSchema` — storage stays scalar so the rest of the framework is
  unchanged. Read back into a `LineStyle` via `lineStyleFrom` (`lineSettings.ts`).
- `LegendRow` — `{color, value: string|null, label?}` (one live legend row).
- `DomainSpec` — subpane scale shape: `{fixedDomain?, guideLines?, zeroLine?,
autofitPadding?, includeZero?, topPadPx?, hideAxis?, tickFormat?}` (replaces the
  old `SubpaneScaleHint` + `scaleHintFor`; carries shape only — `autofitKeys` owns
  which series autofit).
- `IndicatorPane` = `'price' | {subpane: string}`.
- `IndicatorSeries` = `Record<string, Float64Array>` (one line per key; NaN = gap).
- `IndicatorInput` — `{o,h,l,c,v: Float64Array; bars; benchmarkClose?;
quarterlyResults?; market?; displayStart?}`.
- `IndicatorDrawScale` — adds `paneTop?/paneBottom?` (pixel band bounds), plus the
  device-space wiring: `hRatio`/`vRatio` (dots per CSS px), `originX`/`originY`
  (absolute device origin of the panned pane space) and `barSlot(g) →
  {left, width}` in device dots — all required, so a histogram subpane can paint
  on the price bar's own column. Plus the optional `hit: HitRegionSink` — the
  paint-time hit-region sink (see `hitRegions.ts`); the shared painters declare
  through it automatically, so only a hand-painting def calls it itself.

### `src/indicators/hitRegions.ts`

- Paint-time hit-region contract — the drawing tools' "whatever paints a mark
  declares the region it covered" model, extended to indicators and the candles.
  A region is a closure over the arrays + scale the painter already had (not a
  rasterised pick map) and is rebuilt every repaint, so it can never go stale.
  Coordinates are panned-local CSS px throughout.
- `HitRegion` — `{sourceId, spanAt(g) → [y0,y1] | null, halfWidth, interpolate}`.
  `spanAt` returning null is what makes gaps (a NaN, a zero-volume column, an
  unflagged bar) inert. `HitRegionSpec` = the same minus `sourceId` (stamped by
  `drawIndicators`); `HitRegionSink` = `{add(spec)}`.
- `CANDLE_SOURCE` — the price series' own `sourceId`.
- `REGION_HIT_TOLERANCE` (6) / `FILLED_HIT_PAD` (2) — line proximity vs filled
  forgiveness. Two DIFFERENT tests: a line is tested by proximity to the
  interpolated polyline, a filled mark by containment (`|mx − centre| ≤ min(step/2,
halfWidth + pad)` and `my` inside the padded span). The `step/2` clamp is what
  keeps a filled region out of the next bar's slot at any zoom.
- `pickHitRegion(mx, my, barIdx, regions, centerXAt, step, tolerance?)` — topmost
  region under the pointer, walking `regions` in REVERSE paint order so a later
  mark wins. The neighbour window for line-like regions is sized from `step`
  (`ceil(tolerance/step)`), so a near-vertical line is still hittable when bars
  are sub-pixel.
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
  schema (the single base-settings source). A `line` field expands to its four
  scalar sub-keys here; all other kinds map `f.key → f.default`.
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
  Each painter below (except `drawGuideLines`) also DECLARES what it covered via
  `scale.hit`, so the def gets double-click hit-testing for free.

- `drawPolyline(ctx, scale, values, style, defined)` — line painter; `defined`
  predicate breaks the line on NaN/false. Declares an `interpolate: true` region
  gated by the same `defined`, so the line's gaps are the region's gaps.
- `drawLines(ctx, series, scale, lines: {key, st}[])` — default multi-line painter
  (caller passes only real lines — no width-0 skip).
- `drawHistogram(ctx, scale, values, style, negColor?)` — bars from zero, dual
  color (MACD). Painted in bitmap space on `scale.barSlot(g)` — the price bar's
  own device column — not on `bandwidth`. Declares a filled zero→value region at
  the slot half-width.
- `drawGuideLines(ctx, scale, levels[], color, opts?)` — dashed horizontal guides
  (RSI 30/70, MACD zero line). Declares NOTHING, deliberately: decoration, not a
  clickable object.
- `drawDots(ctx, scale, values, style, marked, radius?)` — markers on selected bars
  (RS-line signals). Declares a filled region at the dot radius.

### `src/indicators/applySettings.ts`

- `withSettingOverride(indicators, id, key, value)` / `withSettingsReset(indicators,
id, keys)` — pure transforms over an indicator list, lifted out of
  `IndicatorLegend` so the legend gear and Chart's centred popover commit
  identically. Both recompute through `defaultConfigFor` (NOT a shallow spread) so
  param-derived defaults re-derive (EMA 10→100 re-bands its colour), and the reset
  drops every key in ONE pass (a per-key loop batches into last-write-wins and
  would clear only one).

### `src/indicators/settingsOptions.ts`

- `MA_TYPE_OPTIONS: {label, value}[]` — enum-field options for the `matype` selector
  (0=SMA, 1=EMA, 2=WMA, 3=DEMA, 4=TEMA); shared by BBANDS/STOCH/STOCHF/STOCHRSI.
- `LINE_STYLE_OPTIONS: {label, value}[]` — Solid(0)/Dashed(1)/Dotted(2) for the
  grouped `line` field's style sub-key. `dashFor(style) → number[] | null` maps it
  to a canvas dash array (solid→null, dashed→[4,3], dotted→[1,2]).

### `src/indicators/lineSettings.ts`

- `lineStyleFrom(s, prefix, resolveColor) → LineStyle` — build a resolved stroke
  style from a `line` field's four scalar sub-keys at `prefix`
  (`${prefix}Color/Width/Style/Opacity`); `style`→`dashFor`, color resolved via
  `resolveColor`. Used by every polyline builtin's `draw`.

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

| File                  | Settings type (params shown; every def also has color fields)                                                   | Computes                                                                                                                                                                                                                                                                                                            |
| --------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sma.ts`              | `SmaSettings {period, lineColor}`                                                                               | Simple moving average                                                                                                                                                                                                                                                                                               |
| `wma.ts`              | `WmaSettings {period, …}`                                                                                       | Linearly-weighted MA                                                                                                                                                                                                                                                                                                |
| `emaTalib.ts`         | `EmaTalibSettings {period, lineColor, labelColor}`                                                              | TA-Lib EMA; period-banded colors via `deriveDefaults` (10/20/50/200)                                                                                                                                                                                                                                                |
| `dema.ts`             | `DemaSettings {period, …}`                                                                                      | Double EMA                                                                                                                                                                                                                                                                                                          |
| `tema.ts`             | `TemaSettings {period, …}`                                                                                      | Triple EMA                                                                                                                                                                                                                                                                                                          |
| `rsi.ts`              | `RsiSettings {period, lineColor}`                                                                               | Wilder RSI (0–100); `domain` guides at 30/70                                                                                                                                                                                                                                                                        |
| `macd.ts`             | `MacdSettings {fast, slow, signal, macd, macdsignal, histUpColor, histDownColor}`                               | MACD line + signal + histogram (dual-color bars; `histDownColor` is a first-class field, no carrier)                                                                                                                                                                                                                |
| `bbands.ts`           | `BbandsSettings {period, nbdevup, nbdevdn, matype, upperColor, midColor, lowerColor}`                           | Bollinger Bands (MA ± n·stddev)                                                                                                                                                                                                                                                                                     |
| `stoch.ts`            | `StochSettings {fastk, slowk, slowk_matype, slowd, slowd_matype, kColor, dColor}`                               | Slow stochastic %K/%D; guides 20/80                                                                                                                                                                                                                                                                                 |
| `stochf.ts`           | `StochfSettings {fastk, fastd, fastd_matype, kColor, dColor}`                                                   | Fast stochastic; guides 20/80                                                                                                                                                                                                                                                                                       |
| `stochrsi.ts`         | `StochrsiSettings {timeperiod, fastk, fastd, fastd_matype, kColor, dColor}`                                     | Stochastic of RSI; guides 20/80                                                                                                                                                                                                                                                                                     |
| `willr.ts`            | `WillrSettings {period, lineColor}`                                                                             | Williams %R (−100..0); guides −20/−80                                                                                                                                                                                                                                                                               |
| `adx.ts`              | `AdxSettings {period, lineColor}`                                                                               | Average directional index (trend strength)                                                                                                                                                                                                                                                                          |
| `dx.ts`               | `DxSettings {period, lineColor}`                                                                                | Raw directional index                                                                                                                                                                                                                                                                                               |
| `atr.ts`              | `AtrSettings {period, lineColor}`                                                                               | Average true range (price units); plain-autofit (no `domain`)                                                                                                                                                                                                                                                       |
| `natr.ts`             | `NatrSettings {period, lineColor}`                                                                              | Normalized ATR (percent); plain-autofit                                                                                                                                                                                                                                                                             |
| `trange.ts`           | `TrangeSettings {lineColor}`                                                                                    | Per-bar true range (**no numeric params**)                                                                                                                                                                                                                                                                          |
| `rollingHigh.ts`      | `HighsSettings` (local; `color1y/2y/3y/All`)                                                                    | `highsDef` — data-backed 1Y/2Y/3Y/ATH highs read off `bars[].high*` columns                                                                                                                                                                                                                                         |
| `rsLine.ts`           | `RsSettings {lookback, lineColor, signalColor}`                                                                 | RS line (stock/benchmark, rebased to 100) + signal dots; `autofitKeys: ['rs']` excludes the 0/1 `signal`                                                                                                                                                                                                            |
| `stage2.ts`           | `Stage2Settings {smaPeriod, slopeLookback, slopeMin, minPeriods, bandColor}`                                    | Stage-2 advancing band (green price-pane band; `autofitKeys: []` so it never moves the price domain); declares a hit region gated to flagged bars, so the shaded runs are clickable and the gaps are not                                                                                                                                                                                                                |
| `quarterlyResults.ts` | `QuarterlyResultsSettings {display, epsColor, rpsColor, growthUpColor, growthDownColor, labelColor}`            | Quarterly Results subpane (RPS+EPS, core-computed YoY growth); Text/Bars via `display`; formatted rows ride `compute`'s `meta` (no WeakMap); `domain`/`autofitKeys` switch on `display`; `paneHeightFactor 1.7`; hit regions are mode-dependent — one per KEPT column (full pane band) in text mode, one per ANCHOR (the pair's extent) in bars mode, since bars draw for every anchor and only the labels thin                                                                                                     |
| `volume.ts`           | `VolumeSettings {smaPeriod, smaFade, milestones, standardOpacity, fadeOpacity, upColor, downColor, labelColor}` | Volume subpane indicator. Custom 4-bucket draw (up/down × above/below SMA, faded opacity); `volumeUp`/`volumeDown` autofit the pane; `volSma`/`volLabel` are data channels; HVE/HVY labels + K/M/B axis (`domain.tickFormat`); reads opacities from settings; `paneHeightFactor 1.154`; reuses `computeVolumeStats`; declares one hit region over its columns, null on the `volume <= 0` skip (the HVE/HVY labels above a bar are deliberately NOT covered) |

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

### `src/patterns/catalog.ts`

- `PatternCatalogEntry` = `{ name; label }`. `PATTERN_CATALOG: PatternCatalogEntry[]`
  — the ordered, human-labelled list of all 12 renderable patterns (order mirrors
  `renderers`); single source for the `ChartControls` patterns dropdown and the
  consumer's `visiblePatterns` seed. `PATTERN_NAMES = PATTERN_CATALOG.map(e => e.name)`.
  Map-sync guarded by `tests/patternCatalog.test.ts` (must equal `Object.keys(renderers)`).

### `src/patterns/renderers/index.ts`

- `RendererFn` = `(detection, target, labelTarget, ctx) => void`.
- `renderers: Record<string, RendererFn>` — dispatch table keyed by `pattern_name`
  (12 total): `high_tight_flag`, `base_breakout`, `consolidation`, `gap_up`,
  `volume_breakout`, `golden_cross`, `nr7`, `unusual_volume`, `volume_dryup`,
  `pocket_pivot`, `inside_day`, `pullback_to_ema`.

### `src/patterns/renderers/_shared.ts`

- Shared primitives for the nine added renderers (the original three keep their
  inline copies): `xForBar(idx, ctx)`, `drawLabelChip(labelTarget, {x, y, text,
  style, rc, center?})` (measured chip), `drawMarker(target, {x, y, kind, color,
  opacity?, rc})` (`MarkerKind` = `arrowUp|arrowDown|dot|diamond`), `chipHeight`,
  `MARKER_SIZE`/`LABEL_PADDING_*` consts.

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

### Added pattern renderers (price-pane overlays, all import `_shared`)

- `gapUp.ts` `renderGapUp(...)` — shaded band between `prev_high`↔`gap_low` over the
  gap bar + small rightward extension; label `Gap up · X%`.
- `volumeBreakout.ts` `renderVolumeBreakout(...)` — up-triangle below `anchor_low`;
  label `Vol breakout · Nx`.
- `goldenCross.ts` `renderGoldenCross(...)` — dot at `(cross_date, cross_price)`
  (EMA200 at cross); label `Golden cross`.
- `nr7.ts` `renderNr7(...)` — thin high/low range lines on the bar + down-arrow;
  label `NR7`.
- `unusualVolume.ts` `renderUnusualVolume(...)` — diamond at `anchor_low`; label
  `Unusual vol · Nx`.
- `volumeDryup.ts` `renderVolumeDryup(...)` — diamond at `anchor_low`; label
  `Volume dry-up`.
- `pocketPivot.ts` `renderPocketPivot(...)` — up-arrow at `anchor_low`; label
  `Pocket pivot`.
- `insideDay.ts` `renderInsideDay(...)` — mother-bar high/low lines over both bars +
  outlined inside-bar box; label `Inside day`.
- `pullbackToEma.ts` `renderPullbackToEma(...)` — dot at `(event_date, ema_value)` +
  short tick; label `Pullback to {ema_level}`.

---

## Drawing tools

Interactive, persisted annotations. Pure math + a D3 mount handle (mirrors the
pattern overlay), driven by `Chart` from the same pan/rescale sites. Controlled
via the `drawings`/`onDrawingsChange` + `activeDrawingTool`/`onActiveDrawingToolChange`
Chart props. All shapes are `pointer-events:none`; hit detection is manual.

### `src/drawings/types.ts`

- `DrawingAnchor` = `{date, price}` (date-anchored, survives warmup/reslice).
- `DrawingShape` = discriminated union on `type`: `trendline`/`ray`/`ruler` (`{a,b}`),
  `hline` (`{price}`), `vline` (`{date}`), `hray`/`text` (`{a}`). `DrawingBase` adds
  `id`, `locked?`, `style?: DrawingStyle`, `v?` (version tag).
- `DrawingType` / `DrawingTool` (= `DrawingType | 'cursor'`).
- `normalizeDrawing(raw) → DrawingShape | null` — read-tolerance: validates anchors,
  drops malformed payloads, ROUND-TRIPS unknown `type`s (forward-compat).

### `src/drawings/defaults.ts`

- `DRAWING_DEFAULTS` + `effectiveDrawingStyle(style?)` — pure sparse merge over the
  `--chart-drawing*` token colors. Defaults live here, NOT in `ChartAppearance`.

### `src/drawings/projection.ts`

- `ProjScale` snapshot; `xForDate`/`yForPrice` (`xForDate` left-clamps before the
  first bar but PROJECTS past the last bar into future empty space via
  `extraBarsForFutureDate * step`, never NaN), `dateForX` (left-clamps, else snaps
  to a real bar, else synthesizes a future date capped at ~`ceil(width/step)`
  bars)/`priceForY`, `projectAnchor`, `extendRay` (clips a forward ray to the
  price-pane box).

### `src/drawings/hitTest.ts`

- `HANDLE_RADIUS`/`HIT_TOLERANCE`; `Hit` = `{kind:'handle',index}|{kind:'body'}|null`.
  `distToSegment`, `hitSegment` (two-endpoint), `hitAnchoredSegment` (hray),
  `hitHLine`/`hitVLine`/`hitTextBox`. Pure, on already-projected pixels.

### `src/drawings/rulerStats.ts`

- `computeRulerStats(a,b,data) → {bars, priceDelta, pricePct, startDate, endDate,
  direction}` — order-independent bars, signed delta/%.

### `src/drawings/interaction.ts`

- `DraftState` (`idle`/`placing`/`dragging`); `reduceDrawing(state, ev, ctx) →
  {draft, commit?, selectId?, consumedPointer}` — the clicks-per-tool +
  pan-suppression state machine. `clicksFor`/`buildDrawing` helpers. The drag MOVE
  math lives in `Chart` (needs live scale); this owns place/start/commit/escape.

### `src/drawings/mountChartDrawingOverlay.ts`

- `mountChartDrawingOverlay(parent) → ChartDrawingOverlayHandle`
  (`update`/`updateScales`/`setTransform`/`setPointer`/`hitTest`/`destroy`). Three
  layers: clipped+panned (bodies), un-panned (`hline`), unclipped+panned (handles/
  chips/text). Per-frame wipe-and-rebuild; caches hit closures for `hitTest`.

### `src/drawings/renderers/{index,_shared,trendline,ray,hline,vline,hray,ruler,text}.ts`

- `drawDrawing(shape, layers, ctx) → DrawnHit` dispatch; each renderer draws into
  the right layer and returns a `(mx,my,tx)` hit closure. `_shared` has
  `dashArray`/`applyLine`/`drawHandle`. Unknown types draw nothing.

### `src/drawings/DrawingStylePopup.tsx`

- Per-drawing style popup (reuses `SettingsFields`); carries `data-chart-wheel-scroll`.
  Edits route through `onChange` (replace-by-id). `src/drawings/drawings.module.css`
  = popup chrome. Opened by a DOUBLE-click on a shape (a single click only
  selects) or, as a carve-out, by placing a `text` box so its field can be typed
  into immediately. Closes on outside-mousedown + Escape. `className?` lets Chart
  add `.centeredPanel`.

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

- `computeStats(combinedBars, statsTable, market, barsPerYear = 252) → StatsViewModel`
  — pure, React-free port of the "Price stats" Pine math. Reads the LAST index of
  the caller-built warmup+data history; mc uses the PRIOR close, PE the LAST close.
- `StatsViewModel` = `{rows: StatsRow[]}`; `StatsRow` = merged (colSpan-3) or cells
  (≤3); `StatsCell` = `{text, level}`; `StatsLevel` =
  `'strong'|'up'|'neutral'|'down'|'text'|'muted'`.
- ATR rows: `sma(trueRange/close, round(bpy × {1/2, 1/4, 1/12}))*100` — windows are
  fractions of a YEAR, so the 6M/3M/1M labels stay true on any interval (daily
  126/63/21, weekly 26/13/4). Display halves the value; color bands act on the full
  value and are scaled by `√(252 / bpy)` (√time volatility scaling — a weekly true
  range is ~√5× a daily one, so the raw 5/4/3 bands would mark everything `strong`).
  Blank when the last index is non-finite (short history, or ±Infinity from a zero
  close).

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
  `RANGE_DAYS` (**deprecated** — 66/132/252/504/756/1260, i.e. daily bar counts with
  252/yr baked into the name; still exported as public API),
  `RANGE_YEARS: Record<RangeKey, number>` (0.25…20 — the same ladder in CALENDAR
  years), `MIN_MARK_BARS = 30` (usability floor for a derived mark),
  `RangeMark = {key, bars}`, `DEFAULT_RANGE_MARKS` (the legacy daily ladder as marks).
- Interval-agnostic cadence measurement — the engine is bar-index based and holds no
  interval concept, so anything needing calendar meaning measures instead:
  `barsPerYear(data) → number` (365.25 ÷ MEAN calendar gap per bar; a *median* gap
  would report 365/yr for daily since most daily gaps are exactly 1 day. Daily
  measures 246–257, weekly ~52.2; falls back to `DEFAULT_BARS_PER_YEAR = 252` for
  <2 bars or unparseable dates), `rangeMarks(data, dataLength) → RangeMark[]`
  (`years × barsPerYear`, dropping marks below `MIN_MARK_BARS` or above
  `dataLength`). Daily renders `3M·6M·1Y·2Y` on a ~1200px pane, weekly
  `1Y·2Y·3Y·5Y·10Y`.
- Zoom-cap (readability) helpers — chart-core owns + enforces the zoom-out cap:
  `MIN_BAR_STEP_PX = 2` (min px per bar slot), `MIN_VISIBLE_BARS = 10` (zoom-in
  floor), `rawMaxVisibleBars(containerWidth) → floor((w − 78) / 2)` (raw pixel cap),
  `maxVisibleBarsForWidth(containerWidth) → max(MIN_VISIBLE_BARS, raw)`. **Width
  only — NOT snapped to a named mark.** Snapping made the cap depend on where the
  interval's ladder happens to have a rung, so each interval stopped at a different
  bar *width*: on a ~1700px pane daily reached 2.18px/bar (OHLC ticks suppressed,
  `drawSeries` draws them only at ≥3px) while weekly stopped at 3.11px with ticks
  drawn — and which one was restrictive flipped with the pane width. The `78` =
  `MARGIN.right(60) + RIGHT_BUFFER(18)` in `Chart.tsx` (kept in sync, documented there).
- `formatPrice(value) → string` (en-IN, 2dp); `formatVolume(value) → string`
  (B/M/K, 2dp); `formatVolumeTick(value) → string` (B/M/K, integer ticks).
- `VolumeLabel` = `{index, text: 'HVE' | 'HVY'}`; `VolumeStats` = `{sma, labels}`.
- `computeVolumeStats(data, smaWindow, yearDays) → VolumeStats` — trailing 30-bar
  volume SMA + highest-volume-ever (HVE) / highest-in-year (HVY) markers.

### `src/utils/dateBarIndex.ts`

- `barIndexForDate(data, isoDate) → number | null` — binary search; nearest
  preceding bar on miss; null if out of range.
- `dateForBarIndex(data, idx) → string` — ISO date for an index, clamped.
- `medianStepMs(data, lookback=20) → number` — median calendar-day gap (ms) of
  recent bars (weekend/holiday-robust); 1-day fallback under 2 bars.
- `futureDateForExtraBars(data, extraBars) → string` / `extraBarsForFutureDate(data,
  isoDate) → number` — inverse pair mapping bar-offsets past the last candle to
  zero-padded ISO dates; power the drawing projection's future-space anchors.

### `src/utils/drawSeries.ts`

- `drawSeries(ctx, p: DrawSeriesParams) → HitRegion[]` — single-canvas painter for
  candles/bars + indicator lines (volume is now the `volume` subpane indicator,
  painted via `drawIndicators`); clears the backing store each call, fills the
  background gradient unclipped, then paints TWO clipped passes via the
  `clipAndPan(ctx, p, bottomCss)` helper (clip + pan transform; the caller's
  `restore()` pops the clip, keeping the passes independent): the price pane
  (candles/bars + `drawIndicators(…, false)`) clipped to `marginTop +
  priceHeight`, matching the SVG `#chart-price-viewport`, so a manual price
  domain (y-axis scale drag / vertical body pan) can't paint into the subpanes;
  then the subpanes (`drawIndicators(…, true)`) under the full `#chart-viewport`
  clip, each subpane def self-clipping to its own band. `drawIndicators(ctx, p,
  subpaneOnly, regions)` filters defs by pane and calls
  `def.draw(ctx, series, scale, config.settings, resolveColor, meta)`, binding a
  FRESH `scale.hit` sink per config (so no def can mis-attribute a region) and
  dev-warning ONCE per def key (module-level seen-set, so a pan doesn't spam)
  when a def declared nothing. Returns every declared `HitRegion` in paint order
  — candles first, then price-pane indicators, then subpane ones — which is what
  `pickHitRegion`'s reversed walk turns into "the topmost mark wins".
  `drawCandles`/`drawBars` declare the price series' own region under
  `CANDLE_SOURCE` (high→low span; body half-width in candle mode, the wider
  `barSlotAt` stem+stubs width in bar mode) and apply `p.candle.opacity` as
  `globalAlpha` inside their save/restore block.
  The candle/bar pass runs in DEVICE-PIXEL space (`fillRect` on whole dots, clip
  bounds rounded to whole dots) so nothing antialiases; indicator lines stay in
  CSS space and stay antialiased, since they are diagonal.
- `barMetrics(step, hRatio, steps, stubFraction) → {markW, sideW, drawTicks}` —
  the whole bar zoom law in one pure function, in device dots: thickness climbs
  the ladder (floored at 1 CSS px, capped by the ladder's length), stub reach is
  a slot fraction independent of thickness (floored at one stem width), stubs
  switch off below 3 CSS px of spacing. `barRects(d, cx, m, yDev)` turns that into
  the stem + stub rectangles; `barSlotAt` is the shared column histogram subpanes
  paint into (and the bar-mode candle region's width). The candle WICK is derived
  here too — `CANDLE_WICK_FRACTION` of the body, floored at 1 CSS px and capped
  at the body — so it scales with zoom instead of staying a hairline.
  The ladder + stub fraction come from the baked `BAR_THICKNESS_STEPS` /
  `BAR_STUB_FRACTION` constants in `appearance/registry` — not from appearance,
  not user-tunable, and each written exactly once.
- `SeriesColors` = `{positive, negative}`; `DrawSeriesParams` — `hRatio`/`vRatio`
  (device dots per CSS px, per axis, from the real backing-store size), dimensions,
  scales (`xScale`, `yPrice`, `subpaneScales`), `bandwidth` + `step`, render slice
  bounds, chart type, colors, `candle` appearance, indicators, color resolver.

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
