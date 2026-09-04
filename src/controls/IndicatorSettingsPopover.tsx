import { useRef } from 'react';
import type { RefObject } from 'react';
import type { IndicatorConfig, IndicatorDef } from '../indicators/types';
import { formatIndicatorParams } from '../indicators/registry';
import {
  NumberField,
  EnumField,
  ToggleField,
  ColorField,
  LineField,
} from './SettingsFields';
import { useDismissable } from './useDismissable';
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
  // The legend renders this beside a SEPARATE gear button (in IndicatorLegend);
  // that gear's ref is passed here so a press on it toggles cleanly. Chart's
  // centred (double-click-opened) instance has no persistent trigger and omits
  // it.
  triggerRef?: RefObject<HTMLElement | null>;
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
  triggerRef,
  className,
  style,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  useDismissable(true, onClose, triggerRef ? [ref, triggerRef] : [ref]);

  const summary = formatIndicatorParams(config);
  const resolve = resolveColor ?? ((e: string) => e);
  return (
    <div
      className={cn(styles.legendPopover, className)}
      ref={ref}
      style={style}
      data-chart-wheel-scroll
      data-chart-native-menu
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
