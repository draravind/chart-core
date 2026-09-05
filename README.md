# @draravind/chart-core

Reusable, project-agnostic D3 candlestick/OHLC chart engine: candles & bars,
volume, a pluggable indicator framework (EMA, rolling highs, …), and an overlay
host for drawing trade/trigger/pattern annotations on top of the chart.

It has **zero application coupling** — no data fetching, no routing, no app
types. You feed it an array of bars and style it with CSS variables.

## Distribution model (no version numbers)

This package is consumed as a **git dependency that follows a build branch**:

```
main branch  → human-authored TS/CSS source (develop the chart here)
   ↓  push to main triggers GitHub Actions
dist branch  → compiled output ONLY: index.js (ESM) + index.d.ts + style.css
               + a minimal root-relative package.json (no build/prepare scripts)
```

Consumers install from `dist`, so there is **zero on-arrival build** — pnpm
packs the prebuilt files as-is. Pull the latest fix with a one-step update; there
are no semver tags.

## Install

```jsonc
// package.json
{
  "dependencies": {
    "@draravind/chart-core": "git+ssh://git@github.com/draravind/chart-core.git#dist"
  }
}
```

```bash
pnpm install
```

Peer dependencies (bring your own copy — they are externalized in the build):
`react >=18`, `react-dom >=18`, `d3 ^7`, `lucide-react ^1.8.0`.

### Refresh to the latest fix

```bash
pnpm update @draravind/chart-core
```

Re-resolves the `dist` tip — whatever was last built from `main`.

## Usage

```tsx
import { Chart } from '@draravind/chart-core';
import '@draravind/chart-core/style.css'; // once, at your app entry

const data = [
  { date: '2024-01-01', open: 100, high: 105, low: 99, close: 104, volume: 12000 },
  // …
];

<Chart data={data} />;
```

### Sizing — the chart fills its box exactly

The chart is a **pure function of its container box**: it measures the box it is
given and draws to fill it exactly — the box's bottom edge is the x-axis line, its
right edge is the y-axis line, and the floating controls sit flush in that corner.
A **smaller box makes a smaller chart, not a clipped one** (re-draw-to-fit, the
TradingView / Highcharts / ECharts behaviour). There is no internal minimum height.

So the one thing a consumer must do is **give the chart a box with a definite
height**. The wrapper is `height: 100%` and carries no `min-height`, so its height
comes entirely from the parent — and a percentage height only resolves against a
parent whose height is itself definite. A bare `min-height` on a plain block is
**not** enough (it leaves the parent's `height` as `auto`, so the wrapper collapses
to 0). Two patterns that work:

```css
/* A — fixed height (simplest). */
.myChartArea { height: 480px; }

/* B — reserve space (CLS) yet let it grow: a flex column, chart fills. */
.myChartArea { min-height: 346px; display: flex; flex-direction: column; }
.myChartArea > * { flex: 1; }   /* the <Chart> wrapper is the single child */
```

Pattern B is what a consumer wants when the height should track a resizable layout
(a draggable split, a responsive shell) while still reserving space up front.

Alternatively, pass an explicit size — which sidesteps container sizing entirely and
also lets the chart size itself where a container measures 0 (SSR, jsdom):

```tsx
<Chart data={data} width={800} height={480} />
```

`width` / `height` are **per-axis overrides**: a provided value wins over the
measured box for that axis; omit both to size purely from the container. Below
~78px of width the chart declines to draw (too narrow for a single bar) and warns
in dev — give it a real size.

### The data contract — `Candle`

```ts
type Candle = {
  date: string;   // ISO date, ascending
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  // optional, indicator-backed columns (omit if you don't have them):
  ema10?: number; ema20?: number; ema50?: number; ema200?: number;
  high1y?: number; high2y?: number; high3y?: number; highAll?: number;
};
```

### Price-stats panel

An optional floating panel showing a **latest-bar snapshot** of the symbol's
fundamentals + average daily true-range (ATR). It is a standalone toggle (not an
indicator) and a static snapshot — it does not update on hover/pan.

```tsx
<Chart
  data={data}
  warmupSeed={warmupSeed}          // ≥125 prior bars, or the ATR-6M cell stays blank
  statsEnabled={showStats}         // gate (defaults on when omitted)
  statsTable={{                    // app-supplied raw financials (all optional)
    sector: 'Information Technology',
    industry: 'Software',
    sharesOutstanding: 5_000_000_000,
    freeFloatPercent: 45.09,         // pre-computed free-float % (library formats it)
    eps: 42.5,
  }}
  statsMarket="India"              // 'India' | 'US' — Mkt-Cap units/thresholds (default 'India')
  statsPosition={statsPos}         // {x,y} px from wrapper top-left, or null → default top-right
  onStatsPositionChange={setStatsPos} // fired on drag end with the clamped drop position
  statsSize="small"                // 'tiny' | 'small' | 'normal' | 'large' (default 'small')
/>
```

