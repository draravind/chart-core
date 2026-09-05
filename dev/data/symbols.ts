// The ten NSE tickers committed under dev/public/eod/. Kept as a plain list (no
// data import) so switching symbols is a pure fetch, never a bundle bloat.
export const SYMBOLS = [
  'RELIANCE',
  'TCS',
  'INFY',
  'HDFCBANK',
  'ICICIBANK',
  'SBIN',
  'ITC',
  'HINDUNILVR',
  'BHARTIARTL',
  'KOTAKBANK',
] as const;

export type Symbol = (typeof SYMBOLS)[number];

// The fixtures (pattern markers / quarterly results / stats) are dated onto this
// symbol's real bars, so it is the one that renders every toggle out of the box.
export const DEFAULT_SYMBOL: Symbol = 'RELIANCE';
