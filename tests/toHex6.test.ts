import { describe, it, expect } from 'vitest';
import { toHex6 } from '../src/utils/toHex6';

describe('toHex6 — resolver output → #rrggbb for the native color input', () => {
  it('passes #rrggbb through (lowercased)', () => {
    expect(toHex6('#1C4A4F')).toBe('#1c4a4f');
    expect(toHex6('  #ff00ff ')).toBe('#ff00ff');
  });

  it('converts rgb()/rgba() (0..255 ints), dropping alpha', () => {
    expect(toHex6('rgb(28, 74, 79)')).toBe('#1c4a4f');
    expect(toHex6('rgba(100, 24, 0, 0.5)')).toBe('#641800');
  });

  // Regression: Chrome computes color-mix() tokens to the `color(srgb …)` form
  // (0..1 floats), not rgb(). Without this branch the swatch fell back to #888888.
  it('converts color(srgb r g b) floats, with or without alpha', () => {
    expect(toHex6('color(srgb 0.184314 0.184314 0.184314 / 0.6)')).toBe('#2f2f2f');
    expect(toHex6('color(srgb 0.254902 0.207843 0.352941)')).toBe('#41355a');
    expect(toHex6('color(srgb 0 0 0)')).toBe('#000000');
    expect(toHex6('color(srgb 1 1 1)')).toBe('#ffffff');
  });

  it('falls back to #888888 on unparseable input', () => {
    expect(toHex6('not-a-color')).toBe('#888888');
    expect(toHex6('')).toBe('#888888');
  });
});
