import { describe, it, expect } from 'vitest';
import {
  clampStatsPosition,
  defaultStatsPosition,
} from '../src/stats/position';

describe('clampStatsPosition', () => {
  it('passes through a position already inside the bounds', () => {
    expect(clampStatsPosition({ x: 50, y: 30 }, 800, 600, 200, 100)).toEqual({
      x: 50,
      y: 30,
    });
  });

  it('clamps negative coordinates to the top-left edge', () => {
    expect(clampStatsPosition({ x: -20, y: -5 }, 800, 600, 200, 100)).toEqual({
      x: 0,
      y: 0,
    });
  });

  it('clamps overshoot so the panel stays fully visible', () => {
    expect(clampStatsPosition({ x: 999, y: 999 }, 800, 600, 200, 100)).toEqual({
      x: 600,
      y: 500,
    });
  });

  it('clamps exactly at the bottom-right limit', () => {
    expect(clampStatsPosition({ x: 600, y: 500 }, 800, 600, 200, 100)).toEqual({
      x: 600,
      y: 500,
    });
  });

  it('pins to 0 when the panel is larger than the host', () => {
    expect(clampStatsPosition({ x: 40, y: 40 }, 150, 80, 200, 100)).toEqual({
      x: 0,
      y: 0,
    });
  });
});

describe('defaultStatsPosition', () => {
  it('places the panel top-right, left of the axis gutter', () => {
    // x = hostW − panelW − marginRight − 8
    expect(defaultStatsPosition(800, 200, 60)).toEqual({ x: 532, y: 8 });
  });

  it('tracks the gutter width', () => {
    expect(defaultStatsPosition(800, 200, 0)).toEqual({ x: 592, y: 8 });
  });

  it('pins to the left edge when the host is narrower than panel+gutter', () => {
    expect(defaultStatsPosition(200, 250, 60)).toEqual({ x: 0, y: 8 });
  });
});
