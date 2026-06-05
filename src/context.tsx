import { createContext, useContext } from 'react';
import * as d3 from 'd3';
import type { ChartScaleApi, ChartScaleReason } from './types';

// ---------------------------------------------------------------------------
// Scale API — imperative, ref-backed.
//
// A single stable object per Chart instance. Its fields are mutated in place
// whenever geometry is rebuilt (rescale) or the chart pans; plugins read fields
// on demand and subscribe for change notifications. This mirrors the old
// `handlerStateRef` exactly, with a subscriber Set bolted on so app-side
// overlay plugins can reposition without the engine importing them.
// ---------------------------------------------------------------------------

export function createChartScaleApi(): {
  api: ChartScaleApi;
  notify: (reason: ChartScaleReason) => void;
} {
  const subscribers = new Set<(api: ChartScaleApi, reason: ChartScaleReason) => void>();
  const api: ChartScaleApi = {
    data: [],
    xScale: d3.scaleBand<number>(),
    yPrice: d3.scaleLog<number, number>(),
    step: 0,
    bandwidth: 0,
    baseTranslateX: 0,
    priceHeight: 0,
    width: 0,
    visibleBars: 0,
    visibleBarsInt: 0,
    visibleStartIdx: 0,
    dataLength: 0,
    indicators: [],
    subscribe(cb) {
      subscribers.add(cb);
      return () => {
        subscribers.delete(cb);
      };
    },
  };
  const notify = (reason: ChartScaleReason) => {
    for (const cb of subscribers) cb(api, reason);
  };
  return { api, notify };
}

const ChartScaleContext = createContext<ChartScaleApi | null>(null);
export const ChartScaleProvider = ChartScaleContext.Provider;

export function useChartScale(): ChartScaleApi {
  const api = useContext(ChartScaleContext);
  if (!api) {
    throw new Error('useChartScale must be used within a <Chart> (ChartScaleProvider)');
  }
  return api;
}

// ---------------------------------------------------------------------------
// Overlay context — reactive.
//
// Publishes the trade/trigger host <g> elements as React state (set after the
// engine's structural effect mounts them, cleared on unmount). Plugins MUST
// gate their overlay mount on host availability, because React commits child
// (plugin) effects before the parent (Chart) effect that creates the hosts —
// a bare ref would read null. Also carries the geometry plugins need to place
// their floating toolbar buttons, and the price-bounds reporter that lets
// plugins contribute their overlay prices to the engine's auto-fit y-domain.
// ---------------------------------------------------------------------------

export type ChartOverlayLayer = 'trade' | 'trigger';

export type ChartOverlayContextValue = {
  tradeHost: SVGGElement | null;
  triggerHost: SVGGElement | null;
  priceBottomPx: number;
  marginRight: number;
  reportOverlayPriceBounds: (
    layer: ChartOverlayLayer,
    bounds: { min: number; max: number } | null,
  ) => void;
  // Fired when the user mousedowns on the bare chart background (pan-drag init).
  // Overlay plugins subscribe to clear their own selection, matching the old
  // single-component "click empty chart deselects overlays" behaviour.
  subscribeBackgroundPointerDown: (cb: () => void) => () => void;
};

const ChartOverlayContext = createContext<ChartOverlayContextValue | null>(null);
export const ChartOverlayProvider = ChartOverlayContext.Provider;

function useChartOverlayContext(): ChartOverlayContextValue {
  const ctx = useContext(ChartOverlayContext);
  if (!ctx) {
    throw new Error(
      'chart overlay hooks must be used within a <Chart> (ChartOverlayProvider)',
    );
  }
  return ctx;
}

/** The host <g> for the given layer, or null until the engine has mounted it. */
export function useChartOverlayHost(layer: ChartOverlayLayer): SVGGElement | null {
  const ctx = useChartOverlayContext();
  return layer === 'trade' ? ctx.tradeHost : ctx.triggerHost;
}

/** Geometry for placing floating toolbar buttons over the price area. */
export function useChartGeometry(): { priceBottomPx: number; marginRight: number } {
  const ctx = useChartOverlayContext();
  return { priceBottomPx: ctx.priceBottomPx, marginRight: ctx.marginRight };
}

/** Reporter for an overlay layer to contribute its price extent to auto-fit. */
export function useReportOverlayPriceBounds(): ChartOverlayContextValue['reportOverlayPriceBounds'] {
  return useChartOverlayContext().reportOverlayPriceBounds;
}

/** Subscribe to bare-chart background mousedowns (to clear overlay selection). */
export function useBackgroundPointerDown(): ChartOverlayContextValue['subscribeBackgroundPointerDown'] {
  return useChartOverlayContext().subscribeBackgroundPointerDown;
}
