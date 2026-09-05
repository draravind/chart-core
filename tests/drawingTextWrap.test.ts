import { describe, it, expect } from 'vitest';
import { wrapText } from '../src/drawings/wrapText';

// Synthetic measure: every character is 10px wide. So a box of width 45 fits
// four characters (40px) but not five (50px), and a space counts as a char.
const charWidth = (px: number) => (s: string) => s.length * px;
const measure10 = charWidth(10);

describe('wrapText', () => {
  it('keeps a single word wider than the box on one line (no mid-word break)', () => {
    // "hugeword" is 80px, box is 45px — still one line, it just overflows.
    expect(wrapText('hugeword', 45, measure10)).toEqual(['hugeword']);
  });

  it('breaks two overflowing words to a second line at the space', () => {
    // "aaa bbb" is 70px > 45px; wraps after the first word.
    expect(wrapText('aaa bbb', 45, measure10)).toEqual(['aaa', 'bbb']);
  });

  it('preserves hard newlines, then soft-wraps each segment', () => {
    // Segment 1 "aa" fits; segment 2 "bbb ccc" (70px) soft-wraps.
    const lines = wrapText('aa\nbbb ccc', 45, measure10);
    expect(lines).toEqual(['aa', 'bbb', 'ccc']);
    // line count = hard breaks (1) + soft wraps (1) + 1
    expect(lines.length).toBe(3);
  });

  it('keeps words that still fit together on one line', () => {
    // "ab cd" is 50px > 45px so it wraps; "ab c" (40px) fits.
    expect(wrapText('ab c', 45, measure10)).toEqual(['ab c']);
  });

  it('returns one empty line for an empty string (box still paints)', () => {
    expect(wrapText('', 180, measure10)).toEqual(['']);
  });
});
