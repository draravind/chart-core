import { describe, it, expect } from 'vitest';
import {
  APPEARANCE_DEFAULTS,
  effectiveAppearance,
} from '../src/appearance/registry';

describe('effectiveAppearance', () => {
  it('empty/undefined overrides ⇒ the baked defaults', () => {
    expect(effectiveAppearance()).toEqual(APPEARANCE_DEFAULTS);
    expect(effectiveAppearance({})).toEqual(APPEARANCE_DEFAULTS);
  });

  it('a partial colors delta overrides only that key', () => {
    const eff = effectiveAppearance({ colors: { 'chart-positive': '#abcabc' } });
    expect(eff.colors['chart-positive']).toBe('#abcabc');
    // Every non-color slice is untouched.
    expect(eff.background).toEqual(APPEARANCE_DEFAULTS.background);
    expect(eff.axis).toEqual(APPEARANCE_DEFAULTS.axis);
    expect(eff.patterns).toEqual(APPEARANCE_DEFAULTS.patterns);
  });

  it('a nested scalar delta merges without wiping siblings', () => {
    const eff = effectiveAppearance({ axis: { opacity: 0.5 } });
    expect(eff.axis.opacity).toBe(0.5);
    // tickSize sibling falls back to the default.
    expect(eff.axis.tickSize).toBe(APPEARANCE_DEFAULTS.axis.tickSize);
  });

  it('a per-pattern delta merges deep, leaving other patterns + fields intact', () => {
    const eff = effectiveAppearance({
      patterns: { base_breakout: { lineColor: '#111111' } },
    });
    expect(eff.patterns.base_breakout.lineColor).toBe('#111111');
    expect(eff.patterns.base_breakout.lineWidth).toBe(
      APPEARANCE_DEFAULTS.patterns.base_breakout.lineWidth,
    );
    expect(eff.patterns.consolidation).toEqual(
      APPEARANCE_DEFAULTS.patterns.consolidation,
    );
  });

  it('omitting a key resets it (per-field reset = absence in the delta)', () => {
    const withOverride = effectiveAppearance({
      background: { radius: 24 },
    });
    expect(withOverride.background.radius).toBe(24);
    const reset = effectiveAppearance({ background: {} });
    expect(reset.background.radius).toBe(APPEARANCE_DEFAULTS.background.radius);
  });

  it('is pure — never mutates the defaults', () => {
    const before = JSON.stringify(APPEARANCE_DEFAULTS);
    effectiveAppearance({ colors: { x: '#000000' }, axis: { opacity: 0.9 } });
    expect(JSON.stringify(APPEARANCE_DEFAULTS)).toBe(before);
    expect(APPEARANCE_DEFAULTS.colors).toEqual({});
  });
});
