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

- `export * from './types'` → `Candle`, `ChartType`, `AutoFitMode`, `RangeKey`,
  `RANGES`, `ChartScaleReason`, `ChartScaleApi`.
- From `utils/chartCalculations`: `RANGE_DAYS`, `formatPrice`, `formatVolume`,
  `formatVolumeTick`, `computeVolumeStats`, types `VolumeLabel`, `VolumeStats`.
- From `patterns/types`: `PatternMarker`.
- From `utils/dateBarIndex`: `barIndexForDate`, `dateForBarIndex`.
- `panButtonClass: string` — hashed CSS class of the reset-pan button (from
  `Chart.module.css`), re-exported so overlay plugins reuse the bundled styling.
- From `indicators/registry`: `registerIndicator`, `getIndicator`,
  `listIndicators`, `defaultConfigFor`, `formatIndicatorParams`, `OVERLAY_ORDER`,
  `SUBPANE_ORDER`.
- From `indicators/compute`: `computeEMA`, `computeRollingHigh`, `computeExpandingMax`.
- Indicator types from `indicators/types`: `IndicatorDef`, `IndicatorConfig`,
  `IndicatorSeries`, `IndicatorStyle`, `IndicatorLineStyle`, `IndicatorPane`,
  `SubpaneScaleHint`, `IndicatorInput`, `ResolvedIndicator`, `ParamSpec`,
  `ColorOverrides`.
- TA-Lib primitives from `indicators/talibMath`: `sma`, `wma`, `emaTalib`, `dema`,
  `tema`, `maDispatch`, `rsi`, `rawStochK`, `computeDx` (=`dx`), `computeAdx`
  (=`adx`), `computeAtr` (=`atr`), `trueRange`, `stddevPop`, `rollingMin`,
  `rollingMax`, `wilderSmooth`, `wilderSum`.
- Per-indicator `*Params` types from each builtin (`SmaParams` … `TrangeParams`,
  plus `RsParams`, `Stage2Params`).
- `Chart` (default), `ChartControls` (default).
- From `context`: `useChartScale`, `useChartOverlayHost`, `useChartGeometry`,
  `useReportOverlayPriceBounds`, `useBackgroundPointerDown`, type `ChartOverlayLayer`.

### `src/types.ts`

- `Candle` — OHLCV bar: `{date, open, high, low, close, volume}` + optional
  precomputed historical highs (`high1y?`, `high2y?`, `high3y?`, `highAll?`) and
  deprecated `ema10?…ema200?` fields.
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
  `symbol`, `bare`, `priceFormatter`, `patterns`, `patternsEnabled`, `children`.
  Owns canvas rendering, pan/zoom, the published `ChartScaleApi`, overlay hosts,
  and the bundled pattern overlay. Only default export.

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
  crosshair move. Internal: `NumberField`, `EnumField`, `ColorField`,
  `ParamPopover`, `LegendBlock`.

---

## Indicator framework

### `src/indicators/types.ts`

- `IndicatorDef<P>` — the unit of modularity. Fields: `key`, `label`,
  `longLabel?`, `pane`, `defaultParams`, `warmupBars(params) → number`,
  `compute(input, params) → IndicatorSeries`, `draw(ctx, series, scale, style)`,
  `defaultStyle`, `defaultLineColor?(params, seriesKey)`, `formatParams?(params)`,
  `paramSpecs?`.
- `IndicatorPane` = `'price' | {subpane: string; scaleHint?: SubpaneScaleHint}`.
- `SubpaneScaleHint` — `{fixedDomain?, guideLines?, zeroLine?, autofitPadding?}`.
- `IndicatorSeries` = `Record<string, Float64Array>` (one line per key; NaN = gap).
- `IndicatorInput` — `{o,h,l,c,v: Float64Array; bars: readonly Candle[]; benchmarkClose?}`.
- `IndicatorConfig` — resolved user instance: `{id, defKey, params, label, enabled,
style, colorOverrides?}`.
- `ParamSpec` — number/enum control spec driving the legend popover.
- Also home of `ResolvedIndicator`, `IndicatorStyle`, `IndicatorLineStyle`,
  `ColorOverrides` (re-exported from the barrel).

### `src/indicators/registry.ts`

- `registerIndicator<P>(def) → void` — register a def in the global key→def map.
- `getIndicator(key) → IndicatorDef<any> | undefined` — lookup by key (`ti:*` for
  TA-Lib defs, e.g. `ti:ema`; legacy keys unprefixed, e.g. `highs`, `rs`).
- `listIndicators() → IndicatorDef[]`.
- `defaultConfigFor(defKey, overrides?) → IndicatorConfig | undefined` — factory:
  def defaults + color factory + user overrides → a resolved `IndicatorConfig`.
- `formatIndicatorParams(config) → string` — delegates to the def's `formatParams`
  hook (e.g. MACD → `"12,26,9"`).
- `OVERLAY_ORDER` / `SUBPANE_ORDER: string[]` — canonical picker/stacking order.
- Imports every builtin so they self-register on module load. Color resolution is
  three-tier: `defaultStyle` → `defaultLineColor()` factory (params-aware) →
  user `colorOverrides[seriesKey]`.

### `src/indicators/compute.ts`

Legacy, non-TA-Lib compute helpers (also part of the public barrel):

- `computeEMA(close, span) → Float64Array` — pandas-seeded EMA (`α=2/(span+1)`,
  resets on NaN).
- `computeRollingHigh(high, window) → Float64Array` — O(N) rolling max via
  monotonic deque, `min_periods=1`.
