import type * as d3 from 'd3';

import type { PatternMarker } from '../types';
import type { ChartPatternCtx } from '../mountChartPatternOverlay';
import { renderBaseBreakout } from './baseBreakout';
import { renderConsolidation } from './consolidation';
import { renderHighTightFlag } from './highTightFlag';

export type RendererFn = (
  detection: PatternMarker,
  target: d3.Selection<SVGGElement, unknown, null, undefined>,
  labelTarget: d3.Selection<SVGGElement, unknown, null, undefined>,
  ctx: ChartPatternCtx,
) => void;

export const renderers: Record<string, RendererFn> = {
  high_tight_flag: renderHighTightFlag,
  base_breakout: renderBaseBreakout,
  consolidation: renderConsolidation,
};
