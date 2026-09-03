import { describe, it, expect } from 'vitest';
import { classifyChartRegion } from '../src/gestures/chartRegion';
import type { SubpaneBand } from '../src/indicators/subpaneLayout';

// A price pane of 300px with two stacked subpanes below it (volume 300→420,
// rsi 420→520). fullHeight = 520; width = 1140 (the gutter starts past it).
const WIDTH = 1140;
const PRICE_HEIGHT = 300;
const TWO_BANDS: SubpaneBand[] = [
  { key: 'volume', top: 300, bottom: 420, height: 120 },
  { key: 'rsi', top: 420, bottom: 520, height: 100 },
];
const FULL = 520;
const HALF = 4;

const at = (mx: number, my: number, over = { bands: TWO_BANDS, priceHeight: PRICE_HEIGHT, fullHeight: FULL }) =>
  classifyChartRegion({
    mx,
    my,
    width: WIDTH,
    priceHeight: over.priceHeight,
    fullHeight: over.fullHeight,
    bands: over.bands,
    dividerHalfPx: HALF,
  });

describe('classifyChartRegion — order + boundaries', () => {
  it('gutter starts one pixel past width', () => {
    expect(at(WIDTH, 100).kind).toBe('price');
    expect(at(WIDTH + 1, 100).kind).toBe('gutter');
  });

  it('time strip starts one pixel past fullHeight; the corner is time strip, not gutter', () => {
    expect(at(500, FULL).kind).toBe('subpane'); // === fullHeight is the lowest pane
    expect(at(500, FULL + 1).kind).toBe('none'); // time strip
    // Bottom-right corner: my>fullHeight wins over mx>width.
    expect(at(WIDTH + 40, FULL + 1).kind).toBe('none');
  });

  it('price pane covers my<0 and mx<0', () => {
    expect(at(200, -5).kind).toBe('price');
    expect(at(-5, 100).kind).toBe('price');
  });

  it('my===priceHeight: none with a subpane (divider strip), price with none', () => {
    expect(at(200, PRICE_HEIGHT).kind).toBe('none');
    const noSub = at(200, PRICE_HEIGHT, { bands: [], priceHeight: PRICE_HEIGHT, fullHeight: PRICE_HEIGHT });
    expect(noSub.kind).toBe('price');
  });

  it('divider edges are inclusive; one pixel further lands on the panes', () => {
    // The volume/rsi divider is at 420.
    expect(at(200, 420 - HALF).kind).toBe('none');
    expect(at(200, 420 + HALF).kind).toBe('none');
    expect(at(200, 420 - HALF - 1).kind).toBe('subpane'); // volume above
    expect(at(200, 420 + HALF + 1).kind).toBe('subpane'); // rsi below
    const above = at(200, 420 - HALF - 1);
    const below = at(200, 420 + HALF + 1);
    expect(above.kind === 'subpane' && above.key).toBe('volume');
    expect(below.kind === 'subpane' && below.key).toBe('rsi');
  });

  it('a fractional band top still resolves cleanly', () => {
    const bands: SubpaneBand[] = [
      { key: 'a', top: 220.5, bottom: 400, height: 179.5 },
    ];
    const over = { bands, priceHeight: 220.5, fullHeight: 400 };
    expect(at(200, 220, over).kind).toBe('none');
    expect(at(200, 221, over).kind).toBe('none');
    expect(at(200, 220.5 - (HALF + 1), over).kind).toBe('price');
    expect(at(200, 220.5 + (HALF + 1), over).kind).toBe('subpane');
  });

  it('empty and full plots classify the same pixel identically (no data arg)', () => {
    // A pixel deep in the price pane is 'price' whether or not bars exist —
    // region has no data dependence.
    expect(at(600, 150).kind).toBe('price');
  });

  it('a 1px sweep never yields undefined and only names real bands', () => {
    const keys = new Set(TWO_BANDS.map((b) => b.key));
    for (let my = -8; my <= FULL + 8; my++) {
      const r = at(400, my);
      expect(r).toBeDefined();
      expect(['price', 'subpane', 'gutter', 'none']).toContain(r.kind);
      if (r.kind === 'subpane') expect(keys.has(r.key)).toBe(true);
    }
  });

  it('a band shorter than the grab strip still classifies its own interior', () => {
    const bands: SubpaneBand[] = [
      { key: 'tiny', top: 300, bottom: 305, height: 5 },
    ];
    const over = { bands, priceHeight: 300, fullHeight: 305 };
    // Its interior (302.5) is within HALF of both edges → none is acceptable at
    // the edges, but the midpoint must still not throw and must be a valid kind.
    const r = at(200, 302.5, over);
    expect(['none', 'subpane']).toContain(r.kind);
  });
});
