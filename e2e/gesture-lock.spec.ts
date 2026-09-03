import { test, expect, type Page } from '@playwright/test';
import { DATA } from './fixture/data';

// ---------------------------------------------------------------------------
// Tier-0 gesture behavior lock. Captured on unmodified src/, kept green through
// every later tier. These assert the OBSERVABLE outcome of each held-pointer
// gesture (pan, wheel-zoom, draw, y-rescale, crosshair, dbl-click, divider) via
// the fixture's readouts + the public scale API — not any internal ref/closure.
// ---------------------------------------------------------------------------

const MARGIN_TOP = 4; // Chart.tsx MARGIN.top — rootG y-translate
const MIN_VISIBLE_BARS = 10;

type Scale = {
  step: number;
  bandwidth: number;
  width: number;
  priceHeight: number;
  visibleStartIdx: number;
  visibleBarsInt: number;
  maxVisibleBars: number;
  priceDomain: [number, number];
};

async function readScale(page: Page): Promise<Scale> {
  const txt = await page.getByTestId('scale').textContent();
  return JSON.parse(txt || '{}');
}

async function num(page: Page, id: string): Promise<number> {
  return Number(await page.getByTestId(id).textContent());
}

async function frameBox(page: Page) {
  const box = await page.locator('[class*="chartFrame"]').first().boundingBox();
  if (!box) throw new Error('chart frame not found');
  return box;
}

// Plot rootG-space (mx,my) → viewport client coords. MARGIN.left is 0.
function client(box: { x: number; y: number }, mx: number, my: number) {
  return { x: box.x + mx, y: box.y + MARGIN_TOP + my };
}

async function settle(page: Page) {
  // Let the pan/rescale/zoom rAF apply and React commit the readout.
  await page.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  // Wait for the scale probe to publish real geometry.
  await expect
    .poll(async () => (await readScale(page)).step ?? 0)
    .toBeGreaterThan(0);
});

test('pan: a 100px drag shifts panOffset by round(dx / step)', async ({
  page,
}) => {
  const box = await frameBox(page);
  const s = await readScale(page);
  expect(await num(page, 'panOffset')).toBe(0);

  // Drag left (into history) — always in range given 300 bars of data.
  const start = client(box, s.width * 0.5, s.priceHeight * 0.5);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x - 50, start.y, { steps: 5 });
  await page.mouse.move(start.x - 100, start.y, { steps: 5 });
  await page.mouse.up();
  await settle(page);

  const expected = Math.round(-100 / s.step);
  expect(await num(page, 'panOffset')).toBe(expected);
});

test('wheel-zoom: visibleBars clamps to [MIN_VISIBLE_BARS, cap]', async ({
  page,
}) => {
  const box = await frameBox(page);
  const s = await readScale(page);
  const center = client(box, s.width * 0.5, s.priceHeight * 0.5);
  await page.mouse.move(center.x, center.y);

  // Zoom in hard (deltaY < 0) → floor at MIN_VISIBLE_BARS.
  for (let i = 0; i < 80; i++) await page.mouse.wheel(0, -120);
  await expect.poll(() => num(page, 'visibleBars')).toBe(MIN_VISIBLE_BARS);

  // Zoom out hard (deltaY > 0) → ceiling at the readability cap.
  for (let i = 0; i < 120; i++) await page.mouse.wheel(0, 120);
  await expect.poll(() => num(page, 'visibleBars')).toBe(s.maxVisibleBars);
});

test('drawing: trend tool places one on two clicks; body drag moves it once', async ({
  page,
}) => {
  const box = await frameBox(page);
  const s = await readScale(page);

  await page.getByTestId('tool-trendline').click();
  expect(await page.getByTestId('activeTool').textContent()).toBe('trendline');

  const p1 = client(box, s.width * 0.35, s.priceHeight * 0.4);
  const p2 = client(box, s.width * 0.6, s.priceHeight * 0.6);
  await page.mouse.click(p1.x, p1.y);
  await page.mouse.click(p2.x, p2.y);
  await settle(page);

  expect(await num(page, 'drawingsCount')).toBe(1);
  expect(await num(page, 'drawingsChangeCount')).toBe(1);
  const before = await page.getByTestId('drawings').textContent();

  // Grab the line body at its pixel midpoint, drag, release.
  await page.getByTestId('tool-cursor').click();
  const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
  await page.mouse.move(mid.x, mid.y);
  await page.mouse.down();
  await page.mouse.move(mid.x + 40, mid.y + 30, { steps: 6 });
  await page.mouse.up();
  await settle(page);

  expect(await num(page, 'drawingsCount')).toBe(1);
  expect(await num(page, 'drawingsChangeCount')).toBe(2);
  expect(await page.getByTestId('drawings').textContent()).not.toBe(before);
});

