import { useEffect, useState } from 'react';
import type { SettingsField } from '../indicators/types';
import { LINE_STYLE_OPTIONS } from '../indicators/settingsOptions';
import { toHex6 } from '../utils/toHex6';
import styles from '../Chart.module.css';

// Shared settings-field control vocabulary. Extracted (verbatim) from
// IndicatorLegend so the on-chart popover, the appearance Settings dialog, and
// the Patterns section all render the same controls. Depends only on
// Chart.module.css classes + toHex6 — no chart state.

type NumberFieldSpec = Extract<SettingsField, { kind: 'number' }>;
type EnumFieldSpec = Extract<SettingsField, { kind: 'enum' }>;

function clamp(n: number, spec: { min?: number; max?: number }): number {
  let v = n;
  if (spec.min != null) v = Math.max(spec.min, v);
  if (spec.max != null) v = Math.min(spec.max, v);
  return v;
}

// Smart live commit: hold the field text locally; commit the clamped value on
// every parseable change (live), re-sync text to the committed value on blur.
// Lets the user clear and retype (50 → 200) without snapping to `min`.
export function NumberField({
  spec,
  value,
  onCommit,
}: {
  spec: NumberFieldSpec;
  value: number;
  onCommit: (v: number) => void;
}) {
  const [text, setText] = useState(String(value));
  const step = spec.step ?? 1;
  const isInt = Number.isInteger(step);
  const title = isInt
    ? `Whole number${spec.min != null ? ` ≥ ${spec.min}` : ''}`
    : `Number${spec.min != null ? ` ≥ ${spec.min}` : ''}, step ${step}`;
  return (
    <label className={styles.legendPopoverField}>
      <span>{spec.label}</span>
      <input
        type="number"
        value={text}
        min={spec.min}
        max={spec.max}
        step={step}
        title={title}
        autoComplete="off"
        // Scroll-wheel over a focused number field silently mutates the value —
        // a finance footgun. Blur on wheel so the gesture scrolls the panel.
        onWheel={(e) => e.currentTarget.blur()}
        onChange={(e) => {
          const t = e.target.value;
          setText(t);
          const n = Number(t);
          // Commit only clean decimals (blocks e-notation / signs from state);
          // integer-stepped fields round so 2.5 can't reach a period param.
          if (t.trim() !== '' && Number.isFinite(n) && /^\d*\.?\d*$/.test(t)) {
            onCommit(clamp(isInt ? Math.round(n) : n, spec));
          }
        }}
        onBlur={() => setText(String(value))}
      />
    </label>
  );
}

