import { test, expect, type Page } from '@playwright/test';
import { DATA } from './fixture/data';

// Floating draw-tool palette, on the REAL DOM — the only tier that can prove the
// grip gate (a tool click never drags), the drag round-trip (persist → resolve
// back to the same pixels), the pane clamp, and that the always-mounted card is
// registered in the crosshair-leave + right-click lists. The card is enabled
// unconditionally in the fixture; its default footprint (left edge, vertically
// centred) clears every coordinate the other specs drive.

const MARGIN_TOP = 4; // Chart.tsx MARGIN.top

type Scale = { width: number; priceHeight: number; visibleStartIdx: number; step: number };
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
function client(box: { x: number; y: number }, mx: number, my: number) {
  return { x: box.x + mx, y: box.y + MARGIN_TOP + my };
}

const card = (page: Page) => page.getByRole('toolbar', { name: 'Drawing tools' });
async function cardBox(page: Page) {
  const b = await card(page).boundingBox();
  if (!b) throw new Error('draw toolbar not found');
  return b;
}
const grip = (page: Page) => card(page).locator('[data-drag-handle]');

// Screen coords of the price pane's edges (pane.left = MARGIN.left = 0;
// pane.top = MARGIN.top; pane.width = scale.width; pane.height = priceHeight).
async function paneEdges(page: Page) {
  const fb = await frameBox(page);
  const s = await readScale(page);
  return {
    left: fb.x,
    top: fb.y + MARGIN_TOP,
    right: fb.x + s.width,
    bottom: fb.y + MARGIN_TOP + s.priceHeight,
    fb,
    s,
  };
}
async function leftGap(page: Page) {
  const { left } = await paneEdges(page);
  const b = await cardBox(page);
  return b.x - left;
}
async function bottomGap(page: Page) {
  const { bottom } = await paneEdges(page);
  const b = await cardBox(page);
  return bottom - (b.y + b.height);
}

// Press on the grip, move by (dx, dy) in two steps, leaving the button DOWN.
async function pressGripAndMove(page: Page, dx: number, dy: number) {
  const g = await grip(page).boundingBox();
  if (!g) throw new Error('grip not found');
  const sx = g.x + g.width / 2;
  const sy = g.y + g.height / 2;
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  await page.mouse.move(sx + dx / 2, sy + dy / 2);
  await page.mouse.move(sx + dx, sy + dy);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect.poll(async () => (await readScale(page)).width ?? 0).toBeGreaterThan(0);
  await expect.poll(async () => (await card(page).boundingBox())?.width ?? 0).toBeGreaterThan(0);
  await settle(page);
});

test('default placement: left edge, ~8px inset, vertically centred', async ({ page }) => {
  const { top, s } = await paneEdges(page);
  const b = await cardBox(page);
  // 8px from the pane's left edge (ax:0, dx:8).
  expect(Math.abs((await leftGap(page)) - 8)).toBeLessThanOrEqual(1.5);
  // Centred on the price pane's height (ay:0.5).
  const cardCenterY = b.y + b.height / 2;
  const paneCenterY = top + s.priceHeight / 2;
  expect(Math.abs(cardCenterY - paneCenterY)).toBeLessThanOrEqual(1.5);
});

