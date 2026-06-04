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

export { default as Chart } from './Chart';
export {
  useChartScale,
  useChartOverlayHost,
  useChartGeometry,
  useReportOverlayPriceBounds,
  useBackgroundPointerDown,
  type ChartOverlayLayer,
} from './context';
