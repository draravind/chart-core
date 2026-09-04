import { test, expect, type Page, type CDPSession } from '@playwright/test';
import { DATA } from './fixture/data';

// Tier 3 — touch + Pointer Events. Drives REAL pointer events by dispatching raw
// touch through CDP (`Input.dispatchTouchEvent`); `page.touchscreen` / synthetic
// TouchEvents generate no pointer events, so they cannot exercise this path.
// Chromium-only by construction (CDP). The math paths are the same ones the lock
// spec pins on mouse — here we prove finger pan, two-finger pinch, the pointerId
// filter, and pointercancel aborts.

test.use({ hasTouch: true });

const MARGIN_TOP = 4;

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
function yForPrice(s: Scale, price: number) {
  const [lo, hi] = s.priceDomain;
  const t = (Math.log(hi) - Math.log(price)) / (Math.log(hi) - Math.log(lo));
  return t * s.priceHeight;
}
async function settle(page: Page) {
  await page.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
}

// One touch stream. Each dispatch sends the FULL set of currently-down points;
// Chrome diffs against the previous set to emit pointer down/move/up, so a
// start/end need only add/remove a point from the live set.
type Pt = { id: number; x: number; y: number };
async function touch(
  cdp: CDPSession,
  type: 'touchStart' | 'touchEnd' | 'touchMove' | 'touchCancel',
  points: Pt[],
) {
  await cdp.send('Input.dispatchTouchEvent', {
    type,
    touchPoints: points.map((p) => ({ x: p.x, y: p.y, id: p.id })),
  });
}

async function cdpFor(page: Page): Promise<CDPSession> {
  return page.context().newCDPSession(page);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect.poll(async () => (await readScale(page)).step ?? 0).toBeGreaterThan(0);
});

test('one-finger drag pans', async ({ page }) => {
  const cdp = await cdpFor(page);
  const box = await frameBox(page);
  const s = await readScale(page);
  expect(await num(page, 'panOffset')).toBe(0);

  const start = client(box, s.width * 0.5, s.priceHeight * 0.5);
  await touch(cdp, 'touchStart', [{ id: 0, x: start.x, y: start.y }]);
  for (let dx = 20; dx <= 100; dx += 20)
    await touch(cdp, 'touchMove', [{ id: 0, x: start.x - dx, y: start.y }]);
  await touch(cdp, 'touchEnd', []);
  await settle(page);

  expect(await num(page, 'panOffset')).toBe(Math.round(-100 / s.step));
});

test('two-finger pinch out zooms in; panOffset stays put', async ({ page }) => {
  const cdp = await cdpFor(page);
  const box = await frameBox(page);
  const s = await readScale(page);
  const cx = client(box, s.width * 0.5, s.priceHeight * 0.5).x;
  const cy = client(box, s.width * 0.5, s.priceHeight * 0.5).y;
  const before = await num(page, 'visibleBars');

  // Both fingers land, then spread apart (spread 100 → 500 ⇒ ratio 5 ⇒ zoom in).
  await touch(cdp, 'touchStart', [
    { id: 0, x: cx - 50, y: cy },
    { id: 1, x: cx + 50, y: cy },
  ]);
  for (let half = 90; half <= 250; half += 40)
    await touch(cdp, 'touchMove', [
      { id: 0, x: cx - half, y: cy },
      { id: 1, x: cx + half, y: cy },
    ]);
  await touch(cdp, 'touchEnd', []);
  await settle(page);

  expect(await num(page, 'visibleBars')).toBeLessThan(before);
  expect(await num(page, 'panOffset')).toBe(0);
});

test('pinch in past the cap stops at maxVisibleBars', async ({ page }) => {
  const cdp = await cdpFor(page);
  const box = await frameBox(page);
  const s = await readScale(page);
  const cx = client(box, s.width * 0.5, s.priceHeight * 0.5).x;
  const cy = client(box, s.width * 0.5, s.priceHeight * 0.5).y;

  // Far apart, then pull together hard (spread collapses ⇒ zoom out past the cap).
  await touch(cdp, 'touchStart', [
    { id: 0, x: cx - 300, y: cy },
    { id: 1, x: cx + 300, y: cy },
  ]);
  for (const half of [200, 120, 60, 20, 6])
    await touch(cdp, 'touchMove', [
      { id: 0, x: cx - half, y: cy },
      { id: 1, x: cx + half, y: cy },
    ]);
  await touch(cdp, 'touchEnd', []);
  await expect.poll(() => num(page, 'visibleBars')).toBe(s.maxVisibleBars);
});