- `computeExpandingMax(high) → Float64Array` — all-history running max (ATH).

### `src/indicators/draw.ts`

Canvas painters shared by builtin `draw` hooks:

- `drawPolyline(ctx, scale, values, style, defined)` — line painter; `defined`
  predicate breaks the line on NaN/false.
- `drawLines(ctx, series, scale, style[])` — default multi-line painter (skips
  width=0 marker series).
- `drawHistogram(ctx, scale, values, style, negColor?)` — bars from zero, dual
  color (MACD).
- `drawGuideLines(ctx, scale, levels[], color, opts?)` — dashed horizontal guides
  (RSI 30/70, MACD zero line).
- `drawDots(ctx, scale, values, style, marked, radius?)` — markers on selected bars
  (RS-line signals).

### `src/indicators/paramSpecs.ts`

- `MA_TYPE_OPTIONS: {label, value}[]` — enum options for the `matype` selector
  (0=SMA, 1=EMA, 2=WMA, 3=DEMA, 4=TEMA); shared by BBANDS/STOCH/STOCHF/STOCHRSI.

### `src/indicators/subpaneLayout.ts`

- `computeSubpaneBands(params) → SubpaneBandsResult` — D1 height policy: each active
  subpane gets a fixed share with gaps; the price pane shrinks toward `floorRatio`,
  leftover splits equally (min ~4px each).
- `computeSubpaneDomain(params) → [number, number] | null` — autofit domain:
  `fixedDomain` wins, else scan non-marker lines, optionally force symmetry about
  zero, apply padding.
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

`src/indicators/builtins/*.ts` — 20 files. **Shared shape:** each exports a `*Params`
type **and** a `*Def: IndicatorDef<*Params>` const that self-registers via the
registry import. Two exceptions noted below. Each is a thin wrapper over
`talibMath` primitives (compute) + `draw` helpers (render).

| File             | Params type                                                     | Computes                                                                              |
| ---------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `sma.ts`         | `SmaParams {period}`                                            | Simple moving average                                                                 |
| `wma.ts`         | `WmaParams {period}`                                            | Linearly-weighted MA                                                                  |
| `emaTalib.ts`    | `EmaTalibParams {period}`                                       | TA-Lib EMA; period-banded factory colors (10/20/50/200)                               |
| `dema.ts`        | `DemaParams {period}`                                           | Double EMA                                                                            |
| `tema.ts`        | `TemaParams {period}`                                           | Triple EMA                                                                            |
| `rsi.ts`         | `RsiParams {period}`                                            | Wilder RSI (0–100); guides at 30/70                                                   |
| `macd.ts`        | `MacdParams {fast, slow, signal}`                               | MACD line + signal + histogram (dual-color bars)                                      |
| `bbands.ts`      | `BbandsParams {period, nbdevup, nbdevdn, matype}`               | Bollinger Bands (MA ± n·stddev)                                                       |
| `stoch.ts`       | `StochParams {fastk, slowk, slowk_matype, slowd, slowd_matype}` | Slow stochastic %K/%D; guides 20/80                                                   |
| `stochf.ts`      | `StochfParams {fastk, fastd, fastd_matype}`                     | Fast stochastic; guides 20/80                                                         |
| `stochrsi.ts`    | `StochrsiParams {timeperiod, fastk, fastd, fastd_matype}`       | Stochastic of RSI; guides 20/80                                                       |
| `willr.ts`       | `WillrParams {period}`                                          | Williams %R (−100..0); guides −20/−80                                                 |
| `adx.ts`         | `AdxParams {period}`                                            | Average directional index (trend strength)                                            |
| `dx.ts`          | `DxParams {period}`                                             | Raw directional index                                                                 |
| `atr.ts`         | `AtrParams {period}`                                            | Average true range (price units)                                                      |
| `natr.ts`        | `NatrParams {period}`                                           | Normalized ATR (percent)                                                              |
| `trange.ts`      | `TrangeParams = Record<string, never>`                          | Per-bar true range (**no user params**)                                               |
| `rollingHigh.ts` | **(no `*Params` type)**                                         | `highsDef` — data-backed 1Y/2Y/3Y/ATH highs read off `bars[].high*` columns           |
| `rsLine.ts`      | `RsParams {lookback}`                                           | RS line (stock/benchmark, rebased to 100) + signal dots; uses `input.benchmarkClose`  |
| `stage2.ts`      | `Stage2Params {smaPeriod, slopeLookback, slopeMin, minPeriods}` | Stage-2 advancing band (green price-pane band; width=0 marker, excluded from autofit) |

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

- `drawSeries(ctx, p: DrawSeriesParams) → void` — single-canvas painter for volume
  bars + candles/bars + indicator lines; applies background gradient,
  `#chart-viewport` clip, and pan transform; clears the backing store each call.
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
  vars, layout/surface/spacing/typography tokens. Bundled into `dist/style.css`.
- **`.github/workflows/build.yml`** — on push to `main`, runs `pnpm build`, rewrites
  package.json to be root-relative, and force-publishes `index.js` + `index.d.ts` +
  `style.css` + `package.json` to an orphan **`dist` branch**. Consumers install
  from `dist`.
- **`tests/`**:
  - `parity.test.ts` — 17 builtins match TA-Lib within 0.01, against
    `src/indicators/__fixtures__/talib_fixtures.json`.
  - `subpaneLayout.test.ts` — subpane height allocation + domain autofit.
  - `indicatorColors.test.ts` — EMA period-band colors, override precedence, no
    shared mutation of def singletons.
  - `toHex6.test.ts` — color-format normalization.
