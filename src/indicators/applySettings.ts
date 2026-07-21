import type { IndicatorConfig } from './types';
import { defaultConfigFor } from './registry';

// Pure setting-override transforms over an indicator list. Lifted out of
// IndicatorLegend so BOTH the legend-anchored popover and Chart's centred one
// commit through exactly one implementation.

/**
 * Set one setting override and recompute the whole config via
 * `defaultConfigFor` — NOT a shallow spread — so param-dependent defaults
 * re-derive (an EMA period 10→100 re-bands blue→green) while any user color
 * override survives.
 */
export function withSettingOverride(
  indicators: readonly IndicatorConfig[],
  id: string,
  key: string,
  value: number | boolean | string,
): IndicatorConfig[] {
  return indicators.map((c) => {
    if (c.id !== id) return c;
    const next = defaultConfigFor(c.defKey, {
      id: c.id,
      enabled: c.enabled,
      settingsOverrides: { ...c.settingsOverrides, [key]: value },
    });
    return next ?? c;
  });
}

/**
 * Drop several overrides in ONE pass so a grouped line ↺ clears every sub-key
 * at once. A per-key loop would fire multiple synchronous `onIndicatorsChange`
 * calls that each map over the same render-time list; React batches them into
 * last-write-wins, so only one key would actually clear.
 */
export function withSettingsReset(
  indicators: readonly IndicatorConfig[],
  id: string,
  keys: readonly string[],
): IndicatorConfig[] {
  if (keys.length === 0) return indicators as IndicatorConfig[];
  return indicators.map((c) => {
    if (c.id !== id) return c;
    const settingsOverrides = { ...c.settingsOverrides };
    for (const key of keys) delete settingsOverrides[key];
    const next = defaultConfigFor(c.defKey, {
      id: c.id,
      enabled: c.enabled,
      settingsOverrides,
    });
    return next ?? c;
  });
}
