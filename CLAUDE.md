# CLAUDE.md — chart-core

A small TypeScript + D3 React charting library: candlestick/bar charts with a
pluggable TA-Lib indicator framework, pattern overlays, and a CSS-variable theming
contract. ~50 source files under `src/`, public surface is the `src/index.ts` barrel.

## Commands

- `pnpm build` → `vite build` → `dist/index.js` + `dist/index.d.ts` + `dist/style.css`.
- `pnpm test` → `vitest run` (node environment, tests in `tests/**/*.test.ts`).
- `pnpm typecheck` → `tsc --noEmit` **and** `tsc -p tsconfig.e2e.json` (both configs).
- `pnpm test:e2e` → `playwright test` (real Chromium; the gesture behaviour-lock +
  contextmenu + touch specs in `e2e/`). These are the LOCAL gate — CI runs no tests,
  it only builds and force-publishes `dist` (see below), so run all three before a push.

## Dist-branch gotcha

Source is authored on **`main`**. On every push to `main`, CI
(`.github/workflows/build.yml`) compiles and **force-publishes** the built output to
an orphan **`dist` branch**, which is what consumers install. **Never hand-edit
`dist/`** and never commit to the `dist` branch — it is overwritten on the next push.

## Root-tracked docs (do not relocate)

`markdown/` is a **gitignored** working-notes dir. These three docs are deliberately
**root-tracked and must not be moved into `markdown/`** (doing so would silently
untrack them): `CLAUDE.md`, `README.md`, `CODEMAP.md`. There is no policy requiring
markdown to live in `markdown/`, so don't "tidy" these into it.

---

# Code Navigation

**Read [`CODEMAP.md`](./CODEMAP.md) first** for symbol-level location — it's the
per-file index of exported symbols and signatures. Consult the tables below before
any blind grep/glob.

The split is intentional: the routing table + glossary here are **pay-always**
(loaded every session, kept lean); deep per-symbol detail lives in `CODEMAP.md` as
**pay-per-use** (read on demand). Keep depth out of this file.

## Symptom → where to look

