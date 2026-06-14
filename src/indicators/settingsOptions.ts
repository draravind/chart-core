// Shared settings-field building blocks reused across builtin defs.

/** MA-type enum options for `*_matype`/`matype` enum fields (maDispatch supports 0–4). */
export const MA_TYPE_OPTIONS = [
  { label: 'SMA', value: 0 },
  { label: 'EMA', value: 1 },
  { label: 'WMA', value: 2 },
  { label: 'DEMA', value: 3 },
  { label: 'TEMA', value: 4 },
];

/** Line-style enum for the grouped `line` settings field; `value` indexes here
 *  and maps to a canvas dash array via `dashFor`. */
export const LINE_STYLE_OPTIONS = [
  { label: 'Solid', value: 0 },
  { label: 'Dashed', value: 1 },
  { label: 'Dotted', value: 2 },
];

/** Dash array for a line-style index: solid → null, dashed → [4,3], dotted → [1,2]. */
export function dashFor(style: number): number[] | null {
  return style === 1 ? [4, 3] : style === 2 ? [1, 2] : null;
}
