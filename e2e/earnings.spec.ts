import { test, expect, type Page } from '@playwright/test';

// Corner-pinned Earnings box on the REAL DOM — the tier that proves the toggle
// button (which lives in ChartControls) shows/hides it, that a drag round-trips
// and persists, that it clamps to the pane, and that the two corner boxes
// (earnings top-right, stats bottom-right) do not land on each other.
//
// The box is OFF by default; every case first clicks the ChartControls
// "Earnings" button (mirroring how stats.spec.ts clicks the stats toggle).

const MARGIN_TOP = 4; // Chart.tsx MARGIN.top

type Scale = { width: number; priceHeight: number };
async function readScale(page: Page): Promise<Scale> {
  return JSON.parse((await page.getByTestId('scale').textContent()) || '{}');
}
async function frameBox(page: Page) {
  const box = await page.locator('[class*="chartFrame"]').first().boundingBox();
  if (!box) throw new Error('chart frame not found');
  return box;
}
async function settle(page: Page) {
  await page.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
}
async function num(page: Page, id: string) {
  return Number(await page.getByTestId(id).textContent());
}

const earnPanel = (page: Page) => page.locator('[class*="earningsPanel"]');
const statsPanel = (page: Page) => page.locator('[class*="statsPanel"]');
async function panelBox(page: Page) {
  const b = await earnPanel(page).boundingBox();
  if (!b) throw new Error('earnings panel not found');
  return b;
}

async function paneEdges(page: Page) {
  const fb = await frameBox(page);
  const s = await readScale(page);
  return {
    right: fb.x + s.width,
    bottom: fb.y + MARGIN_TOP + s.priceHeight,
    fb,
    s,
  };
}
async function rightGap(page: Page) {
  const { right } = await paneEdges(page);
  const pb = await panelBox(page);
  return right - (pb.x + pb.width);
}
async function bottomGap(page: Page) {
  const { bottom } = await paneEdges(page);
  const pb = await panelBox(page);
  return bottom - (pb.y + pb.height);
}

async function enableEarnings(page: Page) {
  await page.getByRole('button', { name: 'Earnings', exact: true }).click();
  await expect
    .poll(async () => (await earnPanel(page).boundingBox())?.width ?? 0)
    .toBeGreaterThan(0);
  await settle(page);
}

// Drag the panel so its CENTRE lands at screen (tx, ty).
async function dragCentreTo(page: Page, tx: number, ty: number) {
  const pb = await panelBox(page);
  const cx = pb.x + pb.width / 2;
  const cy = pb.y + pb.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move((cx + tx) / 2, (cy + ty) / 2);
  await page.mouse.move(tx, ty);
}

function intersects(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
) {
  return (
    a.x < b.x + b.width &&
    b.x < a.x + a.width &&
    a.y < b.y + b.height &&
    b.y < a.y + a.height
  );
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect.poll(async () => (await readScale(page)).width ?? 0).toBeGreaterThan(0);
  await settle(page);
});

test('the ChartControls Earnings button shows the box and hides it again', async ({ page }) => {
  await expect(earnPanel(page)).toHaveCount(0);
  await enableEarnings(page);
  await expect(earnPanel(page)).toHaveCount(1);
  await page.getByRole('button', { name: 'Earnings', exact: true }).click();
  await settle(page);
  await expect(earnPanel(page)).toHaveCount(0);
});

test('a box whose model is empty until the feed lands still measures and shows', async ({ page }) => {
  // The cold-load regression: with the results empty, the box renders nothing, so
  // its measured div mounts only once the feed arrives — a LATER render. A one-shot
  // mount effect misses that and leaves the box stuck visibility:hidden forever.
  await page.getByTestId('earnings-data').click(); // drop the feed to []
  await page.getByRole('button', { name: 'Earnings', exact: true }).click(); // enable while empty
  await settle(page);
  await expect(earnPanel(page)).toHaveCount(0); // empty model → nothing rendered
  await page.getByTestId('earnings-data').click(); // feed arrives on a later render
  await expect
    .poll(async () => (await earnPanel(page).boundingBox())?.width ?? 0)
    .toBeGreaterThan(0);
  const visibility = await earnPanel(page).evaluate(
    (el) => getComputedStyle(el).visibility,
  );
  expect(visibility).toBe('visible'); // measured, not stuck hidden
});

test('the box drags and persists an anchor', async ({ page }) => {
  await enableEarnings(page);
  const before = await num(page, 'earningsChangeCount');
  const { right, bottom } = await paneEdges(page);
  await dragCentreTo(page, right - 200, bottom - 200);
  await page.mouse.up();
  await settle(page);
  expect(await num(page, 'earningsChangeCount')).toBe(before + 1);
});

test('dragging past the pane edge clamps and still persists', async ({ page }) => {
  await enableEarnings(page);
  const before = await num(page, 'earningsChangeCount');
  const { right, bottom } = await paneEdges(page);
  await dragCentreTo(page, right + 300, bottom + 300);
  await page.mouse.up();
  await settle(page);
  // Pinned flush to the pane's bottom-right corner.
  expect(Math.abs(await rightGap(page))).toBeLessThanOrEqual(1.5);
  expect(Math.abs(await bottomGap(page))).toBeLessThanOrEqual(1.5);
  expect(await num(page, 'earningsChangeCount')).toBe(before + 1);
});

test('the two corner boxes do not overlap on first paint', async ({ page }) => {
  await enableEarnings(page);
  await page.getByTestId('stats-toggle').click(); // stats on too
  await expect
    .poll(async () => (await statsPanel(page).boundingBox())?.width ?? 0)
    .toBeGreaterThan(0);
  await settle(page);
  const eb = await earnPanel(page).boundingBox();
  const sb = await statsPanel(page).boundingBox();
  if (!eb || !sb) throw new Error('both boxes must be visible');
  expect(intersects(eb, sb)).toBe(false);
  // Earnings sits above the stats box (top-right vs bottom-right).
  expect(eb.y).toBeLessThan(sb.y);
});

test('dragging one box leaves the other box unpersisted', async ({ page }) => {
  await enableEarnings(page);
  await page.getByTestId('stats-toggle').click();
  await expect
    .poll(async () => (await statsPanel(page).boundingBox())?.width ?? 0)
    .toBeGreaterThan(0);
  await settle(page);
  const statsBefore = await num(page, 'statsChangeCount');
  const { right, bottom } = await paneEdges(page);
  await dragCentreTo(page, right - 250, bottom - 250);
  await page.mouse.up();
  await settle(page);
  expect(await num(page, 'earningsChangeCount')).toBe(1);
  // The stats box was never touched.
  expect(await num(page, 'statsChangeCount')).toBe(statsBefore);
});
