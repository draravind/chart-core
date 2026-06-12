import type { IndicatorDef, IndicatorInput } from '../types';

export type Stage2Settings = {
  smaPeriod: number; // 150
  slopeLookback: number; // 20
  slopeMin: number; // 0.01
  minPeriods: number; // 100 (mirror pandas min_periods)
  bandColor: string;
};

// Fixed pixel height of the bottom band + the band's draw opacity (literals, not
// settings: the band is decorative chrome, only its color is user-editable).
const BAND_PX = 12;
const BAND_OPACITY = 0.18;

/**
 * Stage 2 (advancing) — per-bar trend flag mirroring the daily-scans
 * `stage_2_advancing` rule: a rising 150-bar SMA (≥1% over a 20-bar shift) with
 * price above it. Rendered as a transparent green band hugging the bottom edge
 * of the price pane over every contiguous Stage 2 date range. `stage2[i]` is
 * `1` on Stage 2 bars and `NaN` otherwise so the band predicate is a plain
 * finite-check and nothing is drawn off-range. Derivable from close alone.
 */
export const stage2Def: IndicatorDef<Stage2Settings> = {
  key: 'stage2',
  label: 'Stage 2',
  longLabel: 'Stage 2 Advancing',
  pane: 'price',
  settingsSchema: [
    { key: 'smaPeriod', label: 'SMA length', kind: 'number', default: 150, min: 1 },
    { key: 'slopeLookback', label: 'Slope lookback', kind: 'number', default: 20, min: 1 },
    { key: 'slopeMin', label: 'Slope min', kind: 'number', default: 0.01, min: 0, step: 0.01 },
    { key: 'minPeriods', label: 'Min periods', kind: 'number', default: 100, min: 1 },
    { key: 'bandColor', label: 'Band', kind: 'color', default: 'var(--stage2-band)' },
  ],
  formatParams: (s) => `${s.smaPeriod},${s.slopeLookback}`,
  // Full SMA window + the slope shift, so every displayed bar matches the scan.
  warmupBars: (s) => s.smaPeriod + s.slopeLookback,
  compute: (input: IndicatorInput, s) => {
    const c = input.c;
    const n = c.length;
    const sma = new Float64Array(n);
    // Rolling mean over `smaPeriod` with pandas min_periods semantics: NaN until
    // ≥minPeriods valid closes sit in the trailing window, else mean-of-available.
    for (let i = 0; i < n; i++) {
      const start = Math.max(0, i - s.smaPeriod + 1);
      let sum = 0;
      let count = 0;
      for (let j = start; j <= i; j++) {
        const v = c[j];
        if (!Number.isNaN(v)) {
          sum += v;
          count++;
        }
      }
      sma[i] = count >= s.minPeriods ? sum / count : NaN;
    }
    const stage2 = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const prev = i - s.slopeLookback >= 0 ? sma[i - s.slopeLookback] : NaN;
      const cur = sma[i];
      const slope =
        Number.isNaN(cur) || Number.isNaN(prev) || prev === 0
          ? NaN
          : (cur - prev) / prev;
      stage2[i] = slope > s.slopeMin && c[i] > cur ? 1 : NaN;
    }
    return { series: { stage2 } };
  },
  draw: (ctx, series, scale, s, resolveColor) => {
    const flags = series.stage2;
    if (!flags) return;
    const { xScale, bandwidth, renderStart, renderEnd } = scale;
    const bottom = Math.max(...scale.yPrice.range());
    const top = bottom - BAND_PX;
    ctx.save();
    ctx.fillStyle = resolveColor(s.bandColor);
    ctx.globalAlpha = BAND_OPACITY;
    let runStart = -1;
    const flush = (runEnd: number) => {
      const x1 = xScale(runStart)!;
      const x2 = xScale(runEnd)! + bandwidth;
      ctx.fillRect(x1, top, x2 - x1, BAND_PX);
    };
    for (let g = renderStart; g < renderEnd; g++) {
      if (flags[g] === 1) {
        if (runStart === -1) runStart = g;
      } else if (runStart !== -1) {
        flush(g - 1);
        runStart = -1;
      }
    }
    if (runStart !== -1) flush(renderEnd - 1);
    ctx.restore();
  },
  // The band never moves the price domain (parity with the old width-0 marker).
  autofitKeys: () => [],
  legend: (_series, _idx, s) => [
    { color: s.bandColor, label: 'Stage 2', value: null },
  ],
};
