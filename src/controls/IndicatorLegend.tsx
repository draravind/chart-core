import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type {
  IndicatorConfig,
  IndicatorDef,
  IndicatorLineStyle,
  ParamSpec,
  ResolvedIndicator,
} from '../indicators/types';
import {
  getIndicator,
  formatIndicatorParams,
  defaultConfigFor,
} from '../indicators/registry';
import { toHex6 } from '../utils/toHex6';
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
  // Used to paint factory color swatches in the param popover's ColorField.
  resolveColor?: (expr: string) => string;
};

const fmt2 = (v: number): string =>
  v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Dot color: first non-zero-width line's labelColorVar; fall back to lines[0]
// when every line is width 0 (e.g. Stage 2's sole marker line).
function dotColor(config: IndicatorConfig): string {
  const lines = config.style.lines;
  const first = lines.find((l) => l.width !== 0) ?? lines[0];
  return first?.labelColorVar ?? 'transparent';
}

// Per-drawn-line values at `idx` (price-pane lines formatted as prices, subpane
// lines to 2dp). Skips marker lines (width 0) and gaps (NaN).
function rowValues(
  config: IndicatorConfig,
  resolved: ResolvedIndicator[],
  idx: number,
  priceFmt: (v: number) => string,
): ValueCell[] {
  if (idx < 0) return [];
  const r = resolved.find((x) => x.config.id === config.id);
  if (!r) return [];
  const def = getIndicator(config.defKey);
  const isPrice = def?.pane === 'price';
  const out: ValueCell[] = [];
  for (const line of config.style.lines) {
    if (line.width === 0) continue;
    const arr = r.series[line.seriesKey];
    if (!arr || idx >= arr.length) continue;
    const v = arr[idx];
    if (Number.isNaN(v)) continue;
    // A def-level formatter (e.g. Volume's K/M/B) wins; else price/2dp default.
    const text =
      def?.formatValue?.(v, line.seriesKey) ?? (isPrice ? priceFmt(v) : fmt2(v));
    out.push({ text, color: line.labelColorVar });
  }
  return out;
}

function clamp(n: number, spec: Extract<ParamSpec, { kind: 'number' }>): number {
  let v = n;
  if (spec.min != null) v = Math.max(spec.min, v);
  if (spec.max != null) v = Math.min(spec.max, v);
  return v;
}

