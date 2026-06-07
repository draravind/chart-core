import type { IndicatorDef, IndicatorInput } from '../types';

export type Stage2Params = {
  smaPeriod: number; // 150
  slopeLookback: number; // 20
  slopeMin: number; // 0.01
  minPeriods: number; // 100 (mirror pandas min_periods)
};

// Fixed pixel height of the bottom band. NOT a param: `draw` is invoked as
// def.draw(ctx, series, scale, resolved) (drawSeries.ts) and never receives
// params, so a per-instance height would be unreachable at draw time.
const BAND_PX = 12;

/**
 * Stage 2 (advancing) — per-bar trend flag mirroring the daily-scans
 * `stage_2_advancing` rule: a rising 150-bar SMA (≥1% over a 20-bar shift) with
 * price above it. Rendered as a transparent green band hugging the bottom edge
 * of the price pane over every contiguous Stage 2 date range. `stage2[i]` is
 * `1` on Stage 2 bars and `NaN` otherwise so the band predicate is a plain
 * finite-check and nothing is drawn off-range. Derivable from close alone.
 */
export const stage2Def: IndicatorDef<Stage2Params> = {
  key: 'stage2',
  label: 'Stage 2',
  longLabel: 'Stage 2 Advancing',
  pane: 'price',
  defaultParams: { smaPeriod: 150, slopeLookback: 20, slopeMin: 0.01, minPeriods: 100 },
  formatParams: (p) => `${p.smaPeriod},${p.slopeLookback}`,
  paramSpecs: [
    { key: 'smaPeriod', label: 'SMA length', kind: 'number', min: 1 },
    { key: 'slopeLookback', label: 'Slope lookback', kind: 'number', min: 1 },
  ],
  // Full SMA window + the slope shift, so every displayed bar matches the scan.
  warmupBars: (p) => p.smaPeriod + p.slopeLookback,
  compute: (input: IndicatorInput, p) => {
    const c = input.c;
    const n = c.length;
    const sma = new Float64Array(n);
    // Rolling mean over `smaPeriod` with pandas min_periods semantics: NaN until
    // ≥minPeriods valid closes sit in the trailing window, else mean-of-available.
    for (let i = 0; i < n; i++) {
      const start = Math.max(0, i - p.smaPeriod + 1);
      let sum = 0;
      let count = 0;
      for (let j = start; j <= i; j++) {
        const v = c[j];
        if (!Number.isNaN(v)) {
          sum += v;
          count++;
        }
      }
      sma[i] = count >= p.minPeriods ? sum / count : NaN;
    }
    const stage2 = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const prev = i - p.slopeLookback >= 0 ? sma[i - p.slopeLookback] : NaN;
      const cur = sma[i];
      const slope =
        Number.isNaN(cur) || Number.isNaN(prev) || prev === 0
          ? NaN
          : (cur - prev) / prev;
      stage2[i] =
        slope > p.slopeMin && c[i] > cur ? 1 : NaN;
    }
    return { stage2 };
  },
  draw: (ctx, series, scale, style) => {
    const s = series.stage2;
    if (!s) return;
    const band = style.find((x) => x.seriesKey === 'stage2');
    if (!band) return;
    const { xScale, bandwidth, renderStart, renderEnd } = scale;
    const bottom = Math.max(...scale.yPrice.range());
    const top = bottom - BAND_PX;
    ctx.save();
    ctx.fillStyle = band.color;
    ctx.globalAlpha = band.opacity ?? 0.18;
    let runStart = -1;
    const flush = (runEnd: number) => {
      const x1 = xScale(runStart)!;
      const x2 = xScale(runEnd)! + bandwidth;
      ctx.fillRect(x1, top, x2 - x1, BAND_PX);
    };
    for (let g = renderStart; g < renderEnd; g++) {
      if (s[g] === 1) {
        if (runStart === -1) runStart = g;
      } else if (runStart !== -1) {
        flush(g - 1);
        runStart = -1;
      }
    }
    if (runStart !== -1) flush(renderEnd - 1);
    ctx.restore();
  },
  defaultStyle: {
    lines: [
      {
        seriesKey: 'stage2',
        colorVar: 'var(--stage2-band)',
        labelColorVar: 'var(--stage2-band)',
        label: 'Stage 2',
        width: 0, // MARKER: excluded from price autofit + tooltip (see Chart.tsx)
        opacity: 0.18,
      },
    ],
    tooltipGroup: 'stage2',
    tooltipTitle: 'Stage 2',
  },
};
