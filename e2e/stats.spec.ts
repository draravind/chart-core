import { test, expect, type Page, type CDPSession } from '@playwright/test';

// Anchored Price Stats box, on the REAL DOM — the only tier that can prove the
// anchor rect IS the price pane and that a drag round-trips (persist → resolve)
// back to the same pixels. Geometry the unit tests can't reach: the panel is
// measured, the pane comes from the live layout, and resize re-resolves.
//
// Every case first clicks the fixture's stats toggle; the panel is OFF by
// default so the five existing specs keep the DOM they have today.

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

const panel = (page: Page) => page.locator('[class*="statsPanel"]');
async function panelBox(page: Page) {
  const b = await panel(page).boundingBox();
  if (!b) throw new Error('stats panel not found');
  return b;
}

// Screen coords of the price pane's right / bottom edges (pane.left = MARGIN.left
// = 0; pane.top = MARGIN.top; pane.width = scale.width; pane.height = priceHeight).
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

async function enableStats(page: Page) {
  await page.getByTestId('stats-toggle').click();
  await expect.poll(async () => (await panel(page).boundingBox())?.width ?? 0).toBeGreaterThan(0);
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

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect.poll(async () => (await readScale(page)).width ?? 0).toBeGreaterThan(0);
  await settle(page);
});

test('bottom-right box holds its right gap when the chart narrows', async ({ page }) => {
  await enableStats(page);
  const { right, bottom } = await paneEdges(page);
  await dragCentreTo(page, right - 40, bottom - 40);
  await page.mouse.up();
  await settle(page);

  const before = await rightGap(page);
  await page.getByTestId('shrink-width').click();
  await settle(page);
  const after = await rightGap(page);
  // Re-resolved, not frozen on the drop pixels: the gap is preserved AND the box
  // actually moved (dragPx released at drop).
  expect(Math.abs(after - before)).toBeLessThanOrEqual(1.5);
});

test('bottom-right box holds its bottom gap when the chart shortens', async ({ page }) => {
  await enableStats(page);
  const { right, bottom } = await paneEdges(page);
  await dragCentreTo(page, right - 40, bottom - 40);
  await page.mouse.up();
  await settle(page);

  const before = await bottomGap(page);
  await page.getByTestId('shrink-height').click();
  await settle(page);
  const after = await bottomGap(page);
  expect(Math.abs(after - before)).toBeLessThanOrEqual(1.5);
});

test('a bottom-anchored box stays inside the price pane above the subpane', async ({ page }) => {
  await enableStats(page);
  const { bottom, s } = await paneEdges(page);
  // Volume subpane is seeded on, so the price pane is shorter than the full box.
  const fullBottom = (await frameBox(page)).y + MARGIN_TOP + (await readScale(page)).priceHeight;
  expect(s.priceHeight).toBeGreaterThan(0);
  await dragCentreTo(page, (await paneEdges(page)).right - 40, bottom - 20);
  await page.mouse.up();
  await settle(page);
  const pb = await panelBox(page);
  // Box bottom never crosses the price-pane bottom (never over the subpane).
  expect(pb.y + pb.height).toBeLessThanOrEqual(fullBottom + 1);
});

