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
  ChartContextMenuInfo,
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
import {
  withSettingOverride,
  withSettingsReset,
} from './indicators/applySettings';
import {
  CANDLE_SOURCE,
  pickHitRegion,
  type HitRegion,
} from './indicators/hitRegions';
import type { AppearanceOverrides, CandleAppearance } from './appearance/types';
import { effectiveAppearance } from './appearance/registry';
import IndicatorLegend from './controls/IndicatorLegend';
import IndicatorSettingsPopover from './controls/IndicatorSettingsPopover';
import CandleSettingsPopup from './controls/CandleSettingsPopup';
import SettingsDialog from './controls/SettingsDialog';
import AutoFitMenu from './controls/AutoFitMenu';
import DrawToolbar from './controls/DrawToolbar';
import StatsPanel from './stats/StatsPanel';
import { computeStats } from './stats/computeStats';
import EarningsPanel from './earnings/EarningsPanel';
import { computeEarnings } from './earnings/computeEarnings';
import type {
  StatsMarket,
  StatsPosition,
  LegacyStatsPosition,
  StatsSize,
  StatsTableData,
} from './stats/types';
import { normalizeStatsPosition } from './stats/position';
import type { DomainSpec } from './indicators/types';
import {
  applySubpaneDrag,
  computeSubpaneBands,
  computeSubpaneDomain,
  type SubpaneBand,
} from './indicators/subpaneLayout';
import {
  barsPerYear as measureBarsPerYear,
  clampPanDeltaPx,
  clampPanOffset,
  formatPrice,
  formatVolume,
  maxVisibleBarsForWidth,
  panOffsetLimits,
  rangeMarks as deriveRangeMarks,
  MIN_VISIBLE_BARS,
  type RangeMark,
} from './utils/chartCalculations';
import { toColumns } from './utils/toColumns';
import { dateForBarIndex } from './utils/dateBarIndex';
import { classifyChartRegion } from './gestures/chartRegion';
import { dragThresholdFor } from './gestures/thresholds';
import {
  reducePointers,
  pointerDistance,
  type PointerMap,
} from './gestures/pointerReducer';
import { resolveChartSizing } from './chartSizing';
import { chooseTimeTicks } from './xAxisTicks';
import { drawSeries } from './utils/drawSeries';
import {
  createColorResolver,
  FALLBACK_COLOR,
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
  mountChartDrawingOverlay,
  type ChartDrawingOverlayHandle,
} from './drawings/mountChartDrawingOverlay';
import type { DrawingShape, DrawingTool } from './drawings/types';
import { normalizeDrawing } from './drawings/types';
import {
  reduceDrawing,
  type DraftState,
} from './drawings/interaction';
import {
  dateForX,
  priceForY,
  projectAnchor,
  xForDate,
  yForPrice,
  type ProjScale,
} from './drawings/projection';
import type { DrawingAnchor } from './drawings/types';
import type { Hit } from './drawings/hitTest';
import DrawingStylePopup from './drawings/DrawingStylePopup';
import {
  createChartScaleApi,
  ChartScaleProvider,
  ChartOverlayProvider,
  type ChartOverlayContextValue,
  type ChartOverlayLayer,
} from './context';

const MARGIN = { top: 4, right: 60, bottom: 30, left: 0 };
// Canvas/SVG font family reaches draw code via the token (SVG `.style()` accepts
// var(); canvas composes it through the probe — see composeCanvasFont).
const FONT_FAMILY_VAR = 'var(--font-family-base)';
// Top band of the price plot reserved for the crosshair OHLC readout (drawn at
// group-y 14). The price scale's range top starts here so a high candle never
// rises into the readout. Single source, also passed to IndicatorLegend.
const INFO_BAR_HEIGHT = 18;
// Auto-fit breathing room, in PIXELS: the highest visible candle sits this far
// below the readout band and the lowest sits this far above the axis floor —
// the same gap at any chart height or price (unlike a %-of-range cushion).
const AUTOFIT_PAD_PX = 8;

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
// Minimum horizontal breathing room between two x-axis labels. A '%b %y' label is
// ~40px wide, so below this they smear into each other; the axis drops to year
// boundaries rather than overprint.
const MIN_TICK_GAP_PX = 56;
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
  // Surfaces the named-range ladder in BAR counts, derived from the series' own
  // measured cadence (`rangeMarks`), so a host-rendered ZoomSlider labels its
  // marks correctly whatever the bar interval. Same plumbing shape as the cap.
  onRangeMarksChange?: (marks: RangeMark[]) => void;
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
  // Group keys excluded from the "price + overlays" auto-fit. Vocabulary:
  // 'trade' / 'trigger' for the overlay sketches, or an indicator's defKey
  // (e.g. 'ti:ema') for that whole indicator kind. Default [] = include all.
  autoFitExcluded: string[];
  onAutoFitExcludedChange: (next: string[]) => void;
  infoBarExpanded: boolean;
  onInfoBarExpandedChange: (v: boolean | ((prev: boolean) => boolean)) => void;
  symbol: string | null;
  bare?: boolean;
  // Explicit size overrides. Per-axis, a provided value overrides the measured
  // container box for that axis (`effective = prop ?? measured`); both provided ⇒
  // the chart sizes with no dependence on the ResizeObserver (the observer stays
  // attached, harmless). Give the chart a sized box OR pass these; the chart
  // always fills exactly that box.
  width?: number;
  height?: number;
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
  // Persisted placement — a v:2 anchor (corner/edge fraction + fixed px offset
  // against the price pane), a legacy {x,y} pixel value migrated once on load,
  // or null for the default top-right placement. The app persists drops (always
  // the new anchor shape) via the callback and otherwise stores the blob opaquely.
  statsPosition?: StatsPosition | LegacyStatsPosition | null;
  onStatsPositionChange?: (p: StatsPosition) => void;
  statsSize?: StatsSize;
  // Corner-pinned "Quarterly Earnings" table — the last six reported quarters
  // (EPS/revenue/margin + YoY + a score dot). Standalone toggle (not an
  // indicator), a sibling of the Price-Stats box; the app wires both
  // `earningsEnabled` here and the "Earnings" pill on ChartControls. Reuses the
  // `quarterlyResults` feed (now carrying `npm`) and the published free-float %.
  earningsEnabled?: boolean;
  earningsResults?: QuarterlyResult[];
  earningsFreeFloatPercent?: number;
  // Persisted placement — a v:2 anchor against the price pane, or null for the
  // default top-right placement. A brand-new preference key, so (unlike the stats
  // box) there is no legacy {x,y} shape to migrate.
  earningsPosition?: StatsPosition | null;
  onEarningsPositionChange?: (p: StatsPosition) => void;
  // User-editable chart appearance — a sparse `AppearanceOverrides` delta the
  // app persists via `onAppearanceChange` (same controlled-prop + sparse-delta
  // contract as `indicators`/`onIndicatorsChange`). Absent ⇒ baked defaults.
  // The gear-triggered Settings dialog only mounts when `onAppearanceChange` is
  // supplied (no callback ⇒ no way to persist edits).
  appearance?: AppearanceOverrides;
  onAppearanceChange?: (next: AppearanceOverrides) => void;
  // User drawing tools (controlled, same contract as `indicators`). `drawings`
  // is the persisted shape array the host owns; `onDrawingsChange` fires ONCE per
  // placement / edit-commit / delete (never per drag frame). `activeDrawingTool`
  // is host-held ephemeral state (default 'cursor') passed to BOTH Chart and
  // ChartControls — exactly like `patternsEnabled`. The style popup only mounts
  // when `onDrawingsChange` is supplied (no callback ⇒ no way to persist edits).
  drawings?: DrawingShape[];
  onDrawingsChange?: (next: DrawingShape[]) => void;
  activeDrawingTool?: DrawingTool;
  onActiveDrawingToolChange?: (t: DrawingTool) => void;
  // Floating draw-tool palette (the vertical icon card). Off by default: an
  // explicit opt-in, not a callback-presence guard — the phone feed passes real
  // (no-op) drawing callbacks yet must NOT show the card. Same shape as
  // `statsEnabled`/`earningsEnabled`. Its placement persists via the position
  // pair below (a v:2 anchor against the price pane, or null for the default
  // left-edge/vertically-centred spot — a brand-new key, no legacy {x,y}).
  drawToolbarEnabled?: boolean;
  drawToolbarPosition?: StatsPosition | LegacyStatsPosition | null;
  onDrawToolbarPositionChange?: (p: StatsPosition) => void;
  // Right-click report. When supplied, a right-click anywhere on the chart
  // surface suppresses the native menu and reports the cursor's location
  // (price XOR value, the bar under it, and which pane) so the host can raise
  // its own menu. Absent ⇒ the native browser menu shows as usual. A floating
  // HTML child that wants to keep its own menu tags its root
  // `data-chart-native-menu`.
  onContextMenu?: (info: ChartContextMenuInfo) => void;
  // App overlay plugins; they portal D3 overlays into the published hosts.
  children?: React.ReactNode;
};

const ZOOM_FACTOR = 1.04;

// Half the subpane-divider grab strip (handleH/2; handleH=8 in the render). A
// right-click within this of a divider line classifies as `none`, not a pane.
const DIVIDER_HALF_PX = 4;

// How long after a drawing placement a dblclick still counts as part of that
// same gesture (comfortably over the OS double-click interval).
const PLACEMENT_DBLCLICK_GUARD_MS = 700;

/**
 * The one floating editor a double-click opens, centred over the chart. Exactly
 * one is ever up (opening any closes the gear dialog and vice-versa). Subjects
 * are held BY ID and resolved at render time, so a panel whose subject vanishes
 * (legend `×`, Delete key, symbol switch) clears itself.
 */
type CenterPanel =
  | { kind: 'candles' }
  | { kind: 'indicator'; id: string }
  | { kind: 'drawing'; id: string }
  | null;

type Sel<E extends d3.BaseType = d3.BaseType> = d3.Selection<
  E,
  unknown,
  null,
  undefined
>;

// Single owner of every held-pointer gesture. Replaces the three scattered
// stores (pan drag, shape drag, y-axis rescale) with one tagged union so
// "in flight?" is a single predicate and there is one pointer-identity check.
// Placement (`draftRef`) is NOT folded in: it holds no pointer between its two
// clicks and keeps `reduceDrawing`'s DraftState→DraftState signature verbatim.
// `phase` promotes armed→dragging past the drag threshold (Tier 2).
type Gesture =
  | { kind: 'idle' }
  | {
      kind: 'pan';
      phase: 'armed' | 'dragging';
      pointerId: number;
      startX: number;
      startY: number;
      startOffset: number;
      baseTx: number;
      step: number;
      minOffset: number;
      maxOffset: number;
      panY: boolean;
      startLoLog: number;
      startHiLog: number;
      pxPerLog: number;
      panCapLog: number;
    }
  | {
      kind: 'drawingDrag';
      phase: 'armed' | 'dragging';
      pointerId: number;
      id: string;
      grab: Hit;
      startMx: number;
      startMy: number;
      origin: DrawingShape;
    }
  | {
      kind: 'yAxis';
      pointerId: number;
      startY: number;
      startLoLog: number;
      startHiLog: number;
      priceViewAtStart: [number, number] | null;
    }
  | {
      kind: 'pinch';
      pointers: Map<number, { x: number; y: number }>;
      prevDist: number;
    };

// Pointer type for the drag threshold ('touch' widens it). Every held-pointer
// gesture now runs on real PointerEvents, so this reads the live type.
const pointerTypeOf = (e: PointerEvent): string | undefined => e.pointerType;

// Replace one endpoint (handle drag) — pure. Index 0 → `a`, 1 → `b`; single-
// anchor shapes ignore the index. hline/vline carry the relevant scalar only.
function setDrawingEndpoint(
  origin: DrawingShape,
  index: number,
  anchor: DrawingAnchor,
): DrawingShape {
  switch (origin.type) {
    case 'trendline':
    case 'ray':
    case 'ruler':
      return index === 0 ? { ...origin, a: anchor } : { ...origin, b: anchor };
    case 'hray':
    case 'text':
      return { ...origin, a: anchor };
    case 'hline':
      return { ...origin, price: anchor.price };
    case 'vline':
      return { ...origin, date: anchor.date };
    default:
      return origin;
  }
}

// Shift one anchor by a pixel delta (translate-invariant: viewport delta equals
// local-space delta). Project → add delta → invert back to {date, price}.
function shiftDrawingAnchor(
  a: DrawingAnchor,
  dxPx: number,
  dyPx: number,
  s: ProjScale,
): DrawingAnchor {
  const p = projectAnchor(a, s);
  return { date: dateForX(p.x + dxPx, s), price: priceForY(p.y + dyPx, s) };
}

