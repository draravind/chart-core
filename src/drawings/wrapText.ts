// PURE greedy word-wrap for the on-chart text box. `measure(s)` returns the
// rendered width of a string — the renderer passes the real
// `getComputedTextLength`; tests pass a synthetic fixed-char-width measure.
//
// Hard newlines already in the text are preserved (the editor is `pre-wrap`),
// then each segment soft-wraps to `boxWidth`, so the line count is
// hard-breaks + soft-wraps. A single word wider than the box is NOT broken
// mid-word — it overflows on its own line. Always returns at least one line (an
// empty string yields one empty line) so the box still paints.
export function wrapText(
  text: string,
  boxWidth: number,
  measure: (s: string) => number,
): string[] {
  const out: string[] = [];
  for (const segment of text.split('\n')) {
    let line = '';
    for (const word of segment.split(' ')) {
      const candidate = line === '' ? word : `${line} ${word}`;
      if (line !== '' && measure(candidate) > boxWidth) {
        out.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    out.push(line);
  }
  return out;
}
