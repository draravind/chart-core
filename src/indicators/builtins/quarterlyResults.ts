import type { QuarterlyResult } from '../../types';
import { barIndexForDate } from '../../utils/dateBarIndex';
import type { IndicatorDef, IndicatorInput, SubpaneScaleHint } from '../types';

// ---------------------------------------------------------------------------
// Quarterly Results — a fundamentals subpane porting the finance website's
// text-based earnings strip into the indicator framework. Two display modes
// (Text / Bars) behind a `display` enum param. Metrics are RPS (revenue per
// share) + EPS, both ₹/share, so they share one honest y-scale in Bars mode.
//
// Core owns the YoY growth math (date-based year-ago matching) and bakes the
// display strings at compute time using `input.market` for the currency. Since
// `def.draw` only receives Float64Arrays, the formatted strings + display mode
// ride a module WeakMap keyed on the `anchor` array's ArrayBuffer — a per-
// compute, GC-safe key that survives Chart's warmup `subarray(seedLen)` slice
// (subarray shares the buffer).
// ---------------------------------------------------------------------------

export type QuarterlyResultsParams = { display: number }; // 0 = Text, 1 = Bars

type QrRow = {
  label: string;
  eps: number; // NaN when absent
  rps: number; // NaN when absent
  epsText: string; // "₹12.34" / "--"
  rpsText: string; // "₹2,250.50" / "--"
  epsGrowthText: string; // "+15.2%" / '' when no YoY base
  rpsGrowthText: string;
  epsGrowthUp: boolean;
  rpsGrowthUp: boolean;
};
type QrMeta = { mode: 'text' | 'bars'; rows: QrRow[] };

const qrMeta = new WeakMap<ArrayBufferLike, QrMeta>();

/** Resolve the formatted rows + display mode baked for this series' `anchor`
 *  array. Survives the warmup-slice (`anchor.subarray(seedLen)` shares the
 *  buffer). `undefined` when no compute baked this buffer. */
export function readQrMeta(anchor: Float64Array): QrMeta | undefined {
  return qrMeta.get(anchor.buffer);
}

const YOY_TOLERANCE_DAYS = 40;
const MIN_COL_SPACING_PX = 70;
const MIN_FULL_LAYOUT_PANE_PX = 65;
const QR_FONT = "500 10px 'Helvetica Neue', Helvetica, Arial, sans-serif";
const DAY_MS = 86_400_000;
const YEAR_MS = 365 * DAY_MS;
const MAX_BAR_PX = 48;

// Legend-matching value format (IndicatorLegend.tsx fmt2): grouped en-US, 2dp.
const fmtVal = (v: number): string =>
  v.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const growthText = (g: number): string =>
  `${g >= 0 ? '+' : ''}${g.toFixed(1)}%`;

/**
 * YoY growth % per row for one field. `rows` pre-sorted ascending by date. For
 * each row find the row nearest (row.date − 1 year) within ±40 days; growth =
 * (cur − base) / |base| × 100 (|base| so a negative-EPS base signs improvement
 * correctly). NaN where value/base is missing or the base is 0, or no year-ago
 * row falls inside the tolerance.
 */
export function computeYoYGrowth(
  rows: readonly QuarterlyResult[],
  field: 'eps' | 'rps',
): Float64Array {
  const n = rows.length;
  const out = new Float64Array(n);
  out.fill(NaN);
  const times = rows.map((r) => new Date(r.date).getTime());
  for (let i = 0; i < n; i++) {
    const cur = rows[i][field];
    if (cur == null || !Number.isFinite(cur)) continue;
    const target = times[i] - YEAR_MS;
    let bestIdx = -1;
    let bestDiff = Infinity;
    for (let j = 0; j < n; j++) {
      const diffDays = Math.abs(times[j] - target) / DAY_MS;
      if (diffDays <= YOY_TOLERANCE_DAYS && diffDays < bestDiff) {
        bestDiff = diffDays;
        bestIdx = j;
      }
    }
    if (bestIdx < 0) continue;
    const base = rows[bestIdx][field];
    if (base == null || !Number.isFinite(base) || base === 0) continue;
    out[i] = ((cur - base) / Math.abs(base)) * 100;
  }
  return out;
}

