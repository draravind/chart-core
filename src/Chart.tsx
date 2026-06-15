import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { BarChart3, MousePointerClick, RotateCcw, Settings } from 'lucide-react';
import * as d3 from 'd3';
import type {
  AutoFitMode,
  Candle,
  ChartType,
  QuarterlyResult,
} from './types';
import type {
  IndicatorConfig,
  IndicatorInput,
  IndicatorSeries,
  ResolvedIndicator,
} from './indicators/types';
import { getIndicator, SUBPANE_ORDER } from './indicators/registry';
import type { AppearanceOverrides } from './appearance/types';
import { effectiveAppearance } from './appearance/registry';
import IndicatorLegend from './controls/IndicatorLegend';
import SettingsDialog from './controls/SettingsDialog';
import StatsPanel from './stats/StatsPanel';
import { computeStats } from './stats/computeStats';
import type {
  StatsMarket,
  StatsPosition,
  StatsSize,
  StatsTableData,
} from './stats/types';
import type { DomainSpec } from './indicators/types';
import {
  applySubpaneDrag,
  computeSubpaneBands,
  computeSubpaneDomain,
  type SubpaneBand,
} from './indicators/subpaneLayout';
import {
  formatPrice,
  formatVolume,
  maxVisibleBarsForWidth,
  MIN_VISIBLE_BARS,
} from './utils/chartCalculations';
import { toColumns } from './utils/toColumns';
import { drawSeries } from './utils/drawSeries';
import {
  createColorResolver,
  type ColorResolver,
} from './utils/resolveChartColors';
import styles from './Chart.module.css';
import './styles/chart-core.css';

import {
  mountChartPatternOverlay,
  type ChartPatternOverlayHandle,
} from './patterns/mountChartPatternOverlay';
import type { PatternMarker } from './patterns/types';
import {
  createChartScaleApi,
  ChartScaleProvider,
  ChartOverlayProvider,
  type ChartOverlayContextValue,
  type ChartOverlayLayer,
} from './context';

const MARGIN = { top: 4, right: 60, bottom: 30, left: 0 };
const CHART_FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

// Subpane stacking (D1 policy): each oscillator pane gets a fixed share of the
// chart height (panes stack flush, separated only by the 1px divider line); the
// price pane shrinks toward a floor as panes stack, after which the remaining
// zone splits equally among panes. Volume is now an ordinary subpane.
const SUBPANE_HEIGHT_RATIO = 0.13;
const PRICE_FLOOR_RATIO = 0.45;
// Minimum height (px) any subpane may be dragged down to.
const SUBPANE_MIN_PX = 24;
// Minimum padding applied to an autofit subpane domain when the def's DomainSpec
// does not override it.
const DEFAULT_SUBPANE_PAD = 0.08;
const RIGHT_BUFFER = 18;
const INFO_SPAN_COUNT = 12;
const AXIS_STROKE = 'currentColor';
// Axis opacity + tick size are now user-editable via the appearance config
// (APPEARANCE_DEFAULTS.axis); read from `app.axis` at draw time.
const N_PRICE_TICKS = 10;
const MUTED_COLOR = 'var(--chart-tooltip-label)';

const DEFAULT_PRICE_FORMAT = d3.format(',.0f');

type Props = {
  data: Candle[] | undefined;
  // Older bars used ONLY to seed in-browser indicator computation (e.g. EMA200
  // needs ~460 prior bars). Kept separate from `data` so geometry/pan/axes stay
  // byte-identical to the display window — indicators compute over
  // concat(warmupSeed, data) then slice back to `data`.
  warmupSeed?: Candle[];
  // Benchmark close keyed by Candle.date ('YYYY-MM-DD'). Supplied by the app ONLY
  // when the RS indicator is enabled; absent otherwise (RS then yields NaN/no-op).
  benchmarkClose?: Record<string, number>;
  // Sparse reported-period rows (quarterly/annual) for the Results subpane
  // indicator. Raw passthrough — the def aligns each row to a bar itself.
  quarterlyResults?: QuarterlyResult[];
  // Persisted per-subpane heights (key → fraction of totalHeight), or null for
  // defaults (heightRatio × def.paneHeightFactor). The app persists drags via
  // the callback — same contract as statsPosition/onStatsPositionChange.
  subpaneHeights?: Record<string, number> | null;
  onSubpaneHeightsChange?: (h: Record<string, number>) => void;
  visibleBars: number;
  onVisibleBarsChange?: (n: number | ((prev: number) => number)) => void;
  // Surfaces the readability-derived zoom-out cap (mark-snapped, width-dependent)
  // so the host can bound a zoom slider. chart-core owns + enforces the cap; this
  // is purely informational for UI that can't read containerWidth directly.
  onMaxVisibleBarsChange?: (n: number) => void;
  panOffset: number;
  onPanOffsetChange: (n: number | ((prev: number) => number)) => void;
  chartType: ChartType;
  // Registry-driven indicator catalog (one entry per drawn config).
  indicators: IndicatorConfig[];
  // Mutate the active indicator set — the on-chart legend removes instances and
  // edits their params through this.
  onIndicatorsChange: (indicators: IndicatorConfig[]) => void;
  autoFitMode: AutoFitMode;
  onAutoFitModeChange: (m: AutoFitMode) => void;
  infoBarExpanded: boolean;
  onInfoBarExpandedChange: (v: boolean | ((prev: boolean) => boolean)) => void;
  symbol: string | null;
  bare?: boolean;
  // Crosshair price-axis label formatter. Defaults to d3.format(',.0f'); the
  // app injects a tick-band-snapping version.
  priceFormatter?: (value: number) => string;
  // Bundled core feature: read-only chart-pattern detections (the app fetches
  // them and passes them down; core owns mount/update internally).
  patterns?: PatternMarker[];
  patternsEnabled?: boolean;
  // Per-pattern visibility filter (by `pattern_name`). `undefined` ⇒ all
  // detected patterns visible (backward compat); a pattern draws only if the
  // master `patternsEnabled` is on AND its name is in this set.
  visiblePatterns?: string[];
  // Floating "Price Stats" panel — a latest-bar snapshot of app-supplied
  // fundamentals + price-derived ATR rows. Standalone toggle (not an indicator);
  // the app wires both `statsEnabled` here and the "Stats" pill on ChartControls.
  statsTable?: StatsTableData;
  statsEnabled?: boolean;
  statsMarket?: StatsMarket;
  // Persisted free-drag position ({x,y} wrapper pixels) or null for the
  // default top-right placement; the app persists drops via the callback.
  statsPosition?: StatsPosition | null;
  onStatsPositionChange?: (p: StatsPosition) => void;
  statsSize?: StatsSize;
  // User-editable chart appearance — a sparse `AppearanceOverrides` delta the
  // app persists via `onAppearanceChange` (same controlled-prop + sparse-delta
  // contract as `indicators`/`onIndicatorsChange`). Absent ⇒ baked defaults.
  // The gear-triggered Settings dialog only mounts when `onAppearanceChange` is
  // supplied (no callback ⇒ no way to persist edits).
  appearance?: AppearanceOverrides;
  onAppearanceChange?: (next: AppearanceOverrides) => void;
  // App overlay plugins; they portal D3 overlays into the published hosts.
  children?: React.ReactNode;
};

const ZOOM_FACTOR = 1.04;

type Sel<E extends d3.BaseType = d3.BaseType> = d3.Selection<
  E,
  unknown,
  null,
  undefined
>;

