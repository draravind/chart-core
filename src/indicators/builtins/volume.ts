import type {
  IndicatorDef,
  IndicatorInput,
  IndicatorSeries,
  SubpaneScaleHint,
} from '../types';
import {
  computeVolumeStats,
  formatVolume,
  formatVolumeTick,
} from '../../utils/chartCalculations';

// ---------------------------------------------------------------------------
// Volume — the old hardcoded volume zone, re-expressed as a first-class subpane
// indicator. It flows through the same registry → resolve → subpane-scale →
// canvas-draw pipeline as every other oscillator (opt-in, toggleable, restyle-
// able, reorderable), while preserving the legacy visuals pixel-for-pixel:
// 4-bucket coloring (up/down candle × above/below SMA, faded opacity below
// average), HVE/HVY milestone labels, and a K/M/B right axis.
//
// The two split series (`volumeUp`/`volumeDown`) are genuine, data-backed lines
// (volume partitioned by candle direction) so BOTH colors are editable in the
// legend with no fake/inert line; their union autofits the pane to [0, maxVol].
// `volSma`/`volLabel` carry no style line — pure data the custom `draw` decodes.
// ---------------------------------------------------------------------------

export type VolumeParams = {
  smaPeriod: number; // averaging window for the fade threshold (default 30)
  smaFade: number; // 1 = fade below-average bars, 0 = flat opacity
  milestones: number; // 1 = draw HVE/HVY labels, 0 = hide them
  standardOpacity: number; // opacity of standard (≥ average) bars (default 0.5)
  fadeOpacity: number; // opacity of below-average bars (default 0.2)
};

// Default standard-bar opacity (the legacy drawSeries value was 0.35). Both the
// standard and the faded opacities are now user-editable params; this constant is
// just the default seed for `standardOpacity`.
const VOL_OPACITY_STANDARD = 0.5;
const LABEL_GAP = 2; // px gap between the label baseline and the bar top
// Defensive ceiling on how high the label baseline may go (a label this close to
// the divider would clip). With VOL_HINT.topPadPx reserving headroom above the
// tallest bar, the label's natural `barTop − LABEL_GAP` spot already clears this,
// so this only guards degenerate cases (e.g. a custom hint with no headroom).
const LABEL_MIN_Y = 9;
const VOL_LABEL_FONT = "600 9px 'Helvetica Neue', Helvetica, Arial, sans-serif";

// `includeZero` + `autofitPadding: 0` gives a `[0, volMax]` domain (bars rest on
// a zero baseline at the pane bottom). `topPadPx: 15` reserves fixed headroom
// above the tallest bar — enough for the 9px HVE/HVY label (drawn at `barTop −
// LABEL_GAP`) to sit fully ABOVE the bar instead of clamped into it, with a few
// px of breathing room below the top divider. The zero baseline is unaffected —
// only the domain top is extended. `tickFormat` restores the K/M/B right axis.
const VOL_HINT: SubpaneScaleHint = {
  includeZero: true,
  autofitPadding: 0,
  topPadPx: 15,
  tickFormat: formatVolumeTick,
};

function compute(input: IndicatorInput, p: VolumeParams): IndicatorSeries {
  const n = input.c.length;
  // Compute over the DISPLAY region only (not the warmup-prefixed `combined`),
  // so HVE/HVY and the cold-start SMA stay pixel-identical to the legacy path
  // (Chart called `computeVolumeStats(data)` on the display window). Values are
  // written at `start + i` in the combined-length arrays; the framework's
  // `subarray(seedLen)` (seedLen == start) recovers exactly the display window.
  const start = input.displayStart ?? 0;
  const display = input.bars.slice(start);
  const stats = computeVolumeStats(display, p.smaPeriod);

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
    if (p.smaFade) {
      const s = stats.sma[i];
      if (s !== undefined) volSma[g] = s;
    }
  }

  // `milestones` off ⇒ emit no labels ⇒ `draw` draws none.
  if (p.milestones) {
    for (const lbl of stats.labels) {
      volLabel[start + lbl.index] = lbl.text === 'HVE' ? 1 : 2;
    }
  }

  return { volumeUp, volumeDown, volSma, volLabel };
}