**Integration notes:**

- **Wire both ends.** `Chart` does not render `ChartControls`, so the toggle is
  two-sided (same split as Patterns): pass `statsEnabled` to `Chart` **and** wire
  the **"Stats"** pill on `ChartControls` (`statsEnabled` + `onStatsToggle`) to the
  same state.
- **Free-draggable.** The whole panel is a drag handle; it clamps to stay fully
  inside the chart wrapper. Persist drops via `onStatsPositionChange` (fired on
  drag end) and feed the saved `{ x, y }` back through `statsPosition`; pass
  `null` (or omit) for the default top-right placement.
- **Lazy fetch on enable.** The library never fetches — pass raw financials via
  `statsTable`. Watch `statsEnabled` and only fetch fundamentals when the panel is
  turned on.
- **History for ATR.** The ATR rows need **~125+ bars of history** (supply them via
  `warmupSeed`); with fewer bars the ATR-6M cell renders blank. The fundamental
  rows need none of this — absent fundamentals collapse to an ATR-only panel.
- **Library-owned math.** You pass raw financials; the library does the
  close-dependent math (market cap on the prior close, PE on the last close) and
  the India/US formatting. PE blanks on a zero/near-zero EPS but keeps a negative
  PE for loss-making symbols.

## Theming — CSS variable contract

The chart reads its colors, spacing, radii, shadows, and type sizes from CSS
custom properties. The bundled `style.css` ships **0-specificity
`:where(:root)` fallbacks** for every token below, so a blank app renders fully
styled out of the box. To re-theme, declare any of these on your own `:root`
(specificity ≥ 0,0,1) and your value wins.

**Two tiers.** The **semantic** tokens documented below (`--chart-*`, `--ti-*`,
`--stats-*`, `--text-*`, …) are the **supported override surface** — theme the
chart by redeclaring these. Internally each is defined as `var(--cc-…)`, a
**primitive** that records a raw value once (e.g. `--cc-green-600: #16a34a`,
aliased by `--chart-positive`). The `--cc-*` primitives are an **internal
implementation detail, not an override surface** — the prefix keeps an unrelated
app token from colliding with one; override the semantic token instead. The
tables below show each semantic token's **effective default** (what it resolves
to), not the `var(--cc-…)` indirection.

### Chart colors

