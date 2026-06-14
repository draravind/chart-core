import { useEffect, useRef, useState } from 'react';
import type { AppearanceOverrides } from '../appearance/types';
import { effectiveAppearance } from '../appearance/registry';
import { ColorField, NumberField, SliderField } from './SettingsFields';
import styles from '../Chart.module.css';

// ---------------------------------------------------------------------------
// Gear-triggered appearance Settings dialog (TradingView-style). Edits commit a
// sparse `AppearanceOverrides` delta via `onAppearanceChange`; per-field reset
// deletes the path from the delta. Per-indicator styling stays in the on-chart
// legend popover — this dialog owns chart-wide visuals + pattern styling.
// ---------------------------------------------------------------------------

type Path = string[];

function getAt(obj: unknown, path: Path): unknown {
  let cur: unknown = obj;
  for (const k of path) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[k];
  }
  return cur;
}

function setIn(obj: AppearanceOverrides, path: Path, value: unknown): AppearanceOverrides {
  const [head, ...rest] = path;
  const src = { ...((obj ?? {}) as Record<string, unknown>) };
  if (rest.length === 0) {
    src[head] = value;
  } else {
    src[head] = setIn(src[head] as AppearanceOverrides, rest, value);
  }
  return src as AppearanceOverrides;
}

// Immutably delete a path, pruning now-empty ancestor objects so the persisted
// delta stays minimal (and `effectiveAppearance` falls back to the default).
function deleteIn(obj: AppearanceOverrides, path: Path): AppearanceOverrides {
  const [head, ...rest] = path;
  const src = { ...((obj ?? {}) as Record<string, unknown>) };
  if (rest.length === 0) {
    delete src[head];
  } else {
    const child = src[head];
    if (child && typeof child === 'object') {
      const next = deleteIn(child as AppearanceOverrides, rest) as Record<string, unknown>;
      if (Object.keys(next).length === 0) delete src[head];
      else src[head] = next;
    }
  }
  return src as AppearanceOverrides;
}

