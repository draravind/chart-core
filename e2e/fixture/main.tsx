import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Chart, useChartScale, defaultConfigFor } from '../../src/index';
import type {
  IndicatorConfig,
  DrawingShape,
  DrawingTool,
  AutoFitMode,
  AppearanceOverrides,
} from '../../src/index';
import { DATA } from './data';

const CHART_W = 1200;
const CHART_H = 700;

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

  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: CHART_W,
          height: CHART_H,
        }}
      >
        <Chart
          data={DATA}
          width={CHART_W}
          height={CHART_H}
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
