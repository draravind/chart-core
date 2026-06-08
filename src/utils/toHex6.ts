// Native <input type="color"> only accepts `#rrggbb`. The color resolver
// (`resolveChartColors`) returns `getComputedStyle().color`, whose shape varies
// by source token:
//   • `rgb(r, g, b)` / `rgba(r, g, b, a)`     — 0..255 ints (plain hex/rgb tokens)
//   • `color(srgb r g b[ / a])`               — 0..1 floats (color-mix() tokens,
//                                                Chrome's modern computed form)
//   • `#rrggbb`                               — the resolver's own fallback
// Convert the first two → hex and pass `#rrggbb` through. Alpha is dropped (the
// swatch is opaque); `color-mix(... transparent)` line tokens still hex to their
// base color, which is what the user edits.

const FALLBACK = '#888888';

const hex255 = (n: number): string =>
  Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');

export function toHex6(color: string): string {
  const s = color.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(s)) return s.toLowerCase();
  const rgb = s.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
  if (rgb) return `#${hex255(+rgb[1])}${hex255(+rgb[2])}${hex255(+rgb[3])}`;
  const srgb = s.match(/^color\(\s*srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/i);
  if (srgb)
    return `#${hex255(+srgb[1] * 255)}${hex255(+srgb[2] * 255)}${hex255(+srgb[3] * 255)}`;
  return FALLBACK;
}
