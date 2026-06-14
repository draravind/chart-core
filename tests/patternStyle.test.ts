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

  // The nine added patterns. Each renderer reads exactly the keys asserted here,
  // all neutral-gray #252525 with house opacities, so zero-config visuals are
  // stable and recoloring via the gear dialog hits every drawn element.
  const LABEL = {
    labelBg: '#252525',
    labelBgOpacity: 0.7,
    labelTextColor: '#ffffff',
    labelFontSize: 11,
  };
  const MARKER = { markerColor: '#252525', markerOpacity: 0.9 };

  it('gap_up', () => {
    expect(APPEARANCE_DEFAULTS.patterns.gap_up).toEqual({
      bandFill: '#252525',
      bandFillOpacity: 0.1,
      ...LABEL,
    });
  });

  it('volume_breakout', () => {
    expect(APPEARANCE_DEFAULTS.patterns.volume_breakout).toEqual({
      ...MARKER,
      ...LABEL,
    });
  });

  it('golden_cross', () => {
    expect(APPEARANCE_DEFAULTS.patterns.golden_cross).toEqual({
      dotFill: '#252525',
      ...LABEL,
    });
  });

  it('nr7', () => {
    expect(APPEARANCE_DEFAULTS.patterns.nr7).toEqual({
      lineColor: '#252525',
      lineWidth: 1,
      lineOpacity: 0.5,
      ...MARKER,
      ...LABEL,
    });
  });

  it('unusual_volume', () => {
    expect(APPEARANCE_DEFAULTS.patterns.unusual_volume).toEqual({
      ...MARKER,
      ...LABEL,
    });
  });

  it('volume_dryup', () => {
    expect(APPEARANCE_DEFAULTS.patterns.volume_dryup).toEqual({
      ...MARKER,
      ...LABEL,
    });
  });

  it('pocket_pivot', () => {
    expect(APPEARANCE_DEFAULTS.patterns.pocket_pivot).toEqual({
      ...MARKER,
      ...LABEL,
    });
  });

  it('inside_day', () => {
    expect(APPEARANCE_DEFAULTS.patterns.inside_day).toEqual({
      lineColor: '#252525',
      lineWidth: 1.5,
      lineOpacity: 0.5,
      boxStroke: '#252525',
      boxStrokeWidth: 1.5,
      boxStrokeOpacity: 0.6,
      ...LABEL,
    });
  });

  it('pullback_to_ema', () => {
    expect(APPEARANCE_DEFAULTS.patterns.pullback_to_ema).toEqual({
      dotFill: '#252525',
      lineColor: '#252525',
      lineWidth: 1.5,
      lineOpacity: 0.5,
      ...LABEL,
    });
  });
});