test('a drop does not jump between during-drag and after release', async ({ page }) => {
  await enableStats(page);
  const { right, bottom } = await paneEdges(page);
  await dragCentreTo(page, right - 60, bottom - 60);
  await settle(page);
  const during = await panelBox(page);
  await page.mouse.up();
  await settle(page);
  const after = await panelBox(page);
  expect(Math.abs(after.x - during.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(after.y - during.y)).toBeLessThanOrEqual(1);
});

test('dragging toward the price axis stops at the pane edge and saves the stopped spot', async ({ page }) => {
  await enableStats(page);
  const before = await num(page, 'statsChangeCount');
  const { right, bottom } = await paneEdges(page);
  // Aim well past the pane's right/bottom edges — into the axis gutter/time strip.
  await dragCentreTo(page, right + 300, bottom + 300);
  await page.mouse.up();
  await settle(page);
  // Pinned flush to the pane's bottom-right corner.
  expect(Math.abs(await rightGap(page))).toBeLessThanOrEqual(1.5);
  expect(Math.abs(await bottomGap(page))).toBeLessThanOrEqual(1.5);
  // The stopped position was persisted.
  expect(await num(page, 'statsChangeCount')).toBe(before + 1);
});

test('panel growth re-resolves a right-anchored box (gap unchanged)', async ({ page }) => {
  await enableStats(page);
  // Default placement is top-right (ax:1) — no drag needed.
  const before = await rightGap(page);
  await page.getByTestId('toggle-size').click(); // small → large
  await settle(page);
  const after = await rightGap(page);
  expect(Math.abs(after - before)).toBeLessThanOrEqual(1.5);
});

test('chart too small hides the box; restoring returns it to the same anchor', async ({ page }) => {
  await enableStats(page);
  const before = await rightGap(page);
  await page.getByTestId('tiny-width').click();
  await settle(page);
  await expect(panel(page)).toHaveCount(0);
  await page.getByTestId('restore-size').click();
  await settle(page);
  await expect.poll(async () => (await panel(page).boundingBox())?.width ?? 0).toBeGreaterThan(0);
  const after = await rightGap(page);
  expect(Math.abs(after - before)).toBeLessThanOrEqual(1.5);
});

test('a legacy {x,y} value migrates once and never re-persists', async ({ page }) => {
  await enableStats(page);
  await page.getByTestId('seed-legacy').click(); // { x: 1000, y: 600 }
  await settle(page);
  // Painted at the old pixels clamped into the pane — bottom-right, not top-left.
  const { fb, s } = await paneEdges(page);
  const pb = await panelBox(page);
  expect(pb.x - fb.x).toBeGreaterThan(s.width / 2);
  expect(pb.y - fb.y).toBeGreaterThan(s.priceHeight / 2);
  // Backfilled exactly once.
  await expect.poll(() => num(page, 'statsChangeCount')).toBe(1);
  // A resize and a further re-render must not loop the backfill.
  await page.getByTestId('shrink-width').click();
  await settle(page);
  await page.getByTestId('toggle-size').click();
  await settle(page);
  expect(await num(page, 'statsChangeCount')).toBe(1);
});

test('an unparseable stored value falls back to the default and is never overwritten', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await enableStats(page);
  await page.getByTestId('seed-bad').click(); // { x: 'a' }
  await settle(page);
  // Default top-right placement (8px inset), unchanged change count.
  expect(Math.abs((await rightGap(page)) - 8)).toBeLessThanOrEqual(1.5);
  await page.getByTestId('shrink-width').click();
  await settle(page);
  expect(await num(page, 'statsChangeCount')).toBe(0);
  expect(errors).toEqual([]);
});

test('touchCancel keeps the box at the last spot, persists nothing, and the anchor holds on resize', async ({ page }) => {
  test.skip(page.context().browser()?.browserType().name() !== 'chromium', 'CDP touch is Chromium-only');
  await enableStats(page);
  const cdp: CDPSession = await page.context().newCDPSession(page);
  const touch = (type: 'touchStart' | 'touchMove' | 'touchCancel', x: number, y: number) =>
    cdp.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: type === 'touchCancel' ? [] : [{ x, y, id: 0 }],
    });

  const { right, bottom } = await paneEdges(page);
  const pb = await panelBox(page);
  const target = { x: right - 50, y: bottom - 50 };
  await touch('touchStart', pb.x + pb.width / 2, pb.y + pb.height / 2);
  await touch('touchMove', (pb.x + target.x) / 2, (pb.y + target.y) / 2);
  await touch('touchMove', target.x, target.y);
  await settle(page);
  const moved = await panelBox(page);
  await touch('touchCancel', 0, 0);
  await settle(page);

  const afterCancel = await panelBox(page);
  // Stays where the finger last moved it.
  expect(Math.abs(afterCancel.x - moved.x)).toBeLessThanOrEqual(1.5);
  expect(Math.abs(afterCancel.y - moved.y)).toBeLessThanOrEqual(1.5);
  // Nothing was persisted.
  expect(await num(page, 'statsChangeCount')).toBe(0);
  // The pixels really were anchored: a resize holds the cancelled anchor's gap.
  const before = await rightGap(page);
  await page.getByTestId('shrink-width').click();
  await settle(page);
  expect(Math.abs((await rightGap(page)) - before)).toBeLessThanOrEqual(1.5);
});