// Whole-shape move (body drag) — pure.
function shiftDrawing(
  origin: DrawingShape,
  dxPx: number,
  dyPx: number,
  s: ProjScale,
): DrawingShape {
  switch (origin.type) {
    case 'trendline':
    case 'ray':
    case 'ruler':
      return {
        ...origin,
        a: shiftDrawingAnchor(origin.a, dxPx, dyPx, s),
        b: shiftDrawingAnchor(origin.b, dxPx, dyPx, s),
      };
    case 'hray':
    case 'text':
      return { ...origin, a: shiftDrawingAnchor(origin.a, dxPx, dyPx, s) };
    case 'hline':
      return { ...origin, price: priceForY(yForPrice(origin.price, s) + dyPx, s) };
    case 'vline':
      return { ...origin, date: dateForX(xForDate(origin.date, s) + dxPx, s) };
    default:
      return origin;
  }
}

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
  onRangeMarksChange,
  panOffset,
  onPanOffsetChange,
  chartType,
  indicators,
  onIndicatorsChange,
  autoFitMode,
  onAutoFitModeChange,
  autoFitExcluded,
  onAutoFitExcludedChange,
  infoBarExpanded,
  onInfoBarExpandedChange,
  symbol,
  bare,
  width: propWidth,
  height: propHeight,
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
  earningsEnabled,
  earningsResults,
  earningsFreeFloatPercent,
  earningsPosition = null,
  onEarningsPositionChange,
  appearance,
  onAppearanceChange,
  drawings,
  onDrawingsChange,
  activeDrawingTool = 'cursor',
  onActiveDrawingToolChange,
  drawToolbarEnabled = false,
  drawToolbarPosition = null,
  onDrawToolbarPositionChange,
  onContextMenu,
  children,
}: Props) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  // The inner frame: the single coordinate origin shared by canvas, svg and every
  // DOM overlay. Size measurements read this (not the wrapper) so canvas and svg
  // fill the same box. The wrapper stays the wheel-zoom + clip surface.
  const frameRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  // Canvas series layer (volume/candles/indicators). Sits beneath the SVG.
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasCtxRef = useRef<{
    ctx: CanvasRenderingContext2D;
    hRatio: number;
    vRatio: number;
  } | null>(null);
  // Device-pixel-exact backing store. `suggested` is recorded by the observer
  // and applied at PAINT time — assigning canvas.width/height clears the bitmap,
  // so doing it in the resize callback would show a blank frame.
  const bitmapRef = useRef<{
    cssWidth: number;
    cssHeight: number;
    suggested: { width: number; height: number } | null;
  }>({ cssWidth: 0, cssHeight: 0, suggested: null });
  const colorResolverRef = useRef<ColorResolver | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  // The width the chart actually draws to: an explicit `width` prop overrides the
  // measured box, else the measured value is used. Every width GEOMETRY read
  // OUTSIDE the layout memo uses this (canvas/svg sizing, pan, the bar cap); the
  // measurement SETTERS stay raw. Height has no outside-the-memo read — it all
  // flows through the layout memo, which resolves `propHeight ?? containerHeight`
  // itself via resolveChartSizing.
  const effectiveWidth = propWidth ?? containerWidth;

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const rect = frame.getBoundingClientRect();
    if (rect.width) setContainerWidth(rect.width);
    if (rect.height) setContainerHeight(rect.height);
    // Invariant the two read sites (this eager border-box read + the observer's
    // content-box) depend on: the frame carries the gutter on `inset` only, never
    // padding or a border, so border box == content box and the reads agree.
    if (import.meta.env?.DEV) {
      const cs = getComputedStyle(frame);
      const noBox =
        cs.paddingTop === '0px' &&
        cs.paddingRight === '0px' &&
        cs.paddingBottom === '0px' &&
        cs.paddingLeft === '0px' &&
        cs.borderTopWidth === '0px' &&
        cs.borderRightWidth === '0px' &&
        cs.borderBottomWidth === '0px' &&
        cs.borderLeftWidth === '0px';
      if (!noBox) {
        console.warn(
          '[chart-core] chart frame must have no padding/border (gutter lives on ' +
            '`inset`) — the mount read and the resize observer will diverge otherwise.',
        );
      }
    }
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
  // The appearance gear lives here, separate from the dialog it opens; its ref is
  // passed to SettingsDialog so a press on the gear reads as "inside" and its own
  // click toggles cleanly (the layer-stack dismissal takes the press in capture).
  const settingsGearRef = useRef<HTMLButtonElement | null>(null);
  // Double-click-opened centred editor (candles / one indicator / one drawing).
  const [centerPanel, setCenterPanel] = useState<CenterPanel>(null);
  // Opening a centred panel closes the gear dialog and vice-versa, so only one
  // floating editor is ever up.
  const openCenterPanel = useCallback((panel: CenterPanel) => {
    setSettingsOpen(false);
    setCenterPanel(panel);
  }, []);
  const closeCenterPanel = useCallback(() => setCenterPanel(null), []);
  // Live mirrors so the once-bound dblclick handler (Effect 4, narrow deps)
  // never reads a stale closure.
  const openCenterPanelRef = useRef(openCenterPanel);
  openCenterPanelRef.current = openCenterPanel;
  const canEditAppearanceRef = useRef(false);
  canEditAppearanceRef.current = onAppearanceChange != null;

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

  // Measured bars/year — the engine is bar-index based and holds no interval
  // concept, so anything that needs calendar meaning (the zoom ladder, the ATR
  // stat windows) derives it from the series' own cadence.
  const measuredBarsPerYear = useMemo(() => measureBarsPerYear(data ?? []), [data]);
  // The named-range ladder for THIS series, in bar counts. Drives both the
  // readability cap below and the host's slider marks.
  const rangeMarks = useMemo(
    () => deriveRangeMarks(data ?? [], data?.length ?? 0),
    [data],
  );
  // Readability-derived zoom-out cap (D1/D5): the most bar slots that fit the live
  // measured width while each stays >= MIN_BAR_STEP_PX. Width only — NOT snapped to
  // a mark, so the visual floor is identical in every interval (see the function).
  // chart-core owns + enforces this; the wheel/correction effects read it.
  const maxVisibleBars = useMemo(
    () => maxVisibleBarsForWidth(effectiveWidth),
    [effectiveWidth],
  );
  // Single render-scope clamp applied at every geometry site below so a too-wide
  // host/persisted `visibleBars` never paints sub-readable candles for a frame
  // (the correction effect that fixes the prop only runs post-paint).
  const cappedVisibleBars = Math.max(
    MIN_VISIBLE_BARS,
    Math.min(visibleBars, maxVisibleBars),
  );

  // Geometry that depends on data + viewport but NOT on priceView. Hoisted
  // out of the draw effect so the y-zoom path skips re-running x-scale,
  // candle data joins, volume bars, x-axis, separators, etc.
  const layout = useMemo(() => {
    const sizing = resolveChartSizing({
      propWidth,
      propHeight,
      measuredWidth: containerWidth,
      measuredHeight: containerHeight,
      margin: MARGIN,
      rightBuffer: RIGHT_BUFFER,
    });
    if (!data || data.length === 0 || !sizing.draw) {
      if (sizing.tooSmall && import.meta.env?.DEV) {
        console.warn(
          '[chart-core] container is too small to draw — give the chart a real size.',
        );
      }
      return null;
    }
    // Re-draw-to-fit: the drawing height IS the box height minus margins, with no
    // 300px floor, so the svg (svgHeight = totalHeight + margins) equals the box
    // and nothing overflows. `Math.max(1,…)` is only a collapsed-box backstop.
    const totalHeight = sizing.totalHeight;
    const effectiveOffset = clampPanOffset(
      panOffset,
      data.length,
      cappedVisibleBars,
    );
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
    const width = sizing.width;
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
    propWidth,
    propHeight,
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
    return computeStats(
      combined,
      statsTable,
      statsMarket,
      measuredBarsPerYear,
    );
  }, [data, warmupSeed, statsTable, statsMarket, measuredBarsPerYear]);

  // Earnings-box view-model — the last six quarters baked into a corner table.
  // Independent of the price bars (it reads only the quarterly feed + free-float),
  // so it does not use `warmupSeed`/`measuredBarsPerYear`.
  const earningsModel = useMemo(
    () => computeEarnings(earningsResults, earningsFreeFloatPercent),
    [earningsResults, earningsFreeFloatPercent],
  );

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
    candle: CandleAppearance;
    indicators: ResolvedIndicator[];
  } | null>(null);

  // Paint-time hit regions from the LAST repaint (see indicators/hitRegions).
  // Rebuilt every frame by `drawSeries`, so it can never go stale.
  const hitRegionsRef = useRef<HitRegion[]>([]);

  // Adopt the backing-store size the observer last measured. Called at the top
  // of every paint (see `redrawSeries`) — never from the observer itself.
  const applySuggestedBitmapSize = useCallback(() => {
    const c = canvasRef.current;
    const cc = canvasCtxRef.current;
    const b = bitmapRef.current;
    if (!c || !cc || !b.suggested) return;
    const { width, height } = b.suggested;
    b.suggested = null;
    if (c.width !== width) c.width = width;
    if (c.height !== height) c.height = height;
    // Per-axis scale from the ACTUAL sizes, never devicePixelRatio — that is
    // what keeps a fractional element width or a fractional density exact.
    cc.hRatio = b.cssWidth > 0 ? width / b.cssWidth : 1;
    cc.vRatio = b.cssHeight > 0 ? height / b.cssHeight : 1;
  }, []);

  // Stable redraw entrypoint. Reads the cached draw-state + live scale fields
  // (xScale/yPrice from the last rescale, baseTranslateX which moves on pan).
  const redrawSeries = useCallback(() => {
    const cc = canvasCtxRef.current;
    const st = drawStateRef.current;
    if (!cc || !st) return;
    applySuggestedBitmapSize();
    hitRegionsRef.current = drawSeries(cc.ctx, {
      hRatio: cc.hRatio,
      vRatio: cc.vRatio,
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
      step: scaleApi.step,
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
      resolveColor: (v: string, prop?: string) =>
        colorResolverRef.current?.resolve(v, prop) ?? FALLBACK_COLOR,
    });
  }, [scaleApi, applySuggestedBitmapSize]);

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
    prev: Record<string, number> | null;
    latest: Record<string, number> | null;
  } | null>(null);

  const onDividerPointerDown = useCallback(
    (index: number) => (e: React.PointerEvent<HTMLDivElement>) => {
      if (!layout) return;
      // Left button only; a right-click on the strip is left to the frame's
      // contextmenu handler (which reports it as `none`). stopPropagation below
      // only stops the pointer event — contextmenu still reaches the frame.
      if (e.button !== 0 || e.ctrlKey) return;
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      subpaneDragRef.current = {
        index,
        startY: e.clientY,
        bands: layout.subpanes,
        priceHeight: layout.priceHeight,
        totalHeight: layout.totalHeight,
        // Heights as they were when the drag began, so a cancel restores them
        // exactly (including "auto" = null) with no commit.
        prev: paneHeightsState,
        latest: null,
      };
    },
    [layout, paneHeightsState],
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

  // A cancelled divider drag (e.g. a touch `pointercancel`) reverts to the
  // heights at grab-start and fires NO `onSubpaneHeightsChange` — nothing was
  // committed.
  const onDividerPointerCancel = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const s = subpaneDragRef.current;
      if (!s) return;
      e.currentTarget.releasePointerCapture?.(e.pointerId);
      subpaneDragRef.current = null;
      setPaneHeightsState(s.prev);
    },
    [],
  );

  // Manual price domain [loPrice, hiPrice] in price units (what
  // d3.scaleLog().domain() consumes and scaleApi.yPrice.domain() returns).
  // null = auto-fit (data-derived). Non-null = frozen range used verbatim as
  // the scale domain; gestures mutate it, a reset clears it. Resets when the
  // symbol changes. This is the industry-standard fixed-range model.
  const [priceView, setPriceView] = useState<[number, number] | null>(null);
  const priceViewRef = useRef(priceView);
  useEffect(() => {
    priceViewRef.current = priceView;
  }, [priceView]);
  const isAutoFit = priceView === null;

  // Hover tracking for the autofit button. Tracked on both the SVG y-axis
  // hit-rect and the HTML button itself so transitioning between the two does
  // not cause the button to flicker out.
  const [yAxisHovered, setYAxisHovered] = useState(false);
  const [autoFitHovered, setAutoFitHovered] = useState(false);
  // Right-click checklist popover for choosing which groups feed the
  // price+overlays auto-fit. Keeps the button mounted while open.
  const [autoFitMenuOpen, setAutoFitMenuOpen] = useState(false);
  // The "A" button lives here, separate from the menu it opens; its ref goes to
  // AutoFitMenu so a press on it is treated as "inside" the layer.
  const autoFitBtnRef = useRef<HTMLButtonElement | null>(null);
  const showAutoFitBtn = yAxisHovered || autoFitHovered || autoFitMenuOpen;
  // The one held-pointer gesture (see the Gesture union). 'idle' between
  // gestures; the pan / shape-drag / y-axis stores all live here now.
  const gestureRef = useRef<Gesture>({ kind: 'idle' });
  // Every live plot pointer, keyed by pointerId (reducePointers mutates it).
  // One finger down = a pan; a second turns the gesture into a pinch (the map
  // is shared into `gestureRef.pinch.pointers`). Emptied as fingers lift.
  const pointersRef = useRef<PointerMap>(new Map());
  // "A held-pointer gesture is in flight?" — the single predicate used by the
  // contextmenu bail and every skip-while-gesture site. Placement (draftRef)
  // holds no pointer but still counts as busy for the menu bail.
  const gestureBusy = () =>
    gestureRef.current.kind !== 'idle' || draftRef.current.phase !== 'idle';
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
  const onRangeMarksChangeRef = useRef(onRangeMarksChange);
  useEffect(() => {
    onRangeMarksChangeRef.current = onRangeMarksChange;
  }, [onRangeMarksChange]);
  const pendingFrameRef = useRef<number | null>(null);
  const pendingDxRef = useRef<number>(0);
  const pendingDyRef = useRef<number>(0);
  // Y-axis rescale rAF + last drag delta (moved out of the old y-axis effect's
  // closure so the unified pointer owner can drive its flush).
  const yAxisRafRef = useRef<number | null>(null);
  const yAxisLastDyRef = useRef<number>(0);
  // True while a body drag is actually moving (promoted past the threshold), so
  // Effect B keeps using the live (uncommitted) horizontal translate instead of
  // snapping X back when a per-frame setPriceView (Y pan) re-runs it mid-drag,
  // and so the crosshair yields. Derived from the gesture owner, not a mirror.
  const panDragging = () =>
    gestureRef.current.kind === 'pan' && gestureRef.current.phase === 'dragging';
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
  // The x-axis baseline — the horizontal twin of rightBorderRef, drawn in the
  // fixed (non-panned) frame so it spans the plot width and meets the price axis
  // at the corner regardless of pan/zoom.
  const xAxisBaselineRef = useRef<Sel<SVGLineElement> | null>(null);
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
  // Companion to showLatestInfoRef for the hovering case: re-renders the
  // crosshair readout at the current pointer position with fresh data, so a
  // live data tick doesn't leave the legend frozen while the pointer rests on
  // the chart (the crosshair otherwise only re-renders on pointer move).
  const updateCrosshairRef = useRef<(() => void) | null>(null);
  // Exposes effect-4's local `hideOverlays` so the pan drag (a different effect)
  // can hide the crosshair when it promotes to dragging.
  const hideOverlaysRef = useRef<(() => void) | null>(null);
  const priceLabelGroupRef = useRef<Sel<SVGGElement> | null>(null);
  const priceLabelTextRef = useRef<Sel<SVGTextElement> | null>(null);
  const overlayRectRef = useRef<Sel<SVGRectElement> | null>(null);
  const yAxisHitRectRef = useRef<Sel<SVGRectElement> | null>(null);
  // Local-y boundary (in the y-axis hit rect's own coords) between the price
  // pane's gutter and the subpanes' gutters below it. The hit rect spans the
  // full gutter column so hovering ANY pane's gutter surfaces the auto-fit
  // button; the price-rescale drag/dbl-click only fire above this split.
  const yAxisPriceSplitRef = useRef(0);
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

  // Drawing-tools overlay — interactive, persisted. Single persistent handle
  // driven from the same pan/rescale sites as the pattern overlay. Interaction
  // refs are read live by the imperative pointer handlers so they never rebind.
  const drawingOverlayContainerRef = useRef<SVGGElement | null>(null);
  const drawingOverlayHandleRef = useRef<ChartDrawingOverlayHandle | null>(null);
  const activeToolRef = useRef<DrawingTool>(activeDrawingTool);
  useEffect(() => {
    activeToolRef.current = activeDrawingTool;
  }, [activeDrawingTool]);
  const draftRef = useRef<DraftState>({ phase: 'idle' });
  const draftPointerRef = useRef<DrawingAnchor | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectDrawing = useCallback((id: string | null) => {
    selectedIdRef.current = id;
    setSelectedId(id);
  }, []);
  // Working copy held during a drag (mutated per frame for instant feedback);
  // null when idle. `onDrawingsChange` fires only on mouseup (one commit/gesture).
  // The in-flight drag bookkeeping (start pointer + grabbed shape) now lives on
  // the gesture owner as `kind:'drawingDrag'`.
  const workingDrawingsRef = useRef<DrawingShape[] | null>(null);
  const onDrawingsChangeRef = useRef(onDrawingsChange);
  useEffect(() => {
    onDrawingsChangeRef.current = onDrawingsChange;
  }, [onDrawingsChange]);
  const onActiveDrawingToolChangeRef = useRef(onActiveDrawingToolChange);
  useEffect(() => {
    onActiveDrawingToolChangeRef.current = onActiveDrawingToolChange;
  }, [onActiveDrawingToolChange]);
  const onContextMenuRef = useRef(onContextMenu);
  useEffect(() => {
    onContextMenuRef.current = onContextMenu;
  }, [onContextMenu]);
  // Live pane geometry the right-click handler reads at event time: the lowest
  // pane's bottom + every subpane band. `scaleApi.width`/`priceHeight` are
  // already published; these two are not, so mirror them here. Refreshed in the
  // same paint effect that assigns `scaleApi.priceHeight`.
  const paneBandsRef = useRef<{ fullHeight: number; bands: SubpaneBand[] }>({
    fullHeight: 0,
    bands: [],
  });

  const effectiveDrawings = useMemo<DrawingShape[]>(
    () =>
      (drawings ?? [])
        .map(normalizeDrawing)
        .filter((d): d is DrawingShape => d !== null),
    [drawings],
  );
  // Live mirror so the document-level pointer handlers read the latest set
  // without rebinding (their effects keep narrow deps).
  const effectiveDrawingsRef = useRef(effectiveDrawings);
  effectiveDrawingsRef.current = effectiveDrawings;

  // Read-tolerance on the untrusted persisted stats position at the Chart
  // boundary (like the normalizeDrawing map above): a v:2 anchor, a legacy {x,y},
  // or null. Memoised so StatsPanel sees a stable identity across re-renders
  // (its one-shot legacy backfill ref depends on it).
  const normalizedStatsPosition = useMemo(
    () => normalizeStatsPosition(statsPosition),
    [statsPosition],
  );

  // Same read-tolerance for the earnings box, but its key is new so there is no
  // legacy {x,y} shape: keep only a v:2 anchor, else the default (null).
  const normalizedEarningsPosition = useMemo(() => {
    const p = normalizeStatsPosition(earningsPosition);
    return p && 'v' in p ? p : null;
  }, [earningsPosition]);

  // Same read-tolerance for the floating draw-toolbar; its key is new, so no
  // legacy {x,y} shape — keep only a v:2 anchor, else the default (null).
  const normalizedDrawToolbarPosition = useMemo(() => {
    const p = normalizeStatsPosition(drawToolbarPosition);
    return p && 'v' in p ? p : null;
  }, [drawToolbarPosition]);

  // ProjScale snapshot from the live scale api (read on every pointer event).
  const buildProjScale = useCallback(
    (): ProjScale => ({
      xScale: scaleApi.xScale,
      yPrice: scaleApi.yPrice,
      step: scaleApi.step,
      bandwidth: scaleApi.bandwidth,
      dataLength: scaleApi.data.length,
      width: scaleApi.width,
      priceHeight: scaleApi.priceHeight,
      data: scaleApi.data,
    }),
    [scaleApi],
  );

  // Map a viewport pointer (chart-inner space) to a {date, price} anchor. x is
  // detranslated by the pan offset (overlay shapes live in pre-translate local
  // space); y is not panned.
  const pointerToAnchor = useCallback(
    (mx: number, my: number): DrawingAnchor => {
      const s = buildProjScale();
      return {
        date: dateForX(mx - scaleApi.baseTranslateX, s),
        price: priceForY(my, s),
      };
    },
    [buildProjScale, scaleApi],
  );

  // Stable imperative re-render of the drawing overlay from the live refs. Used
  // by both the React drawings-update effect and the document pointer handlers.
  const renderDrawings = useCallback(() => {
    const handle = drawingOverlayHandleRef.current;
    if (!handle || scaleApi.data.length === 0) return;
    handle.update({
      drawings: workingDrawingsRef.current ?? effectiveDrawingsRef.current,
      draft: draftRef.current,
      draftPointer: draftPointerRef.current,
      selectedId: selectedIdRef.current,
      xScale: scaleApi.xScale,
      yPrice: scaleApi.yPrice,
      step: scaleApi.step,
      bandwidth: scaleApi.bandwidth,
      dataLength: scaleApi.data.length,
      width: scaleApi.width,
      priceHeight: scaleApi.priceHeight,
      data: scaleApi.data,
      baseTranslateX: scaleApi.baseTranslateX,
      marginTop: MARGIN.top,
      resolveColor: (v: string, prop?: string) =>
        colorResolverRef.current?.resolve(v, prop) ?? FALLBACK_COLOR,
    });
  }, [scaleApi]);

  // Persist a placed/edited shape (replace-by-id, else append).
  const commitDrawing = useCallback((shape: DrawingShape) => {
    const list = effectiveDrawingsRef.current;
    const i = list.findIndex((s) => s.id === shape.id);
    const next = i === -1 ? [...list, shape] : list.map((s) => (s.id === shape.id ? shape : s));
    onDrawingsChangeRef.current?.(next);
  }, []);

  const makeDrawingId = () =>
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `d-${Date.now()}-${Math.round(Math.random() * 1e9)}`;

  // Stamped when a mousedown PLACED a drawing; a dblclick arriving within the
  // double-click window is that same gesture and is swallowed. Without it a fast
  // double-click that places a one-click tool would also open the fresh shape's
  // popup, breaking "every tool but text places silently".
  //
  // Guarding on "the active tool is cursor" does NOT work: `reduceDrawing`
  // commits on the placing mousedown and Chart resets the tool right there, so
  // by `dblclick` time the tool is already 'cursor'. Clearing the flag on the
  // next cursor-mode mousedown doesn't work either — the double-click's SECOND
  // mousedown is already in cursor mode and would clear it before `dblclick`.
  const justPlacedAtRef = useRef(0);

  // Tool active: place an anchor. 1-click tools commit immediately; 2-click tools
  // enter a placing draft (rubber-band preview) until the second click. On commit
  // the tool snaps back to 'cursor' and the new shape is selected.
  const placeAnchorAt = useCallback(
    (mx: number, my: number) => {
      const anchor = pointerToAnchor(mx, my);
      const res = reduceDrawing(
        draftRef.current,
        { type: 'down', anchor },
        { tool: activeToolRef.current, makeId: makeDrawingId },
      );
      draftRef.current = res.draft;
      if (res.selectId !== undefined) selectDrawing(res.selectId);
      if (res.commit) {
        draftPointerRef.current = null;
        // A PLACEMENT commit (the reducer selects what it just built); a drag
        // commit leaves `selectId` undefined and never reaches this path.
        justPlacedAtRef.current = performance.now();
        commitDrawing(res.commit);
        // Text carve-out: a freshly placed text box opens its popup immediately
        // so you can type. `DrawingStylePopup` focuses the field for an empty
        // box. Every other tool places silently.
        if (res.commit.type === 'text')
          openCenterPanel({ kind: 'drawing', id: res.commit.id });
        if (activeToolRef.current !== 'cursor') {
          activeToolRef.current = 'cursor';
          onActiveDrawingToolChangeRef.current?.('cursor');
        }
      }
      renderDrawings();
    },
    [
      pointerToAnchor,
      selectDrawing,
      commitDrawing,
      renderDrawings,
      openCenterPanel,
    ],
  );

  // Cursor mode + hit: select + start a drag (whole-shape or endpoint).
  const beginDragAt = useCallback(
    (
      target: { id: string; hit: Hit },
      mx: number,
      my: number,
      pointerId: number,
    ) => {
      const shape = effectiveDrawingsRef.current.find((s) => s.id === target.id);
      if (!shape) return;
      const anchor = pointerToAnchor(mx, my);
      const res = reduceDrawing(
        draftRef.current,
        { type: 'down', anchor, target: { id: target.id, hit: target.hit, shape } },
        { tool: 'cursor', makeId: makeDrawingId },
      );
      draftRef.current = res.draft;
      if (res.selectId !== undefined) selectDrawing(res.selectId);
      if (res.draft.phase === 'dragging' && shape.locked !== true) {
        // Armed: a press that never travels past the threshold is a select-only
        // click (keeps the selection, commits nothing). onMove promotes it.
        gestureRef.current = {
          kind: 'drawingDrag',
          phase: 'armed',
          pointerId,
          id: shape.id,
          grab: res.draft.grab,
          startMx: mx,
          startMy: my,
          origin: shape,
        };
        workingDrawingsRef.current = effectiveDrawingsRef.current.slice();
        if (wrapperRef.current) wrapperRef.current.style.cursor = 'grabbing';
      }
      renderDrawings();
    },
    [pointerToAnchor, selectDrawing, renderDrawings],
  );

  // The centred panel's subject, resolved BY ID against the live props at render
  // time — so an indicator removed via the legend `×`, a drawing deleted by
  // keyboard or by the popup's own Delete button, and a symbol change that swaps
  // the per-symbol drawing set all make the panel disappear on their own.
  const panelDrawing = useMemo<DrawingShape | null>(
    () =>
      centerPanel?.kind === 'drawing'
        ? effectiveDrawings.find((s) => s.id === centerPanel.id) ?? null
        : null,
    [centerPanel, effectiveDrawings],
  );
  const panelIndicator = useMemo<IndicatorConfig | null>(
    () =>
      centerPanel?.kind === 'indicator'
        ? indicators.find((c) => c.id === centerPanel.id) ?? null
        : null,
    [centerPanel, indicators],
  );

  // Drawing selection clears via the existing background-pointerdown fan-out
  // (only the pure-miss path runs it), matching overlay-plugin deselect.
  useEffect(() => {
    const cb = () => selectDrawing(null);
    const subs = bgPointerDownSubsRef.current;
    subs.add(cb);
    return () => {
      subs.delete(cb);
    };
  }, [selectDrawing]);

  // Keyboard: Escape cancels an in-flight draft/drag; Delete/Backspace removes
  // the selected drawing (ignored while typing in a field).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (
          draftRef.current.phase !== 'idle' ||
          gestureRef.current.kind === 'drawingDrag' ||
          draftPointerRef.current
        ) {
          const res = reduceDrawing(
            draftRef.current,
            { type: 'escape' },
            { tool: activeToolRef.current, makeId: makeDrawingId },
          );
          draftRef.current = res.draft;
          draftPointerRef.current = null;
          if (gestureRef.current.kind === 'drawingDrag')
            gestureRef.current = { kind: 'idle' };
          workingDrawingsRef.current = null;
          renderDrawings();
        }
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIdRef.current) {
        const t = e.target as HTMLElement | null;
        if (
          t &&
          (t.tagName === 'INPUT' ||
            t.tagName === 'TEXTAREA' ||
            t.isContentEditable)
        )
          return;
        const id = selectedIdRef.current;
        onDrawingsChangeRef.current?.(
          effectiveDrawingsRef.current.filter((s) => s.id !== id),
        );
        selectDrawing(null);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [selectDrawing, renderDrawings]);

  // The drawing-drag / placement follow-through and the pan follow-through both
  // live in the single pointer owner (one document pointermove/up/cancel set,
  // dispatched by `gestureRef.current.kind`) defined below alongside `cancelPan`.

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

  // TODO(drawings v1): drawings are annotations, not data, so they do NOT
  // contribute to the auto-fit y-domain. If a future version wants "fit to
  // drawings", funnel their projected price extents through this same reporter.
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
    if (tradeBounds && !autoFitExcluded.includes('trade')) {
      mins.push(tradeBounds.min);
      maxs.push(tradeBounds.max);
    }
    if (triggerBounds && !autoFitExcluded.includes('trigger')) {
      mins.push(triggerBounds.min);
      maxs.push(triggerBounds.max);
    }
    if (mins.length === 0) return null;
    return { min: Math.min(...mins), max: Math.max(...maxs) };
  }, [tradeBounds, triggerBounds, autoFitExcluded]);

  // Rows the auto-fit exclusion popover offers — derived from what actually
  // contributes to the price+overlays fit right now: one entry per distinct
  // price-pane indicator kind, plus trade/trigger overlays when present.
  const autoFitContributors = useMemo<{ key: string; label: string }[]>(() => {
    const rows: { key: string; label: string }[] = [];
    const seen = new Set<string>();
    for (const { config } of resolvedIndicators) {
      const def = getIndicator(config.defKey);
      if (!def || typeof def.pane === 'object') continue;
      if (seen.has(config.defKey)) continue;
      seen.add(config.defKey);
      rows.push({ key: config.defKey, label: def.longLabel ?? def.label });
    }
    if (tradeBounds != null) rows.push({ key: 'trade', label: 'Trade overlays' });
    if (triggerBounds != null)
      rows.push({ key: 'trigger', label: 'Trigger overlays' });
    return rows;
  }, [resolvedIndicators, tradeBounds, triggerBounds]);

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
      marginTop: MARGIN.top,
      marginBottom: MARGIN.bottom,
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
    const frame = frameRef.current;
    if (!frame) return;

    let raf = 0;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect) return;
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (rect.width) setContainerWidth(rect.width);
        if (rect.height) setContainerHeight(rect.height);
      });
    });
    observer.observe(frame);
    return () => {
      if (raf) cancelAnimationFrame(raf);
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
    return () => {
      root.style.removeProperty('--chart-price-height');
    };
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

  // Canvas backing-store sizing. CSS px matches the svg box; the BITMAP size is
  // the browser's own device-pixel content box, so it is exact even when the
  // element's width or the display density is fractional (browser zoom, scaled
  // external monitor) — `round(cssW * devicePixelRatio)` is not, and a mismatch
  // makes the compositor resample the whole canvas, softening every bar however
  // exactly it was drawn. Same technique as TradingView's `fancy-canvas`, minus
  // the dependency. Re-measures on a devicePixelRatio change (which a
  // ResizeObserver won't report) via a re-armed resolution media query.
  const layoutTotalHeight = layout?.totalHeight ?? null;
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || layoutTotalHeight == null || effectiveWidth === 0) return;
    const cssW = effectiveWidth;
    const cssH = layoutTotalHeight + MARGIN.top + MARGIN.bottom;
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (!canvasCtxRef.current || canvasCtxRef.current.ctx !== ctx) {
      canvasCtxRef.current = { ctx, hRatio: 1, vRatio: 1 };
    }

    function measure(entry?: ResizeObserverEntry) {
      const c = canvasRef.current;
      if (!c) return;
      const box = entry?.devicePixelContentBoxSize?.[0];
      let w: number;
      let h: number;
      if (box) {
        w = box.inlineSize;
        h = box.blockSize;
      } else {
        // Equivalent fallback where `device-pixel-content-box` is unsupported:
        // round each EDGE independently, reproducing the compositor's snapping.
        // That is what absorbs a sub-pixel position; `round(w * ratio)` can't.
        const ratio = window.devicePixelRatio || 1;
        const r = c.getBoundingClientRect();
        w = Math.round(r.left * ratio + r.width * ratio) - Math.round(r.left * ratio);
        h = Math.round(r.top * ratio + r.height * ratio) - Math.round(r.top * ratio);
      }
      bitmapRef.current = {
        cssWidth: cssW,
        cssHeight: cssH,
        suggested: { width: Math.max(1, w), height: Math.max(1, h) },
      };
      redrawSeries();
    }

    const ro = new ResizeObserver((entries) => measure(entries[0]));
    try {
      ro.observe(canvas, { box: 'device-pixel-content-box' });
    } catch {
      ro.observe(canvas);
    }
    measure();

    let mql: MediaQueryList | null = null;
    const onChange = () => {
      measure();
      arm();
    };
    function arm() {
      if (mql) mql.removeEventListener('change', onChange);
      mql = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
      mql.addEventListener('change', onChange);
    }
    arm();
    return () => {
      ro.disconnect();
      if (mql) mql.removeEventListener('change', onChange);
    };
  }, [effectiveWidth, layoutTotalHeight, redrawSeries]);

  // The one zoom sink. Both the wheel and a two-finger pinch multiply the
  // visible-bar count by a factor; this accumulates factors into a single rAF
  // and applies the readability clamp (live `maxBarsRef`, floor MIN_VISIBLE_BARS)
  // exactly once per frame. No-ops when the host holds no `onVisibleBarsChange`.
  const zoomPendingFactorRef = useRef(1);
  const zoomRafRef = useRef<number | null>(null);
  const applyZoomFactor = useCallback((f: number) => {
    if (!onVisibleBarsChangeRef.current) return;
    zoomPendingFactorRef.current *= f;
    if (zoomRafRef.current != null) return;
    zoomRafRef.current = requestAnimationFrame(() => {
      zoomRafRef.current = null;
      const factor = zoomPendingFactorRef.current;
      zoomPendingFactorRef.current = 1;
      onVisibleBarsChangeRef.current?.((prev) =>
        Math.min(maxBarsRef.current, Math.max(MIN_VISIBLE_BARS, prev * factor)),
      );
    });
  }, []);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper || !onVisibleBarsChange) return;
    function onWheel(e: WheelEvent) {
      // Yield the wheel to any open popover/dialog that scrolls its own content.
      // Without this, the wrapper's preventDefault() cancels the panel's native
      // scroll and zooms the chart instead. Contract: scroll panels tag their
      // scroll body with data-chart-wheel-scroll (see CLAUDE.md).
      if ((e.target as Element | null)?.closest?.('[data-chart-wheel-scroll]')) return;
      e.preventDefault();
      applyZoomFactor(e.deltaY > 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR);
    }
    wrapper.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      wrapper.removeEventListener('wheel', onWheel);
    };
  }, [onVisibleBarsChange, applyZoomFactor]);

  // Right-click report. Bound on the FRAME (not the svg) so it also sees clicks
  // on the HTML children stacked above the <svg> (dividers, legend, stats). With
  // no host handler it does nothing → the native menu shows. Otherwise it yields
  // to chrome that keeps its own menu, suppresses the native menu everywhere
  // else, and reports the cursor's pane + location. Mid-gesture it suppresses the
  // menu but emits no payload. Same native-listener style as the wheel effect.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const onCtx = (e: MouseEvent) => {
      if (!onContextMenuRef.current) return; // no handler ⇒ native menu
      const t = e.target as Element | null;
      if (
        t?.closest?.(
          '[data-chart-native-menu],[data-chart-legend],[data-chart-stats],[data-chart-earnings],[data-chart-drawtoolbar]',
        )
      )
        return; // chrome that owns its own right-click
      if (gestureBusy()) {
        // Pan / shape drag / placement / y-axis in flight: no menu, no payload.
        e.preventDefault();
        return;
      }
      e.preventDefault();
      const root = rootGRef.current;
      const [mx, my] = root ? d3.pointer(e, root.node()) : [0, 0];
      const region = classifyChartRegion({
        mx,
        my,
        width: scaleApi.width,
        priceHeight: scaleApi.priceHeight,
        fullHeight: paneBandsRef.current.fullHeight,
        bands: paneBandsRef.current.bands,
        dividerHalfPx: DIVIDER_HALF_PX,
      });
      let barIndex: number | null = null;
      let date: string | null = null;
      let price: number | null = null;
      let value: number | null = null;
      if (region.kind === 'price' || region.kind === 'subpane') {
        // Same slot math + bounds guards the crosshair uses: right of the last
        // bar the index runs past the data, so the column is null there.
        const slot = Math.floor(mx / scaleApi.step);
        const bi = scaleApi.visibleStartIdx + slot;
        if (slot >= 0 && bi >= 0 && bi < scaleApi.data.length) {
          barIndex = bi;
          date = dateForBarIndex(scaleApi.data, bi);
        }
      }
      if (region.kind === 'price') {
        price = scaleApi.yPrice.invert(my);
      } else if (region.kind === 'subpane') {
        const sc = scaleApi.subpaneScales.get(region.key);
        if (sc) value = sc.invert(my);
      }
      onContextMenuRef.current({
        clientX: e.clientX,
        clientY: e.clientY,
        barIndex,
        date,
        price,
        value,
        pane: region,
      });
    };
    frame.addEventListener('contextmenu', onCtx);
    return () => frame.removeEventListener('contextmenu', onCtx);
  }, [scaleApi, data]);

  useEffect(() => {
    const len = data?.length ?? 0;
    if (len === 0) return;
    onPanOffsetChangeRef.current((prev) =>
      clampPanOffset(prev, len, visibleBars),
    );
  }, [data?.length, visibleBars]);

  // Cap-correction effect (mirrors the pan-clamp above): self-correct a too-large
  // host/persisted `visibleBars` when the window shrinks past the readability cap,
  // and floor a too-small one. Guard on containerWidth === 0 — before measurement
  // maxVisibleBarsForWidth(0) returns the MIN_VISIBLE_BARS fallback and would
  // wrongly clamp to 10. Host needs no geometry knowledge; chart-core owns the cap.
  useEffect(() => {
    if (effectiveWidth === 0 || !onVisibleBarsChange) return;
    if (visibleBars > maxVisibleBars || visibleBars < MIN_VISIBLE_BARS) {
      onVisibleBarsChangeRef.current?.((prev) =>
        Math.min(maxVisibleBars, Math.max(MIN_VISIBLE_BARS, prev)),
      );
    }
  }, [maxVisibleBars, visibleBars, effectiveWidth, onVisibleBarsChange]);

  // Surface the cap to the host (it can't read containerWidth directly) so it can
  // bound a zoom slider. Skip the pre-measurement fallback.
  useEffect(() => {
    if (effectiveWidth === 0 || !onMaxVisibleBarsChange) return;
    onMaxVisibleBarsChangeRef.current?.(maxVisibleBars);
  }, [maxVisibleBars, effectiveWidth, onMaxVisibleBarsChange]);

  // Same for the derived mark ladder — the host renders the slider but has no
  // series in hand to measure. Not width-dependent, so no measurement guard.
  useEffect(() => {
    if (!onRangeMarksChange) return;
    onRangeMarksChangeRef.current?.(rangeMarks);
  }, [rangeMarks, onRangeMarksChange]);

  // Reset the manual price range when the user switches symbols. Done at
  // render time to avoid a cascading render via an effect.
  const [prevSymbolForZoom, setPrevSymbolForZoom] = useState(symbol);
  if (prevSymbolForZoom !== symbol) {
    setPrevSymbolForZoom(symbol);
    if (priceView !== null) setPriceView(null);
  }

  // Release any pointer capture this pointer holds on the plot. The press site
  // captures on the overlay (plot gestures) or the y-axis hit rect (rescale), so
  // try both; releasing one it doesn't hold throws, which we swallow.
  const releasePlotCapture = useCallback((pointerId: number) => {
    if (pointerId < 0) return;
    for (const sel of [overlayRectRef.current, yAxisHitRectRef.current]) {
      try {
        sel?.node()?.releasePointerCapture?.(pointerId);
      } catch {
        /* pointer not captured by this element */
      }
    }
  }, []);

  // Build a fresh (armed) pan gesture from a client-space press. Used by the
  // bare-chart press in Effect 4 and when a pinch drops back to one finger.
  const makePanGesture = useCallback(
    (pointerId: number, clientX: number, clientY: number): Gesture => {
      // Vertical pan is active only when the price scale is already manual
      // (auto-fit off); while auto-fit is on, body drag stays X-only so
      // time-scrolling never drifts vertically.
      const manual = priceViewRef.current;
      const panY = manual !== null;
      let startLoLog = 0;
      let startHiLog = 0;
      let pxPerLog = 1;
      let panCapLog = 0;
      if (panY && manual) {
        startLoLog = Math.log(manual[0]);
        startHiLog = Math.log(manual[1]);
        pxPerLog = scaleApi.priceHeight / (startHiLog - startLoLog);
        panCapLog = (startHiLog - startLoLog) * 3; // up to ~3 screen-heights away
      }
      return {
        kind: 'pan',
        phase: 'armed',
        pointerId,
        startX: clientX,
        // Clamped, so it and `baseTx` (built from the clamped effectiveOffset)
        // describe the same view.
        startOffset: clampPanOffset(
          panOffsetRef.current,
          scaleApi.data.length,
          scaleApi.visibleBars,
        ),
        baseTx: scaleApi.baseTranslateX,
        step: scaleApi.step,
        ...panOffsetLimits(scaleApi.data.length, scaleApi.visibleBars),
        startY: clientY,
        panY,
        startLoLog,
        startHiLog,
        pxPerLog,
        panCapLog,
      };
    },
    [scaleApi],
  );

  // Abort an in-flight pan and snap the view back to where the gesture began.
  // A never-promoted (armed) press just disarms; a dragging one reverts the live
  // translate to `baseTx`, restores the frozen price range if it was panning Y,
  // and repaints. Bound to Escape / window blur / tab-hide / pointercancel.
  const cancelPan = useCallback(() => {
    const s = gestureRef.current;
    if (s.kind !== 'pan') return;
    releasePlotCapture(s.pointerId);
    const wasDragging = s.phase === 'dragging';
    gestureRef.current = { kind: 'idle' };
    if (pendingFrameRef.current != null) {
      cancelAnimationFrame(pendingFrameRef.current);
      pendingFrameRef.current = null;
    }
    pendingDxRef.current = 0;
    pendingDyRef.current = 0;
    if (wrapperRef.current) wrapperRef.current.style.cursor = '';
    if (!wasDragging) return; // armed-only: nothing was moved
    if (chartGroupRef.current)
      chartGroupRef.current.setAttribute('transform', `translate(${s.baseTx},0)`);
    scaleApi.baseTranslateX = s.baseTx;
    notifyScale('pan');
    patternOverlayHandleRef.current?.setTransform(s.baseTx);
    drawingOverlayHandleRef.current?.setTransform(s.baseTx);
    if (s.panY) setPriceView([Math.exp(s.startLoLog), Math.exp(s.startHiLog)]);
    redrawSeries();
  }, [scaleApi, notifyScale, redrawSeries, releasePlotCapture]);

  // The single pointer owner. One document `pointermove`/`pointerup`/
  // `pointercancel` set drives every held-pointer gesture, dispatched by
  // `gestureRef.current.kind`. The pointer-identity check runs once (a pointer
  // that isn't the gesture's own is ignored), each end/abort no-ops off its own
  // kind, and a two-finger `pinch` (arm from `reducePointers`) feeds the one zoom
  // sink. The `e.buttons===0` failsafes of the old mouse effects are gone — a
  // finger pan has `buttons===0`, so that check would kill it.
  useEffect(() => {
    // --- pan (kept math) ---
    const panEnd = () => {
      const s = gestureRef.current;
      if (s.kind !== 'pan') return;
      // Never promoted past the threshold → a plain click. Nothing was moved
      // (no grabbing cursor, no hidden overlays), so just disarm; no
      // onPanOffsetChange, no notifyScale.
      if (s.phase === 'armed') {
        gestureRef.current = { kind: 'idle' };
        return;
      }
      if (wrapperRef.current) wrapperRef.current.style.cursor = '';
      if (pendingFrameRef.current != null) {
        cancelAnimationFrame(pendingFrameRef.current);
        pendingFrameRef.current = null;
      }
      gestureRef.current = { kind: 'idle' };
      const deltaBars = Math.round(pendingDxRef.current / s.step);
      const newOffset = Math.max(
        s.minOffset,
        Math.min(s.maxOffset, s.startOffset + deltaBars),
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
        drawingOverlayHandleRef.current?.setTransform(s.baseTx);
        redrawSeries();
      }
    };
    const panMove = (e: PointerEvent) => {
      const s = gestureRef.current;
      if (s.kind !== 'pan') return;
      // Promote armed → dragging the first time travel crosses the threshold.
      // The one promotion site: here we take over the cursor, hide the crosshair
      // overlays, and stop tracking hover; below the threshold this is a click.
      if (s.phase === 'armed') {
        const moved = Math.hypot(e.clientX - s.startX, e.clientY - s.startY);
        if (moved < dragThresholdFor(pointerTypeOf(e))) return;
        s.phase = 'dragging';
        if (crosshairRafRef.current != null) {
          cancelAnimationFrame(crosshairRafRef.current);
          crosshairRafRef.current = null;
        }
        crosshairLastPosRef.current = null;
        hideOverlaysRef.current?.();
        if (wrapperRef.current) wrapperRef.current.style.cursor = 'grabbing';
      }
      const rawDx = e.clientX - s.startX;
      const dx = clampPanDeltaPx(
        rawDx,
        s.startOffset,
        s.minOffset,
        s.maxOffset,
        s.step,
      );
      // Re-anchor while the clamp binds: without this the pointer keeps banking
      // travel past the limit, and reversing has to spend that travel again
      // before the chart moves (a dead zone the size of the overshoot). Moving
      // startX by the discarded part keeps the anchor under the cursor, so a
      // reversal of one pixel pans by one pixel.
      if (dx !== rawDx) s.startX += rawDx - dx;
      pendingDxRef.current = dx;
      if (s.panY) pendingDyRef.current = e.clientY - s.startY;
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
          drawingOverlayHandleRef.current?.setTransform(tx);
          redrawSeries();
          if (s.panY) {
            // Drag down → domain shifts up → content follows the cursor 1:1
            // (y_new = y_old + pendingDy). Translate the frozen log-range.
            let d = pendingDyRef.current / s.pxPerLog;
            d = Math.max(-s.panCapLog, Math.min(s.panCapLog, d));
            setPriceView([
              Math.exp(s.startLoLog + d),
              Math.exp(s.startHiLog + d),
            ]);
          }
        });
      }
    };

    // --- drawing drag + placement (kept math) ---
    const drawingMove = (e: PointerEvent) => {
      const root = rootGRef.current;
      if (!root) return;
      const g = gestureRef.current;
      if (g.kind !== 'drawingDrag') return;
      const [mx, my] = d3.pointer(e, root.node());
      // Below the threshold this is still a select-click: don't mutate.
      if (g.phase === 'armed') {
        const dist = Math.hypot(mx - g.startMx, my - g.startMy);
        if (dist < dragThresholdFor(pointerTypeOf(e))) return;
        g.phase = 'dragging';
      }
      const s = buildProjScale();
      const moved =
        g.grab && g.grab.kind === 'handle'
          ? setDrawingEndpoint(g.origin, g.grab.index, pointerToAnchor(mx, my))
          : shiftDrawing(g.origin, mx - g.startMx, my - g.startMy, s);
      workingDrawingsRef.current = effectiveDrawingsRef.current.map((sh) =>
        sh.id === g.id ? moved : sh,
      );
      renderDrawings();
    };
    const placingMove = (e: PointerEvent) => {
      const root = rootGRef.current;
      if (!root || draftRef.current.phase !== 'placing') return;
      const [mx, my] = d3.pointer(e, root.node());
      draftPointerRef.current = pointerToAnchor(mx, my);
      renderDrawings();
    };
    const drawingUp = () => {
      const g = gestureRef.current;
      if (g.kind !== 'drawingDrag') return;
      const promoted = g.phase === 'dragging';
      gestureRef.current = { kind: 'idle' };
      const moved =
        workingDrawingsRef.current?.find((s) => s.id === g.id) ?? null;
      const res = reduceDrawing(
        draftRef.current,
        { type: 'up', working: moved },
        { tool: 'cursor', makeId: makeDrawingId },
      );
      draftRef.current = res.draft;
      workingDrawingsRef.current = null;
      // Drop the grabbing cursor; the next hover move restores grab/default.
      if (wrapperRef.current) wrapperRef.current.style.cursor = '';
      // Never promoted → a select-only click: keep the selection, persist
      // nothing (no redundant onDrawingsChange).
      if (promoted && res.commit) commitDrawing(res.commit);
      renderDrawings();
    };
    // Aborted drag: drop the working copy, KEEP the selection, persist nothing.
    const drawingCancel = () => {
      if (gestureRef.current.kind !== 'drawingDrag') return;
      gestureRef.current = { kind: 'idle' };
      const res = reduceDrawing(
        draftRef.current,
        { type: 'escape' },
        { tool: 'cursor', makeId: makeDrawingId },
      );
      draftRef.current = res.draft;
      workingDrawingsRef.current = null;
      if (wrapperRef.current) wrapperRef.current.style.cursor = '';
      renderDrawings();
    };

    // --- y-axis rescale (kept math) ---
    const PIXELS_PER_E_FOLD = 200;
    const MIN_HALF = 0.002; // extreme zoom-in  (~0.4% range)
    const MAX_HALF = 4; // extreme zoom-out (~e^8 range)
    const yAxisFlush = () => {
      yAxisRafRef.current = null;
      const g = gestureRef.current;
      if (g.kind !== 'yAxis') return;
      // drag up → lastDy<0 → factor>1 → zoom in (matches the old feel).
      const factor = Math.exp(-yAxisLastDyRef.current / PIXELS_PER_E_FOLD);
      const center = (g.startLoLog + g.startHiLog) / 2;
      const half = Math.max(
        MIN_HALF,
        Math.min(MAX_HALF, (g.startHiLog - g.startLoLog) / 2 / factor),
      );
      setPriceView([Math.exp(center - half), Math.exp(center + half)]);
    };
    const yAxisMove = (e: PointerEvent) => {
      const g = gestureRef.current;
      if (g.kind !== 'yAxis') return;
      yAxisLastDyRef.current = e.clientY - g.startY;
      if (yAxisRafRef.current == null)
        yAxisRafRef.current = requestAnimationFrame(yAxisFlush);
    };
    const yAxisEnd = () => {
      if (gestureRef.current.kind !== 'yAxis') return;
      gestureRef.current = { kind: 'idle' };
      if (wrapperRef.current) wrapperRef.current.style.cursor = '';
      if (yAxisRafRef.current != null) {
        cancelAnimationFrame(yAxisRafRef.current);
        yAxisRafRef.current = null;
      }
    };
    const yAxisCancel = () => {
      const g = gestureRef.current;
      if (g.kind !== 'yAxis') return;
      gestureRef.current = { kind: 'idle' };
      if (wrapperRef.current) wrapperRef.current.style.cursor = '';
      if (yAxisRafRef.current != null) {
        cancelAnimationFrame(yAxisRafRef.current);
        yAxisRafRef.current = null;
      }
      setPriceView(g.priceViewAtStart);
    };

    // Drop a lifted finger from the map; hand a lingering finger back to a fresh
    // pan, or go idle when the last one lifts.
    const settlePinchDrop = () => {
      if (pointersRef.current.size === 1) {
        const [id, pos] = [...pointersRef.current.entries()][0];
        pendingDxRef.current = 0;
        pendingDyRef.current = 0;
        gestureRef.current = makePanGesture(id, pos.x, pos.y);
      } else if (pointersRef.current.size === 0) {
        gestureRef.current = { kind: 'idle' };
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const g = gestureRef.current;
      if (g.kind === 'pinch') {
        const r = reducePointers(pointersRef.current, {
          type: 'move',
          pointerId: e.pointerId,
          x: e.clientX,
          y: e.clientY,
        });
        if (r.zoomRatio && r.zoomRatio > 0) applyZoomFactor(1 / r.zoomRatio);
        return;
      }
      // Placement rubber-band tracks a hovering (button-less) pointer between the
      // two clicks — no captured pointer, so no identity check.
      if (g.kind === 'idle') {
        placingMove(e);
        return;
      }
      // The identity filter: a pointer that isn't this gesture's own is ignored.
      if (e.pointerId !== g.pointerId) return;
      if (g.kind === 'pan') panMove(e);
      else if (g.kind === 'drawingDrag') drawingMove(e);
      else if (g.kind === 'yAxis') yAxisMove(e);
    };
    const onPointerUp = (e: PointerEvent) => {
      releasePlotCapture(e.pointerId);
      reducePointers(pointersRef.current, {
        type: 'up',
        pointerId: e.pointerId,
        x: e.clientX,
        y: e.clientY,
      });
      const g = gestureRef.current;
      if (g.kind === 'pinch') {
        settlePinchDrop();
        return;
      }
      if (g.kind === 'idle') return;
      if (e.pointerId !== g.pointerId) return;
      if (g.kind === 'pan') panEnd();
      else if (g.kind === 'drawingDrag') drawingUp();
      else if (g.kind === 'yAxis') yAxisEnd();
    };
    const onPointerCancel = (e: PointerEvent) => {
      releasePlotCapture(e.pointerId);
      reducePointers(pointersRef.current, {
        type: 'cancel',
        pointerId: e.pointerId,
        x: e.clientX,
        y: e.clientY,
      });
      const g = gestureRef.current;
      if (g.kind === 'pinch') {
        settlePinchDrop();
        return;
      }
      if (g.kind === 'idle') return;
      if (e.pointerId !== g.pointerId) return;
      if (g.kind === 'pan') cancelPan();
      else if (g.kind === 'drawingDrag') drawingCancel();
      else if (g.kind === 'yAxis') yAxisCancel();
    };

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointercancel', onPointerCancel);
    return () => {
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('pointercancel', onPointerCancel);
      if (pendingFrameRef.current != null) {
        cancelAnimationFrame(pendingFrameRef.current);
        pendingFrameRef.current = null;
      }
      if (yAxisRafRef.current != null) {
        cancelAnimationFrame(yAxisRafRef.current);
        yAxisRafRef.current = null;
      }
    };
  }, [
    scaleApi,
    notifyScale,
    redrawSeries,
    buildProjScale,
    pointerToAnchor,
    renderDrawings,
    commitDrawing,
    applyZoomFactor,
    cancelPan,
    makePanGesture,
    releasePlotCapture,
  ]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancelPan();
    };
    const onBlur = () => cancelPan();
    const onVis = () => {
      if (document.visibilityState === 'hidden') cancelPan();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [cancelPan]);

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

    // Gradient stops are resolved from the appearance background (the single
    // source), not re-hard-coded — so a themed background can't drift from the
    // canvas paint. The colour probe turns the var() token into rgb.
    const bgTop =
      colorResolverRef.current?.resolve(app.background.topColor) ??
      FALLBACK_COLOR;
    const bgBottom =
      colorResolverRef.current?.resolve(app.background.bottomColor) ??
      FALLBACK_COLOR;

    const grad = defs
      .append('linearGradient')
      .attr('id', 'chart-bg-gradient')
      .attr('x1', '0%')
      .attr('y1', '100%')
      .attr('x2', '0%')
      .attr('y2', '0%');
    grad.append('stop').attr('offset', '0%').attr('stop-color', bgBottom);
    grad.append('stop').attr('offset', '100%').attr('stop-color', bgTop);

    // userSpaceOnUse twin of the chart bg gradient. Used by the trade overlay
    // handles so their fill samples the actual background color at the handle's
    // y position rather than re-rendering the full gradient inside each circle.
    // Endpoints are set in Effect 2 once the bg rect height is known.
    const gradUser = defs
      .append('linearGradient')
      .attr('id', 'chart-bg-gradient-user')
      .attr('gradientUnits', 'userSpaceOnUse');
    gradUser.append('stop').attr('offset', '0%').attr('stop-color', bgTop);
    gradUser
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', bgBottom);
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
      .style('font-family', FONT_FAMILY_VAR)
      .style('font-weight', '500')
      .style('color', 'var(--chart-axis-label)') as Sel<SVGGElement>;

    ySubAxisGRef.current = g
      .append('g')
      .style('font-size', 'var(--text-2hxs)')
      .style('font-family', FONT_FAMILY_VAR)
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
      .attr('data-chart-role', 'y-axis-border')
      .attr('stroke', 'var(--chart-separator)')
      .attr('stroke-opacity', 1) as Sel<SVGLineElement>;

    xAxisBaselineRef.current = g
      .append('line')
      .attr('x1', 0)
      .attr('data-chart-role', 'x-axis-baseline')
      .attr('stroke', 'var(--chart-separator)')
      .attr('stroke-opacity', 1) as Sel<SVGLineElement>;

    // Pattern overlay is appended before the candle clipWrapper, so within the
    // SVG it paints beneath the x-axis/crosshair groups. It does NOT sit under
    // the candles: the series is on the CANVAS below this whole SVG, so every
    // SVG group — this one included — paints above it.
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
      .style('font-family', FONT_FAMILY_VAR)
      .style('font-weight', '500')
      .style('color', 'var(--chart-axis-label)') as Sel<SVGGElement>;

    // Crosshair style comes from the appearance defaults (single source); the
    // effect keyed on appCrosshairKey keeps it in sync. 'currentColor' inherits
    // the group's --chart-axis-label, so it is set straight, never probe-resolved.
    crosshairVRef.current = g
      .append('line')
      .attr('stroke', app.crosshair.color)
      .attr('stroke-opacity', app.crosshair.opacity)
      .attr('stroke-dasharray', app.crosshair.dash)
      .attr('y1', 0)
      .style('visibility', 'hidden') as Sel<SVGLineElement>;

    crosshairHRef.current = g
      .append('line')
      .attr('stroke', app.crosshair.color)
      .attr('stroke-opacity', app.crosshair.opacity)
      .attr('stroke-dasharray', app.crosshair.dash)
      .attr('x1', 0)
      .style('visibility', 'hidden') as Sel<SVGLineElement>;

    const infoText = g
      .append('text')
      .attr('x', 8)
      .attr('y', 14)
      .style('font-size', 'var(--text-sm)')
      .style('font-family', FONT_FAMILY_VAR)
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
      .style('font-family', FONT_FAMILY_VAR)
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

    // Drawing-tools overlay container — appended ABOVE candles/crosshair (after
    // the y-axis hit rect) but BELOW the trade/trigger hosts. NOT the pattern
    // container (which paints beneath candles). Shapes are pointer-events: none,
    // so the overlayRect keeps the mousedown; hit-testing is manual.
    drawingOverlayContainerRef.current = g
      .append('g')
      .attr('class', 'chart-drawing-overlays-container')
      .node();
    drawingOverlayHandleRef.current = mountChartDrawingOverlay(
      drawingOverlayContainerRef.current!,
    );

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
      xAxisBaselineRef.current = null;
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
      drawingOverlayHandleRef.current?.destroy();
      drawingOverlayHandleRef.current = null;
      drawingOverlayContainerRef.current = null;
    };
  }, []);

  // Effect A — layout / static draw. Runs on layout / chartType / indicators
  // changes. Does NOT depend on priceView — y-scale-dependent attrs (candle
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
      step,
      baseTranslateX,
      xScale,
      totalHeight,
    } = layout;

    const svgHeight = totalHeight + MARGIN.top + MARGIN.bottom;

    d3.select(svgRef.current)
      .attr('width', effectiveWidth)
      .attr('height', svgHeight);

    bgRectRef
      .current!.attr('width', effectiveWidth)
      .attr('height', fullHeight + MARGIN.top + MARGIN.bottom);

    // Match the userSpace twin gradient to the bg rect's actual y extent, and
    // drive its stop colors from `app.background` so a customized background and
    // the overlay handles (which sample this gradient) stay in sync. Resolved to
    // rgb — the tokens are var() strings that an SVG stop-color can't evaluate.
    const bgH = fullHeight + MARGIN.top + MARGIN.bottom;
    const bgTopRgb =
      colorResolverRef.current?.resolve(app.background.topColor) ??
      FALLBACK_COLOR;
    const bgBottomRgb =
      colorResolverRef.current?.resolve(app.background.bottomColor) ??
      FALLBACK_COLOR;
    bgGradientUserRef
      .current!.attr('x1', 0)
      .attr('y1', -MARGIN.top)
      .attr('x2', 0)
      .attr('y2', -MARGIN.top + bgH);
    bgGradientUserRef
      .current!.selectAll<SVGStopElement, unknown>('stop')
      .attr('stop-color', function () {
        return this.getAttribute('offset') === '0%' ? bgTopRgb : bgBottomRgb;
      });

    clipRectRef
      .current!.attr('width', width - RIGHT_BUFFER)
      .attr('height', fullHeight + MARGIN.top + MARGIN.bottom);

    priceClipRectRef
      .current!.attr('width', width - RIGHT_BUFFER)
      .attr('height', MARGIN.top + priceHeight);

    // X-axis ticks — one uniform cadence (day → week → month → quarter →
    // half-year → year → 2y/5y/10y) chosen by on-screen spacing, with contextual
    // labels that promote each tick to the coarsest unit it starts. See
    // chooseTimeTicks: this is the TradingView model, and it is what stops a short
    // partial month at the right edge from collapsing the whole axis to years.
    const timeTicks = chooseTimeTicks({
      dateAt: (i) => data[i].date,
      from: renderStart,
      to: renderEnd,
      step,
      minGapPx: MIN_TICK_GAP_PX,
    });
    const tickValues = timeTicks.map((t) => t.index);
    const tickLabels = new Map(timeTicks.map((t) => [t.index, t.label]));

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

    // Horizontal baseline spanning [0, width] at the plot bottom. Fixed frame, so
    // it never pans; its right end (x=width) meets rightBorderRef's bottom.
    xAxisBaselineRef
      .current!.attr('x1', 0)
      .attr('x2', width)
      .attr('y1', fullHeight)
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
          .tickFormat((i) => tickLabels.get(i as number) ?? ''),
      );
    // d3's domain path spans the bar RANGE and lives in the panned axis group, so
    // it drifts under pan/zoom and never reliably meets the price axis — drop it and
    // draw the baseline as fixed frame furniture instead (see xAxisBaselineRef).
    xAxisGRef.current!.select('.domain').remove();
    xAxisGRef
      .current!.selectAll('line')
      .attr('stroke', AXIS_STROKE)
      .attr('stroke-opacity', app.axis.opacity);

    crosshairVRef.current!.attr('y2', fullHeight);
    crosshairHRef.current!.attr('x2', width);

    overlayRectRef.current!.attr('width', width).attr('height', fullHeight);

    // Full-height gutter column (price pane + every subpane), so hovering any
    // pane's y-axis gutter reveals the auto-fit button — which now lives in the
    // bottom gutter and would otherwise sit below the price-only hover strip.
    // The drag handler below confines price-rescale to `priceHeight`.
    yAxisPriceSplitRef.current = priceHeight;
    yAxisHitRectRef
      .current!.attr('x', width)
      .attr('y', 0)
      .attr('width', MARGIN.right)
      .attr('height', fullHeight);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, effectiveWidth, data, activeSubpanes, appAxisKey, appBackgroundKey]);

  // Effect B — y-scale draw. Runs on priceView changes too. Recomputes yPrice,
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

    let domainLow: number, domainHigh: number;
    if (priceView) {
      // MANUAL: use the frozen range verbatim — no center, no padding, no data
      // recompute. Skips the whole data-fit block below (perf: a manual
      // pan/zoom re-runs this effect every frame and must not re-loop the
      // indicators × visible bars each time).
      [domainLow, domainHigh] = priceView;
    } else {
      // AUTO: existing data + overlay-bounds fit with asymmetric padding.
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
          // User excluded this indicator kind from the price+overlays fit.
          if (autoFitExcluded.includes(config.defKey)) continue;
          // Only the def's `autofitKeys` series drive the price domain (replaces
          // the old implicit `width !== 0` set). Stage 2 returns [] — its 1/NaN
          // band flag never collapses the log price domain. A def without
          // `autofitKeys` falls back to every series it computed.
          const keys =
            def.autofitKeys?.(config.settings) ?? Object.keys(series);
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
        if (overlayPriceBounds) {
          priceMin = Math.min(priceMin, overlayPriceBounds.min);
          priceMax = Math.max(priceMax, overlayPriceBounds.max);
        }
      }
      const logMin = Math.log(priceMin);
      const logMax = Math.log(priceMax);
      const logCenter = (logMin + logMax) / 2;
      const halfRange = (logMax - logMin) / 2;
      const adjLogMin = logCenter - halfRange;
      const adjLogMax = logCenter + halfRange;
      const logSpan = adjLogMax - adjLogMin;
      if (logSpan <= 0) {
        // Flat/degenerate range — nudge a hair so the log scale stays valid.
        domainLow = Math.exp(adjLogMin) * 0.99;
        domainHigh = Math.exp(adjLogMax) * 1.01;
      } else {
        // Convert the pixel pad to log units using the plot's own pixel height,
        // so the highest/lowest candle land exactly AUTOFIT_PAD_PX from the
        // plot edges. `usablePx` is the height left for the data once both pads
        // are carved out. INFO_BAR_HEIGHT already holds the readout clear, so
        // the top needs no extra headroom — same pad both ends.
        const plotPx = priceHeight - INFO_BAR_HEIGHT;
        const usablePx = Math.max(1, plotPx - 2 * AUTOFIT_PAD_PX);
        const logPerPx = logSpan / usablePx;
        domainLow = Math.exp(adjLogMin - AUTOFIT_PAD_PX * logPerPx);
        domainHigh = Math.exp(adjLogMax + AUTOFIT_PAD_PX * logPerPx);
      }
    }
    const yPrice = d3
      .scaleLog()
      .domain([Math.max(1, domainLow), domainHigh])
      // Range top starts at INFO_BAR_HEIGHT (not 0) so candles/axis begin below
      // the reserved OHLC-readout band. Only yPrice range site; the price-view /
      // auto-fit paths swap only `.domain(...)`, so this covers every render path.
      .range([priceHeight, INFO_BAR_HEIGHT]);

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
    // Range targets the pane band [bottom, top]. Independent of priceView.
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

    // During a body drag the committed pan offset (`baseTranslateX`) lags the
    // live cursor — the uncommitted translate lives on scaleApi.baseTranslateX,
    // set per-frame by the drag rAF. A per-frame setPriceView (Y pan) re-runs
    // this effect mid-drag; publishing the stale committed X would snap the
    // chart back horizontally. Use the live value while a drag is active.
    const liveTx = panDragging() ? scaleApi.baseTranslateX : baseTranslateX;

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
    scaleApi.maxVisibleBars = maxVisibleBars;
    scaleApi.priceHeight = priceHeight;
    scaleApi.width = width;
    scaleApi.baseTranslateX = liveTx;
    scaleApi.dataLength = data.length;
    scaleApi.indicators = resolvedIndicators;
    // Not on the scale api — the right-click classifier reads these at event time.
    paneBandsRef.current = { fullHeight, bands: subpanes };
    notifyScale('rescale');

    // Pattern overlay is a core feature; drive its scales directly.
    patternOverlayHandleRef.current?.updateScales({
      xScale,
      yPrice,
      step,
      bandwidth,
      baseTranslateX: liveTx,
      width,
      priceHeight,
      dataLength: data.length,
    });

    // Drawing overlay rides the same rescale (full re-project of every shape).
    drawingOverlayHandleRef.current?.updateScales({
      xScale,
      yPrice,
      step,
      bandwidth,
      dataLength: data.length,
      width,
      priceHeight,
      data,
      baseTranslateX: liveTx,
    });

    // Cache the draw-state for the canvas series + paint it now (covers data /
    // layout / y-scale / indicator / chartType changes — the pan path reuses
    // this with only a fresh baseTranslateX).
    const resolveColor = (v: string) =>
      colorResolverRef.current?.resolve(v) ?? FALLBACK_COLOR;
    drawStateRef.current = {
      cssWidth: effectiveWidth,
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
      // The CANDLE-specific tokens (they default to `var(--chart-positive)` /
      // `var(--chart-negative)` in chart-core.css, so an app that only themes
      // the chart-wide pair still recolours the series). Editing them from the
      // Candles popup leaves the OHLC readout / volume bars / results growth
      // colours alone.
      colors: {
        positive: resolveColor('var(--candle-up)'),
        negative: resolveColor('var(--candle-down)'),
      },
      background: {
        topColor: resolveColor(app.background.topColor),
        bottomColor: resolveColor(app.background.bottomColor),
        radius: app.background.radius,
      },
      candle: app.candle,
      indicators: resolvedIndicators,
    };
    redrawSeries();

    // Keep the top-left readout live on a data tick. `scaleApi.data` was just
    // updated above, so both branches render fresh numbers:
    //  - pointer resting over the chart → re-run the crosshair at that position
    //    so the hovered bar's OHLC/values refresh (without this the legend
    //    freezes while the canvas keeps repainting);
    //  - not hovering → refresh the latest-candle readout.
    if (crosshairLastPosRef.current) updateCrosshairRef.current?.();
    else showLatestInfoRef.current?.();
  }, [
    layout,
    resolvedIndicators,
    priceView,
    chartType,
    data,
    cappedVisibleBars,
    autoFitMode,
    autoFitExcluded,
    overlayPriceBounds,
    effectiveWidth,
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
    if (effectiveWidth === 0) return;
    const effectiveOffset = clampPanOffset(
      panOffset,
      dataLength,
      cappedVisibleBars,
    );
    const width = effectiveWidth - MARGIN.left - MARGIN.right;
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
    drawingOverlayHandleRef.current?.setTransform(baseTranslateX);
    redrawSeries();
  }, [
    panOffset,
    cappedVisibleBars,
    dataLength,
    effectiveWidth,
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
      resolveColor: (v: string, prop?: string) =>
        colorResolverRef.current?.resolve(v, prop) ?? FALLBACK_COLOR,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectivePatterns, layout, scaleApi, appPatternsKey, colorEpoch]);

  // Drawing overlay: re-render on the persisted set / selection / layout / color
  // changes. In-flight draft + drag previews are pushed imperatively by the
  // pointer handlers (which read refs), so they aren't deps here.
  useEffect(() => {
    renderDrawings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveDrawings, selectedId, layout, scaleApi, colorEpoch, renderDrawings]);

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

  // The price-axis rescale drag now lives in the unified pointer owner (its
  // `yAxis` branch); the gutter's `pointerdown` start + `dblclick` reset + hover
  // affordances are bound alongside the plot overlay in Effect 4, so this no
  // longer needs its own effect or a `setTimeout(bind,0)` retry.

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
    hideOverlaysRef.current = hideOverlays;

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
    updateCrosshairRef.current = updateCrosshair;

    overlay.on('pointerdown', function (event: PointerEvent) {
      // Left button only. macOS Ctrl+click fires a contextmenu AND a
      // button===0 press; excluding ctrlKey keeps that from starting a pan.
      // (Right / other buttons are left for the contextmenu handler.)
      if (event.button !== 0 || event.ctrlKey) return;
      // Suppresses only the compat mouse events; per spec it cannot cancel the
      // click/dblclick/contextmenu that follow, so the double-tap → settings
      // route is untouched.
      event.preventDefault();
      if (scaleApi.data.length === 0) return;
      // Capture so this pointer's moves/up reach us even off the element, and
      // stay routed here through a lifted finger leaving the plot.
      this.setPointerCapture?.(event.pointerId);

      // Track every pointer for pinch detection FIRST, before the primary-only
      // arming below. A second finger over the plot turns a live pan into a
      // two-finger pinch (panOffset preserved via cancelPan); further fingers
      // just join the map.
      const r = reducePointers(pointersRef.current, {
        type: 'down',
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
      });
      const curKind = gestureRef.current.kind;
      if (
        r.mode === 'pinch' &&
        (curKind === 'pan' || curKind === 'idle' || curKind === 'pinch')
      ) {
        if (curKind === 'pan') cancelPan();
        gestureRef.current = {
          kind: 'pinch',
          pointers: pointersRef.current,
          prevDist: pointerDistance(pointersRef.current),
        };
        hideOverlaysRef.current?.();
        return;
      }
      if (!event.isPrimary) return;
      const root = rootGRef.current;
      const [mx, my] = root ? d3.pointer(event, root.node()) : [0, 0];

      // 1) A drawing tool is active → place an anchor; never pans, never
      //    deselects.
      if (activeToolRef.current !== 'cursor') {
        placeAnchorAt(mx, my);
        return;
      }

      // 2) Cursor mode and the pointer hit a drawing → select / start a drag;
      //    never pans, never deselects.
      const target = drawingOverlayHandleRef.current?.hitTest(mx, my) ?? null;
      if (target) {
        beginDragAt(target, mx, my, event.pointerId);
        return;
      }

      // 3) Pure miss in cursor mode → existing behaviour: bare-chart click
      //    deselects overlays + drawings (subscribers), then inits the pan drag.
      for (const cb of bgPointerDownSubsRef.current) cb();
      // Arm the pan. It stays a click (no cursor change, overlays untouched,
      // crosshair still tracking) until the pointer travels past the drag
      // threshold, at which point the owner's move promotes it to 'dragging'. A
      // press that never crosses the threshold ends as a plain click.
      gestureRef.current = makePanGesture(
        event.pointerId,
        event.clientX,
        event.clientY,
      );
      pendingDxRef.current = 0;
      pendingDyRef.current = 0;
    });

    // Price-axis gutter: start a rescale drag (unified owner drives it), reset to
    // auto on a double-click, and surface the auto-fit button + ns-resize cursor
    // on hover. Bound here (not a separate effect) so it shares the overlay's
    // create-once timing — no `setTimeout(bind,0)` retry.
    const hit = yAxisHitRectRef.current;
    hit?.on('pointerdown', function (event: PointerEvent) {
      // Left button only (macOS Ctrl+click is a contextmenu, not a rescale).
      if (event.button !== 0 || event.ctrlKey) return;
      // Only the price-pane portion of the gutter drives price rescale; the
      // subpane portions below it are hover-only (they just surface the auto-fit
      // button), so ignore a drag that starts there.
      if (d3.pointer(event, this)[1] > yAxisPriceSplitRef.current) return;
      event.preventDefault();
      event.stopPropagation();
      this.setPointerCapture?.(event.pointerId);
      // Seed the range once: the frozen view if already manual, else the live
      // auto domain (price units) so the grab is continuous.
      const seed = priceViewRef.current ?? scaleApi.yPrice.domain();
      gestureRef.current = {
        kind: 'yAxis',
        pointerId: event.pointerId,
        startY: event.clientY,
        startLoLog: Math.log(seed[0]),
        startHiLog: Math.log(seed[1]),
        priceViewAtStart: priceViewRef.current,
      };
      if (wrapperRef.current) wrapperRef.current.style.cursor = 'ns-resize';
    });
    hit?.on('dblclick', function (event: MouseEvent) {
      // Reset-to-auto only from the price-pane gutter (see pointerdown gate).
      if (d3.pointer(event, this)[1] > yAxisPriceSplitRef.current) return;
      event.preventDefault();
      event.stopPropagation();
      setPriceView(null);
    });
    hit?.on('mouseenter', function () {
      setYAxisHovered(true);
    });
    hit?.on('mouseleave', function () {
      setYAxisHovered(false);
    });
    // Show the ns-resize (drag) cursor only over the draggable price-pane
    // portion; the subpane gutters below it are hover-only, so let them inherit
    // the wrapper's crosshair.
    hit?.on('pointermove', function (event: PointerEvent) {
      this.style.cursor =
        d3.pointer(event, this)[1] <= yAxisPriceSplitRef.current
          ? 'ns-resize'
          : '';
    });

    // What a double-click at (mx, my) — chart-inner coords — would open, or null
    // for a miss. The SINGLE source of truth for both the dblclick router and the
    // hover cursor affordance below: computing the hand cursor any other way lets
    // it promise a panel the double-click won't actually open.
    const panelTargetAt = (mx: number, my: number): CenterPanel => {
      if (scaleApi.data.length === 0) return null;

      // 1) A drawing wins — a trend line lying over a candle must never pop the
      //    Candles dialog.
      const target = drawingOverlayHandleRef.current?.hitTest(mx, my) ?? null;
      if (target) return { kind: 'drawing', id: target.id };

      // 2) A recorded paint-time region. Same bar derivation (and the same two
      //    bounds guards) the crosshair uses — right of the latest bar the index
      //    runs past the data, and an out-of-range bar is a miss, not a hit on
      //    the last one.
      const { step, bandwidth, visibleBarsInt, visibleStartIdx, xScale } =
        scaleApi;
      const slot = Math.floor(mx / step);
      if (slot < 0 || slot >= visibleBarsInt) return null;
      const barIdx = visibleStartIdx + slot;
      if (barIdx < 0 || barIdx >= scaleApi.data.length) return null;
      const region = pickHitRegion(
        // Regions live in PRE-pan local space; detranslate the pointer (the same
        // correction the drawing hit test applies via its `tx`).
        mx - scaleApi.baseTranslateX,
        my,
        barIdx,
        hitRegionsRef.current,
        (g) => xScale(g)! + bandwidth / 2,
        step,
      );
      if (!region) return null; // 3) Miss → nothing.
      if (region.sourceId === CANDLE_SOURCE) {
        // No persist callback ⇒ the popup would edit nothing (same gate as the
        // appearance gear + dialog), so it isn't a target and gets no cursor.
        return canEditAppearanceRef.current ? { kind: 'candles' } : null;
      }
      return { kind: 'indicator', id: region.sourceId };
    };

    // Double-click routing: open the settings for whatever object was hit. The
    // overlay rect spans width × fullHeight (price pane AND subpanes), so this
    // one handler covers everything. (The y-axis hit rect has its own dblclick —
    // a separate element, no conflict. The app's trade/trigger overlays sit
    // above this rect with pointer-events:all, so a double-click on one never
    // reaches here — intended.)
    //
    // The two mousedowns of a double-click each only ARM a pan (they never move
    // past the drag threshold), so each disarms on mouseup having panned nothing.
    overlay.on('dblclick', function (event: MouseEvent) {
      event.preventDefault();
      if (
        performance.now() - justPlacedAtRef.current <
        PLACEMENT_DBLCLICK_GUARD_MS
      ) {
        justPlacedAtRef.current = 0;
        return;
      }
      const root = rootGRef.current;
      const [mx, my] = root ? d3.pointer(event, root.node()) : [0, 0];
      const panel = panelTargetAt(mx, my);
      if (panel) openCenterPanelRef.current(panel);
    });

    // pointermove + pointerleave bind to the SVG root so they keep firing while
    // the cursor is over a trade overlay or one of its handles (those sit
    // above the bare-chart overlayRect in paint order and have
    // pointer-events: all). d3.pointer is anchored to rootG so coords stay
    // in the chart-inner coordinate space, identical to the previous
    // overlayRect-relative coords.
    const svgSel = d3.select(svgRef.current);
    svgSel
      .on('pointermove.crosshair', function (event: PointerEvent) {
        if (panDragging()) return;
        const wrapper = wrapperRef.current;
        // A shape is being dragged → keep the grabbing cursor, skip the crosshair.
        // Checked FIRST: a drag's draft phase is 'dragging' (not 'idle'), so the
        // tool/placement guard below would otherwise stomp the grabbing cursor.
        if (gestureRef.current.kind === 'drawingDrag') return;
        // Drawing tool active or a placement in flight → crosshair cursor and no
        // chart crosshair lines (the drawing layer owns the gesture).
        if (activeToolRef.current !== 'cursor' || draftRef.current.phase !== 'idle') {
          if (wrapper) wrapper.style.cursor = 'crosshair';
          return;
        }
        const root = rootGRef.current;
        if (!root) return;
        const [mx, my] = d3.pointer(event, root.node());
        // Hover affordance, resolved through the SAME `panelTargetAt` the
        // double-click uses, so a hand cursor always means "double-click edits
        // this". A drawing keeps the open hand — it is also draggable here, and
        // `grab` says both — while a candle or an indicator mark gets the
        // pointing hand. Anything else restores the default chart cursor.
        if (wrapper) {
          const panel = panelTargetAt(mx, my);
          wrapper.style.cursor = !panel
            ? ''
            : panel.kind === 'drawing'
              ? 'grab'
              : 'pointer';
        }
        crosshairLastPosRef.current = { mx, my };
        if (crosshairRafRef.current == null) {
          crosshairRafRef.current = requestAnimationFrame(updateCrosshair);
        }
      })
      .on('pointerleave.crosshair', function (event: PointerEvent) {
        if (panDragging()) return;
        // Drop any hover (open-hand) cursor when the pointer leaves the chart.
        if (gestureRef.current.kind !== 'drawingDrag' && wrapperRef.current)
          wrapperRef.current.style.cursor = '';
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
          (rt.closest('[data-chart-legend]') ||
            rt.closest('[data-chart-stats]') ||
            rt.closest('[data-chart-earnings]') ||
            rt.closest('[data-chart-drawtoolbar]'))
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
      overlay.on('pointerdown', null).on('dblclick', null);
      yAxisHitRectRef.current
        ?.on('pointerdown', null)
        .on('dblclick', null)
        .on('mouseenter', null)
        .on('mouseleave', null)
        .on('pointermove', null);
      svgSel.on('pointermove.crosshair', null).on('pointerleave.crosshair', null);
      if (crosshairRafRef.current != null) {
        cancelAnimationFrame(crosshairRafRef.current);
        crosshairRafRef.current = null;
      }
    };
  }, [scaleApi, placeAnchorAt, beginDragAt]);

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
        >
          <div
            ref={frameRef}
            className={bare ? styles.chartFrameBare : styles.chartFrame}
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
              infoBarHeight={INFO_BAR_HEIGHT}
              barCount={dataLength}
              expanded={infoBarExpanded}
              onExpandedChange={onInfoBarExpandedChange}
              subscribeHoverIndex={subscribeHoverIndex}
              priceFormatter={fmtPrice}
              resolveColor={(v) => colorResolverRef.current?.resolve(v) ?? FALLBACK_COLOR}
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
                  onPointerCancel={onDividerPointerCancel}
                >
                  <span className={styles.subpaneDividerLine} />
                </div>
              );
            })}
          {layout != null && statsEnabled !== false && statsModel && dataLength > 0 && (
            <StatsPanel
              model={statsModel}
              size={statsSize}
              pane={{
                left: MARGIN.left,
                top: MARGIN.top,
                width: layout.width,
                height: layout.priceHeight,
              }}
              position={normalizedStatsPosition}
              onPositionChange={onStatsPositionChange}
            />
          )}
          {layout != null && earningsEnabled && earningsModel && dataLength > 0 && (
            <EarningsPanel
              model={earningsModel}
              size={statsSize}
              pane={{
                left: MARGIN.left,
                top: MARGIN.top,
                width: layout.width,
                height: layout.priceHeight,
              }}
              position={normalizedEarningsPosition}
              onPositionChange={onEarningsPositionChange}
            />
          )}
          {layout != null && drawToolbarEnabled && onActiveDrawingToolChange && (
            <DrawToolbar
              activeTool={activeDrawingTool}
              onToolChange={onActiveDrawingToolChange}
              drawingCount={drawings?.length ?? 0}
              onDeleteAll={
                onDrawingsChange ? () => onDrawingsChange([]) : undefined
              }
              pane={{
                left: MARGIN.left,
                top: MARGIN.top,
                width: layout.width,
                height: layout.priceHeight,
              }}
              position={normalizedDrawToolbarPosition}
              onPositionChange={onDrawToolbarPositionChange}
            />
          )}
          {priceBottomPx > 0 && (
            <button
              type="button"
              data-chart-native-menu=""
              className={`${styles.resetPanBtn} ${panOffset === 0 ? styles.resetPanBtnInactive : ''}`}
              title="Reset pan"
              onClick={() => onPanOffsetChange(0)}
              disabled={panOffset === 0}
              style={{ bottom: MARGIN.bottom + 2, right: MARGIN.right + 2 }}
            >
              <RotateCcw size={14} />
            </button>
          )}
          {priceBottomPx > 0 && showAutoFitBtn && (
            <button
              type="button"
              ref={autoFitBtnRef}
              data-chart-native-menu=""
              className={`${styles.autoFitBtn} ${isAutoFit ? styles.autoFitBtnActive : ''}`}
              title={
                !isAutoFit
                  ? 'Auto-fit price scale (off — drag y-axis to enable)'
                  : autoFitMode === 'priceAndOverlays'
                    ? 'Auto-fit: price + overlays (click for price-only)'
                    : 'Auto-fit: price-only (click to include overlays)'
              }
              // The menu counts this button as "inside" via `autoFitBtnRef`, so
              // onContextMenu toggles it cleanly. (Old `onMouseDown
              // stopPropagation` guarded the removed mousedown listener.)
              onClick={() => {
                // A left-click changes mode/range, making the exclusion menu
                // stale — close it so it doesn't linger or pin the button.
                setAutoFitMenuOpen(false);
                if (!isAutoFit) {
                  setPriceView(null);
                  return;
                }
                onAutoFitModeChange(
                  autoFitMode === 'priceAndOverlays' ? 'price' : 'priceAndOverlays',
                );
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                // Menu only meaningful in price+overlays mode with auto-fit active.
                if (autoFitMode === 'priceAndOverlays' && isAutoFit)
                  setAutoFitMenuOpen((o) => !o);
              }}
              onMouseEnter={() => setAutoFitHovered(true)}
              onMouseLeave={() => setAutoFitHovered(false)}
              style={{
                bottom: MARGIN.bottom + 2,
                right: MARGIN.right - 26,
                color:
                  isAutoFit && autoFitMode === 'priceAndOverlays'
                    ? '#22c55e'
                    : undefined,
              }}
            >
              A
            </button>
          )}
          {autoFitMenuOpen &&
            autoFitMode === 'priceAndOverlays' &&
            isAutoFit && (
            <AutoFitMenu
              contributors={autoFitContributors}
              excluded={autoFitExcluded}
              onExcludedChange={onAutoFitExcludedChange}
              triggerRef={autoFitBtnRef}
              onClose={() => setAutoFitMenuOpen(false)}
              style={{
                bottom: MARGIN.bottom + 28,
                right: MARGIN.right - 26,
              }}
            />
          )}
          {/* Appearance gear — TradingView-faithful bottom-right axis-intersection
              corner (price gutter × date row). Only when the host can persist. */}
          {onAppearanceChange && (
            <>
              <button
                type="button"
                ref={settingsGearRef}
                data-chart-native-menu=""
                className={styles.settingsGearBtn}
                title="Chart settings"
                onClick={() => {
                  // Only one floating editor at a time.
                  setCenterPanel(null);
                  setSettingsOpen((o) => !o);
                }}
                style={{ right: 4, bottom: 4 }}
              >
                <Settings size={14} />
              </button>
              {settingsOpen && (
                <SettingsDialog
                  appearance={appearance ?? {}}
                  onAppearanceChange={onAppearanceChange}
                  resolveColor={(v) =>
                    colorResolverRef.current?.resolve(v) ?? FALLBACK_COLOR
                  }
                  triggerRef={settingsGearRef}
                  onClose={() => setSettingsOpen(false)}
                  style={{ right: MARGIN.right + 4, bottom: MARGIN.bottom + 4 }}
                />
              )}
            </>
          )}
          {/* Double-click editors, all centred over the chart wrapper. Rendered
              off `centerPanel`, never off selection — a single click on a
              drawing selects it and nothing more. */}
          {centerPanel?.kind === 'candles' && onAppearanceChange && (
            <CandleSettingsPopup
              appearance={appearance ?? {}}
              onAppearanceChange={onAppearanceChange}
              resolveColor={(v) =>
                colorResolverRef.current?.resolve(v) ?? FALLBACK_COLOR
              }
              onClose={closeCenterPanel}
              className={styles.centeredPanel}
            />
          )}
          {panelIndicator &&
            (() => {
              const def = getIndicator(panelIndicator.defKey);
              if (!def || (def.settingsSchema?.length ?? 0) === 0) return null;
              return (
                <IndicatorSettingsPopover
                  config={panelIndicator}
                  def={def}
                  onCommit={(key, value) =>
                    onIndicatorsChange(
                      withSettingOverride(
                        indicators,
                        panelIndicator.id,
                        key,
                        value,
                      ),
                    )
                  }
                  onReset={(key) =>
                    onIndicatorsChange(
                      withSettingsReset(indicators, panelIndicator.id, [key]),
                    )
                  }
                  onResetKeys={(keys) =>
                    keys.length > 0 &&
                    onIndicatorsChange(
                      withSettingsReset(indicators, panelIndicator.id, keys),
                    )
                  }
                  resolveColor={(v) =>
                    colorResolverRef.current?.resolve(v) ?? FALLBACK_COLOR
                  }
                  onClose={closeCenterPanel}
                  className={styles.centeredPanel}
                />
              );
            })()}
          {/* Per-drawing style popup. Only when the host can persist edits. */}
          {onDrawingsChange && panelDrawing && (
            <DrawingStylePopup
              shape={panelDrawing}
              onChange={(next) => commitDrawing(next)}
              onDelete={() => {
                onDrawingsChange(
                  effectiveDrawings.filter((s) => s.id !== panelDrawing.id),
                );
                selectDrawing(null);
                closeCenterPanel();
              }}
              resolveColor={(v) =>
                colorResolverRef.current?.resolve(v) ?? FALLBACK_COLOR
              }
              onClose={closeCenterPanel}
              className={styles.centeredPanel}
            />
          )}
          {children}
          </div>
        </div>
      </ChartOverlayProvider>
    </ChartScaleProvider>
  );
};

export default React.memo(Chart);
