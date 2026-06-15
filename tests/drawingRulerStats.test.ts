import { describe, it, expect } from 'vitest';
import type { Candle } from '../src/types';
import { computeRulerStats } from '../src/drawings/rulerStats';

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

  it('returns zero bars when a date is out of range', () => {
    const r = computeRulerStats(
      { date: '1999-01-01', price: 100 },
      { date: data[3].date, price: 110 },
      data,
    );
    expect(r.bars).toBe(0);
  });
});
