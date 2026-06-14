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
export { PATTERN_CATALOG, PATTERN_NAMES } from './patterns/catalog';
export type { PatternCatalogEntry } from './patterns/catalog';
export type {
  StatsTableData,
  StatsMarket,
  StatsPosition,
  StatsSize,
} from './stats/types';

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
  formatIndicatorParams,
  OVERLAY_ORDER,
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
  IndicatorPane,
  IndicatorInput,
  ResolvedIndicator,
  SettingsField,
  LegendRow,
  DomainSpec,
} from './indicators/types';
export type { RsSettings } from './indicators/builtins/rsLine';
export type { Stage2Settings } from './indicators/builtins/stage2';
export type { QuarterlyResultsSettings } from './indicators/builtins/quarterlyResults';

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
export type { SmaSettings } from './indicators/builtins/sma';
export type { EmaTalibSettings } from './indicators/builtins/emaTalib';
export type { WmaSettings } from './indicators/builtins/wma';
export type { DemaSettings } from './indicators/builtins/dema';
export type { TemaSettings } from './indicators/builtins/tema';
export type { BbandsSettings } from './indicators/builtins/bbands';
export type { RsiSettings } from './indicators/builtins/rsi';
export type { MacdSettings } from './indicators/builtins/macd';
export type { StochSettings } from './indicators/builtins/stoch';
export type { StochfSettings } from './indicators/builtins/stochf';
export type { StochrsiSettings } from './indicators/builtins/stochrsi';
export type { WillrSettings } from './indicators/builtins/willr';
export type { AdxSettings } from './indicators/builtins/adx';
export type { DxSettings } from './indicators/builtins/dx';
export type { AtrSettings } from './indicators/builtins/atr';
export type { NatrSettings } from './indicators/builtins/natr';
export type { TrangeSettings } from './indicators/builtins/trange';

// Appearance / theming framework — global user-editable chart visuals.
export type {
  ChartAppearance,
  AppearanceOverrides,
  PatternStyles,
  LabelStyle,
  BaseBreakoutStyle,
  ConsolidationStyle,
  HighTightFlagStyle,
  GapUpStyle,
  VolumeBreakoutStyle,
  GoldenCrossStyle,
  Nr7Style,
  UnusualVolumeStyle,
  VolumeDryupStyle,
  PocketPivotStyle,
  InsideDayStyle,
  PullbackToEmaStyle,
  DeepPartial,
} from './appearance/types';
export { APPEARANCE_DEFAULTS, effectiveAppearance } from './appearance/registry';
export { LINE_STYLE_OPTIONS, dashFor } from './indicators/settingsOptions';
export { lineStyleFrom } from './indicators/lineSettings';

export { default as ChartControls } from './controls/ChartControls';
export { default as SettingsDialog } from './controls/SettingsDialog';

export { default as Chart } from './Chart';
export {
  useChartScale,
  useChartOverlayHost,
  useChartGeometry,
  useReportOverlayPriceBounds,
  useBackgroundPointerDown,
  type ChartOverlayLayer,
} from './context';
