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

// Date <-> bar-index helpers. Trade/trigger overlay hooks need these to map
// between a calendar date and a positional bar index; exported here so
// consumers never deep-import './utils/dateBarIndex'.
export { barIndexForDate, dateForBarIndex } from './utils/dateBarIndex';

// Stable, hashed class name for the reset-pan button. Overlay plugins that
// render their own reset button reuse this so it inherits chart-core's styling
// (the hashed class lives in the bundled style.css). Default-import-then-
// re-export is the only Vite-baseline-supported shape: the ambient
// `*.module.css` type only declares a default export, so a named import here
// would be config-dependent and fail to type-check.
import chartStyles from './Chart.module.css';
export const panButtonClass: string = chartStyles.resetPanBtn;

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
export type { RsParams } from './indicators/builtins/rsLine';

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
