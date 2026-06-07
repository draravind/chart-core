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
  defaultConfigFor,
  SUBPANE_ORDER,
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
  SubpaneScaleHint,
  IndicatorInput,
  ResolvedIndicator,
} from './indicators/types';
export type { RsParams } from './indicators/builtins/rsLine';

// TA-Lib indicator library — pure compute primitives + per-indicator param types.
export {
  sma,
  wma,
  emaTalib,
  dema,
  tema,
  maDispatch,
  rsi,
  rawStochK,
  dx as computeDx,
  adx as computeAdx,
  atr as computeAtr,
  trueRange,
  stddevPop,
  rollingMin,
  rollingMax,
  wilderSmooth,
  wilderSum,
} from './indicators/talibMath';
export type { SmaParams } from './indicators/builtins/sma';
export type { EmaTalibParams } from './indicators/builtins/emaTalib';
export type { WmaParams } from './indicators/builtins/wma';
export type { DemaParams } from './indicators/builtins/dema';
export type { TemaParams } from './indicators/builtins/tema';
export type { BbandsParams } from './indicators/builtins/bbands';
export type { RsiParams } from './indicators/builtins/rsi';
export type { MacdParams } from './indicators/builtins/macd';
export type { StochParams } from './indicators/builtins/stoch';
export type { StochfParams } from './indicators/builtins/stochf';
export type { StochrsiParams } from './indicators/builtins/stochrsi';
export type { WillrParams } from './indicators/builtins/willr';
export type { AdxParams } from './indicators/builtins/adx';
export type { DxParams } from './indicators/builtins/dx';
export type { AtrParams } from './indicators/builtins/atr';
export type { NatrParams } from './indicators/builtins/natr';
export type { TrangeParams } from './indicators/builtins/trange';

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
