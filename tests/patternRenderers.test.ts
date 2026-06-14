// @vitest-environment happy-dom
import { describe, it, expect, beforeAll } from 'vitest';
import * as d3 from 'd3';

import { renderers } from '../src/patterns/renderers';
import { APPEARANCE_DEFAULTS } from '../src/appearance/registry';
import type { PatternMarker } from '../src/patterns/types';
import type { ChartPatternCtx } from '../src/patterns/mountChartPatternOverlay';

const SVG_NS = 'http://www.w3.org/2000/svg';

// happy-dom doesn't implement getBBox; the chip helper measures text width with
// it. A fixed stub is enough for "does it paint without throwing" smoke tests.
beforeAll(() => {
  (
    globalThis as unknown as { SVGElement: { prototype: { getBBox?: unknown } } }
  ).SVGElement.prototype.getBBox = () => ({
    x: 0,
    y: 0,
    width: 24,
    height: 10,
  });
});

const bars = ['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04', '2026-01-05'].map(
  (date) => ({ date, open: 100, high: 103, low: 95, close: 101, volume: 1000 }),
) as unknown as ChartPatternCtx['bars'];

function makeCtx(): ChartPatternCtx {
  const n = bars.length;
  const width = 500;
  const priceHeight = 300;
  const xScale = d3
    .scaleBand<number>()
    .domain(d3.range(n))
    .range([0, width]);
  const yPrice = d3.scaleLog<number, number>().domain([90, 110]).range([priceHeight, 0]);
  return {
    detections: [],
    bars,
    xScale,
    yPrice,
    step: xScale.step(),
    bandwidth: xScale.bandwidth(),
    priceHeight,
    width,
    baseTranslateX: 0,
    dataLength: n,
    marginTop: 0,
    patternStyle: APPEARANCE_DEFAULTS.patterns,
    resolveColor: (expr: string) => expr,
  };
}

function freshG() {
  return d3.select(document.createElementNS(SVG_NS, 'g'));
}

type Case = {
  name: string;
  markers: Record<string, unknown>;
  // Minimum element counts the renderer must paint into `target`.
  targetSelectors: Record<string, number>;
};

const D = '2026-01-03';
const D2 = '2026-01-04';

const cases: Case[] = [
  {
    name: 'gap_up',
    markers: { gap_date: D, prev_high: 100, gap_low: 103, gap_pct: 3.0 },
    targetSelectors: { rect: 1 },
  },
  {
    name: 'volume_breakout',
    markers: { event_date: D, anchor_low: 95, volume_ratio: 3.4 },
    targetSelectors: { polygon: 1 },
  },
  {
    name: 'golden_cross',
    markers: { cross_date: D, cross_price: 99 },
    targetSelectors: { circle: 1 },
  },
  {
    name: 'nr7',
    markers: { event_date: D, bar_high: 102, bar_low: 100 },
    targetSelectors: { line: 2, polygon: 1 },
  },
  {
    name: 'unusual_volume',
    markers: { event_date: D, anchor_low: 95, volume_ratio: 2.5 },
    targetSelectors: { polygon: 1 },
  },
  {
    name: 'volume_dryup',
    markers: { event_date: D, anchor_low: 95, volume_ratio: 0.4 },
    targetSelectors: { polygon: 1 },
  },
  {
    name: 'pocket_pivot',
    markers: { event_date: D, anchor_low: 95 },
    targetSelectors: { polygon: 1 },
  },
  {
    name: 'inside_day',
    markers: {
      inside_date: D2,
      inside_high: 101,
      inside_low: 100,
      mother_date: D,
      mother_high: 103,
      mother_low: 99,
    },
    targetSelectors: { line: 2, rect: 1 },
  },
  {
    name: 'pullback_to_ema',
    markers: { event_date: D, ema_value: 98, ema_level: 'EMA 50' },
    targetSelectors: { line: 1, circle: 1 },
  },
];

describe('pattern renderers smoke test', () => {
  for (const c of cases) {
    it(`${c.name} paints without throwing`, () => {
      const ctx = makeCtx();
      const target = freshG();
      const labelTarget = freshG();
      const detection: PatternMarker = {
        pattern_name: c.name,
        detected_on: '2026-01-05',
        markers: c.markers,
      };
      const renderer = renderers[c.name];
      expect(renderer).toBeTypeOf('function');
      expect(() => renderer(detection, target, labelTarget, ctx)).not.toThrow();

      for (const [sel, min] of Object.entries(c.targetSelectors)) {
        expect(target.node()!.querySelectorAll(sel).length).toBeGreaterThanOrEqual(min);
      }
      // Every renderer appends a label chip (a <text> in the label layer).
      expect(labelTarget.node()!.querySelectorAll('text').length).toBeGreaterThanOrEqual(1);
    });
  }

  it('every registered renderer has a smoke case', () => {
    const NEW = cases.map((c) => c.name).sort();
    const expected = [
      'gap_up',
      'golden_cross',
      'inside_day',
      'nr7',
      'pocket_pivot',
      'pullback_to_ema',
      'unusual_volume',
      'volume_breakout',
      'volume_dryup',
    ];
    expect(NEW).toEqual(expected);
    for (const name of expected) expect(renderers[name]).toBeTypeOf('function');
  });
});
