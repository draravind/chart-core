import { useEffect, useRef, useState } from 'react';
import type {
  IndicatorConfig,
  IndicatorDef,
  ParamSpec,
  ResolvedIndicator,
} from '../indicators/types';
import { getIndicator, formatIndicatorParams } from '../indicators/registry';
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
  const isPrice = getIndicator(config.defKey)?.pane === 'price';
  const out: ValueCell[] = [];
  for (const line of config.style.lines) {
    if (line.width === 0) continue;
    const arr = r.series[line.seriesKey];
    if (!arr || idx >= arr.length) continue;
    const v = arr[idx];
    if (Number.isNaN(v)) continue;
    out.push({ text: isPrice ? priceFmt(v) : fmt2(v), color: line.labelColorVar });
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

function ParamPopover({
  config,
  def,
  onCommit,
  onClose,
}: {
  config: IndicatorConfig;
  def: IndicatorDef;
  onCommit: (key: string, value: number) => void;
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
            {hasParams && (
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
            {openId === config.id && hasParams && (
              <ParamPopover
                config={config}
                def={def}
                onCommit={(key, value) => onCommit(config, key, value)}
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
          {toggle.expanded ? '▾' : '▸'}
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
}: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  // Per-subpane collapse state (price pane uses the persisted `expanded` prop).
  // A subpane key present here is collapsed; absent = expanded (default).
  const [collapsedSubpanes, setCollapsedSubpanes] = useState<Set<string>>(
    () => new Set(),
  );
  const toggleSubpane = (key: string) =>
    setCollapsedSubpanes((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // Hovered bar index; only tracked while at least one pane is expanded (no
  // point re-rendering the legend on crosshair moves when nothing shows values).
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const anyExpanded =
    expanded || subpanes.some((sp) => !collapsedSubpanes.has(sp.key));
  useEffect(() => {
    if (!anyExpanded) {
      setHoverIdx(null);
      return;
    }
    return subscribeHoverIndex(setHoverIdx);
  }, [anyExpanded, subscribeHoverIndex]);

  const commitParam = (config: IndicatorConfig, key: string, value: number) => {
    onIndicatorsChange(
      indicators.map((c) =>
        c.id === config.id
          ? { ...c, params: { ...c.params, [key]: value } }
          : c,
      ),
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
        onRemove={removeConfig}
        valuesFor={valuesFor}
        toggle={
          priceConfigs.length > 0
            ? { expanded, onToggle: () => onExpandedChange((v) => !v) }
            : undefined
        }
      />
      {subpanes.map((sp) => {
        const subExpanded = !collapsedSubpanes.has(sp.key);
        return (
          <LegendBlock
            key={sp.key}
            configs={subExpanded ? subpaneConfigs(sp.key) : []}
            top={marginTop + sp.top + 8}
            left={marginLeft + 8}
            openId={openId}
            setOpenId={setOpenId}
            onCommit={commitParam}
            onRemove={removeConfig}
            valuesFor={valuesFor}
            toggle={{ expanded: subExpanded, onToggle: () => toggleSubpane(sp.key) }}
          />
        );
      })}
    </div>
  );
}
