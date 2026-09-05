import { useEffect, useState } from 'react';
import { Chart, ChartControls, ZoomSlider, defaultConfigFor } from '../src/index';
import type {
  AppearanceOverrides,
  AutoFitMode,
  Candle,
  ChartType,
  DrawingShape,
  DrawingTool,
  IndicatorConfig,
  RangeMark,
} from '../src/index';
import { SYMBOLS, DEFAULT_SYMBOL } from './data/symbols';
import { loadBars } from './data/loadBars';
import {
  SAMPLE_PATTERNS,
  SAMPLE_QUARTERS,
  SAMPLE_STATS,
  SAMPLE_FREE_FLOAT_PERCENT,
} from './data/fixtures';
import { CHART_BOX_WIDTH, CHART_BOX_HEIGHT } from './layout';

// Four EMAs (10/20/50/200) + volume — the trading app's default indicator set
// (useChartSettings.ts DEFAULT_INDICATORS). The distinct `id`s are load-bearing:
// four id-less EMAs would collide on id:'ti:ema', so double-click-to-edit and
// settings edits would target the wrong instance. Volume is seeded separately so
// a subpane (and its divider) always exists.
function seedIndicators(): IndicatorConfig[] {
  const emas = [10, 20, 50, 200].map((period) =>
    defaultConfigFor('ti:ema', {
      id: `default-ema${period}`,
      enabled: true,
      settingsOverrides: { period },
    }),
  );
  const volume = defaultConfigFor('volume', { enabled: true });
  return [...emas, volume].filter((c): c is IndicatorConfig => Boolean(c));
}

export function App() {
  const [symbol, setSymbol] = useState<string>(DEFAULT_SYMBOL);
  const [bars, setBars] = useState<Candle[] | null>(null);

  const [visibleBars, setVisibleBars] = useState(252);
  const [panOffset, setPanOffset] = useState(0);
  const [chartType, setChartType] = useState<ChartType>('candlestick');
  const [indicators, setIndicators] = useState<IndicatorConfig[]>(seedIndicators);
  const [autoFitMode, setAutoFitMode] = useState<AutoFitMode>('priceAndOverlays');
  const [autoFitExcluded, setAutoFitExcluded] = useState<string[]>([]);
  const [infoBarExpanded, setInfoBarExpanded] = useState(true);
  const [patternsEnabled, setPatternsEnabled] = useState(true);
  const [statsEnabled, setStatsEnabled] = useState(false);
  const [earningsEnabled, setEarningsEnabled] = useState(false);
  const [activeDrawingTool, setActiveDrawingTool] = useState<DrawingTool>('cursor');
  const [drawings, setDrawings] = useState<DrawingShape[]>([]);
  const [appearance, setAppearance] = useState<AppearanceOverrides>({});
  const [subpaneHeights, setSubpaneHeights] = useState<Record<string, number> | null>(
    null,
  );

  // Cap + range ladder plumbed back from Chart so the ZoomSlider renders the
  // right marks (the easiest thing to leave unwired). Seeded to sane values so
  // the slider is sensible before the first measure lands.
  const [maxVisibleBars, setMaxVisibleBars] = useState(252);
  const [rangeMarks, setRangeMarks] = useState<RangeMark[]>([]);

  // Load the selected symbol's bars, guarding against out-of-order resolution.
  // Render the chart box always (so its measured size never flickers); the
  // <Chart> mounts only once bars arrive. Switching symbol resets pan to latest.
  useEffect(() => {
    let cancelled = false;
    setBars(null);
    setPanOffset(0);
    loadBars(symbol).then((next) => {
      if (!cancelled) setBars(next);
    });
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  const isDefaultSymbol = symbol === DEFAULT_SYMBOL;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: 12,
        minHeight: '100vh',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <select
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          style={{ padding: '4px 8px', background: '#222', color: '#ddd', border: '1px solid #444' }}
        >
          {SYMBOLS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <ChartControls
          chartType={chartType}
          onChartTypeChange={setChartType}
          indicators={indicators}
          onIndicatorsChange={setIndicators}
          patternsEnabled={patternsEnabled}
          onPatternsToggle={() => setPatternsEnabled((v) => !v)}
          statsEnabled={statsEnabled}
          onStatsToggle={() => setStatsEnabled((v) => !v)}
          earningsEnabled={earningsEnabled}
          onEarningsToggle={() => setEarningsEnabled((v) => !v)}
        />
        <div style={{ minWidth: 220 }}>
          <ZoomSlider
            visibleBars={visibleBars}
            onVisibleBarsChange={setVisibleBars}
            maxVisibleBars={maxVisibleBars}
            marks={rangeMarks.length ? rangeMarks : undefined}
            onPanReset={() => setPanOffset(0)}
          />
        </div>
      </div>

      <div style={{ width: CHART_BOX_WIDTH, height: CHART_BOX_HEIGHT, position: 'relative' }}>
        {bars ? (
          <Chart
            data={bars}
            visibleBars={visibleBars}
            onVisibleBarsChange={setVisibleBars}
            onMaxVisibleBarsChange={setMaxVisibleBars}
            onRangeMarksChange={setRangeMarks}
            panOffset={panOffset}
            onPanOffsetChange={setPanOffset}
            chartType={chartType}
            indicators={indicators}
            onIndicatorsChange={setIndicators}
            autoFitMode={autoFitMode}
            onAutoFitModeChange={setAutoFitMode}
            autoFitExcluded={autoFitExcluded}
            onAutoFitExcludedChange={setAutoFitExcluded}
            infoBarExpanded={infoBarExpanded}
            onInfoBarExpandedChange={setInfoBarExpanded}
            symbol={symbol}
            quarterlyResults={isDefaultSymbol ? SAMPLE_QUARTERS : undefined}
            patterns={isDefaultSymbol ? SAMPLE_PATTERNS : undefined}
            patternsEnabled={patternsEnabled}
            statsEnabled={statsEnabled}
            statsTable={isDefaultSymbol ? SAMPLE_STATS : undefined}
            earningsEnabled={earningsEnabled}
            earningsResults={isDefaultSymbol ? SAMPLE_QUARTERS : undefined}
            earningsFreeFloatPercent={SAMPLE_FREE_FLOAT_PERCENT}
            appearance={appearance}
            onAppearanceChange={setAppearance}
            drawings={drawings}
            onDrawingsChange={setDrawings}
            activeDrawingTool={activeDrawingTool}
            onActiveDrawingToolChange={setActiveDrawingTool}
            drawToolbarEnabled
            subpaneHeights={subpaneHeights}
            onSubpaneHeightsChange={setSubpaneHeights}
          />
        ) : (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#888',
            }}
          >
            loading {symbol}…
          </div>
        )}
      </div>
    </div>
  );
}
