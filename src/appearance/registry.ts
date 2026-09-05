import type { AppearanceOverrides, ChartAppearance } from './types';

// ---------------------------------------------------------------------------
// The single source of baked appearance defaults — every literal that used to
// be scattered across drawSeries.ts / Chart.tsx / the pattern renderers is
// migrated here, so zero-config visuals stay byte-identical.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// OHLC bar geometry law. Baked constants, NOT user preferences — these describe
// how the renderer behaves, not a per-user taste, so they live in code and ship
// with the package. To retune, edit here and republish.
// ---------------------------------------------------------------------------

/**
 * Bar thickness ladder — device bar-spacings (at a reference density of 2) at
 * which the stem gains one dot. Base is 2 dots (1 CSS px, the floor); the cap is
 * implied by the list's length. Read by `drawSeries.barMetrics`.
 */
export const BAR_THICKNESS_STEPS: readonly number[] = [13, 27, 34, 40, 47, 54];

/** How far an open/close stub reaches from the bar centre, as a fraction of the
 *  slot. Independent of thickness; floored at one stem width by `barMetrics`. */
export const BAR_STUB_FRACTION = 0.35;

/**
 * Candle wick thickness as a fraction of the BODY width. The body is derived
 * from the slot each bar occupies, so it scales with zoom; pinning the wick to a
 * fixed CSS width (the old `candle.wickWidth` dial) left a hairline under a fat
 * body. Floored at 1 CSS px and capped at the body by `drawCandles`.
 *
 * 1/6 is chosen so the default view is byte-identical to the pre-change build:
 * at ~250 visible bars the body is 3 CSS px (6 dots at 2×) and `6 × 1/6 = 1`
 * dot, so the 1-CSS-px floor wins. The wick only thickens past ~110 visible
 * bars — exactly the zoom range where the old hairline looked wrong.
 */
export const CANDLE_WICK_FRACTION = 1 / 6;

