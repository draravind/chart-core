// PURE sizer for the on-chart text box. The box hugs its text: width is the
// widest rendered line, height is one line per hard newline — no soft-wrapping.
// `measure(s)` returns the rendered width of a string; the renderer passes the
// real `getComputedTextLength`, tests pass a synthetic fixed-char-width measure.

export const TEXT_PAD_X = 6;
export const TEXT_PAD_Y = 4;
// Seed content width for an empty / just-placed box, in em rather than px, so it
// scales with the font. 10em = 120px content at the default fontSize 12, i.e. a
// 132px box (vs the old fixed 192px) — the just-placed box now starts smaller,
// which is the intended "starts small, grows per line" behaviour, not a regression.
export const TEXT_SEED_EM = 10;
export const textSeedWidth = (fontSize: number): number => fontSize * TEXT_SEED_EM;

export function textBoxLayout(
  text: string,
  fontSize: number,
  measure: (s: string) => number,
): { lines: string[]; boxWidth: number; boxHeight: number } {
  const lineHeight = Math.round(fontSize * 1.35);
  const has = text.length > 0;
  const lines = has ? text.split('\n') : ['']; // one empty line seeds height
  const contentWidth = has
    ? lines.reduce((w, ln) => Math.max(w, measure(ln)), 0)
    : textSeedWidth(fontSize);
  return {
    lines,
    boxWidth: contentWidth + 2 * TEXT_PAD_X,
    boxHeight: lines.length * lineHeight + 2 * TEXT_PAD_Y,
  };
}
