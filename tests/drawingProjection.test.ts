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
import { futureDateForExtraBars } from '../src/utils/dateBarIndex';

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

  it('xForDate left-clamps before the first bar but projects past the last', () => {
    const s = makeScale();
    const before = xForDate('2020-01-01', s);
    expect(Number.isFinite(before)).toBe(true);
    // Left of the first bar still clamps to bar 0.
    expect(before).toBeCloseTo((s.xScale(0) ?? 0) + s.bandwidth / 2, 6);

    // A date one median-step (1 day here) past the last bar projects exactly one
    // step to the right of the last bar's center — into the empty future space.
    const lastX = (s.xScale(N - 1) ?? 0) + s.bandwidth / 2;
    const oneDayPast = xForDate('2024-01-21', s); // day after 2024-01-20
    expect(oneDayPast).toBeCloseTo(lastX + STEP, 6);
    expect(oneDayPast).toBeGreaterThan(lastX);
  });

  it('dateForX left-clamps but synthesizes a capped future date to the right', () => {
    const s = makeScale();
    // Left of the data still snaps to the first bar.
    expect(dateForX(-9999, s)).toBe(s.data[0].date);

    // A click one step right of the last bar's center → the next calendar day.
    const lastX = (s.xScale(N - 1) ?? 0) + s.bandwidth / 2;
    expect(dateForX(lastX + STEP, s)).toBe('2024-01-21');

    // A click far to the right is capped at ~ceil(width/step) bars past the last
    // (here width=200, step=10 → 20), not clamped back to the last bar.
    const capped = dateForX(99999, s);
    expect(capped > s.data[N - 1].date).toBe(true);
    const maxBars = Math.ceil(s.width / s.step);
    expect(capped).toBe(futureDateForExtraBars(s.data, maxBars));
  });

  it('xForDate ∘ dateForX round-trips for a future anchor within the cap', () => {
    const s = makeScale();
    const futureDate = futureDateForExtraBars(s.data, 5);
    const x = xForDate(futureDate, s);
    expect(dateForX(x, s)).toBe(futureDate);
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
