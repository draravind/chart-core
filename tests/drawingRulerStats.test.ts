import { describe, it, expect } from 'vitest';
import type { Candle } from '../src/types';
import { computeRulerStats, directionFill } from '../src/drawings/rulerStats';
import { DRAWING_DEFAULTS } from '../src/drawings/defaults';

function makeData(n: number): Candle[] {
  const out: Candle[] = [];
  for (let i = 0; i < n; i++) {
    const day = String(i + 1).padStart(2, '0');
    out.push({
      date: `2024-02-${day}`,
      open: 100,
      high: 110,
      low: 90,
      close: 105,
      volume: 1000,
    });
  }
  return out;
}

describe('computeRulerStats', () => {
  const data = makeData(12);

  it('measures bars, delta, percent and direction (up)', () => {
    const r = computeRulerStats(
      { date: data[2].date, price: 100 },
      { date: data[7].date, price: 120 },
      data,
    );
    expect(r.bars).toBe(5);
    expect(r.priceDelta).toBeCloseTo(20, 6);
    expect(r.pricePct).toBeCloseTo(20, 6);
    expect(r.direction).toBe('up');
    expect(r.startDate).toBe(data[2].date);
    expect(r.endDate).toBe(data[7].date);
  });

  it('handles reversed anchor order (down)', () => {
    const r = computeRulerStats(
      { date: data[7].date, price: 120 },
      { date: data[2].date, price: 100 },
      data,
    );
    expect(r.bars).toBe(5);
    expect(r.priceDelta).toBeCloseTo(-20, 6);
    expect(r.direction).toBe('down');
    // start/end re-ordered by date regardless of anchor order.
    expect(r.startDate).toBe(data[2].date);
    expect(r.endDate).toBe(data[7].date);
  });

  it('reports flat when prices are equal', () => {
    const r = computeRulerStats(
      { date: data[0].date, price: 100 },
      { date: data[3].date, price: 100 },
      data,
    );
    expect(r.direction).toBe('flat');
    expect(r.priceDelta).toBe(0);
  });

  it('guards a zero start price (no divide-by-zero)', () => {
    const r = computeRulerStats(
      { date: data[0].date, price: 0 },
      { date: data[1].date, price: 50 },
      data,
    );
    expect(r.pricePct).toBe(0);
    expect(Number.isFinite(r.pricePct)).toBe(true);
  });

  it('returns zero bars when a date is before the first bar', () => {
    const r = computeRulerStats(
      { date: '1999-01-01', price: 100 },
      { date: data[3].date, price: 110 },
      data,
    );
    expect(r.bars).toBe(0);
  });

  it('measures a meaningful span to an endpoint past the last bar', () => {
    // Last bar is 2024-02-12 (index 11); 2024-02-15 is 3 median-steps past it
    // (effective index 14). From index 9 → 14 that is 5 bars.
    const r = computeRulerStats(
      { date: data[9].date, price: 100 },
      { date: '2024-02-15', price: 110 },
      data,
    );
    expect(r.bars).toBe(5);
  });

  it('reports whole calendar days between two consecutive-day anchors', () => {
    // 2024-02-03 → 2024-02-08 is exactly 5 calendar days.
    const r = computeRulerStats(
      { date: data[2].date, price: 100 },
      { date: data[7].date, price: 120 },
      data,
    );
    expect(r.calendarDays).toBe(5);
  });

  it('gives the same calendar-day magnitude when the anchor order is reversed', () => {
    const r = computeRulerStats(
      { date: data[7].date, price: 120 },
      { date: data[2].date, price: 100 },
      data,
    );
    expect(r.calendarDays).toBe(5);
  });

  it('counts whole calendar days to a synthesized future date', () => {
    // Real 2024-02-10 → synthesized 2024-02-15 is 5 calendar days.
    const r = computeRulerStats(
      { date: data[9].date, price: 100 },
      { date: '2024-02-15', price: 110 },
      data,
    );
    expect(r.calendarDays).toBe(5);
  });

  it('sums volume inclusive of BOTH endpoint bars', () => {
    // Indices 2↔7 span 5 bars but TOUCH 6 candles (1000 volume each) → 6000.
    const r = computeRulerStats(
      { date: data[2].date, price: 100 },
      { date: data[7].date, price: 120 },
      data,
    );
    expect(r.bars).toBe(5);
    expect(r.volume).toBe(6000);
  });

  it('contributes zero volume when the end is before the first bar', () => {
    const r = computeRulerStats(
      { date: '1999-01-01', price: 100 },
      { date: data[3].date, price: 110 },
      data,
    );
    expect(r.volume).toBe(0);
  });

  it('sums only real bars when the end is in future space', () => {
    // Index 9 → future 2024-02-15: clamp to [9, 11] → 3 candles → 3000.
    const r = computeRulerStats(
      { date: data[9].date, price: 100 },
      { date: '2024-02-15', price: 110 },
      data,
    );
    expect(r.volume).toBe(3000);
  });
});

describe('directionFill', () => {
  const resolve = (expr: string) => expr; // identity resolver

  it('uses an explicit style.color override regardless of direction', () => {
    expect(directionFill({ direction: 'up' }, { color: '#abcdef' }, resolve)).toBe('#abcdef');
    expect(directionFill({ direction: 'down' }, { color: '#abcdef' }, resolve)).toBe('#abcdef');
  });

  it('returns the positive / negative token by direction when no override', () => {
    expect(directionFill({ direction: 'up' }, undefined, resolve)).toBe('var(--chart-positive)');
    expect(directionFill({ direction: 'down' }, undefined, resolve)).toBe('var(--chart-negative)');
  });

  it('falls back to the drawing default when flat', () => {
    expect(directionFill({ direction: 'flat' }, undefined, resolve)).toBe(DRAWING_DEFAULTS.color);
  });
});
