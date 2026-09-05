import { useRef, useState } from 'react';
import type { ChartType } from '../types';
import type { IndicatorConfig, IndicatorDef } from '../indicators/types';
import {
  listIndicators,
  defaultConfigFor,
  OVERLAY_ORDER,
  SUBPANE_ORDER,
} from '../indicators/registry';
import { cn } from '../internal/cn';
import { useDismissable } from './useDismissable';
import { PATTERN_CATALOG, PATTERN_NAMES } from '../patterns/catalog';
import './controls.css';
import styles from './ChartControls.module.css';

type Props = {
  chartType: ChartType;
  onChartTypeChange: (t: ChartType) => void;
  // Active indicator instances (one per drawn config). The picker appends new
  // instances; the on-chart legend (in Chart) removes/edits them.
  indicators: IndicatorConfig[];
  onIndicatorsChange: (indicators: IndicatorConfig[]) => void;
  // Patterns is Pillar 2, not an indicator — wired as a standalone toggle.
  patternsEnabled: boolean;
  onPatternsToggle: () => void;
  // Per-pattern visibility. `undefined` ⇒ all patterns visible (backward compat).
  // Only meaningful when `patternsEnabled` is true.
  visiblePatterns?: string[];
  onVisiblePatternsChange?: (names: string[]) => void;
  // Price-stats panel — like Patterns, a standalone toggle (not an indicator).
  statsEnabled: boolean;
  onStatsToggle: () => void;
  // Quarterly-earnings box — a second standalone toggle (a sibling of Stats).
  // Both optional: a consumer that passes neither renders exactly as before, and
  // the "Earnings" button shows only when `onEarningsToggle` is supplied.
  earningsEnabled?: boolean;
  onEarningsToggle?: () => void;
  className?: string;
};

// Position of `key` within `order`; unknown keys sort last (stable append).
function orderIndex(key: string, order: string[]): number {
  const i = order.indexOf(key);
  return i === -1 ? order.length : i;
}

function subpaneKey(def: IndicatorDef): string {
  const pane = def.pane;
  return typeof pane === 'object' ? pane.subpane : '';
}

// Unique id for a newly-added indicator instance. `crypto.randomUUID` is only
// defined in a secure context (HTTPS or localhost), so it is absent when the app
// is served over plain HTTP on a LAN host — mirrors Chart.tsx's `makeDrawingId`.
function makeIndicatorId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `ind-${Date.now()}-${Math.round(Math.random() * 1e9)}`;
}

