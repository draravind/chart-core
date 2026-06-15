import type { DrawingShape } from '../types';
import type { DrawCtx, DrawLayers, DrawnHit } from './_shared';
import { renderTrendline } from './trendline';
import { renderRay } from './ray';
import { renderHLine } from './hline';
import { renderVLine } from './vline';
import { renderHRay } from './hray';
import { renderRuler } from './ruler';
import { renderText } from './text';

export type { DrawLayers, DrawCtx, DrawnHit } from './_shared';

// Dispatch a shape to its renderer; returns the hit closure for the mount's
// manual hit-testing. Unknown types (forward-compat payloads that survived
// `normalizeDrawing`) draw nothing and never hit.
export function drawDrawing(
  shape: DrawingShape,
  layers: DrawLayers,
  ctx: DrawCtx,
): DrawnHit {
  switch (shape.type) {
    case 'trendline':
      return renderTrendline(shape, layers, ctx);
    case 'ray':
      return renderRay(shape, layers, ctx);
    case 'hline':
      return renderHLine(shape, layers, ctx);
    case 'vline':
      return renderVLine(shape, layers, ctx);
    case 'hray':
      return renderHRay(shape, layers, ctx);
    case 'ruler':
      return renderRuler(shape, layers, ctx);
    case 'text':
      return renderText(shape, layers, ctx);
    default:
      return () => null;
  }
}
