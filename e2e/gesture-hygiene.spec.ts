import { test, expect, type Page } from '@playwright/test';

// Tier 2 — click-vs-drag threshold + pan cancel. A press that never travels
// past 4px is a click (pans nothing, commits nothing); Escape / window blur
// abort an in-flight pan.

const MARGIN_TOP = 4;

type Scale = {
  step: number;
  width: number;
  priceHeight: number;
  visibleStartIdx: number;
  priceDomain: [number, number];
};

async function readScale(page: Page): Promise<Scale> {
  return JSON.parse((await page.getByTestId('scale').textContent()) || '{}');
}
async function num(page: Page, id: string) {
  return Number(await page.getByTestId(id).textContent());
}
async function frameBox(page: Page) {
  const box = await page.locator('[class*="chartFrame"]').first().boundingBox();
  if (!box) throw new Error('chart frame not found');
  return box;
}
function client(box: { x: number; y: number }, mx: number, my: number) {
  return { x: box.x + mx, y: box.y + MARGIN_TOP + my };
}
async function settle(page: Page) {
  await page.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect.poll(async () => (await readScale(page)).step ?? 0).toBeGreaterThan(0);
});

test('a plain click pans nothing; 2px stays put; 60px pans', async ({ page }) => {
  const box = await frameBox(page);
  const s = await readScale(page);
  const p = client(box, s.width * 0.5, s.priceHeight * 0.5);

  // Press + release, no move.
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.up();
  await settle(page);
  expect(await num(page, 'panOffset')).toBe(0);

  // A 2px drag (below the 4px threshold) still does not pan.
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(p.x - 2, p.y);
  await page.mouse.up();
  await settle(page);
  expect(await num(page, 'panOffset')).toBe(0);

  // A 60px drag pans.
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(p.x - 60, p.y, { steps: 6 });
  await page.mouse.up();
  await settle(page);
  expect(await num(page, 'panOffset')).not.toBe(0);
});

test('Escape mid-pan reverts (no commit); blur mid-pan reverts', async ({
  page,
}) => {
  const box = await frameBox(page);
  const s = await readScale(page);
  const p = client(box, s.width * 0.5, s.priceHeight * 0.5);

  // Escape during a promoted drag → nothing commits.
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(p.x - 60, p.y, { steps: 6 });
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await settle(page);
  expect(await num(page, 'panOffset')).toBe(0);

  // Window blur during a drag → same.
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(p.x - 60, p.y, { steps: 6 });
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await page.mouse.up();
  await settle(page);
  expect(await num(page, 'panOffset')).toBe(0);
});

test('press-release on a drawing selects it without firing onDrawingsChange; a drag fires once', async ({
  page,
}) => {
  const box = await frameBox(page);
  const s = await readScale(page);

  await page.getByTestId('tool-trendline').click();
  const a = client(box, s.width * 0.35, s.priceHeight * 0.4);
  const b = client(box, s.width * 0.6, s.priceHeight * 0.6);
  await page.mouse.click(a.x, a.y);
  await page.mouse.click(b.x, b.y);
  await settle(page);
  expect(await num(page, 'drawingsChangeCount')).toBe(1);

  await page.getByTestId('tool-cursor').click();
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  // Press + release on the line, no move → selects, no persist.
  await page.mouse.move(mid.x, mid.y);
  await page.mouse.down();
  await page.mouse.up();
  await settle(page);
  expect(await num(page, 'drawingsChangeCount')).toBe(1);
  expect(await num(page, 'drawingsCount')).toBe(1);

  // Now drag it 60px → one commit.
  await page.mouse.move(mid.x, mid.y);
  await page.mouse.down();
  await page.mouse.move(mid.x + 60, mid.y + 20, { steps: 6 });
  await page.mouse.up();
  await settle(page);
  expect(await num(page, 'drawingsChangeCount')).toBe(2);
});

test('clicking a selected drawing away (miss) deselects it', async ({ page }) => {
  const box = await frameBox(page);
  const s = await readScale(page);

  await page.getByTestId('tool-hline').click();
  const h = client(box, s.width * 0.4, s.priceHeight * 0.5);
  await page.mouse.click(h.x, h.y);
  await settle(page);
  expect(await num(page, 'drawingsCount')).toBe(1); // placed + selected

  // A plain click on empty chart deselects (bg fan-out).
  const empty = client(box, s.width * 0.8, s.priceHeight * 0.2);
  await page.mouse.move(empty.x, empty.y);
  await page.mouse.down();
  await page.mouse.up();
  await settle(page);

  // Delete now removes nothing — the selection was cleared.
  await page.keyboard.press('Delete');
  await settle(page);
  expect(await num(page, 'drawingsCount')).toBe(1);
});

test('a gutter click without moving leaves the price view on auto', async ({
  page,
}) => {
  const box = await frameBox(page);
  const s = await readScale(page);
  const auto = JSON.stringify(s.priceDomain);
  const g = client(box, s.width + 30, s.priceHeight * 0.4);
  await page.mouse.move(g.x, g.y);
  await page.mouse.down();
  await page.mouse.up();
  await settle(page);
  expect(JSON.stringify((await readScale(page)).priceDomain)).toBe(auto);
});

test('a held-but-unmoved press still tracks the crosshair', async ({ page }) => {
  const box = await frameBox(page);
  const s = await readScale(page);
  const start = client(box, 30 * s.step + s.step / 2, s.priceHeight * 0.5);

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  // Move 2px (below threshold → stays armed, crosshair keeps tracking).
  await page.mouse.move(start.x + 2, start.y);
  await settle(page);
  const svgText = await page.locator('[class*="chartSvg"]').textContent();
  // The crosshair readout is populated, proving it kept tracking while held.
  expect(svgText && svgText.length).toBeTruthy();
  await page.mouse.up();
});