`--chart-positive` / `--chart-negative` are the chart-wide price-direction pair
(OHLC readout, Volume's default bars, the `--qr-growth-*` aliases, the ruler).
`--candle-up` / `--candle-down` are the candle/bar body fills alone and default
to that pair, so theming just the pair still recolors the candles — override the
candle tokens only when you want the price series to differ from everything else.

| Token | Default |
| --- | --- |
| `--chart-positive` | `#16a34a` |
| `--chart-negative` | `#dc2626` |
| `--candle-up` | `var(--chart-positive)` |
| `--candle-down` | `var(--chart-negative)` |
| `--chart-axis-label` | `#888888` |
| `--chart-separator` | `#cccccc` |
| `--chart-tooltip-label` | `#888888` |
| `--chart-ema-10-label` | `#3b82f6` |
| `--chart-ema-20-label` | `#6b7280` |
| `--chart-ema-50-label` | `#ef4444` |
| `--chart-ema-200-label` | `#22c55e` |
| `--chart-high-1y-label` | `#ef4444` |
| `--chart-high-2y-label` | `#f59e0b` |
| `--chart-high-3y-label` | `#8b5cf6` |
| `--chart-high-all-label` | `#06b6d4` |
| `--chart-rs-label` | `#ec4899` |
| `--chart-rs-signal-label` | `#eab308` |
| `--bg-card` | `#ffffff` |

(The `--ema-*` / `--high-*` / `--rs-*` aliases the SVG strokes read default to the
matching `--chart-*-label` token.)

### Indicator library colors (TA-Lib overlays & subpanes)

Price-pane overlays and oscillator subpanes each read one stroke token.

| Token | Default | | Token | Default |
| --- | --- | --- | --- | --- |
| `--ti-sma` | `#3b82f6` | | `--rsi-line` | `#8b5cf6` |
| `--ti-ema` | `#ef4444` | | `--macd-line` | `#3b82f6` |
| `--ti-wma` | `#a855f7` | | `--macd-signal` | `#f59e0b` |
| `--ti-dema` | `#f59e0b` | | `--macd-hist-up` | `#16a34a` |
| `--ti-tema` | `#14b8a6` | | `--macd-hist-down` | `#dc2626` |
| `--bb-upper` | `#60a5fa` | | `--stoch-k` | `#3b82f6` |
| `--bb-mid` | `#9ca3af` | | `--stoch-d` | `#f59e0b` |
| `--bb-lower` | `#60a5fa` | | `--willr-line` | `#ec4899` |
| `--stage2-band` | `#22c55e` | | `--adx-line` | `#14b8a6` |
| `--subpane-guide` | `#888888` | | `--dx-line` | `#a855f7` |
| | | | `--atr-line` | `#06b6d4` |
| | | | `--natr-line` | `#0ea5e9` |
| | | | `--trange-line` | `#22c55e` |

### Drawing tools, patterns & background

| Token | Default | Notes |
| --- | --- | --- |
| `--chart-drawing` | `#3b82f6` | default shape stroke |
| `--chart-drawing-bg` | `#1e293b` | text-box background |
| `--chart-drawing-handle` | `#ffffff` | endpoint grab handles |
| `--chart-drawing-label-text` | `#ffffff` | ruler chip text |
| `--chart-pattern-fill` | `#252525` | all pattern lines/boxes/markers/chips |
| `--chart-pattern-label-text` | `#ffffff` | pattern label text |
| `--chart-bg-top` | `#6e7b8b` | background gradient (top) |
| `--chart-bg-bottom` | `#776a5a` | background gradient (bottom) |

### Price-stats panel

The floating stats panel (see below) is plain HTML and reads these directly. The
four threshold bands color the Mkt-Cap / Free-Float / ATR cells; `text`/`muted`
are the default value and header-label colors.

| Token | Default |
| --- | --- |
| `--stats-strong` | `#84cc16` |
| `--stats-up` | `#22c55e` |
| `--stats-neutral` | `#f59e0b` |
| `--stats-down` | `#ef4444` |
| `--stats-text` | `var(--text-primary)` |
| `--stats-muted` | `var(--text-muted)` |
| `--stats-bg` | `var(--surface-panel-raised)` |
| `--stats-border` | `var(--chart-separator)` |
| `--stats-radius` | `var(--radius-sm)` |

### Quarterly Results pane

The `results` subpane indicator (RPS + EPS fundamentals) reads these. `--qr-rps`/
`--qr-eps` color the value text + bars; the `*-label` tokens color the legend
values; growth %s use the up/down tokens; `--qr-label` colors the quarter label.

| Token | Default |
| --- | --- |
| `--qr-rps` | `#60a5fa` |
| `--qr-eps` | `#f97316` |
| `--chart-qr-rps-label` | `var(--qr-rps)` |
| `--chart-qr-eps-label` | `var(--qr-eps)` |
| `--qr-growth-up` | `var(--chart-positive)` |
| `--qr-growth-down` | `var(--chart-negative)` |
| `--qr-label` | `var(--chart-tooltip-label)` |

### Layout / shadow / spacing / text

| Token | Default |
| --- | --- |
| `--surface-panel-raised` | `#30302e` |
| `--surface-panel-header` | `#202020` |
| `--surface-panel-box` | `#252525` |
| `--surface-dropdown` | `#191919` |
| `--color-dark-700` | `#30302e` |
| `--panel-box-bg` | `var(--surface-panel-box)` |
| `--shadow-card` | `0 1px 3px 0 rgb(0 0 0 / 0.08), 0 2px 6px 0 rgb(0 0 0 / 0.06)` |
| `--shadow-inset-track` | `inset 0 1px 2px rgba(0, 0, 0, 0.08)` |
| `--shadow-pill-active` | `0 1px 2px rgba(0, 0, 0, 0.06)` |
| `--shadow-popover` | `0 8px 24px rgba(0, 0, 0, 0.45), 0 2px 6px rgba(0, 0, 0, 0.3)` |
| `--radius-sm` | `6px` |
| `--radius-md` | `12px` |
| `--radius-full` | `9999px` |
| `--radius-popover` | `10px` |
| `--space-1` | `0.25rem` |
| `--space-2` | `0.5rem` |
| `--space-3` | `0.75rem` |
| `--space-4` | `1rem` |
| `--text-base` | `0.875rem` |
| `--text-xs` | `0.75rem` |
| `--text-sm` | `13px` |
| `--text-2xs` | `11px` |
| `--text-3xs` | `10px` |
| `--text-2hxs` | `9px` |
| `--text-md` | `16px` |
| `--text-primary` | `#bcbab6` |
| `--text-muted` | `#8e8b86` |
| `--font-family-base` | `'Helvetica Neue', Helvetica, Arial, sans-serif` |
| `--font-weight-medium` | `500` |
| `--font-weight-semibold` | `600` |
| `--field-invalid` | `#d6705f` |
| `--color-focus-ring` | `#5b8def` |
| `--panel-border` | `color-mix(in srgb, var(--text-muted) 22%, transparent)` |
| `--field-border` | `color-mix(in srgb, var(--text-muted) 26%, transparent)` |
| `--field-bg` | `color-mix(in srgb, var(--surface-panel-header) 70%, #000)` |
| `--transition-fast` | `0.15s ease` |

### Primitives (`--cc-*`) — internal, not an override surface

Every raw value above is recorded once as a `--cc-*` primitive at the top of
`chart-core.css` (e.g. `--cc-green-600: #16a34a`, `--cc-blue-500: #3b82f6`, the
warm `--cc-stone-*` surfaces). They exist so no hex is typed twice; they are **not
a theming API** and may change. Override the semantic token that aliases one, not
the primitive.

## Public API

Everything is exported from the package root — never deep-import. Highlights:

- `Chart`, `ChartControls` — components.
- Context hooks: `useChartScale`, `useChartOverlayHost`, `useChartGeometry`,
  `useReportOverlayPriceBounds`, `useBackgroundPointerDown` (+ `ChartOverlayLayer`).
- Indicator framework: `registerIndicator`, `getIndicator`, `listIndicators`,
  `computeEMA`, `computeRollingHigh`, `computeExpandingMax`, and the `Indicator*`
  types.
- Utilities: `formatPrice`, `formatVolume`, `formatVolumeTick`,
  `computeVolumeStats`, `RANGE_DAYS`, `barIndexForDate`, `dateForBarIndex`.
- `panButtonClass` — the hashed class name of the reset-pan button, for overlay
  plugins that render their own reset control.
- Price-stats panel props: `StatsTableData`, `StatsMarket`, `StatsPosition`,
  `StatsSize` (the panel renders inside `Chart`; only its prop types are exported).
- Quarterly Results pane: pass `quarterlyResults: QuarterlyResult[]` to `Chart` and
  enable the `results` indicator. Drag subpane dividers to resize; persist via
  `subpaneHeights` / `onSubpaneHeightsChange`.
- Volume pane: volume is a registered subpane indicator (key `volume`), no longer
  hardcoded — it is **opt-in** like any oscillator. To keep it on by default, seed
  your initial indicator set with `defaultConfigFor('volume', { enabled: true })`.
  It stacks directly below price; users can restyle (Vol Up / Vol Down colors),
  toggle the below-average fade, the HVE/HVY labels, and the averaging length via
  its legend popover. The OHLC info bar still shows `Vol:` regardless of the pane.
- Types: `Candle`, `QuarterlyResult`, `ChartType`, `RangeKey`, `PatternMarker`,
  `ChartContextMenuInfo`, etc.

## Interaction

Pan by dragging the plot, zoom with the wheel, drag the price gutter to rescale,
double-click a candle / indicator / drawing to edit it.

### Right-click

Pass `onContextMenu?: (info: ChartContextMenuInfo) => void` to report where the user
right-clicked instead of showing the browser menu:

```ts
type ChartContextMenuInfo = {
  clientX: number; clientY: number;      // viewport coords for positioning a menu
  barIndex: number | null;               // null right of the last bar / off the bars
  date: string | null;
  price: number | null;                  // set only in the price pane
  value: number | null;                  // set only in a subpane (mutually exclusive)
  pane: { kind: 'price' | 'subpane' | 'gutter' | 'none'; key?: string };
};
```

- With **no** `onContextMenu`, the browser's native menu shows as usual.
- With a handler, the native menu is suppressed everywhere over the chart — including
  your own children stacked in the plot (legend, stats, trade/trigger overlays), which
  are classified by geometry. To let one floating child keep its **own** native menu,
  put `data-chart-native-menu` on its root element.
- Mid-gesture (a pan/drag in flight) the menu is suppressed and no payload fires.

### Touch

The chart is fully touch-driven: one finger pans, two fingers pinch-zoom, a
double-tap opens the same editors a double-click does. The plot surface sets
`touch-action: none`, so a **vertical** finger drag over the chart pans it rather than
scrolling the page. If the page needs to scroll past the chart on a phone, give the
chart a bounded height so there is page outside it to scroll.

## Develop

```bash
pnpm install
pnpm build      # → dist/index.js + dist/index.d.ts + dist/style.css
```

Push to `main`; GitHub Actions rebuilds and publishes the `dist` branch.
