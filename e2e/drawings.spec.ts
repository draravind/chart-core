import { test, expect, type Page } from '@playwright/test';

// Rendered-box geometry for the auto-fitting text box and the redesigned ruler
// measure box — the only tier that can see a laid-out SVG box, its committed
// width, and where the readout pill lands. Coordinate + tool-selection helpers
// mirror drawtoolbar.spec.ts.

const MARGIN_TOP = 4; // Chart.tsx MARGIN.top
const TEXT_PAD_X = 6; // src/drawings/textLayout.ts

type Scale = { width: number; priceHeight: number; step: number };
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
async function selectTool(page: Page, tool: string) {
  await page.getByTestId(`tool-${tool}`).click();
  expect(await page.getByTestId('activeTool').textContent()).toBe(tool);
}
const editor = (page: Page) => page.locator('[data-chart-texteditor] textarea');
const textLabels = (page: Page) => page.locator('.chart-drawing-labels-pan');

// getBBox of the first element matching a selector (SVG geometry, layout-aware).
async function bbox(page: Page, selector: string) {
  return page.locator(selector).first().evaluate((el) => {
    const b = (el as SVGGraphicsElement).getBBox();
    return { x: b.x, y: b.y, width: b.width, height: b.height };
  });
}
async function attrNum(page: Page, selector: string, name: string) {
  const v = await page.locator(selector).first().getAttribute(name);
  return v == null ? null : Number(v);
}
// getBoundingClientRect (SCREEN coords) — accounts for every group transform, so
// it can compare elements that live in differently-translated layers (e.g. the
// ruler box in the pan layer vs its readout pill in the label layer). getBBox is
// pre-transform local coords and cannot.
async function screenRect(page: Page, selector: string) {
  return page.locator(selector).first().evaluate((el) => {
    const r = (el as SVGGraphicsElement).getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, left: r.left, height: r.height };
  });
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect.poll(async () => (await readScale(page)).width ?? 0).toBeGreaterThan(0);
  await settle(page);
});

const rectSel = '.chart-drawing-labels-pan rect';
const textSel = '.chart-drawing-labels-pan text';

// Place one text box (fresh — clears any existing drawings first), type `body`
// with the given per-line keystrokes, commit, and return its committed rect +
// text geometry. `lines` are typed with Shift+Enter between them.
async function placeText(page: Page, lines: string[]) {
  if ((await num(page, 'drawingsCount')) > 0) {
    await page.getByRole('button', { name: 'Delete all drawings' }).click();
    await settle(page);
  }
  const box = await frameBox(page);
  const s = await readScale(page);
  await selectTool(page, 'text');
  const at = client(box, s.width * 0.4, s.priceHeight * 0.4);
  await page.mouse.click(at.x, at.y);
  await editor(page).waitFor();
  for (let i = 0; i < lines.length; i++) {
    if (i > 0) {
      await page.keyboard.down('Shift');
      await page.keyboard.press('Enter');
      await page.keyboard.up('Shift');
    }
    await page.keyboard.type(lines[i]);
  }
  await page.keyboard.press('Enter'); // commit
  await settle(page);
  return {
    rectW: (await attrNum(page, rectSel, 'width')) ?? 0,
    rectH: (await attrNum(page, rectSel, 'height')) ?? 0,
    text: await bbox(page, textSel),
  };
}

test('text box hugs its content and grows with newlines', async ({ page }) => {
  // Short word: the box hugs it — rect width ≈ rendered text width + 2*pad.
  const short = await placeText(page, ['hi']);
  expect(await num(page, 'drawingsCount')).toBe(1);
  expect(Math.abs(short.rectW - (short.text.width + 2 * TEXT_PAD_X))).toBeLessThanOrEqual(2);
  const oneLineHeight = short.text.height;

  // A much longer sentence: the box widens with it, still one line, still hugging.
  const long = await placeText(page, ['this is a considerably longer sentence than hi']);
  expect(long.rectW).toBeGreaterThan(short.rectW + 20);
  expect(Math.abs(long.rectW - (long.text.width + 2 * TEXT_PAD_X))).toBeLessThanOrEqual(2);

  // Three lines of differing length: height spans three lines, width matches the
  // WIDEST line ('wwwwwwwwww'), not the last ('cc'). getBBox of a multi-tspan
  // <text> reports the longest tspan's width, so rect ≈ that + 2*pad.
  const three = await placeText(page, ['a', 'wwwwwwwwww', 'cc']);
  expect(three.text.height).toBeGreaterThan(oneLineHeight * 2.4);
  expect(Math.abs(three.rectW - (three.text.width + 2 * TEXT_PAD_X))).toBeLessThanOrEqual(2);
  expect(three.rectW).toBeGreaterThan(short.rectW); // wider than the 'hi' box
});

