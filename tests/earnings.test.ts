import { describe, it, expect } from 'vitest';
import type { QuarterlyResult } from '../src/types';
import { computeEarnings } from '../src/earnings/computeEarnings';

// Hand-rolled quarterly rows, ~91 days apart so the fourth-back quarter lands
// within ±40 days of one year ago (the year-ago match the box scores against).
// Cell columns are: [EPS, EPS-YoY, RPS, RPS-YoY, NPM, NPM-YoY, Score].
const DAY = 86_400_000;
const addDays = (iso: string, d: number): string =>
  new Date(new Date(iso).getTime() + d * DAY).toISOString().slice(0, 10);

type Spec = { eps?: number; rps?: number; npm?: number };
function build(specs: Spec[], start = '2023-01-15'): QuarterlyResult[] {
  return specs.map((s, i) => ({
    label: `Q${i}`,
    date: addDays(start, i * 91),
    eps: s.eps,
    rps: s.rps,
    npm: s.npm,
  }));
}

// Column indices within a row's `cells`.
const C = { eps: 0, epsYoY: 1, rps: 2, rpsYoY: 3, npm: 4, npmYoY: 5, score: 6 };

const FILL: Spec = { eps: 10, rps: 100, npm: 15 };
// Score of the newest quarter, given the current + the year-ago base. The three
// filler quarters between them never fall inside the year-ago tolerance.
function scoreOf(cur: Spec, base: Spec = { eps: 10, rps: 100 }): string {
  const vm = computeEarnings(
    build([{ ...base, npm: 12 }, FILL, FILL, FILL, cur]),
    50,
  );
  return vm.rows[0].cells[C.score].level;
}

describe('computeEarnings — score, one case per branch', () => {
  it('tier 1 (fat margin): green just above, amber just below', () => {
    // > 20 margin, > 0 EPS growth, > 0 RPS growth.
    expect(scoreOf({ eps: 11, rps: 110, npm: 21 })).toBe('up'); // 21>20, +10/+10
    expect(scoreOf({ eps: 11, rps: 110, npm: 20 })).toBe('neutral'); // margin not > 20
  });

  it('tier 2 (mid margin): needs > 10 growth on both legs', () => {
    expect(scoreOf({ eps: 11.1, rps: 111, npm: 11 })).toBe('up'); // 11>10, +11/+11
    expect(scoreOf({ eps: 11, rps: 111, npm: 11 })).toBe('neutral'); // EPS +10, not > 10
  });

  it('tier 3 (thin margin): needs > 25 growth on both legs', () => {
    expect(scoreOf({ eps: 12.6, rps: 126, npm: 6 })).toBe('up'); // 6>5, +26/+26
    expect(scoreOf({ eps: 12.5, rps: 126, npm: 6 })).toBe('neutral'); // EPS +25, not > 25
  });

  it('tier 4 (hyper-grower): thin margin, > 40 growth on both legs', () => {
    expect(scoreOf({ eps: 14.5, rps: 145, npm: 3 })).toBe('up'); // 3>0, +45/+45
    expect(scoreOf({ eps: 14, rps: 145, npm: 3 })).toBe('neutral'); // EPS +40, not > 40
  });

  it('a loss quarter is red despite a fat margin', () => {
    expect(scoreOf({ eps: -1, rps: 100, npm: 30 })).toBe('down');
  });

  it('a null revenue-per-share is red', () => {
    expect(scoreOf({ eps: 20, rps: undefined, npm: 25 })).toBe('down');
  });

  it('a −31% EPS drop on a usable base is red', () => {
    expect(scoreOf({ eps: 6.9, rps: 100, npm: 25 }, { eps: 10, rps: 100 })).toBe('down');
  });

  it('the same −31% drop on a base below the floor is not red-by-growth', () => {
    // Year-ago EPS 0.3 < ₹0.50 floor → base guard, judged on level (margin ≤ 20 → amber).
    expect(scoreOf({ eps: 0.2, rps: 100, npm: 10 }, { eps: 0.3, rps: 100 })).toBe('neutral');
  });

  it('a ₹0.20 year-ago EPS printing +900% is amber, not green (base guard)', () => {
    expect(scoreOf({ eps: 2, rps: 100, npm: 15 }, { eps: 0.2, rps: 100 })).toBe('neutral');
  });

  it('no year-ago row falls back to the level-only base guard', () => {
    // One quarter only → no base. Margin ≤ 20 → amber; > 20 → green.
    expect(computeEarnings(build([{ eps: 5, rps: 50, npm: 10 }]), 50).rows[0].cells[C.score].level).toBe('neutral');
    expect(computeEarnings(build([{ eps: 5, rps: 50, npm: 25 }]), 50).rows[0].cells[C.score].level).toBe('up');
  });

  it('an unknown margin is never green, even at +100% growth', () => {
    expect(scoreOf({ eps: 20, rps: 200, npm: undefined }, { eps: 10, rps: 100 })).toBe('neutral');
  });

  it('a thin-margin hyper-grower is green (margin 3, +45%/+45%)', () => {
    expect(scoreOf({ eps: 14.5, rps: 145, npm: 3 }, { eps: 10, rps: 100 })).toBe('up');
  });
});