const Chart = ({
  data,
  warmupSeed,
  benchmarkClose,
  quarterlyResults,
  subpaneHeights = null,
  onSubpaneHeightsChange,
  visibleBars,
  onVisibleBarsChange,
  onMaxVisibleBarsChange,
  panOffset,
  onPanOffsetChange,
  chartType,
  indicators,
  onIndicatorsChange,
  autoFitMode,
  onAutoFitModeChange,
  infoBarExpanded,
  onInfoBarExpandedChange,
  symbol,
  bare,
  priceFormatter,
  patterns,
  patternsEnabled,
  visiblePatterns,
  statsTable,
  statsEnabled,
  statsMarket = 'India',
  statsPosition = null,
  onStatsPositionChange,
  statsSize = 'small',
  appearance,
  onAppearanceChange,
  children,
}: Props) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  // Canvas series layer (volume/candles/indicators). Sits beneath the SVG.
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasCtxRef = useRef<{ ctx: CanvasRenderingContext2D; dpr: number } | null>(
    null,
  );
  const colorResolverRef = useRef<ColorResolver | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const rect = wrapper.getBoundingClientRect();
    if (rect.width) setContainerWidth(rect.width);
    if (rect.height) setContainerHeight(rect.height);
  }, []);

  const dataLength = data?.length ?? 0;

  // Effective appearance (defaults ← sparse overrides). Recomputed each render;
  // downstream effects key on stable JSON serializations of the slices they
  // consume so they only re-run when that slice actually changes.
  const app = useMemo(() => effectiveAppearance(appearance), [appearance]);
  const appColorsKey = useMemo(() => JSON.stringify(app.colors), [app]);
  const appBackgroundKey = useMemo(() => JSON.stringify(app.background), [app]);
  const appCandleKey = useMemo(() => JSON.stringify(app.candle), [app]);
  const appAxisKey = useMemo(() => JSON.stringify(app.axis), [app]);
  const appCrosshairKey = useMemo(() => JSON.stringify(app.crosshair), [app]);
  const appPatternsKey = useMemo(() => JSON.stringify(app.patterns), [app]);
  // Bumped by the color-injection effect AFTER it recreates the resolver, so the
  // draw-state effect re-runs and re-resolves the ONCE-cached candle colors.
  const [colorEpoch, setColorEpoch] = useState(0);
  // Gear-triggered appearance dialog open state.
  const [settingsOpen, setSettingsOpen] = useState(false);

  // The published scale/geometry API — a single stable object whose fields are
  // mutated in place (mirrors the old `handlerStateRef`). Plugins read it via
  // ChartScaleContext and subscribe for change notifications.
  const scaleRef = useRef<ReturnType<typeof createChartScaleApi> | null>(null);
  if (!scaleRef.current) scaleRef.current = createChartScaleApi();
  const scaleApi = scaleRef.current.api;
  const notifyScale = scaleRef.current.notify;

  const fmtPrice = priceFormatter ?? DEFAULT_PRICE_FORMAT;
  const fmtPriceRef = useRef(fmtPrice);
  useEffect(() => {
    fmtPriceRef.current = fmtPrice;
  }, [fmtPrice]);

  // xScale domain is `[0, 1, ..., data.length - 1]`. Building this array
  // is O(N) and N can be ~2500+ — hoist it so it only rebuilds when the
  // dataset length actually changes, not on every pan / zoom / resize.
  const xDomain = useMemo(
    () => (dataLength > 0 ? d3.range(dataLength) : []),
    [dataLength],
  );

  // Ordered, distinct subpane keys of the enabled indicators, in the canonical
  // SUBPANE_ORDER (so panes never reorder on toggle). Unknown keys append in
  // first-seen order. Declared before `layout` because the height redistribution
  // depends on it.
  const activeSubpanes = useMemo(() => {
    const present = new Set<string>();
    for (const c of indicators) {
      if (!c.enabled) continue;
      const pane = getIndicator(c.defKey)?.pane;
      if (pane && typeof pane === 'object' && 'subpane' in pane)
        present.add(pane.subpane);
    }
    const ordered = SUBPANE_ORDER.filter((k) => present.has(k));
    const extras = [...present].filter((k) => !SUBPANE_ORDER.includes(k));
    return ordered.concat(extras);
  }, [indicators]);

  // User-dragged subpane heights (key → fraction of totalHeight). Seeded from
  // the `subpaneHeights` prop; the divider drag mutates this live for instant
  // re-layout, and fires `onSubpaneHeightsChange` on release so the host
  // persists it. Prop changes (e.g. symbol switch loading saved heights)
  // re-seed via the effect below.
  const [paneHeightsState, setPaneHeightsState] = useState<Record<
    string,
    number
  > | null>(subpaneHeights);
  useEffect(() => {
    setPaneHeightsState(subpaneHeights);
  }, [subpaneHeights]);

  // Per-active-pane default height multiplier: max `paneHeightFactor` over the
  // enabled defs targeting that pane (1 when none declare one). Drives the
  // `heightFactors` map handed to `computeSubpaneBands`.
  const heightFactors = useMemo(() => {
    const out: Record<string, number> = {};
    for (const c of indicators) {
      if (!c.enabled) continue;
      const def = getIndicator(c.defKey);
      const pane = def?.pane;
      if (!pane || typeof pane !== 'object' || !('subpane' in pane)) continue;
      const factor = def?.paneHeightFactor ?? 1;
      out[pane.subpane] = Math.max(out[pane.subpane] ?? 1, factor);
    }
    return out;
  }, [indicators]);

  // Readability-derived zoom-out cap (D1/D4/D5): the largest named range that
  // fits the live measured width while each bar slot stays >= MIN_BAR_STEP_PX.
  // chart-core owns + enforces this; the wheel/correction effects read it.
  const maxVisibleBars = useMemo(
    () => maxVisibleBarsForWidth(containerWidth),
    [containerWidth],
  );
  // Single render-scope clamp applied at every geometry site below so a too-wide
  // host/persisted `visibleBars` never paints sub-readable candles for a frame
  // (the correction effect that fixes the prop only runs post-paint).
  const cappedVisibleBars = Math.max(
    MIN_VISIBLE_BARS,
    Math.min(visibleBars, maxVisibleBars),
  );

  // Geometry that depends on data + viewport but NOT on priceZoom. Hoisted
  // out of the draw effect so the y-zoom path skips re-running x-scale,
  // candle data joins, volume bars, x-axis, separators, etc.
  const layout = useMemo(() => {
    if (!data || data.length === 0 || containerWidth === 0) return null;
    const totalHeight = Math.max(
      300,
      (containerHeight || 466) - MARGIN.top - MARGIN.bottom,
    );
    const minOffset = -(cappedVisibleBars - 1);
    const maxOffset = Math.max(0, data.length - cappedVisibleBars);
    const effectiveOffset = Math.max(minOffset, Math.min(panOffset, maxOffset));
    const visStart = Math.max(
      0,
      Math.floor(data.length - cappedVisibleBars - effectiveOffset),
    );
    const visEnd = Math.min(
      data.length,
      Math.ceil(data.length - effectiveOffset),
    );
    const visibleSlice = data.slice(visStart, visEnd);
    if (visibleSlice.length === 0) return null;
    const bufferBars = Math.ceil(cappedVisibleBars);
    const renderStart = Math.max(0, visStart - bufferBars);
    const renderEnd = Math.min(data.length, visEnd + bufferBars);
    const renderSlice = data.slice(renderStart, renderEnd);
    // Subpane zone sizing (D1) — see computeSubpaneBands. Volume is an ordinary
    // subpane now (a member of `activeSubpanes`), so no reserved volume band.
    const { priceHeight, subpanes, fullHeight } = computeSubpaneBands({
      totalHeight,
      subpaneKeys: activeSubpanes,
      heightRatio: SUBPANE_HEIGHT_RATIO,
      floorRatio: PRICE_FLOOR_RATIO,
      heightFactors,
      userHeights: paneHeightsState ?? undefined,
    });
    const width = containerWidth - MARGIN.left - MARGIN.right;
    const step = (width - RIGHT_BUFFER) / cappedVisibleBars;
    const baseTranslateX =
      (effectiveOffset + cappedVisibleBars - data.length) * step;
    const xScale = d3
      .scaleBand<number>()
      .domain(xDomain)
      .range([0, step * Math.max(1, data.length - 0.3)])
      .paddingInner(0.3)
      .paddingOuter(0);
    const bandwidth = xScale.bandwidth();
    const visibleBarsInt = Math.floor(cappedVisibleBars);
    const visibleStartIdx = Math.round(
      data.length - cappedVisibleBars - effectiveOffset,
    );
    return {
      totalHeight,
      visStart,
      visEnd,
      visibleSlice,
      renderStart,
      renderEnd,
      renderSlice,
      priceHeight,
      fullHeight,
      subpanes,
      width,
      step,
      baseTranslateX,
      xScale,
      bandwidth,
      visibleBarsInt,
      visibleStartIdx,
      effectiveOffset,
    };
  }, [
    data,
    cappedVisibleBars,
    panOffset,
    containerWidth,
    containerHeight,
    xDomain,
    activeSubpanes,
    heightFactors,
    paneHeightsState,
  ]);

  // Resolve each enabled indicator over concat(warmupSeed, data), then slice
  // the computed series back to the display window so they align with `data`
  // (warm-up bars are seeding-only and never rendered/pannable).
  const resolvedIndicators = useMemo<ResolvedIndicator[]>(() => {
    if (!data || data.length === 0) return [];
    const enabled = indicators.filter((c) => c.enabled);
    if (enabled.length === 0) return [];
    const seed = warmupSeed && warmupSeed.length ? warmupSeed : [];
    const combined = seed.length ? seed.concat(data) : data;
    const cols = toColumns(combined);
    const input: IndicatorInput = { ...cols, bars: combined };
    if (benchmarkClose) {
      const bc = new Float64Array(combined.length);
      for (let i = 0; i < combined.length; i++) {
        const v = benchmarkClose[combined[i].date];
        bc[i] = v == null ? NaN : v;
      }
      input.benchmarkClose = bc;
    }
    if (quarterlyResults) input.quarterlyResults = quarterlyResults;
    input.market = statsMarket;
    const seedLen = seed.length;
    // Display window begins after the warmup prefix. Volume scopes its HVE/HVY +
    // cold-start SMA to the display window via this; other defs ignore it.
    input.displayStart = seedLen;
    return enabled.map((config) => {
      const def = getIndicator(config.defKey);
      if (!def) return { config, series: {} as IndicatorSeries };
      const { series: full, meta } = def.compute(input, config.settings);
      const series: IndicatorSeries = {};
      for (const key of Object.keys(full)) {
        series[key] = seedLen ? full[key].subarray(seedLen) : full[key];
      }
      return { config, series, meta };
    });
  }, [
    data,
    warmupSeed,
    indicators,
    benchmarkClose,
    quarterlyResults,
    statsMarket,
  ]);

  // Price-stats view-model — latest-bar snapshot. Separate from
  // `resolvedIndicators` (which early-returns [] when no indicator is enabled):
  // the ATR rows need the warmup+data history regardless of indicator state.
  const statsModel = useMemo(() => {
    if (!data || data.length === 0) return null;
    const combined =
      warmupSeed && warmupSeed.length ? warmupSeed.concat(data) : data;
    return computeStats(combined, statsTable, statsMarket);
  }, [data, warmupSeed, statsTable, statsMarket]);

  // Everything the canvas redraw needs that is NOT a live scale field. Rebuilt
  // in Effect B (after the y-scale exists); the pan path reuses it with only a
  // fresh baseTranslateX.
  const drawStateRef = useRef<{
    cssWidth: number;
    cssHeight: number;
    width: number;
    fullHeight: number;
    priceHeight: number;
    bandwidth: number;
    renderStart: number;
    renderEnd: number;
    renderSlice: Candle[];
    chartType: ChartType;
    data: Candle[];
    colors: { positive: string; negative: string };
    background: { topColor: string; bottomColor: string; radius: number };
    candle: { wickWidth: number };
    indicators: ResolvedIndicator[];
  } | null>(null);

  // Stable redraw entrypoint. Reads the cached draw-state + live scale fields
  // (xScale/yPrice from the last rescale, baseTranslateX which moves on pan).
  const redrawSeries = useCallback(() => {
    const cc = canvasCtxRef.current;
    const st = drawStateRef.current;
    if (!cc || !st) return;
    drawSeries(cc.ctx, {
      dpr: cc.dpr,
      cssWidth: st.cssWidth,
      cssHeight: st.cssHeight,
      marginLeft: MARGIN.left,
      marginTop: MARGIN.top,
      marginBottom: MARGIN.bottom,
      rightBuffer: RIGHT_BUFFER,
      width: st.width,
      fullHeight: st.fullHeight,
      priceHeight: st.priceHeight,
      bandwidth: st.bandwidth,
      baseTranslateX: scaleApi.baseTranslateX,
      renderStart: st.renderStart,
      renderEnd: st.renderEnd,
      renderSlice: st.renderSlice,
      chartType: st.chartType,
      xScale: scaleApi.xScale,
      yPrice: scaleApi.yPrice,
      subpaneScales: scaleApi.subpaneScales,
      data: st.data,
      colors: st.colors,
      background: st.background,
      candle: st.candle,
      indicators: st.indicators.map((r) => ({
        config: r.config,
        series: r.series,
        meta: r.meta,
      })),
      resolveColor: (v) => colorResolverRef.current?.resolve(v) ?? '#888888',
    });
  }, [scaleApi]);

  const priceBottomPx = useMemo(
    () => (layout ? MARGIN.top + layout.priceHeight : 0),
    [layout],
  );

  // Subpane divider drag. Each handle straddles the gap strip above its pane;
  // `dividerIndex` i trades space between pane i and what's above it (the price
  // pane for i=0). The snapshot is taken at pointerdown so cumulative `dy` is
  // always measured from the bands as they were when the drag began (matching
  // `applySubpaneDrag`'s pure signature).
  const subpaneDragRef = useRef<{
    index: number;
    startY: number;
    bands: SubpaneBand[];
    priceHeight: number;
    totalHeight: number;
    latest: Record<string, number> | null;
  } | null>(null);

  const onDividerPointerDown = useCallback(
    (index: number) => (e: React.PointerEvent<HTMLDivElement>) => {
      if (!layout) return;
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      subpaneDragRef.current = {
        index,
        startY: e.clientY,
        bands: layout.subpanes,
        priceHeight: layout.priceHeight,
        totalHeight: layout.totalHeight,
        latest: null,
      };
    },
    [layout],
  );

  const onDividerPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const s = subpaneDragRef.current;
      if (!s) return;
      const next = applySubpaneDrag({
        bands: s.bands,
        priceHeight: s.priceHeight,
        totalHeight: s.totalHeight,
        dividerIndex: s.index,
        dy: e.clientY - s.startY,
        minPanePx: SUBPANE_MIN_PX,
        floorRatio: PRICE_FLOOR_RATIO,
      });
      s.latest = next;
      setPaneHeightsState(next);
    },
    [],
  );

  const onDividerPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const s = subpaneDragRef.current;
      if (!s) return;
      e.currentTarget.releasePointerCapture?.(e.pointerId);
      subpaneDragRef.current = null;
      if (s.latest) onSubpaneHeightsChange?.(s.latest);
    },
    [onSubpaneHeightsChange],
  );

  // Multiplicative price-axis zoom. >1 = compressed log-domain (zoom in),
  // <1 = expanded log-domain (zoom out). Resets when the symbol changes.
  const [priceZoom, setPriceZoom] = useState<number>(1);
  const priceZoomRef = useRef(priceZoom);
  useEffect(() => {
    priceZoomRef.current = priceZoom;
  }, [priceZoom]);

  // Hover tracking for the autofit button. Tracked on both the SVG y-axis
  // hit-rect and the HTML button itself so transitioning between the two does
  // not cause the button to flicker out.
  const [yAxisHovered, setYAxisHovered] = useState(false);
  const [autoFitHovered, setAutoFitHovered] = useState(false);
  const showAutoFitBtn = yAxisHovered || autoFitHovered;
  const dragStateRef = useRef<{
    active: boolean;
    startX: number;
    startOffset: number;
    baseTx: number;
    step: number;
    minOff: number;
    maxOff: number;
  }>({
    active: false,
    startX: 0,
    startOffset: 0,
    baseTx: 0,
    step: 1,
    minOff: 0,
    maxOff: 0,
  });
  const onPanOffsetChangeRef = useRef(onPanOffsetChange);
  useEffect(() => {
    onPanOffsetChangeRef.current = onPanOffsetChange;
  }, [onPanOffsetChange]);
  const panOffsetRef = useRef(panOffset);
  useEffect(() => {
    panOffsetRef.current = panOffset;
  }, [panOffset]);
  // Live mirrors so the wheel/correction closures (deps kept narrow) read the
  // current cap + visibleBars setter instead of a stale-`containerWidth` capture.
  const maxBarsRef = useRef(maxVisibleBars);
  maxBarsRef.current = maxVisibleBars;
  const onVisibleBarsChangeRef = useRef(onVisibleBarsChange);
  useEffect(() => {
    onVisibleBarsChangeRef.current = onVisibleBarsChange;
  }, [onVisibleBarsChange]);
  const onMaxVisibleBarsChangeRef = useRef(onMaxVisibleBarsChange);
  useEffect(() => {
    onMaxVisibleBarsChangeRef.current = onMaxVisibleBarsChange;
  }, [onMaxVisibleBarsChange]);
  const pendingFrameRef = useRef<number | null>(null);
  const pendingDxRef = useRef<number>(0);
  const chartGroupRef = useRef<SVGGElement | null>(null);

  // Long-lived d3 selections built once in Effect 1.
  const rootGRef = useRef<Sel<SVGGElement> | null>(null);
  const bgRectRef = useRef<Sel<SVGRectElement> | null>(null);
  const clipRectRef = useRef<Sel<SVGRectElement> | null>(null);
  const yPriceAxisGRef = useRef<Sel<SVGGElement> | null>(null);
  const ySubAxisGRef = useRef<Sel<SVGGElement> | null>(null);
  const subGuidesGroupRef = useRef<Sel<SVGGElement> | null>(null);
  const sepGroupRef = useRef<Sel<SVGGElement> | null>(null);
  const rightBorderRef = useRef<Sel<SVGLineElement> | null>(null);
  const chartGroupSelRef = useRef<Sel<SVGGElement> | null>(null);
  const xAxisGRef = useRef<Sel<SVGGElement> | null>(null);
  const crosshairVRef = useRef<Sel<SVGLineElement> | null>(null);
  const crosshairHRef = useRef<Sel<SVGLineElement> | null>(null);
  const infoTextRef = useRef<Sel<SVGTextElement> | null>(null);
  const infoSpansRef = useRef<Sel<SVGTSpanElement>[]>([]);
  // Set inside the crosshair effect; lets the data-update effect refresh the
  // top-left readout to the latest candle (that effect re-runs on data change,
  // the crosshair effect only runs once on mount).
  const showLatestInfoRef = useRef<(() => void) | null>(null);
  const priceLabelGroupRef = useRef<Sel<SVGGElement> | null>(null);
  const priceLabelTextRef = useRef<Sel<SVGTextElement> | null>(null);
  const overlayRectRef = useRef<Sel<SVGRectElement> | null>(null);
  const yAxisHitRectRef = useRef<Sel<SVGRectElement> | null>(null);
  const priceClipRectRef = useRef<Sel<SVGRectElement> | null>(null);
  const bgGradientUserRef = useRef<Sel<SVGLinearGradientElement> | null>(null);

  // Crosshair rAF coalescing.
  const crosshairRafRef = useRef<number | null>(null);
  const crosshairLastPosRef = useRef<{ mx: number; my: number } | null>(null);
  // Hovered bar index, published from the imperative crosshair handler to the
  // React indicator legend (which renders each row's value at that bar). A
  // subscription rather than state so only the legend re-renders on hover, not
  // all of Chart.
  const hoverIndexSubsRef = useRef(new Set<(idx: number | null) => void>());
  const subscribeHoverIndex = useCallback(
    (cb: (idx: number | null) => void) => {
      hoverIndexSubsRef.current.add(cb);
      return () => {
        hoverIndexSubsRef.current.delete(cb);
      };
    },
    [],
  );

  // Chart-pattern overlay — read-only, bundled core feature; single persistent
  // handle (no per-tool map since detections aren't editable).
  const patternOverlayContainerRef = useRef<SVGGElement | null>(null);
  const patternOverlayHandleRef = useRef<ChartPatternOverlayHandle | null>(null);

  // Reactive overlay hosts published to app plugins (Fix #1). Set after Effect
  // 1 mounts the host <g>s, cleared on unmount.
  const [tradeHost, setTradeHost] = useState<SVGGElement | null>(null);
  const [triggerHost, setTriggerHost] = useState<SVGGElement | null>(null);

  // Auto-fit overlay price bounds, contributed by the plugins (Option 1 seam).
  const [tradeBounds, setTradeBounds] = useState<{
    min: number;
    max: number;
  } | null>(null);
  const [triggerBounds, setTriggerBounds] = useState<{
    min: number;
    max: number;
  } | null>(null);

  const reportOverlayPriceBounds = useCallback(
    (layer: ChartOverlayLayer, bounds: { min: number; max: number } | null) => {
      const setter = layer === 'trade' ? setTradeBounds : setTriggerBounds;
      setter((prev) => {
        if (prev === bounds) return prev;
        if (
          prev &&
          bounds &&
          prev.min === bounds.min &&
          prev.max === bounds.max
        )
          return prev;
        return bounds;
      });
    },
    [],
  );

  const overlayPriceBounds = useMemo<{ min: number; max: number } | null>(() => {
    const mins: number[] = [];
    const maxs: number[] = [];
    if (tradeBounds) {
      mins.push(tradeBounds.min);
      maxs.push(tradeBounds.max);
    }
    if (triggerBounds) {
      mins.push(triggerBounds.min);
      maxs.push(triggerBounds.max);
    }
    if (mins.length === 0) return null;
    return { min: Math.min(...mins), max: Math.max(...maxs) };
  }, [tradeBounds, triggerBounds]);

  // Bare-chart-background mousedown subscribers (plugins clear their selection).
  const bgPointerDownSubsRef = useRef<Set<() => void>>(new Set());
  const subscribeBackgroundPointerDown = useCallback((cb: () => void) => {
    const subs = bgPointerDownSubsRef.current;
    subs.add(cb);
    return () => {
      subs.delete(cb);
    };
  }, []);

  const overlayContextValue = useMemo<ChartOverlayContextValue>(
    () => ({
      tradeHost,
      triggerHost,
      priceBottomPx,
      marginRight: MARGIN.right,
      reportOverlayPriceBounds,
      subscribeBackgroundPointerDown,
    }),
    [
      tradeHost,
      triggerHost,
      priceBottomPx,
      reportOverlayPriceBounds,
      subscribeBackgroundPointerDown,
    ],
  );

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    let timeout: ReturnType<typeof setTimeout> | undefined;
    const observer = new ResizeObserver((entries) => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        const rect = entries[0]?.contentRect;
        if (rect?.width) setContainerWidth(rect.width);
        if (rect?.height) setContainerHeight(rect.height);
      }, 150);
    });
    observer.observe(wrapper);
    return () => {
      if (timeout) clearTimeout(timeout);
      observer.disconnect();
    };
  }, []);

  // Publish the live price-pane height as a document-level CSS var so chrome that
  // is NOT a descendant of the chart (e.g. the toolbar's pattern/indicator
  // dropdowns, which are siblings of the chart) can size against it —
  // `max-height: calc(0.8 * var(--chart-price-height))`. Single-chart assumption:
  // the var is global, so a second concurrent Chart would overwrite it.
  const pricePaneHeight = layout?.priceHeight ?? null;
  useEffect(() => {
    if (pricePaneHeight == null) return;
    const root = document.documentElement;
    root.style.setProperty('--chart-price-height', `${pricePaneHeight}px`);
    return () => root.style.removeProperty('--chart-price-height');
  }, [pricePaneHeight]);

  // Color injection + resolver. Injects `app.colors` as inline `--<key>` custom
  // properties on the wrapper (so every canvas/SVG element reading a
  // `var(--chart-*)` picks them up with zero draw-code changes), then RECREATES
  // the resolver (its per-expression cache can't be invalidated in place) and
  // bumps `colorEpoch` so the draw-state effect re-resolves the once-cached
  // candle colors. Re-runs whenever the color overrides change (and on mount;
  // `appColorsKey` is `'{}'` then, which still creates the base resolver).
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const colors = app.colors;
    const keys = Object.keys(colors);
    for (const k of keys) wrapper.style.setProperty(`--${k}`, colors[k]);
    const resolver = createColorResolver(wrapper);
    colorResolverRef.current?.destroy();
    colorResolverRef.current = resolver;
    setColorEpoch((e) => e + 1);
    return () => {
      for (const k of keys) wrapper.style.removeProperty(`--${k}`);
      resolver.destroy();
      colorResolverRef.current = null;
    };
    // `app.colors` is captured via the stable `appColorsKey` serialization.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appColorsKey]);

  // Canvas DPR backing-store sizing. CSS px matches the svg box; the backing
  // store is px*dpr with the context pre-scaled by dpr. Re-applies + redraws on
  // a devicePixelRatio change (browser zoom / cross-monitor drag) which a
  // ResizeObserver won't catch, via a re-armed resolution media query.
  const layoutTotalHeight = layout?.totalHeight ?? null;
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || layoutTotalHeight == null || containerWidth === 0) return;
    const cssW = containerWidth;
    const cssH = layoutTotalHeight + MARGIN.top + MARGIN.bottom;
    let mql: MediaQueryList | null = null;

    const onChange = () => apply();
    function apply() {
      const c = canvas;
      if (!c) return;
      const dpr = window.devicePixelRatio || 1;
      c.style.width = `${cssW}px`;
      c.style.height = `${cssH}px`;
      c.width = Math.round(cssW * dpr);
      c.height = Math.round(cssH * dpr);
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        canvasCtxRef.current = { ctx, dpr };
        redrawSeries();
      }
      if (mql) mql.removeEventListener('change', onChange);
      mql = window.matchMedia(`(resolution: ${dpr}dppx)`);
      mql.addEventListener('change', onChange);
    }
    apply();
    return () => {
      if (mql) mql.removeEventListener('change', onChange);
    };
  }, [containerWidth, layoutTotalHeight, redrawSeries]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper || !onVisibleBarsChange) return;
    let pendingFactor = 1;
    let pendingFrame: number | null = null;
    function onWheel(e: WheelEvent) {
      // Yield the wheel to any open popover/dialog that scrolls its own content.
      // Without this, the wrapper's preventDefault() cancels the panel's native
      // scroll and zooms the chart instead. Contract: scroll panels tag their
      // scroll body with data-chart-wheel-scroll (see CLAUDE.md).
      if ((e.target as Element | null)?.closest?.('[data-chart-wheel-scroll]')) return;
      e.preventDefault();
      const factor = e.deltaY > 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR;
      pendingFactor *= factor;
      if (pendingFrame == null) {
        pendingFrame = requestAnimationFrame(() => {
          pendingFrame = null;
          const f = pendingFactor;
          pendingFactor = 1;
          // Clamp to the readability cap (read live from maxBarsRef — the closure
          // deps stay [onVisibleBarsChange], so containerWidth would be stale).
          onVisibleBarsChange!((prev) =>
            Math.min(
              maxBarsRef.current,
              Math.max(MIN_VISIBLE_BARS, prev * f),
            ),
          );
        });
      }
    }
    wrapper.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      wrapper.removeEventListener('wheel', onWheel);
      if (pendingFrame != null) cancelAnimationFrame(pendingFrame);
    };
  }, [onVisibleBarsChange]);

  useEffect(() => {
    const len = data?.length ?? 0;
    if (len === 0) return;
    const minOffset = -(visibleBars - 1);
    const maxOffset = Math.max(0, len - visibleBars);
    onPanOffsetChangeRef.current((prev) =>
      Math.max(minOffset, Math.min(maxOffset, prev)),
    );
  }, [data?.length, visibleBars]);

  // Cap-correction effect (mirrors the pan-clamp above): self-correct a too-large
  // host/persisted `visibleBars` when the window shrinks past the readability cap,
  // and floor a too-small one. Guard on containerWidth === 0 — before measurement
  // maxVisibleBarsForWidth(0) returns the MIN_VISIBLE_BARS fallback and would
  // wrongly clamp to 10. Host needs no geometry knowledge; chart-core owns the cap.
  useEffect(() => {
    if (containerWidth === 0 || !onVisibleBarsChange) return;
    if (visibleBars > maxVisibleBars || visibleBars < MIN_VISIBLE_BARS) {
      onVisibleBarsChangeRef.current?.((prev) =>
        Math.min(maxVisibleBars, Math.max(MIN_VISIBLE_BARS, prev)),
      );
    }
  }, [maxVisibleBars, visibleBars, containerWidth, onVisibleBarsChange]);

  // Surface the cap to the host (it can't read containerWidth directly) so it can
  // bound a zoom slider. Skip the pre-measurement fallback.
  useEffect(() => {
    if (containerWidth === 0 || !onMaxVisibleBarsChange) return;
    onMaxVisibleBarsChangeRef.current?.(maxVisibleBars);
  }, [maxVisibleBars, containerWidth, onMaxVisibleBarsChange]);

  // Reset price-axis zoom when the user switches symbols. Done at render
  // time to avoid a cascading render via an effect.
  const [prevSymbolForZoom, setPrevSymbolForZoom] = useState(symbol);
  if (prevSymbolForZoom !== symbol) {
    setPrevSymbolForZoom(symbol);
    if (priceZoom !== 1) setPriceZoom(1);
  }

  useEffect(() => {
    const endDrag = () => {
      const s = dragStateRef.current;
      if (!s.active) return;
      s.active = false;
      if (wrapperRef.current) wrapperRef.current.style.cursor = '';
      if (pendingFrameRef.current != null) {
        cancelAnimationFrame(pendingFrameRef.current);
        pendingFrameRef.current = null;
      }
      const deltaBars = Math.round(pendingDxRef.current / s.step);
      const newOffset = Math.max(
        s.minOff,
        Math.min(s.maxOff, s.startOffset + deltaBars),
      );
      pendingDxRef.current = 0;
      if (newOffset !== s.startOffset) {
        onPanOffsetChangeRef.current(newOffset);
      } else if (chartGroupRef.current) {
        chartGroupRef.current.setAttribute(
          'transform',
          `translate(${s.baseTx},0)`,
        );
        scaleApi.baseTranslateX = s.baseTx;
        notifyScale('pan');
        patternOverlayHandleRef.current?.setTransform(s.baseTx);
        redrawSeries();
      }
    };
    const onMove = (e: MouseEvent) => {
      const s = dragStateRef.current;
      if (!s.active) return;
      if (e.buttons === 0) {
        endDrag();
        return;
      }
      const dx = e.clientX - s.startX;
      pendingDxRef.current = dx;
      if (pendingFrameRef.current == null) {
        pendingFrameRef.current = requestAnimationFrame(() => {
          pendingFrameRef.current = null;
          const tx = s.baseTx + pendingDxRef.current;
          if (chartGroupRef.current) {
            chartGroupRef.current.setAttribute(
              'transform',
              `translate(${tx},0)`,
            );
          }
          scaleApi.baseTranslateX = tx;
          notifyScale('pan');
          patternOverlayHandleRef.current?.setTransform(tx);
          redrawSeries();
        });
      }
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', endDrag);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', endDrag);
      if (pendingFrameRef.current != null) {
        cancelAnimationFrame(pendingFrameRef.current);
        pendingFrameRef.current = null;
      }
    };
  }, [scaleApi, notifyScale, redrawSeries]);

  // Effect 1 — Build static SVG structure once. All long-lived selections
  // are cached in refs; size-dependent attrs are set in Effect 2.
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg
      .append('g')
      .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);
    rootGRef.current = g as Sel<SVGGElement>;

    const defs = g.append('defs');
    const clip = defs.append('clipPath').attr('id', 'chart-viewport');
    clipRectRef.current = clip
      .append('rect')
      .attr('x', 0)
      .attr('y', -MARGIN.top) as Sel<SVGRectElement>;

    // Tighter clip for the trade overlay — bounded to the price area only,
    // so dragging the tool down does not spill into the volume panel.
    const priceClip = defs
      .append('clipPath')
      .attr('id', 'chart-price-viewport');
    priceClipRectRef.current = priceClip
      .append('rect')
      .attr('x', 0)
      .attr('y', -MARGIN.top) as Sel<SVGRectElement>;

    const grad = defs
      .append('linearGradient')
      .attr('id', 'chart-bg-gradient')
      .attr('x1', '0%')
      .attr('y1', '100%')
      .attr('x2', '0%')
      .attr('y2', '0%');
    grad.append('stop').attr('offset', '0%').attr('stop-color', '#776a5a');
    grad.append('stop').attr('offset', '100%').attr('stop-color', '#6e7b8b');

    // userSpaceOnUse twin of the chart bg gradient. Used by the trade overlay
    // handles so their fill samples the actual background color at the handle's
    // y position rather than re-rendering the full gradient inside each circle.
    // Endpoints are set in Effect 2 once the bg rect height is known.
    const gradUser = defs
      .append('linearGradient')
      .attr('id', 'chart-bg-gradient-user')
      .attr('gradientUnits', 'userSpaceOnUse');
    gradUser.append('stop').attr('offset', '0%').attr('stop-color', '#6e7b8b');
    gradUser
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#776a5a');
    bgGradientUserRef.current = gradUser as Sel<SVGLinearGradientElement>;

    // The canvas series layer (beneath this SVG) now paints the background
    // gradient, so this rect is transparent — it would otherwise sit at the
    // SVG's z-index ABOVE the canvas and hide the candles. The `defs` gradients
    // above stay (the trade-overlay handles sample the userSpace twin).
    bgRectRef.current = g
      .append('rect')
      .attr('x', -MARGIN.left)
      .attr('y', -MARGIN.top)
      .attr('rx', 12)
      .attr('ry', 12)
      .attr('fill', 'transparent') as Sel<SVGRectElement>;

    yPriceAxisGRef.current = g
      .append('g')
      .style('font-size', 'var(--text-2hxs)')
      .style('font-family', CHART_FONT)
      .style('font-weight', '500')
      .style('color', 'var(--chart-axis-label)') as Sel<SVGGElement>;

    ySubAxisGRef.current = g
      .append('g')
      .style('font-size', 'var(--text-2hxs)')
      .style('font-family', CHART_FONT)
      .style('font-weight', '500')
      .style('color', 'var(--chart-axis-label)')
      .style('display', 'none') as Sel<SVGGElement>;

    // Full-width dashed guide/zero lines for the subpanes (unpanned, like the
    // separators). Populated per-pane in Effect B.
    subGuidesGroupRef.current = g
      .append('g')
      .style('display', 'none') as Sel<SVGGElement>;

    sepGroupRef.current = g.append('g') as Sel<SVGGElement>;

    rightBorderRef.current = g
      .append('line')
      .attr('y1', -MARGIN.top)
      .attr('stroke', 'var(--chart-separator)')
      .attr('stroke-opacity', 1) as Sel<SVGLineElement>;

    // Pattern overlay paints before the candle clipWrapper so its shapes sit
    // beneath the volume bars, candles, EMAs, and highs.
    patternOverlayContainerRef.current = g
      .append('g')
      .attr('class', 'chart-pattern-overlays-container')
      .node();
    patternOverlayHandleRef.current = mountChartPatternOverlay(
      patternOverlayContainerRef.current!,
    );

    const clipWrapper = g.append('g').attr('clip-path', 'url(#chart-viewport)');
    const chartGroup = clipWrapper.append('g');
    chartGroupSelRef.current = chartGroup as Sel<SVGGElement>;
    chartGroupRef.current = chartGroup.node();

    xAxisGRef.current = chartGroup
      .append('g')
      .style('font-size', 'var(--text-2hxs)')
      .style('font-family', CHART_FONT)
      .style('font-weight', '500')
      .style('color', 'var(--chart-axis-label)') as Sel<SVGGElement>;

    crosshairVRef.current = g
      .append('line')
      .attr('stroke', 'currentColor')
      .attr('stroke-opacity', 0.3)
      .attr('stroke-dasharray', '3,3')
      .attr('y1', 0)
      .style('visibility', 'hidden') as Sel<SVGLineElement>;

    crosshairHRef.current = g
      .append('line')
      .attr('stroke', 'currentColor')
      .attr('stroke-opacity', 0.3)
      .attr('stroke-dasharray', '3,3')
      .attr('x1', 0)
      .style('visibility', 'hidden') as Sel<SVGLineElement>;

    const infoText = g
      .append('text')
      .attr('x', 8)
      .attr('y', 14)
      .style('font-size', 'var(--text-sm)')
      .style('font-family', CHART_FONT)
      .style('font-weight', '500')
      .attr('fill', 'currentColor')
      .style('visibility', 'hidden');
    infoTextRef.current = infoText as Sel<SVGTextElement>;
    infoSpansRef.current = [];
    for (let i = 0; i < INFO_SPAN_COUNT; i++) {
      infoSpansRef.current.push(
        infoText.append('tspan') as Sel<SVGTSpanElement>,
      );
    }

    const priceLabelG = g.append('g').style('visibility', 'hidden');
    priceLabelGroupRef.current = priceLabelG as Sel<SVGGElement>;
    priceLabelG
      .append('rect')
      .attr('width', 56)
      .attr('height', 18)
      .attr('rx', 3)
      .attr('fill', 'var(--bg-card)')
      .attr('stroke', 'currentColor')
      .attr('stroke-opacity', 0.2);
    priceLabelTextRef.current = priceLabelG
      .append('text')
      .attr('x', 28)
      .attr('y', 13)
      .attr('text-anchor', 'middle')
      .style('font-size', 'var(--text-3xs)')
      .style('font-family', CHART_FONT)
      .style('font-weight', '500')
      .attr('fill', 'currentColor') as Sel<SVGTextElement>;

    overlayRectRef.current = g
      .append('rect')
      .attr('fill', 'transparent') as Sel<SVGRectElement>;

    yAxisHitRectRef.current = g
      .append('rect')
      .attr('fill', 'transparent')
      .style('cursor', 'ns-resize')
      .style('pointer-events', 'all') as Sel<SVGRectElement>;

    // Overlay hosts: created here in their exact z-order slots (trigger beneath
    // trade) and published reactively so app plugins can mount into them.
    const triggerHostNode = g
      .append('g')
      .attr('class', 'trigger-overlays-container')
      .node() as SVGGElement;
    const tradeHostNode = g
      .append('g')
      .attr('class', 'trade-overlays-container')
      .node() as SVGGElement;
    setTriggerHost(triggerHostNode);
    setTradeHost(tradeHostNode);

    return () => {
      if (crosshairRafRef.current != null) {
        cancelAnimationFrame(crosshairRafRef.current);
        crosshairRafRef.current = null;
      }
      crosshairLastPosRef.current = null;
      svg.selectAll('*').remove();
      rootGRef.current = null;
      bgRectRef.current = null;
      clipRectRef.current = null;
      yPriceAxisGRef.current = null;
      ySubAxisGRef.current = null;
      subGuidesGroupRef.current = null;
      sepGroupRef.current = null;
      rightBorderRef.current = null;
      chartGroupSelRef.current = null;
      chartGroupRef.current = null;
      xAxisGRef.current = null;
      crosshairVRef.current = null;
      crosshairHRef.current = null;
      infoTextRef.current = null;
      infoSpansRef.current = [];
      priceLabelGroupRef.current = null;
      priceLabelTextRef.current = null;
      overlayRectRef.current = null;
      yAxisHitRectRef.current = null;
      priceClipRectRef.current = null;
      bgGradientUserRef.current = null;
      setTriggerHost(null);
      setTradeHost(null);
      patternOverlayHandleRef.current?.destroy();
      patternOverlayHandleRef.current = null;
      patternOverlayContainerRef.current = null;
    };
  }, []);

  // Effect A — layout / static draw. Runs on layout / chartType / indicators
  // changes. Does NOT depend on priceZoom — y-scale-dependent attrs (candle
  // y/height, EMA path d, price axis, scale api) are set in Effect B.
  useEffect(() => {
    if (!data || !layout || !svgRef.current) return;
    if (!rootGRef.current || !chartGroupSelRef.current) return;

    const {
      renderStart,
      renderEnd,
      priceHeight,
      fullHeight,
      subpanes,
      width,
      baseTranslateX,
      xScale,
      totalHeight,
    } = layout;

    const svgHeight = totalHeight + MARGIN.top + MARGIN.bottom;

    d3.select(svgRef.current)
      .attr('width', containerWidth)
      .attr('height', svgHeight);

    bgRectRef
      .current!.attr('width', containerWidth)
      .attr('height', fullHeight + MARGIN.top + MARGIN.bottom);

    // Match the userSpace twin gradient to the bg rect's actual y extent, and
    // drive its stop colors from `app.background` so a customized background and
    // the overlay handles (which sample this gradient) stay in sync.
    const bgH = fullHeight + MARGIN.top + MARGIN.bottom;
    bgGradientUserRef
      .current!.attr('x1', 0)
      .attr('y1', -MARGIN.top)
      .attr('x2', 0)
      .attr('y2', -MARGIN.top + bgH);
    bgGradientUserRef
      .current!.selectAll<SVGStopElement, unknown>('stop')
      .attr('stop-color', function () {
        return this.getAttribute('offset') === '0%'
          ? app.background.topColor
          : app.background.bottomColor;
      });

    clipRectRef
      .current!.attr('width', width - RIGHT_BUFFER)
      .attr('height', fullHeight + MARGIN.top + MARGIN.bottom);

    priceClipRectRef
      .current!.attr('width', width - RIGHT_BUFFER)
      .attr('height', MARGIN.top + priceHeight);

    const tickValues: number[] = [];
    for (let i = Math.max(1, renderStart); i < renderEnd; i++) {
      if (data[i].date.slice(0, 7) !== data[i - 1].date.slice(0, 7)) {
        tickValues.push(i);
      }
    }

    yPriceAxisGRef.current!.attr('transform', `translate(${width},0)`);

    // Separators, built additively so each present band gets its divider: a
    // divider above EACH subpane band (the topmost subpane's — e.g. volume's —
    // sits on the price/subpane boundary), and the bottom border. Subpanes stack
    // flush, so each subpane's top divider sits exactly on the boundary it shares
    // with the content above it (`pane.top`): the pane above's bottom content and
    // this pane's top content both rest against the one line — matching the
    // bottom border (which hugs the last pane's bottom at `fullHeight`).
    const sepValues: number[] = [];
    for (const pane of subpanes) sepValues.push(pane.top);
    if (subpanes.length > 0) sepValues.push(fullHeight);
    sepGroupRef
      .current!.selectAll<SVGLineElement, number>('line')
      .data(sepValues)
      .join('line')
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', (d) => d)
      .attr('y2', (d) => d)
      .attr('stroke', 'var(--chart-separator)')
      .attr('stroke-opacity', 1);

    rightBorderRef
      .current!.attr('x1', width)
      .attr('x2', width)
      .attr('y2', fullHeight);

    chartGroupSelRef.current!.attr(
      'transform',
      `translate(${baseTranslateX},0)`,
    );

    xAxisGRef
      .current!.attr('transform', `translate(0,${fullHeight})`)
      .call(
        d3
          .axisBottom(xScale)
          .tickValues(tickValues)
          .tickSize(app.axis.tickSize)
          .tickFormat((i) => {
            const d = data[i];
            if (!d) return '';
            const date = new Date(d.date);
            return d3.timeFormat('%b %y')(date);
          }),
      );
    xAxisGRef.current!.select('.domain').remove();
    xAxisGRef
      .current!.selectAll('line')
      .attr('stroke', AXIS_STROKE)
      .attr('stroke-opacity', app.axis.opacity);

    crosshairVRef.current!.attr('y2', fullHeight);
    crosshairHRef.current!.attr('x2', width);

    overlayRectRef.current!.attr('width', width).attr('height', fullHeight);

    yAxisHitRectRef
      .current!.attr('x', width)
      .attr('y', 0)
      .attr('width', MARGIN.right)
      .attr('height', priceHeight);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, containerWidth, data, activeSubpanes, appAxisKey, appBackgroundKey]);

  // Effect B — y-scale draw. Runs on priceZoom changes too. Recomputes yPrice,
  // redraws the price axis, publishes the scale api, and repaints the canvas
  // series (candles/volume/indicators) for the new y-scale.
  useEffect(() => {
    if (!data || !layout) return;
    if (!yPriceAxisGRef.current) return;
    const {
      visibleSlice,
      visStart,
      visEnd,
      renderSlice,
      renderStart,
      renderEnd,
      priceHeight,
      fullHeight,
      subpanes,
      totalHeight,
      width,
      xScale,
      bandwidth,
      step,
      baseTranslateX,
      visibleBarsInt,
      visibleStartIdx,
    } = layout;

    let priceMin = d3.min(visibleSlice, (d) => d.low) ?? 0;
    let priceMax = d3.max(visibleSlice, (d) => d.high) ?? 1;
    if (autoFitMode === 'priceAndOverlays') {
      // Expand the price domain over the in-browser indicator series across the
      // visible window (replaces the old b.ema/b.high column reads). Subpane
      // indicators (RS line) live on their own scale — their ratio values must
      // NOT pollute the price-pane domain, so skip them here.
      for (const { config, series } of resolvedIndicators) {
        const def = getIndicator(config.defKey);
        if (!def || typeof def.pane === 'object') continue;
        // Only the def's `autofitKeys` series drive the price domain (replaces
        // the old implicit `width !== 0` set). Stage 2 returns [] — its 1/NaN
        // band flag never collapses the log price domain. A def without
        // `autofitKeys` falls back to every series it computed.
        const keys = def.autofitKeys?.(config.settings) ?? Object.keys(series);
        for (const key of keys) {
          const arr = series[key];
          if (!arr) continue;
          for (let g = visStart; g < visEnd && g < arr.length; g++) {
            const v = arr[g];
            // Skip non-positive overlay values (e.g. a BBANDS lower band can dip
            // ≤0 for volatile/low-priced inputs) — they would poison the log fold
            // (Math.log(priceMin)) below into NaN/−∞.
            if (!Number.isNaN(v) && v > 0) {
              if (v < priceMin) priceMin = v;
              if (v > priceMax) priceMax = v;
            }
          }
        }
      }
      if (priceZoom === 1 && overlayPriceBounds) {
        priceMin = Math.min(priceMin, overlayPriceBounds.min);
        priceMax = Math.max(priceMax, overlayPriceBounds.max);
      }
    }
    const logMin = Math.log(priceMin);
    const logMax = Math.log(priceMax);
    const logCenter = (logMin + logMax) / 2;
    const baseHalfRange = (logMax - logMin) / 2;
    const adjHalfRange = baseHalfRange / Math.max(0.01, priceZoom);
    const adjLogMin = logCenter - adjHalfRange;
    const adjLogMax = logCenter + adjHalfRange;
    const logSpan = adjLogMax - adjLogMin;
    const logPadBottom = logSpan * 0.06 || 0.01;
    const topPadFactor =
      priceZoom === 1 && autoFitMode === 'priceAndOverlays' ? 0.04 : 0.12;
    const logPadTop = logSpan * topPadFactor || 0.01;
    const domainLow = Math.exp(adjLogMin - logPadBottom);
    const domainHigh = Math.exp(adjLogMax + logPadTop);
    const yPrice = d3
      .scaleLog()
      .domain([Math.max(1, domainLow), domainHigh])
      .range([priceHeight, 0]);

    const [yDomLo, yDomHi] = yPrice.domain();
    const logLo = Math.log(yDomLo);
    const logHi = Math.log(yDomHi);
    const roundToSigFigs = (v: number, sig: number) => {
      if (v <= 0) return v;
      const mag = Math.pow(10, Math.floor(Math.log10(v)) - (sig - 1));
      return Math.round(v / mag) * mag;
    };
    const yTickValues = Array.from(
      new Set(
        d3.range(N_PRICE_TICKS).map((i) => {
          const raw = Math.exp(
            logLo + (i / (N_PRICE_TICKS - 1)) * (logHi - logLo),
          );
          return roundToSigFigs(raw, raw >= 100 ? 3 : raw >= 10 ? 2 : 2);
        }),
      ),
    )
      .sort((a, b) => a - b)
      .slice(0, -1);

    const priceFormat = d3.format(',.1f');
    yPriceAxisGRef.current!.call(
      d3
        .axisRight<d3.NumberValue>(yPrice)
        .tickValues(yTickValues)
        .tickSize(app.axis.tickSize)
        .tickFormat((d) => priceFormat(Number(d))),
    );
    yPriceAxisGRef.current!.select('.domain').remove();
    yPriceAxisGRef
      .current!.selectAll('line')
      .attr('stroke', AXIS_STROKE)
      .attr('stroke-opacity', app.axis.opacity);

    // Per-subpane linear scales. Each pane's scale SHAPE comes from the first
    // config's `def.domain(...)` (fixed/guide/zero/pad — reads settings, so e.g.
    // Results' display enum picks text vs. bars); the autofit lines come from
    // every config's `def.autofitKeys(...)` series across the visible window.
    // Range targets the pane band [bottom, top]. Independent of priceZoom.
    const subpaneScales = new Map<string, d3.ScaleLinear<number, number>>();
    const paneSpecs = new Map<string, DomainSpec | undefined>();
    const paneIndicators = new Map<string, ResolvedIndicator[]>();
    for (const r of resolvedIndicators) {
      const def = getIndicator(r.config.defKey);
      const pane = def?.pane;
      if (!pane || typeof pane !== 'object' || !('subpane' in pane)) continue;
      // First def per pane sets the scale shape.
      if (!paneSpecs.has(pane.subpane)) {
        paneSpecs.set(
          pane.subpane,
          def?.domain?.(r.series, r.config.settings) ?? undefined,
        );
      }
      const list = paneIndicators.get(pane.subpane) ?? [];
      list.push(r);
      paneIndicators.set(pane.subpane, list);
    }
    for (const pane of subpanes) {
      const spec = paneSpecs.get(pane.key);
      // Only each def's `autofitKeys` series drive the pane domain (replaces the
      // old implicit `width !== 0` set — e.g. the RS 0/1 `signal` is excluded).
      const lines: { values: Float64Array; isMarker: boolean }[] = [];
      for (const r of paneIndicators.get(pane.key) ?? []) {
        const def = getIndicator(r.config.defKey);
        const keys = def?.autofitKeys?.(r.config.settings) ?? [];
        for (const key of keys) {
          const arr = r.series[key];
          if (!arr) continue;
          lines.push({ values: arr, isMarker: false });
        }
      }
      const domain = computeSubpaneDomain({
        hint: spec,
        lines,
        visStart,
        visEnd,
        defaultPad: DEFAULT_SUBPANE_PAD,
      });
      if (domain) {
        let [lo, hi] = domain;
        // Fixed-pixel top headroom (e.g. Results bars' growth labels): extend the
        // domain top so the autofit max maps `topPadPx` pixels below the pane top
        // — a constant gap independent of pane height (range stays the full band,
        // so the clip + zero baseline are unchanged). `lo` is untouched, so a
        // zero baseline stays flush at the bottom.
        //
        // This pad is measured from `pane.top` and MUST cover the full label
        // height: the indicator draw clips to `[pane.top, pane.bottom]`, so any
        // part of the label pushed above `pane.top` is sliced off. With subpanes
        // now flush (divider sits on `pane.top`), this seats the label directly
        // under the divider with no wasted band above it.
        const padPx = spec?.topPadPx ?? 0;
        const H = pane.bottom - pane.top;
        if (padPx > 0 && H > padPx && hi > lo) {
          hi = lo + (hi - lo) * (H / (H - padPx));
        }
        subpaneScales.set(
          pane.key,
          d3.scaleLinear().domain([lo, hi]).range([pane.bottom, pane.top]),
        );
      }
    }

    // Per-pane right-axes + guide/zero lines. Rebuilt each rescale (cheap; not on
    // the pan path). Axes translate to the right gutter; guides span full width.
    ySubAxisGRef.current!.selectAll('*').remove();
    subGuidesGroupRef.current!.selectAll('*').remove();
    if (subpaneScales.size > 0) {
      ySubAxisGRef.current!.style('display', null);
      subGuidesGroupRef.current!.style('display', null);
      const subTickFormat = d3.format('.2~f');
      for (const pane of subpanes) {
        const scale = subpaneScales.get(pane.key);
        if (!scale) continue;
        const spec = paneSpecs.get(pane.key);
        // Text-mode panes (Results) suppress their axis — the scale carries no
        // value semantics. Guide/zero lines below stay gated independently.
        if (!spec?.hideAxis) {
          // Pane-specific tick format (e.g. Volume's K/M/B) overrides the default.
          const tickFmt = spec?.tickFormat ?? subTickFormat;
          const axisG = ySubAxisGRef.current!
            .append('g')
            .attr('transform', `translate(${width},0)`) as Sel<SVGGElement>;
          axisG.call(
            d3
              .axisRight<d3.NumberValue>(scale)
              .ticks(3)
              .tickSize(app.axis.tickSize)
              .tickFormat((d) => tickFmt(Number(d))),
          );
          axisG.select('.domain').remove();
          axisG
            .selectAll('line')
            .attr('stroke', AXIS_STROKE)
            .attr('stroke-opacity', app.axis.opacity);
        }
        const levels = [...(spec?.guideLines ?? [])];
        if (spec?.zeroLine) levels.push(0);
        for (const level of levels) {
          subGuidesGroupRef.current!
            .append('line')
            .attr('x1', 0)
            .attr('x2', width)
            .attr('y1', scale(level))
            .attr('y2', scale(level))
            .attr('stroke', 'var(--subpane-guide)')
            .attr('stroke-opacity', 0.4)
            .attr('stroke-dasharray', '3,3');
        }
      }
    } else {
      ySubAxisGRef.current!.style('display', 'none');
      subGuidesGroupRef.current!.style('display', 'none');
    }

    // Publish geometry to the scale api (in place) + notify subscribers.
    scaleApi.data = data;
    scaleApi.subpaneScales = subpaneScales;
    scaleApi.xScale = xScale;
    scaleApi.yPrice = yPrice;
    scaleApi.step = step;
    scaleApi.bandwidth = bandwidth;
    scaleApi.visibleBars = cappedVisibleBars;
    scaleApi.visibleBarsInt = visibleBarsInt;
    scaleApi.visibleStartIdx = visibleStartIdx;
    scaleApi.priceHeight = priceHeight;
    scaleApi.width = width;
    scaleApi.baseTranslateX = baseTranslateX;
    scaleApi.dataLength = data.length;
    scaleApi.indicators = resolvedIndicators;
    notifyScale('rescale');

    // Pattern overlay is a core feature; drive its scales directly.
    patternOverlayHandleRef.current?.updateScales({
      xScale,
      yPrice,
      step,
      bandwidth,
      baseTranslateX,
      width,
      priceHeight,
      dataLength: data.length,
    });

    // Cache the draw-state for the canvas series + paint it now (covers data /
    // layout / y-scale / indicator / chartType changes — the pan path reuses
    // this with only a fresh baseTranslateX).
    const resolveColor = (v: string) =>
      colorResolverRef.current?.resolve(v) ?? '#888888';
    drawStateRef.current = {
      cssWidth: containerWidth,
      cssHeight: totalHeight + MARGIN.top + MARGIN.bottom,
      width,
      fullHeight,
      priceHeight,
      bandwidth,
      renderStart,
      renderEnd,
      renderSlice,
      chartType,
      data,
      colors: {
        positive: resolveColor('var(--chart-positive)'),
        negative: resolveColor('var(--chart-negative)'),
      },
      background: {
        topColor: resolveColor(app.background.topColor),
        bottomColor: resolveColor(app.background.bottomColor),
        radius: app.background.radius,
      },
      candle: { wickWidth: app.candle.wickWidth },
      indicators: resolvedIndicators,
    };
    redrawSeries();

    // Keep the top-left readout on the latest candle across data/symbol changes
    // when the user isn't actively hovering. `scaleApi.data` was just updated
    // above, so this renders the new latest bar (the crosshair effect's own seed
    // only fires on mount).
    if (!crosshairLastPosRef.current) showLatestInfoRef.current?.();
  }, [
    layout,
    resolvedIndicators,
    priceZoom,
    chartType,
    data,
    cappedVisibleBars,
    autoFitMode,
    overlayPriceBounds,
    containerWidth,
    redrawSeries,
    scaleApi,
    notifyScale,
    colorEpoch,
    appBackgroundKey,
    appCandleKey,
    appAxisKey,
  ]);

  // Effect 3 — Pan transform only. Cheap; runs on panOffset/visibleBars deltas
  // even before Effect B finishes its heavier work.
  useEffect(() => {
    if (dataLength === 0 || !chartGroupRef.current) return;
    if (containerWidth === 0) return;
    const minOffset = -(cappedVisibleBars - 1);
    const maxOffset = Math.max(0, dataLength - cappedVisibleBars);
    const effectiveOffset = Math.max(minOffset, Math.min(panOffset, maxOffset));
    const width = containerWidth - MARGIN.left - MARGIN.right;
    const step = (width - RIGHT_BUFFER) / cappedVisibleBars;
    const baseTranslateX =
      (effectiveOffset + cappedVisibleBars - dataLength) * step;
    chartGroupRef.current.setAttribute(
      'transform',
      `translate(${baseTranslateX},0)`,
    );
    scaleApi.baseTranslateX = baseTranslateX;
    notifyScale('pan');
    patternOverlayHandleRef.current?.setTransform(baseTranslateX);
    redrawSeries();
  }, [
    panOffset,
    cappedVisibleBars,
    dataLength,
    containerWidth,
    scaleApi,
    notifyScale,
    redrawSeries,
  ]);

  // Chart-pattern overlay: read-only; flips between data and [] when the
  // patterns feature toggles, so the keyed join exits all groups on hide.
  const visibleKey = visiblePatterns
    ? [...visiblePatterns].sort().join(',')
    : '*';
  const effectivePatterns = useMemo<PatternMarker[]>(() => {
    if (patternsEnabled === false) return [];
    const all = patterns ?? [];
    if (!visiblePatterns) return all; // undefined ⇒ all visible
    const allow = new Set(visiblePatterns);
    return all.filter((p) => allow.has(p.pattern_name));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patterns, patternsEnabled, visibleKey]);

  useEffect(() => {
    const handle = patternOverlayHandleRef.current;
    if (!handle || scaleApi.data.length === 0) return;
    handle.update({
      detections: effectivePatterns,
      bars: scaleApi.data,
      xScale: scaleApi.xScale,
      yPrice: scaleApi.yPrice,
      step: scaleApi.step,
      bandwidth: scaleApi.bandwidth,
      priceHeight: scaleApi.priceHeight,
      width: scaleApi.width,
      baseTranslateX: scaleApi.baseTranslateX,
      dataLength: scaleApi.data.length,
      marginTop: MARGIN.top,
      patternStyle: app.patterns,
      resolveColor: (v) => colorResolverRef.current?.resolve(v) ?? '#888888',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectivePatterns, layout, scaleApi, appPatternsKey, colorEpoch]);

  // Re-apply crosshair styling (stroke / opacity / dash) from `app.crosshair`
  // whenever it changes. The crosshair lines are created once in Effect 1; SVG
  // accepts var()/currentColor/hex directly, so no resolver round-trip is needed.
  useEffect(() => {
    const v = crosshairVRef.current;
    const h = crosshairHRef.current;
    if (!v || !h) return;
    for (const sel of [v, h]) {
      sel
        .attr('stroke', app.crosshair.color)
        .attr('stroke-opacity', app.crosshair.opacity)
        .attr('stroke-dasharray', app.crosshair.dash);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appCrosshairKey]);

  // Drag on the price-axis hit zone to compress / expand the chart vertically.
  useEffect(() => {
    const Y_ZOOM_PIXELS_PER_E_FOLD = 200;
    const MIN_PRICE_ZOOM = 0.1;
    const MAX_PRICE_ZOOM = 20;
    let active = false;
    let startY = 0;
    let startZoom = 1;
    let raf: number | null = null;
    let lastDy = 0;

    const flush = () => {
      raf = null;
      const factor = Math.exp(-lastDy / Y_ZOOM_PIXELS_PER_E_FOLD);
      const next = Math.max(
        MIN_PRICE_ZOOM,
        Math.min(MAX_PRICE_ZOOM, startZoom * factor),
      );
      setPriceZoom(next);
    };
    const endDrag = () => {
      if (!active) return;
      active = false;
      if (wrapperRef.current) wrapperRef.current.style.cursor = '';
      if (raf != null) {
        cancelAnimationFrame(raf);
        raf = null;
      }
    };
    const onMove = (e: MouseEvent) => {
      if (!active) return;
      if (e.buttons === 0) {
        endDrag();
        return;
      }
      lastDy = e.clientY - startY;
      if (raf == null) raf = requestAnimationFrame(flush);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', endDrag);

    const bind = () => {
      const hit = yAxisHitRectRef.current;
      if (!hit) return;
      hit.on('mousedown', function (event: MouseEvent) {
        event.preventDefault();
        event.stopPropagation();
        active = true;
        startY = event.clientY;
        startZoom = priceZoomRef.current;
        if (wrapperRef.current) wrapperRef.current.style.cursor = 'ns-resize';
      });
      hit.on('dblclick', function (event: MouseEvent) {
        event.preventDefault();
        event.stopPropagation();
        setPriceZoom(1);
      });
      hit.on('mouseenter', function () {
        setYAxisHovered(true);
      });
      hit.on('mouseleave', function () {
        setYAxisHovered(false);
      });
    };
    // The hit rect is created in Effect 1 which runs after this effect on
    // mount, so retry on the next microtask to bind handlers once it exists.
    bind();
    const t = setTimeout(bind, 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', endDrag);
      const hit = yAxisHitRectRef.current;
      if (hit)
        hit
          .on('mousedown', null)
          .on('dblclick', null)
          .on('mouseenter', null)
          .on('mouseleave', null);
      if (raf != null) cancelAnimationFrame(raf);
    };
  }, []);

  // Effect 4 — Bind crosshair / drag-init handlers once. The handlers read
  // the latest scales/data via the scale api; rAF coalesces mousemove.
  useEffect(() => {
    const overlay = overlayRectRef.current;
    if (!overlay) return;

    const notifyHover = (idx: number | null) => {
      for (const cb of hoverIndexSubsRef.current) cb(idx);
    };

    // Populate the top-left OHLC/volume readout for one bar. Out-of-range
    // indices clamp to the latest bar so the readout is never blank while
    // there's data — this is the fallback used whenever the crosshair is
    // inactive (mouse off-chart, or to the right of the latest bar).
    const renderInfoAt = (idx: number) => {
      const stateData = scaleApi.data;
      if (stateData.length === 0) {
        infoTextRef.current?.style('visibility', 'hidden');
        return;
      }
      const i =
        idx < 0 || idx >= stateData.length ? stateData.length - 1 : idx;
      const d = stateData[i];
      const prevClose = i > 0 ? stateData[i - 1].close : d.open;
      const chg = d.close - prevClose;
      const chgPct = ((chg / prevClose) * 100).toFixed(2);
      const sign = chg >= 0 ? '+' : '';
      const chgColor =
        chg >= 0 ? 'var(--chart-positive)' : 'var(--chart-negative)';

      const spans = [
        { text: `${d.date}  `, fill: chgColor },
        { text: 'O: ', fill: MUTED_COLOR },
        { text: `${formatPrice(d.open)}  `, fill: chgColor },
        { text: 'H: ', fill: MUTED_COLOR },
        { text: `${formatPrice(d.high)}  `, fill: chgColor },
        { text: 'L: ', fill: MUTED_COLOR },
        { text: `${formatPrice(d.low)}  `, fill: chgColor },
        { text: 'C: ', fill: MUTED_COLOR },
        { text: `${formatPrice(d.close)}  `, fill: chgColor },
        { text: `${sign}${chgPct}%  `, fill: chgColor },
        { text: 'Vol: ', fill: MUTED_COLOR },
        { text: formatVolume(d.volume), fill: chgColor },
      ];
      const infoSpans = infoSpansRef.current;
      for (let k = 0; k < infoSpans.length; k++) {
        infoSpans[k].text(spans[k].text).attr('fill', spans[k].fill);
      }
      infoTextRef.current!.style('visibility', 'visible');
    };

    const showLatestInfo = () => renderInfoAt(scaleApi.data.length - 1);
    showLatestInfoRef.current = showLatestInfo;

    const hideOverlays = () => {
      crosshairVRef.current?.style('visibility', 'hidden');
      crosshairHRef.current?.style('visibility', 'hidden');
      // Keep the readout populated with the latest candle rather than blanking it.
      showLatestInfo();
      notifyHover(null);
      priceLabelGroupRef.current?.style('visibility', 'hidden');
      patternOverlayHandleRef.current?.setPointer(null, null);
    };

    const updateCrosshair = () => {
      crosshairRafRef.current = null;
      const pos = crosshairLastPosRef.current;
      if (!pos || scaleApi.data.length === 0) return;
      const { mx, my } = pos;
      patternOverlayHandleRef.current?.setPointer(mx, my);
      const {
        data: stateData,
        yPrice,
        step,
        bandwidth,
        visibleBarsInt,
        visibleStartIdx,
        priceHeight,
        width,
      } = scaleApi;

      crosshairHRef
        .current!.attr('y1', my)
        .attr('y2', my)
        .style('visibility', 'visible');

      if (my <= priceHeight && mx <= width) {
        const priceAtMouse = yPrice.invert(my);
        priceLabelGroupRef
          .current!.attr('transform', `translate(${width + 2},${my - 9})`)
          .style('visibility', 'visible');
        priceLabelTextRef.current!.text(fmtPriceRef.current(priceAtMouse));
      } else {
        priceLabelGroupRef.current!.style('visibility', 'hidden');
      }

      const slot = Math.floor(mx / step);
      if (slot < 0 || slot >= visibleBarsInt) {
        crosshairVRef
          .current!.attr('x1', mx)
          .attr('x2', mx)
          .style('visibility', 'visible');
        // Off the bar range (e.g. right of the latest bar): show the latest candle.
        showLatestInfo();
        notifyHover(null);
        return;
      }

      const cx = slot * step + bandwidth / 2;
      crosshairVRef
        .current!.attr('x1', cx)
        .attr('x2', cx)
        .style('visibility', 'visible');

      const realIdx = visibleStartIdx + slot;
      if (realIdx < 0 || realIdx >= stateData.length) {
        showLatestInfo();
        notifyHover(null);
        return;
      }

      renderInfoAt(realIdx);

      // Publish the hovered bar; the React indicator legend reads each config's
      // series at this index to show live values per row.
      notifyHover(realIdx);
    };

    overlay.on('mousedown', function (event: MouseEvent) {
      event.preventDefault();
      // Bare-chart click deselects any active overlay selection (plugins
      // subscribe to this signal).
      for (const cb of bgPointerDownSubsRef.current) cb();
      if (scaleApi.data.length === 0) return;
      dragStateRef.current = {
        active: true,
        startX: event.clientX,
        startOffset: panOffsetRef.current,
        baseTx: scaleApi.baseTranslateX,
        step: scaleApi.step,
        minOff: -(scaleApi.visibleBars - 1),
        maxOff: Math.max(0, scaleApi.data.length - scaleApi.visibleBars),
      };
      pendingDxRef.current = 0;
      if (crosshairRafRef.current != null) {
        cancelAnimationFrame(crosshairRafRef.current);
        crosshairRafRef.current = null;
      }
      crosshairLastPosRef.current = null;
      hideOverlays();
      if (wrapperRef.current) wrapperRef.current.style.cursor = 'grabbing';
    });

    // mousemove + mouseleave bind to the SVG root so they keep firing while
    // the cursor is over a trade overlay or one of its handles (those sit
    // above the bare-chart overlayRect in paint order and have
    // pointer-events: all). d3.pointer is anchored to rootG so coords stay
    // in the chart-inner coordinate space, identical to the previous
    // overlayRect-relative coords.
    const svgSel = d3.select(svgRef.current);
    svgSel
      .on('mousemove.crosshair', function (event: MouseEvent) {
        if (dragStateRef.current.active) return;
        const root = rootGRef.current;
        if (!root) return;
        const [mx, my] = d3.pointer(event, root.node());
        crosshairLastPosRef.current = { mx, my };
        if (crosshairRafRef.current == null) {
          crosshairRafRef.current = requestAnimationFrame(updateCrosshair);
        }
      })
      .on('mouseleave.crosshair', function (event: MouseEvent) {
        if (dragStateRef.current.active) return;
        if (crosshairRafRef.current != null) {
          cancelAnimationFrame(crosshairRafRef.current);
          crosshairRafRef.current = null;
        }
        // Moving onto the on-chart indicator legend or the floating stats panel
        // (HTML overlays above the SVG) fires this mouseleave. Don't blank the
        // readout/values — hide only the crosshair lines + price tag and leave
        // the OHLC readout + indicator values frozen at the last bar.
        const rt = event.relatedTarget as Element | null;
        if (
          rt &&
          typeof rt.closest === 'function' &&
          (rt.closest('[data-chart-legend]') || rt.closest('[data-chart-stats]'))
        ) {
          crosshairVRef.current?.style('visibility', 'hidden');
          crosshairHRef.current?.style('visibility', 'hidden');
          priceLabelGroupRef.current?.style('visibility', 'hidden');
          return;
        }
        crosshairLastPosRef.current = null;
        hideOverlays();
      });

    // Seed the readout on mount and after every data/scale change: unless the
    // user is actively hovering, show the latest candle so it's never blank.
    if (!crosshairLastPosRef.current) showLatestInfo();

    return () => {
      overlay.on('mousedown', null);
      svgSel.on('mousemove.crosshair', null).on('mouseleave.crosshair', null);
      if (crosshairRafRef.current != null) {
        cancelAnimationFrame(crosshairRafRef.current);
        crosshairRafRef.current = null;
      }
    };
  }, [scaleApi]);

  if (!data || data.length === 0) {
    return (
      <div
        className={bare ? styles.chartWrapperBare : styles.chartWrapper}
        ref={wrapperRef}
      >
        <div className={styles.empty}>
          {symbol ? (
            <>
              <BarChart3 size={32} className={styles.emptyIcon} />
              No data available
            </>
          ) : (
            <>
              <MousePointerClick size={32} className={styles.emptyIcon} />
              Select a stock to view chart
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <ChartScaleProvider value={scaleApi}>
      <ChartOverlayProvider value={overlayContextValue}>
        <div
          className={bare ? styles.chartWrapperBare : styles.chartWrapper}
          ref={wrapperRef}
          data-trade-overlay-anchor=""
        >
          <canvas
            ref={canvasRef}
            className={styles.seriesCanvas}
            aria-hidden="true"
          />
          <svg ref={svgRef} className={styles.chartSvg} />
          {layout != null && (
            <IndicatorLegend
              indicators={indicators}
              onIndicatorsChange={onIndicatorsChange}
              resolved={resolvedIndicators}
              subpanes={layout.subpanes}
              marginTop={MARGIN.top}
              marginLeft={MARGIN.left}
              barCount={dataLength}
              expanded={infoBarExpanded}
              onExpandedChange={onInfoBarExpandedChange}
              subscribeHoverIndex={subscribeHoverIndex}
              priceFormatter={fmtPrice}
              resolveColor={(v) => colorResolverRef.current?.resolve(v) ?? '#888888'}
            />
          )}
          {layout != null &&
            layout.subpanes.map((band, i) => {
              // Center the drag handle ON the static separator line for this
              // boundary (drawn flush at `band.top`) so the grab strip + its hover
              // highlight coincide with the one visible divider — not a second,
              // offset one. Fixed grab height straddles the line on both panes.
              const handleH = 8;
              const lineY = MARGIN.top + band.top;
              return (
                <div
                  key={band.key}
                  className={styles.subpaneDivider}
                  style={{ top: lineY - handleH / 2, height: handleH }}
                  onPointerDown={onDividerPointerDown(i)}
                  onPointerMove={onDividerPointerMove}
                  onPointerUp={onDividerPointerUp}
                >
                  <span className={styles.subpaneDividerLine} />
                </div>
              );
            })}
          {statsEnabled !== false && statsModel && dataLength > 0 && (
            <StatsPanel
              model={statsModel}
              size={statsSize}
              marginRight={MARGIN.right}
              position={statsPosition ?? null}
              onPositionChange={onStatsPositionChange}
            />
          )}
          {priceBottomPx > 0 && (
            <button
              type="button"
              className={`${styles.resetPanBtn} ${panOffset === 0 ? styles.resetPanBtnInactive : ''}`}
              title="Reset pan"
              onClick={() => onPanOffsetChange(0)}
              disabled={panOffset === 0}
              style={{ top: priceBottomPx - 26, right: MARGIN.right + 2 }}
            >
              <RotateCcw size={14} />
            </button>
          )}
          {priceBottomPx > 0 && showAutoFitBtn && (
            <button
              type="button"
              className={`${styles.autoFitBtn} ${priceZoom === 1 ? styles.autoFitBtnActive : ''}`}
              title={
                priceZoom !== 1
                  ? 'Auto-fit price scale (off — drag y-axis to enable)'
                  : autoFitMode === 'priceAndOverlays'
                    ? 'Auto-fit: price + overlays (click for price-only)'
                    : 'Auto-fit: price-only (click to include overlays)'
              }
              onClick={() => {
                if (priceZoom !== 1) {
                  setPriceZoom(1);
                  return;
                }
                onAutoFitModeChange(
                  autoFitMode === 'priceAndOverlays' ? 'price' : 'priceAndOverlays',
                );
              }}
              onMouseEnter={() => setAutoFitHovered(true)}
              onMouseLeave={() => setAutoFitHovered(false)}
              style={{
                top: priceBottomPx - 26,
                right: MARGIN.right - 26,
                color:
                  priceZoom === 1 && autoFitMode === 'priceAndOverlays'
                    ? '#22c55e'
                    : undefined,
              }}
            >
              A
            </button>
          )}
          {/* Appearance gear — TradingView-faithful bottom-right axis-intersection
              corner (price gutter × date row). Only when the host can persist. */}
          {onAppearanceChange && (
            <>
              <button
                type="button"
                className={styles.settingsGearBtn}
                title="Chart settings"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => setSettingsOpen((o) => !o)}
                style={{ right: 4, bottom: 4 }}
              >
                <Settings size={14} />
              </button>
              {settingsOpen && (
                <SettingsDialog
                  appearance={appearance ?? {}}
                  onAppearanceChange={onAppearanceChange}
                  resolveColor={(v) =>
                    colorResolverRef.current?.resolve(v) ?? '#888888'
                  }
                  onClose={() => setSettingsOpen(false)}
                  style={{ right: MARGIN.right + 4, bottom: MARGIN.bottom + 4 }}
                />
              )}
            </>
          )}
          {children}
        </div>
      </ChartOverlayProvider>
    </ChartScaleProvider>
  );
};

export default React.memo(Chart);
