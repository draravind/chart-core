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

### Chart colors

| Token | Default |
| --- | --- |
| `--chart-positive` | `#16a34a` |
| `--chart-negative` | `#dc2626` |
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
| `--bg-card` | `#ffffff` |

(The `--ema-*` / `--high-*` aliases the SVG strokes read default to the matching
`--chart-*-label` token.)

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
| `--color-dark-700` | `#30302e` |
| `--shadow-card` | `0 1px 3px 0 rgb(0 0 0 / 0.08), 0 2px 6px 0 rgb(0 0 0 / 0.06)` |
| `--shadow-inset-track` | `inset 0 1px 2px rgba(0, 0, 0, 0.08)` |
| `--shadow-pill-active` | `0 1px 2px rgba(0, 0, 0, 0.06)` |
| `--radius-sm` | `6px` |
| `--radius-md` | `12px` |
| `--radius-full` | `9999px` |
| `--space-1` | `0.25rem` |
| `--space-2` | `0.5rem` |
| `--space-3` | `0.75rem` |
| `--space-4` | `1rem` |
| `--text-base` | `0.875rem` |
| `--text-xs` | `0.75rem` |
| `--text-sm` | `13px` |
| `--text-3xs` | `10px` |
| `--text-2hxs` | `9px` |
| `--text-primary` | `#bcbab6` |
| `--text-muted` | `#8e8b86` |
| `--font-weight-medium` | `500` |
| `--transition-fast` | `0.15s ease` |

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
- Types: `Candle`, `QuarterlyResult`, `ChartType`, `RangeKey`, `PatternMarker`, etc.

## Develop

```bash
pnpm install
pnpm build      # → dist/index.js + dist/index.d.ts + dist/style.css
```

Push to `main`; GitHub Actions rebuilds and publishes the `dist` branch.