const draw: IndicatorDef<VolumeParams>['draw'] = (
  ctx,
  series,
  scale,
  style,
  params,
) => {
  const { xScale, bandwidth, renderStart, renderEnd, data } = scale;
  const paneTop = scale.paneTop ?? 0;
  const paneBottom = scale.paneBottom ?? 0;
  if (paneBottom <= paneTop) return;

  const colorOf = (key: string, fallback: string) =>
    style.find((s) => s.seriesKey === key)?.color ?? fallback;
  const upColor = colorOf('volumeUp', '#16a34a');
  const downColor = colorOf('volumeDown', '#dc2626');
  const labelColor = colorOf('volLabelColor', '#888888');

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
    ctx.globalAlpha = faded ? params.fadeOpacity : params.standardOpacity;
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

export const volumeDef: IndicatorDef<VolumeParams> = {
  key: 'volume',
  label: 'Volume',
  longLabel: 'Volume',
  pane: { subpane: 'volume', scaleHint: VOL_HINT },
  // ≈ VOLUME_HEIGHT_RATIO (0.15) / SUBPANE_HEIGHT_RATIO (0.13), so an enabled
  // volume pane defaults to ~15% of chart height — the legacy reserved share.
  paneHeightFactor: 1.154,
  defaultParams: {
    smaPeriod: 30,
    smaFade: 1,
    milestones: 1,
    standardOpacity: VOL_OPACITY_STANDARD,
    fadeOpacity: 0.2,
  },
  formatParams: (p) => (p.smaFade ? `${p.smaPeriod}` : `${p.smaPeriod} · plain`),
  formatValue: (v) => formatVolume(v),
  paramSpecs: [
    { key: 'smaPeriod', label: 'Avg Length', kind: 'number', min: 1 },
    {
      key: 'smaFade',
      label: 'Fade Below Avg',
      kind: 'enum',
      options: [
        { label: 'On', value: 1 },
        { label: 'Off', value: 0 },
      ],
    },
    {
      key: 'milestones',
      label: 'HVE/HVY',
      kind: 'enum',
      options: [
        { label: 'On', value: 1 },
        { label: 'Off', value: 0 },
      ],
    },
    {
      // Opacity of standard (≥ average) bars. Default 0.35 (the legacy value).
      key: 'standardOpacity',
      label: 'Normal Bar Opacity',
      kind: 'number',
      min: 0,
      max: 1,
      step: 0.01,
    },
    {
      // Opacity of below-average bars; only meaningful when `smaFade` is on.
      key: 'fadeOpacity',
      label: 'Faded Bar Opacity',
      kind: 'number',
      min: 0,
      max: 1,
      step: 0.01,
    },
  ],
  warmupBars: () => 0,
  compute,
  draw,
  defaultStyle: {
    lines: [
      {
        seriesKey: 'volumeUp',
        colorVar: 'var(--chart-positive)',
        labelColorVar: 'var(--chart-positive)',
        label: 'Vol Up',
        width: 1,
      },
      {
        seriesKey: 'volumeDown',
        colorVar: 'var(--chart-negative)',
        labelColorVar: 'var(--chart-negative)',
        label: 'Vol Down',
        width: 1,
      },
      // Width-0 color carrier for the HVE/HVY text (accepted convention, cf.
      // Quarterly Results' `qlabel`): no data, not editable, hands its resolved
      // color to the custom `draw`.
      {
        seriesKey: 'volLabelColor',
        colorVar: 'var(--chart-axis-label)',
        labelColorVar: 'var(--chart-axis-label)',
        label: 'HVE/HVY',
        width: 0,
      },
    ],
    tooltipGroup: 'volume',
    tooltipTitle: 'Volume',
  },
};