/**
 * Column-overlap filter. `xs` ascending (left→right). Iterates right→left,
 * keeps the newest (rightmost) column, drops any older column closer than
 * `minSpacing` px to the last kept one. Returns a keep-mask aligned to `xs`.
 *
 * Intentional deviation from the website (StockChart.jsx:562-567), which keeps
 * the FIRST row in array order on collision and can drop the latest quarter at
 * the right edge; keep-newest always shows it.
 */
export function filterColumnsBySpacing(
  xs: number[],
  minSpacing: number,
): boolean[] {
  const keep = new Array<boolean>(xs.length).fill(false);
  let lastKept = Infinity;
  for (let i = xs.length - 1; i >= 0; i--) {
    if (lastKept === Infinity || Math.abs(lastKept - xs[i]) >= minSpacing) {
      keep[i] = true;
      lastKept = xs[i];
    }
  }
  return keep;
}

function compute(
  input: IndicatorInput,
  p: QuarterlyResultsParams,
): Record<string, Float64Array> {
  // 1. Sort rows ascending by date (ISO strings sort lexicographically).
  const rows = [...(input.quarterlyResults ?? [])].sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0,
  );
  // 2. YoY growth (row-vs-row, independent of bars).
  const epsGrowthArr = computeYoYGrowth(rows, 'eps');
  const rpsGrowthArr = computeYoYGrowth(rows, 'rps');
  // 3. Currency + baked display strings.
  const ccy = input.market === 'US' ? '$' : '₹';
  const qrRows: QrRow[] = rows.map((r, i) => {
    const eps = r.eps == null ? NaN : r.eps;
    const rps = r.rps == null ? NaN : r.rps;
    const eg = epsGrowthArr[i];
    const rg = rpsGrowthArr[i];
    return {
      label: r.label,
      eps,
      rps,
      epsText: Number.isFinite(eps) ? ccy + fmtVal(eps) : '--',
      rpsText: Number.isFinite(rps) ? ccy + fmtVal(rps) : '--',
      epsGrowthText: Number.isNaN(eg) ? '' : growthText(eg),
      rpsGrowthText: Number.isNaN(rg) ? '' : growthText(rg),
      epsGrowthUp: eg >= 0,
      rpsGrowthUp: rg >= 0,
    };
  });

  // 4. n-length NaN arrays.
  const n = input.c.length;
  const eps = new Float64Array(n).fill(NaN);
  const rps = new Float64Array(n).fill(NaN);
  const epsGrowth = new Float64Array(n).fill(NaN);
  const rpsGrowth = new Float64Array(n).fill(NaN);
  const anchor = new Float64Array(n).fill(NaN);

  // 5. Map each row → bar index; anchor[gi] = row ordinal (last wins on
  //    collision). Rows outside the bar range still served as YoY bases above.
  for (let i = 0; i < rows.length; i++) {
    const gi = barIndexForDate(input.bars, rows[i].date);
    if (gi == null) continue;
    anchor[gi] = i;
  }

  // 6. Step-fill the value arrays from each anchor to the next (NaN stays NaN
  //    before the first anchor and for absent fields).
  const anchored: number[] = [];
  for (let g = 0; g < n; g++) if (!Number.isNaN(anchor[g])) anchored.push(g);
  for (let k = 0; k < anchored.length; k++) {
    const start = anchored[k];
    const end = k + 1 < anchored.length ? anchored[k + 1] : n;
    const ord = anchor[start];
    const r = qrRows[ord];
    for (let g = start; g < end; g++) {
      eps[g] = r.eps;
      rps[g] = r.rps;
      epsGrowth[g] = epsGrowthArr[ord];
      rpsGrowth[g] = rpsGrowthArr[ord];
    }
  }

  // 7. Bake meta on the anchor buffer.
  qrMeta.set(anchor.buffer, {
    mode: p.display === 1 ? 'bars' : 'text',
    rows: qrRows,
  });

  return { eps, rps, epsGrowth, rpsGrowth, anchor };
}