export function EnumField({
  spec,
  value,
  onChange,
}: {
  spec: EnumFieldSpec;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className={styles.legendPopoverField}>
      <span>{spec.label}</span>
      <select value={value} onChange={(e) => onChange(Number(e.target.value))}>
        {spec.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ToggleField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className={styles.legendPopoverField}>
      <span>{label}</span>
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

// One editable color: native swatch + hex text field + reset-to-default. The
// native picker is hex-only, so the swatch's controlled value is the resolved-
// then-hexed color. The hex text field commits on blur/Enter (not per keystroke)
// to avoid a repaint/persist on every intermediate character; local text resyncs
// to the resolved value on blur, reset, re-band, or theme change.
export function ColorField({
  label,
  colorExpr,
  isOverridden,
  resolveColor,
  onCommit,
  onReset,
}: {
  label: string;
  colorExpr: string;
  isOverridden: boolean;
  resolveColor: (expr: string) => string;
  onCommit: (hex: string) => void;
  onReset: () => void;
}) {
  const resolvedHex = toHex6(resolveColor(colorExpr));
  const [text, setText] = useState(resolvedHex);
  useEffect(() => setText(resolvedHex), [resolvedHex]);

  const commitText = () => {
    const t = text.trim().toLowerCase();
    if (/^#[0-9a-f]{6}$/.test(t)) onCommit(t);
    else setText(resolvedHex);
  };

  return (
    <div className={styles.legendColorField}>
      <span>{label}</span>
      <div className={styles.legendColorControls}>
        <input
          type="color"
          value={resolvedHex}
          title={`${label} color`}
          onChange={(e) => onCommit(e.target.value)}
        />
        <input
          type="text"
          className={styles.legendColorHex}
          value={text}
          spellCheck={false}
          autoComplete="off"
          onChange={(e) => setText(e.target.value)}
          onBlur={commitText}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
        />
        <button
          type="button"
          className={styles.legendBtn}
          title="Reset to default color"
          disabled={!isOverridden}
          onClick={onReset}
        >
          ↺
        </button>
      </div>
    </div>
  );
}

// A 0..1 (default) slider with a live numeric readout. Used for opacity controls
// in both the grouped line field and the appearance dialog.
export function SliderField({
  label,
  value,
  onCommit,
  min = 0,
  max = 1,
  step = 0.05,
}: {
  label: string;
  value: number;
  onCommit: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <label className={styles.legendPopoverField}>
      <span>{label}</span>
      <span className={styles.sliderControl}>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onCommit(Number(e.target.value))}
        />
        <span className={styles.sliderValue}>{value.toFixed(2)}</span>
      </span>
    </label>
  );
}

// Grouped line control (TradingView-style): one row bundling a color swatch, a
// line-style dropdown, a width stepper, and an opacity slider over the four
// scalar sub-keys a `line` field expands into. Each sub-control commits/reads a
// plain scalar key (`${prefix}Color/Width/Style/Opacity`), so the framework's
// commit path is untouched. The reset button clears the whole group in a single
// batched update — `onResetKeys` drops all overridden sub-keys at once. A per-key
// reset loop would batch into last-write-wins, clearing only one field per click.
export function LineField({
  label,
  prefix,
  settings,
  settingsOverrides,
  resolveColor,
  onCommit,
  onResetKeys,
}: {
  label: string;
  prefix: string;
  settings: Record<string, unknown>;
  settingsOverrides: Record<string, unknown>;
  resolveColor: (expr: string) => string;
  onCommit: (key: string, value: number | string) => void;
  onResetKeys: (keys: string[]) => void;
}) {
  const colorKey = `${prefix}Color`;
  const widthKey = `${prefix}Width`;
  const styleKey = `${prefix}Style`;
  const opacityKey = `${prefix}Opacity`;

  const colorExpr = String(settings[colorKey] ?? '');
  const resolvedHex = toHex6(resolveColor(colorExpr));
  const width = Number(settings[widthKey] ?? 1);
  const style = Number(settings[styleKey] ?? 0);
  const opacity = Number(settings[opacityKey] ?? 1);

  const overridden = [colorKey, widthKey, styleKey, opacityKey].some(
    (k) => k in settingsOverrides,
  );
  const resetAll = () =>
    onResetKeys(
      [colorKey, widthKey, styleKey, opacityKey].filter((k) => k in settingsOverrides),
    );

  return (
    <div className={styles.legendColorField}>
      <span>{label}</span>
      <div className={styles.lineFieldControls}>
        <input
          type="color"
          value={resolvedHex}
          title={`${label} color`}
          onChange={(e) => onCommit(colorKey, e.target.value)}
        />
        <select
          className={styles.lineFieldSelect}
          value={style}
          title={`${label} style`}
          onChange={(e) => onCommit(styleKey, Number(e.target.value))}
        >
          {LINE_STYLE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <input
          type="number"
          className={styles.lineFieldWidth}
          min={0.5}
          max={10}
          step={0.1}
          value={width}
          title={`${label} width`}
          onWheel={(e) => e.currentTarget.blur()}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isFinite(n) && n > 0) onCommit(widthKey, n);
          }}
        />
        <input
          type="range"
          className={styles.lineFieldOpacity}
          min={0}
          max={1}
          step={0.05}
          value={opacity}
          title={`${label} opacity`}
          onChange={(e) => onCommit(opacityKey, Number(e.target.value))}
        />
        <button
          type="button"
          className={styles.legendBtn}
          title="Reset line to default"
          disabled={!overridden}
          onClick={resetAll}
        >
          ↺
        </button>
      </div>
    </div>
  );
}