// Smart live commit: hold the field text locally; commit the clamped value on
// every parseable change (live), re-sync text to the committed value on blur.
// Lets the user clear and retype (50 → 200) without snapping to `min`.
function NumberField({
  spec,
  value,
  onCommit,
}: {
  spec: Extract<ParamSpec, { kind: 'number' }>;
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
        // a finance footgun. Blur on wheel so the gesture scrolls the chart.
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

function EnumField({
  spec,
  value,
  onChange,
}: {
  spec: Extract<ParamSpec, { kind: 'enum' }>;
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

// One editable line color: native swatch + hex text field + reset-to-default.
// The native picker is hex-only, so the swatch's controlled value is the
// resolved-then-hexed color. The hex text field commits on blur/Enter (not per
// keystroke) to avoid a repaint/persist on every intermediate character; local
// text resyncs to the resolved value on blur, reset, re-band, or theme change.
function ColorField({
  line,
  isOverridden,
  resolveColor,
  onCommit,
  onReset,
}: {
  line: IndicatorLineStyle;
  isOverridden: boolean;
  resolveColor: (expr: string) => string;
  onCommit: (hex: string) => void;
  onReset: () => void;
}) {
  const resolvedHex = toHex6(resolveColor(line.colorVar));
  const [text, setText] = useState(resolvedHex);
  useEffect(() => setText(resolvedHex), [resolvedHex]);

  const commitText = () => {
    const t = text.trim().toLowerCase();
    if (/^#[0-9a-f]{6}$/.test(t)) onCommit(t);
    else setText(resolvedHex);
  };

  return (
    <div className={styles.legendColorField}>
      <span>{line.label}</span>
      <div className={styles.legendColorControls}>
        <input
          type="color"
          value={resolvedHex}
          title={`${line.label} color`}
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

function ParamPopover({
  config,
  def,
  onCommit,
  onColorCommit,
  onColorReset,
  resolveColor,
  onClose,
}: {
  config: IndicatorConfig;
  def: IndicatorDef;
  onCommit: (key: string, value: number) => void;
  onColorCommit: (seriesKey: string, hex: string) => void;
  onColorReset: (seriesKey: string) => void;
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
  return (
    <div className={styles.legendPopover} ref={ref}>
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
      <div className={styles.legendPopoverBody}>
        {(def.paramSpecs ?? []).map((spec) =>
          spec.kind === 'number' ? (
            <NumberField
              key={spec.key}
              spec={spec}
              value={Number(config.params[spec.key] ?? 0)}
              onCommit={(v) => onCommit(spec.key, v)}
            />
          ) : (
            <EnumField
              key={spec.key}
              spec={spec}
              value={Number(config.params[spec.key] ?? 0)}
              onChange={(v) => onCommit(spec.key, v)}
            />
          ),
        )}
        {config.style.lines
          .filter((l) => l.width !== 0)
          .map((line) => (
            <ColorField
              key={line.seriesKey}
              line={line}
              isOverridden={Boolean(config.colorOverrides?.[line.seriesKey])}
              resolveColor={resolveColor ?? (() => '#888888')}
              onCommit={(hex) => onColorCommit(line.seriesKey, hex)}
              onReset={() => onColorReset(line.seriesKey)}
            />
          ))}
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
  onColorCommit,
  onColorReset,
  resolveColor,
  onRemove,
  valuesFor,
  toggle,
}: {
  configs: IndicatorConfig[];
  top: number;
  left: number;
  openId: string | null;
  setOpenId: (id: string | null) => void;
  onCommit: (config: IndicatorConfig, key: string, value: number) => void;
  onColorCommit: (config: IndicatorConfig, seriesKey: string, hex: string) => void;
  onColorReset: (config: IndicatorConfig, seriesKey: string) => void;
  resolveColor?: (expr: string) => string;
  onRemove: (id: string) => void;
  valuesFor: (config: IndicatorConfig) => ValueCell[];
  // Renders the per-pane expand/collapse header above the rows; collapsing hides
  // that pane's list down to just this header.
  toggle?: { expanded: boolean; onToggle: () => void };
}) {
  if (configs.length === 0 && !toggle) return null;
  return (
    <div className={styles.legendBlock} style={{ top, left }}>
      {configs.map((config) => {
        const def = getIndicator(config.defKey);
        if (!def) return null;
        const hasParams = (def.paramSpecs?.length ?? 0) > 0;
        // Color-only defs (no paramSpecs but drawn lines, e.g. `highs`) still get
        // a gear so their line colors are editable.
        const hasEditable =
          hasParams || config.style.lines.some((l) => l.width !== 0);
        const summary = formatIndicatorParams(config);
        const values = valuesFor(config);
        return (
          <div key={config.id} className={styles.legendItem}>
            <span
              className={styles.legendDot}
              style={{ background: dotColor(config) }}
            />
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
                onColorCommit={(seriesKey, hex) =>
                  onColorCommit(config, seriesKey, hex)
                }
                onColorReset={(seriesKey) => onColorReset(config, seriesKey)}
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
 * (param popover) and a remove button. Positioned over `.chartWrapper`; the
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

  // Recompute the whole config via `defaultConfigFor` (not a shallow params
  // spread) so changing a param re-derives style — e.g. an EMA period 10→100
  // re-bands blue→green — while preserving any user color override.
  const commitParam = (config: IndicatorConfig, key: string, value: number) => {
    onIndicatorsChange(
      indicators.map((c) => {
        if (c.id !== config.id) return c;
        const next = defaultConfigFor(c.defKey, {
          id: c.id,
          enabled: c.enabled,
          params: { ...c.params, [key]: value },
          colorOverrides: c.colorOverrides,
        });
        return next ?? c;
      }),
    );
  };

  // Set a user override for one line; recompute via `defaultConfigFor` (same
  // path as commitParam/resetColor) so the resolved colors reflect immediately
  // and the config stays structurally consistent.
  const commitColor = (config: IndicatorConfig, seriesKey: string, hex: string) => {
    onIndicatorsChange(
      indicators.map((c) => {
        if (c.id !== config.id) return c;
        const colorOverrides = { ...c.colorOverrides, [seriesKey]: hex };
        const next = defaultConfigFor(c.defKey, {
          id: c.id,
          enabled: c.enabled,
          params: c.params,
          colorOverrides,
        });
        return next ?? c;
      }),
    );
  };

  // Drop a line's override and recompute its factory color via `defaultConfigFor`.
  const resetColor = (config: IndicatorConfig, seriesKey: string) => {
    onIndicatorsChange(
      indicators.map((c) => {
        if (c.id !== config.id) return c;
        const colorOverrides = { ...c.colorOverrides };
        delete colorOverrides[seriesKey];
        const next = defaultConfigFor(c.defKey, {
          id: c.id,
          enabled: c.enabled,
          params: c.params,
          colorOverrides,
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
  const valuesFor = (config: IndicatorConfig): ValueCell[] =>
    rowValues(config, resolved, displayIdx, priceFormatter);

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
        onCommit={commitParam}
        onColorCommit={commitColor}
        onColorReset={resetColor}
        resolveColor={resolveColor}
        onRemove={removeConfig}
        valuesFor={valuesFor}
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
          onCommit={commitParam}
          onColorCommit={commitColor}
          onColorReset={resetColor}
          resolveColor={resolveColor}
          onRemove={removeConfig}
          valuesFor={valuesFor}
          toggle={{ expanded, onToggle: toggleExpanded }}
        />
      ))}
    </div>
  );
}
