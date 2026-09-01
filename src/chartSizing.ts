// ---------------------------------------------------------------------------
// Pure chart-sizing decision, extracted from Chart's `layout` memo so it can be
// unit tested without a DOM. This is the single source of truth for "how big is
// the chart" and "should we draw at all":
//
//  - The chart is a pure function of its box. A provided `propWidth`/`propHeight`
//    overrides the measured value for that axis (the TradingView `autoSize` +
//    explicit-size contract; also the SSR/jsdom path, where a container measures
//    0). Per-axis: `effective = prop ?? measured`.
//  - There is NO height floor. A shorter box makes a shorter chart, not a chart
//    drawn taller than its box and clipped (re-draw-to-fit, the ECharts/Highcharts/
//    TradingView behaviour). `totalHeight` is just `effectiveHeight − vertical
//    margins`, so `svgHeight (= totalHeight + margins)` equals the box height and
//    nothing can overflow.
//  - `Math.max(1, …)` on width/height is only a NaN/collapsed-box arithmetic
//    backstop — never a 300px overflow floor.
//  - The real guard is `draw`: false while an axis is unmeasured (either effective
//    dimension is 0) OR the usable plot area is too small to place a single bar
//    (`effectiveWidth − margin.right − rightBuffer ≤ 0`, i.e. width < ~78px). In
//    the too-small case `tooSmall` is set so the caller can emit a dev warning
//    ("give the chart a real size") rather than drawing a 1px sliver.
// ---------------------------------------------------------------------------

export type ChartMargin = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type ChartSizing = {
  /** Plot width = effectiveWidth − left − right margins (clamped ≥ 1). */
  width: number;
  /** The box height the chart fills = effectiveHeight. */
  height: number;
  /** Drawing height = effectiveHeight − top − bottom margins (clamped ≥ 1). */
  totalHeight: number;
  /** True when the box is measured AND large enough to draw at least one bar. */
  draw: boolean;
  /** True when measured but too narrow to place a single bar (caller warns). */
  tooSmall: boolean;
};

export function resolveChartSizing(params: {
  propWidth?: number;
  propHeight?: number;
  measuredWidth: number;
  measuredHeight: number;
  margin: ChartMargin;
  rightBuffer: number;
}): ChartSizing {
  const { propWidth, propHeight, measuredWidth, measuredHeight, margin, rightBuffer } =
    params;
  const effectiveWidth = propWidth ?? measuredWidth;
  const effectiveHeight = propHeight ?? measuredHeight;

  const unmeasured = effectiveWidth === 0 || effectiveHeight === 0;
  // Usable plot area for bars, after the y-axis gutter (right margin) and the
  // fixed right buffer. ≤ 0 ⇒ not enough room for a single bar.
  const usableWidth = effectiveWidth - margin.right - rightBuffer;
  const tooSmall = !unmeasured && usableWidth <= 0;
  const draw = !unmeasured && !tooSmall;

  const width = Math.max(1, effectiveWidth - margin.left - margin.right);
  const totalHeight = Math.max(1, effectiveHeight - margin.top - margin.bottom);

  return { width, height: effectiveHeight, totalHeight, draw, tooSmall };
}