export const APPEARANCE_DEFAULTS: ChartAppearance = {
  // Absent ⇒ inherit the CSS var as authored in chart-core.css.
  colors: {},
  // Background gradient — aliases the --chart-bg-* tokens (the single source, so
  // the canvas paint and the SVG twin gradient can't drift). Resolved to rgb at
  // draw time via the colour probe.
  background: {
    topColor: 'var(--chart-bg-top)',
    bottomColor: 'var(--chart-bg-bottom)',
    radius: 12,
  },
  // Price-series opacity (globalAlpha around the candle/bar paint pass).
  candle: { opacity: 1 },
  // Axis tick lines — Chart.tsx AXIS_OPACITY / TICK_SIZE.
  axis: { opacity: 0.12, tickSize: 4 },
  // Crosshair lines — Chart.tsx (currentColor / 0.3 / '3,3').
  crosshair: { color: 'currentColor', opacity: 0.3, dash: '3,3' },
  // Pattern styling — migrated from the three renderers' module consts.
  patterns: {
    base_breakout: {
      lineColor: 'var(--chart-pattern-fill)',
      lineWidth: 1.5,
      lineOpacity: 0.5,
      lineDash: '5 4',
      statColor: 'var(--chart-pattern-fill)',
      dotFill: 'var(--chart-pattern-fill)',
      labelBg: 'var(--chart-pattern-fill)',
      labelBgOpacity: 0.7,
      labelTextColor: 'var(--chart-pattern-label-text)',
      labelFontSize: 11,
    },
    consolidation: {
      boxFill: 'var(--chart-pattern-fill)',
      boxFillOpacity: 0.1,
      labelBg: 'var(--chart-pattern-fill)',
      labelBgOpacity: 0.7,
      labelTextColor: 'var(--chart-pattern-label-text)',
      labelFontSize: 11,
    },
    high_tight_flag: {
      poleColor: 'var(--chart-pattern-fill)',
      poleWidth: 2,
      poleOpacity: 0.35,
      flagFill: 'var(--chart-pattern-fill)',
      flagFillOpacity: 0.12,
      labelBg: 'var(--chart-pattern-fill)',
      labelBgOpacity: 0.7,
      labelTextColor: 'var(--chart-pattern-label-text)',
      labelFontSize: 11,
    },
    gap_up: {
      bandFill: 'var(--chart-pattern-fill)',
      bandFillOpacity: 0.1,
      labelBg: 'var(--chart-pattern-fill)',
      labelBgOpacity: 0.7,
      labelTextColor: 'var(--chart-pattern-label-text)',
      labelFontSize: 11,
    },
    volume_breakout: {
      markerColor: 'var(--chart-pattern-fill)',
      markerOpacity: 0.9,
      labelBg: 'var(--chart-pattern-fill)',
      labelBgOpacity: 0.7,
      labelTextColor: 'var(--chart-pattern-label-text)',
      labelFontSize: 11,
    },
    golden_cross: {
      dotFill: 'var(--chart-pattern-fill)',
      labelBg: 'var(--chart-pattern-fill)',
      labelBgOpacity: 0.7,
      labelTextColor: 'var(--chart-pattern-label-text)',
      labelFontSize: 11,
    },
    nr7: {
      lineColor: 'var(--chart-pattern-fill)',
      lineWidth: 1,
      lineOpacity: 0.5,
      markerColor: 'var(--chart-pattern-fill)',
      markerOpacity: 0.9,
      labelBg: 'var(--chart-pattern-fill)',
      labelBgOpacity: 0.7,
      labelTextColor: 'var(--chart-pattern-label-text)',
      labelFontSize: 11,
    },
    unusual_volume: {
      markerColor: 'var(--chart-pattern-fill)',
      markerOpacity: 0.9,
      labelBg: 'var(--chart-pattern-fill)',
      labelBgOpacity: 0.7,
      labelTextColor: 'var(--chart-pattern-label-text)',
      labelFontSize: 11,
    },
    volume_dryup: {
      markerColor: 'var(--chart-pattern-fill)',
      markerOpacity: 0.9,
      labelBg: 'var(--chart-pattern-fill)',
      labelBgOpacity: 0.7,
      labelTextColor: 'var(--chart-pattern-label-text)',
      labelFontSize: 11,
    },
    pocket_pivot: {
      markerColor: 'var(--chart-pattern-fill)',
      markerOpacity: 0.9,
      labelBg: 'var(--chart-pattern-fill)',
      labelBgOpacity: 0.7,
      labelTextColor: 'var(--chart-pattern-label-text)',
      labelFontSize: 11,
    },
    inside_day: {
      lineColor: 'var(--chart-pattern-fill)',
      lineWidth: 1.5,
      lineOpacity: 0.5,
      boxStroke: 'var(--chart-pattern-fill)',
      boxStrokeWidth: 1.5,
      boxStrokeOpacity: 0.6,
      labelBg: 'var(--chart-pattern-fill)',
      labelBgOpacity: 0.7,
      labelTextColor: 'var(--chart-pattern-label-text)',
      labelFontSize: 11,
    },
    pullback_to_ema: {
      dotFill: 'var(--chart-pattern-fill)',
      lineColor: 'var(--chart-pattern-fill)',
      lineWidth: 1.5,
      lineOpacity: 0.5,
      labelBg: 'var(--chart-pattern-fill)',
      labelBgOpacity: 0.7,
      labelTextColor: 'var(--chart-pattern-label-text)',
      labelFontSize: 11,
    },
  },
};

// Plain-object guard: recurse into these, replace everything else (primitives,
// arrays). `colors` is a plain object so it merges per-key (a delta adds/edits
// keys, never wipes the map).
const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

function deepMerge<T>(base: T, override: unknown): T {
  if (override === undefined) return base;
  if (!isPlainObject(base) || !isPlainObject(override)) return override as T;
  const out: Record<string, unknown> = { ...base };
  for (const key of Object.keys(override)) {
    out[key] = deepMerge((base as Record<string, unknown>)[key], override[key]);
  }
  return out as T;
}

/**
 * Resolve effective appearance from a sparse delta — deep-merge
 * `APPEARANCE_DEFAULTS` ← overrides. Pure (never mutates the defaults or the
 * input). Per-field reset = omitting the key from the delta. The analogue of
 * `effectiveSettings` for the indicator framework.
 */
export function effectiveAppearance(
  overrides?: AppearanceOverrides,
): ChartAppearance {
  return deepMerge(APPEARANCE_DEFAULTS, overrides);
}
