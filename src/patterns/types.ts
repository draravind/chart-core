// Structural mirror of the app's `ChartPatternMarkers` (services/api.ts). The
// app fetches detections and passes them in as `Chart`'s `patterns` prop; the
// shapes are identical so they flow across with no cross-package import.
export type PatternMarker = {
  pattern_name: string;
  detected_on: string;
  markers: Record<string, unknown>;
};
