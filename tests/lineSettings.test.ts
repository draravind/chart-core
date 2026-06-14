import { describe, it, expect } from 'vitest';
// Importing the registry self-registers every builtin.
import { getIndicator, defaultsFromSchema } from '../src/indicators/registry';
import { lineStyleFrom } from '../src/indicators/lineSettings';
import { dashFor } from '../src/indicators/settingsOptions';
import type { SettingsField } from '../src/indicators/types';

const id = (e: string) => e;

describe('defaultsFromSchema — line field expansion', () => {
  it('expands a line field into four scalar sub-keys with carried defaults', () => {
    const schema: SettingsField[] = [
      { key: 'period', label: 'Length', kind: 'number', default: 20 },
      {
        key: 'line',
        label: 'Line',
        kind: 'line',
        default: { color: 'var(--x)', width: 1.4, style: 1, opacity: 0.7 },
      },
    ];
    expect(defaultsFromSchema(schema)).toEqual({
      period: 20,
      lineColor: 'var(--x)',
      lineWidth: 1.4,
      lineStyle: 1,
      lineOpacity: 0.7,
    });
  });

  it('defaults style→0 and opacity→1 when the line default omits them', () => {
    const schema: SettingsField[] = [
      { key: 'mid', label: 'Mid', kind: 'line', default: { color: '#abc', width: 1.2 } },
    ];
    expect(defaultsFromSchema(schema)).toEqual({
      midColor: '#abc',
      midWidth: 1.2,
      midStyle: 0,
      midOpacity: 1,
    });
  });
});

describe('lineStyleFrom', () => {
  it('maps style→dashFor, passes opacity, resolves the color', () => {
    const s = { kColor: 'var(--k)', kWidth: 1.3, kStyle: 2, kOpacity: 0.5 };
    expect(lineStyleFrom(s, 'k', (e) => e.toUpperCase())).toEqual({
      color: 'VAR(--K)',
      width: 1.3,
      dash: dashFor(2),
      opacity: 0.5,
    });
  });
});

// Default-parity table: lineStyleFrom over the schema defaults of every line
// builtin must equal the literal style it shipped before the refactor. Catches
// transcription errors in the migration.
type Expect = { color: string; width: number; dash: number[] | null; opacity: number };
const PARITY: { key: string; prefix: string; expected: Expect }[] = [
  { key: 'ti:sma', prefix: 'line', expected: { color: 'var(--ti-sma)', width: 1.2, dash: null, opacity: 1 } },
  { key: 'ti:ema', prefix: 'line', expected: { color: 'var(--ti-ema)', width: 1.2, dash: null, opacity: 1 } },
  { key: 'ti:wma', prefix: 'line', expected: { color: 'var(--ti-wma)', width: 1.2, dash: null, opacity: 1 } },
  { key: 'ti:dema', prefix: 'line', expected: { color: 'var(--ti-dema)', width: 1.2, dash: null, opacity: 1 } },
  { key: 'ti:tema', prefix: 'line', expected: { color: 'var(--ti-tema)', width: 1.2, dash: null, opacity: 1 } },
  { key: 'ti:rsi', prefix: 'line', expected: { color: 'var(--rsi-line)', width: 1.3, dash: null, opacity: 1 } },
  { key: 'ti:adx', prefix: 'line', expected: { color: 'var(--adx-line)', width: 1.3, dash: null, opacity: 1 } },
  { key: 'ti:atr', prefix: 'line', expected: { color: 'var(--atr-line)', width: 1.3, dash: null, opacity: 1 } },
  { key: 'ti:natr', prefix: 'line', expected: { color: 'var(--natr-line)', width: 1.3, dash: null, opacity: 1 } },
  { key: 'ti:dx', prefix: 'line', expected: { color: 'var(--dx-line)', width: 1.3, dash: null, opacity: 1 } },
  { key: 'ti:trange', prefix: 'line', expected: { color: 'var(--trange-line)', width: 1.3, dash: null, opacity: 1 } },
  { key: 'ti:willr', prefix: 'line', expected: { color: 'var(--willr-line)', width: 1.3, dash: null, opacity: 1 } },
  { key: 'ti:bbands', prefix: 'upper', expected: { color: 'var(--bb-upper)', width: 1, dash: [4, 3], opacity: 0.8 } },
  { key: 'ti:bbands', prefix: 'mid', expected: { color: 'var(--bb-mid)', width: 1.2, dash: null, opacity: 1 } },
  { key: 'ti:bbands', prefix: 'lower', expected: { color: 'var(--bb-lower)', width: 1, dash: [4, 3], opacity: 0.8 } },
  { key: 'ti:stoch', prefix: 'k', expected: { color: 'var(--stoch-k)', width: 1.3, dash: null, opacity: 1 } },
  { key: 'ti:stoch', prefix: 'd', expected: { color: 'var(--stoch-d)', width: 1.1, dash: [4, 3], opacity: 1 } },
  { key: 'ti:stochf', prefix: 'k', expected: { color: 'var(--stoch-k)', width: 1.3, dash: null, opacity: 1 } },
  { key: 'ti:stochf', prefix: 'd', expected: { color: 'var(--stoch-d)', width: 1.1, dash: [4, 3], opacity: 1 } },
  { key: 'ti:stochrsi', prefix: 'k', expected: { color: 'var(--stoch-k)', width: 1.3, dash: null, opacity: 1 } },
  { key: 'ti:stochrsi', prefix: 'd', expected: { color: 'var(--stoch-d)', width: 1.1, dash: [4, 3], opacity: 1 } },
  { key: 'highs', prefix: 'high1y', expected: { color: 'var(--high-1y)', width: 1.1, dash: [4, 3], opacity: 0.5 } },
  { key: 'highs', prefix: 'high2y', expected: { color: 'var(--high-2y)', width: 1.1, dash: [4, 3], opacity: 0.5 } },
  { key: 'highs', prefix: 'high3y', expected: { color: 'var(--high-3y)', width: 1.1, dash: [4, 3], opacity: 0.5 } },
  { key: 'highs', prefix: 'highAll', expected: { color: 'var(--high-all)', width: 1.1, dash: null, opacity: 0.5 } },
  { key: 'ti:macd', prefix: 'macd', expected: { color: 'var(--macd-line)', width: 1.3, dash: null, opacity: 1 } },
  { key: 'ti:macd', prefix: 'macdsignal', expected: { color: 'var(--macd-signal)', width: 1.1, dash: null, opacity: 1 } },
  { key: 'rs', prefix: 'line', expected: { color: 'var(--rs-line)', width: 1.3, dash: null, opacity: 1 } },
];

describe('line builtin default-parity', () => {
  it.each(PARITY)('$key / $prefix', ({ key, prefix, expected }) => {
    const def = getIndicator(key);
    expect(def, `${key} registered`).toBeTruthy();
    const settings = defaultsFromSchema(def!.settingsSchema);
    expect(lineStyleFrom(settings, prefix, id)).toEqual(expected);
  });
});
