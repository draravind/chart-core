import type { IndicatorConfig, IndicatorDef, SettingsField } from './types';
import { highsDef } from './builtins/rollingHigh';
import { rsLineDef } from './builtins/rsLine';
import { stage2Def } from './builtins/stage2';
import { quarterlyResultsDef } from './builtins/quarterlyResults';
import { volumeDef } from './builtins/volume';
// TA-Lib library — price-pane overlays.
import { smaDef } from './builtins/sma';
import { emaTalibDef } from './builtins/emaTalib';
import { wmaDef } from './builtins/wma';
import { demaDef } from './builtins/dema';
import { temaDef } from './builtins/tema';
import { bbandsDef } from './builtins/bbands';
// TA-Lib library — momentum subpanes.
import { rsiDef } from './builtins/rsi';
import { macdDef } from './builtins/macd';
import { stochDef } from './builtins/stoch';
import { stochfDef } from './builtins/stochf';
import { stochrsiDef } from './builtins/stochrsi';
import { willrDef } from './builtins/willr';
import { adxDef } from './builtins/adx';
import { dxDef } from './builtins/dx';
// TA-Lib library — volatility subpanes.
import { atrDef } from './builtins/atr';
import { natrDef } from './builtins/natr';
import { trangeDef } from './builtins/trange';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const registry = new Map<string, IndicatorDef<any>>();

export function registerIndicator<S>(def: IndicatorDef<S>): void {
  registry.set(def.key, def);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getIndicator(key: string): IndicatorDef<any> | undefined {
  return registry.get(key);
}

export function listIndicators(): IndicatorDef[] {
  return [...registry.values()];
}

/** Static defaults straight off the schema (key → default). The single source
 *  of base settings, so schema-default and blob-default can never drift. */
export function defaultsFromSchema(schema: SettingsField[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of schema) out[f.key] = f.default;
  return out;
}

/**
 * Resolve effective settings from sparse user deltas. The delta ladder:
 * `base(staticDefaults)` → `{...base, ...overrides}` → `deriveDefaults(merged)`
 * (param-dependent defaults, e.g. EMA bands its color from period) →
 * `{...base, ...derived, ...overrides}`. The user delta wins over the derived
 * default; per-field reset = deleting that key from the deltas. Pure — never
 * mutates the def or the inputs.
 */
export function effectiveSettings<S>(
  def: IndicatorDef<S>,
  overrides: Partial<S>,
): S {
  const base = defaultsFromSchema(def.settingsSchema) as S;
  const merged1 = { ...base, ...overrides } as S;
  const derived = def.deriveDefaults?.(merged1) ?? ({} as Partial<S>);
  return { ...base, ...derived, ...overrides } as S;
}

/** Accepted `defaultConfigFor` overrides — id/enabled plus the sparse settings
 *  delta map (the only persisted source of truth). */
type ConfigOverrides = {
  id?: string;
  enabled?: boolean;
  settingsOverrides?: Record<string, unknown>;
};

/**
 * Build a default `IndicatorConfig` for a registry key from the def's
 * `settingsSchema` + any user deltas. Hosts call this to surface an indicator
 * in `ChartControls`, and the legend re-runs it on every edit so param-dependent
 * defaults (EMA re-banding) re-derive. Returns `undefined` for an unknown key.
 */
export function defaultConfigFor(
  defKey: string,
  overrides?: ConfigOverrides,
): IndicatorConfig | undefined {
  const def = getIndicator(defKey);
  if (!def) return undefined;
  const so: Record<string, unknown> = { ...overrides?.settingsOverrides };
  const settings = effectiveSettings(def, so) as Record<string, unknown>;
  return {
    id: overrides?.id ?? defKey,
    defKey,
    label: def.label,
    enabled: overrides?.enabled ?? false,
    settings,
    settingsOverrides: so,
  };
}

// Built-ins registered on import. Last-write-wins (Map.set), so the legacy
// `highs`/`rs` keys stay owned by their original defs and the TA-Lib
// library uses collision-proof `ti:`-prefixed keys.
registerIndicator(highsDef);
registerIndicator(rsLineDef);
registerIndicator(stage2Def);
registerIndicator(quarterlyResultsDef);
registerIndicator(volumeDef);

const TI_DEFS: IndicatorDef[] = [
  smaDef,
  emaTalibDef,
  wmaDef,
  demaDef,
  temaDef,
  bbandsDef,
  rsiDef,
  macdDef,
  stochDef,
  stochfDef,
  stochrsiDef,
  willrDef,
  adxDef,
  dxDef,
  atrDef,
  natrDef,
  trangeDef,
];
for (const def of TI_DEFS) registerIndicator(def);

/**
 * Short legend summary for a config (e.g. "12,26,9" for MACD), via the def's
 * `formatParams`. Empty string when the def has none (no-param indicators).
 */
export function formatIndicatorParams(config: IndicatorConfig): string {
  const def = getIndicator(config.defKey);
  if (!def?.formatParams) return '';
  return def.formatParams(config.settings);
}

/** Canonical left-to-right ordering for price-pane overlays in the picker. */
export const OVERLAY_ORDER: string[] = [
  'ti:ema',
  'ti:sma',
  'ti:wma',
  'ti:dema',
  'ti:tema',
  'ti:bbands',
  'highs',
  'stage2',
];

/** Canonical top-to-bottom subpane stacking order (stable across toggles).
 *  `volume` stacks directly below price, exactly where the legacy volume zone
 *  sat. `results` and the oscillators follow. */
export const SUBPANE_ORDER: string[] = [
  'volume',
  'results',
  'rs',
  'rsi',
  'macd',
  'stoch',
  'stochf',
  'stochrsi',
  'willr',
  'adx',
  'dx',
  'atr',
  'natr',
  'trange',
];
