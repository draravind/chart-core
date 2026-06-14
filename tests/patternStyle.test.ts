import { describe, it, expect } from 'vitest';
import { APPEARANCE_DEFAULTS } from '../src/appearance/registry';

// The migrated per-pattern defaults must match the literals the three renderers
// shipped before the refactor, so zero-config pattern visuals are unchanged.
describe('APPEARANCE_DEFAULTS.patterns parity with the original renderer consts', () => {
  it('base_breakout', () => {
    expect(APPEARANCE_DEFAULTS.patterns.base_breakout).toEqual({
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
    });
  });

  it('consolidation', () => {
    expect(APPEARANCE_DEFAULTS.patterns.consolidation).toEqual({
      boxFill: '#252525',
      boxFillOpacity: 0.1,
      labelBg: '#252525',
      labelBgOpacity: 0.7,
      labelTextColor: '#ffffff',
      labelFontSize: 11,
    });
  });

  it('high_tight_flag', () => {
    expect(APPEARANCE_DEFAULTS.patterns.high_tight_flag).toEqual({
      poleColor: '#252525',
      poleWidth: 2,
      poleOpacity: 0.35,
      flagFill: '#252525',
      flagFillOpacity: 0.12,
      labelBg: '#252525',
      labelBgOpacity: 0.7,
      labelTextColor: '#ffffff',
      labelFontSize: 11,
    });
  });
});
