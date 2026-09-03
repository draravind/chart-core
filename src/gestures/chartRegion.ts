import type { SubpaneBand } from '../indicators/subpaneLayout';

// Which surface of the plot a pixel falls on. Region depends ONLY on pixel
// position (no data / bar / scale args), so it is a pure function testable in
// node — modelled on `resolveChartSizing` in `src/chartSizing.ts`. Coordinates
// are rootG-space (origin at translate(MARGIN.left, MARGIN.top)): `my===0` is
// the top of the price pane, `my===priceHeight` the price↔subpane boundary,
// `my===fullHeight` the bottom of the lowest pane (the time strip sits below).
export type ChartRegion =
  | { kind: 'price' }
  | { kind: 'subpane'; key: string }
  | { kind: 'gutter' }
  | { kind: 'none' };

/**
 * Classify a rootG-space pointer into a plot region. Test order is significant
 * (see the numbered branches): the time strip is decided before the gutter so
 * the bottom-right corner reads as `none`, and divider grab strips are decided
 * geometrically before the panes so a right-click on a divider never lands on a
 * pane. `dividerHalfPx` is half the grab-strip height (handleH/2 = 4).
 */
export function classifyChartRegion(p: {
  mx: number;
  my: number;
  width: number;
  priceHeight: number;
  fullHeight: number;
  bands: SubpaneBand[];
  dividerHalfPx: number;
}): ChartRegion {
  const { mx, my, width, priceHeight, fullHeight, bands, dividerHalfPx } = p;

  // 1) Below the lowest pane → the time strip (incl. the bottom-right corner,
  //    so the strip wins over the gutter there).
  if (my > fullHeight) return { kind: 'none' };

  // 2) Right of the plot → the price-scale gutter column.
  if (mx > width) return { kind: 'gutter' };

  // 3) On a divider grab strip → none. Every subpane's `top` is a divider line
  //    (the first subpane's top === priceHeight covers the price↔subpane one);
  //    a purely geometric test, independent of the DOM event target.
  for (const b of bands) {
    if (Math.abs(my - b.top) <= dividerHalfPx) return { kind: 'none' };
  }

  // 4) Above the price↔subpane boundary → the price pane (incl. my < 0).
  if (my <= priceHeight) return { kind: 'price' };

  // 5) Otherwise the subpane whose band contains `my`. The lowest band claims
  //    its own bottom edge (=== fullHeight) so `my===fullHeight` reads as that
  //    pane, not none.
  for (let i = 0; i < bands.length; i++) {
    const b = bands[i];
    const isLast = i === bands.length - 1;
    if (my >= b.top && (isLast ? my <= b.bottom : my < b.bottom)) {
      return { kind: 'subpane', key: b.key };
    }
  }
  return { kind: 'none' };
}