test('a vertical finger drag does not scroll the page', async ({ page }) => {
  const cdp = await cdpFor(page);
  const box = await frameBox(page);
  const s = await readScale(page);
  const start = client(box, s.width * 0.5, s.priceHeight * 0.4);

  await touch(cdp, 'touchStart', [{ id: 0, x: start.x, y: start.y }]);
  for (let dy = 40; dy <= 200; dy += 40)
    await touch(cdp, 'touchMove', [{ id: 0, x: start.x, y: start.y + dy }]);
  await touch(cdp, 'touchEnd', []);
  await settle(page);

  // touch-action:none on the svg means the browser never claimed the drag as a
  // page scroll.
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

test('double-tap a candle opens the Candles popup', async ({ page }) => {
  const cdp = await cdpFor(page);
  const box = await frameBox(page);
  await settle(page);
  const s = await readScale(page);
  const panel = page.locator('[class*="centeredPanel"]');

  const slot = 50;
  const bar = DATA[s.visibleStartIdx + slot];
  const my = (yForPrice(s, bar.high) + yForPrice(s, bar.low)) / 2;
  const cd = client(box, slot * s.step + s.bandwidth / 2, my);

  await expect(async () => {
    await touch(cdp, 'touchStart', [{ id: 0, x: cd.x, y: cd.y }]);
    await touch(cdp, 'touchEnd', []);
    await touch(cdp, 'touchStart', [{ id: 0, x: cd.x, y: cd.y }]);
    await touch(cdp, 'touchEnd', []);
    await expect(panel).toContainText('Candles', { timeout: 500 });
  }).toPass();
});

test('a stray second finger does not drive a one-finger pan (pointerId filter)', async ({
  page,
}) => {
  const cdp = await cdpFor(page);
  const box = await frameBox(page);
  const s = await readScale(page);
  const start = client(box, s.width * 0.5, s.priceHeight * 0.5);

  // Finger 0 pans on the plot; finger 1 presses OUTSIDE the chart (empty page,
  // never on the overlay) so it forms no pinch — its moves must be ignored by the
  // gesture's pointer-identity check.
  await touch(cdp, 'touchStart', [{ id: 0, x: start.x, y: start.y }]);
  await touch(cdp, 'touchMove', [{ id: 0, x: start.x - 40, y: start.y }]);
  await touch(cdp, 'touchStart', [
    { id: 0, x: start.x - 40, y: start.y },
    { id: 1, x: 1380, y: 850 },
  ]);
  // Thrash finger 1 wildly; finger 0 holds still.
  for (const fx of [1200, 300, 1400, 100])
    await touch(cdp, 'touchMove', [
      { id: 0, x: start.x - 40, y: start.y },
      { id: 1, x: fx, y: 850 },
    ]);
  // Finger 0 completes its drag to a known total of -100px.
  await touch(cdp, 'touchMove', [
    { id: 0, x: start.x - 100, y: start.y },
    { id: 1, x: 100, y: 850 },
  ]);
  await touch(cdp, 'touchEnd', [{ id: 1, x: 100, y: 850 }]); // lift finger 0
  await touch(cdp, 'touchEnd', []); // lift finger 1
  await settle(page);

  // The pan tracked finger 0 only.
  expect(await num(page, 'panOffset')).toBe(Math.round(-100 / s.step));
});

test('touchCancel aborts a one-finger pan back to the start', async ({ page }) => {
  const cdp = await cdpFor(page);
  const box = await frameBox(page);
  const s = await readScale(page);
  const start = client(box, s.width * 0.5, s.priceHeight * 0.5);

  await touch(cdp, 'touchStart', [{ id: 0, x: start.x, y: start.y }]);
  for (let dx = 30; dx <= 90; dx += 30)
    await touch(cdp, 'touchMove', [{ id: 0, x: start.x - dx, y: start.y }]);
  await touch(cdp, 'touchCancel', []);
  await settle(page);

  // Reverts: no committed pan, and the grabbing cursor is cleared.
  expect(await num(page, 'panOffset')).toBe(0);
  const cursor = await page
    .locator('[class*="chartWrapper"]')
    .first()
    .evaluate((el) => (el as HTMLElement).style.cursor);
  expect(cursor).toBe('');
});

test('touchCancel on a divider drag reverts heights with no commit', async ({
  page,
}) => {
  const cdp = await cdpFor(page);
  const divider = page.locator('[class*="subpaneDivider"]').first();
  const dbox = await divider.boundingBox();
  if (!dbox) throw new Error('no subpane divider — is a subpane indicator on?');
  expect(await page.getByTestId('subpaneHeights').textContent()).toBe('null');
  expect(await num(page, 'subpaneChangeCount')).toBe(0);

  const cx = dbox.x + dbox.width / 2;
  const cy = dbox.y + dbox.height / 2;
  await touch(cdp, 'touchStart', [{ id: 0, x: cx, y: cy }]);
  for (let dy = 15; dy <= 45; dy += 15)
    await touch(cdp, 'touchMove', [{ id: 0, x: cx, y: cy + dy }]);
  await touch(cdp, 'touchCancel', []);
  await settle(page);

  // Reverted to auto (null), and nothing was committed to the host.
  expect(await page.getByTestId('subpaneHeights').textContent()).toBe('null');
  expect(await num(page, 'subpaneChangeCount')).toBe(0);
});
