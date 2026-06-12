# CLAUDE.md — chart-core

A small TypeScript + D3 React charting library: candlestick/bar charts with a
pluggable TA-Lib indicator framework, pattern overlays, and a CSS-variable theming
contract. ~50 source files under `src/`, public surface is the `src/index.ts` barrel.

## Commands

- `pnpm build` → `vite build` → `dist/index.js` + `dist/index.d.ts` + `dist/style.css`.
- `pnpm test` → `vitest run` (node environment, tests in `tests/**/*.test.ts`).

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

| If you need to…                                          | Look in                                                                                                                                            |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Add a new indicator                                      | `src/indicators/builtins/` (new `*Def`), register via import in `src/indicators/registry.ts`; param UI specs in `src/indicators/paramSpecs.ts`     |
| Fix indicator math / TA-Lib parity                       | `src/indicators/talibMath.ts`; verify with `tests/parity.test.ts` + `src/indicators/__fixtures__/talib_fixtures.json`                              |
| Fix a wrong indicator color                              | `src/utils/resolveChartColors.ts`, `src/utils/toHex6.ts`; color-layer logic in `registry.ts` (`defaultConfigFor`); `tests/indicatorColors.test.ts` |
| Fix subpane height/layout                                | `src/indicators/subpaneLayout.ts` (per-pane `heightFactors`/`userHeights`); `tests/subpaneLayout.test.ts`                                          |
| Resize/persist subpane heights (drag dividers)           | `src/Chart.tsx` (`subpaneHeights`/`onSubpaneHeightsChange`, divider handles) + `applySubpaneDrag` in `src/indicators/subpaneLayout.ts`             |
| Add/adjust the Quarterly Results pane                    | `src/indicators/builtins/quarterlyResults.ts`; `quarterlyResults` Chart prop; `--qr-*` tokens; `tests/quarterlyResults.test.ts`                    |
| Adjust volume (bars/HVE-HVY/K-M-B axis)                  | `src/indicators/builtins/volume.ts` (registered subpane indicator, key `volume`); `tests/volume.test.ts`; math in `src/utils/chartCalculations.ts` (`computeVolumeStats`) |
| Add/adjust a chart control                               | `src/controls/ChartControls.tsx`                                                                                                                   |
| Fix a legend entry / live values                         | `src/controls/IndicatorLegend.tsx`                                                                                                                 |
| Adjust the price-stats panel                             | `src/stats/` (`computeStats.ts` math, `StatsPanel.tsx` panel, `stats.module.css`); `--stats-*` tokens in `src/styles/chart-core.css`; `tests/stats.test.ts` |
| Add an overlay/annotation plugin                         | `src/context.tsx` hooks (`useChartScale`, `useChartOverlayHost`) + `src/patterns/mountChartPatternOverlay.ts`                                      |
| Add a new pattern shape                                  | `src/patterns/renderers/` (new renderer) + register in `renderers/index.ts`                                                                        |
| Fix candle/bar rendering                                 | `src/Chart.tsx`, `src/utils/drawSeries.ts` (volume is now the `volume` indicator, not here)                                                        |
| Map a date ↔ bar index                                   | `src/utils/dateBarIndex.ts`                                                                                                                        |
| Change price/volume formatting or range presets          | `src/utils/chartCalculations.ts`                                                                                                                   |
| Fix theming / a CSS variable not applying                | `src/styles/chart-core.css` (token contract) + README token tables                                                                                 |
| Make an export visible to consumers                      | `src/index.ts` (the barrel — never deep-import)                                                                                                    |
| Fix a build/publish issue                                | `vite.config.ts`, `.github/workflows/build.yml`, the dist-branch note above                                                                        |
| Change the data → columns transform                      | `src/utils/toColumns.ts`                                                                                                                           |
| Touch the pan-published geometry/scale                   | `src/context.tsx` (`ChartScaleApi`, `createChartScaleApi`), consumed in `Chart.tsx`                                                                |
| Change indicator compute primitives (legacy EMA/rolling) | `src/indicators/compute.ts`                                                                                                                        |
| Change the indicator data model                          | `src/indicators/types.ts` (`IndicatorDef`, `IndicatorConfig`, `IndicatorInput`)                                                                    |
| Add a chart-shell style                                  | `src/Chart.module.css`                                                                                                                             |

## Glossary → home module

- **Candle** — OHLCV bar (+ optional historical-high columns): `src/types.ts`.
- **ChartScaleApi / ChartScaleReason** — the stable, mutated-in-place scale &
  geometry object overlay plugins read and subscribe to; defined in `src/types.ts`,
  created/consumed via `useChartScale` in `src/context.tsx`.
- **Overlay host** — the `trade`/`trigger` SVG `<g>` zones plugins mount into,
  accessed via `useChartOverlayHost`: `src/context.tsx`.
- **IndicatorDef / registry** — the self-contained indicator definition
  (compute+draw+style+params) and its global key→def map: `src/indicators/types.ts`
  - `src/indicators/registry.ts`.
- **Subpane** — a named oscillator pane below the price pane (RSI, MACD…); layout in
  `src/indicators/subpaneLayout.ts`. Heights are user-draggable (divider handles in
  `Chart.tsx`, math in `applySubpaneDrag`), persisted via `subpaneHeights`.
- **Quarterly results pane** — the `results` fundamentals subpane (RPS+EPS, core-
  computed YoY growth; Text/Bars modes): `src/indicators/builtins/quarterlyResults.ts`;
  fed by the `quarterlyResults` Chart prop (`QuarterlyResult[]` in `src/types.ts`).
- **Volume** — the `volume` subpane indicator, ported from the old hardcoded volume
  zone: `src/indicators/builtins/volume.ts`. Opt-in/toggleable like any oscillator
  (stacks first in `SUBPANE_ORDER`, directly below price); preserves the 4-bucket
  coloring, HVE/HVY labels, and K/M/B axis as user-toggleable params. Consumers seed
  `defaultConfigFor('volume', { enabled: true })` to keep it on by default.
- **TA-Lib parity** — primitives matching TA-Lib exactly (seeding, lookback, Wilder
  smoothing, rounding): `src/indicators/talibMath.ts`.
- **Expanding max / rolling high** — all-history and windowed running maxima:
  `src/indicators/compute.ts`.
- **Pattern marker** — `{pattern_name, detected_on, markers}` detection data:
  `src/patterns/types.ts`; rendered by `src/patterns/renderers/`.
- **Stage 2** — the advancing-trend band indicator: `src/indicators/builtins/stage2.ts`.
- **RS line** — relative-strength vs. benchmark: `src/indicators/builtins/rsLine.ts`.
- **Price stats panel** — floating latest-bar fundamentals/ATR table (standalone
  toggle, not an indicator): `src/stats/`.
- **Dist branch** — the CI-built, consumer-installed output branch (see dist-branch
  gotcha above and README).
