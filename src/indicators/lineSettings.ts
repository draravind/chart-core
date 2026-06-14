import type { LineStyle } from './draw';
import { dashFor } from './settingsOptions';

/**
 * Build a resolved `LineStyle` from effective settings, reading the four scalar
 * sub-keys a grouped `line` field expands into (`${prefix}Color/Width/Style/
 * Opacity`). `style` maps to a dash array via `dashFor`; the color expr is
 * resolved (var() or raw hex) to rgb via `resolveColor`.
 */
export function lineStyleFrom(
  s: Record<string, unknown>,
  prefix: string,
  resolveColor: (expr: string) => string,
): LineStyle {
  return {
    color: resolveColor(String(s[`${prefix}Color`])),
    width: Number(s[`${prefix}Width`]),
    dash: dashFor(Number(s[`${prefix}Style`])),
    opacity: Number(s[`${prefix}Opacity`]),
  };
}
