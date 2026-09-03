import { test, expect, type Page } from '@playwright/test';
import { DATA } from './fixture/data';

// Tier 1 — right-click reporting + button correctness. Reads the fixture's
// payload/fire-count readouts and a document-level contextmenu probe that
// records `defaultPrevented` (the frame's handler runs first on the bubble, so
// a document listener sees whether it suppressed the native menu).

const MARGIN_TOP = 4;

type Scale = {
  step: number;
  bandwidth: number;
  width: number;
  priceHeight: number;
  visibleStartIdx: number;
  visibleBarsInt: number;
  priceDomain: [number, number];
};

async function readScale(page: Page): Promise<Scale> {
  return JSON.parse((await page.getByTestId('scale').textContent()) || '{}');
}
async function num(page: Page, id: string) {
  return Number(await page.getByTestId(id).textContent());
}
async function payload(page: Page) {
  const t = await page.getByTestId('ctxPayload').textContent();
  return t ? JSON.parse(t) : null;
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
// Records defaultPrevented of the last contextmenu that reached the document.
async function armProbe(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __ctx?: { prevented: boolean | null } };
    w.__ctx = { prevented: null };
    document.addEventListener('contextmenu', (e) => {
      w.__ctx!.prevented = e.defaultPrevented;
    });
  });
}
async function prevented(page: Page) {
  return page.evaluate(
    () =>
      (window as unknown as { __ctx?: { prevented: boolean | null } }).__ctx
        ?.prevented ?? null,
  );
}
async function rightClick(page: Page, x: number, y: number) {
  await page.mouse.move(x, y);
  await page.mouse.click(x, y, { button: 'right' });
  await settle(page);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect.poll(async () => (await readScale(page)).step ?? 0).toBeGreaterThan(0);
  await armProbe(page);
});

test('price pane: reports price + bar, value null, menu suppressed', async ({
  page,
}) => {
  const box = await frameBox(page);
  const s = await readScale(page);
  const slot = 40;
  const barIndex = s.visibleStartIdx + slot;
  const p = client(box, slot * s.step + s.step / 2, s.priceHeight * 0.5);
  await rightClick(page, p.x, p.y);

  const info = await payload(page);
  expect(info.pane.kind).toBe('price');
  expect(info.barIndex).toBe(barIndex);
  expect(info.date).toBe(DATA[barIndex].date);
  expect(typeof info.price).toBe('number');
  expect(info.value).toBeNull();
  expect(await prevented(page)).toBe(true);
});

test('empty area right of the last bar: price kind, barIndex null', async ({
  page,
}) => {
  const box = await frameBox(page);
  const s = await readScale(page);
  const p = client(box, s.width - 4, s.priceHeight * 0.4);
  await rightClick(page, p.x, p.y);

  const info = await payload(page);
  expect(info.pane.kind).toBe('price');
  expect(info.barIndex).toBeNull();
  expect(info.date).toBeNull();
  expect(typeof info.price).toBe('number');
});

test('subpane: reports value, price null', async ({ page }) => {
  const box = await frameBox(page);
  const s = await readScale(page);
  // 30px below the price↔subpane boundary — clear of the 4px divider strip.
  const p = client(box, s.width * 0.5, s.priceHeight + 30);
  await rightClick(page, p.x, p.y);

  const info = await payload(page);
  expect(info.pane.kind).toBe('subpane');
  expect(typeof info.value).toBe('number');
  expect(info.price).toBeNull();
  expect(await prevented(page)).toBe(true);
});

test('gutter: gutter kind, both null, menu suppressed', async ({ page }) => {
  const box = await frameBox(page);
  const s = await readScale(page);
  const p = client(box, s.width + 30, s.priceHeight * 0.4);
  await rightClick(page, p.x, p.y);

  const info = await payload(page);
  expect(info.pane.kind).toBe('gutter');
  expect(info.price).toBeNull();
  expect(info.value).toBeNull();
  expect(info.barIndex).toBeNull();
  expect(await prevented(page)).toBe(true);
});