test('clicking elsewhere on the chart commits the text box', async ({ page }) => {
  const box = await frameBox(page);
  const s = await readScale(page);
  await selectTool(page, 'text');
  const at = client(box, s.width * 0.55, s.priceHeight * 0.4);
  await page.mouse.click(at.x, at.y);
  await editor(page).waitFor();
  await editor(page).type('commit on outside click');
  // Click a far-away empty spot — NOT Enter/Escape. The plot cancels the press's
  // default focus change, so this only commits via the outside-press path.
  const away = client(box, s.width * 0.2, s.priceHeight * 0.75);
  await page.mouse.click(away.x, away.y);
  await settle(page);
  await expect(editor(page)).toHaveCount(0); // editor closed
  expect(await num(page, 'drawingsCount')).toBe(1); // committed exactly once
  const content = await page.locator(textSel).first().textContent();
  expect(content).toContain('commit on outside click');
});

test('editor width matches the committed box, double spaces preserved', async ({ page }) => {
  const box = await frameBox(page);
  const s = await readScale(page);
  await selectTool(page, 'text');
  const at = client(box, s.width * 0.4, s.priceHeight * 0.4);
  await page.mouse.click(at.x, at.y);
  await editor(page).waitFor();
  // Leading space + double spaces — the case xml:space="preserve" exists for.
  // Long enough to clear the seed-width floor, so the live editor tracks content
  // and matches the committed box (a short box floors at the seed while typing,
  // then hugs on commit — that jump is by design, not what this parity checks).
  await editor(page).fill(' the  quick  brown  fox  jumps');
  await settle(page);
  const taW = (await editor(page).boundingBox())?.width ?? 0;
  await page.keyboard.press('Enter');
  await settle(page);
  const rectW = (await attrNum(page, '.chart-drawing-labels-pan rect', 'width')) ?? 0;
  // The live textarea (border-box, 1px border) and the committed SVG rect track
  // the same content width; a few px of border/sub-pixel rounding separates them
  // — nothing like the ~130px jump a seed-floored short box would show.
  expect(Math.abs(taW - rectW)).toBeLessThanOrEqual(8);

  // The committed text keeps every space: its rendered width is wider than the
  // same string with all spaces squeezed out (what SVG's default whitespace
  // handling would have produced without xml:space="preserve").
  const textW = (await bbox(page, '.chart-drawing-labels-pan text')).width;
  const squeezedW = await page.evaluate(() => {
    const t = document.querySelector('.chart-drawing-labels-pan text');
    if (!t) return 0;
    const clone = t.cloneNode(true) as SVGTextElement;
    clone.textContent = (t.textContent ?? '').replace(/\s+/g, ''); // spaces removed
    t.parentElement!.appendChild(clone);
    const w = clone.getComputedTextLength();
    clone.remove();
    return w;
  });
  expect(textW).toBeGreaterThan(squeezedW + 15);
});

test('ruler renders a bordered-less shaded box with a contained arrow', async ({ page }) => {
  const box = await frameBox(page);
  const s = await readScale(page);
  await selectTool(page, 'ruler');
  // Up-move: second anchor at a HIGHER price (smaller screen y).
  const a = client(box, s.width * 0.35, s.priceHeight * 0.7);
  const b = client(box, s.width * 0.6, s.priceHeight * 0.3);
  await page.mouse.click(a.x, a.y);
  await page.mouse.click(b.x, b.y);
  await settle(page);
  expect(await num(page, 'drawingsCount')).toBe(1);

  const boxRect = '.chart-drawing-pan rect';
  const stroke = await page.locator(boxRect).first().getAttribute('stroke');
  expect(stroke === null || stroke === 'none').toBeTruthy();
  const fo = await attrNum(page, boxRect, 'fill-opacity');
  expect(fo).toBeGreaterThan(0.2);
  expect(fo).toBeLessThan(0.35);

  // Arrow tip is inside the box's vertical span (no overshoot).
  const rb = await bbox(page, boxRect);
  const poly = await bbox(page, '.chart-drawing-pan polygon');
  const tipY = poly.y; // up-arrow tip is at the top of its bbox
  expect(tipY).toBeGreaterThanOrEqual(rb.y - 1);
  expect(tipY).toBeLessThanOrEqual(rb.y + rb.height + 1);
});

