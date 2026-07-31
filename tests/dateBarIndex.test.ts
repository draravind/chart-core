import { describe, it, expect } from 'vitest';
import type { Candle } from '../src/types';
import {
  medianStepMs,
  futureDateForExtraBars,
  extraBarsForFutureDate,
  barIndexForDateProjected,
  dateForBarIndexProjected,
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

describe('barIndexForDateProjected / dateForBarIndexProjected', () => {
  const daily = candlesFromDates(['2024-01-08', '2024-01-09', '2024-01-10']);

  it('resolves in-range dates to their exact bar, and back', () => {
    expect(barIndexForDateProjected(daily, '2024-01-08')).toBe(0);
    expect(barIndexForDateProjected(daily, '2024-01-09')).toBe(1);
    expect(barIndexForDateProjected(daily, '2024-01-10')).toBe(2);
    for (let i = 0; i < daily.length; i++) {
      expect(dateForBarIndexProjected(daily, i)).toBe(daily[i].date);
    }
  });

  it('extrapolates past the last bar and round-trips', () => {
    expect(barIndexForDateProjected(daily, '2024-01-15')).toBe(7);
    for (const idx of [3, 10, 996]) {
      const iso = dateForBarIndexProjected(daily, idx);
      expect(barIndexForDateProjected(daily, iso)).toBe(idx);
    }
    expect(dateForBarIndexProjected(daily, 3)).toBe('2024-01-11');
  });

  it('extrapolates before the first bar and round-trips', () => {
    expect(barIndexForDateProjected(daily, '2024-01-03')).toBe(-5);
    for (const idx of [-1, -5, -400]) {
      const iso = dateForBarIndexProjected(daily, idx);
      expect(barIndexForDateProjected(daily, iso)).toBe(idx);
    }
    expect(dateForBarIndexProjected(daily, -5)).toBe('2024-01-03');
  });

  it('keeps a mid-week date on the last weekly bar (floor, not round)', () => {
    // Weekly bars are labelled with the week's first trading day. An overlay
    // created on the Friday of the current week sits 4 days past that label —
    // rounding 4/7 would send it one bar into the future.
    const weekly = candlesFromDates(['2024-01-01', '2024-01-08', '2024-01-15']);
    expect(barIndexForDateProjected(weekly, '2024-01-19')).toBe(weekly.length - 1);
    expect(barIndexForDateProjected(weekly, '2024-01-22')).toBe(weekly.length);
  });

  it('handles degenerate inputs without returning null', () => {
    const empty = candlesFromDates([]);
    expect(barIndexForDateProjected(empty, '2024-01-01')).toBe(0);
    expect(dateForBarIndexProjected(empty, 5)).toBe('');

    const single = candlesFromDates(['2024-01-10']);
    expect(barIndexForDateProjected(single, '2024-01-10')).toBe(0);
    // No pair to measure → one-day fallback step.
    expect(barIndexForDateProjected(single, '2024-01-13')).toBe(3);
    expect(barIndexForDateProjected(single, '2024-01-07')).toBe(-3);
    expect(dateForBarIndexProjected(single, 3)).toBe('2024-01-13');
  });

  it('never returns null for a non-empty array', () => {
    for (const iso of ['1990-01-01', '2024-01-09', '2099-12-31']) {
      expect(barIndexForDateProjected(daily, iso)).not.toBeNull();
      expect(Number.isFinite(barIndexForDateProjected(daily, iso))).toBe(true);
    }
  });
});
