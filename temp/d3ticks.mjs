import * as d3 from 'd3';

// Reproduce the degenerate-domain branch: lo === hi, fallback domain [lo-1, lo+1].
function ticksFor(lo) {
  const domain = [lo - 1, lo + 1];
  const s = d3.scaleLinear().domain(domain).range([100, 0]);
  const fmt = d3.format('.2f');
  const ticks = s.ticks(3).map((d) => fmt(Number(d)));
  return { lo, domain, ticks };
}

for (const lo of [0.5, 0.8, 1.2, 3.0]) {
  console.log(JSON.stringify(ticksFor(lo)));
}

// Also confirm the PROPOSED fix never yields negatives for positive lo.
function proposedTicks(lo) {
  const spread = lo !== 0 ? Math.abs(lo) * 0.1 : 1;
  const domain = [lo - spread, lo + spread];
  const s = d3.scaleLinear().domain(domain).range([100, 0]);
  const fmt = d3.format('.2f');
  return { lo, domain: domain.map((x) => +x.toFixed(4)), ticks: s.ticks(3).map((d) => fmt(Number(d))) };
}
console.log('--- proposed fix ---');
for (const lo of [0.5, 0.8, 1.2, 3.0]) {
  console.log(JSON.stringify(proposedTicks(lo)));
}
