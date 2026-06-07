// ---------------------------------------------------------------------------
// TA-Lib-faithful primitives shared across the builtin indicator library.
//
// CONTRACT: every function here returns a FULL-FLOAT64 Float64Array with `NaN`
// in warm-up positions. They do NOT round — rounding to 2 dp happens once, on
// the final value each builtin writes to its output series (see the per-builtin
// `compute`). This matches TA-Lib's "all intermediates in double precision".
//
// Clean-series assumption (matching TA-Lib): the source is valid from its first
// finite index onward with no internal NaN gaps. Chained sub-series (EMA(EMA),
// MA(fastk), …) only ever carry a CONTIGUOUS leading NaN run, so every function
// finds the first finite index and computes forward from there.
// ---------------------------------------------------------------------------

export const round2 = (v: number): number =>
  Number.isNaN(v) ? NaN : Math.round(v * 100) / 100;

/** First finite index in `src`, or `src.length` if all NaN. */
export function firstValid(src: Float64Array): number {
  for (let i = 0; i < src.length; i++) if (!Number.isNaN(src[i])) return i;
  return src.length;
}

function filledNaN(n: number): Float64Array {
  const out = new Float64Array(n);
  out.fill(NaN);
  return out;
}

/**
 * Simple moving average, lookback `period−1` from the first finite sample.
 * O(N) running sum.
 */
export function sma(src: Float64Array, period: number): Float64Array {
  const n = src.length;
  const out = filledNaN(n);
  const s = firstValid(src);
  if (period < 1 || s + period > n) return out;
  let sum = 0;
  for (let i = s; i < n; i++) {
    sum += src[i];
    if (i >= s + period) sum -= src[i - period];
    if (i >= s + period - 1) out[i] = sum / period;
  }
  return out;
}

/**
 * Linearly-weighted MA (weights oldest=1 … newest=period, divisor p(p+1)/2),
 * lookback `period−1`. O(N) via a rolling weighted sum + plain sum.
 */
export function wma(src: Float64Array, period: number): Float64Array {
  const n = src.length;
  const out = filledNaN(n);
  const s = firstValid(src);
  const seedIdx = s + period - 1;
  if (period < 1 || seedIdx >= n) return out;
  const divisor = (period * (period + 1)) / 2;
  // First full window [s .. seedIdx]: weightedSum = Σ rank·value (rank 1..period).
  let weightedSum = 0;
  let plainSum = 0;
  for (let k = 0; k < period; k++) {
    const v = src[s + k];
    weightedSum += (k + 1) * v;
    plainSum += v;
  }
  out[seedIdx] = weightedSum / divisor;
  // Slide one bar: every retained rank drops by 1 (subtract the prior window sum)
  // and the newest enters at rank `period`; then update the plain window sum.
  for (let i = seedIdx + 1; i < n; i++) {
    weightedSum = weightedSum + period * src[i] - plainSum;
    plainSum = plainSum - src[i - period] + src[i];
    out[i] = weightedSum / divisor;
  }
  return out;
}

/**
 * TA-Lib EMA: seed at `firstValid + period − 1` with the SMA of the first
 * `period` finite samples, then `e[i] = k·src[i] + (1−k)·e[i−1]`, `k = 2/(p+1)`.
 * Operates from the first finite index, so chaining EMA(EMA) compounds the
 * lookback (offset `period−1` each stage) exactly as TA-Lib's DEMA/TEMA/MACD do.
 */
export function emaTalib(src: Float64Array, period: number): Float64Array {
  return emaTalibAt(src, period, firstValid(src) + period - 1);
}

/**
 * EMA seeded at an EXPLICIT index `seedIdx` with the SMA of the `period` samples
 * ending there (`src[seedIdx−period+1 .. seedIdx]`), then the usual recursion.
 * MACD relies on this: its fast EMA is seeded at index `slow−1` (not `fast−1`),
 * so both EMAs share a start point — `emaTalib` is the `seedIdx = firstValid +
 * period − 1` special case.
 */
