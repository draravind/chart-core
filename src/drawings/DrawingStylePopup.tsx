import { useRef } from 'react';
import { Trash2 } from 'lucide-react';

import type { DrawingShape, DrawingStyle } from './types';
import { effectiveDrawingStyle } from './defaults';
import { LINE_STYLE_OPTIONS } from '../indicators/settingsOptions';
import {
  ColorField,
  EnumField,
  NumberField,
  SliderField,
} from '../controls/SettingsFields';
import { useDismissable } from '../controls/useDismissable';
import { cn } from '../internal/cn';
import chartStyles from '../Chart.module.css';
import styles from './drawings.module.css';

// Floating per-drawing style popup, rendered INSIDE the Chart wrapper (selection
// is Chart-internal). Reuses the shared SettingsFields vocabulary; each edit
// builds a patched shape and routes it through `onChange` (replace-by-id). Must
// carry `data-chart-wheel-scroll` so the chart's greedy wheel handler yields.

type Props = {
  shape: DrawingShape;
  onChange: (next: DrawingShape) => void;
  onDelete: () => void;
  resolveColor: (expr: string) => string;
  onClose: () => void;
  className?: string;
  style?: React.CSSProperties;
};

const TITLES: Record<DrawingShape['type'], string> = {
  trendline: 'Trend line',
  hline: 'Horizontal line',
  vline: 'Vertical line',
  hray: 'Horizontal ray',
  ray: 'Ray',
  text: 'Text',
  ruler: 'Ruler',
};

export default function DrawingStylePopup({
  shape,
  onChange,
  onDelete,
  resolveColor,
  onClose,
  className,
  style,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const eff = effectiveDrawingStyle(shape.style);
  const isText = shape.type === 'text';

  // Uniform dismissal via the shared layer stack. This popup carries only colour
  // / size / background for a text shape — the text itself is edited on-canvas
  // and the box sizes to it — so it no longer opens from a placing press.
  useDismissable(true, onClose, [ref]);

  const patch = (partial: Partial<DrawingStyle>) =>
    onChange({ ...shape, style: { ...shape.style, ...partial } });
  const resetKey = (key: keyof DrawingStyle) => {
    const next: DrawingStyle = { ...shape.style };
    delete next[key];
    onChange({ ...shape, style: next });
  };

  return (
    <div
      className={cn(styles.drawingPopup, className)}
      ref={ref}
      style={style}
      data-chart-wheel-scroll
      data-chart-native-menu
    >
      <div className={chartStyles.legendPopoverHeader}>
        <span className={chartStyles.legendPopoverTitle}>{TITLES[shape.type]}</span>
        <button
          type="button"
          className={chartStyles.legendPopoverClose}
          title="Close"
          onClick={onClose}
        >
          ×
        </button>
      </div>
      <div className={chartStyles.panelScrollBody}>
        {isText ? (
          <>
            <ColorField
              label="Text color"
              colorExpr={shape.style?.color ?? eff.color}
              isOverridden={shape.style?.color !== undefined}
              resolveColor={resolveColor}
              onCommit={(hex) => patch({ color: hex })}
              onReset={() => resetKey('color')}
            />
            <NumberField
              spec={{
                key: 'fontSize',
                label: 'Font size',
                kind: 'number',
                default: eff.fontSize,
                min: 6,
                max: 48,
                step: 1,
              }}
              value={eff.fontSize}
              onCommit={(v) => patch({ fontSize: v })}
            />
            <ColorField
              label="Background"
              colorExpr={shape.style?.bgColor ?? eff.bgColor}
              isOverridden={shape.style?.bgColor !== undefined}
              resolveColor={resolveColor}
              onCommit={(hex) => patch({ bgColor: hex })}
              onReset={() => resetKey('bgColor')}
            />
            <SliderField
              label="Background opacity"
              value={eff.bgOpacity}
              onCommit={(v) => patch({ bgOpacity: v })}
            />
          </>
        ) : (
          <>
            <ColorField
              label="Color"
              colorExpr={shape.style?.color ?? eff.color}
              isOverridden={shape.style?.color !== undefined}
              resolveColor={resolveColor}
              onCommit={(hex) => patch({ color: hex })}
              onReset={() => resetKey('color')}
            />
            <NumberField
              spec={{
                key: 'width',
                label: 'Width',
                kind: 'number',
                default: eff.width,
                min: 0.5,
                max: 10,
                step: 0.1,
              }}
              value={eff.width}
              onCommit={(v) => patch({ width: v })}
            />
            <EnumField
              spec={{
                key: 'style',
                label: 'Style',
                kind: 'enum',
                default: eff.style,
                options: LINE_STYLE_OPTIONS,
              }}
              value={eff.style}
              onChange={(v) => patch({ style: v })}
            />
            <SliderField
              label="Opacity"
              value={eff.opacity}
              onCommit={(v) => patch({ opacity: v })}
            />
          </>
        )}
        <button
          type="button"
          className={styles.drawingDeleteBtn}
          onClick={onDelete}
        >
          <Trash2 size={13} /> Delete
        </button>
      </div>
    </div>
  );
}