test('clicking a tool button selects it and never moves the card', async ({ page }) => {
  const before = await cardBox(page);
  await page.getByRole('button', { name: 'Trend line', exact: true }).click();
  await settle(page);
  expect(await page.getByTestId('activeTool').textContent()).toBe('trendline');
  await expect(page.getByRole('button', { name: 'Trend line', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  // The grip gate: a button click is not a drag.
  const after = await cardBox(page);
  expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(1);
  expect(await num(page, 'drawToolbarChangeCount')).toBe(0);
});

test('press-and-drag on a tool button never moves the card', async ({ page }) => {
  const before = await cardBox(page);
  const btn = await page
    .getByRole('button', { name: 'Trend line', exact: true })
    .boundingBox();
  if (!btn) throw new Error('tool button not found');
  await page.mouse.move(btn.x + btn.width / 2, btn.y + btn.height / 2);
  await page.mouse.down();
  await page.mouse.move(btn.x + btn.width / 2 + 80, btn.y + btn.height / 2 + 80, { steps: 6 });
  await page.mouse.up();
  await settle(page);
  const after = await cardBox(page);
  expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(1);
  expect(await num(page, 'drawToolbarChangeCount')).toBe(0);
});

test('dragging the grip moves the card and persists exactly once', async ({ page }) => {
  const before = await cardBox(page);
  await pressGripAndMove(page, 200, 150);
  await settle(page);
  const during = await cardBox(page);
  expect(during.x - before.x).toBeGreaterThan(150);
  expect(during.y - before.y).toBeGreaterThan(100);
  await page.mouse.up();
  await settle(page);
  // Persisted once, and no jump between during-drag and after release.
  expect(await num(page, 'drawToolbarChangeCount')).toBe(1);
  const after = await cardBox(page);
  expect(Math.abs(after.x - during.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(after.y - during.y)).toBeLessThanOrEqual(1);
});

test('dragging past the right/bottom edges clamps the card inside the pane', async ({ page }) => {
  const before = await num(page, 'drawToolbarChangeCount');
  await pressGripAndMove(page, 3000, 3000);
  await page.mouse.up();
  await settle(page);
  const { right, bottom } = await paneEdges(page);
  const b = await cardBox(page);
  expect(b.x + b.width).toBeLessThanOrEqual(right + 1.5);
  expect(b.y + b.height).toBeLessThanOrEqual(bottom + 1.5);
  expect(await num(page, 'drawToolbarChangeCount')).toBe(before + 1);
});

test('a left-anchored card holds its left gap when the chart narrows', async ({ page }) => {
  const before = await leftGap(page);
  await page.getByTestId('shrink-width').click();
  await settle(page);
  expect(Math.abs((await leftGap(page)) - before)).toBeLessThanOrEqual(1.5);
});

test('a bottom-dragged card holds its bottom gap when the chart shortens', async ({ page }) => {
  const { bottom, left } = await paneEdges(page);
  // Drag toward the bottom-left so the card is bottom-anchored.
  await pressGripAndMove(page, left - (await cardBox(page)).x, bottom - (await cardBox(page)).y);
  await page.mouse.up();
  await settle(page);
  const before = await bottomGap(page);
  await page.getByTestId('shrink-height').click();
  await settle(page);
  expect(Math.abs((await bottomGap(page)) - before)).toBeLessThanOrEqual(1.5);
});

test('trash button: disabled with no drawings, clears all once one exists', async ({ page }) => {
  const trash = page.getByRole('button', { name: 'Delete all drawings' });
  await expect(trash).toBeDisabled();

  // Draw a trend line (two clicks well clear of the left-edge card).
  const box = await frameBox(page);
  const s = await readScale(page);
  await page.getByRole('button', { name: 'Trend line', exact: true }).click();
  const a = client(box, s.width * 0.4, s.priceHeight * 0.4);
  const c = client(box, s.width * 0.6, s.priceHeight * 0.6);
  await page.mouse.click(a.x, a.y);
  await page.mouse.click(c.x, c.y);
  await settle(page);
  expect(await num(page, 'drawingsCount')).toBe(1);
  await expect(trash).toBeEnabled();

  await trash.click();
  await settle(page);
  expect(await num(page, 'drawingsCount')).toBe(0);
  await expect(trash).toBeDisabled();
});

test('moving the pointer onto the card keeps the OHLC readout', async ({ page }) => {
  const box = await frameBox(page);
  const s = await readScale(page);
  const slot = 40;
  const expectedDate = DATA[s.visibleStartIdx + slot].date;
  // Hover a non-latest bar so the readout shows that bar's date.
  const p = client(box, slot * s.step + s.step / 2, s.priceHeight * 0.5);
  await page.mouse.move(p.x, p.y);
  await settle(page);
  expect(await page.locator('[class*="chartSvg"]').textContent()).toContain(expectedDate);
  // Move onto the card grip — the readout must NOT blank (data-chart-drawtoolbar
  // in the pointerleave list).
  const g = await grip(page).boundingBox();
  if (!g) throw new Error('grip not found');
  await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2);
  await settle(page);
  expect(await page.locator('[class*="chartSvg"]').textContent()).toContain(expectedDate);
});

test('right-click on the card keeps the native menu', async ({ page }) => {
  await page.evaluate(() => {
    const w = window as unknown as { __ctx?: { prevented: boolean | null } };
    w.__ctx = { prevented: null };
    document.addEventListener('contextmenu', (e) => {
      w.__ctx!.prevented = e.defaultPrevented;
    });
  });
  const before = await num(page, 'ctxFireCount');
  const b = await cardBox(page);
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2, { button: 'right' });
  const prevented = await page.evaluate(
    () =>
      (window as unknown as { __ctx?: { prevented: boolean | null } }).__ctx?.prevented ?? null,
  );
  expect(prevented).toBe(false);
  expect(await num(page, 'ctxFireCount')).toBe(before);
});