export default function ChartControls({
  chartType,
  onChartTypeChange,
  indicators,
  onIndicatorsChange,
  patternsEnabled,
  onPatternsToggle,
  visiblePatterns,
  onVisiblePatternsChange,
  statsEnabled,
  onStatsToggle,
  earningsEnabled,
  onEarningsToggle,
  className,
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const [patternPickerOpen, setPatternPickerOpen] = useState(false);
  const patternPickerRef = useRef<HTMLDivElement | null>(null);

  // Each picker's outer ref already WRAPS its own toggle button, so a press on
  // the button reads as "inside" and no separate trigger ref is needed.
  useDismissable(pickerOpen, () => setPickerOpen(false), [pickerRef]);
  useDismissable(
    patternPickerOpen,
    () => setPatternPickerOpen(false),
    [patternPickerRef],
  );

  // Per-pattern visibility helpers. `undefined` visible set ⇒ all visible.
  const isVisible = (name: string) =>
    visiblePatterns ? visiblePatterns.includes(name) : true;
  const visibleCount = visiblePatterns
    ? visiblePatterns.length
    : PATTERN_NAMES.length;
  const togglePattern = (name: string) => {
    if (!onVisiblePatternsChange) return;
    const current = visiblePatterns ?? PATTERN_NAMES;
    const next = current.includes(name)
      ? current.filter((n) => n !== name)
      : [...current, name];
    onVisiblePatternsChange(next);
  };

  const overlays = listIndicators()
    .filter((d) => d.pane === 'price')
    .sort(
      (a, b) =>
        orderIndex(a.key, OVERLAY_ORDER) - orderIndex(b.key, OVERLAY_ORDER),
    );
  const oscillators = listIndicators()
    .filter((d) => typeof d.pane === 'object')
    .sort(
      (a, b) =>
        orderIndex(subpaneKey(a), SUBPANE_ORDER) -
        orderIndex(subpaneKey(b), SUBPANE_ORDER),
    );

  // Append a fresh default instance (multi-instance allowed — params are tuned
  // afterwards via the on-chart legend popover). Panel stays open for batch-add.
  const addIndicator = (def: IndicatorDef) => {
    const newConfig = defaultConfigFor(def.key, {
      // `crypto.randomUUID` exists only in a secure context (HTTPS / localhost),
      // so it is undefined when the app is served over plain HTTP on a LAN
      // hostname — calling it there throws and the add silently fails. Same
      // guarded fallback Chart.tsx's `makeDrawingId` uses.
      id: makeIndicatorId(),
      enabled: true,
    });
    if (newConfig) onIndicatorsChange([...indicators, newConfig]);
  };

  const renderRow = (def: IndicatorDef) => (
    <div key={def.key} className={styles.pickerRow}>
      <span className={styles.pickerLabel}>{def.label}</span>
      <button
        type="button"
        className={styles.pickerAdd}
        title={`Add ${def.label}`}
        onClick={() => addIndicator(def)}
      >
        +
      </button>
    </div>
  );

  return (
    <div className={cn(styles.chartControls, className)}>
      <div className="pill-toggle-group">
        <button
          className={cn(
            'pill-toggle-btn',
            'pill-toggle-btn-sm',
            chartType === 'candlestick' && 'is-active',
          )}
          onClick={() => onChartTypeChange('candlestick')}
        >
          Candles
        </button>
        <button
          className={cn(
            'pill-toggle-btn',
            'pill-toggle-btn-sm',
            chartType === 'bar' && 'is-active',
          )}
          onClick={() => onChartTypeChange('bar')}
        >
          Bars
        </button>
      </div>

      <div className={styles.indicatorPicker} ref={pickerRef}>
        <button
          type="button"
          className={cn(
            'pill-toggle-btn',
            'pill-toggle-btn-sm',
            pickerOpen && 'is-active',
          )}
          onClick={() => setPickerOpen((o) => !o)}
        >
          Indicators ·{' '}
          <span className={styles.pickerCount}>{indicators.length}</span>
        </button>
        {pickerOpen && (
          <div className={styles.pickerPanel}>
            <div className={styles.pickerScroll}>
              <div className={styles.pickerSection}>Overlays</div>
              {overlays.map(renderRow)}
              <div className={styles.pickerSection}>Oscillators</div>
              {oscillators.map(renderRow)}
            </div>
          </div>
        )}
      </div>

      <div className={styles.indicatorPicker} ref={patternPickerRef}>
        <button
          type="button"
          className={cn(
            'pill-toggle-btn',
            'pill-toggle-btn-sm',
            patternsEnabled && 'is-active',
          )}
          onClick={() => setPatternPickerOpen((o) => !o)}
        >
          Patterns ·{' '}
          <span className={styles.pickerCount}>
            {patternsEnabled ? visibleCount : 0}
          </span>
        </button>
        {patternPickerOpen && (
          <div className={styles.pickerPanel}>
            <div className={styles.pickerScroll}>
              <label className={styles.pickerCheckRow}>
                <span className={styles.pickerLabel}>Show patterns</span>
                <input
                  type="checkbox"
                  checked={patternsEnabled}
                  onChange={onPatternsToggle}
                />
              </label>
              <div className={styles.pickerSection}>Patterns</div>
              {PATTERN_CATALOG.map(({ name, label }) => (
                <label key={name} className={styles.pickerCheckRow}>
                  <span className={styles.pickerLabel}>{label}</span>
                  <input
                    type="checkbox"
                    disabled={!patternsEnabled || !onVisiblePatternsChange}
                    checked={isVisible(name)}
                    onChange={() => togglePattern(name)}
                  />
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="pill-toggle-group">
        <button
          className={cn(
            'pill-toggle-btn',
            'pill-toggle-btn-sm',
            statsEnabled && 'is-active',
          )}
          onClick={onStatsToggle}
        >
          Stats
        </button>
        {onEarningsToggle && (
          <button
            className={cn(
              'pill-toggle-btn',
              'pill-toggle-btn-sm',
              earningsEnabled && 'is-active',
            )}
            onClick={onEarningsToggle}
          >
            Earnings
          </button>
        )}
      </div>
    </div>
  );
}
