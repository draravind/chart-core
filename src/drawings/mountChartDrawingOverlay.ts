import * as d3 from 'd3';

import type { Candle } from '../types';
import type { DrawingAnchor, DrawingShape } from './types';
import { buildDrawing, clicksFor, type DraftState } from './interaction';
import type { Hit } from './hitTest';
import type { ProjScale } from './projection';
import { drawDrawing, type DrawLayers, type DrawnHit } from './renderers';

// Mirrors `mountChartPatternOverlay`: a D3 handle `Chart` mounts once and drives
// from the same pan/rescale sites. Per-frame wipe-and-rebuild (drawing counts are
// tiny). Caches per-frame hit closures so `Chart`'s mousedown can hit-test
// without DOM event targets (all shapes are pointer-events: none).

export type DrawingScaleCtx = {
  xScale: d3.ScaleBand<number>;
  yPrice: d3.ScaleLogarithmic<number, number>;
  step: number;
  bandwidth: number;
  dataLength: number;
  width: number;
  priceHeight: number;
  data: Candle[];
  baseTranslateX: number;
};

export type DrawingOverlayCtx = DrawingScaleCtx & {
  drawings: DrawingShape[];
  draft: DraftState;
  draftPointer: DrawingAnchor | null;
  selectedId: string | null;
  marginTop: number;
  resolveColor: (expr: string) => string;
};

export type ChartDrawingOverlayHandle = {
  update(ctx: DrawingOverlayCtx): void;
  updateScales(s: DrawingScaleCtx): void;
  setTransform(translateX: number): void;
  setPointer(mx: number | null, my: number | null): void;
  // Viewport coords (chart-inner space). Returns the topmost hit drawing or null.
  hitTest(mx: number, my: number): { id: string; hit: Hit } | null;
  destroy(): void;
};

type HitEntry = { id: string; locked: boolean; hit: DrawnHit };

export function mountChartDrawingOverlay(
  parent: SVGGElement,
): ChartDrawingOverlayHandle {
  const root = d3.select(parent);

  // Layer 1 — clipped + x-panned: bodies of vline/trendline/ray/ruler.
  const panClip = root
    .append('g')
    .attr('class', 'chart-drawing-clip')
    .attr('clip-path', 'url(#chart-price-viewport)');
  const panG = panClip.append('g').attr('class', 'chart-drawing-pan') as d3.Selection<
    SVGGElement,
    unknown,
    null,
    undefined
  >;

  // Layer 2 — un-panned: hline bodies (full viewport width at a fixed price).
  const flatG = root.append('g').attr('class', 'chart-drawing-flat') as d3.Selection<
    SVGGElement,
    unknown,
    null,
    undefined
  >;

  // Layer 3 — unclipped + x-panned: endpoint handles, ruler chips, text boxes.
  const labelWrap = root.append('g').attr('class', 'chart-drawing-labels');
  const labelG = labelWrap.append('g').attr('class', 'chart-drawing-labels-pan') as d3.Selection<
    SVGGElement,
    unknown,
    null,
    undefined
  >;

  let lastCtx: DrawingOverlayCtx | null = null;
  let currentTranslateX = 0;
  let hitEntries: HitEntry[] = [];

  const setTransform = (translateX: number) => {
    currentTranslateX = translateX;
    panG.attr('transform', `translate(${translateX},0)`);
    labelG.attr('transform', `translate(${translateX},0)`);
  };

  const scaleFrom = (ctx: DrawingOverlayCtx): ProjScale => ({
    xScale: ctx.xScale,
    yPrice: ctx.yPrice,
    step: ctx.step,
    bandwidth: ctx.bandwidth,
    dataLength: ctx.dataLength,
    width: ctx.width,
    priceHeight: ctx.priceHeight,
    data: ctx.data,
  });

  const render = (ctx: DrawingOverlayCtx) => {
    panG.selectAll('*').remove();
    flatG.selectAll('*').remove();
    labelG.selectAll('*').remove();
    hitEntries = [];

    const s = scaleFrom(ctx);
    const layers: DrawLayers = { pan: panG, flat: flatG, label: labelG };

    // Draw non-selected first, the selection last so its handles paint on top.
    const ordered = [...ctx.drawings].sort((a, b) => {
      const sa = a.id === ctx.selectedId ? 1 : 0;
      const sb = b.id === ctx.selectedId ? 1 : 0;
      return sa - sb;
    });

    for (const shape of ordered) {
      const hit = drawDrawing(shape, layers, {
        s,
        resolveColor: ctx.resolveColor,
        selected: shape.id === ctx.selectedId,
      });
      hitEntries.push({ id: shape.id, locked: shape.locked === true, hit });
    }

    // In-flight placement preview (2-click tools): a→pointer rubber band.
    if (ctx.draft.phase === 'placing' && ctx.draftPointer) {
      const need = clicksFor(ctx.draft.tool);
      const anchors = [...ctx.draft.anchors];
      while (anchors.length < need) anchors.push(ctx.draftPointer);
      const preview = buildDrawing(ctx.draft.tool, anchors, '__draft__');
      drawDrawing(preview, layers, {
        s,
        resolveColor: ctx.resolveColor,
        selected: false,
      });
    }
  };

  const update = (ctx: DrawingOverlayCtx) => {
    lastCtx = ctx;
    currentTranslateX = ctx.baseTranslateX;
    setTransform(ctx.baseTranslateX);
    render(ctx);
  };

  const updateScales = (s: DrawingScaleCtx) => {
    if (!lastCtx) return;
    lastCtx = { ...lastCtx, ...s };
    currentTranslateX = s.baseTranslateX;
    setTransform(s.baseTranslateX);
    render(lastCtx);
  };

  const hitTest = (mx: number, my: number) => {
    // Topmost first (entries are in paint order; selection is last).
    for (let i = hitEntries.length - 1; i >= 0; i--) {
      const e = hitEntries[i];
      if (e.locked) continue;
      const hit = e.hit(mx, my, currentTranslateX);
      if (hit) return { id: e.id, hit };
    }
    return null;
  };

  const destroy = () => {
    panClip.remove();
    flatG.remove();
    labelWrap.remove();
  };

  return {
    update,
    updateScales,
    setTransform,
    setPointer: () => {},
    hitTest,
    destroy,
  };
}