describe('computeEarnings — view model', () => {
  it('12 quarters → 6 rows, newest first, older quarters still feed the YoY', () => {
    const specs = Array.from({ length: 12 }, (_, i) => ({
      eps: 100 + i,
      rps: 1000 + i,
      npm: 15,
    }));
    const vm = computeEarnings(build(specs), 50);
    expect(vm.rows).toHaveLength(6);
    // Newest (eps 111) on top, sixth row is eps 106.
    expect(vm.rows[0].cells[C.eps].text).toBe('111');
    expect(vm.rows[5].cells[C.eps].text).toBe('106');
    // The newest row's YoY resolved — proof a quarter beyond the visible six
    // (index 7, one year back) fed it.
    expect(vm.rows[0].cells[C.epsYoY].text).not.toBe('');
  });

  it('3 quarters → 3 rows, blank YoY, no crash', () => {
    const vm = computeEarnings(build([{ eps: 5, rps: 50, npm: 10 }, { eps: 6, rps: 60, npm: 11 }, { eps: 7, rps: 70, npm: 12 }]), 50);
    expect(vm.rows).toHaveLength(3);
    expect(vm.rows[0].cells[C.epsYoY]).toEqual({ text: '', level: 'muted' });
  });

  it('0 quarters → empty rows', () => {
    expect(computeEarnings([], 50).rows).toEqual([]);
    expect(computeEarnings(undefined, undefined).rows).toEqual([]);
  });

  it('unsorted input is sorted (newest still on top)', () => {
    const rows = build([{ eps: 100 }, { eps: 101 }, { eps: 102 }]);
    const vm = computeEarnings([...rows].reverse(), 50);
    expect(vm.rows[0].cells[C.eps].text).toBe('102'); // the latest date
  });

  it('a garbage date drops out without NaN-ing its neighbours', () => {
    const good = build([{ eps: 100, rps: 1000, npm: 15 }, { eps: 101, rps: 1010, npm: 16 }]);
    const withJunk: QuarterlyResult[] = [
      ...good,
      { label: 'bad', date: 'not-a-date', eps: 999, rps: 999, npm: 99 },
    ];
    const vm = computeEarnings(withJunk, 50);
    expect(vm.rows).toHaveLength(2); // junk row dropped
    expect(vm.rows[0].cells[C.eps].text).toBe('101');
  });
});

describe('computeEarnings — cell colours at the boundary value', () => {
  it('EPS at exactly 1.75× and 1.25× the trailing-4 average', () => {
    // Four older quarters at EPS 10 → trailing average 10.
    const older: Spec[] = [
      { eps: 10, rps: 100 },
      { eps: 10, rps: 100 },
      { eps: 10, rps: 100 },
      { eps: 10, rps: 100 },
    ];
    const at175 = computeEarnings(build([...older, { eps: 17.5, rps: 100 }]), 50);
    expect(at175.rows[0].cells[C.eps].level).toBe('up'); // not > 1.75×, falls to > 1.25×
    const at125 = computeEarnings(build([...older, { eps: 12.5, rps: 100 }]), 50);
    expect(at125.rows[0].cells[C.eps].level).toBe('neutral'); // not > 1.25×
    const above = computeEarnings(build([...older, { eps: 17.6, rps: 100 }]), 50);
    expect(above.rows[0].cells[C.eps].level).toBe('strong'); // > 1.75×
  });

  it('NPM at exactly 5 and 12', () => {
    expect(computeEarnings(build([{ eps: 5, rps: 50, npm: 5 }]), 50).rows[0].cells[C.npm].level).toBe('down');
    expect(computeEarnings(build([{ eps: 5, rps: 50, npm: 12 }]), 50).rows[0].cells[C.npm].level).toBe('neutral');
    expect(computeEarnings(build([{ eps: 5, rps: 50, npm: 13 }]), 50).rows[0].cells[C.npm].level).toBe('up');
  });

  it('free-float at exactly 60, 30, 20', () => {
    expect(computeEarnings(build([{ eps: 1 }]), 60).freeFloat.level).toBe('up');
    expect(computeEarnings(build([{ eps: 1 }]), 30).freeFloat.level).toBe('neutral');
    expect(computeEarnings(build([{ eps: 1 }]), 20).freeFloat.level).toBe('down');
    expect(computeEarnings(build([{ eps: 1 }]), 61).freeFloat.level).toBe('neutral'); // > 60
  });

  it('EPS YoY at exactly 25 and −5', () => {
    const at25 = computeEarnings(build([{ eps: 100, rps: 100 }, FILL, FILL, FILL, { eps: 125, rps: 100 }]), 50);
    expect(at25.rows[0].cells[C.epsYoY].level).toBe('neutral'); // +25, not > 25
    const atMinus5 = computeEarnings(build([{ eps: 100, rps: 100 }, FILL, FILL, FILL, { eps: 95, rps: 100 }]), 50);
    expect(atMinus5.rows[0].cells[C.epsYoY].level).toBe('down'); // −5, not > −5
    const above = computeEarnings(build([{ eps: 100, rps: 100 }, FILL, FILL, FILL, { eps: 126, rps: 100 }]), 50);
    expect(above.rows[0].cells[C.epsYoY].level).toBe('up'); // +26 > 25
  });

  it('a ≤ 0 current level forces red on the YoY cell whatever the growth', () => {
    // Current EPS −10 improving from −100 (a +90% move) still reads red.
    const vm = computeEarnings(build([{ eps: -100, rps: 100 }, FILL, FILL, FILL, { eps: -10, rps: 100 }]), 50);
    expect(vm.rows[0].cells[C.epsYoY].level).toBe('down');
  });
});