export function emaTalibAt(
  src: Float64Array,
  period: number,
  seedIdx: number,
): Float64Array {
  const n = src.length;
  const out = filledNaN(n);
  if (period < 1 || seedIdx < period - 1 || seedIdx >= n) return out;
  let sum = 0;
  for (let i = seedIdx - period + 1; i <= seedIdx; i++) sum += src[i];
  let prev = sum / period;
  out[seedIdx] = prev;
  const k = 2 / (period + 1);
  for (let i = seedIdx + 1; i < n; i++) {
    prev = k * src[i] + (1 - k) * prev;
    out[i] = prev;
  }
  return out;
}

/** Double EMA: `2·EMA − EMA(EMA)`, lookback `2(period−1)`. */
export function dema(src: Float64Array, period: number): Float64Array {
  const n = src.length;
  const e1 = emaTalib(src, period);
  const e2 = emaTalib(e1, period);
  const out = filledNaN(n);
  for (let i = 0; i < n; i++) {
    if (!Number.isNaN(e1[i]) && !Number.isNaN(e2[i])) out[i] = 2 * e1[i] - e2[i];
  }
  return out;
}

/** Triple EMA: `3·EMA − 3·EMA(EMA) + EMA(EMA(EMA))`, lookback `3(period−1)`. */
export function tema(src: Float64Array, period: number): Float64Array {
  const n = src.length;
  const e1 = emaTalib(src, period);
  const e2 = emaTalib(e1, period);
  const e3 = emaTalib(e2, period);
  const out = filledNaN(n);
  for (let i = 0; i < n; i++) {
    if (!Number.isNaN(e3[i])) out[i] = 3 * e1[i] - 3 * e2[i] + e3[i];
  }
  return out;
}

/**
 * Dispatch a moving average by TA-Lib `matype` over our supported subset:
 * 0=SMA, 1=EMA, 2=WMA, 3=DEMA, 4=TEMA. Other matypes are unsupported and fall
 * back to SMA.
 */
export function maDispatch(
  matype: number,
  src: Float64Array,
  period: number,
): Float64Array {
  switch (matype) {
    case 1:
      return emaTalib(src, period);
    case 2:
      return wma(src, period);
    case 3:
      return dema(src, period);
    case 4:
      return tema(src, period);
    case 0:
    default:
      return sma(src, period);
  }
}

/** Lookback of `maDispatch(matype, …, period)` (leading NaN count). */
export function maLookback(matype: number, period: number): number {
  switch (matype) {
    case 3:
      return 2 * (period - 1);
    case 4:
      return 3 * (period - 1);
    default:
      return period - 1;
  }
}

/**
 * Wilder smoothing (RSI/ATR/ADX form). Seed at `firstSampleIdx + period − 1`
 * with the mean of the first `period` samples, then
 * `w[i] = (w[i−1]·(p−1) + x[i]) / p`. `firstSampleIdx` is where valid samples
 * begin (1 for diff/TR series, `period` for the DX series feeding ADX).
 */
export function wilderSmooth(
  x: Float64Array,
  period: number,
  firstSampleIdx: number,
): Float64Array {
  const n = x.length;
  const out = filledNaN(n);
  const seedIdx = firstSampleIdx + period - 1;
  if (period < 1 || seedIdx >= n) return out;
  let sum = 0;
  for (let i = firstSampleIdx; i <= seedIdx; i++) sum += x[i];
  let prev = sum / period;
  out[seedIdx] = prev;
  for (let i = seedIdx + 1; i < n; i++) {
    prev = (prev * (period - 1) + x[i]) / period;
    out[i] = prev;
  }
  return out;
}

/**
 * Wilder running accumulation (DI form): seed = sum of the first `period`
 * samples, then `sm[i] = sm[i−1] − sm[i−1]/period + x[i]`. Used for the
 * TR/+DM/−DM totals inside DX.
 */
