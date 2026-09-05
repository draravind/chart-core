import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

import type { Candle } from '../src/types';
import { renderers } from '../src/patterns/renderers';
import { SYMBOLS, DEFAULT_SYMBOL } from '../dev/data/symbols';
import { SAMPLE_PATTERNS, SAMPLE_QUARTERS } from '../dev/data/fixtures';

// Guards the committed dev-harness dataset + fixtures. The extractor is one-shot
// and every failure here is otherwise SILENT — a blank or wrong-looking chart,
// never an error. Read the files straight off disk (the way parity.test.ts does),
// so this stays the cheapest node tier — no DOM needed.
const __dir = dirname(fileURLToPath(import.meta.url));
const EOD_DIR = resolve(__dir, '../dev/public/eod');

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function loadFile(symbol: string): Candle[] {
  return JSON.parse(readFileSync(resolve(EOD_DIR, `${symbol}.json`), 'utf8'));
}

// Number of decimal places in a serialised price.
function decimals(n: number): number {
  const s = String(n);
  const dot = s.indexOf('.');
  return dot === -1 ? 0 : s.length - dot - 1;
}

describe('dev harness — committed dataset', () => {
  it('every symbol resolves to a file and there are no orphans', () => {
    const onDisk = readdirSync(EOD_DIR)
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace(/\.json$/, ''))
      .sort();
    expect(onDisk).toEqual([...SYMBOLS].sort());
  });

  for (const symbol of SYMBOLS) {
    describe(symbol, () => {
      const bars = loadFile(symbol);

      it('has enough history for the widest (5Y) zoom mark', () => {
        expect(bars.length).toBeGreaterThanOrEqual(1260);
      });

      it('every bar matches the Candle shape', () => {
        for (const b of bars) {
          expect(b.date).toMatch(ISO_DATE);
          for (const p of [b.open, b.high, b.low, b.close]) {
            expect(Number.isFinite(p)).toBe(true);
            expect(p).toBeGreaterThan(0);
          }
          expect(Number.isFinite(b.volume)).toBe(true);
          expect(Number.isInteger(b.volume)).toBe(true);
          expect(b.volume).toBeGreaterThanOrEqual(0);
        }
      });

      it('is strictly ascending by date', () => {
        for (let i = 1; i < bars.length; i++) {
          expect(bars[i].date > bars[i - 1].date).toBe(true);
        }
      });

      it('has no swapped OHLC columns', () => {
        for (const b of bars) {
          expect(b.low).toBeLessThanOrEqual(Math.min(b.open, b.close));
          expect(Math.max(b.open, b.close)).toBeLessThanOrEqual(b.high);
        }
      });

      it('keeps prices rounded to ≤ 2 decimals', () => {
        for (const b of bars) {
          for (const p of [b.open, b.high, b.low, b.close]) {
            expect(decimals(p)).toBeLessThanOrEqual(2);
          }
        }
      });
    });
  }
});

describe('dev harness — fixtures', () => {
  const defaultDates = new Set(loadFile(DEFAULT_SYMBOL).map((b) => b.date));

  it('every fixture date lands on an exact bar of the default symbol', () => {
    const dates: string[] = [];
    for (const p of SAMPLE_PATTERNS) {
      dates.push(p.detected_on);
      for (const v of Object.values(p.markers)) {
        if (typeof v === 'string' && ISO_DATE.test(v)) dates.push(v);
      }
    }
    for (const q of SAMPLE_QUARTERS) dates.push(q.date);

    for (const d of dates) expect(defaultDates.has(d)).toBe(true);
  });

  it('every fixture pattern is a registered renderer', () => {
    for (const p of SAMPLE_PATTERNS) {
      expect(renderers[p.pattern_name]).toBeTypeOf('function');
    }
  });
});
