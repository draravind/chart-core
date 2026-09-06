import { test, expect, type Page } from '@playwright/test';

// The crosshair date pill must sit in the time-axis gutter at the BOTTOM of every
// pane (aligned with the permanent month ticks), not at the price pane's bottom.
// The fixture seeds a volume subpane, so `fullHeight > priceHeight` and the two
// positions are distinct — the exact condition that exposed the bug where the
// pill dropped between the price pane and the subpane.

const MARGIN_TOP = 4; // Chart.tsx MARGIN.top

type Scale = { width: number; priceHeight: number };
async function readScale(page: Page): Promise<Scale> {
  return JSON.parse((await page.getByTestId('scale').textContent()) || '{}');
}
async function frameBox(page: Page) {
  const b = await page.locator('[class*="chartFrame"]').first().boundingBox();
  if (!b) throw new Error('chart frame not found');
  return b;
}
async function settle(page: Page) {
  await page.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect.poll(async () => (await readScale(page)).width ?? 0).toBeGreaterThan(0);
  await settle(page);
});

test('crosshair date pill sits in the gutter below the subpane', async ({ page }) => {
  const box = await frameBox(page);
  const s = await readScale(page);

  // Hover the price pane interior; the crosshair (and its date pill) appears.
  await page.mouse.move(box.x + s.width * 0.5, box.y + MARGIN_TOP + s.priceHeight * 0.35);
  await settle(page);

  const geom = await page.evaluate(() => {
    const svg = document.querySelector('[class*="chartFrame"] svg');
    if (!svg) return null;
    // The date pill: a visible <g> whose text is the "D Mon 'YY" crosshair format
    // (the permanent month ticks read "Aug" / "2025", so the format disambiguates).
    let pillY: number | null = null;
    for (const g of Array.from(svg.querySelectorAll('g'))) {
      if ((g as SVGGElement).style.visibility === 'hidden') continue;
      const txt = g.querySelector('text');
      if (txt && /\d{1,2}\s+\w{3}\s+'\d{2}/.test(txt.textContent || '')) {
        pillY = (g.querySelector('rect') as SVGGraphicsElement).getBoundingClientRect().top;
      }
    }
    // Bottom-most axis tick text = the x-axis month row (the true gutter).
    let tickY = -Infinity;
    for (const t of Array.from(svg.querySelectorAll('.tick text'))) {
      const y = (t as SVGGraphicsElement).getBoundingClientRect().top;
      if (y > tickY) tickY = y;
    }
    return { pillY, tickY: Number.isFinite(tickY) ? tickY : null };
  });

  expect(geom?.pillY).not.toBeNull();
  expect(geom?.tickY).not.toBeNull();

  const priceBottomScreen = box.y + MARGIN_TOP + s.priceHeight;
  const pillY = geom!.pillY!;
  const tickY = geom!.tickY!;

  // A subpane exists: the gutter is well below the price pane's bottom.
  expect(tickY - priceBottomScreen).toBeGreaterThan(20);
  // The pill is in the gutter (aligned with the month ticks), NOT at the price
  // pane's bottom — the regression this guards.
  expect(Math.abs(pillY - tickY)).toBeLessThanOrEqual(12);
  expect(pillY - priceBottomScreen).toBeGreaterThan(20);
});
