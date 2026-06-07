import type { IndicatorConfig, IndicatorDef } from './types';
import { emaDef } from './builtins/ema';
import { highsDef } from './builtins/rollingHigh';
import { rsLineDef } from './builtins/rsLine';
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
 */
export function defaultConfigFor(
  defKey: string,
  overrides?: Partial<Pick<IndicatorConfig, 'id' | 'enabled' | 'params'>>,
): IndicatorConfig | undefined {
  const def = getIndicator(defKey);
  if (!def) return undefined;
  return {
    id: overrides?.id ?? defKey,
    defKey,
    params: { ...def.defaultParams, ...overrides?.params },
    label: def.label,
    enabled: overrides?.enabled ?? false,
    style: def.defaultStyle,
  };
}

// Built-ins registered on import. Last-write-wins (Map.set), so the legacy
// `ema`/`highs`/`rs` keys stay owned by their original defs and the TA-Lib
// library uses collision-proof `ti:`-prefixed keys.
registerIndicator(emaDef);
registerIndicator(highsDef);
registerIndicator(rsLineDef);

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

/** Canonical top-to-bottom subpane stacking order (stable across toggles). */
export const SUBPANE_ORDER: string[] = [
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
