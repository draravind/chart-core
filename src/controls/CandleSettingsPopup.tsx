import { useEffect, useRef } from 'react';
import type { AppearanceOverrides } from '../appearance/types';
import { CandleRows } from './appearanceFields';
import { cn } from '../internal/cn';
import styles from '../Chart.module.css';

// Focused "Candles" popup — what a double-click on a candle opens. Edits the
// same `AppearanceOverrides` delta as the gear dialog, through the same shared
// `CandleRows`, so there is exactly one definition of each field.

type Props = {
  appearance: AppearanceOverrides;
  onAppearanceChange: (next: AppearanceOverrides) => void;
  resolveColor: (expr: string) => string;
  onClose: () => void;
  className?: string;
  style?: React.CSSProperties;
};

export default function CandleSettingsPopup({
  appearance,
  onAppearanceChange,
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

  return (
    <div
      className={cn(styles.legendPopover, className)}
      ref={ref}
      style={style}
      data-chart-wheel-scroll
    >
      <div className={styles.legendPopoverHeader}>
        <span className={styles.legendPopoverTitle}>Candles</span>
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
        <CandleRows
          appearance={appearance}
          onAppearanceChange={onAppearanceChange}
          resolveColor={resolveColor}
        />
      </div>
    </div>
  );
}
