import type { Candle } from '../../src/index';

// Per-symbol bar cache: the committed JSON files never change within a session,
// so a revisited symbol resolves instantly (no refetch, no reparse).
const cache = new Map<string, Candle[]>();

// Fetch one symbol's committed bars from dev/public/eod/<SYMBOL>.json. Under
// dev/public/ these are static assets served at /eod/<SYMBOL>.json — never
// imported, so neither tsc nor the module graph ever parses them.
export async function loadBars(symbol: string): Promise<Candle[]> {
  const cached = cache.get(symbol);
  if (cached) return cached;
  const res = await fetch(`/eod/${symbol}.json`);
  if (!res.ok) throw new Error(`failed to load ${symbol}: ${res.status}`);
  const bars = (await res.json()) as Candle[];
  cache.set(symbol, bars);
  return bars;
}
