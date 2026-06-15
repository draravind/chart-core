import { describe, it, expect } from 'vitest';
import * as d3 from 'd3';
import type { Candle } from '../src/types';
import {
  xForDate,
  yForPrice,
  dateForX,
  priceForY,
  projectAnchor,
  extendRay,
  type ProjScale,
} from '../src/drawings/projection';

const N = 20;
const STEP = 10;
const PRICE_HEIGHT = 400;

function makeData(): Candle[] {
  // Sequential trading dates 2024-01-01 .. (kept simple, ISO-sortable).
  const out: Candle[] = [];
  for (let i = 0; i < N; i++) {
    const day = String(i + 1).padStart(2, '0');
    out.push({
      date: `2024-01-${day}`,
      open: 100,
      high: 110,
      low: 90,
      close: 105,
      volume: 1000,
    });
  }
  return out;
}

function makeScale(): ProjScale {
  const data = makeData();
  const xScale = d3
    .scaleBand<number>()
    .domain(d3.range(N))
    .range([0, STEP * (N - 0.3)])
    .paddingInner(0.3)
    .paddingOuter(0);
  const yPrice = d3.scaleLog().domain([10, 1000]).range([PRICE_HEIGHT, 0]);
  return {
    xScale,
    yPrice,
    step: STEP,
    bandwidth: xScale.bandwidth(),
    dataLength: N,
    width: STEP * N,
    priceHeight: PRICE_HEIGHT,
    data,
  };
}

describe('drawing projection', () => {
  it('xForDate ∘ dateForX round-trips for every in-range bar', () => {
    const s = makeScale();
    for (let i = 0; i < N; i++) {
      const x = xForDate(s.data[i].date, s);
      expect(Number.isFinite(x)).toBe(true);
      expect(dateForX(x, s)).toBe(s.data[i].date);
    }
  });

  it('xForDate clamps out-of-range dates to the nearest end bar (never NaN)', () => {
    const s = makeScale();
    const before = xForDate('2020-01-01', s);
    const after = xForDate('2030-01-01', s);
    expect(Number.isFinite(before)).toBe(true);
    expect(Number.isFinite(after)).toBe(true);
    expect(before).toBeCloseTo((s.xScale(0) ?? 0) + s.bandwidth / 2, 6);
    expect(after).toBeCloseTo((s.xScale(N - 1) ?? 0) + s.bandwidth / 2, 6);
  });

  it('dateForX snaps clicks outside the data range to the end bars', () => {
    const s = makeScale();
    expect(dateForX(-9999, s)).toBe(s.data[0].date);
    expect(dateForX(99999, s)).toBe(s.data[N - 1].date);
  });

  it('yForPrice ∘ priceForY round-trips', () => {
    const s = makeScale();
    const y = yForPrice(250, s);
    expect(priceForY(y, s)).toBeCloseTo(250, 6);
  });

  it('projectAnchor returns finite pixels', () => {
    const s = makeScale();
    const p = projectAnchor({ date: s.data[5].date, price: 200 }, s);
    expect(Number.isFinite(p.x)).toBe(true);
    expect(Number.isFinite(p.y)).toBe(true);
  });

  it('extendRay clips the forward ray to the price-pane box', () => {
    // Diagonal up-right exits at the far corner.
    const diag = extendRay({ x: 0, y: 0 }, { x: 10, y: 10 }, 100, 100);
    expect(diag.x2).toBeCloseTo(100, 6);
    expect(diag.y2).toBeCloseTo(100, 6);

    // Horizontal exits at the right edge, y unchanged.
    const horiz = extendRay({ x: 50, y: 50 }, { x: 60, y: 50 }, 100, 100);
    expect(horiz.x2).toBeCloseTo(100, 6);
    expect(horiz.y2).toBeCloseTo(50, 6);

    // Never retracts before p1 (p1 outside the box still reached).
    const beyond = extendRay({ x: 0, y: 0 }, { x: 200, y: 0 }, 100, 100);
    expect(beyond.x2).toBeGreaterThanOrEqual(200);
  });
});
