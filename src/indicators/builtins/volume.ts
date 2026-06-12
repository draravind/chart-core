import type { IndicatorDef, IndicatorInput, IndicatorSeries } from '../types';
import {
  computeVolumeStats,
  formatVolume,
  formatVolumeTick,
} from '../../utils/chartCalculations';
import { cellAt } from '../draw';

// ---------------------------------------------------------------------------
// Volume — the old hardcoded volume zone, re-expressed as a first-class subpane
// indicator. It flows through the same registry → resolve → subpane-scale →
// canvas-draw pipeline as every other oscillator (opt-in, toggleable, restyle-
// able, reorderable), while preserving the legacy visuals pixel-for-pixel:
// 4-bucket coloring (up/down candle × above/below SMA, faded opacity below
// average), HVE/HVY milestone labels, and a K/M/B right axis.
//
// The two split series (`volumeUp`/`volumeDown`) are genuine, data-backed lines
// (volume partitioned by candle direction); their union autofits the pane to
// [0, maxVol]. `volSma`/`volLabel` are pure data the custom `draw` decodes. All
// three colors (up/down/label) are editable color settings — no fake line.
// ---------------------------------------------------------------------------

export type VolumeSettings = {
  smaPeriod: number; // averaging window for the fade threshold (default 30)
  smaFade: number; // 1 = fade below-average bars, 0 = flat opacity
  milestones: number; // 1 = draw HVE/HVY labels, 0 = hide them
  standardOpacity: number; // opacity of standard (≥ average) bars (default 0.5)
  fadeOpacity: number; // opacity of below-average bars (default 0.2)
  upColor: string;
  downColor: string;
  labelColor: string;
};

// Default standard-bar opacity (the legacy drawSeries value was 0.35). Both the
// standard and the faded opacities are now user-editable settings; this constant
// is just the default seed for `standardOpacity`.
const VOL_OPACITY_STANDARD = 0.5;
const LABEL_GAP = 2; // px gap between the label baseline and the bar top
// Defensive ceiling on how high the label baseline may go (a label this close to
// the divider would clip). With the domain's topPadPx reserving headroom above
// the tallest bar, the label's natural `barTop − LABEL_GAP` spot already clears
// this, so this only guards degenerate cases (e.g. no headroom).
const LABEL_MIN_Y = 9;
const VOL_LABEL_FONT = "600 9px 'Helvetica Neue', Helvetica, Arial, sans-serif";

function compute(input: IndicatorInput, s: VolumeSettings): IndicatorSeries {
  const n = input.c.length;
  // Compute over the DISPLAY region only (not the warmup-prefixed `combined`),
  // so HVE/HVY and the cold-start SMA stay pixel-identical to the legacy path
  // (Chart called `computeVolumeStats(data)` on the display window). Values are
  // written at `start + i` in the combined-length arrays; the framework's
  // `subarray(seedLen)` (seedLen == start) recovers exactly the display window.
  const start = input.displayStart ?? 0;
  const display = input.bars.slice(start);
  const stats = computeVolumeStats(display, s.smaPeriod);

  const volumeUp = new Float64Array(n).fill(NaN);
  const volumeDown = new Float64Array(n).fill(NaN);
  const volSma = new Float64Array(n).fill(NaN);
  const volLabel = new Float64Array(n).fill(NaN);

  for (let i = 0; i < display.length; i++) {
    const g = start + i;
    const d = display[i];
    // A zero-volume bar stays NaN in BOTH split series (matching the legacy
    // `vol <= 0` skip) — it neither draws nor prints a stray 0 in the legend.
    if (d.volume > 0) {
      if (d.close >= d.open) volumeUp[g] = d.volume;
      else volumeDown[g] = d.volume;
    }
    // `smaFade` off ⇒ emit no threshold ⇒ `draw` fades nothing.
    if (s.smaFade) {
      const sm = stats.sma[i];
      if (sm !== undefined) volSma[g] = sm;
    }
  }

  // `milestones` off ⇒ emit no labels ⇒ `draw` draws none.
  if (s.milestones) {
    for (const lbl of stats.labels) {
      volLabel[start + lbl.index] = lbl.text === 'HVE' ? 1 : 2;
    }
  }

  return { volumeUp, volumeDown, volSma, volLabel };
}