test('y-axis rescale: gutter drag changes the price view; dbl-click resets it', async ({
  page,
}) => {
  const box = await frameBox(page);
  const s = await readScale(page);
  const auto = JSON.stringify(s.priceDomain);

  const g = client(box, s.width + 30, s.priceHeight * 0.4);
  await page.mouse.move(g.x, g.y);
  await page.mouse.down();
  await page.mouse.move(g.x, g.y - 40, { steps: 4 });
  await page.mouse.move(g.x, g.y - 90, { steps: 4 });
  await page.mouse.up();
  await settle(page);

  const rescaled = JSON.stringify((await readScale(page)).priceDomain);
  expect(rescaled).not.toBe(auto);

  await page.mouse.dblclick(g.x, g.y);
  await settle(page);
  const reset = JSON.stringify((await readScale(page)).priceDomain);
  expect(reset).toBe(auto);
});

test('crosshair: the OHLC readout tracks the bar under the cursor', async ({
  page,
}) => {
  const box = await frameBox(page);
  const s = await readScale(page);
  const slot = 40;
  const realIdx = s.visibleStartIdx + slot;
  const expectedDate = DATA[realIdx].date;

  const p = client(box, slot * s.step + s.step / 2, s.priceHeight * 0.5);
  await page.mouse.move(p.x, p.y);
  await settle(page);

  const svgText = await page.locator('[class*="chartSvg"]').textContent();
  expect(svgText).toContain(expectedDate);
});

// Pixel y for a price under the log domain currently shown.
function yForPrice(s: Scale, price: number) {
  const [lo, hi] = s.priceDomain;
  const t = (Math.log(hi) - Math.log(price)) / (Math.log(hi) - Math.log(lo));
  return t * s.priceHeight;
}

test('dbl-click routing: candle→Candles, drawing→its popup, guard→nothing', async ({
  page,
}) => {
  const box = await frameBox(page);
  await settle(page); // let the auto-fit price domain settle before mapping price→y
  const s = await readScale(page);
  const panel = page.locator('[class*="centeredPanel"]');

  // A candle opens the Candles popup. Target the true bar centre (bandwidth) at
  // the wick midpoint (high↔low) — dead centre of the candle's hit span. Retry
  // the dbl-click until it lands: the canvas paint-time hit regions populate a
  // frame after the scale publishes, so a too-early click finds no candle.
  const slot = 50;
  const bar = DATA[s.visibleStartIdx + slot];
  const my = (yForPrice(s, bar.high) + yForPrice(s, bar.low)) / 2;
  const cd = client(box, slot * s.step + s.bandwidth / 2, my);
  await expect(async () => {
    await page.mouse.dblclick(cd.x, cd.y);
    await expect(panel).toContainText('Candles', { timeout: 500 });
  }).toPass();
  await page.keyboard.press('Escape');
  await expect(panel).toHaveCount(0);

  // Place a trendline, then a dbl-click WITHIN the guard window must open nothing.
  await page.getByTestId('tool-trendline').click();
  const a = client(box, s.width * 0.4, s.priceHeight * 0.45);
  const b = client(box, s.width * 0.6, s.priceHeight * 0.55);
  await page.mouse.click(a.x, a.y);
  await page.mouse.click(b.x, b.y); // second click places + selects
  await page.mouse.dblclick(b.x, b.y); // immediate: inside PLACEMENT guard
  await expect(panel).toHaveCount(0);

  // After the guard lapses, a dbl-click on the line opens its own popup.
  await page.getByTestId('tool-cursor').click();
  await page.waitForTimeout(800);
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  await page.mouse.dblclick(mid.x, mid.y);
  await expect(panel).toContainText('Trend line');
});

test('divider: dragging changes subpaneHeights, one change on release', async ({
  page,
}) => {
  const divider = page.locator('[class*="subpaneDivider"]').first();
  const box = await divider.boundingBox();
  if (!box) throw new Error('no subpane divider — is a subpane indicator on?');
  expect(await page.getByTestId('subpaneHeights').textContent()).toBe('null');
  expect(await num(page, 'subpaneChangeCount')).toBe(0);

  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx, cy + 40, { steps: 6 });
  await page.mouse.up();
  await settle(page);

  expect(await page.getByTestId('subpaneHeights').textContent()).not.toBe('null');
  expect(await num(page, 'subpaneChangeCount')).toBe(1);
});