type Seg = { text: string; color: string };

/** Draw a horizontal run of differently-colored segments, centered on `cx`.
 *  Each segment advances by its measured width + 4px (matching the condensed
 *  text fallback's per-segment fillStyle requirement). */
function drawCenteredSegments(
  ctx: CanvasRenderingContext2D,
  cx: number,
  y: number,
  segs: Seg[],
): void {
  const prevAlign = ctx.textAlign;
  ctx.textAlign = 'left';
  const widths = segs.map((s) => ctx.measureText(s.text).width);
  const total =
    widths.reduce((a, b) => a + b, 0) + 4 * Math.max(0, segs.length - 1);
  let x = cx - total / 2;
  for (let i = 0; i < segs.length; i++) {
    ctx.fillStyle = segs[i].color;
    ctx.fillText(segs[i].text, x, y);
    x += widths[i] + 4;
  }
  ctx.textAlign = prevAlign;
}

const draw: IndicatorDef<QuarterlyResultsParams>['draw'] = (
  ctx,
  series,
  scale,
  style,
) => {
  const meta = readQrMeta(series.anchor);
  if (!meta) return;
  const { xScale, bandwidth, renderStart, renderEnd } = scale;
  const paneTop = scale.paneTop ?? 0;
  const paneBottom = scale.paneBottom ?? 0;
  const paneHeight = paneBottom - paneTop;
  if (paneHeight <= 0) return;

  const colorOf = (key: string, fallback: string) =>
    style.find((s) => s.seriesKey === key)?.color ?? fallback;
  const epsColor = colorOf('eps', '#f97316');
  const rpsColor = colorOf('rps', '#60a5fa');
  const upColor = colorOf('growth_up', '#16a34a');
  const downColor = colorOf('growth_down', '#dc2626');
  const labelColor = colorOf('qlabel', '#888888');

  // Clip to the pane band (no per-subpane clip exists in the framework today —
  // without this, text/bars bleed into adjacent panes). The drawSeries viewport
  // clip already bounds horizontally, so the x-extent here is intentionally wide.
  ctx.save();
  ctx.beginPath();
  ctx.rect(-1e6, paneTop, 2e6, paneHeight);
  ctx.clip();
  ctx.font = QR_FONT;

  // Visible anchors → { g, x (column center), row }.
  const anchors: { g: number; x: number; row: QrRow }[] = [];
  for (let g = renderStart; g < renderEnd; g++) {
    const ord = series.anchor[g];
    if (Number.isNaN(ord)) continue;
    const row = meta.rows[ord];
    if (!row) continue;
    anchors.push({ g, x: (xScale(g) ?? 0) + bandwidth / 2, row });
  }

  if (meta.mode === 'text') {
    const keep = filterColumnsBySpacing(
      anchors.map((a) => a.x),
      MIN_COL_SPACING_PX,
    );
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';

    if (paneHeight >= MIN_FULL_LAYOUT_PANE_PX) {
      // Five-row layout (faithful port). Tight pairs grouped: label; EPS value;
      // EPS growth (tight under it); RPS value (group gap); RPS growth (tight).
      const lh = paneHeight / 5.5;
      const yLabel = paneTop + lh * 0.9;
      const yEps = paneTop + lh * 1.9;
      const yEpsG = paneTop + lh * 2.7;
      const yRps = paneTop + lh * 3.9;
      const yRpsG = paneTop + lh * 4.7;
      for (let i = 0; i < anchors.length; i++) {
        if (!keep[i]) continue;
        const { x, row } = anchors[i];
        ctx.fillStyle = labelColor;
        ctx.fillText(row.label, x, yLabel);
        ctx.fillStyle = Number.isFinite(row.eps) ? epsColor : labelColor;
        ctx.fillText(row.epsText, x, yEps);
        if (row.epsGrowthText) {
          ctx.fillStyle = row.epsGrowthUp ? upColor : downColor;
          ctx.fillText(row.epsGrowthText, x, yEpsG);
        }
        ctx.fillStyle = Number.isFinite(row.rps) ? rpsColor : labelColor;
        ctx.fillText(row.rpsText, x, yRps);
        if (row.rpsGrowthText) {
          ctx.fillStyle = row.rpsGrowthUp ? upColor : downColor;
          ctx.fillText(row.rpsGrowthText, x, yRpsG);
        }
      }
    } else {
      // Condensed three-line fallback (tiny panes only — the def's
      // paneHeightFactor makes ≥65px the norm): label; EPS <v> <growth>;
      // RPS <v> <growth>, each segment with its own fillStyle.
      const lh = paneHeight / 3.2;
      const yLabel = paneTop + lh * 0.9;
      const yEps = paneTop + lh * 1.9;
      const yRps = paneTop + lh * 2.9;
      for (let i = 0; i < anchors.length; i++) {
        if (!keep[i]) continue;
        const { x, row } = anchors[i];
        ctx.fillStyle = labelColor;
        ctx.fillText(row.label, x, yLabel);
        drawCenteredSegments(ctx, x, yEps, [
          { text: 'EPS', color: labelColor },
          {
            text: row.epsText,
            color: Number.isFinite(row.eps) ? epsColor : labelColor,
          },
          ...(row.epsGrowthText
            ? [
                {
                  text: row.epsGrowthText,
                  color: row.epsGrowthUp ? upColor : downColor,
                },
              ]
            : []),
        ]);
        drawCenteredSegments(ctx, x, yRps, [
          { text: 'RPS', color: labelColor },
          {
            text: row.rpsText,
            color: Number.isFinite(row.rps) ? rpsColor : labelColor,
          },
          ...(row.rpsGrowthText
            ? [
                {
                  text: row.rpsGrowthText,
                  color: row.rpsGrowthUp ? upColor : downColor,
                },
              ]
            : []),
        ]);
      }
    }
    ctx.restore();
    return;
  }

  // Bars mode. Each quarter's RPS + EPS bars form a tight pair CENTERED on that
  // quarter's earnings date — the exact same anchor `x` the text columns use.
  // Position depends ONLY on the anchor (never on the distance to the next
  // quarter, which would float the bars out in the dead space between dates).
  // The typical inter-quarter spacing only sizes the bars so neighboring
  // quarters keep clear air — it never moves a bar.
  const zeroY = scale.y(0);

  // Median anchor-to-anchor spacing across the whole dataset (cadence-aware:
  // ~63 daily bars quarterly, ~252 daily / ~52 weekly annual), or 63 degenerate.
  const allAnchorG: number[] = [];
  for (let g = 0; g < series.anchor.length; g++)
    if (!Number.isNaN(series.anchor[g])) allAnchorG.push(g);
  let medianSpan = 63;
  if (allAnchorG.length >= 2) {
    const diffs: number[] = [];
    for (let i = 1; i < allAnchorG.length; i++)
      diffs.push(allAnchorG[i] - allAnchorG[i - 1]);
    diffs.sort((a, b) => a - b);
    medianSpan = diffs[Math.floor(diffs.length / 2)];
  }
  // Pair width derived from the typical spacing (kept under it so adjacent
  // quarters never touch); split into two bars with a small inner gap.
  const typicalSpan = medianSpan * xScale.step();
  const pairWidth = Math.min(MAX_BAR_PX, typicalSpan * 0.3);
  const innerGap = Math.min(4, pairWidth * 0.12);
  const barW = Math.max(1, (pairWidth - innerGap) / 2);

  const drawBar = (x: number, value: number, color: string) => {
    if (!Number.isFinite(value)) return;
    const y = scale.y(value);
    const top = Math.min(zeroY, y);
    const h = Math.max(1, Math.abs(zeroY - y));
    ctx.fillStyle = color;
    ctx.fillRect(x, top, barW, h);
  };

  // Growth labels overlap-filtered on column center (bars always draw).
  const keepLabels = filterColumnsBySpacing(
    anchors.map((a) => a.x),
    MIN_COL_SPACING_PX,
  );
  ctx.textAlign = 'center';

  for (let i = 0; i < anchors.length; i++) {
    const { x: cx, row } = anchors[i];
    // RPS just left of the date, EPS just right — a tight pair on the anchor.
    const rpsX = cx - innerGap / 2 - barW;
    const epsX = cx + innerGap / 2;
    drawBar(rpsX, row.rps, rpsColor);
    drawBar(epsX, row.eps, epsColor);

    if (!keepLabels[i]) continue;
    const labelOver = (
      barX: number,
      value: number,
      text: string,
      up: boolean,
    ) => {
      if (!text || !Number.isFinite(value)) return;
      // Always above the bar's top edge (zeroY for a negative bar). The
      // bars-mode domain pads the top (BARS_HINT.autofitPadding) so the tallest
      // bar leaves room and the label is never clipped by the pane border.
      const barTop = Math.min(zeroY, scale.y(value));
      ctx.fillStyle = up ? upColor : downColor;
      ctx.textBaseline = 'bottom';
      ctx.fillText(text, barX + barW / 2, barTop - 2);
    };
    labelOver(rpsX, row.rps, row.rpsGrowthText, row.rpsGrowthUp);
    labelOver(epsX, row.eps, row.epsGrowthText, row.epsGrowthUp);
  }
  ctx.restore();
};

