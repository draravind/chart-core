import { describe, it, expect } from 'vitest';
import {
  PATTERN_CATALOG,
  PATTERN_NAMES,
} from '../src/patterns/catalog';
import { renderers } from '../src/patterns/renderers';

describe('pattern catalog', () => {
  it('lists exactly the renderable patterns (map-sync guard)', () => {
    expect(PATTERN_NAMES).toEqual(Object.keys(renderers));
  });

  it('gives every entry a non-empty label', () => {
    for (const entry of PATTERN_CATALOG) {
      expect(entry.label.trim().length).toBeGreaterThan(0);
    }
  });
});
