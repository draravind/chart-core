import type { AppearanceOverrides, ChartAppearance } from './types';

// ---------------------------------------------------------------------------
// The single source of baked appearance defaults — every literal that used to
// be scattered across drawSeries.ts / Chart.tsx / the pattern renderers is
// migrated here, so zero-config visuals stay byte-identical.
// ---------------------------------------------------------------------------

export const APPEARANCE_DEFAULTS: ChartAppearance = {
  // Absent ⇒ inherit the CSS var as authored in chart-core.css.
  colors: {},
  // Background gradient — drawSeries.ts: bottom #776a5a → top #6e7b8b, radius 12.
  background: { topColor: '#6e7b8b', bottomColor: '#776a5a', radius: 12 },
  // Candle wick stroke width — drawSeries.ts.
  candle: { wickWidth: 1.25 },
  // Axis tick lines — Chart.tsx AXIS_OPACITY / TICK_SIZE.
  axis: { opacity: 0.12, tickSize: 4 },
  // Crosshair lines — Chart.tsx (currentColor / 0.3 / '3,3').
  crosshair: { color: 'currentColor', opacity: 0.3, dash: '3,3' },
  // Pattern styling — migrated from the three renderers' module consts.
  patterns: {
    base_breakout: {
      lineColor: '#252525',
      lineWidth: 1.5,
      lineOpacity: 0.5,
      lineDash: '5 4',
      statColor: '#252525',
      dotFill: '#252525',
      labelBg: '#252525',
      labelBgOpacity: 0.7,
      labelTextColor: '#ffffff',
      labelFontSize: 11,
    },
    consolidation: {
      boxFill: '#252525',
      boxFillOpacity: 0.1,
      labelBg: '#252525',
      labelBgOpacity: 0.7,
      labelTextColor: '#ffffff',
      labelFontSize: 11,
    },
    high_tight_flag: {
      poleColor: '#252525',
      poleWidth: 2,
      poleOpacity: 0.35,
      flagFill: '#252525',
      flagFillOpacity: 0.12,
      labelBg: '#252525',
      labelBgOpacity: 0.7,
      labelTextColor: '#ffffff',
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