export function wilderSum(
  x: Float64Array,
  period: number,
  firstSampleIdx: number,
): Float64Array {
  const n = x.length;
  const out = filledNaN(n);
  const seedIdx = firstSampleIdx + period - 1;
  if (period < 1 || seedIdx >= n) return out;
  // TA-Lib's ADX seed accumulates only the first `period−1` samples, then folds
  // in the `period`-th with one smoothing step (distinct from ATR's mean seed).
  let prev = 0;
  for (let i = firstSampleIdx; i < seedIdx; i++) prev += x[i];
  prev = prev - prev / period + x[seedIdx];
  out[seedIdx] = prev;
  for (let i = seedIdx + 1; i < n; i++) {
    prev = prev - prev / period + x[i];
    out[i] = prev;
  }
  return out;
}

/** Trailing rolling max over a FULL `period` window (lookback `period−1`). O(N) deque. */
export function rollingMax(src: Float64Array, period: number): Float64Array {
  const n = src.length;
  const out = filledNaN(n);
  const s = firstValid(src);
  if (period < 1 || s + period > n) return out;
  const dq: number[] = [];
  let head = 0;
  for (let i = s; i < n; i++) {
    const v = src[i];
    while (dq.length - head > 0 && dq[head] <= i - period) head++;
    while (dq.length - head > 0 && src[dq[dq.length - 1]] <= v) dq.pop();
    dq.push(i);
    if (i >= s + period - 1) out[i] = src[dq[head]];
  }
  return out;
}

/** Trailing rolling min over a FULL `period` window (lookback `period−1`). O(N) deque. */
export function rollingMin(src: Float64Array, period: number): Float64Array {
  const n = src.length;
  const out = filledNaN(n);
  const s = firstValid(src);
  if (period < 1 || s + period > n) return out;
  const dq: number[] = [];
  let head = 0;
  for (let i = s; i < n; i++) {
    const v = src[i];
    while (dq.length - head > 0 && dq[head] <= i - period) head++;
    while (dq.length - head > 0 && src[dq[dq.length - 1]] >= v) dq.pop();
    dq.push(i);
    if (i >= s + period - 1) out[i] = src[dq[head]];
  }
  return out;
}

/**
 * Per-bar true range: `tr[0] = NaN`; for `i ≥ 1`,
 * `max(high−low, |high−prevClose|, |low−prevClose|)`.
 */
export function trueRange(
  high: Float64Array,
  low: Float64Array,
  close: Float64Array,
): Float64Array {
  const n = high.length;
  const out = filledNaN(n);
  for (let i = 1; i < n; i++) {
    const hl = high[i] - low[i];
    const hc = Math.abs(high[i] - close[i - 1]);
    const lc = Math.abs(low[i] - close[i - 1]);
    out[i] = Math.max(hl, hc, lc);
  }
  return out;
}

/**
 * TA-Lib RSI (Wilder). `diff = close[i] − close[i−1]` (i ≥ 1); gains/losses are
 * Wilder-smoothed with seed = mean of the first `period` samples at index
 * `period`. `RS = avgGain/avgLoss`; `rsi = 100 − 100/(1+RS)`; `avgLoss = 0 → 100`.
 * Lookback `period`.
 */
