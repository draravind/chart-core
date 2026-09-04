import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { AppearanceOverrides } from '../appearance/types';
import {
  CandleRows,
  getAt,
  makeAppearanceRows,
  type Path,
} from './appearanceFields';
import { useDismissable } from './useDismissable';
import styles from '../Chart.module.css';

// ---------------------------------------------------------------------------
// Gear-triggered appearance Settings dialog (TradingView-style). Edits commit a
// sparse `AppearanceOverrides` delta via `onAppearanceChange`; per-field reset
// deletes the path from the delta. Per-indicator styling stays in the on-chart
// legend popover — this dialog owns chart-wide visuals + pattern styling.
// ---------------------------------------------------------------------------

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
  // The appearance gear lives in Chart, separate from this dialog; its ref is
  // passed here so a press on it toggles cleanly instead of dismiss-then-reopen.
  triggerRef?: RefObject<HTMLElement | null>;
  style?: React.CSSProperties;
};

export default function SettingsDialog({
  appearance,
  onAppearanceChange,
  resolveColor,
  onClose,
  triggerRef,
  style,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  useDismissable(true, onClose, triggerRef ? [ref, triggerRef] : [ref]);

  const rowCtx = { appearance, onAppearanceChange, resolveColor };
  const { eff, commit, colorVarRow, colorRow, numberRow, sliderRow } =
    makeAppearanceRows(rowCtx);

  const textRow = (path: Path, label: string) => (
    <TextRow
      key={path.join('.')}
      label={label}
      value={String(getAt(eff, path))}
      onCommit={(v) => commit(path, v)}
    />
  );

  return (
    <div
      className={styles.settingsDialog}
      ref={ref}
      style={style}
      data-chart-wheel-scroll
      data-chart-native-menu
    >
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
        {/* The chart-wide price-direction pair. NOT candle-only: the OHLC
            readout, Volume's default bars, the --qr-growth-* aliases and the
            ruler all read these — hence the honest labels. */}
        {colorVarRow('chart-positive', 'Price up')}
        {colorVarRow('chart-negative', 'Price down')}
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

        {/* Same rows the double-click Candles popup renders — one definition. */}
        <div className={styles.settingsGroupTitle}>Candles</div>
        <CandleRows {...rowCtx} />

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

        <div className={styles.settingsGroupTitle}>Gap up</div>
        {colorRow(['patterns', 'gap_up', 'bandFill'], 'Band fill')}
        {sliderRow(['patterns', 'gap_up', 'bandFillOpacity'], 'Band opacity')}
        {colorRow(['patterns', 'gap_up', 'labelBg'], 'Label bg')}
        {sliderRow(['patterns', 'gap_up', 'labelBgOpacity'], 'Label bg opacity')}
        {colorRow(['patterns', 'gap_up', 'labelTextColor'], 'Label text')}
        {numberRow(['patterns', 'gap_up', 'labelFontSize'], 'Label font size', { min: 6, max: 24, step: 1 })}

        <div className={styles.settingsGroupTitle}>Volume breakout</div>
        {colorRow(['patterns', 'volume_breakout', 'markerColor'], 'Marker')}
        {sliderRow(['patterns', 'volume_breakout', 'markerOpacity'], 'Marker opacity')}
        {colorRow(['patterns', 'volume_breakout', 'labelBg'], 'Label bg')}
        {sliderRow(['patterns', 'volume_breakout', 'labelBgOpacity'], 'Label bg opacity')}
        {colorRow(['patterns', 'volume_breakout', 'labelTextColor'], 'Label text')}
        {numberRow(['patterns', 'volume_breakout', 'labelFontSize'], 'Label font size', { min: 6, max: 24, step: 1 })}

        <div className={styles.settingsGroupTitle}>Golden cross</div>
        {colorRow(['patterns', 'golden_cross', 'dotFill'], 'Dot')}
        {colorRow(['patterns', 'golden_cross', 'labelBg'], 'Label bg')}
        {sliderRow(['patterns', 'golden_cross', 'labelBgOpacity'], 'Label bg opacity')}
        {colorRow(['patterns', 'golden_cross', 'labelTextColor'], 'Label text')}
        {numberRow(['patterns', 'golden_cross', 'labelFontSize'], 'Label font size', { min: 6, max: 24, step: 1 })}

        <div className={styles.settingsGroupTitle}>NR7</div>
        {colorRow(['patterns', 'nr7', 'lineColor'], 'Line')}
        {numberRow(['patterns', 'nr7', 'lineWidth'], 'Line width', { min: 0.5, max: 8, step: 0.1 })}
        {sliderRow(['patterns', 'nr7', 'lineOpacity'], 'Line opacity')}
        {colorRow(['patterns', 'nr7', 'markerColor'], 'Marker')}
        {sliderRow(['patterns', 'nr7', 'markerOpacity'], 'Marker opacity')}
        {colorRow(['patterns', 'nr7', 'labelBg'], 'Label bg')}
        {sliderRow(['patterns', 'nr7', 'labelBgOpacity'], 'Label bg opacity')}
        {colorRow(['patterns', 'nr7', 'labelTextColor'], 'Label text')}
        {numberRow(['patterns', 'nr7', 'labelFontSize'], 'Label font size', { min: 6, max: 24, step: 1 })}

        <div className={styles.settingsGroupTitle}>Unusual volume</div>
        {colorRow(['patterns', 'unusual_volume', 'markerColor'], 'Marker')}
        {sliderRow(['patterns', 'unusual_volume', 'markerOpacity'], 'Marker opacity')}
        {colorRow(['patterns', 'unusual_volume', 'labelBg'], 'Label bg')}
        {sliderRow(['patterns', 'unusual_volume', 'labelBgOpacity'], 'Label bg opacity')}
        {colorRow(['patterns', 'unusual_volume', 'labelTextColor'], 'Label text')}
        {numberRow(['patterns', 'unusual_volume', 'labelFontSize'], 'Label font size', { min: 6, max: 24, step: 1 })}

        <div className={styles.settingsGroupTitle}>Volume dry-up</div>
        {colorRow(['patterns', 'volume_dryup', 'markerColor'], 'Marker')}
        {sliderRow(['patterns', 'volume_dryup', 'markerOpacity'], 'Marker opacity')}
        {colorRow(['patterns', 'volume_dryup', 'labelBg'], 'Label bg')}
        {sliderRow(['patterns', 'volume_dryup', 'labelBgOpacity'], 'Label bg opacity')}
        {colorRow(['patterns', 'volume_dryup', 'labelTextColor'], 'Label text')}
        {numberRow(['patterns', 'volume_dryup', 'labelFontSize'], 'Label font size', { min: 6, max: 24, step: 1 })}

        <div className={styles.settingsGroupTitle}>Pocket pivot</div>
        {colorRow(['patterns', 'pocket_pivot', 'markerColor'], 'Marker')}
        {sliderRow(['patterns', 'pocket_pivot', 'markerOpacity'], 'Marker opacity')}
        {colorRow(['patterns', 'pocket_pivot', 'labelBg'], 'Label bg')}
        {sliderRow(['patterns', 'pocket_pivot', 'labelBgOpacity'], 'Label bg opacity')}
        {colorRow(['patterns', 'pocket_pivot', 'labelTextColor'], 'Label text')}
        {numberRow(['patterns', 'pocket_pivot', 'labelFontSize'], 'Label font size', { min: 6, max: 24, step: 1 })}

        <div className={styles.settingsGroupTitle}>Inside day</div>
        {colorRow(['patterns', 'inside_day', 'lineColor'], 'Mother line')}
        {numberRow(['patterns', 'inside_day', 'lineWidth'], 'Mother line width', { min: 0.5, max: 8, step: 0.1 })}
        {sliderRow(['patterns', 'inside_day', 'lineOpacity'], 'Mother line opacity')}
        {colorRow(['patterns', 'inside_day', 'boxStroke'], 'Inside box')}
        {numberRow(['patterns', 'inside_day', 'boxStrokeWidth'], 'Inside box width', { min: 0.5, max: 8, step: 0.1 })}
        {sliderRow(['patterns', 'inside_day', 'boxStrokeOpacity'], 'Inside box opacity')}
        {colorRow(['patterns', 'inside_day', 'labelBg'], 'Label bg')}
        {sliderRow(['patterns', 'inside_day', 'labelBgOpacity'], 'Label bg opacity')}
        {colorRow(['patterns', 'inside_day', 'labelTextColor'], 'Label text')}
        {numberRow(['patterns', 'inside_day', 'labelFontSize'], 'Label font size', { min: 6, max: 24, step: 1 })}

        <div className={styles.settingsGroupTitle}>Pullback to EMA</div>
        {colorRow(['patterns', 'pullback_to_ema', 'dotFill'], 'Dot')}
        {colorRow(['patterns', 'pullback_to_ema', 'lineColor'], 'Tick')}
        {numberRow(['patterns', 'pullback_to_ema', 'lineWidth'], 'Tick width', { min: 0.5, max: 8, step: 0.1 })}
        {sliderRow(['patterns', 'pullback_to_ema', 'lineOpacity'], 'Tick opacity')}
        {colorRow(['patterns', 'pullback_to_ema', 'labelBg'], 'Label bg')}
        {sliderRow(['patterns', 'pullback_to_ema', 'labelBgOpacity'], 'Label bg opacity')}
        {colorRow(['patterns', 'pullback_to_ema', 'labelTextColor'], 'Label text')}
        {numberRow(['patterns', 'pullback_to_ema', 'labelFontSize'], 'Label font size', { min: 6, max: 24, step: 1 })}
      </div>
    </div>
  );
}
