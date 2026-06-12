import { describe, it, expect } from 'vitest';
// Importing the registry self-registers all builtins (incl. `ti:ema`), so we can
// drive the band + override logic through the public `defaultConfigFor` rather
// than the private `emaBandColor`.
import {
  defaultConfigFor,
  effectiveSettings,
  defaultsFromSchema,
} from '../src/indicators/registry';
import { emaTalibDef } from '../src/indicators/builtins/emaTalib';

function emaSettings(period: number, overrides?: Record<string, unknown>) {
  const config = defaultConfigFor('ti:ema', {
    settingsOverrides: { period, ...overrides },
  });
  if (!config) throw new Error('ti:ema not registered');
  return config.settings as { lineColor: string; labelColor: string };
}

describe('EMA band derived colors (half-open: exact cutoff → upper band)', () => {
  it.each([
    [14, '--ema-10', '--chart-ema-10-label'],
    [15, '--ema-20', '--chart-ema-20-label'],
    [29, '--ema-20', '--chart-ema-20-label'],
    [30, '--ema-50', '--chart-ema-50-label'],
    [74, '--ema-50', '--chart-ema-50-label'],
    [75, '--ema-200', '--chart-ema-200-label'],
  ])('period %i → %s / %s', (period, lineVar, labelVar) => {
    const s = emaSettings(period);
    expect(s.lineColor).toBe(`var(${lineVar})`);
    expect(s.labelColor).toBe(`var(${labelVar})`);
  });
});

describe('color override layering', () => {
  it('a user lineColor override wins over the derived band color', () => {
    const s = emaSettings(50, { lineColor: '#123456' });
    expect(s.lineColor).toBe('#123456');
    // labelColor (not overridden) still re-derives from the band.
    expect(s.labelColor).toBe('var(--chart-ema-50-label)');
  });

  it('no override → falls back to the band color', () => {
    const s = emaSettings(50);
    expect(s.lineColor).toBe('var(--ema-50)');
    expect(s.labelColor).toBe('var(--chart-ema-50-label)');
  });

  it('removing the override (reset) re-derives the band color', () => {
    // A config built without the override behaves as a per-field reset would.
    const reset = defaultConfigFor('ti:ema', {
      settingsOverrides: { period: 30 },
    });
    expect(reset!.settings.lineColor).toBe('var(--ema-50)');
    expect('lineColor' in reset!.settingsOverrides).toBe(false);
  });
});

describe('effectiveSettings purity (replaces the def-singleton mutation suite)', () => {
  it('returns fresh objects per call and never mutates the schema defaults', () => {
    const a = effectiveSettings(emaTalibDef, { period: 10 });
    const b = effectiveSettings(emaTalibDef, { period: 200 });
    expect(a).not.toBe(b);
    expect(a.lineColor).toBe('var(--ema-10)');
    expect(b.lineColor).toBe('var(--ema-200)');
    // The static schema defaults are untouched by either call.
    const base = defaultsFromSchema(emaTalibDef.settingsSchema);
    expect(base.lineColor).toBe('var(--ti-ema)');
  });
});