const draw: IndicatorDef<VolumeSettings>['draw'] = (
  ctx,
  series,
  scale,
  s,
  resolveColor,
) => {
  const { xScale, bandwidth, renderStart, renderEnd, data } = scale;
  const paneTop = scale.paneTop ?? 0;
  const paneBottom = scale.paneBottom ?? 0;
  if (paneBottom <= paneTop) return;

  const upColor = resolveColor(s.upColor);
  const downColor = resolveColor(s.downColor);
  const labelColor = resolveColor(s.labelColor);

  const volSma = series.volSma;
  const volLabel = series.volLabel;

  // Clip to the pane band (matches quarterlyResults) so bars/labels never bleed
  // into adjacent panes. The drawSeries viewport clip bounds the x-extent.
  ctx.save();
  ctx.beginPath();
  ctx.rect(-1e6, paneTop, 2e6, paneBottom - paneTop);
  ctx.clip();

  const yBottom = scale.y(0);
  for (let g = renderStart; g < renderEnd; g++) {
    const d = data[g];
    if (!d || d.volume <= 0) continue; // matches the legacy `vol <= 0` skip
    const x = xScale(g)!;
    const yTop = scale.y(d.volume);
    const h = yBottom - yTop;
    const up = d.close >= d.open;
    const sma = volSma?.[g];
    const faded = sma !== undefined && Number.isFinite(sma) && d.volume < sma;
    ctx.fillStyle = up ? upColor : downColor;
    ctx.globalAlpha = faded ? s.fadeOpacity : s.standardOpacity;
    ctx.fillRect(x, yTop, bandwidth, h);
  }
  ctx.globalAlpha = 1;

  // HVE/HVY milestone labels, centered above their bar (matching the legacy SVG
  // labels at Chart.tsx). `volLabel` is empty when `milestones` is off.
  if (volLabel) {
    ctx.fillStyle = labelColor;
    ctx.font = VOL_LABEL_FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    for (let g = renderStart; g < renderEnd; g++) {
      const code = volLabel[g];
      if (Number.isNaN(code)) continue;
      const d = data[g];
      if (!d) continue;
      const y = Math.max(scale.y(d.volume) - LABEL_GAP, paneTop + LABEL_MIN_Y);
      ctx.fillText(code === 1 ? 'HVE' : 'HVY', xScale(g)! + bandwidth / 2, y);
    }
  }
  ctx.restore();
};

export const volumeDef: IndicatorDef<VolumeSettings> = {
  key: 'volume',
  label: 'Volume',
  longLabel: 'Volume',
  pane: { subpane: 'volume' },
  // ≈ VOLUME_HEIGHT_RATIO (0.15) / SUBPANE_HEIGHT_RATIO (0.13), so an enabled
  // volume pane defaults to ~15% of chart height — the legacy reserved share.
  paneHeightFactor: 1.154,
  settingsSchema: [
    { key: 'smaPeriod', label: 'Avg Length', kind: 'number', default: 30, min: 1 },
    {
      key: 'smaFade',
      label: 'Fade Below Avg',
      kind: 'enum',
      default: 1,
      options: [
        { label: 'On', value: 1 },
        { label: 'Off', value: 0 },
      ],
    },
    {
      key: 'milestones',
      label: 'HVE/HVY',
      kind: 'enum',
      default: 1,
      options: [
        { label: 'On', value: 1 },
        { label: 'Off', value: 0 },
      ],
    },
    {
      // Opacity of standard (≥ average) bars.
      key: 'standardOpacity',
      label: 'Normal Bar Opacity',
      kind: 'number',
      default: VOL_OPACITY_STANDARD,
      min: 0,
      max: 1,
      step: 0.01,
    },
    {
      // Opacity of below-average bars; only meaningful when `smaFade` is on.
      key: 'fadeOpacity',
      label: 'Faded Bar Opacity',
      kind: 'number',
      default: 0.2,
      min: 0,
      max: 1,
      step: 0.01,
    },
    { key: 'upColor', label: 'Up', kind: 'color', default: 'var(--chart-positive)' },
    { key: 'downColor', label: 'Down', kind: 'color', default: 'var(--chart-negative)' },
    { key: 'labelColor', label: 'HVE/HVY', kind: 'color', default: 'var(--chart-axis-label)' },
  ],
  formatParams: (s) => (s.smaFade ? `${s.smaPeriod}` : `${s.smaPeriod} · plain`),
  warmupBars: () => 0,
  compute: (input, s) => ({ series: compute(input, s) }),
  draw,
  // `includeZero` + `autofitPadding: 0` gives a `[0, volMax]` domain (bars rest
  // on a zero baseline at the pane bottom). `topPadPx: 15` reserves fixed
  // headroom for the 9px HVE/HVY label to sit fully ABOVE the tallest bar.
  // `tickFormat` restores the K/M/B right axis.
  autofitKeys: () => ['volumeUp', 'volumeDown'],
  domain: () => ({
    includeZero: true,
    autofitPadding: 0,
    topPadPx: 15,
    tickFormat: formatVolumeTick,
  }),
  legend: (series, idx, s) => [
    { color: s.upColor, label: 'Vol', value: cellAt(series.volumeUp, idx, formatVolume) },
    { color: s.downColor, label: 'Vol', value: cellAt(series.volumeDown, idx, formatVolume) },
  ],
};
