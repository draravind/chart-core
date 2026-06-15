import { useEffect, useRef, useState } from 'react';
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
  style,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const textRef = useRef<HTMLInputElement | null>(null);
  const eff = effectiveDrawingStyle(shape.style);
  const isText = shape.type === 'text';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Focus the text field when a freshly-placed (empty) text box opens.
  useEffect(() => {
    if (isText && !shape.style?.text) textRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shape.id]);

  const patch = (partial: Partial<DrawingStyle>) =>
    onChange({ ...shape, style: { ...shape.style, ...partial } });
  const resetKey = (key: keyof DrawingStyle) => {
    const next: DrawingStyle = { ...shape.style };
    delete next[key];
    onChange({ ...shape, style: next });
  };

  const [textDraft, setTextDraft] = useState(shape.style?.text ?? '');
  useEffect(() => setTextDraft(shape.style?.text ?? ''), [shape.id, shape.style?.text]);

  return (
    <div
      className={styles.drawingPopup}
      ref={ref}
      style={style}
      data-chart-wheel-scroll
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
            <label className={chartStyles.legendPopoverField}>
              <span>Text</span>
              <input
                ref={textRef}
                type="text"
                value={textDraft}
                spellCheck={false}
                autoComplete="off"
                onChange={(e) => {
                  setTextDraft(e.target.value);
                  patch({ text: e.target.value });
                }}
              />
            </label>
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
