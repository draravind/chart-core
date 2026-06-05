import type { Candle } from '../types';

export type OHLCVColumns = {
  o: Float64Array;
  h: Float64Array;
  l: Float64Array;
  c: Float64Array;
  v: Float64Array;
};

// Memoized on the array identity — the same Candle[] reference returns the same
// columns without re-walking. Bars are immutable per fetch, so identity is a
// safe cache key.
const cache = new WeakMap<readonly Candle[], OHLCVColumns>();

export function toColumns(bars: readonly Candle[]): OHLCVColumns {
  const hit = cache.get(bars);
  if (hit) return hit;
  const n = bars.length;
  const o = new Float64Array(n);
  const h = new Float64Array(n);
  const l = new Float64Array(n);
  const c = new Float64Array(n);
  const v = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const b = bars[i];
    o[i] = b.open;
    h[i] = b.high;
    l[i] = b.low;
    c[i] = b.close;
    v[i] = b.volume;
  }
  const cols = { o, h, l, c, v };
  cache.set(bars, cols);
  return cols;
}
