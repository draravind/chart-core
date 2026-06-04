import type * as d3 from 'd3';

// Plan A shape — identical to the app's `EodBar` (services/api.ts), including the
// optional indicator columns, so `EodBar[]` flows into `Chart`'s `data: Candle[]`
// by structural compatibility with no rename and no cross-package import. Plan B
// slims this and drops the indicator columns.
export type Candle = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  ema10?: number;
  ema20?: number;
  ema50?: number;
  ema200?: number;
  high1y?: number;
  high2y?: number;
  high3y?: number;
  highAll?: number;
};

export type ChartType = 'candlestick' | 'bar';

export type Indicators = {
  ema10: boolean;
  ema20: boolean;
  ema50: boolean;
  ema200: boolean;
  highs: boolean;
  patterns: boolean;
};

export type AutoFitMode = 'price' | 'priceAndOverlays';

export type RangeKey = '3M' | '6M' | '1Y';
export const RANGES: RangeKey[] = ['3M', '6M', '1Y'];

// The published, app-readable scale/geometry API — today's `HandlerState`
// (StockChart.tsx) plus a reason-tagged subscriber list. The object identity is
// stable for a Chart instance; fields are mutated in place each time geometry is
// rebuilt. Plugins read fields on demand and subscribe for change notifications.
export type ChartScaleReason = 'pan' | 'rescale';

export type ChartScaleApi = {
  data: Candle[];
  xScale: d3.ScaleBand<number>;
  yPrice: d3.ScaleLogarithmic<number, number>;
  step: number;
  bandwidth: number;
  baseTranslateX: number;
  priceHeight: number;
  width: number;
  visibleBars: number;
  visibleBarsInt: number;
  visibleStartIdx: number;
  dataLength: number;
  indicators: Indicators;
  // 'pan'     -> high-frequency translate; plugin calls overlay.setTransform only.
  // 'rescale' -> geometry rebuilt; plugin calls overlay.updateScales (full positionAll).
  // The 'pan' notification fires SYNCHRONOUSLY inside the pan rAF so the plugin's
  // setTransform lands in the same frame as the chartGroup translate.
  subscribe(cb: (api: ChartScaleApi, reason: ChartScaleReason) => void): () => void;
};
