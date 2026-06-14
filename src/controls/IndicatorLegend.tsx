import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type {
  IndicatorConfig,
  IndicatorDef,
  LegendRow,
  ResolvedIndicator,
} from '../indicators/types';
import {
  getIndicator,
  formatIndicatorParams,
  defaultConfigFor,
} from '../indicators/registry';
import {
  NumberField,
  EnumField,
  ToggleField,
  ColorField,
  LineField,
} from './SettingsFields';
import styles from '../Chart.module.css';

// Geometry handed down from Chart's `layout`. `subpanes[i].top` is in inner-SVG
// coordinates (the main group is translated by MARGIN.top), so callers add
// MARGIN.top back to land in wrapper-relative pixels (same correction as
// `priceBottomPx`).
type SubpaneBand = { key: string; top: number };

// The price pane reserves its top text line for the chart's crosshair OHLC
// readout (drawn at SVG y≈14). Drop the price-pane legend one line below it so
// the two never overlap. Subpanes have no such readout (indicator values stack
// in the price pane's top-left), so their legends hug the band top.
const PRICE_INFO_RESERVE = 18;

type ValueCell = { text: string; color: string };

type Props = {
  indicators: IndicatorConfig[];
  onIndicatorsChange: (indicators: IndicatorConfig[]) => void;
  // Resolved series (config + computed arrays, aligned to `data`) used to read
  // each row's value at the hovered/last bar.
  resolved: ResolvedIndicator[];
  subpanes: SubpaneBand[];
  marginTop: number;
  marginLeft: number;
  // Total bar count; the at-rest value column shows the last bar.
  barCount: number;
  // Expanded = show a live value column per row. Persisted by the host (this is
  // the same flag the old crosshair panel used).
  expanded: boolean;
  onExpandedChange: (v: boolean | ((prev: boolean) => boolean)) => void;
  // Subscribe to the hovered bar index (null = not hovering). Returns an
  // unsubscribe. Only the legend re-renders on hover, not all of Chart.
  subscribeHoverIndex: (cb: (idx: number | null) => void) => () => void;
  priceFormatter: (value: number) => string;
  // Resolves a CSS-var/color expression to a concrete rgb string (canvas-grade).
  // Used to paint dots/value cells + factory color swatches in the popover.
  resolveColor?: (expr: string) => string;
};

