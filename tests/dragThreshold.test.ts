import { describe, it, expect } from 'vitest';
import { dragThresholdFor } from '../src/gestures/thresholds';

describe('dragThresholdFor', () => {
  it('a finger needs 10px; a mouse or pen needs 4', () => {
    expect(dragThresholdFor('touch')).toBe(10);
    expect(dragThresholdFor('mouse')).toBe(4);
    expect(dragThresholdFor('pen')).toBe(4);
  });

  it('an unknown / absent pointer type falls back to 4', () => {
    expect(dragThresholdFor(undefined)).toBe(4);
    expect(dragThresholdFor('')).toBe(4);
  });
});
