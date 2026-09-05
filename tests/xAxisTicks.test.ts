import { describe, it, expect } from 'vitest';
import { chooseTimeTicks, formatCrosshairDate, labelForTick } from '../src/xAxisTicks';

describe('formatCrosshairDate', () => {
  it("formats a normal date as DD Mon 'YY", () => {
    expect(formatCrosshairDate('2026-06-22')).toBe("22 Jun '26");
  });

  it('drops the leading zero on a single-digit day', () => {
    expect(formatCrosshairDate('2026-06-05')).toBe("5 Jun '26");
  });

  it('maps the month-index boundaries (Jan / Dec, no off-by-one)', () => {
    expect(formatCrosshairDate('2026-01-15')).toBe("15 Jan '26");
    expect(formatCrosshairDate('2026-12-15')).toBe("15 Dec '26");
  });
});

// Generate `count` weekday (Mon–Fri) 'YYYY-MM-DD' dates ending ON `endISO`,
// ascending — ~21 bars a month, like real daily NSE data.
function weekdaysEndingOn(endISO: string, count: number): string[] {
  const out: string[] = [];
  const d = new Date(endISO + 'T00:00:00Z');
  while (out.length < count) {
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return out.reverse();
}

const MIN_GAP = 56;
const ticksOf = (dates: string[], step: number) =>
  chooseTimeTicks({ dateAt: (i) => dates[i], from: 0, to: dates.length, step, minGapPx: MIN_GAP });

describe('chooseTimeTicks — the partial-current-month bug', () => {
  // ~13 months of daily bars ending on 2026-09-01: September has ONE bar. The old
  // `.some(gap < minGap)` tripped on that 1-bar month and showed only 2025/2026.
  const dates = weekdaysEndingOn('2026-09-01', 280);
  const step = 5.79; // matches the live /charts case (minGapBars ≈ 9.67)

  it('keeps monthly labels — does NOT collapse to bare years', () => {
    const labels = ticksOf(dates, step).map((t) => t.label);
    // Far more than the 2 year labels the bug produced.
    expect(labels.length).toBeGreaterThan(6);
    // Month names are present…
    expect(labels.some((l) => /^[A-Z][a-z]{2}/.test(l))).toBe(true);
    // …and it is not just years.
    const yearsOnly = labels.every((l) => /^\d{4}$/.test(l));
    expect(yearsOnly).toBe(false);
  });

  it('promotes January to the year, not a month name', () => {
    const ticks = ticksOf(dates, step);
    const jan = ticks.find((t) => dates[t.index].slice(5, 7) === '01');
    expect(jan?.label).toBe('2026');
  });

  it('drops the 1-bar current month instead of the whole axis', () => {
    const ticks = ticksOf(dates, step);
    const minGapBars = MIN_GAP / step;
    // No two kept ticks sit closer than the label width.
    for (let k = 1; k < ticks.length; k++) {
      expect(ticks[k].index - ticks[k - 1].index).toBeGreaterThanOrEqual(minGapBars);
    }
  });
});

describe('chooseTimeTicks — cadence tracks zoom', () => {
  const twoYears = weekdaysEndingOn('2026-09-01', 520);

  it('zoomed out (thin bars) coarsens to quarters/years, not months', () => {
    const labels = ticksOf(twoYears, 1).map((t) => t.label); // minGapBars = 56
    // Monthly (~21 bars) would overlap at 1px/bar, so the cadence must be coarser:
    // every kept pair clears 56 bars.
    const ticks = ticksOf(twoYears, 1);
    for (let k = 1; k < ticks.length; k++) {
      expect(ticks[k].index - ticks[k - 1].index).toBeGreaterThanOrEqual(56);
    }
    expect(labels.length).toBeGreaterThan(0);
  });

  it('zoomed in (fat bars) refines to weeks/days — numeric labels appear', () => {
    // ~2 months of bars at 40px each → minGapBars = 1.4 → weekly/daily cadence.
    const shortWindow = weekdaysEndingOn('2026-09-01', 44);
    const labels = ticksOf(shortWindow, 40).map((t) => t.label);
    // Day-of-month numbers show up (a plain integer label).
    expect(labels.some((l) => /^\d{1,2}$/.test(l))).toBe(true);
  });
});

describe('labelForTick — contextual promotion', () => {
  const dates = ['2025-12-30', '2025-12-31', '2026-01-02', '2026-01-05', '2026-02-02'];
  const at = (i: number) => dates[i];

  it('a January/year start shows the year', () => {
    expect(labelForTick(at, 2, false)).toBe('2026'); // 2025-12-31 → 2026-01-02
  });
  it('a month start (non-January) shows the month name', () => {
    expect(labelForTick(at, 4, false)).toBe('Feb'); // 2026-01-05 → 2026-02-02
  });
  it('mid-month shows the day of month', () => {
    expect(labelForTick(at, 3, false)).toBe('5'); // 2026-01-02 → 2026-01-05
  });
  it('the FIRST visible tick appends the year to a month label (axis anchor)', () => {
    expect(labelForTick(at, 4, true)).toBe('Feb 2026');
  });
});

describe('chooseTimeTicks — degenerate inputs', () => {
  it('returns nothing for an empty/one-bar or zero-step window', () => {
    const d = ['2026-01-01', '2026-01-02'];
    expect(chooseTimeTicks({ dateAt: (i) => d[i], from: 0, to: 1, step: 5, minGapPx: MIN_GAP })).toEqual([]);
    expect(chooseTimeTicks({ dateAt: (i) => d[i], from: 0, to: 2, step: 0, minGapPx: MIN_GAP })).toEqual([]);
  });
});
