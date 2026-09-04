import { useRef } from 'react';
import type { RefObject } from 'react';
import { useDismissable } from './useDismissable';
import styles from '../Chart.module.css';

// ---------------------------------------------------------------------------
// Right-click checklist for the "A" auto-fit button. Lets the user pick which
// contributor groups feed the price+overlays fit. Checked = included; toggling
// adds/removes the group key from the persisted `excluded` set. Mirrors the
// gear SettingsDialog's click-outside + Escape close handling.
// ---------------------------------------------------------------------------

type Contributor = { key: string; label: string };

type Props = {
  contributors: Contributor[];
  excluded: string[];
  onExcludedChange: (next: string[]) => void;
  onClose: () => void;
  // The "A" button lives in Chart, separate from this menu, so its ref is passed
  // in and counted as "inside" — a press on it toggles cleanly instead of
  // dismiss-then-reopen.
  triggerRef?: RefObject<HTMLElement | null>;
  style?: React.CSSProperties;
};

export default function AutoFitMenu({
  contributors,
  excluded,
  onExcludedChange,
  onClose,
  triggerRef,
  style,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  useDismissable(true, onClose, triggerRef ? [ref, triggerRef] : [ref]);

  const toggle = (key: string) => {
    onExcludedChange(
      excluded.includes(key)
        ? excluded.filter((k) => k !== key)
        : [...excluded, key],
    );
  };

  return (
    <div
      className={styles.autoFitMenu}
      ref={ref}
      style={style}
      data-chart-wheel-scroll
      data-chart-native-menu
    >
      <div className={styles.legendPopoverHeader}>
        <span className={styles.legendPopoverTitle}>Fit to…</span>
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
        {contributors.length === 0 ? (
          <div className={styles.autoFitMenuEmpty}>No overlays to fit</div>
        ) : (
          contributors.map((c) => (
            <label key={c.key} className={styles.autoFitMenuRow}>
              <input
                type="checkbox"
                checked={!excluded.includes(c.key)}
                onChange={() => toggle(c.key)}
              />
              <span>{c.label}</span>
            </label>
          ))
        )}
      </div>
    </div>
  );
}
