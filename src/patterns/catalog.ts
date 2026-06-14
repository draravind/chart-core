// Ordered catalog of every renderable pattern + its human label. Order mirrors
// the renderers registry. This is the single source for the patterns dropdown.
export type PatternCatalogEntry = { name: string; label: string };

export const PATTERN_CATALOG: PatternCatalogEntry[] = [
  { name: 'high_tight_flag', label: 'High tight flag' },
  { name: 'base_breakout', label: 'Base breakout' },
  { name: 'consolidation', label: 'Consolidation' },
  { name: 'gap_up', label: 'Gap up' },
  { name: 'volume_breakout', label: 'Volume breakout' },
  { name: 'golden_cross', label: 'Golden cross' },
  { name: 'nr7', label: 'NR7' },
  { name: 'unusual_volume', label: 'Unusual volume' },
  { name: 'volume_dryup', label: 'Volume dryup' },
  { name: 'pocket_pivot', label: 'Pocket pivot' },
  { name: 'inside_day', label: 'Inside day' },
  { name: 'pullback_to_ema', label: 'Pullback to EMA' },
];

export const PATTERN_NAMES: string[] = PATTERN_CATALOG.map((e) => e.name);
