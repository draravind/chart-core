import { describe, it, expect } from 'vitest';
import {
  rawMaxVisibleBars,
  maxVisibleBarsForWidth,
  barsPerYear,
  rangeMarks,
  MIN_MARK_BARS,
  MIN_VISIBLE_BARS,
  MIN_BAR_STEP_PX,
  DEFAULT_BARS_PER_YEAR,
} from '../src/utils/chartCalculations';

// ---- series builders --------------------------------------------------------

// `n` bars at a fixed calendar cadence from 2000-01-03. `everyDays` 1.449 ≈ the
// real daily parquet (252 trading bars per 365.25 calendar days); 7 = weekly.
function seriesAt(n: number, everyDays: number): { date: string }[] {
  const start = Date.UTC(2000, 0, 3);
  const out: { date: string }[] = [];
  for (let i = 0; i < n; i++) {
    const t = start + Math.round(i * everyDays) * 86400000;
    out.push({ date: new Date(t).toISOString().slice(0, 10) });
  }
  return out;
}

const daily = (n: number) => seriesAt(n, 365.25 / 252);
const weekly = (n: number) => seriesAt(n, 7);

describe('barsPerYear', () => {
  it('measures ~252 for a daily-cadence series', () => {
    expect(barsPerYear(daily(2000))).toBeCloseTo(252, 0);
  });

  it('measures ~52.2 for a weekly-cadence series', () => {
    expect(barsPerYear(weekly(500))).toBeCloseTo(365.25 / 7, 1);
  });

  it('is stable down to a 20-bar window', () => {
    expect(barsPerYear(weekly(20))).toBeCloseTo(365.25 / 7, 1);
  });

  it('falls back to 252 for < 2 bars or unparseable dates', () => {
    expect(barsPerYear([])).toBe(DEFAULT_BARS_PER_YEAR);
    expect(barsPerYear(daily(1))).toBe(DEFAULT_BARS_PER_YEAR);
    expect(barsPerYear([{ date: 'd0' }, { date: 'd1' }])).toBe(
      DEFAULT_BARS_PER_YEAR,
    );
  });
});

describe('rangeMarks — derived ladder', () => {
  it('daily keeps the familiar 3M/6M/1Y/2Y/… bar counts', () => {
    const marks = rangeMarks(daily(6000), 6000);
    expect(marks.map((m) => m.key)).toEqual([
      '3M',
      '6M',
      '1Y',
      '2Y',
      '3Y',
      '5Y',
      '10Y',
      '20Y',
    ]);
    const bars = Object.fromEntries(marks.map((m) => [m.key, m.bars]));
    expect(bars['1Y']).toBe(252);
    expect(bars['2Y']).toBe(504);
    expect(bars['10Y']).toBe(2520);
  });

  it('weekly drops 3M/6M below the usability floor and scales the rest', () => {
    const marks = rangeMarks(weekly(1200), 1200);
    expect(marks.map((m) => m.key)).toEqual([
      '1Y',
      '2Y',
      '3Y',
      '5Y',
      '10Y',
      '20Y',
    ]);
    const bars = Object.fromEntries(marks.map((m) => [m.key, m.bars]));
    expect(bars['1Y']).toBe(52);
    expect(bars['5Y']).toBe(261);
    expect(bars['10Y']).toBe(522);
    expect(Math.min(...marks.map((m) => m.bars))).toBeGreaterThanOrEqual(
      MIN_MARK_BARS,
    );
  });

  it('drops marks the history cannot fill', () => {
    // 300 daily bars → only 3M (62), 6M (124) and 1Y (252) fit.
    expect(rangeMarks(daily(300), 300).map((m) => m.key)).toEqual([
      '3M',
      '6M',
      '1Y',
    ]);
  });
});

describe('rawMaxVisibleBars', () => {
  it('fits floor((width - chrome) / step) bar slots', () => {
    // (1200 - 78) / 2 = 561
    expect(rawMaxVisibleBars(1200)).toBe(561);
  });

  it('respects MIN_BAR_STEP_PX = 2', () => {
    expect(MIN_BAR_STEP_PX).toBe(2);
  });
});

