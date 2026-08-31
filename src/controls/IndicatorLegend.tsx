import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type {
  IndicatorConfig,
  LegendRow,
  ResolvedIndicator,
} from '../indicators/types';
import { getIndicator, formatIndicatorParams } from '../indicators/registry';
import {
  withSettingOverride,
  withSettingsReset,
} from '../indicators/applySettings';
import IndicatorSettingsPopover from './IndicatorSettingsPopover';
import styles from '../Chart.module.css';

// Geometry handed down from Chart's `layout`. `subpanes[i].top` is in inner-SVG
// coordinates (the main group is translated by MARGIN.top), so callers add
// MARGIN.top back to land in wrapper-relative pixels (same correction as
// `priceBottomPx`).
type SubpaneBand = { key: string; top: number };

// The price pane reserves its top text line for the chart's crosshair OHLC
// readout (drawn at SVG y≈14). The reserve height comes from Chart's single
// `INFO_BAR_HEIGHT` (passed as `infoBarHeight`): the price-pane legend drops
// that far below the band top so the two never overlap. Subpanes have no such
// readout (indicator values stack in the price pane's top-left), so their
// legends hug the band top.

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
  // Height (px) of the price pane's reserved OHLC-readout band; the price-pane
  // legend drops this far below its band top. Owned by Chart (`INFO_BAR_HEIGHT`).
  infoBarHeight: number;
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
              <IndicatorSettingsPopover
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
  infoBarHeight,
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

  // Commit / reset go through the shared pure transforms (see
  // indicators/applySettings) so this legend and Chart's centred popover edit
  // identically — including the `defaultConfigFor` recompute (param-derived
  // defaults re-derive) and the single batched multi-key reset.
  const commitSetting = (
    config: IndicatorConfig,
    key: string,
    value: number | boolean | string,
  ) => onIndicatorsChange(withSettingOverride(indicators, config.id, key, value));

  const resetSetting = (config: IndicatorConfig, key: string) =>
    onIndicatorsChange(withSettingsReset(indicators, config.id, [key]));

  const resetSettings = (config: IndicatorConfig, keys: string[]) => {
    if (keys.length === 0) return;
    onIndicatorsChange(withSettingsReset(indicators, config.id, keys));
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
        top={marginTop + 8 + infoBarHeight}
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
