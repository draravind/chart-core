import { describe, it, expect } from 'vitest';
import {
  CANDLE_SOURCE,
  FILLED_HIT_PAD,
  REGION_HIT_TOLERANCE,
  pickHitRegion,
  type HitRegion,
} from '../src/indicators/hitRegions';

// Bars sit on a uniform band: centre of bar g is at `g * STEP`.
const STEP = 10;
const centerXAt = (g: number) => g * STEP;

const BAR_COUNT = 20;
const inRange = (g: number) => g >= 0 && g < BAR_COUNT;

/** A line-like region: y = `values[g]`, NaN ⇒ a gap. */
function lineRegion(values: number[], sourceId = 'line'): HitRegion {
  return {
    sourceId,
    spanAt: (g) => {
      const v = values[g];
      if (v === undefined || Number.isNaN(v)) return null;
      return [v, v];
    },
    halfWidth: 0,
    interpolate: true,
  };
}

/** A filled column: `[top, bottom]` at every in-range bar. */
function columnRegion(
  top: number,
  bottom: number,
  halfWidth: number,
  sourceId = 'column',
  gated: (g: number) => boolean = inRange,
): HitRegion {
  return {
    sourceId,
    spanAt: (g) => (gated(g) ? [top, bottom] : null),
    halfWidth,
    interpolate: false,
  };
}

const pick = (
  mx: number,
  my: number,
  barIdx: number,
  regions: HitRegion[],
  step = STEP,
) => pickHitRegion(mx, my, barIdx, regions, centerXAt, step);

describe('pickHitRegion — line-like regions', () => {
  const flat = lineRegion(Array.from({ length: BAR_COUNT }, () => 100));

  it('hits dead-on', () => {
    expect(pick(50, 100, 5, [flat])).toBe(flat);
  });

  it('hits just inside the tolerance and misses just outside', () => {
    expect(pick(50, 100 + REGION_HIT_TOLERANCE - 0.5, 5, [flat])).toBe(flat);
    expect(pick(50, 100 + REGION_HIT_TOLERANCE + 0.5, 5, [flat])).toBeNull();
  });

  it('never hits inside a NaN gap', () => {
    const values = Array.from({ length: BAR_COUNT }, () => 100);
    values[5] = NaN;
    const gapped = lineRegion(values);
    // Dead-on where the line WOULD have been, had the gap been interpolated.
    expect(pick(50, 100, 5, [gapped])).toBeNull();
    // The bars either side are still hittable.
    expect(pick(40, 100, 4, [gapped])).toBe(gapped);
  });

  it('hits a near-vertical line at sub-pixel bar spacing', () => {
    // Zoomed fully out: bars are 0.2px apart, so the nearest piece of a steep
    // line is ~30 bars away. A fixed ±1 neighbour window would miss this.
    const step = 0.2;
    const values = Array.from({ length: 400 }, (_, g) => g * 5);
    const steep = lineRegion(values);
    const center = (g: number) => g * step;
    // Pointer sits on the segment near bar 200 (y = 1000) but the click lands
    // at bar 170's slot — 6px away in x, which at this zoom is 30 bars.
    const hit = pickHitRegion(
      centerXAt(0) + 170 * step,
      1000,
      170,
      [steep],
      center,
      step,
    );
    expect(hit).toBe(steep);
  });
});

describe('pickHitRegion — filled regions', () => {
  // A column 12px wide spanning y 50..150 — e.g. a volume bar.
  const column = columnRegion(50, 150, 6);

  it('hits in the middle of the column (the case that is broken today)', () => {
    expect(pick(50, 100, 5, [column])).toBe(column);
  });

  it('misses outside the column width', () => {
    expect(pick(50 + 6 + FILLED_HIT_PAD + 0.5, 100, 5, [column])).toBeNull();
  });

  it('misses above the column top and below its bottom', () => {
    expect(pick(50, 50 - FILLED_HIT_PAD - 0.5, 5, [column])).toBeNull();
    expect(pick(50, 150 + FILLED_HIT_PAD + 0.5, 5, [column])).toBeNull();
  });

  it('never reaches past the slot midpoint into the next bar, at any zoom', () => {
    for (const step of [0.5, 1, 3, 4, 10, 40, 200]) {
      // A deliberately over-wide mark: the `step / 2` clamp must still bound it.
      const wide = columnRegion(0, 500, 1000);
      const cx = centerXAt(5);
      expect(
        pickHitRegion(cx + step / 2 + 0.01, 250, 5, [wide], centerXAt, step),
        `step=${step}`,
      ).toBeNull();
      expect(
        pickHitRegion(cx + step / 2 - 0.01, 250, 5, [wide], centerXAt, step),
        `step=${step}`,
      ).toBe(wide);
    }
  });

  it('a gated band hits on a flagged bar and misses on an unflagged one', () => {
    const band = columnRegion(380, 392, STEP / 2, 'stage2', (g) => g % 2 === 0);
    expect(pick(centerXAt(4), 386, 4, [band])).toBe(band);
    expect(pick(centerXAt(5), 386, 5, [band])).toBeNull();
  });
});

describe('pickHitRegion — resolution order + bounds', () => {
  it('the later-painted region wins where two overlap', () => {
    const candles = columnRegion(50, 150, 6, CANDLE_SOURCE);
    const line = lineRegion(Array.from({ length: BAR_COUNT }, () => 100), 'ema');
    // The rule itself, stated with an arbitrary order: last painted wins.
    expect(pick(50, 100, 5, [line, candles])?.sourceId).toBe(CANDLE_SOURCE);
    expect(pick(50, 100, 5, [candles, line])?.sourceId).toBe('ema');
  });

  it('a candle beats an indicator line crossing it, at the real paint order', () => {
    // drawSeries paints price-pane indicators first and the candles on top, so
    // this is the order pickHitRegion actually receives. A click where an EMA
    // crosses a body must land on the candle — the mark you can see.
    const line = lineRegion(Array.from({ length: BAR_COUNT }, () => 100), 'ema');
    const candles = columnRegion(50, 150, 6, CANDLE_SOURCE);
    expect(pick(50, 100, 5, [line, candles])?.sourceId).toBe(CANDLE_SOURCE);
    // Off the body, the line is still reachable.
    expect(pick(50, 180, 5, [
      lineRegion(Array.from({ length: BAR_COUNT }, () => 180), 'ema'),
      candles,
    ])?.sourceId).toBe('ema');
  });

  it('the candle region hits inside high→low and misses above the high', () => {
    const candle = columnRegion(50, 150, 2, CANDLE_SOURCE);
    expect(pick(50, 60, 5, [candle])?.sourceId).toBe(CANDLE_SOURCE);
    expect(pick(50, 20, 5, [candle])).toBeNull();
  });

  it('an out-of-range bar index returns null rather than clamping to the last bar', () => {
    const column = columnRegion(50, 150, 6);
    const flat = lineRegion(Array.from({ length: BAR_COUNT }, () => 100));
    for (const bad of [BAR_COUNT, BAR_COUNT + 5, -1, NaN]) {
      expect(pick(centerXAt(bad), 100, bad, [column])).toBeNull();
      expect(pick(centerXAt(bad), 100, bad, [flat])).toBeNull();
    }
  });

  it('an empty region list is a miss', () => {
    expect(pick(50, 100, 5, [])).toBeNull();
  });
});