test('time strip: none kind', async ({ page }) => {
  const box = await frameBox(page);
  // A few px above the frame bottom — below every pane (time strip / bottom margin).
  await rightClick(page, box.x + box.width * 0.5, box.y + box.height - 3);
  const info = await payload(page);
  expect(info.pane.kind).toBe('none');
});

test('divider strip: none kind, menu suppressed', async ({ page }) => {
  const divider = page.locator('[class*="subpaneDivider"]').first();
  const dbox = await divider.boundingBox();
  if (!dbox) throw new Error('no subpane divider');
  await rightClick(page, dbox.x + dbox.width / 2, dbox.y + dbox.height / 2);

  const info = await payload(page);
  expect(info.pane.kind).toBe('none');
  expect(await prevented(page)).toBe(true);
});

test('inside SettingsDialog: native menu kept (defaultPrevented false)', async ({
  page,
}) => {
  await page.locator('[class*="settingsGearBtn"]').click();
  const dialog = page.locator('[class*="settingsDialog"]');
  await expect(dialog).toBeVisible();
  const before = await num(page, 'ctxFireCount');
  const dbox = await dialog.boundingBox();
  if (!dbox) throw new Error('no settings dialog');
  await rightClick(page, dbox.x + dbox.width / 2, dbox.y + 20);

  expect(await prevented(page)).toBe(false);
  expect(await num(page, 'ctxFireCount')).toBe(before); // no payload
});

test('no onContextMenu handler: native menu shows', async ({ page }) => {
  await page.goto('/?noctx');
  await expect.poll(async () => (await readScale(page)).step ?? 0).toBeGreaterThan(0);
  await armProbe(page);
  const box = await frameBox(page);
  const s = await readScale(page);
  const p = client(box, s.width * 0.5, s.priceHeight * 0.5);
  await rightClick(page, p.x, p.y);
  expect(await prevented(page)).toBe(false);
});

test('mid-pan right-click: no payload, menu suppressed, no pan change', async ({
  page,
}) => {
  const box = await frameBox(page);
  const s = await readScale(page);
  const before = await num(page, 'ctxFireCount');
  const start = client(box, s.width * 0.5, s.priceHeight * 0.5);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x - 60, start.y, { steps: 5 });
  // Right-click while the left button is still held.
  await page.mouse.click(start.x - 60, start.y, { button: 'right' });
  await settle(page);
  expect(await num(page, 'ctxFireCount')).toBe(before); // no payload mid-gesture
  expect(await prevented(page)).toBe(true);
  await page.mouse.up();
});

test('right-click never pans; Ctrl+left never pans', async ({ page }) => {
  const box = await frameBox(page);
  const s = await readScale(page);
  const p = client(box, s.width * 0.5, s.priceHeight * 0.5);

  expect(await num(page, 'panOffset')).toBe(0);
  // A right-button drag must not pan.
  await page.mouse.move(p.x, p.y);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(p.x - 80, p.y, { steps: 5 });
  await page.mouse.up({ button: 'right' });
  await settle(page);
  expect(await num(page, 'panOffset')).toBe(0);

  // Ctrl+left press+drag must not pan (macOS Ctrl+click guard).
  await page.keyboard.down('Control');
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(p.x - 80, p.y, { steps: 5 });
  await page.mouse.up();
  await page.keyboard.up('Control');
  await settle(page);
  expect(await num(page, 'panOffset')).toBe(0);
});

test('right-click after dragging a divider down classifies as subpane', async ({
  page,
}) => {
  const divider = page.locator('[class*="subpaneDivider"]').first();
  const dbox = await divider.boundingBox();
  if (!dbox) throw new Error('no subpane divider');
  const cx = dbox.x + dbox.width / 2;
  const cy = dbox.y + dbox.height / 2;
  // Drag the divider DOWN 40px (price pane grows, boundary moves down).
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx, cy + 40, { steps: 6 });
  await page.mouse.up();
  await settle(page);

  // 10px BELOW the divider's OLD line is now inside the enlarged price pane.
  await rightClick(page, cx, cy + 10);
  const info = await payload(page);
  expect(info.pane.kind).toBe('price');
});
