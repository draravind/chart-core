import type { Candle } from '../../src/types';

// Deterministic synthetic OHLCV via a fixed-seed LCG so the fixture renders
// byte-identically on every run — the gesture lock depends on stable geometry.
// ~300 daily bars starting 2021-01-01.
function genData(n: number): Candle[] {
  let seed = 987654321;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const bars: Candle[] = [];
  let price = 100;
  const start = new Date(2021, 0, 1);
  for (let i = 0; i < n; i++) {
    const drift = (rand() - 0.47) * 2.2;
    price = Math.max(5, price + drift);
    const open = price;
    const close = Math.max(5, price + (rand() - 0.5) * 2.4);
    const high = Math.max(open, close) + rand() * 1.6;
    const low = Math.max(1, Math.min(open, close) - rand() * 1.6);
    const volume = Math.floor(1e6 * (0.5 + rand()));
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    bars.push({
      date: d.toISOString().slice(0, 10),
      open,
      high,
      low,
      close,
      volume,
    });
    price = close;
  }
  const highAt = (idx: number, look: number) => {
    let m = -Infinity;
    for (let j = Math.max(0, idx - look + 1); j <= idx; j++)
      m = Math.max(m, bars[j].high);
    return m;
  };
  for (let i = 0; i < n; i++) {
    bars[i].high1y = highAt(i, 252);
    bars[i].high2y = highAt(i, 504);
    bars[i].high3y = highAt(i, 756);
    bars[i].highAll = highAt(i, n);
  }
  return bars;
}

export const DATA: Candle[] = genData(300);
