import { describe, it, expect } from 'vitest';
import {
  reducePointers,
  pointerDistance,
  type PointerMap,
} from '../src/gestures/pointerReducer';

const map = (): PointerMap => new Map();

describe('reducePointers', () => {
  it('one pointer → pan with delta = raw move', () => {
    const m = map();
    expect(reducePointers(m, { type: 'down', pointerId: 1, x: 0, y: 0 }).mode).toBe(
      'pan',
    );
    const r = reducePointers(m, { type: 'move', pointerId: 1, x: 10, y: 5 });
    expect(r).toEqual({ mode: 'pan', panDx: 10, panDy: 5 });
  });

  it('two pointers → pinch ratio (spread doubling → 2)', () => {
    const m = map();
    reducePointers(m, { type: 'down', pointerId: 1, x: 0, y: 0 });
    reducePointers(m, { type: 'down', pointerId: 2, x: 100, y: 0 });
    // Move #2 from x=100 to x=200 → spread 100 → 200 → ratio 2.
    const r = reducePointers(m, { type: 'move', pointerId: 2, x: 200, y: 0 });
    expect(r.mode).toBe('pinch');
    expect(r.zoomRatio).toBeCloseTo(2);
    expect(r.panDx).toBeUndefined();
  });

  it('two → one hand-off leaves the survivor tracking with a zero first frame', () => {
    const m = map();
    reducePointers(m, { type: 'down', pointerId: 1, x: 0, y: 0 });
    reducePointers(m, { type: 'down', pointerId: 2, x: 100, y: 0 });
    expect(reducePointers(m, { type: 'up', pointerId: 2, x: 100, y: 0 }).mode).toBe(
      'pan',
    );
    // First move at the survivor's last position → no phantom jump.
    const first = reducePointers(m, { type: 'move', pointerId: 1, x: 0, y: 0 });
    expect(first).toEqual({ mode: 'pan', panDx: 0, panDy: 0 });
    // Then a real move reports raw travel.
    const next = reducePointers(m, { type: 'move', pointerId: 1, x: 12, y: -3 });
    expect(next).toEqual({ mode: 'pan', panDx: 12, panDy: -3 });
  });

  it('a down for an id already in the map updates its position', () => {
    const m = map();
    reducePointers(m, { type: 'down', pointerId: 1, x: 0, y: 0 });
    reducePointers(m, { type: 'down', pointerId: 1, x: 5, y: 5 });
    expect(m.size).toBe(1);
    expect(m.get(1)).toEqual({ x: 5, y: 5 });
  });

  it('a move or up for an unseen id is ignored', () => {
    const m = map();
    reducePointers(m, { type: 'down', pointerId: 1, x: 0, y: 0 });
    const r = reducePointers(m, { type: 'move', pointerId: 9, x: 50, y: 50 });
    expect(r).toEqual({ mode: 'pan' }); // no delta, map untouched
    expect(m.get(1)).toEqual({ x: 0, y: 0 });
    expect(reducePointers(m, { type: 'up', pointerId: 9, x: 0, y: 0 }).mode).toBe(
      'pan',
    );
    expect(m.size).toBe(1);
  });

  it('cancel removes a pointer just like up', () => {
    const m = map();
    reducePointers(m, { type: 'down', pointerId: 1, x: 0, y: 0 });
    reducePointers(m, { type: 'down', pointerId: 2, x: 100, y: 0 });
    expect(
      reducePointers(m, { type: 'cancel', pointerId: 2, x: 100, y: 0 }).mode,
    ).toBe('pan');
    expect(m.size).toBe(1);
  });

  it('a third pointer does not affect the pinch ratio', () => {
    const m = map();
    reducePointers(m, { type: 'down', pointerId: 1, x: 0, y: 0 });
    reducePointers(m, { type: 'down', pointerId: 2, x: 100, y: 0 });
    reducePointers(m, { type: 'down', pointerId: 3, x: 50, y: 50 });
    // Moving the third finger leaves the first-two spread unchanged → ratio 1.
    const r = reducePointers(m, { type: 'move', pointerId: 3, x: 999, y: 999 });
    expect(r.mode).toBe('pinch');
    expect(r.zoomRatio).toBeCloseTo(1);
  });

  it('a zero prior spread reports no ratio', () => {
    const m = map();
    reducePointers(m, { type: 'down', pointerId: 1, x: 50, y: 50 });
    reducePointers(m, { type: 'down', pointerId: 2, x: 50, y: 50 });
    const r = reducePointers(m, { type: 'move', pointerId: 2, x: 150, y: 50 });
    expect(r.mode).toBe('pinch');
    expect(r.zoomRatio).toBeUndefined();
  });

  it('both up → idle with an empty map', () => {
    const m = map();
    reducePointers(m, { type: 'down', pointerId: 1, x: 0, y: 0 });
    reducePointers(m, { type: 'down', pointerId: 2, x: 100, y: 0 });
    reducePointers(m, { type: 'up', pointerId: 1, x: 0, y: 0 });
    expect(reducePointers(m, { type: 'up', pointerId: 2, x: 100, y: 0 }).mode).toBe(
      'idle',
    );
    expect(m.size).toBe(0);
  });

  it('pointerDistance measures the first two pointers only', () => {
    const m = map();
    expect(pointerDistance(m)).toBe(0);
    m.set(1, { x: 0, y: 0 });
    expect(pointerDistance(m)).toBe(0);
    m.set(2, { x: 3, y: 4 });
    expect(pointerDistance(m)).toBe(5);
  });
});
