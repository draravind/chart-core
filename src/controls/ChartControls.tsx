import { Fragment } from 'react';
import type { ChartType, RangeKey } from '../types';
import type { IndicatorConfig } from '../indicators/types';
import { cn } from '../internal/cn';
import './controls.css';
import styles from './ChartControls.module.css';

type Props = {
  ranges: RangeKey[];
  activeRange: RangeKey;
  onRangeChange: (r: RangeKey) => void;
  chartType: ChartType;
  onChartTypeChange: (t: ChartType) => void;
  // Registry-driven indicator catalog. Each config is one toggle button.
  indicators: IndicatorConfig[];
  onIndicatorToggle: (id: string) => void;
  // Patterns is Pillar 2, not an indicator — wired as a standalone toggle.
  patternsEnabled: boolean;
  onPatternsToggle: () => void;
  className?: string;
};

export default function ChartControls({
  ranges,
  activeRange,
  onRangeChange,
  chartType,
  onChartTypeChange,
  indicators,
  onIndicatorToggle,
  patternsEnabled,
  onPatternsToggle,
  className,
}: Props) {
  const groups = [
    {
      label: 'Range',
      content: (
        <div className="pill-toggle-group">
          {ranges.map((r) => (
            <button
              key={r}
              className={cn('pill-toggle-btn', 'pill-toggle-btn-sm', r === activeRange && 'is-active')}
              onClick={() => onRangeChange(r)}
            >
              {r}
            </button>
          ))}
        </div>
      ),
    },
    {
      label: 'Chart Type',
      content: (
        <div className="pill-toggle-group">
          <button
            className={cn('pill-toggle-btn', 'pill-toggle-btn-sm', chartType === 'candlestick' && 'is-active')}
            onClick={() => onChartTypeChange('candlestick')}
          >
            Candles
          </button>
          <button
            className={cn('pill-toggle-btn', 'pill-toggle-btn-sm', chartType === 'bar' && 'is-active')}
            onClick={() => onChartTypeChange('bar')}
          >
            Bars
          </button>
        </div>
      ),
    },
    {
      label: 'Indicators',
      content: (
        <div className="pill-toggle-group">
          {indicators.map((ind) => (
            <button
              key={ind.id}
              className={cn('pill-toggle-btn', 'pill-toggle-btn-sm', ind.enabled && 'is-active')}
              onClick={() => onIndicatorToggle(ind.id)}
            >
              {ind.label}
            </button>
          ))}
          <button
            className={cn('pill-toggle-btn', 'pill-toggle-btn-sm', patternsEnabled && 'is-active')}
            onClick={onPatternsToggle}
          >
            Patterns
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className={cn(styles.chartControls, className)}>
      {groups.map((g) => (
        <Fragment key={g.label}>{g.content}</Fragment>
      ))}
    </div>
  );
}
