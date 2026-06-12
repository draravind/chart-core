import type { ColorOverrides, IndicatorConfig, IndicatorDef } from './types';
import { highsDef } from './builtins/rollingHigh';
import { rsLineDef } from './builtins/rsLine';
import { stage2Def } from './builtins/stage2';
import { quarterlyResultsDef } from './builtins/quarterlyResults';
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

export function registerIndicator<P>(def: IndicatorDef<P>): void {
  registry.set(def.key, def);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getIndicator(key: string): IndicatorDef<any> | undefined {
  return registry.get(key);
}

export function listIndicators(): IndicatorDef[] {
  return [...registry.values()];
}

/**
 * Build a default `IndicatorConfig` for a registry key from the def's
 * `defaultParams` + `defaultStyle`. Hosts call this to surface an indicator in
 * `ChartControls` with one line. Returns `undefined` for an unknown key.
 *
 * Per-line colors are resolved in layers (`generic → factory → user override`):
 * the `defaultStyle` color is the generic fallback, the def's params-aware
 * `defaultLineColor` hook (when present) supplies the factory color, and any
 * `colorOverrides[seriesKey]` user hex wins. Clones style + lines + each line so
 * the shared `def.defaultStyle` singleton is never mutated.
 */
export function defaultConfigFor(
  defKey: string,
  overrides?: Partial<Pick<IndicatorConfig, 'id' | 'enabled' | 'params'>> & {
    colorOverrides?: ColorOverrides;
  },
): IndicatorConfig | undefined {
  const def = getIndicator(defKey);
  if (!def) return undefined;
  const params = { ...def.defaultParams, ...overrides?.params };
  const colorOverrides = overrides?.colorOverrides ?? {};
  const lines = def.defaultStyle.lines.map((line) => {
    const factory = def.defaultLineColor?.(params, line.seriesKey);
    let colorVar = factory?.colorVar ?? line.colorVar;
    let labelColorVar = factory?.labelColorVar ?? line.labelColorVar;
    const userHex = colorOverrides[line.seriesKey];
    if (userHex) {
      colorVar = userHex;
      labelColorVar = userHex;
    }
    return { ...line, colorVar, labelColorVar };
  });
  return {
    id: overrides?.id ?? defKey,
    defKey,
    params,
    label: def.label,
    enabled: overrides?.enabled ?? false,
    style: { ...def.defaultStyle, lines },
    colorOverrides,
  };
}

// Built-ins registered on import. Last-write-wins (Map.set), so the legacy
// `highs`/`rs` keys stay owned by their original defs and the TA-Lib
// library uses collision-proof `ti:`-prefixed keys.
registerIndicator(highsDef);
registerIndicator(rsLineDef);
registerIndicator(stage2Def);
registerIndicator(quarterlyResultsDef);

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
  return def.formatParams(config.params);
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

/** Canonical top-to-bottom subpane stacking order (stable across toggles). */
export const SUBPANE_ORDER: string[] = [
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