// One uniform popover over the def's `settingsSchema`: number/enum/toggle/color/line
// controls, each reading its current value from `config.settings`. Color fields
// also surface the per-field reset (delete the key from `settingsOverrides`).
function ParamPopover({
  config,
  def,
  onCommit,
  onReset,
  onResetKeys,
  resolveColor,
  onClose,
}: {
  config: IndicatorConfig;
  def: IndicatorDef;
  onCommit: (key: string, value: number | boolean | string) => void;
  onReset: (key: string) => void;
  onResetKeys: (keys: string[]) => void;
  resolveColor?: (expr: string) => string;
  onClose: () => void;
}) {
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
    <div className={styles.legendPopover} ref={ref} data-chart-wheel-scroll>
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

function LegendBlock({
  configs,
  top,
  left,
  openId,
  setOpenId,
  onCommit,
  onReset,
  onResetKeys,
  resolveColor,
  onRemove,
  rowsFor,
  toggle,
}: {
  configs: IndicatorConfig[];
  top: number;
  left: number;
  openId: string | null;
  setOpenId: (id: string | null) => void;
  onCommit: (config: IndicatorConfig, key: string, value: number | boolean | string) => void;
  onReset: (config: IndicatorConfig, key: string) => void;
  onResetKeys: (config: IndicatorConfig, keys: string[]) => void;
  resolveColor?: (expr: string) => string;
  onRemove: (id: string) => void;
  rowsFor: (config: IndicatorConfig) => LegendRow[];
  // Renders the per-pane expand/collapse header above the rows; collapsing hides
  // that pane's list down to just this header.
  toggle?: { expanded: boolean; onToggle: () => void };
}) {
  if (configs.length === 0 && !toggle) return null;
  const rc = resolveColor ?? ((e: string) => e);
  return (
    <div className={styles.legendBlock} style={{ top, left }}>
      {configs.map((config) => {
        const def = getIndicator(config.defKey);
        if (!def) return null;
        // Any def with editable settings gets a gear (color-only defs included;
        // the old `lines.some(width!==0)` clause is gone).
        const hasEditable = (def.settingsSchema?.length ?? 0) > 0;
        const summary = formatIndicatorParams(config);
        const rows = rowsFor(config);
        const dot = rows[0]?.color ? rc(rows[0].color) : 'transparent';
        const values: ValueCell[] = rows
          .filter((r) => r.value)
          .map((r) => ({ text: r.value as string, color: rc(r.color) }));
        return (
          <div key={config.id} className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: dot }} />
            <span className={styles.legendLabel}>
              {def.label}
              {summary ? ` ${summary}` : ''}
            </span>
            {values.length > 0 && (
              <span className={styles.legendValues}>
                {values.map((vc, i) => (
                  <span key={i} style={{ color: vc.color }}>
                    {vc.text}
                  </span>
                ))}
              </span>
            )}
            {hasEditable && (
              <button
                type="button"
                className={styles.legendBtn}
                title={`Edit ${def.label}`}
                // Stop the mousedown reaching the open popover's outside-click
                // listener (which would close-then-reopen) and the chart's
                // background pan handler.
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() =>
                  setOpenId(openId === config.id ? null : config.id)
                }
              >
                ⚙
              </button>
            )}
            <button
              type="button"
              className={styles.legendBtn}
              title={`Remove ${def.label}`}
              onClick={() => onRemove(config.id)}
            >
              ×
            </button>
            {openId === config.id && hasEditable && (
              <ParamPopover
                config={config}
                def={def}
                onCommit={(key, value) => onCommit(config, key, value)}
                onReset={(key) => onReset(config, key)}
                onResetKeys={(keys) => onResetKeys(config, keys)}
                resolveColor={resolveColor}
                onClose={() => setOpenId(null)}
              />
            )}
          </div>
        );
      })}
      {toggle && (
        <button
          type="button"
          className={styles.legendToggle}
          title={toggle.expanded ? 'Collapse indicators' : 'Expand indicators'}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={toggle.onToggle}
        >
          {toggle.expanded ? (
            <ChevronUp size={14} strokeWidth={3} />
          ) : (
            <ChevronDown size={14} strokeWidth={3} />
          )}
        </button>
      )}
    </div>
  );
}

/**
 * Persistent on-chart indicator legend — one block per pane (price + each
 * subpane), each listing its configs with a color dot, param summary, a gear
 * (settings popover) and a remove button. Positioned over `.chartWrapper`; the
 * container ignores pointer events so the crosshair is unaffected (individual
 * controls re-enable them).
 */
