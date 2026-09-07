import { test, expect, type Page } from '@playwright/test';

// Behaviour locks for the axis furniture around the crosshair:
//  1. The two crosshair pills sit an EQUAL gap from their axes (they had drifted
//     to 2px off the price axis vs 4px off the time axis).
//  2. The axis tick marks share the axis-line colour and are fully opaque (they
//     had rendered at 12% opacity in a different tint, looking orphaned).
//  3. The crosshair LINES stay inside the plot — hovering an axis gutter hides
//     them instead of drawing a stray line past the axis into the gutter.
//
// The fixture seeds a volume subpane, so the plot's bottom (fullHeight) sits well
// below the price pane; positions are read from the real axis-line DOM nodes
// (`data-chart-role`) rather than a recomputed geometry.

const MARGIN_TOP = 4; // Chart.tsx MARGIN.top

async function readScaleWidth(page: Page): Promise<number> {
  const raw = (await page.getByTestId('scale').textContent()) || '{}';
  return JSON.parse(raw).width ?? 0;
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
// Screen-space rects of the two axis lines (drawn as fixed frame furniture).
async function axisLines(page: Page) {
  return page.evaluate(() => {
    const border = document
      .querySelector('[data-chart-role="y-axis-border"]')!
      .getBoundingClientRect();
    const baseline = document
      .querySelector('[data-chart-role="x-axis-baseline"]')!
      .getBoundingClientRect();
    return { borderX: border.left, baselineY: baseline.top };
  });
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect.poll(async () => readScaleWidth(page)).toBeGreaterThan(0);
  await settle(page);
});

test('crosshair pills sit an equal gap from both axes', async ({ page }) => {
  const box = await frameBox(page);
  const width = await readScaleWidth(page);

  // Hover the price-pane interior so both pills appear.
  await page.mouse.move(box.x + width * 0.5, box.y + MARGIN_TOP + 120);
  await settle(page);

  const { borderX, baselineY } = await axisLines(page);

  const gaps = await page.evaluate(() => {
    const svg = document.querySelector('[class*="chartFrame"] svg')!;
    let priceLeft: number | null = null; // price pill's left edge (screen px)
    let dateTop: number | null = null; // date pill's top edge (screen px)
    for (const g of Array.from(svg.querySelectorAll('g'))) {
      if ((g as SVGGElement).style.visibility === 'hidden') continue;
      const rect = g.querySelector(':scope > rect');
      const txt = g.querySelector(':scope > text');
      if (!rect || !txt) continue;
      const w = rect.getAttribute('width');
      // Price pill: 56-wide rounded rect with a numeric label.
      if (w === '56' && /\d/.test(txt.textContent || '')) {
        priceLeft = rect.getBoundingClientRect().left;
      }
      // Date pill: 72-wide, "D Mon 'YY" text (disambiguates from month ticks).
      if (w === '72' && /\d{1,2}\s+\w{3}\s+'\d{2}/.test(txt.textContent || '')) {
        dateTop = rect.getBoundingClientRect().top;
      }
    }
    return { priceLeft, dateTop };
  });

  expect(gaps.priceLeft).not.toBeNull();
  expect(gaps.dateTop).not.toBeNull();

  const priceGap = gaps.priceLeft! - borderX; // pill's distance right of the y-axis
  const dateGap = gaps.dateTop! - baselineY; // pill's distance below the x-axis

  // The lock: both pills use the SAME gap (a shared CROSSHAIR_PILL_GAP), so they
  // can't drift apart again (they were 2px vs 4px). The absolute value is a design
  // choice — assert the two match, plus a sane band so a gross break still trips.
  expect(Math.abs(priceGap - dateGap)).toBeLessThanOrEqual(1);
  expect(priceGap).toBeGreaterThanOrEqual(-1);
  expect(priceGap).toBeLessThanOrEqual(6);
});

test('axis tick marks match the axis-line colour and are fully opaque', async ({
  page,
}) => {
  const styles = await page.evaluate(() => {
    const svg = document.querySelector('[class*="chartFrame"] svg')!;
    const tickLine = svg.querySelector('.tick line');
    const border = document.querySelector('[data-chart-role="y-axis-border"]')!;
    if (!tickLine) return null;
    const t = getComputedStyle(tickLine as Element);
    const b = getComputedStyle(border);
    return {
      tickStroke: t.stroke,
      tickOpacity: (tickLine as Element).getAttribute('stroke-opacity'),
      borderStroke: b.stroke,
    };
  });

  expect(styles).not.toBeNull();
  // Same resolved colour as the axis line (both --chart-separator), not a fainter
  // differently-tinted mark.
  expect(styles!.tickStroke).toBe(styles!.borderStroke);
  // Fully opaque (default axis.opacity is now 1, was 0.12).
  expect(styles!.tickOpacity).toBe('1');
});

test('crosshair lines stay inside the plot — hidden over the axis gutters', async ({
  page,
}) => {
  const { borderX, baselineY } = await axisLines(page);

  // Dashed crosshair lines: the vertical keeps y1="0", the horizontal x1="0", and
  // both carry the crosshair's 0.3 stroke-opacity — distinct from ticks/borders.
  const crossVisibility = () =>
    page.evaluate(() => {
      const svg = document.querySelector('[class*="chartFrame"] svg')!;
      const dashed = Array.from(svg.querySelectorAll('line')).filter(
        (l) =>
          l.getAttribute('stroke-dasharray') &&
          l.getAttribute('stroke-opacity') === '0.3',
      );
      const vis = (pred: (l: SVGLineElement) => boolean) => {
        const l = dashed.find(pred) as SVGLineElement | undefined;
        return l ? getComputedStyle(l).visibility : 'missing';
      };
      return {
        vertical: vis((l) => l.getAttribute('y1') === '0'),
        horizontal: vis((l) => l.getAttribute('x1') === '0'),
      };
    });

  // Inside the plot: both crosshair lines are visible.
  await page.mouse.move(borderX - 200, baselineY - 150);
  await settle(page);
  expect(await crossVisibility()).toEqual({
    vertical: 'visible',
    horizontal: 'visible',
  });

  // Right (price-axis) gutter — past the y-axis line: lines hidden.
  await page.mouse.move(borderX + 25, baselineY - 150);
  await settle(page);
  expect(await crossVisibility()).toEqual({
    vertical: 'hidden',
    horizontal: 'hidden',
  });

  // Back inside, then the bottom (time-axis) gutter — past the baseline: hidden.
  await page.mouse.move(borderX - 200, baselineY - 150);
  await settle(page);
  await page.mouse.move(borderX - 200, baselineY + 15);
  await settle(page);
  expect(await crossVisibility()).toEqual({
    vertical: 'hidden',
    horizontal: 'hidden',
  });
});
