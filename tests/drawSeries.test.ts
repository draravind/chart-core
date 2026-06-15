import { describe, it, expect } from 'vitest';
import * as d3 from 'd3';
import { barSegments } from '../src/utils/drawSeries';

// Log price scale mirroring the chart's yPrice mapping.
const yPrice = d3.scaleLog().domain([10, 1000]).range([400, 0]);

describe('barSegments', () => {
  for (const [x0, bandwidth] of [
    [12, 8],
    [137, 5],
    [0, 11],
  ] as const) {
    describe(`x0=${x0} bandwidth=${bandwidth}`, () => {
      it('joins open tick to stem bottom when open == low', () => {
        const seg = barSegments(
          { open: 100, high: 250, low: 100, close: 200 },
          x0,
          bandwidth,
          yPrice,
        );
        expect(seg.openTick.y).toBe(seg.stem.yLow);
      });

      it('joins open tick to stem top when open == high', () => {
        const seg = barSegments(
          { open: 250, high: 250, low: 100, close: 200 },
          x0,
          bandwidth,
          yPrice,
        );
        expect(seg.openTick.y).toBe(seg.stem.yHigh);
      });

      it('joins close tick to stem bottom when close == low', () => {
        const seg = barSegments(
          { open: 200, high: 250, low: 100, close: 100 },
          x0,
          bandwidth,
          yPrice,
        );
        expect(seg.closeTick.y).toBe(seg.stem.yLow);
      });

      it('joins close tick to stem top when close == high', () => {
        const seg = barSegments(
          { open: 200, high: 250, low: 100, close: 250 },
          x0,
          bandwidth,
          yPrice,
        );
        expect(seg.closeTick.y).toBe(seg.stem.yHigh);
      });

      it('ticks meet the stem center horizontally', () => {
        const seg = barSegments(
          { open: 150, high: 250, low: 100, close: 200 },
          x0,
          bandwidth,
          yPrice,
        );
        expect(seg.openTick.x1).toBe(seg.stem.x);
        expect(seg.closeTick.x0).toBe(seg.stem.x);
      });

      it('ticks span the full band', () => {
        const seg = barSegments(
          { open: 150, high: 250, low: 100, close: 200 },
          x0,
          bandwidth,
          yPrice,
        );
        expect(seg.openTick.x0).toBe(x0);
        expect(seg.closeTick.x1).toBe(x0 + bandwidth);
      });

      it('doji: open == close keeps both ticks at the same y', () => {
        const seg = barSegments(
          { open: 175, high: 250, low: 100, close: 175 },
          x0,
          bandwidth,
          yPrice,
        );
        expect(seg.openTick.y).toBe(seg.closeTick.y);
      });
    });
  }
});
