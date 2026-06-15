export type RangeKey = '3M' | '6M' | '1Y' | '2Y' | '3Y' | '5Y';

export const RANGE_DAYS: Record<RangeKey, number> = {
  '3M': 66,
  '6M': 132,
  '1Y': 252,
  '2Y': 504,
  '3Y': 756,
  '5Y': 1260,
};

export const MIN_BAR_STEP_PX = 2; // min px per bar slot to stay readable (D2)
export const MIN_VISIBLE_BARS = 10; // zoom-in floor (cap owner is consistent both ends)
// Non-plot horizontal chrome; equals MARGIN.right(60) + RIGHT_BUFFER(18) in Chart.tsx.
// Kept here (documented) so the cap math stays unit-testable; keep in sync with Chart.tsx.
const CHART_CHROME_PX = 78;

// Raw pixel cap: how many bar slots fit while each stays >= MIN_BAR_STEP_PX wide.
export function rawMaxVisibleBars(containerWidth: number): number {
  return Math.floor((containerWidth - CHART_CHROME_PX) / MIN_BAR_STEP_PX);
}

// Mark-snapped effective cap (D4/D5): largest RANGE_DAYS value <= rawMax.
// Falls back to rawMax on a degenerately narrow screen where even 3M doesn't fit.
export function maxVisibleBarsForWidth(containerWidth: number): number {
  const raw = rawMaxVisibleBars(containerWidth);
  const marks = Object.values(RANGE_DAYS).sort((a, b) => a - b);
  const fits = marks.filter((m) => m <= raw);
  return fits.length ? Math.max(...fits) : Math.max(MIN_VISIBLE_BARS, raw);
}

export const formatPrice = (value: number | null | undefined): string => {
  if (value == null) return '';
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const formatVolume = (value: number | null | undefined): string => {
  if (value == null) return '';
  if (value >= 1e9) return (value / 1e9).toFixed(2) + 'B';
  if (value >= 1e6) return (value / 1e6).toFixed(2) + 'M';
  if (value >= 1e3) return (value / 1e3).toFixed(0) + 'K';
  return value.toString();
};

export const formatVolumeTick = (value: number | null | undefined): string => {
  if (value == null) return '';
  if (value >= 1e9) return Math.round(value / 1e9) + 'B';
  if (value >= 1e6) return Math.round(value / 1e6) + 'M';
  if (value >= 1e3) return Math.round(value / 1e3) + 'K';
  return value.toString();
};

export type VolumeLabel = { index: number; text: 'HVE' | 'HVY' };

export type VolumeStats = {
  /** Per-index trailing 30-bar SMA of volume; undefined for the first 29 bars. */
  sma: (number | undefined)[];
  /** At most two markers: HVE always (if data has volume), HVY unless it ties HVE's bar. */
  labels: VolumeLabel[];
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function computeVolumeStats(
  data: { date: string; volume: number }[],
  smaWindow = 30,
  yearDays = 365,
): VolumeStats {
  const n = data.length;
  const sma: (number | undefined)[] = new Array(n).fill(undefined);

  // Trailing SMA via running-sum sliding window.
  let runningSum = 0;
  for (let i = 0; i < n; i++) {
    runningSum += data[i].volume;
    if (i >= smaWindow) runningSum -= data[i - smaWindow].volume;
    if (i >= smaWindow - 1) sma[i] = runningSum / smaWindow;
  }

  const labels: VolumeLabel[] = [];
  if (n === 0) return { sma, labels };

  // HVE — index of the all-time max volume; latest index wins ties.
  let hve = -1;
  let hveVol = 0;
  for (let i = 0; i < n; i++) {
    if (data[i].volume > 0 && data[i].volume >= hveVol) {
      hve = i;
      hveVol = data[i].volume;
    }
  }
  if (hve === -1) return { sma, labels }; // all volumes 0 / empty

  // HVY — max volume within the trailing `yearDays` window before the last bar.
  const cutoff = new Date(data[n - 1].date).getTime() - yearDays * MS_PER_DAY;
  let hvy = -1;
  let hvyVol = 0;
  for (let i = 0; i < n; i++) {
    if (new Date(data[i].date).getTime() < cutoff) continue;
    if (data[i].volume > 0 && data[i].volume >= hvyVol) {
      hvy = i;
      hvyVol = data[i].volume;
    }
  }

  labels.push({ index: hve, text: 'HVE' });
  if (hvy !== -1 && hvy !== hve) labels.push({ index: hvy, text: 'HVY' });

  return { sma, labels };
}