export default function IndicatorLegend({
  indicators,
  onIndicatorsChange,
  resolved,
  subpanes,
  marginTop,
  marginLeft,
  barCount,
  expanded,
  onExpandedChange,
  subscribeHoverIndex,
  priceFormatter,
  resolveColor,
}: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  // Expand/collapse is a single shared state across the price pane and every
  // subpane — the persisted `expanded` prop drives them all, so toggling any
  // one legend toggles all of them in sync.
  const toggleExpanded = () => onExpandedChange((v) => !v);

  // Hovered bar index; only tracked while the panes are expanded (no point
  // re-rendering the legend on crosshair moves when nothing shows values).
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  useEffect(() => {
    if (!expanded) {
      setHoverIdx(null);
      return;
    }
    return subscribeHoverIndex(setHoverIdx);
  }, [expanded, subscribeHoverIndex]);

  // Set one setting override and recompute the whole config via
  // `defaultConfigFor` (not a shallow spread) so param-dependent defaults
  // re-derive — e.g. an EMA period 10→100 re-bands blue→green — while any user
  // color override survives.
  const commitSetting = (
    config: IndicatorConfig,
    key: string,
    value: number | boolean | string,
  ) => {
    onIndicatorsChange(
      indicators.map((c) => {
        if (c.id !== config.id) return c;
        const next = defaultConfigFor(c.defKey, {
          id: c.id,
          enabled: c.enabled,
          settingsOverrides: { ...c.settingsOverrides, [key]: value },
        });
        return next ?? c;
      }),
    );
  };

  // Drop a setting's override and recompute via `defaultConfigFor` so it falls
  // back to its (possibly param-derived) default.
  const resetSetting = (config: IndicatorConfig, key: string) => {
    resetSettings(config, [key]);
  };

  // Batched reset: drop several overrides in ONE `onIndicatorsChange` so the
  // grouped line ↺ clears every sub-key at once. A per-key loop would fire
  // multiple synchronous `onIndicatorsChange(value)` calls that each map over the
  // same render-time `indicators`; React batches them into last-write-wins, so
  // only one key would actually be cleared per click.
  const resetSettings = (config: IndicatorConfig, keys: string[]) => {
    if (keys.length === 0) return;
    onIndicatorsChange(
      indicators.map((c) => {
        if (c.id !== config.id) return c;
        const settingsOverrides = { ...c.settingsOverrides };
        for (const key of keys) delete settingsOverrides[key];
        const next = defaultConfigFor(c.defKey, {
          id: c.id,
          enabled: c.enabled,
          settingsOverrides,
        });
        return next ?? c;
      }),
    );
  };

  const removeConfig = (id: string) => {
    if (openId === id) setOpenId(null);
    onIndicatorsChange(indicators.filter((c) => c.id !== id));
  };

  const enabled = indicators.filter((c) => c.enabled);
  const priceConfigs = enabled.filter(
    (c) => getIndicator(c.defKey)?.pane === 'price',
  );
  const subpaneConfigs = (key: string) =>
    enabled.filter((c) => {
      const pane = getIndicator(c.defKey)?.pane;
      return typeof pane === 'object' && pane.subpane === key;
    });

  // At rest (not hovering) show the latest bar; on hover show that bar.
  const displayIdx = hoverIdx ?? barCount - 1;
  const rowsFor = (config: IndicatorConfig): LegendRow[] => {
    if (displayIdx < 0) return [];
    const r = resolved.find((x) => x.config.id === config.id);
    const def = getIndicator(config.defKey);
    if (!r || !def) return [];
    return def.legend(r.series, displayIdx, config.settings, {
      priceFmt: priceFormatter,
    });
  };

  // Each pane has its own toggle; collapsing hides that pane's list down to the
  // header, expanding shows every row (with live values).
  return (
    <div className={styles.legend} data-chart-legend="">
      <LegendBlock
        configs={expanded ? priceConfigs : []}
        top={marginTop + 8 + PRICE_INFO_RESERVE}
        left={marginLeft + 8}
        openId={openId}
        setOpenId={setOpenId}
        onCommit={commitSetting}
        onReset={resetSetting}
        onResetKeys={resetSettings}
        resolveColor={resolveColor}
        onRemove={removeConfig}
        rowsFor={rowsFor}
        toggle={
          priceConfigs.length > 0
            ? { expanded, onToggle: toggleExpanded }
            : undefined
        }
      />
      {subpanes.map((sp) => (
        <LegendBlock
          key={sp.key}
          configs={expanded ? subpaneConfigs(sp.key) : []}
          top={marginTop + sp.top + 8}
          left={marginLeft + 8}
          openId={openId}
          setOpenId={setOpenId}
          onCommit={commitSetting}
          onReset={resetSetting}
          onResetKeys={resetSettings}
          resolveColor={resolveColor}
          onRemove={removeConfig}
          rowsFor={rowsFor}
          toggle={{ expanded, onToggle: toggleExpanded }}
        />
      ))}
    </div>
  );
}
