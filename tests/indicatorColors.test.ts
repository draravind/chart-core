import { describe, it, expect } from 'vitest';
// Importing the registry self-registers all builtins (incl. `ti:ema`), so we can
// drive the band + override logic through the public `defaultConfigFor` rather
// than the private `emaBandColor`.
import { defaultConfigFor } from '../src/indicators/registry';
import { emaTalibDef } from '../src/indicators/builtins/emaTalib';

function emaLine(period: number, colorOverrides?: Record<string, string>) {
  const config = defaultConfigFor('ti:ema', { params: { period }, colorOverrides });
  if (!config) throw new Error('ti:ema not registered');
  return config.style.lines[0];
}

describe('EMA band factory colors (half-open: exact cutoff → upper band)', () => {
  it.each([
    [14, '--ema-10', '--chart-ema-10-label'],
    [15, '--ema-20', '--chart-ema-20-label'],
    [29, '--ema-20', '--chart-ema-20-label'],
    [30, '--ema-50', '--chart-ema-50-label'],
    [74, '--ema-50', '--chart-ema-50-label'],
    [75, '--ema-200', '--chart-ema-200-label'],
  ])('period %i → %s / %s', (period, lineVar, labelVar) => {
    const line = emaLine(period);
    expect(line.colorVar).toBe(`var(${lineVar})`);
    expect(line.labelColorVar).toBe(`var(${labelVar})`);
  });
});

describe('color override layering', () => {
  it('a user hex override wins for both stroke and label colors', () => {
    const line = emaLine(50, { ema: '#123456' });
    expect(line.colorVar).toBe('#123456');
    expect(line.labelColorVar).toBe('#123456');
  });

  it('no override → falls back to the band color', () => {
    const line = emaLine(50);
    expect(line.colorVar).toBe('var(--ema-50)');
    expect(line.labelColorVar).toBe('var(--chart-ema-50-label)');
  });
});

describe('no shared mutation of def.defaultStyle', () => {
  it('two calls return distinct style / lines objects, never the def singleton', () => {
    const a = defaultConfigFor('ti:ema', { params: { period: 10 } });
    const b = defaultConfigFor('ti:ema', { params: { period: 200 } });
    expect(a).toBeDefined();
    expect(b).toBeDefined();
    expect(a!.style).not.toBe(b!.style);
    expect(a!.style).not.toBe(emaTalibDef.defaultStyle);
    expect(a!.style.lines).not.toBe(emaTalibDef.defaultStyle.lines);
    expect(a!.style.lines[0]).not.toBe(emaTalibDef.defaultStyle.lines[0]);
  });
});
