import { describe, it, expect } from 'vitest';
import type { Candle } from '../src/types';
import type { IndicatorInput } from '../src/indicators/types';
import {
  volumeDef,
  type VolumeSettings,
} from '../src/indicators/builtins/volume';
import { computeVolumeStats } from '../src/utils/chartCalculations';
import {
  getIndicator,
  defaultConfigFor,
  SUBPANE_ORDER,
} from '../src/indicators/registry';

const DAY = 86_400_000;
const iso = (i: number): string =>
  new Date(Date.UTC(2020, 0, 1) + i * DAY).toISOString().slice(0, 10);

// `up` ⇒ close ≥ open; `down` ⇒ close < open. Index drives the (continuous) date.
function bar(i: number, up: boolean, volume: number): Candle {
  return {
    date: iso(i),
    open: 100,
    high: 102,
    low: 98,
    close: up ? 101 : 99,
    volume,
  };
}

function makeInput(combined: Candle[], displayStart: number): IndicatorInput {
  return {
    o: Float64Array.from(combined.map((b) => b.open)),
    h: Float64Array.from(combined.map((b) => b.high)),
    l: Float64Array.from(combined.map((b) => b.low)),
    c: Float64Array.from(combined.map((b) => b.close)),
    v: Float64Array.from(combined.map((b) => b.volume)),
    bars: combined,
    displayStart,
  };
}

const DEFAULTS: VolumeSettings = {
  smaPeriod: 30,
  smaFade: 1,
  milestones: 1,
  standardOpacity: 0.35,
  fadeOpacity: 0.12,
  upColor: 'var(--chart-positive)',
  downColor: 'var(--chart-negative)',
  labelColor: 'var(--chart-axis-label)',
};

// A 5-bar display window prefixed by a 5-bar warmup seed. The display mixes
// up/down candles plus a zero-volume bar.
const START = 5;
const warmup = Array.from({ length: START }, (_, i) => bar(i, true, 999));
const display: Candle[] = [
  bar(START + 0, true, 100), // up
  bar(START + 1, false, 50), // down
  bar(START + 2, true, 0), // zero volume → NaN in both
  bar(START + 3, false, 200), // down, all-time max
  bar(START + 4, true, 80), // up
];
const combined = warmup.concat(display);

describe('volumeDef.compute', () => {
  it('partitions volume by candle direction, NaN where vol <= 0, aligned after the start offset', () => {
    const series = volumeDef.compute(makeInput(combined, START), DEFAULTS).series;

    // Combined-length arrays; the warmup prefix is all NaN.
    expect(series.volumeUp.length).toBe(combined.length);
    expect(series.volumeDown.length).toBe(combined.length);
    for (let g = 0; g < START; g++) {
      expect(series.volumeUp[g]).toBeNaN();
      expect(series.volumeDown[g]).toBeNaN();
    }

    // After the start-offset write + slice, values align to `display`.
    const up = series.volumeUp.subarray(START);
    const down = series.volumeDown.subarray(START);
    expect(up[0]).toBe(100);
    expect(down[0]).toBeNaN();
    expect(up[1]).toBeNaN();
    expect(down[1]).toBe(50);
    // Zero-volume bar: NaN in BOTH split series.
    expect(up[2]).toBeNaN();
    expect(down[2]).toBeNaN();
    expect(up[3]).toBeNaN();
    expect(down[3]).toBe(200);
    expect(up[4]).toBe(80);
    expect(down[4]).toBeNaN();
  });

  it('HVE/HVY indices in volLabel match computeVolumeStats(display) offset by start', () => {
    const series = volumeDef.compute(makeInput(combined, START), DEFAULTS).series;
    const stats = computeVolumeStats(display, DEFAULTS.smaPeriod);

    const finite: number[] = [];
    for (let g = 0; g < series.volLabel.length; g++) {
      if (!Number.isNaN(series.volLabel[g])) finite.push(g);
    }
    expect(finite.length).toBe(stats.labels.length);
    for (const lbl of stats.labels) {
      const code = lbl.text === 'HVE' ? 1 : 2;
      expect(series.volLabel[START + lbl.index]).toBe(code);
    }
  });

  it('distinguishes HVE (all-time) from HVY (trailing year) over a >1y window', () => {
    // Spike #1 far in the past (all-time max, outside the trailing year);
    // spike #2 recent (max within the trailing 365 days).
    const n = 500;
    const longDisplay = Array.from({ length: n }, (_, i) => bar(i, true, 10));
    longDisplay[10] = bar(10, true, 5000); // HVE (>365d before the last bar)
    longDisplay[480] = bar(480, true, 3000); // HVY (within the trailing year)
    const series = volumeDef.compute(makeInput(longDisplay, 0), DEFAULTS).series;
    expect(series.volLabel[10]).toBe(1); // HVE
    expect(series.volLabel[480]).toBe(2); // HVY
  });

  it('smaFade:0 empties volSma; smaFade:1 fills it once enough bars', () => {
    const off = volumeDef.compute(makeInput(combined, START), {
      ...DEFAULTS,
      smaFade: 0,
    }).series;
    expect([...off.volSma].every((v) => Number.isNaN(v))).toBe(true);

    // With a short averaging window the SMA becomes defined within the display.
    const on = volumeDef.compute(makeInput(combined, START), {
      ...DEFAULTS,
      smaFade: 1,
      smaPeriod: 2,
    }).series;
    expect([...on.volSma].some((v) => Number.isFinite(v))).toBe(true);
  });

  it('milestones:0 empties volLabel', () => {
    const series = volumeDef.compute(makeInput(combined, START), {
      ...DEFAULTS,
      milestones: 0,
    }).series;
    expect([...series.volLabel].every((v) => Number.isNaN(v))).toBe(true);
  });
});

describe('volumeDef registration', () => {
  it('is registered and stacks first in SUBPANE_ORDER', () => {
    expect(getIndicator('volume')).toBeDefined();
    expect(SUBPANE_ORDER[0]).toBe('volume');
  });

  it('paneHeightFactor is the ~15% literal', () => {
    expect(volumeDef.paneHeightFactor).toBe(1.154);
  });

  it('settingsSchema exposes three editable color fields (up / down / label)', () => {
    const colorKeys = volumeDef.settingsSchema
      .filter((f) => f.kind === 'color')
      .map((f) => f.key);
    expect(colorKeys).toEqual(['upColor', 'downColor', 'labelColor']);
  });

  it('domain tickFormat formats axis ticks as K/M/B', () => {
    const spec = volumeDef.domain!({}, {} as VolumeSettings);
    expect(spec!.tickFormat!(12_345_678)).toBe('12M');
  });

  it('legend formats the live volume cell as K/M/B', () => {
    const series = volumeDef.compute(makeInput(combined, START), DEFAULTS).series;
    const rows = volumeDef.legend(series, START + 0, DEFAULTS, {
      priceFmt: (v) => String(v),
    });
    // bar 0 is an up bar of volume 100 → the up row carries the formatted value.
    const valued = rows.filter((r) => r.value);
    expect(valued).toHaveLength(1);
    expect(valued[0].value).toBe('100');
  });
});
