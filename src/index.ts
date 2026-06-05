export * from './types';
// chartCalculations also declares a structurally-identical `RangeKey`; the
// canonical one is re-exported from ./types above, so it is omitted here to
// avoid an ambiguous barrel re-export.
export {
  RANGE_DAYS,
  formatPrice,
  formatVolume,
  formatVolumeTick,
  computeVolumeStats,
} from './utils/chartCalculations';
export type { VolumeLabel, VolumeStats } from './utils/chartCalculations';
export type { PatternMarker } from './patterns/types';

// Pillar 3 — indicator framework.
export {
  registerIndicator,
  getIndicator,
  listIndicators,
} from './indicators/registry';
export {
  computeEMA,
  computeRollingHigh,
  computeExpandingMax,
} from './indicators/compute';
export type {
  IndicatorDef,
  IndicatorConfig,
  IndicatorSeries,
  IndicatorStyle,
  IndicatorLineStyle,
  IndicatorPane,
  IndicatorInput,
  ResolvedIndicator,
} from './indicators/types';

export { default as ChartControls } from './controls/ChartControls';

export { default as Chart } from './Chart';
export {
  useChartScale,
  useChartOverlayHost,
  useChartGeometry,
  useReportOverlayPriceBounds,
  useBackgroundPointerDown,
  type ChartOverlayLayer,
} from './context';
