import { useEffect, useRef } from 'react';
import type { IndicatorConfig, IndicatorDef } from '../indicators/types';
import { formatIndicatorParams } from '../indicators/registry';
import {
  NumberField,
  EnumField,
  ToggleField,
  ColorField,
  LineField,
} from './SettingsFields';
import { cn } from '../internal/cn';
import styles from '../Chart.module.css';

// One uniform popover over a def's `settingsSchema`: number/enum/toggle/color/
// line controls, each reading its current value from `config.settings`. Color
// fields also surface the per-field reset (delete the key from
// `settingsOverrides`).
//
// PLACEMENT-AGNOSTIC: the legend renders it inside its row (the `.legendPopover`
// class anchors itself under the row), while Chart renders it centred by adding
// `.centeredPanel`. Same component either way.

type Props = {
  config: IndicatorConfig;
  def: IndicatorDef;
  onCommit: (key: string, value: number | boolean | string) => void;
  onReset: (key: string) => void;
  onResetKeys: (keys: string[]) => void;
  resolveColor?: (expr: string) => string;
  onClose: () => void;
  className?: string;
  style?: React.CSSProperties;
};

export default function IndicatorSettingsPopover({
  config,
  def,
  onCommit,
  onReset,
  onResetKeys,
  resolveColor,
  onClose,
  className,
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

  const summary = formatIndicatorParams(config);
  const resolve = resolveColor ?? ((e: string) => e);
  return (
    <div
      className={cn(styles.legendPopover, className)}
      ref={ref}
      style={style}
      data-chart-wheel-scroll
    >
      <div className={styles.legendPopoverHeader}>
        <span className={styles.legendPopoverTitle}>
          {def.longLabel ?? def.label}
          {summary && <span className={styles.legendPopoverSummary}>{summary}</span>}
        </span>
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
        {def.settingsSchema.map((field) => {
          switch (field.kind) {
            case 'number':
              return (
                <NumberField
                  key={field.key}
                  spec={field}
                  value={Number(config.settings[field.key] ?? field.default)}
                  onCommit={(v) => onCommit(field.key, v)}
                />
              );
            case 'enum':
              return (
                <EnumField
                  key={field.key}
                  spec={field}
                  value={Number(config.settings[field.key] ?? field.default)}
                  onChange={(v) => onCommit(field.key, v)}
                />
              );
            case 'toggle':
              return (
                <ToggleField
                  key={field.key}
                  label={field.label}
                  value={Boolean(config.settings[field.key] ?? field.default)}
                  onChange={(v) => onCommit(field.key, v)}
                />
              );
            case 'color':
              return (
                <ColorField
                  key={field.key}
                  label={field.label}
                  colorExpr={String(config.settings[field.key] ?? field.default)}
                  isOverridden={field.key in config.settingsOverrides}
                  resolveColor={resolve}
                  onCommit={(hex) => onCommit(field.key, hex)}
                  onReset={() => onReset(field.key)}
                />
              );
            case 'line':
              return (
                <LineField
                  key={field.key}
                  label={field.label}
                  prefix={field.key}
                  settings={config.settings}
                  settingsOverrides={config.settingsOverrides}
                  resolveColor={resolve}
                  onCommit={(key, value) => onCommit(key, value)}
                  onResetKeys={(keys) => onResetKeys(keys)}
                />
              );
          }
        })}
      </div>
    </div>
  );
}
