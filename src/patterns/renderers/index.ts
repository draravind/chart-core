import type * as d3 from 'd3';

import type { PatternMarker } from '../types';
import type { ChartPatternCtx } from '../mountChartPatternOverlay';
import { renderBaseBreakout } from './baseBreakout';
import { renderConsolidation } from './consolidation';
import { renderHighTightFlag } from './highTightFlag';
import { renderGapUp } from './gapUp';
import { renderVolumeBreakout } from './volumeBreakout';
import { renderGoldenCross } from './goldenCross';
import { renderNr7 } from './nr7';
import { renderUnusualVolume } from './unusualVolume';
import { renderVolumeDryup } from './volumeDryup';
import { renderPocketPivot } from './pocketPivot';
import { renderInsideDay } from './insideDay';
import { renderPullbackToEma } from './pullbackToEma';

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
  gap_up: renderGapUp,
  volume_breakout: renderVolumeBreakout,
  golden_cross: renderGoldenCross,
  nr7: renderNr7,
  unusual_volume: renderUnusualVolume,
  volume_dryup: renderVolumeDryup,
  pocket_pivot: renderPocketPivot,
  inside_day: renderInsideDay,
  pullback_to_ema: renderPullbackToEma,
};
