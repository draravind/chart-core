import type { DrawingStyle } from './types';

// Drawing visual defaults. These live HERE (+ the `--chart-drawing*` CSS tokens),
// NOT in the `ChartAppearance` config — per-shape `style` overrides cover all
// customization. Colors are `var(--chart-drawing*)` expressions resolved via the
// chart's `createColorResolver` at draw time (SVG also accepts them directly).
export const DRAWING_DEFAULTS = {
  color: 'var(--chart-drawing)',
  width: 1.5,
  style: 0, // 0 solid | 1 dashed | 2 dotted
  opacity: 1,
  text: '',
  fontSize: 12,
  bgColor: 'var(--chart-drawing-bg)',
  bgOpacity: 0.85,
} as const;

export type EffectiveDrawingStyle = {
  color: string;
  width: number;
  style: number;
  opacity: number;
  text: string;
  fontSize: number;
  bgColor: string;
  bgOpacity: number;
};

// Pure sparse merge: defaults ← (optional) per-shape overrides. Never mutates the
// input; an absent field falls back to the baked default.
export function effectiveDrawingStyle(style?: DrawingStyle): EffectiveDrawingStyle {
  return {
    color: style?.color ?? DRAWING_DEFAULTS.color,
    width: style?.width ?? DRAWING_DEFAULTS.width,
    style: style?.style ?? DRAWING_DEFAULTS.style,
    opacity: style?.opacity ?? DRAWING_DEFAULTS.opacity,
    text: style?.text ?? DRAWING_DEFAULTS.text,
    fontSize: style?.fontSize ?? DRAWING_DEFAULTS.fontSize,
    bgColor: style?.bgColor ?? DRAWING_DEFAULTS.bgColor,
    bgOpacity: style?.bgOpacity ?? DRAWING_DEFAULTS.bgOpacity,
  };
}
