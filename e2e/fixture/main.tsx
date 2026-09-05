import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Chart, ChartControls, useChartScale, defaultConfigFor } from '../../src/index';
import type {
  IndicatorConfig,
  DrawingShape,
  DrawingTool,
  AutoFitMode,
  AppearanceOverrides,
  ChartContextMenuInfo,
  StatsPosition,
  LegacyStatsPosition,
  StatsSize,
  QuarterlyResult,
} from '../../src/index';
import { DATA } from './data';

const CHART_W = 1200;
const CHART_H = 700;

// Eight quarters ~91 days apart, each with EPS / revenue-per-share / net margin,
// so the Earnings box renders a full table (the box reads only this feed, not the
// bars). Values rise each quarter so YoY resolves once four quarters accumulate.
const EARNINGS: QuarterlyResult[] = Array.from({ length: 8 }, (_, i) => ({
  label: `Q${i}`,
  date: new Date(Date.UTC(2023, 0, 15) + i * 91 * 86_400_000)
    .toISOString()
    .slice(0, 10),
  eps: 10 + i,
  rps: 100 + i * 5,
  npm: 15,
}));

// A stored value the fixture can seed that no reader can parse — the spec proves
// an unreadable (or newer) stored value falls back to the default and is never
// overwritten. Not assignable to the Chart prop's type, hence the cast below.
type StoredStats = StatsPosition | LegacyStatsPosition | { x: string } | null;

