import * as d3 from 'd3';

import type { Candle } from '../types';
import type { PatternMarker } from './types';
import { renderers } from './renderers';

export type ChartPatternCtx = {
  detections: PatternMarker[];
  bars: Candle[];
  xScale: d3.ScaleBand<number>;
  yPrice: d3.ScaleLogarithmic<number, number>;
  step: number;
  bandwidth: number;
  priceHeight: number;
  width: number;
  baseTranslateX: number;
  dataLength: number;
  marginTop: number;
};

export type ChartPatternScaleCtx = {
  xScale: d3.ScaleBand<number>;
  yPrice: d3.ScaleLogarithmic<number, number>;
  step: number;
  bandwidth: number;
  baseTranslateX: number;
  width: number;
  priceHeight: number;
  dataLength: number;
};

export type ChartPatternOverlayHandle = {
  update(ctx: ChartPatternCtx): void;
  updateScales(scaleCtx: ChartPatternScaleCtx): void;
  setTransform(translateX: number): void;
  destroy(): void;
};

const keyFor = (d: PatternMarker) => `${d.pattern_name}:${d.detected_on}`;

export function mountChartPatternOverlay(parent: SVGGElement): ChartPatternOverlayHandle {
  const root = d3.select(parent);
  // Mirror TradeOverlay/TriggerOverlay: clip-path on a static wrapper, the
  // pan transform on an inner group so clipping happens in chart user space.
  const clipWrapper = root
    .append('g')
    .attr('class', 'chart-pattern-overlay-clip')
    .attr('clip-path', 'url(#chart-price-viewport)') as d3.Selection<SVGGElement, unknown, null, undefined>;
  const outerG = clipWrapper
    .append('g')
    .attr('class', 'chart-pattern-overlay') as d3.Selection<SVGGElement, unknown, null, undefined>;
  // Labels paint in a sibling wrapper with NO clip-path, so chips can extend
  // past the price-viewport's right edge (e.g. into the y-axis margin) without
  // being cut off. Appended after clipWrapper so chips paint above shapes.
  const labelWrapper = root
    .append('g')
    .attr('class', 'chart-pattern-overlay-labels-clip') as d3.Selection<SVGGElement, unknown, null, undefined>;
  const labelOuterG = labelWrapper
    .append('g')
    .attr('class', 'chart-pattern-overlay-labels') as d3.Selection<SVGGElement, unknown, null, undefined>;

  let lastCtx: ChartPatternCtx | null = null;

  const setTransform = (translateX: number) => {
    outerG.attr('transform', `translate(${translateX},0)`);
    labelOuterG.attr('transform', `translate(${translateX},0)`);
  };

  const render = (ctx: ChartPatternCtx) => {
    const groups = outerG
      .selectAll<SVGGElement, PatternMarker>('g.chart-pattern-detection')
      .data(ctx.detections, keyFor);

    groups.exit().remove();

    const entered = groups
      .enter()
      .append('g')
      .attr('class', 'chart-pattern-detection')
      .style('pointer-events', 'none');

    const all = entered.merge(groups);

    const labelGroups = labelOuterG
      .selectAll<SVGGElement, PatternMarker>('g.chart-pattern-label-detection')
      .data(ctx.detections, keyFor);

    labelGroups.exit().remove();

    const labelEntered = labelGroups
      .enter()
      .append('g')
      .attr('class', 'chart-pattern-label-detection')
      .style('pointer-events', 'none');

    const allLabels = labelEntered.merge(labelGroups);

    all.each(function (detection, i) {
      const target = d3.select<SVGGElement, unknown>(this);
      const labelTarget = d3.select<SVGGElement, unknown>(allLabels.nodes()[i] as SVGGElement);
      // Wipe per-frame contents and let the renderer rebuild — simpler than
      // diffing the inner shapes, and detection counts per symbol are tiny.
      target.selectAll('*').remove();
      labelTarget.selectAll('*').remove();
      const renderer = renderers[detection.pattern_name];
      renderer?.(detection, target, labelTarget, ctx);
    });
  };

  const update = (ctx: ChartPatternCtx) => {
    render(ctx);
    lastCtx = ctx;
  };

  const updateScales = (scaleCtx: ChartPatternScaleCtx) => {
    if (!lastCtx) return;
    lastCtx.xScale = scaleCtx.xScale;
    lastCtx.yPrice = scaleCtx.yPrice;
    lastCtx.step = scaleCtx.step;
    lastCtx.bandwidth = scaleCtx.bandwidth;
    lastCtx.baseTranslateX = scaleCtx.baseTranslateX;
    lastCtx.width = scaleCtx.width;
    lastCtx.priceHeight = scaleCtx.priceHeight;
    lastCtx.dataLength = scaleCtx.dataLength;
    setTransform(scaleCtx.baseTranslateX);
    render(lastCtx);
  };

  const destroy = () => {
    clipWrapper.remove();
    labelWrapper.remove();
  };

  return { update, updateScales, setTransform, destroy };
}