| If you need to…                                                               | Look in                                                                                                                                                                                                                                                                                     |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Add a new indicator                                                           | `src/indicators/builtins/` (new `*Def` with a `settingsSchema`), register via import in `src/indicators/registry.ts`; shared enum options in `src/indicators/settingsOptions.ts`                                                                                                            |
| Fix indicator math / TA-Lib parity                                            | `src/indicators/talibMath.ts`; verify with `tests/parity.test.ts` + `src/indicators/__fixtures__/talib_fixtures.json`                                                                                                                                                                       |
| Fix a wrong indicator color                                                   | `src/utils/resolveChartColors.ts`, `src/utils/toHex6.ts`; color-layer logic in `registry.ts` (`defaultConfigFor`); `tests/indicatorColors.test.ts`                                                                                                                                          |
| Edit global chart appearance at runtime (candle/bg/axis/crosshair/separators) | `src/appearance/{types,registry}.ts` (`ChartAppearance`, `APPEARANCE_DEFAULTS`, `effectiveAppearance`); `appearance`/`onAppearanceChange` Chart props; color-injection + `colorEpoch` in `Chart.tsx`; gear dialog `src/controls/SettingsDialog.tsx`, shared rows `src/controls/appearanceFields.tsx`; `tests/appearance.test.ts`             |
| Edit candle colour / opacity (double-click a candle)                          | `src/controls/CandleSettingsPopup.tsx` + `CandleRows` in `src/controls/appearanceFields.tsx` (edits the `--candle-up`/`--candle-down` tokens + `candle.opacity`, NOT the chart-wide `--chart-*` pair); routed from the `dblclick` in `Chart.tsx`                                             |
| Style an indicator line (width / dash / opacity, not just color)              | grouped `line` `SettingsField` (`src/indicators/types.ts`), expanded to 4 scalar sub-keys in `registry.ts` (`defaultsFromSchema`); `lineStyleFrom` in `src/indicators/lineSettings.ts`; `LINE_STYLE_OPTIONS`/`dashFor` in `src/indicators/settingsOptions.ts`; `tests/lineSettings.test.ts` |
| Style a pattern overlay (line/box/label colors, widths, opacities)            | `APPEARANCE_DEFAULTS.patterns`; renderers read `ctx.patternStyle[name]` + `ctx.resolveColor` (`src/patterns/renderers/*`, `mountChartPatternOverlay.ts`); `tests/patternStyle.test.ts`                                                                                                      |
| Add/share a settings UI control (number/enum/toggle/color/slider/line)        | `src/controls/SettingsFields.tsx` (shared field vocabulary, used by both legend popover + dialog)                                                                                                                                                                                           |
| Fix subpane height/layout                                                     | `src/indicators/subpaneLayout.ts` (per-pane `heightFactors`/`userHeights`); `tests/subpaneLayout.test.ts`                                                                                                                                                                                   |
| Resize/persist subpane heights (drag dividers)                                | `src/Chart.tsx` (`subpaneHeights`/`onSubpaneHeightsChange`, divider handles) + `applySubpaneDrag` in `src/indicators/subpaneLayout.ts`                                                                                                                                                      |
| Add/adjust the Quarterly Results pane                                         | `src/indicators/builtins/quarterlyResults.ts`; `quarterlyResults` Chart prop; `--qr-*` tokens; `tests/quarterlyResults.test.ts`                                                                                                                                                             |
| Adjust volume (bars/HVE-HVY/K-M-B axis)                                       | `src/indicators/builtins/volume.ts` (registered subpane indicator, key `volume`); `tests/volume.test.ts`; math in `src/utils/chartCalculations.ts` (`computeVolumeStats`)                                                                                                                   |
| Add/adjust a chart control                                                    | `src/controls/ChartControls.tsx`; zoom is the `src/controls/ZoomSlider.tsx` slider (replaced the range pills)                                                                                                                                                                              |
| Change the zoom-out cap / zoom slider / range marks                            | cap math in `src/utils/chartCalculations.ts` (`MIN_BAR_STEP_PX`, `maxVisibleBarsForWidth` — **pixels only, never snapped to a mark**, or the visual floor differs per interval); the mark ladder is separate and DERIVED from the series' measured cadence (`barsPerYear`, `RANGE_YEARS`, `rangeMarks`, `MIN_MARK_BARS`) — never a fixed daily table; enforced in `src/Chart.tsx` (`cappedVisibleBars` + correction effect + `onMaxVisibleBarsChange` + `onRangeMarksChange`); UI in `src/controls/ZoomSlider.tsx` (`marks` prop; its left end is the smallest surviving mark); `tests/zoomCap.test.ts`                                  |
| Fix x-axis tick density / label collisions                                     | the tick block in `src/Chart.tsx` Effect A — month-boundary candidates, falling back to year boundaries (and thinned) when the month set would breach `MIN_TICK_GAP_PX` against the live `step`; format `%b %y` vs `%Y`. Interval-agnostic by construction (it measures pixels)              |
| Fix a legend entry / live values                                              | `src/controls/IndicatorLegend.tsx`; the settings popover itself is `src/controls/IndicatorSettingsPopover.tsx` (shared with Chart's double-click panel), commit/reset in `src/indicators/applySettings.ts`                                                                                   |
| Make an object open its settings on double-click / fix a wrong-object hit     | `src/indicators/hitRegions.ts` (the region contract + `pickHitRegion`), the painters that declare (`src/indicators/draw.ts`, `builtins/{volume,quarterlyResults,stage2}.ts`, `drawCandles`/`drawBars` in `src/utils/drawSeries.ts`), routing in the `dblclick` handler in `Chart.tsx`; `tests/hitRegions.test.ts` |
| Adjust the price-stats panel                                                  | `src/stats/` (`computeStats.ts` math, `StatsPanel.tsx` panel, `position.ts` anchor geometry, `stats.module.css`); `--stats-*` tokens in `src/styles/chart-core.css`; `tests/stats.test.ts`, `tests/statsPosition.test.ts`, `e2e/stats.spec.ts`                                              |
| Add an overlay/annotation plugin                                              | `src/context.tsx` hooks (`useChartScale`, `useChartOverlayHost`) + `src/patterns/mountChartPatternOverlay.ts`                                                                                                                                                                               |
| Add a new pattern shape                                                       | `src/patterns/renderers/` (new renderer, reuse `_shared.ts` for chip/marker/`xForBar`) + register in `renderers/index.ts`; add a `*Style` to `appearance/types.ts` + default in `registry.ts` + section in `SettingsDialog.tsx` + barrel export in `index.ts`; smoke test in `tests/patternRenderers.test.ts` |
| Add/adjust a user drawing tool (trend/h-v line, ray, text, ruler)             | `src/drawings/` (pure: `types`/`defaults`/`projection`/`hitTest`/`rulerStats`/`interaction`; D3 mount `mountChartDrawingOverlay.ts` + `renderers/*`; popup `DrawingStylePopup.tsx` — opened by DOUBLE-click, a single click only selects); wired in `Chart.tsx` (overlay `pointerdown` 3-branch, `dblclick` router, the single pointer-owner effect drives the drag, mount + pan/rescale) + `ChartControls.tsx` (Draw ▾ dropdown); `tests/drawing*.test.ts` |
| Fix candle/bar rendering                                                      | `src/Chart.tsx`, `src/utils/drawSeries.ts` (volume is now the `volume` indicator, not here); wick thickness is `CANDLE_WICK_FRACTION` of the body in `appearance/registry.ts`, not a user setting                                                                                            |
| Fix pan / zoom / a held-pointer gesture (mouse, pen or touch)                 | `src/Chart.tsx` — every gesture runs on Pointer Events. The overlay `pointerdown` (Effect 4) arms it into `gestureRef` (see glossary); ONE document `pointermove`/`pointerup`/`pointercancel` owner effect drives pan/drawing-drag/y-rescale/pinch. Pinch arm is `src/gestures/pointerReducer.ts`; both wheel and pinch feed the single `applyZoomFactor`. `tests/pointerReducer.test.ts`, `e2e/{gesture-lock,gesture-hygiene,touch}.spec.ts` |
| Right-click / context menu (report the cursor's pane + price/value)          | `src/Chart.tsx` frame `contextmenu` listener → `onContextMenu` prop with a `ChartContextMenuInfo` payload; geometry via `classifyChartRegion` (`src/gestures/chartRegion.ts`) over `paneBandsRef`; no handler ⇒ native menu; chrome keeps its own menu via `data-chart-native-menu`; `e2e/contextmenu.spec.ts` |
| Change touch / pinch behaviour (drag-to-pan, pinch-zoom, no page scroll)     | `src/Chart.tsx` pointer owner (pinch branch) + `src/gestures/pointerReducer.ts`; drag-vs-click radius in `src/gestures/thresholds.ts` (10px touch); `touch-action:none` + `user-select:none` on `.chartSvg` (`src/Chart.module.css`); `e2e/touch.spec.ts` |
| Map a date ↔ bar index                                                        | `src/utils/dateBarIndex.ts`                                                                                                                                                                                                                                                                 |
| Change price/volume formatting or range presets                               | `src/utils/chartCalculations.ts`                                                                                                                                                                                                                                                            |
| Fix theming / a CSS variable not applying                                     | `src/styles/chart-core.css` (token contract) + README token tables                                                                                                                                                                                                                          |
| Make an export visible to consumers                                           | `src/index.ts` (the barrel — never deep-import)                                                                                                                                                                                                                                             |
| Fix a build/publish issue                                                     | `vite.config.ts`, `.github/workflows/build.yml`, the dist-branch note above                                                                                                                                                                                                                 |
| Change the data → columns transform                                           | `src/utils/toColumns.ts`                                                                                                                                                                                                                                                                    |
| Touch the pan-published geometry/scale                                        | `src/context.tsx` (`ChartScaleApi`, `createChartScaleApi`), consumed in `Chart.tsx`                                                                                                                                                                                                         |
| Change indicator compute primitives (legacy EMA/rolling)                      | `src/indicators/compute.ts`                                                                                                                                                                                                                                                                 |
| Change the indicator data model                                               | `src/indicators/types.ts` (`IndicatorDef`, `IndicatorConfig`, `IndicatorInput`)                                                                                                                                                                                                             |
| Add a chart-shell style                                                       | `src/Chart.module.css`                                                                                                                                                                                                                                                                      |

## Glossary → home module

- **Design tokens (two tiers)** — `src/styles/chart-core.css`. Tier 1 **primitives**
  (`--cc-*`, at the TOP of the file) record each raw value once; Tier 2 **semantic**
  tokens (`--chart-*`, `--ti-*`, `--stats-*`, `--text-*`, …) are `var(--cc-*)`
  aliases and are the only supported override surface. `--cc-*` is internal — never
  alias across roles or override it from an app. Canvas/`ctx.font` reach the tokens
  via the probe resolver (`createColorResolver` + `composeCanvasFont` in
  `src/utils/resolveChartColors.ts`); `tests/tokens.test.ts` locks "each value once",
  the name set, and that every semantic token still resolves to its pre-refactor hex.
- **Candle** — OHLCV bar (+ optional historical-high columns): `src/types.ts`.
- **ChartScaleApi / ChartScaleReason** — the stable, mutated-in-place scale &
  geometry object overlay plugins read and subscribe to; defined in `src/types.ts`,
  created/consumed via `useChartScale` in `src/context.tsx`.
- **Overlay host** — the `trade`/`trigger` SVG `<g>` zones plugins mount into,
  accessed via `useChartOverlayHost`: `src/context.tsx`.
- **IndicatorDef / registry** — the self-contained indicator definition
  (compute+draw+legend+domain over a typed `settingsSchema`) and its global
  key→def map: `src/indicators/types.ts` - `src/indicators/registry.ts`. Each def
  owns a free-form **settings blob**; the framework persists sparse
  `settingsOverrides` deltas and resolves the effective merge via
  `effectiveSettings` (base→derived→overrides). There is no `style.lines` — the
  old line list, `width`-as-flag, color-carrier lines, and `scaleHintFor` are gone.
- **Grouped `line` field** — a `SettingsField` kind whose `key` is a PREFIX that
  EXPANDS (in `defaultsFromSchema`) into four scalar sub-keys
  (`${key}Color/Width/Style/Opacity`) so storage stays scalar (preserving the
  shallow-spread `effectiveSettings`, EMA re-banding, and `'lineColor' in
settingsOverrides`). `lineStyleFrom` (`src/indicators/lineSettings.ts`) reads
  them into a `LineStyle`; the popover renders it via `LineField`. Applied only to
  polyline-drawn elements (not histograms/dots/volume bars).
- **ChartAppearance / appearance config** — the global user-editable visual
  contract (`src/appearance/types.ts`); the app persists a sparse `DeepPartial`
  delta (`AppearanceOverrides`) via the `onAppearanceChange` Chart prop and Chart
  resolves the merge over `APPEARANCE_DEFAULTS` via `effectiveAppearance`
  (`src/appearance/registry.ts`). Colors ride a `colors` map injected as inline
  `--<key>` CSS vars on the wrapper (zero draw-code change); non-color scalars
  (gradient/candle-opacity/axis/crosshair) thread explicitly into draw code.
  Pattern styling lives under `patterns[pattern_name]`. UI: the gear-triggered
  `src/controls/SettingsDialog.tsx` plus the focused
  `src/controls/CandleSettingsPopup.tsx`, both rendering the row builders in
  `src/controls/appearanceFields.tsx`; shared field controls in
  `src/controls/SettingsFields.tsx`.
- **Candle vs price colours** — `--candle-up`/`--candle-down` are the candle/bar
  body fills ALONE and default (in `src/styles/chart-core.css`) to
  `--chart-positive`/`--chart-negative`, which are the chart-wide price-direction
  pair also read by the OHLC readout, Volume's default bars, the `--qr-growth-*`
  aliases and the ruler. The Candles popup edits only the candle pair; the gear
  dialog's "Price up/down" rows edit the chart-wide one. An app that themes just
  the chart-wide pair still recolours the candles through the default chain, so
  the split needed no migration.
- **Hit region (paint-time)** — `src/indicators/hitRegions.ts`. Whatever paints a
  mark DECLARES the geometry it covered (`spanAt(g)`, `halfWidth`, `interpolate`)
  through the optional `scale.hit` sink, exactly as the drawing renderers hand
  back their hit closure; `drawSeries` returns every region in paint order and
  `pickHitRegion` walks them in reverse so the topmost mark wins. A line is tested
  by proximity, a filled mark by containment — conflating them is a bug. The
  shared painters in `src/indicators/draw.ts` declare on a def's behalf, so only a
  hand-painting def calls the sink itself; one that paints and declares nothing
  gets a dev-only `console.warn` (once per def key).
- **Panel wheel-scroll contract** — the chart wrapper owns a greedy, non-passive
  `wheel` listener (`Chart.tsx`) that `preventDefault()`s every wheel into a zoom,
  _anywhere_ over the chart surface (incl. floating legend/stats chrome). Any panel
  that floats over the chart must carry the `data-chart-wheel-scroll` attribute on
  its **root** element (so the _whole_ panel — header + body — is a no-zoom zone, not
  just the scroll area); its scroll body uses the shared `.panelScrollBody` style
  (`Chart.module.css`). The wrapper handler `closest()`-checks for the attribute and
  yields the wheel (native scroll then works on `.panelScrollBody`); otherwise the
  chart zoom hijacks the gesture. Used by `SettingsDialog`,
  `IndicatorSettingsPopover`, `CandleSettingsPopup` and `DrawingStylePopup`.
  A SEPARATE attribute, `data-chart-native-menu`, opts a floating child OUT of the
  right-click reporter so it keeps the browser's own context menu (the frame
  `contextmenu` listener `closest()`-checks for it, alongside `data-chart-legend` /
  `data-chart-stats`); it does not affect the wheel.
- **Gesture owner (`gestureRef`)** — the one held-pointer gesture, a tagged union
  `idle | pan | drawingDrag | yAxis | pinch` in `Chart.tsx`. `gestureBusy()` is the
  single "in flight?" predicate (used by the contextmenu bail + every skip-while-
  gesture site); placement is NOT folded in — it stays `draftRef` (holds no pointer
  between its two clicks). Every gesture runs on Pointer Events: the overlay/gutter
  `pointerdown` (Effect 4) arms it and `setPointerCapture`s the pointer; ONE document
  `pointermove`/`pointerup`/`pointercancel` owner effect dispatches by `kind`, runs
  the pointer-identity check once, aborts on `pointercancel`, and re-seeds after a
  pinch. A second finger over the plot turns a pan into a `pinch`, armed by the pure
  `reducePointers` (`src/gestures/pointerReducer.ts`); wheel + pinch share the one
  `applyZoomFactor` sink. Drag-vs-click radius: `src/gestures/thresholds.ts`.
- **ChartContextMenuInfo / onContextMenu** — the right-click report (`src/types.ts`):
  `{clientX, clientY, barIndex, date, price, value, pane}` where `pane` is a
  `ChartRegion` (`price | subpane | gutter | none`) from `classifyChartRegion`
  (`src/gestures/chartRegion.ts`, pure, over `paneBandsRef`); `price` XOR `value` is
  set by pane. No `onContextMenu` handler ⇒ the native menu shows; with one, the
  native menu is suppressed except over `data-chart-native-menu` chrome, and mid-
  gesture it suppresses the menu but emits no payload. `e2e/contextmenu.spec.ts`.
- **Subpane** — a named oscillator pane below the price pane (RSI, MACD…); layout in
  `src/indicators/subpaneLayout.ts`. Heights are user-draggable (divider handles in
  `Chart.tsx`, math in `applySubpaneDrag`), persisted via `subpaneHeights`.
- **RangeKey / range presets** — the named view widths
  `'3M'|'6M'|'1Y'|'2Y'|'3Y'|'5Y'` (declared identically in `src/types.ts` and
  `src/utils/chartCalculations.ts`; barrel re-exports the `types.ts` one) with bar
  counts in `RANGE_DAYS` (66/132/252/504/756/1260 trading days). They are the
  `ZoomSlider` marks (the old range pills are gone).
- **Zoom-out cap (readability)** — chart-core is the only layer that knows its live
  pixel width and the candle-spacing formula, so it OWNS and ENFORCES the upper
  limit on zoom-out. `maxVisibleBarsForWidth(containerWidth)`
  (`src/utils/chartCalculations.ts`) = largest `RANGE_DAYS` mark that fits while each
  bar slot stays ≥ `MIN_BAR_STEP_PX` (2px); `MIN_VISIBLE_BARS` (10) is the zoom-in
  floor. The cap is dynamic (rises on wider monitors → 3Y/5Y marks appear). `Chart.tsx`
  enforces it three ways: the wheel clamps to `maxBarsRef.current`, a post-measure
  correction effect clamps a too-wide host/persisted `visibleBars`, and a render-scope
  `cappedVisibleBars` feeds all three draw-geometry sites (layout memo, pan Effect 3,
  scaleApi publish) so no sub-readable frame ever paints. `onMaxVisibleBarsChange`
  surfaces the cap to the host (which can't read `containerWidth`) for the slider bound.
- **Quarterly results pane** — the `results` fundamentals subpane (RPS+EPS, core-
  computed YoY growth; Text/Bars modes): `src/indicators/builtins/quarterlyResults.ts`;
  fed by the `quarterlyResults` Chart prop (`QuarterlyResult[]` in `src/types.ts`).
- **Volume** — the `volume` subpane indicator, ported from the old hardcoded volume
  zone: `src/indicators/builtins/volume.ts`. Opt-in/toggleable like any oscillator
  (stacks first in `SUBPANE_ORDER`, directly below price); preserves the 4-bucket
  coloring, HVE/HVY labels, and K/M/B axis as user-editable settings. Consumers seed
  `defaultConfigFor('volume', { enabled: true })` to keep it on by default.
- **TA-Lib parity** — primitives matching TA-Lib exactly (seeding, lookback, Wilder
  smoothing, rounding): `src/indicators/talibMath.ts`.
- **Expanding max / rolling high** — all-history and windowed running maxima:
  `src/indicators/compute.ts`.
- **Pattern marker** — `{pattern_name, detected_on, markers}` detection data:
  `src/patterns/types.ts`; rendered by `src/patterns/renderers/`. The library
  renders **12** patterns: `high_tight_flag`, `base_breakout`, `consolidation`,
  `gap_up`, `volume_breakout`, `golden_cross`, `nr7`, `unusual_volume`,
  `volume_dryup`, `pocket_pivot`, `inside_day`, `pullback_to_ema`. chart-core only
  renders pre-detected markers; detection + marker-JSON are produced upstream
  (daily_scans `scan_cores.py` → finance_website `chart_patterns/orchestrator.py`).
  Shared chip/marker/`xForBar` helpers live in `renderers/_shared.ts`. The ordered,
  human-labelled catalog of all 12 (single source for the dropdown) lives in
  `src/patterns/catalog.ts` (`PATTERN_CATALOG`/`PATTERN_NAMES`). Per-pattern
  visibility is a controlled `visiblePatterns?: string[]` prop on both `Chart`
  (filters `effectivePatterns`) and `ChartControls` (the patterns dropdown);
  `undefined` ⇒ all visible (backward compat), gated behind the `patternsEnabled`
  master.
- **Stage 2** — the advancing-trend band indicator: `src/indicators/builtins/stage2.ts`.
- **RS line** — relative-strength vs. benchmark: `src/indicators/builtins/rsLine.ts`.
- **Price stats panel** — floating latest-bar fundamentals/ATR table (standalone
  toggle, not an indicator): `src/stats/`.
- **Drawing tools** — interactive, persisted annotations (trend lines, h/v lines,
  h/diagonal rays, text boxes, ruler): `src/drawings/`. Built as a CORE layer
  mounted by `Chart` (like the pattern overlay) because only `Chart` can suppress
  its own pan-drag `pointerdown` to claim the gesture. Anchors are `{date, price}`
  (survive warmup/reslice). Controlled via `drawings`/`onDrawingsChange` (fires once
  per placement/edit-commit/delete, never per drag frame; selection + in-flight
  draft are ephemeral `Chart` state) + `activeDrawingTool`/`onActiveDrawingToolChange`
  (host-held ephemeral, shared with `ChartControls`'s "Draw ▾" dropdown, like
  `patternsEnabled`). All shapes are `pointer-events:none`; the overlayRect keeps the
  `pointerdown` and `mountChartDrawingOverlay`'s `hitTest` does manual detection.
  Defaults live in `src/drawings/defaults.ts` + `--chart-drawing*` tokens, NOT in
  `ChartAppearance`. The `ruler` is a persistent drawing (saved/movable/deletable),
  not a transient measure.
- **Dist branch** — the CI-built, consumer-installed output branch (see dist-branch
  gotcha above and README).