export function rsi(close: Float64Array, period: number): Float64Array {
  const n = close.length;
  const out = filledNaN(n);
  if (period < 1 || period >= n) return out;
  const gain = new Float64Array(n);
  const loss = new Float64Array(n);
  for (let i = 1; i < n; i++) {
    const d = close[i] - close[i - 1];
    gain[i] = d > 0 ? d : 0;
    loss[i] = d < 0 ? -d : 0;
  }
  // Wilder seed at index `period`: mean of the first `period` diffs (1..period).
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    avgGain += gain[i];
    avgLoss += loss[i];
  }
  avgGain /= period;
  avgLoss /= period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  for (let i = period + 1; i < n; i++) {
    avgGain = (avgGain * (period - 1) + gain[i]) / period;
    avgLoss = (avgLoss * (period - 1) + loss[i]) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

/**
 * TA-Lib DX — directional movement index, lookback `period`. Builds Wilder-
 * accumulated TR/+DM/−DM totals (DI form), then
 * `dx = 100·|+DI − −DI| / (+DI + −DI)` (denominator 0 → 0). Reused by ADX.
 */
export function dx(
  high: Float64Array,
  low: Float64Array,
  close: Float64Array,
  period: number,
): Float64Array {
  const n = high.length;
  const out = filledNaN(n);
  if (period < 1 || period >= n) return out;
  const tr = trueRange(high, low, close);
  const plusDM = filledNaN(n);
  const minusDM = filledNaN(n);
  for (let i = 1; i < n; i++) {
    const up = high[i] - high[i - 1];
    const down = low[i - 1] - low[i];
    plusDM[i] = up > down && up > 0 ? up : 0;
    minusDM[i] = down > up && down > 0 ? down : 0;
  }
  const smTR = wilderSum(tr, period, 1);
  const smPlusDM = wilderSum(plusDM, period, 1);
  const smMinusDM = wilderSum(minusDM, period, 1);
  for (let i = period; i < n; i++) {
    if (Number.isNaN(smTR[i]) || smTR[i] === 0) {
      out[i] = 0;
      continue;
    }
    const plusDI = (100 * smPlusDM[i]) / smTR[i];
    const minusDI = (100 * smMinusDM[i]) / smTR[i];
    const sum = plusDI + minusDI;
    out[i] = sum === 0 ? 0 : (100 * Math.abs(plusDI - minusDI)) / sum;
  }
  return out;
}

/**
 * TA-Lib ATR — Wilder smoothing of the true range, seed at index `period` with
 * `mean(TR[1..period])`. Lookback `period`.
 */
export function atr(
  high: Float64Array,
  low: Float64Array,
  close: Float64Array,
  period: number,
): Float64Array {
  const tr = trueRange(high, low, close);
  return wilderSmooth(tr, period, 1);
}

/** TA-Lib ADX — Wilder smoothing of DX, seed at `2·period−1`. */
export function adx(
  high: Float64Array,
  low: Float64Array,
  close: Float64Array,
  period: number,
): Float64Array {
  const dxArr = dx(high, low, close, period);
  // DX is first finite at index `period`; Wilder-smooth from there.
  return wilderSmooth(dxArr, period, period);
}

/**
 * Raw stochastic %K over `period`: `100·(closeSrc − LL)/(HH − LL)`, where HH/LL
 * are the rolling max/min of `highSrc`/`lowSrc`. `HH === LL → 0` (TA-Lib).
 * Lookback `period−1`. For price stochastics pass (high, low, close); for
 * STOCHRSI pass the RSI series as all three.
 */
export function rawStochK(
  highSrc: Float64Array,
  lowSrc: Float64Array,
  closeSrc: Float64Array,
  period: number,
): Float64Array {
  const n = highSrc.length;
  const hh = rollingMax(highSrc, period);
  const ll = rollingMin(lowSrc, period);
  const out = filledNaN(n);
  for (let i = 0; i < n; i++) {
    if (Number.isNaN(hh[i]) || Number.isNaN(ll[i]) || Number.isNaN(closeSrc[i]))
      continue;
    const range = hh[i] - ll[i];
    out[i] = range === 0 ? 0 : (100 * (closeSrc[i] - ll[i])) / range;
  }
  return out;
}

/**
 * Population standard deviation over a rolling `period` window (ddof=0),
 * `sqrt(mean(x²) − mean(x)²)`, lookback `period−1`. The variance is clamped at
 * 0 before the root to absorb float cancellation near a flat window.
 */
export function stddevPop(src: Float64Array, period: number): Float64Array {
  const n = src.length;
  const out = filledNaN(n);
  const s = firstValid(src);
  if (period < 1 || s + period > n) return out;
  let sum = 0;
  let sumSq = 0;
  for (let i = s; i < n; i++) {
    sum += src[i];
    sumSq += src[i] * src[i];
    if (i >= s + period) {
      const drop = src[i - period];
      sum -= drop;
      sumSq -= drop * drop;
    }
    if (i >= s + period - 1) {
      const mean = sum / period;
      const variance = sumSq / period - mean * mean;
      out[i] = Math.sqrt(Math.max(0, variance));
    }
  }
  return out;
}