// One free-text row (used for SVG dash-array strings like '3,3').
function TextRow({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: string;
  onCommit: (v: string) => void;
}) {
  const [t, setT] = useState(value);
  useEffect(() => setT(value), [value]);
  return (
    <label className={styles.legendPopoverField}>
      <span>{label}</span>
      <input
        type="text"
        value={t}
        spellCheck={false}
        autoComplete="off"
        onChange={(e) => setT(e.target.value)}
        onBlur={() => onCommit(t)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
      />
    </label>
  );
}

type Props = {
  appearance: AppearanceOverrides;
  onAppearanceChange: (next: AppearanceOverrides) => void;
  resolveColor: (expr: string) => string;
  onClose: () => void;
  style?: React.CSSProperties;
};

export default function SettingsDialog({
  appearance,
  onAppearanceChange,
  resolveColor,
  onClose,
  style,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const eff = effectiveAppearance(appearance);
  const commit = (path: Path, value: unknown) =>
    onAppearanceChange(setIn(appearance, path, value));
  const reset = (path: Path) => onAppearanceChange(deleteIn(appearance, path));

  // A color that lives in the injected CSS-var map: when unset, show the themed
  // `var(--key)` so the swatch matches the live chart.
  const colorVarRow = (key: string, label: string) => {
    const override = appearance.colors?.[key];
    return (
      <ColorField
        key={key}
        label={label}
        colorExpr={override ?? `var(--${key})`}
        isOverridden={override !== undefined}
        resolveColor={resolveColor}
        onCommit={(hex) => commit(['colors', key], hex)}
        onReset={() => reset(['colors', key])}
      />
    );
  };

  // A concrete color scalar (background/crosshair/pattern colors).
  const colorRow = (path: Path, label: string) => (
    <ColorField
      key={path.join('.')}
      label={label}
      colorExpr={String(getAt(eff, path))}
      isOverridden={getAt(appearance, path) !== undefined}
      resolveColor={resolveColor}
      onCommit={(hex) => commit(path, hex)}
      onReset={() => reset(path)}
    />
  );

  const numberRow = (
    path: Path,
    label: string,
    opts: { min?: number; max?: number; step?: number } = {},
  ) => {
    const value = Number(getAt(eff, path));
    return (
      <NumberField
        key={path.join('.')}
        spec={{ key: path.join('.'), label, kind: 'number', default: value, ...opts }}
        value={value}
        onCommit={(v) => commit(path, v)}
      />
    );
  };

  const sliderRow = (path: Path, label: string) => (
    <SliderField
      key={path.join('.')}
      label={label}
      value={Number(getAt(eff, path))}
      onCommit={(v) => commit(path, v)}
    />
  );

  const textRow = (path: Path, label: string) => (
    <TextRow
      key={path.join('.')}
      label={label}
      value={String(getAt(eff, path))}
      onCommit={(v) => commit(path, v)}
    />
  );

  return (
    <div className={styles.settingsDialog} ref={ref} style={style} data-chart-wheel-scroll>
      <div className={styles.legendPopoverHeader}>
        <span className={styles.legendPopoverTitle}>Chart settings</span>
        <button
          type="button"
          className={styles.legendPopoverClose}
          title="Close"
          onClick={onClose}
        >
          ×
        </button>
      </div>
      <div className={styles.panelScrollBody}>
        <div className={styles.settingsSectionTitle}>Chart appearance</div>
        {colorVarRow('chart-positive', 'Candle up')}
        {colorVarRow('chart-negative', 'Candle down')}
        {numberRow(['candle', 'wickWidth'], 'Wick width', { min: 0.5, max: 6, step: 0.05 })}
        {colorRow(['background', 'topColor'], 'Background top')}
        {colorRow(['background', 'bottomColor'], 'Background bottom')}
        {numberRow(['background', 'radius'], 'Background radius', { min: 0, max: 48, step: 1 })}
        {colorVarRow('chart-axis-label', 'Axis label')}
        {sliderRow(['axis', 'opacity'], 'Axis opacity')}
        {numberRow(['axis', 'tickSize'], 'Tick size', { min: 0, max: 16, step: 1 })}
        {colorRow(['crosshair', 'color'], 'Crosshair')}
        {sliderRow(['crosshair', 'opacity'], 'Crosshair opacity')}
        {textRow(['crosshair', 'dash'], 'Crosshair dash')}
        {colorVarRow('chart-separator', 'Separator')}
        {colorVarRow('subpane-guide', 'Subpane guide')}

        <div className={styles.settingsSectionTitle}>Patterns</div>

        <div className={styles.settingsGroupTitle}>Base breakout</div>
        {colorRow(['patterns', 'base_breakout', 'lineColor'], 'Line')}
        {numberRow(['patterns', 'base_breakout', 'lineWidth'], 'Line width', { min: 0.5, max: 8, step: 0.1 })}
        {sliderRow(['patterns', 'base_breakout', 'lineOpacity'], 'Line opacity')}
        {textRow(['patterns', 'base_breakout', 'lineDash'], 'Line dash')}
        {colorRow(['patterns', 'base_breakout', 'statColor'], 'Stat text')}
        {colorRow(['patterns', 'base_breakout', 'dotFill'], 'Breakout dot')}
        {colorRow(['patterns', 'base_breakout', 'labelBg'], 'Label bg')}
        {sliderRow(['patterns', 'base_breakout', 'labelBgOpacity'], 'Label bg opacity')}
        {colorRow(['patterns', 'base_breakout', 'labelTextColor'], 'Label text')}
        {numberRow(['patterns', 'base_breakout', 'labelFontSize'], 'Label font size', { min: 6, max: 24, step: 1 })}

        <div className={styles.settingsGroupTitle}>Consolidation</div>
        {colorRow(['patterns', 'consolidation', 'boxFill'], 'Box fill')}
        {sliderRow(['patterns', 'consolidation', 'boxFillOpacity'], 'Box opacity')}
        {colorRow(['patterns', 'consolidation', 'labelBg'], 'Label bg')}
        {sliderRow(['patterns', 'consolidation', 'labelBgOpacity'], 'Label bg opacity')}
        {colorRow(['patterns', 'consolidation', 'labelTextColor'], 'Label text')}
        {numberRow(['patterns', 'consolidation', 'labelFontSize'], 'Label font size', { min: 6, max: 24, step: 1 })}

        <div className={styles.settingsGroupTitle}>High tight flag</div>
        {colorRow(['patterns', 'high_tight_flag', 'poleColor'], 'Pole')}
        {numberRow(['patterns', 'high_tight_flag', 'poleWidth'], 'Pole width', { min: 0.5, max: 8, step: 0.1 })}
        {sliderRow(['patterns', 'high_tight_flag', 'poleOpacity'], 'Pole opacity')}
        {colorRow(['patterns', 'high_tight_flag', 'flagFill'], 'Flag fill')}
        {sliderRow(['patterns', 'high_tight_flag', 'flagFillOpacity'], 'Flag opacity')}
        {colorRow(['patterns', 'high_tight_flag', 'labelBg'], 'Label bg')}
        {sliderRow(['patterns', 'high_tight_flag', 'labelBgOpacity'], 'Label bg opacity')}
        {colorRow(['patterns', 'high_tight_flag', 'labelTextColor'], 'Label text')}
        {numberRow(['patterns', 'high_tight_flag', 'labelFontSize'], 'Label font size', { min: 6, max: 24, step: 1 })}
      </div>
    </div>
  );
}
