// Pure Float64Array reducers. NaN marks a gap. These reproduce the server-side
// parquet math exactly (see data_pipeline/.../convert_to_parquet.py) so an
// in-browser series overlays the server columns within rounding.

const round2 = (v: number): number => Math.round(v * 100) / 100;

/**
 * Exponential moving average matching pandas `ewm(span, adjust=False).mean()`.
 * Seeds `ema[0] = close[0]`, recurses `ema[i] = α·c[i] + (1−α)·ema[i−1]` with
 * `α = 2/(span+1)`, rounds to 2 dp. A NaN close resets the seam (next valid
 * close re-seeds), so gaps render as breaks rather than dragged-to-zero lines.
 */
export function computeEMA(close: Float64Array, span: number): Float64Array {
  const n = close.length;
  const out = new Float64Array(n);
  const alpha = 2 / (span + 1);
  let prev = NaN;
  for (let i = 0; i < n; i++) {
    const c = close[i];
    if (Number.isNaN(c)) {
      out[i] = NaN;
      prev = NaN;
      continue;
    }
    prev = Number.isNaN(prev) ? c : alpha * c + (1 - alpha) * prev;
    out[i] = round2(prev);
  }
  return out;
}

/**
 * Trailing rolling max over `window` bars, `min_periods=1` (so early bars use
 * the partial window), rounded to 2 dp. O(N) via a monotonic decreasing deque
 * of indices. Matches pandas `rolling(window, min_periods=1).max()`.
 */
export function computeRollingHigh(
  high: Float64Array,
  window: number,
): Float64Array {
  const n = high.length;
  const out = new Float64Array(n);
  // Deque of indices, values monotonically decreasing front→back.
  const dq: number[] = [];
  let head = 0; // logical front pointer (avoids shift())
  for (let i = 0; i < n; i++) {
    const v = high[i];
    if (Number.isNaN(v)) {
      out[i] = NaN;
      continue;
    }
    // Drop indices that have slid out of the window.
    while (dq.length - head > 0 && dq[head] <= i - window) head++;
    // Maintain decreasing order.
    while (dq.length - head > 0 && high[dq[dq.length - 1]] <= v) dq.pop();
    dq.push(i);
    out[i] = round2(high[dq[head]]);
  }
  return out;
}

/** Expanding (all-history) running max — the ATH degenerate of rolling. */
export function computeExpandingMax(high: Float64Array): Float64Array {
  const n = high.length;
  const out = new Float64Array(n);
  let m = NaN;
  for (let i = 0; i < n; i++) {
    const v = high[i];
    if (Number.isNaN(v)) {
      out[i] = NaN;
      continue;
    }
    m = Number.isNaN(m) ? v : Math.max(m, v);
    out[i] = round2(m);
  }
  return out;
}
