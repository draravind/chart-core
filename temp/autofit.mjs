// Reproduce Chart.tsx Effect B price-domain math (lines ~1277-1322) to test
// whether including RS subpane series (rs ~0.5, signal 0/1) corrupts yPrice.
function buildYDomain(priceMinInit, priceMaxInit, extraValues, priceZoom = 1) {
  let priceMin = priceMinInit;
  let priceMax = priceMaxInit;
  for (const v of extraValues) {
    if (!Number.isNaN(v)) {
      if (v < priceMin) priceMin = v;
      if (v > priceMax) priceMax = v;
    }
  }
  const logMin = Math.log(priceMin);
  const logMax = Math.log(priceMax);
  const logCenter = (logMin + logMax) / 2;
  const baseHalfRange = (logMax - logMin) / 2;
  const adjHalfRange = baseHalfRange / Math.max(0.01, priceZoom);
  const adjLogMin = logCenter - adjHalfRange;
  const adjLogMax = logCenter + adjHalfRange;
  const logSpan = adjLogMax - adjLogMin;
  const logPadBottom = logSpan * 0.06 || 0.01;
  const logPadTop = logSpan * 0.12 || 0.01;
  const domainLow = Math.exp(adjLogMin - logPadBottom);
  const domainHigh = Math.exp(adjLogMax + logPadTop);
  return { priceMin, priceMax, domain: [Math.max(1, domainLow), domainHigh] };
}

// Stock priced ~100-200; benchmark ratio rs ~0.5; signal 0/1.
const stockLow = 100, stockHigh = 200;

console.log('WITH guard (RS skipped):',
  JSON.stringify(buildYDomain(stockLow, stockHigh, [])));

console.log('WITHOUT guard (rs only, ~0.5):',
  JSON.stringify(buildYDomain(stockLow, stockHigh, [0.45, 0.52, 0.61])));

const r = buildYDomain(stockLow, stockHigh, [0.45, 0.52, 0.0, 1.0]); // includes signal 0
console.log('WITHOUT guard (rs + signal 0/1):',
  JSON.stringify(r), 'domainHasNaN=', r.domain.some(Number.isNaN));