const TEXT_HINT: SubpaneScaleHint = { fixedDomain: [0, 1], hideAxis: true };
// Bars rest flush on the zero baseline at the bottom (includeZero, no fractional
// pad) and reserve a FIXED 17px above the tallest bar. The 10px growth label
// (drawn at `barTop − 2`) spans ~12px upward from the bar top, so 17px clears it
// AND leaves ~5px of breathing room below `pane.top` — which, with panes now
// flush, IS the divider line — so the label doesn't sit flush against it.
const BARS_HINT: SubpaneScaleHint = {
  includeZero: true,
  guideLines: [0],
  autofitPadding: 0,
  topPadPx: 17,
};

export const quarterlyResultsDef: IndicatorDef<QuarterlyResultsParams> = {
  key: 'results',
  label: 'Results',
  longLabel: 'Quarterly Results',
  pane: { subpane: 'results', scaleHint: TEXT_HINT },
  scaleHintFor(p) {
    return p.display === 1 ? BARS_HINT : TEXT_HINT;
  },
  paneHeightFactor: 1.7, // ≈96px default — the five-row layout fits.
  defaultParams: { display: 0 },
  formatParams: (p) => (p.display === 1 ? 'Bars' : 'Text'),
  paramSpecs: [
    {
      key: 'display',
      label: 'Display',
      kind: 'enum',
      options: [
        { label: 'Text', value: 0 },
        { label: 'Bars', value: 1 },
      ],
    },
  ],
  warmupBars: () => 0,
  compute,
  draw,
  defaultStyle: {
    lines: [
      {
        seriesKey: 'rps',
        colorVar: 'var(--qr-rps)',
        labelColorVar: 'var(--chart-qr-rps-label)',
        label: 'RPS',
        width: 1,
      },
      {
        seriesKey: 'eps',
        colorVar: 'var(--qr-eps)',
        labelColorVar: 'var(--chart-qr-eps-label)',
        label: 'EPS',
        width: 1,
      },
      // Width-0 color carriers — excluded from autofit / legend values / color
      // popover (MACD `macdhist_down` precedent).
      {
        seriesKey: 'growth_up',
        colorVar: 'var(--qr-growth-up)',
        labelColorVar: 'var(--qr-growth-up)',
        label: 'Growth +',
        width: 0,
      },
      {
        seriesKey: 'growth_down',
        colorVar: 'var(--qr-growth-down)',
        labelColorVar: 'var(--qr-growth-down)',
        label: 'Growth −',
        width: 0,
      },
      {
        seriesKey: 'qlabel',
        colorVar: 'var(--qr-label)',
        labelColorVar: 'var(--qr-label)',
        label: 'Quarter',
        width: 0,
      },
    ],
    tooltipGroup: 'results',
    tooltipTitle: 'Results',
  },
};
