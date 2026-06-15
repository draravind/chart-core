import { describe, it, expect } from 'vitest';
import { DRAWING_DEFAULTS, effectiveDrawingStyle } from '../src/drawings/defaults';
import { normalizeDrawing } from '../src/drawings/types';

describe('effectiveDrawingStyle', () => {
  it('returns all defaults for no override', () => {
    const eff = effectiveDrawingStyle(undefined);
    expect(eff.color).toBe(DRAWING_DEFAULTS.color);
    expect(eff.width).toBe(DRAWING_DEFAULTS.width);
    expect(eff.style).toBe(DRAWING_DEFAULTS.style);
    expect(eff.opacity).toBe(DRAWING_DEFAULTS.opacity);
    expect(eff.fontSize).toBe(DRAWING_DEFAULTS.fontSize);
    expect(eff.bgColor).toBe(DRAWING_DEFAULTS.bgColor);
    expect(eff.bgOpacity).toBe(DRAWING_DEFAULTS.bgOpacity);
  });

  it('merges sparse overrides over defaults without mutating the input', () => {
    const input = { color: '#ffffff', width: 3 };
    const frozen = { ...input };
    const eff = effectiveDrawingStyle(input);
    expect(eff.color).toBe('#ffffff');
    expect(eff.width).toBe(3);
    // untouched fields fall back to defaults
    expect(eff.opacity).toBe(DRAWING_DEFAULTS.opacity);
    expect(eff.style).toBe(DRAWING_DEFAULTS.style);
    // purity
    expect(input).toEqual(frozen);
  });
});

describe('normalizeDrawing read-tolerance', () => {
  it('keeps a valid trendline', () => {
    const d = {
      id: 'a',
      type: 'trendline',
      a: { date: '2024-01-01', price: 10 },
      b: { date: '2024-01-02', price: 20 },
    };
    expect(normalizeDrawing(d)).toBe(d);
  });

  it('keeps a valid hline / vline / text / hray', () => {
    expect(normalizeDrawing({ id: 'h', type: 'hline', price: 5 })).not.toBeNull();
    expect(normalizeDrawing({ id: 'v', type: 'vline', date: '2024-01-01' })).not.toBeNull();
    expect(
      normalizeDrawing({ id: 't', type: 'text', a: { date: '2024-01-01', price: 5 } }),
    ).not.toBeNull();
    expect(
      normalizeDrawing({ id: 'r', type: 'hray', a: { date: '2024-01-01', price: 5 } }),
    ).not.toBeNull();
  });

  it('drops unrenderable / malformed payloads', () => {
    expect(normalizeDrawing(null)).toBeNull();
    expect(normalizeDrawing(42)).toBeNull();
    expect(normalizeDrawing({ type: 'hline', price: 5 })).toBeNull(); // no id
    expect(normalizeDrawing({ id: '', type: 'hline', price: 5 })).toBeNull(); // empty id
    expect(normalizeDrawing({ id: 'x', type: 'hline' })).toBeNull(); // no price
    expect(normalizeDrawing({ id: 'x', type: 'trendline', a: { date: 'd', price: 1 } })).toBeNull(); // no b
  });

  it('round-trips an unknown type rather than crashing', () => {
    const future = { id: 'z', type: 'fibonacci', levels: [0, 0.5, 1] };
    expect(normalizeDrawing(future)).toBe(future);
  });
});
