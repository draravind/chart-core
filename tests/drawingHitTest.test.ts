import { describe, it, expect } from 'vitest';
import {
  distToSegment,
  hitSegment,
  hitHLine,
  hitVLine,
  hitTextBox,
  hitAnchoredSegment,
  HANDLE_RADIUS,
  HIT_TOLERANCE,
} from '../src/drawings/hitTest';

const HANDLE_GRAB = HANDLE_RADIUS + HIT_TOLERANCE;

describe('distToSegment', () => {
  it('is zero on the segment', () => {
    expect(distToSegment(5, 0, 0, 0, 10, 0)).toBe(0);
  });
  it('is the perpendicular distance off the segment', () => {
    expect(distToSegment(5, 4, 0, 0, 10, 0)).toBeCloseTo(4, 6);
  });
  it('clamps to the nearer endpoint past the ends', () => {
    expect(distToSegment(-3, 4, 0, 0, 10, 0)).toBeCloseTo(5, 6);
  });
});

describe('hitSegment', () => {
  const p0 = { x: 0, y: 0 };
  const p1 = { x: 100, y: 0 };

  it('grabs endpoint 0', () => {
    expect(hitSegment(0, 0, p0, p1)).toEqual({ kind: 'handle', index: 0 });
  });
  it('grabs endpoint 1', () => {
    expect(hitSegment(100, 0, p0, p1)).toEqual({ kind: 'handle', index: 1 });
  });
  it('hits the body at the midpoint', () => {
    expect(hitSegment(50, 0, p0, p1)).toEqual({ kind: 'body' });
  });
  it('misses when far from the segment', () => {
    expect(hitSegment(50, 50, p0, p1)).toBeNull();
  });
  it('respects the body tolerance boundary', () => {
    expect(hitSegment(50, HIT_TOLERANCE, p0, p1)).toEqual({ kind: 'body' });
    expect(hitSegment(50, HIT_TOLERANCE + 0.5, p0, p1)).toBeNull();
  });
  it('respects the handle grab boundary', () => {
    expect(hitSegment(50, 0, { x: 50 - HANDLE_GRAB, y: 0 }, p1)).toEqual({
      kind: 'handle',
      index: 0,
    });
  });
});

describe('hitHLine / hitVLine / hitTextBox', () => {
  it('hitHLine hits within tolerance of y across the width', () => {
    expect(hitHLine(40, 100, 100, 200)).toEqual({ kind: 'body' });
    expect(hitHLine(40, 100 + HIT_TOLERANCE + 1, 100, 200)).toBeNull();
  });
  it('hitVLine hits within tolerance of x down the pane', () => {
    expect(hitVLine(100, 50, 100, 400)).toEqual({ kind: 'body' });
    expect(hitVLine(100 + HIT_TOLERANCE + 1, 50, 100, 400)).toBeNull();
  });
  it('hitTextBox hits inside the rect only', () => {
    const box = { x: 10, y: 10, width: 40, height: 20 };
    expect(hitTextBox(30, 20, box)).toEqual({ kind: 'body' });
    expect(hitTextBox(5, 20, box)).toBeNull();
  });
});

describe('hitAnchoredSegment (hray)', () => {
  const a = { x: 20, y: 50 };
  const end = { x: 200, y: 50 };
  it('grabs the single anchor handle', () => {
    expect(hitAnchoredSegment(20, 50, a, end)).toEqual({ kind: 'handle', index: 0 });
  });
  it('treats the body as a body hit', () => {
    expect(hitAnchoredSegment(120, 50, a, end)).toEqual({ kind: 'body' });
  });
  it('misses off the line', () => {
    expect(hitAnchoredSegment(120, 80, a, end)).toBeNull();
  });
});