// Reads the live, mutated-in-place scale API through the public overlay hook and
// mirrors the geometry the specs need (step/width/priceHeight/visibleStartIdx +
// the price-view domain) into a hidden DOM node, refreshed every frame so pans,
// rescales and resets are all observable. Rendered as a <Chart> child so it sits
// inside the ChartScaleProvider.
function ScaleProbe() {
  const api = useChartScale();
  const nodeRef = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    let raf = 0;
    let last = '';
    const tick = () => {
      const [lo, hi] = api.yPrice.domain();
      const snap = JSON.stringify({
        step: api.step,
        bandwidth: api.bandwidth,
        width: api.width,
        priceHeight: api.priceHeight,
        visibleStartIdx: api.visibleStartIdx,
        visibleBarsInt: api.visibleBarsInt,
        maxVisibleBars: api.maxVisibleBars,
        priceDomain: [lo, hi],
      });
      if (snap !== last && nodeRef.current) {
        nodeRef.current.textContent = snap;
        last = snap;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [api]);
  return <span data-testid="scale" ref={nodeRef} />;
}

const TOOLS: DrawingTool[] = [
  'cursor',
  'trendline',
  'hline',
  'vline',
  'ray',
  'hray',
  'text',
  'ruler',
];

function App() {
  const [panOffset, setPanOffset] = useState(0);
  const [visibleBars, setVisibleBars] = useState(120);
  // Chart box size the stats specs drive (resize → re-anchor). State, not consts.
  const [chartW, setChartW] = useState(CHART_W);
  const [chartH, setChartH] = useState(CHART_H);
  // Stats panel: off by default so the five existing specs keep today's DOM.
  const [statsEnabled, setStatsEnabled] = useState(false);
  const [statsSize, setStatsSize] = useState<StatsSize>('small');
  const [statsPosition, setStatsPosition] = useState<StoredStats>(null);
  const statsChanges = useRef(0);
  const [statsChangeCount, setStatsChangeCount] = useState(0);
  // Earnings box: off by default (driven by the ChartControls "Earnings" button
  // below), position + change-count exposed the way the stats box exposes its own.
  const [earningsEnabled, setEarningsEnabled] = useState(false);
  // Whether the earnings feed has arrived. Starts true; a spec drops it to []
  // BEFORE enabling the box, then restores it, to reproduce the real cold-load
  // path — the box's model is empty until an async feed lands, so its measured
  // div mounts only on a LATER render (a mount a one-shot effect would miss).
  const [earningsHasData, setEarningsHasData] = useState(true);
  const [earningsPosition, setEarningsPosition] = useState<StatsPosition | null>(
    null,
  );
  const earningsChanges = useRef(0);
  const [earningsChangeCount, setEarningsChangeCount] = useState(0);
  const [drawings, setDrawings] = useState<DrawingShape[]>([]);
  const [activeDrawingTool, setActiveDrawingTool] =
    useState<DrawingTool>('cursor');
  const [subpaneHeights, setSubpaneHeights] = useState<Record<
    string,
    number
  > | null>(null);
  const [appearance, setAppearance] = useState<AppearanceOverrides>({});
  const [autoFitMode, setAutoFitMode] =
    useState<AutoFitMode>('priceAndOverlays');
  const [infoBarExpanded, setInfoBarExpanded] = useState(true);
  // Volume seeded on so a subpane (and its divider) always exist.
  const [indicators, setIndicators] = useState<IndicatorConfig[]>(() => {
    const v = defaultConfigFor('volume', { enabled: true });
    return v ? [v] : [];
  });

  const drawingsChanges = useRef(0);
  const subpaneChanges = useRef(0);
  const [drawingsChangeCount, setDrawingsChangeCount] = useState(0);
  const [subpaneChangeCount, setSubpaneChangeCount] = useState(0);

  // Right-click report. `?noctx` mounts the chart WITHOUT the prop so the "no
  // handler ⇒ native menu (defaultPrevented===false)" case has a route.
  const noCtx = new URLSearchParams(location.search).has('noctx');
  const ctxFires = useRef(0);
  const [ctxPayload, setCtxPayload] = useState('');
  const [ctxFireCount, setCtxFireCount] = useState(0);
  const onCtx = (info: ChartContextMenuInfo) => {
    ctxFires.current += 1;
    setCtxFireCount(ctxFires.current);
    setCtxPayload(JSON.stringify(info));
  };

  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: chartW,
          height: chartH,
        }}
      >
        <Chart
          data={DATA}
          width={chartW}
          height={chartH}
          visibleBars={visibleBars}
          onVisibleBarsChange={setVisibleBars}
          panOffset={panOffset}
          onPanOffsetChange={setPanOffset}
          chartType="candlestick"
          indicators={indicators}
          onIndicatorsChange={setIndicators}
          autoFitMode={autoFitMode}
          onAutoFitModeChange={setAutoFitMode}
          autoFitExcluded={[]}
          onAutoFitExcludedChange={() => {}}
          infoBarExpanded={infoBarExpanded}
          onInfoBarExpandedChange={setInfoBarExpanded}
          symbol="DEMO"
          subpaneHeights={subpaneHeights}
          onSubpaneHeightsChange={(h) => {
            subpaneChanges.current += 1;
            setSubpaneChangeCount(subpaneChanges.current);
            setSubpaneHeights(h);
          }}
          drawings={drawings}
          onDrawingsChange={(next) => {
            drawingsChanges.current += 1;
            setDrawingsChangeCount(drawingsChanges.current);
            setDrawings(next);
          }}
          activeDrawingTool={activeDrawingTool}
          onActiveDrawingToolChange={setActiveDrawingTool}
          appearance={appearance}
          onAppearanceChange={setAppearance}
          onContextMenu={noCtx ? undefined : onCtx}
          statsEnabled={statsEnabled}
          statsSize={statsSize}
          statsPosition={statsPosition as StatsPosition | LegacyStatsPosition | null}
          onStatsPositionChange={(p) => {
            statsChanges.current += 1;
            setStatsChangeCount(statsChanges.current);
            setStatsPosition(p);
          }}
          earningsEnabled={earningsEnabled}
          earningsResults={earningsHasData ? EARNINGS : []}
          earningsFreeFloatPercent={45}
          earningsPosition={earningsPosition}
          onEarningsPositionChange={(p) => {
            earningsChanges.current += 1;
            setEarningsChangeCount(earningsChanges.current);
            setEarningsPosition(p);
          }}
        >
          <ScaleProbe />
        </Chart>
      </div>

      {/* Off-screen readouts + tool controls the specs drive. */}
      <div style={{ position: 'absolute', top: CHART_H + 4, left: 0 }}>
        <span data-testid="panOffset">{panOffset}</span>
        <span data-testid="visibleBars">{visibleBars}</span>
        <span data-testid="drawingsCount">{drawings.length}</span>
        <span data-testid="drawings">{JSON.stringify(drawings)}</span>
        <span data-testid="drawingsChangeCount">{drawingsChangeCount}</span>
        <span data-testid="activeTool">{activeDrawingTool}</span>
        <span data-testid="subpaneHeights">
          {JSON.stringify(subpaneHeights)}
        </span>
        <span data-testid="subpaneChangeCount">{subpaneChangeCount}</span>
        <span data-testid="ctxPayload">{ctxPayload}</span>
        <span data-testid="ctxFireCount">{ctxFireCount}</span>
        <span data-testid="statsPosition">{JSON.stringify(statsPosition)}</span>
        <span data-testid="statsChangeCount">{statsChangeCount}</span>
        <span data-testid="earningsPosition">
          {JSON.stringify(earningsPosition)}
        </span>
        <span data-testid="earningsChangeCount">{earningsChangeCount}</span>
        <button
          data-testid="earnings-data"
          onClick={() => setEarningsHasData((v) => !v)}
        >
          toggle-feed
        </button>
        {/* Real ChartControls so a spec drives the actual "Earnings" toggle
            button (which lives in ChartControls, not the fixture). */}
        <ChartControls
          chartType="candlestick"
          onChartTypeChange={() => {}}
          indicators={indicators}
          onIndicatorsChange={setIndicators}
          patternsEnabled={false}
          onPatternsToggle={() => {}}
          statsEnabled={statsEnabled}
          onStatsToggle={() => setStatsEnabled((v) => !v)}
          earningsEnabled={earningsEnabled}
          onEarningsToggle={() => setEarningsEnabled((v) => !v)}
        />
        <div>
          <button
            data-testid="stats-toggle"
            onClick={() => setStatsEnabled((v) => !v)}
          >
            stats
          </button>
          <button data-testid="shrink-width" onClick={() => setChartW(900)}>
            shrink-w
          </button>
          <button data-testid="shrink-height" onClick={() => setChartH(500)}>
            shrink-h
          </button>
          <button data-testid="tiny-width" onClick={() => setChartW(50)}>
            tiny-w
          </button>
          <button
            data-testid="restore-size"
            onClick={() => {
              setChartW(CHART_W);
              setChartH(CHART_H);
            }}
          >
            restore
          </button>
          <button
            data-testid="toggle-size"
            onClick={() =>
              setStatsSize((s) => (s === 'large' ? 'small' : 'large'))
            }
          >
            size
          </button>
          <button
            data-testid="seed-legacy"
            onClick={() => setStatsPosition({ x: 1000, y: 600 })}
          >
            legacy
          </button>
          <button
            data-testid="seed-bad"
            onClick={() => setStatsPosition({ x: 'a' })}
          >
            bad
          </button>
        </div>
        <div>
          {TOOLS.map((t) => (
            <button
              key={t}
              data-testid={`tool-${t}`}
              onClick={() => setActiveDrawingTool(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
