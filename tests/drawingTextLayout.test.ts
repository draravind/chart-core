import { describe, it, expect } from 'vitest';
import {
  textBoxLayout,
  textSeedWidth,
  TEXT_PAD_X,
  TEXT_PAD_Y,
} from '../src/drawings/textLayout';

// Synthetic measure: every character is 10px wide — the same seam the old
// wrapText test used. No DOM, so this is a pure-tier test.
const measure10 = (s: string) => s.length * 10;

const lineHeight = (fontSize: number) => Math.round(fontSize * 1.35);

describe('textBoxLayout', () => {
  it('widens to the widest line, not the first or last', () => {
    // 'a' (10), 'bbbbb' (50), 'cc' (20) — widest is the middle line.
    const { boxWidth } = textBoxLayout('a\nbbbbb\ncc', 12, measure10);
    expect(boxWidth).toBe(50 + 2 * TEXT_PAD_X);
  });

  it('one line of height per newline', () => {
    const { lines, boxHeight } = textBoxLayout('aa\nbbb\ncc', 12, measure10);
    expect(lines.length).toBe(3);
    expect(boxHeight).toBe(3 * lineHeight(12) + 2 * TEXT_PAD_Y);
  });

  it('keeps a very long line on ONE line, box grows past 180 (no soft-wrap)', () => {
    const long = 'x'.repeat(40); // 400px
    const { lines, boxWidth } = textBoxLayout(long, 12, measure10);
    expect(lines.length).toBe(1);
    expect(boxWidth).toBeGreaterThan(180);
    // A long line WITH spaces also stays one line (spaces are not break points).
    const spaced = textBoxLayout('aaa bbb ccc ddd eee fff', 12, measure10);
    expect(spaced.lines.length).toBe(1);
    expect(spaced.boxWidth).toBeGreaterThan(180);
  });

  it('empty string seeds one line at the seed width', () => {
    const { lines, boxWidth, boxHeight } = textBoxLayout('', 12, measure10);
    expect(lines).toEqual(['']);
    expect(boxWidth).toBe(textSeedWidth(12) + 2 * TEXT_PAD_X);
    expect(boxHeight).toBe(1 * lineHeight(12) + 2 * TEXT_PAD_Y);
  });

  it('a trailing newline still gets a second (empty) line of height', () => {
    const { lines, boxHeight } = textBoxLayout('a\n', 12, measure10);
    expect(lines).toEqual(['a', '']);
    expect(boxHeight).toBe(2 * lineHeight(12) + 2 * TEXT_PAD_Y);
  });

  it('the seed scales with fontSize', () => {
    expect(textSeedWidth(12)).toBe(120);
    expect(textSeedWidth(48)).toBe(480);
  });

  it('height is monotonic in fontSize and never mutates the input', () => {
    const input = 'aa\nbb';
    const frozen = input;
    let prev = -1;
    for (const fs of [6, 12, 48]) {
      const { boxHeight } = textBoxLayout(input, fs, measure10);
      expect(boxHeight).toBeGreaterThan(prev);
      prev = boxHeight;
    }
    expect(input).toBe(frozen);
  });
});
