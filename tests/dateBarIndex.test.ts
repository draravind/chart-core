import { describe, it, expect } from 'vitest';
import type { Candle } from '../src/types';
import {
  medianStepMs,
  futureDateForExtraBars,
  extraBarsForFutureDate,
} from '../src/utils/dateBarIndex';

const DAY = 86_400_000;

function candlesFromDates(dates: string[]): Candle[] {
  return dates.map((date) => ({
    date,
    open: 1,
    high: 1,
    low: 1,
    close: 1,
    volume: 1,
  }));
}

describe('medianStepMs', () => {
  it('returns the one-day step for consecutive daily bars', () => {
    const data = candlesFromDates(['2024-01-01', '2024-01-02', '2024-01-03']);
    expect(medianStepMs(data)).toBe(DAY);
  });

  it('is robust to weekend gaps (median, not mean)', () => {
    // Thu, Fri, Mon, Tue → gaps of 1, 3, 1 days → median 1 day.
    const data = candlesFromDates([
      '2024-01-04',
      '2024-01-05',
      '2024-01-08',
      '2024-01-09',
    ]);
    expect(medianStepMs(data)).toBe(DAY);
  });

  it('falls back to one day with fewer than two bars', () => {
    expect(medianStepMs(candlesFromDates([]))).toBe(DAY);
    expect(medianStepMs(candlesFromDates(['2024-01-01']))).toBe(DAY);
  });
});

describe('futureDateForExtraBars', () => {
  it('projects N days past the last bar, zero-padded', () => {
    const data = candlesFromDates(['2024-01-30', '2024-01-31']);
    // Crosses the month boundary; must zero-pad month/day.
    expect(futureDateForExtraBars(data, 1)).toBe('2024-02-01');
    expect(futureDateForExtraBars(data, 5)).toBe('2024-02-05');
  });

  it('returns empty string for empty data', () => {
    expect(futureDateForExtraBars(candlesFromDates([]), 3)).toBe('');
  });
});

describe('extraBarsForFutureDate', () => {
  it('is the inverse of futureDateForExtraBars', () => {
    const data = candlesFromDates(['2024-01-19', '2024-01-20']);
    for (const n of [1, 3, 20]) {
      expect(extraBarsForFutureDate(data, futureDateForExtraBars(data, n))).toBe(n);
    }
  });

  it('clamps to zero for dates at or before the last bar', () => {
    const data = candlesFromDates(['2024-01-19', '2024-01-20']);
    expect(extraBarsForFutureDate(data, '2024-01-20')).toBe(0);
    expect(extraBarsForFutureDate(data, '2024-01-10')).toBe(0);
  });
});
