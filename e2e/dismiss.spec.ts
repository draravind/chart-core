import { test, expect, type Page } from '@playwright/test';
import { DATA } from './fixture/data';

// The layer-stack dismissal primitive, on the REAL event-swallowing surface —
// the only tier that can. Two root causes it fixes both live here: the plot's
// pointerdown preventDefault (which cancels the compat mousedown the old
// listener heard) and the price-axis strip's stopPropagation (which a bubble
// listener never sees). Capture-phase pointerdown catches both.

const MARGIN_TOP = 4; // Chart.tsx MARGIN.top

type Scale = {
  step: number;
  bandwidth: number;
  width: number;
  priceHeight: number;
  visibleStartIdx: number;
  priceDomain: [number, number];
};

async function readScale(page: Page): Promise<Scale> {
  return JSON.parse((await page.getByTestId('scale').textContent()) || '{}');
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
function yForPrice(s: Scale, price: number) {
  const [lo, hi] = s.priceDomain;
  const t = (Math.log(hi) - Math.log(price)) / (Math.log(hi) - Math.log(lo));
  return t * s.priceHeight;
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect.poll(async () => (await readScale(page)).step ?? 0).toBeGreaterThan(0);
  await settle(page);
});

const gear = (page: Page) => page.locator('[class*="settingsGearBtn"]');
const dialog = (page: Page) => page.locator('[class*="settingsDialog"]');
const centered = (page: Page) => page.locator('[class*="centeredPanel"]');

// A plot point clear of the settings dialog (top-left) and the axis corner.
async function plotPoint(page: Page) {
  const box = await frameBox(page);
  const s = await readScale(page);
  return client(box, s.width * 0.4, s.priceHeight * 0.35);
}

test('settings dialog: a left-click on the plot dismisses it', async ({ page }) => {
  await gear(page).click();
  await expect(dialog(page)).toBeVisible();
  const p = await plotPoint(page);
  await page.mouse.click(p.x, p.y);
  await expect(dialog(page)).toHaveCount(0);
});

test('settings dialog: a click on the price-axis strip dismisses it (capture phase)', async ({
  page,
}) => {
  // The strip's own pointerdown stopPropagations for its rescale drag; only a
  // capture-phase listener runs before it. Nothing below e2e reaches this.
  await gear(page).click();
  await expect(dialog(page)).toBeVisible();
  const box = await frameBox(page);
  const s = await readScale(page);
  const strip = client(box, s.width + 30, s.priceHeight * 0.4);
  await page.mouse.click(strip.x, strip.y);
  await expect(dialog(page)).toHaveCount(0);
});

test('settings dialog: a right-click on the plot dismisses it', async ({ page }) => {
  await gear(page).click();
  await expect(dialog(page)).toBeVisible();
  const p = await plotPoint(page);
  await page.mouse.click(p.x, p.y, { button: 'right' });
  await expect(dialog(page)).toHaveCount(0);
});

test('settings gear: pressing it again closes and stays closed (trigger case)', async ({
  page,
}) => {
  // The gear lives outside the dialog. Without the trigger ref, the press would
  // dismiss and the click would immediately reopen — the menu could never close
  // from its own gear.
  await gear(page).click();
  await expect(dialog(page)).toBeVisible();
  await gear(page).click();
  await expect(dialog(page)).toHaveCount(0);
});

test('settings dialog: a press inside it leaves it open', async ({ page }) => {
  await gear(page).click();
  await expect(dialog(page)).toBeVisible();
  await page.locator('[class*="legendPopoverTitle"]').click();
  await expect(dialog(page)).toBeVisible();
});

test('candles popup: a left-click on the plot dismisses it', async ({ page }) => {
  const box = await frameBox(page);
  await settle(page);
  const s = await readScale(page);
  const slot = 50;
  const bar = DATA[s.visibleStartIdx + slot];
  const my = (yForPrice(s, bar.high) + yForPrice(s, bar.low)) / 2;
  const cd = client(box, slot * s.step + s.bandwidth / 2, my);
  // Paint-time hit regions land a frame after the scale publishes; retry.
  await expect(async () => {
    await page.mouse.dblclick(cd.x, cd.y);
    await expect(centered(page)).toContainText('Candles', { timeout: 500 });
  }).toPass();

  const p = client(box, s.width * 0.15, s.priceHeight * 0.12);
  await page.mouse.click(p.x, p.y);
  await expect(centered(page)).toHaveCount(0);
});

test('drawing style popup: placing a text box opens it and it stays open (self-close guard)', async ({
  page,
}) => {
  // The old timeStamp guard's job: a TEXT box opens this popup from its OWN
  // placing press. Under capture the opening press dispatched before the layer
  // registered, so it cannot self-close — the popup must survive the placement.
  const box = await frameBox(page);
  const s = await readScale(page);
  await page.getByTestId('tool-text').click();
  const p = client(box, s.width * 0.5, s.priceHeight * 0.5);
  await page.mouse.click(p.x, p.y);
  await expect(centered(page)).toContainText('Text');
  await settle(page);
  await expect(centered(page)).toContainText('Text'); // still up
});