test('ruler readout flips above the box near the pane floor', async ({ page }) => {
  const box = await frameBox(page);
  const s = await readScale(page);

  // High up in the pane: pill sits BELOW (pill top > box bottom).
  await selectTool(page, 'ruler');
  let a = client(box, s.width * 0.35, s.priceHeight * 0.5);
  let b = client(box, s.width * 0.6, s.priceHeight * 0.2);
  await page.mouse.click(a.x, a.y);
  await page.mouse.click(b.x, b.y);
  await settle(page);
  // Screen coords: box and pill live in differently-translated layers.
  let rb = await screenRect(page, '.chart-drawing-pan rect');
  let pill = await screenRect(page, '.chart-drawing-labels-pan rect');
  expect(pill.top).toBeGreaterThan(rb.bottom - 1); // below the box

  // Clear and draw one that runs to within ~15px of the floor: pill flips ABOVE.
  await page.getByRole('button', { name: 'Delete all drawings' }).click();
  await settle(page);
  await selectTool(page, 'ruler');
  a = client(box, s.width * 0.35, s.priceHeight * 0.5);
  b = client(box, s.width * 0.6, s.priceHeight - 15);
  await page.mouse.click(a.x, a.y);
  await page.mouse.click(b.x, b.y);
  await settle(page);
  rb = await screenRect(page, '.chart-drawing-pan rect');
  pill = await screenRect(page, '.chart-drawing-labels-pan rect');
  expect(pill.bottom).toBeLessThan(rb.top + 1); // above the box
});

test('exactly one label while placing a ruler; a trendline shows its chip', async ({ page }) => {
  const box = await frameBox(page);
  const s = await readScale(page);

  // Ruler placement: first click, then move the pointer to preview.
  await selectTool(page, 'ruler');
  const a = client(box, s.width * 0.35, s.priceHeight * 0.6);
  const b = client(box, s.width * 0.6, s.priceHeight * 0.3);
  await page.mouse.click(a.x, a.y);
  await page.mouse.move(b.x, b.y);
  await settle(page);
  // Only the ruler's own readout pill — no trailing placing chip.
  expect(await textLabels(page).locator('text').count()).toBe(1);
  await page.keyboard.press('Escape'); // abandon placement

  // Trendline placement: the generic Δ chip IS present.
  await selectTool(page, 'trendline');
  await page.mouse.click(a.x, a.y);
  await page.mouse.move(b.x, b.y);
  await settle(page);
  expect(await textLabels(page).locator('text').count()).toBeGreaterThanOrEqual(1);
});

test('a flat ruler (both anchors one price) is still grabbable', async ({ page }) => {
  const box = await frameBox(page);
  const s = await readScale(page);
  await selectTool(page, 'ruler');
  const y = s.priceHeight * 0.5;
  const a = client(box, s.width * 0.3, y);
  const b = client(box, s.width * 0.65, y); // same price → zero-height box
  await page.mouse.click(a.x, a.y);
  await page.mouse.click(b.x, b.y);
  await settle(page);
  expect(await num(page, 'drawingsCount')).toBe(1);

  // No arrow stub on a flat drag.
  expect(await page.locator('.chart-drawing-pan polygon').count()).toBe(0);

  // Click its middle with the cursor tool: it selects, nothing is added.
  await selectTool(page, 'cursor');
  const mid = client(box, s.width * 0.475, y);
  await page.mouse.click(mid.x, mid.y);
  await settle(page);
  expect(await num(page, 'drawingsCount')).toBe(1);
  // A selected ruler paints its endpoint handles (circles in the label layer).
  expect(await textLabels(page).locator('circle').count()).toBeGreaterThanOrEqual(2);
});
