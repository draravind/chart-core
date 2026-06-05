import type { IndicatorDef } from './types';
import { emaDef } from './builtins/ema';
import { highsDef } from './builtins/rollingHigh';

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

// Built-ins registered on import.
registerIndicator(emaDef);
registerIndicator(highsDef);