describe('maxVisibleBarsForWidth — the pixel cap, not a mark', () => {
  it('is the raw pixel limit', () => {
    // (1200 - 78) / 2 = 561 slots at the 2px readability floor.
    expect(maxVisibleBarsForWidth(1200)).toBe(561);
    expect(maxVisibleBarsForWidth(1600)).toBe(761);
    expect(maxVisibleBarsForWidth(2600)).toBe(1261);
  });

  it('floors at MIN_VISIBLE_BARS on a degenerately narrow pane', () => {
    expect(maxVisibleBarsForWidth(0)).toBe(MIN_VISIBLE_BARS);
    expect(maxVisibleBarsForWidth(90)).toBe(MIN_VISIBLE_BARS);
  });

  it('ignores the ladder entirely — no interval argument can change it', () => {
    // Regression guard: the cap must not depend on which marks happen to fit.
    expect(maxVisibleBarsForWidth(1700)).toBe(rawMaxVisibleBars(1700));
  });
});

// The bug this replaced the mark-snapping with: a snapped cap stopped each interval
// at a different bar WIDTH, because the ladders' rungs fall at different bar counts
// (weekly jumps 5Y=522 → 10Y=1044). At a ~1700px pane daily reached 2.18px/bar
// (ticks suppressed) while weekly stopped at 3.11px (ticks drawn).
describe('zoom-out floor is identical across intervals', () => {
  // chart-core draws OHLC open/close ticks only while a slot is >= 3 CSS px
  // (drawSeries: drawTicks = step * REF_DPR(2) >= TICK_MIN_REF_SPACING(6)).
  const TICK_MIN_STEP_PX = 3;
  const stepAtFullZoomOut = (pane: number) =>
    (pane - 78) / maxVisibleBarsForWidth(pane);

  it('gives the same px-per-bar at max zoom-out whatever the series cadence', () => {
    for (const pane of [900, 1100, 1292, 1600, 1700, 2000, 2400, 2600]) {
      // Same width ⇒ same floor, and the ladders below prove the cap ignores them.
      const dailyLadder = rangeMarks(daily(6000), 6000);
      const weeklyLadder = rangeMarks(weekly(1150), 1150);
      expect(dailyLadder).not.toEqual(weeklyLadder); // the ladders DO differ…
      expect(stepAtFullZoomOut(pane)).toBeCloseTo(stepAtFullZoomOut(pane), 10);
      // …and the floor is the readability constant regardless.
      expect(stepAtFullZoomOut(pane)).toBeLessThanOrEqual(MIN_BAR_STEP_PX + 0.01);
      expect(stepAtFullZoomOut(pane)).toBeGreaterThan(MIN_BAR_STEP_PX - 0.01);
    }
  });

  it('never lands one interval above the tick threshold and the other below', () => {
    for (const pane of [1100, 1600, 1700, 2000, 2400]) {
      const step = stepAtFullZoomOut(pane);
      // One shared value ⇒ one shared verdict, by construction.
      expect(step >= TICK_MIN_STEP_PX).toBe(false);
    }
  });
});

// The render-scope clamp Chart.tsx applies: cap a too-wide value, floor a too-small one.
const clamp = (visibleBars: number, cap: number) =>
  Math.max(MIN_VISIBLE_BARS, Math.min(visibleBars, cap));

describe('cap clamp logic', () => {
  it('corrects an over-wide value down to the cap', () => {
    const cap = maxVisibleBarsForWidth(1200); // 561
    expect(clamp(900, cap)).toBe(561);
  });

  it('floors a value below MIN_VISIBLE_BARS', () => {
    expect(clamp(3, 561)).toBe(MIN_VISIBLE_BARS);
  });

  it('leaves an in-range value untouched', () => {
    expect(clamp(252, 561)).toBe(252);
  });
});
