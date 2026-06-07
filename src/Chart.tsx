import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { BarChart3, MousePointerClick, RotateCcw } from 'lucide-react';
import * as d3 from 'd3';
import type { AutoFitMode, Candle, ChartType } from './types';
import type {
  IndicatorConfig,
  IndicatorInput,
  IndicatorSeries,
  ResolvedIndicator,
} from './indicators/types';
import { getIndicator, SUBPANE_ORDER } from './indicators/registry';
import type { SubpaneScaleHint } from './indicators/types';
import {
  computeSubpaneBands,
  computeSubpaneDomain,
} from './indicators/subpaneLayout';
import {
  computeVolumeStats,
  formatPrice,
  formatVolume,
  formatVolumeTick,
  type VolumeLabel,
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

const VOLUME_HEIGHT_RATIO = 0.15;
// Subpane stacking (D1 policy): each oscillator pane gets a fixed share of the
// chart height with a small gap above it; the price pane shrinks toward a floor
// as panes stack, after which the remaining zone splits equally among panes.
const SUBPANE_HEIGHT_RATIO = 0.13;
const SUBPANE_GAP_RATIO = 0.02;
const PRICE_FLOOR_RATIO = 0.45;
// Minimum padding applied to an autofit subpane domain when the def's scaleHint
// does not override it.
const DEFAULT_SUBPANE_PAD = 0.08;
// No empty gap between the price area and the volume divider — the price
// chart's drawing region extends right down to the divider line. Visual
// breathing room between the lowest visible price and the divider comes
// from the y-domain padding (`logPad`) below.
const PRICE_VOLUME_GAP_RATIO = 0;
const RIGHT_BUFFER = 18;
const INFO_SPAN_COUNT = 12;
const AXIS_STROKE = 'currentColor';
const AXIS_OPACITY = 0.12;
const TICK_SIZE = 4;
const N_PRICE_TICKS = 10;
const MUTED_COLOR = 'var(--chart-tooltip-label)';
// Pre-built tspan slots per crosshair tooltip group (≥ max cells: 4 EMAs / 4 high
// tiers / 3 BBANDS bands / 3 MACD values).
const TOOLTIP_CELL_SLOTS = 4;
// Pooled tooltip rows — one per active `tooltipGroup`. Generous upper bound that
// covers every overlay + subpane indicator enabled at once.
const MAX_TOOLTIP_ROWS = 20;

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
  visibleBars: number;
  onVisibleBarsChange?: (n: number | ((prev: number) => number)) => void;
  panOffset: number;
  onPanOffsetChange: (n: number | ((prev: number) => number)) => void;
  chartType: ChartType;
  // Registry-driven indicator catalog (one entry per drawn config).
  indicators: IndicatorConfig[];
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
  visibleBars,
  onVisibleBarsChange,
  panOffset,
  onPanOffsetChange,
  chartType,
  indicators,
  autoFitMode,
  onAutoFitModeChange,
  infoBarExpanded,
  onInfoBarExpandedChange,
  symbol,
  bare,
  priceFormatter,
  patterns,
  patternsEnabled,
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

  // Geometry that depends on data + viewport but NOT on priceZoom. Hoisted
  // out of the draw effect so the y-zoom path skips re-running x-scale,
  // candle data joins, volume bars, x-axis, separators, etc.
  const layout = useMemo(() => {
    if (!data || data.length === 0 || containerWidth === 0) return null;
    const totalHeight = Math.max(
      300,
      (containerHeight || 466) - MARGIN.top - MARGIN.bottom,
    );
    const minOffset = -(visibleBars - 1);
    const maxOffset = Math.max(0, data.length - visibleBars);
    const effectiveOffset = Math.max(minOffset, Math.min(panOffset, maxOffset));
    const visStart = Math.max(
      0,
      Math.floor(data.length - visibleBars - effectiveOffset),
    );
    const visEnd = Math.min(
      data.length,
      Math.ceil(data.length - effectiveOffset),
    );
    const visibleSlice = data.slice(visStart, visEnd);
    if (visibleSlice.length === 0) return null;
    const bufferBars = Math.ceil(visibleBars);
    const renderStart = Math.max(0, visStart - bufferBars);
    const renderEnd = Math.min(data.length, visEnd + bufferBars);
    const renderSlice = data.slice(renderStart, renderEnd);
    const hasVolume = (d3.max(visibleSlice, (d) => d.volume) ?? 0) > 0;
    const volumeHeight = hasVolume ? totalHeight * VOLUME_HEIGHT_RATIO : 0;
    const gap = hasVolume ? totalHeight * PRICE_VOLUME_GAP_RATIO : 0;
    // Subpane zone sizing (D1) — see computeSubpaneBands.
    const { priceHeight, subpanes, fullHeight, subGap } = computeSubpaneBands({
      totalHeight,
      volumeHeight,
      gap,
      subpaneKeys: activeSubpanes,
      heightRatio: SUBPANE_HEIGHT_RATIO,
      gapRatio: SUBPANE_GAP_RATIO,
      floorRatio: PRICE_FLOOR_RATIO,
    });
    const width = containerWidth - MARGIN.left - MARGIN.right;
    const step = (width - RIGHT_BUFFER) / visibleBars;
    const baseTranslateX = (effectiveOffset + visibleBars - data.length) * step;
    const xScale = d3
      .scaleBand<number>()
      .domain(xDomain)
      .range([0, step * Math.max(1, data.length - 0.3)])
      .paddingInner(0.3)
      .paddingOuter(0);
    const bandwidth = xScale.bandwidth();
    const visibleBarsInt = Math.floor(visibleBars);
    const visibleStartIdx = Math.round(
      data.length - visibleBars - effectiveOffset,
    );
    return {
      totalHeight,
      visStart,
      visEnd,
      visibleSlice,
      renderStart,
      renderEnd,
      renderSlice,
      hasVolume,
      volumeHeight,
      gap,
      priceHeight,
      fullHeight,
      subpanes,
      subGap,
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
    visibleBars,
    panOffset,
    containerWidth,
    containerHeight,
    xDomain,
    activeSubpanes,
  ]);

  // Volume SMA + HVE/HVY milestone labels. Keyed on `data` only — independent
  // of pan/zoom, so it recomputes only when the dataset changes.
  const volStats = useMemo(() => computeVolumeStats(data ?? []), [data]);

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
    const seedLen = seed.length;
    return enabled.map((config) => {
      const def = getIndicator(config.defKey);
      if (!def) return { config, series: {} as IndicatorSeries };
      const full = def.compute(input, config.params);
      const series: IndicatorSeries = {};
      for (const key of Object.keys(full)) {
        series[key] = seedLen ? full[key].subarray(seedLen) : full[key];
      }
      return { config, series };
    });
  }, [data, warmupSeed, indicators, benchmarkClose]);

  // Everything the canvas redraw needs that is NOT a live scale field. Rebuilt
  // in Effect B (after the y-scale exists); the pan path reuses it with only a
  // fresh baseTranslateX.
  const drawStateRef = useRef<{
    cssWidth: number;
    cssHeight: number;
    width: number;
    fullHeight: number;
    priceHeight: number;
    gap: number;
    volumeHeight: number;
    hasVolume: boolean;
    volMax: number;
    volSma: (number | undefined)[];
    bandwidth: number;
    renderStart: number;
    renderEnd: number;
    renderSlice: Candle[];
    chartType: ChartType;
    data: Candle[];
    colors: { positive: string; negative: string };
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
      gap: st.gap,
      volumeHeight: st.volumeHeight,
      hasVolume: st.hasVolume,
      volMax: st.volMax,
      volSma: st.volSma,
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
      indicators: st.indicators.map((r) => ({
        config: r.config,
        series: r.series,
      })),
      resolveColor: (v) => colorResolverRef.current?.resolve(v) ?? '#888888',
    });
  }, [scaleApi]);

  const priceBottomPx = useMemo(
    () => (layout ? MARGIN.top + layout.priceHeight + layout.gap / 2 : 0),
    [layout],
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
  const pendingFrameRef = useRef<number | null>(null);
  const pendingDxRef = useRef<number>(0);
  const chartGroupRef = useRef<SVGGElement | null>(null);

  // Long-lived d3 selections built once in Effect 1.
  const rootGRef = useRef<Sel<SVGGElement> | null>(null);
  const bgRectRef = useRef<Sel<SVGRectElement> | null>(null);
  const clipRectRef = useRef<Sel<SVGRectElement> | null>(null);
  const yPriceAxisGRef = useRef<Sel<SVGGElement> | null>(null);
  const yVolAxisGRef = useRef<Sel<SVGGElement> | null>(null);
  const ySubAxisGRef = useRef<Sel<SVGGElement> | null>(null);
  const subGuidesGroupRef = useRef<Sel<SVGGElement> | null>(null);
  const sepGroupRef = useRef<Sel<SVGGElement> | null>(null);
  const rightBorderRef = useRef<Sel<SVGLineElement> | null>(null);
  const chartGroupSelRef = useRef<Sel<SVGGElement> | null>(null);
  const xAxisGRef = useRef<Sel<SVGGElement> | null>(null);
  // Volume milestone text labels stay SVG (low node count). The high-count
  // series (volume bars, candles, indicator lines) paint on the canvas layer.
  const volLabelsGroupRef = useRef<Sel<SVGGElement> | null>(null);
  const crosshairVRef = useRef<Sel<SVGLineElement> | null>(null);
  const crosshairHRef = useRef<Sel<SVGLineElement> | null>(null);
  const infoTextRef = useRef<Sel<SVGTextElement> | null>(null);
  const infoSpansRef = useRef<Sel<SVGTSpanElement>[]>([]);
  // Pooled crosshair tooltip rows. One pooled row is assigned per active
  // `tooltipGroup` at draw time (titles + cells filled dynamically), so the same
  // markup serves any set of enabled indicators without per-frame DOM creation.
  type TooltipRow = {
    text: Sel<SVGTextElement>;
    title: Sel<SVGTSpanElement>;
    pairs: { label: Sel<SVGTSpanElement>; value: Sel<SVGTSpanElement> }[];
  };
  const tooltipRowsRef = useRef<TooltipRow[]>([]);
  type ChevronGroup = {
    group: Sel<SVGGElement>;
    icon: Sel<SVGTextElement>;
  };
  const chevronGroupRef = useRef<ChevronGroup | null>(null);
  const infoBarExpandedRef = useRef(infoBarExpanded);
  useEffect(() => {
    infoBarExpandedRef.current = infoBarExpanded;
  }, [infoBarExpanded]);
  const onInfoBarExpandedChangeRef = useRef(onInfoBarExpandedChange);
  useEffect(() => {
    onInfoBarExpandedChangeRef.current = onInfoBarExpandedChange;
  }, [onInfoBarExpandedChange]);
  const priceLabelGroupRef = useRef<Sel<SVGGElement> | null>(null);
  const priceLabelTextRef = useRef<Sel<SVGTextElement> | null>(null);
  const overlayRectRef = useRef<Sel<SVGRectElement> | null>(null);
  const yAxisHitRectRef = useRef<Sel<SVGRectElement> | null>(null);
  const priceClipRectRef = useRef<Sel<SVGRectElement> | null>(null);
  const bgGradientUserRef = useRef<Sel<SVGLinearGradientElement> | null>(null);

  // Crosshair rAF coalescing.
  const crosshairRafRef = useRef<number | null>(null);
  const crosshairLastPosRef = useRef<{ mx: number; my: number } | null>(null);
  // Effect 4 publishes its latest `updateCrosshair`; the chevron click handler
  // (mounted in Effect 1) reads it to refresh the tooltip immediately on
  // toggle, instead of waiting for the next mousemove.
  const updateCrosshairRef = useRef<(() => void) | null>(null);

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

  // Color resolver — a probe <span> under the themed wrapper that resolves the
  // canvas's CSS-var (incl. color-mix()) colors to rgb. Re-created on mount.
  useEffect(() => {
    if (!wrapperRef.current) return;
    const resolver = createColorResolver(wrapperRef.current);
    colorResolverRef.current = resolver;
    return () => {
      resolver.destroy();
      colorResolverRef.current = null;
    };
  }, []);

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
      e.preventDefault();
      const factor = e.deltaY > 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR;
      pendingFactor *= factor;
      if (pendingFrame == null) {
        pendingFrame = requestAnimationFrame(() => {
          pendingFrame = null;
          const f = pendingFactor;
          pendingFactor = 1;
          onVisibleBarsChange!((prev) => prev * f);
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

    yVolAxisGRef.current = g
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

    volLabelsGroupRef.current = chartGroup.append('g') as Sel<SVGGElement>;

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

    // Pool of reusable tooltip rows (title tspan + N label/value cell pairs).
    tooltipRowsRef.current = [];
    for (let r = 0; r < MAX_TOOLTIP_ROWS; r++) {
      const rowText = g
        .append('text')
        .attr('x', 8)
        .style('font-size', 'var(--text-sm)')
        .style('font-family', CHART_FONT)
        .style('font-weight', '500')
        .style('pointer-events', 'none')
        .attr('fill', 'currentColor')
        .style('display', 'none') as Sel<SVGTextElement>;
      const title = rowText.append('tspan') as Sel<SVGTSpanElement>;
      const pairs: {
        label: Sel<SVGTSpanElement>;
        value: Sel<SVGTSpanElement>;
      }[] = [];
      for (let i = 0; i < TOOLTIP_CELL_SLOTS; i++) {
        pairs.push({
          label: rowText.append('tspan') as Sel<SVGTSpanElement>,
          value: rowText.append('tspan') as Sel<SVGTSpanElement>,
        });
      }
      tooltipRowsRef.current.push({ text: rowText, title, pairs });
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

    // Chevron must paint AFTER overlayRectRef so its click handler isn't
    // intercepted by the transparent overlay rect (which captures mousedown
    // to start pan-drag).
    const chevGroup = g
      .append('g')
      .attr('class', 'infobar-chevron')
      .style('cursor', 'pointer')
      .style('pointer-events', 'all')
      .style('display', 'none') as Sel<SVGGElement>;
    const chevIcon = chevGroup
      .append('text')
      .attr('x', 0)
      .attr('y', 0)
      .style('font-size', 'var(--text-sm)')
      .style('font-family', CHART_FONT)
      .style('font-weight', '500')
      .attr('fill', MUTED_COLOR) as Sel<SVGTextElement>;
    chevGroup.on('mousedown', (event: MouseEvent) => {
      event.stopPropagation();
    });
    chevGroup.on('click', (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      onInfoBarExpandedChangeRef.current((v) => !v);
      const fn = updateCrosshairRef.current;
      if (fn && crosshairLastPosRef.current != null) {
        if (crosshairRafRef.current != null) {
          cancelAnimationFrame(crosshairRafRef.current);
        }
        crosshairRafRef.current = requestAnimationFrame(fn);
      }
    });
    chevronGroupRef.current = { group: chevGroup, icon: chevIcon };

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
      yVolAxisGRef.current = null;
      ySubAxisGRef.current = null;
      subGuidesGroupRef.current = null;
      sepGroupRef.current = null;
      rightBorderRef.current = null;
      chartGroupSelRef.current = null;
      chartGroupRef.current = null;
      xAxisGRef.current = null;
      volLabelsGroupRef.current = null;
      crosshairVRef.current = null;
      crosshairHRef.current = null;
      infoTextRef.current = null;
      infoSpansRef.current = [];
      tooltipRowsRef.current = [];
      chevronGroupRef.current = null;
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
      visibleSlice,
      renderStart,
      renderEnd,
      hasVolume,
      volumeHeight,
      gap,
      priceHeight,
      fullHeight,
      subpanes,
      subGap,
      width,
      baseTranslateX,
      xScale,
      bandwidth,
      totalHeight,
    } = layout;

    const svgHeight = totalHeight + MARGIN.top + MARGIN.bottom;

    d3.select(svgRef.current)
      .attr('width', containerWidth)
      .attr('height', svgHeight);

    bgRectRef
      .current!.attr('width', containerWidth)
      .attr('height', fullHeight + MARGIN.top + MARGIN.bottom);

    // Match the userSpace twin gradient to the bg rect's actual y extent.
    const bgH = fullHeight + MARGIN.top + MARGIN.bottom;
    bgGradientUserRef
      .current!.attr('x1', 0)
      .attr('y1', -MARGIN.top)
      .attr('x2', 0)
      .attr('y2', -MARGIN.top + bgH);

    clipRectRef
      .current!.attr('width', width - RIGHT_BUFFER)
      .attr('height', fullHeight + MARGIN.top + MARGIN.bottom);

    priceClipRectRef
      .current!.attr('width', width - RIGHT_BUFFER)
      .attr('height', MARGIN.top + priceHeight);

    const volMax = d3.max(visibleSlice, (d) => d.volume) || 1;
    const yVol = d3.scaleLinear().domain([0, volMax]).range([volumeHeight, 0]);

    const tickValues: number[] = [];
    for (let i = Math.max(1, renderStart); i < renderEnd; i++) {
      if (data[i].date.slice(0, 7) !== data[i - 1].date.slice(0, 7)) {
        tickValues.push(i);
      }
    }

    yPriceAxisGRef.current!.attr('transform', `translate(${width},0)`);

    if (hasVolume) {
      yVolAxisGRef
        .current!.style('display', null)
        .attr('transform', `translate(${width},${priceHeight + gap})`)
        .call(
          d3
            .axisRight<d3.NumberValue>(yVol)
            .ticks(3)
            .tickSize(TICK_SIZE)
            .tickFormat((d) => formatVolumeTick(Number(d))),
        );
      yVolAxisGRef.current!.select('.domain').remove();
      yVolAxisGRef
        .current!.selectAll('line')
        .attr('stroke', AXIS_STROKE)
        .attr('stroke-opacity', AXIS_OPACITY);
    } else {
      yVolAxisGRef.current!.selectAll('*').remove();
      yVolAxisGRef.current!.style('display', 'none');
    }

    // Separators, built additively so each present band gets its divider:
    // price/volume split, a divider above EACH subpane band, and the bottom border.
    const sepValues: number[] = [];
    if (hasVolume) sepValues.push(priceHeight + gap / 2);
    for (const pane of subpanes) sepValues.push(pane.top - subGap / 2);
    if (hasVolume || subpanes.length > 0) sepValues.push(fullHeight);
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
          .tickSize(TICK_SIZE)
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
      .attr('stroke-opacity', AXIS_OPACITY);

    const LABEL_GAP = 2; // px above bar top
    const LABEL_MIN_Y = 9; // keep tallest bar's label inside the volume pane
    const visibleLabels = volStats.labels.filter(
      (m) => m.index >= renderStart && m.index < renderEnd,
    );
    volLabelsGroupRef
      .current!.attr('transform', `translate(0,${priceHeight + gap})`)
      .selectAll<SVGTextElement, VolumeLabel>('text')
      .data(hasVolume ? visibleLabels : [], (m) => m.text)
      .join('text')
      .attr('x', (m) => xScale(m.index)! + bandwidth / 2)
      .attr('y', (m) =>
        Math.max(yVol(data[m.index].volume) - LABEL_GAP, LABEL_MIN_Y),
      )
      .attr('text-anchor', 'middle')
      .style('font-size', 'var(--text-2hxs)')
      .style('font-family', CHART_FONT)
      .style('font-weight', '600')
      .attr('fill', 'var(--chart-axis-label)')
      .text((m) => m.text);

    crosshairVRef.current!.attr('y2', fullHeight);
    crosshairHRef.current!.attr('x2', width);

    overlayRectRef.current!.attr('width', width).attr('height', fullHeight);

    yAxisHitRectRef
      .current!.attr('x', width)
      .attr('y', 0)
      .attr('width', MARGIN.right)
      .attr('height', priceHeight);
  }, [layout, containerWidth, data, volStats, activeSubpanes]);

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
      gap,
      volumeHeight,
      hasVolume,
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
        if (typeof getIndicator(config.defKey)?.pane === 'object') continue;
        for (const key of Object.keys(series)) {
          const arr = series[key];
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
        .tickSize(TICK_SIZE)
        .tickFormat((d) => priceFormat(Number(d))),
    );
    yPriceAxisGRef.current!.select('.domain').remove();
    yPriceAxisGRef
      .current!.selectAll('line')
      .attr('stroke', AXIS_STROKE)
      .attr('stroke-opacity', AXIS_OPACITY);

    // Per-subpane linear scales. Each pane's domain is either pinned by its def's
    // `scaleHint.fixedDomain`, or autofit over the pane's drawn-line series
    // (excluding width===0 marker lines — e.g. the RS 0/1 `signal`) across the
    // visible window. Range targets the pane band [bottom, top]. Independent of
    // priceZoom.
    const subpaneScales = new Map<string, d3.ScaleLinear<number, number>>();
    const paneHints = new Map<string, SubpaneScaleHint | undefined>();
    const paneIndicators = new Map<string, ResolvedIndicator[]>();
    for (const r of resolvedIndicators) {
      const pane = getIndicator(r.config.defKey)?.pane;
      if (!pane || typeof pane !== 'object' || !('subpane' in pane)) continue;
      if (!paneHints.has(pane.subpane)) paneHints.set(pane.subpane, pane.scaleHint);
      const list = paneIndicators.get(pane.subpane) ?? [];
      list.push(r);
      paneIndicators.set(pane.subpane, list);
    }
    for (const pane of subpanes) {
      const hint = paneHints.get(pane.key);
      // Marker lines (width 0, e.g. the RS 0/1 signal) are excluded from autofit.
      const lines: { values: Float64Array; isMarker: boolean }[] = [];
      for (const r of paneIndicators.get(pane.key) ?? []) {
        for (const line of r.config.style.lines) {
          const arr = r.series[line.seriesKey];
          if (!arr) continue;
          lines.push({ values: arr, isMarker: line.width === 0 });
        }
      }
      const domain = computeSubpaneDomain({
        hint,
        lines,
        visStart,
        visEnd,
        defaultPad: DEFAULT_SUBPANE_PAD,
      });
      if (domain) {
        subpaneScales.set(
          pane.key,
          d3.scaleLinear().domain(domain).range([pane.bottom, pane.top]),
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
        const hint = paneHints.get(pane.key);
        const axisG = ySubAxisGRef.current!
          .append('g')
          .attr('transform', `translate(${width},0)`) as Sel<SVGGElement>;
        axisG.call(
          d3
            .axisRight<d3.NumberValue>(scale)
            .ticks(3)
            .tickSize(TICK_SIZE)
            .tickFormat((d) => subTickFormat(Number(d))),
        );
        axisG.select('.domain').remove();
        axisG
          .selectAll('line')
          .attr('stroke', AXIS_STROKE)
          .attr('stroke-opacity', AXIS_OPACITY);
        const levels = [...(hint?.guideLines ?? [])];
        if (hint?.zeroLine) levels.push(0);
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
    scaleApi.visibleBars = visibleBars;
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
    const volMax = d3.max(visibleSlice, (d) => d.volume) || 1;
    drawStateRef.current = {
      cssWidth: containerWidth,
      cssHeight: totalHeight + MARGIN.top + MARGIN.bottom,
      width,
      fullHeight,
      priceHeight,
      gap,
      volumeHeight,
      hasVolume,
      volMax,
      volSma: volStats.sma,
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
      indicators: resolvedIndicators,
    };
    redrawSeries();
  }, [
    layout,
    resolvedIndicators,
    priceZoom,
    chartType,
    data,
    visibleBars,
    autoFitMode,
    overlayPriceBounds,
    containerWidth,
    volStats,
    redrawSeries,
    scaleApi,
    notifyScale,
  ]);

  // Effect 3 — Pan transform only. Cheap; runs on panOffset/visibleBars deltas
  // even before Effect B finishes its heavier work.
  useEffect(() => {
    if (dataLength === 0 || !chartGroupRef.current) return;
    if (containerWidth === 0) return;
    const minOffset = -(visibleBars - 1);
    const maxOffset = Math.max(0, dataLength - visibleBars);
    const effectiveOffset = Math.max(minOffset, Math.min(panOffset, maxOffset));
    const width = containerWidth - MARGIN.left - MARGIN.right;
    const step = (width - RIGHT_BUFFER) / visibleBars;
    const baseTranslateX = (effectiveOffset + visibleBars - dataLength) * step;
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
    visibleBars,
    dataLength,
    containerWidth,
    scaleApi,
    notifyScale,
    redrawSeries,
  ]);

  // Chart-pattern overlay: read-only; flips between data and [] when the
  // patterns feature toggles, so the keyed join exits all groups on hide.
  const effectivePatterns = useMemo<PatternMarker[]>(
    () => (patternsEnabled === false ? [] : patterns ?? []),
    [patterns, patternsEnabled],
  );

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
    });
  }, [effectivePatterns, layout, scaleApi]);

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

    const hideTooltipRows = () => {
      for (const row of tooltipRowsRef.current) row.text.style('display', 'none');
      chevronGroupRef.current?.group.style('display', 'none');
    };

    const hideOverlays = () => {
      crosshairVRef.current?.style('visibility', 'hidden');
      crosshairHRef.current?.style('visibility', 'hidden');
      infoTextRef.current?.style('visibility', 'hidden');
      hideTooltipRows();
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
        indicators: stateIndicators,
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
        infoTextRef.current!.style('visibility', 'hidden');
        hideTooltipRows();
        return;
      }

      const cx = slot * step + bandwidth / 2;
      crosshairVRef
        .current!.attr('x1', cx)
        .attr('x2', cx)
        .style('visibility', 'visible');

      const realIdx = visibleStartIdx + slot;
      if (realIdx < 0 || realIdx >= stateData.length) {
        infoTextRef.current!.style('visibility', 'hidden');
        hideTooltipRows();
        return;
      }

      const d = stateData[realIdx];
      const prevClose = realIdx > 0 ? stateData[realIdx - 1].close : d.open;
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
      for (let i = 0; i < infoSpans.length; i++) {
        infoSpans[i].text(spans[i].text).attr('fill', spans[i].fill);
      }
      infoTextRef.current!.style('visibility', 'visible');

      const expanded = infoBarExpandedRef.current;
      const ROW_PITCH = 18;
      let rowIdx = 1;

      // Bucket tooltip cells from the resolved indicator configs by their
      // `tooltipGroup`, preserving first-appearance order. Each active group maps
      // to one pooled row. Marker-only lines without a series array (e.g. the
      // MACD HistDown color carrier) contribute no cell.
      type Cell = {
        label: string;
        value: number;
        fill: string;
        isPrice: boolean;
        isSignal: boolean;
      };
      type Group = { title?: string; cells: Cell[] };
      const groups: Group[] = [];
      const groupByKey = new Map<string, Group>();
      for (const r of stateIndicators) {
        const key = r.config.style.tooltipGroup;
        let group = groupByKey.get(key);
        if (!group) {
          group = { cells: [] };
          groupByKey.set(key, group);
          groups.push(group);
        }
        if (r.config.style.tooltipTitle) group.title = r.config.style.tooltipTitle;
        const isPrice = getIndicator(r.config.defKey)?.pane === 'price';
        for (const line of r.config.style.lines) {
          const arr = r.series[line.seriesKey];
          if (!arr) continue; // marker-only carrier line (no data)
          group.cells.push({
            label: line.label,
            value: arr[realIdx],
            fill: line.labelColorVar,
            isPrice,
            // A 0/1 signal flag is always finite — it must not gate row activity.
            isSignal: line.label === 'Signal',
          });
        }
      }

      const rows = tooltipRowsRef.current;
      const fmtSub = d3.format(',.2f');
      let activeCount = 0;
      let usedRow = 0;
      for (const group of groups) {
        const active = group.cells.some(
          (c) => !c.isSignal && !Number.isNaN(c.value),
        );
        if (!active) continue;
        activeCount++;
        if (!expanded) continue;
        const row = rows[usedRow];
        if (!row) break; // pool exhausted (more groups than MAX_TOOLTIP_ROWS)
        usedRow++;
        row.title
          .text(group.title ? `${group.title}  ` : '')
          .attr('fill', MUTED_COLOR);
        for (let i = 0; i < row.pairs.length; i++) {
          const pair = row.pairs[i];
          const cell = group.cells[i];
          if (cell && (cell.isSignal || !Number.isNaN(cell.value))) {
            const valueText = cell.isSignal
              ? cell.value === 1
                ? 'Yes'
                : 'No'
              : cell.isPrice
                ? fmtPriceRef.current(cell.value)
                : fmtSub(cell.value);
            pair.label
              .text(`${cell.label}: `)
              .attr('fill', MUTED_COLOR)
              .style('display', null);
            pair.value
              .text(`${valueText}  `)
              .attr('fill', cell.fill)
              .style('display', null);
          } else {
            pair.label.style('display', 'none').text('');
            pair.value.style('display', 'none').text('');
          }
        }
        row.text.attr('y', 14 + rowIdx * ROW_PITCH).style('display', null);
        rowIdx++;
      }
      // Hide any pooled rows not used this frame.
      for (let i = usedRow; i < rows.length; i++)
        rows[i].text.style('display', 'none');

      const chev = chevronGroupRef.current;
      if (chev) {
        if (activeCount === 0) {
          chev.group.style('display', 'none');
        } else {
          const chevY = 14 + rowIdx * ROW_PITCH;
          chev.group
            .attr('transform', `translate(8,${chevY})`)
            .style('display', null);
          chev.icon.text(expanded ? '▴' : '▾');
        }
      }
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
    updateCrosshairRef.current = updateCrosshair;
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
      .on('mouseleave.crosshair', function () {
        if (dragStateRef.current.active) return;
        if (crosshairRafRef.current != null) {
          cancelAnimationFrame(crosshairRafRef.current);
          crosshairRafRef.current = null;
        }
        crosshairLastPosRef.current = null;
        hideOverlays();
      });

    return () => {
      overlay.on('mousedown', null);
      svgSel.on('mousemove.crosshair', null).on('mouseleave.crosshair', null);
      if (crosshairRafRef.current != null) {
        cancelAnimationFrame(crosshairRafRef.current);
        crosshairRafRef.current = null;
      }
      updateCrosshairRef.current = null;
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
          {children}
        </div>
      </ChartOverlayProvider>
    </ChartScaleProvider>
  );
};

export default React.memo(Chart);
