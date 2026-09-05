import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, extname } from 'node:path';

import { APPEARANCE_DEFAULTS } from '../src/appearance/registry';

// Design-token invariants. These lock the "each raw value written once, referred
// to everywhere by name" contract so the repo can't silently drift back — a
// typo'd var(--typo) paints nothing and fails no other test; a re-inlined hex
// re-creates the duplication this change removed.

const SRC = fileURLToPath(new URL('../src', import.meta.url));
const TOKEN_CSS = join(SRC, 'styles', 'chart-core.css');
const css = readFileSync(TOKEN_CSS, 'utf8');

function walk(dir: string, exts: string[]): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p, exts));
    else if (exts.includes(extname(e.name))) out.push(p);
  }
  return out;
}

const HEX = /#[0-9a-fA-F]{3,8}\b/;

// All custom properties declared in the token contract.
const declared = new Map<string, string>();
for (const m of css.matchAll(/^\s*(--[\w-]+):\s*([^;]+);/gm)) {
  declared.set(m[1], m[2].trim());
}

describe('token contract shape', () => {
  it('the whole block is declared inside :where(:root), never a bare :root', () => {
    expect(/:where\(:root\)\s*\{/.test(css)).toBe(true);
    // A bare `:root {` (specificity 0,1,0) would beat an app override; there must
    // be none — every declaration lives under the zero-specificity :where().
    expect((css.match(/(^|[^)])\s*:root\s*\{/g) ?? []).length).toBe(0);
  });
});

describe('no dangling token reference', () => {
  // Set at runtime by Chart (published as an inline style on the wrapper), so it
  // is deliberately NOT in the CSS contract — and only ever read WITH a fallback.
  const RUNTIME_TOKENS = new Set(['--chart-price-height']);

  // Strip comments so a prose mention like `// var(--key)` isn't scanned as code.
  // Block comments everywhere; // line comments only in TS/TSX (CSS has none, and
  // its data: URIs contain `http://…` we must not truncate).
  const stripComments = (text: string, isTs: boolean): string => {
    const noBlock = text.replace(/\/\*[\s\S]*?\*\//g, '');
    return isTs ? noBlock.replace(/\/\/[^\n]*/g, '') : noBlock;
  };

  it('every var(--x) with no fallback resolves to a declared token', () => {
    const files = walk(SRC, ['.ts', '.tsx', '.css']);
    const missing: string[] = [];
    for (const f of files) {
      const ext = extname(f);
      const text = stripComments(readFileSync(f, 'utf8'), ext === '.ts' || ext === '.tsx');
      // var(--x) with the paren closing straight after the name = no fallback.
      for (const m of text.matchAll(/var\(\s*(--[\w-]+)\s*\)/g)) {
        const tok = m[1];
        if (declared.has(tok) || RUNTIME_TOKENS.has(tok)) continue;
        missing.push(`${tok}  (${f.slice(SRC.length + 1)})`);
      }
    }
    expect(missing).toEqual([]);
  });
});

describe('each raw value written once', () => {
  it('chart-core.css holds no raw hex outside the --cc-* primitive lines', () => {
    const offenders: string[] = [];
    for (const line of css.split('\n')) {
      if (/^\s*--cc-[\w-]+:/.test(line)) continue; // primitive line — hex allowed
      if (HEX.test(line)) offenders.push(line.trim());
    }
    expect(offenders).toEqual([]);
  });

  it('no *.module.css / controls.css holds a raw hex or rgb()/rgba()', () => {
    const files = walk(SRC, ['.css']).filter(
      (f) => f.endsWith('.module.css') || f.endsWith('controls.css'),
    );
    const offenders: string[] = [];
    for (const f of files) {
      for (const line of readFileSync(f, 'utf8').split('\n')) {
        if (HEX.test(line) || /\brgba?\(/.test(line)) {
          offenders.push(`${f.slice(SRC.length + 1)}: ${line.trim()}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('no two primitives share a value', () => {
    const byValue = new Map<string, string>();
    const dups: string[] = [];
    for (const [name, value] of declared) {
      if (!name.startsWith('--cc-')) continue;
      const v = value.toLowerCase();
      const prev = byValue.get(v);
      if (prev) dups.push(`${name} == ${prev} (${v})`);
      else byValue.set(v, name);
    }
    expect(dups).toEqual([]);
  });

  it('APPEARANCE_DEFAULTS.patterns holds no raw hex (all var() tokens)', () => {
    expect(JSON.stringify(APPEARANCE_DEFAULTS.patterns)).not.toMatch(/#[0-9a-fA-F]{3,8}/);
  });

  it("only one bare '#888888' literal survives in TS/TSX (FALLBACK_COLOR)", () => {
    const files = walk(SRC, ['.ts', '.tsx']);
    const hits: string[] = [];
    for (const f of files) {
      for (const line of readFileSync(f, 'utf8').split('\n')) {
        if (line.includes("'#888888'") || line.includes('"#888888"')) {
          hits.push(`${f.slice(SRC.length + 1)}: ${line.trim()}`);
        }
      }
    }
    expect(hits.length).toBe(1);
    expect(hits[0]).toContain('FALLBACK_COLOR');
  });
});

describe('public token names survive (apps override by name)', () => {
  // A rename or removal of any name below is a breaking change for consumers.
  // Add new semantic names here deliberately; never delete one without a migration.
  const PUBLIC = [
    '--adx-line', '--atr-line', '--bb-lower', '--bb-mid', '--bb-upper', '--bg-card',
    '--candle-down', '--candle-up', '--chart-axis-label', '--chart-bg-bottom',
    '--chart-bg-top', '--chart-drawing', '--chart-drawing-bg', '--chart-drawing-handle',
    '--chart-drawing-label-text', '--chart-ema-10-label', '--chart-ema-20-label',
    '--chart-ema-200-label', '--chart-ema-50-label', '--chart-high-1y-label',
    '--chart-high-2y-label', '--chart-high-3y-label', '--chart-high-all-label',
    '--chart-negative', '--chart-pattern-fill', '--chart-pattern-label-text',
    '--chart-positive', '--chart-qr-eps-label', '--chart-qr-rps-label',
    '--chart-rs-label', '--chart-rs-signal-label', '--chart-separator',
    '--chart-tooltip-label', '--color-dark-700', '--color-focus-ring', '--dx-line',
    '--ema-10', '--ema-20', '--ema-200', '--ema-50', '--field-bg', '--field-border',
    '--field-invalid', '--font-family-base', '--font-weight-medium',
    '--font-weight-semibold', '--high-1y', '--high-2y', '--high-3y', '--high-all',
    '--macd-hist-down', '--macd-hist-up', '--macd-line', '--macd-signal', '--natr-line',
    '--panel-border', '--panel-box-bg', '--qr-eps', '--qr-growth-down', '--qr-growth-up',
    '--qr-label', '--qr-rps', '--radius-full', '--radius-md', '--radius-popover',
    '--radius-sm', '--rs-line', '--rs-signal', '--rsi-line', '--shadow-card',
    '--shadow-inset-track', '--shadow-pill-active', '--shadow-popover', '--space-1',
    '--space-2', '--space-3', '--space-4', '--stage2-band', '--stats-bg',
    '--stats-border', '--stats-down', '--stats-muted', '--stats-neutral',
    '--stats-radius', '--stats-strong', '--stats-text', '--stats-up', '--stoch-d',
    '--stoch-k', '--subpane-guide', '--surface-dropdown', '--surface-panel-box',
    '--surface-panel-header', '--surface-panel-raised', '--text-2hxs', '--text-2xs',
    '--text-3xs', '--text-base', '--text-md', '--text-muted', '--text-primary',
    '--text-sm', '--text-xs', '--ti-dema', '--ti-ema', '--ti-sma', '--ti-tema',
    '--ti-wma', '--trange-line', '--transition-fast', '--willr-line',
  ].sort();

  it('the declared non-primitive names match the checked-in set exactly', () => {
    const actual = [...declared.keys()].filter((n) => !n.startsWith('--cc-')).sort();
    expect(actual).toEqual(PUBLIC);
  });
});

describe('every semantic token still resolves to the pre-refactor colour', () => {
  // Flatten a token's alias chain (var(--x) → … → primitive) to its literal.
  function flatten(name: string, seen = new Set<string>()): string {
    if (seen.has(name)) throw new Error(`cycle at ${name}`);
    seen.add(name);
    const v = declared.get(name);
    if (v === undefined) throw new Error(`undeclared ${name}`);
    const alias = v.match(/^var\((--[\w-]+)\)$/);
    return alias ? flatten(alias[1], seen) : v.toLowerCase();
  }

  // Captured from the token file BEFORE the primitive rewrite. Every semantic
  // colour must still flatten to exactly the same hex.
  const EXPECTED: Record<string, string> = {
    '--chart-positive': '#16a34a',
    '--chart-negative': '#dc2626',
    '--candle-up': '#16a34a',
    '--candle-down': '#dc2626',
    '--chart-axis-label': '#888888',
    '--chart-separator': '#cccccc',
    '--chart-tooltip-label': '#888888',
    '--chart-ema-10-label': '#3b82f6',
    '--chart-ema-20-label': '#6b7280',
    '--chart-ema-50-label': '#ef4444',
    '--chart-ema-200-label': '#22c55e',
    '--chart-high-1y-label': '#ef4444',
    '--chart-high-2y-label': '#f59e0b',
    '--chart-high-3y-label': '#8b5cf6',
    '--chart-high-all-label': '#06b6d4',
    '--chart-rs-label': '#ec4899',
    '--chart-rs-signal-label': '#eab308',
    '--ema-10': '#3b82f6',
    '--ema-20': '#6b7280',
    '--ema-50': '#ef4444',
    '--ema-200': '#22c55e',
    '--high-1y': '#ef4444',
    '--high-2y': '#f59e0b',
    '--high-3y': '#8b5cf6',
    '--high-all': '#06b6d4',
    '--rs-line': '#ec4899',
    '--rs-signal': '#eab308',
    '--ti-sma': '#3b82f6',
    '--ti-ema': '#ef4444',
    '--ti-wma': '#a855f7',
    '--ti-dema': '#f59e0b',
    '--ti-tema': '#14b8a6',
    '--bb-upper': '#60a5fa',
    '--bb-mid': '#9ca3af',
    '--bb-lower': '#60a5fa',
    '--stage2-band': '#22c55e',
    '--rsi-line': '#8b5cf6',
    '--macd-line': '#3b82f6',
    '--macd-signal': '#f59e0b',
    '--macd-hist-up': '#16a34a',
    '--macd-hist-down': '#dc2626',
    '--stoch-k': '#3b82f6',
    '--stoch-d': '#f59e0b',
    '--willr-line': '#ec4899',
    '--adx-line': '#14b8a6',
    '--dx-line': '#a855f7',
    '--atr-line': '#06b6d4',
    '--natr-line': '#0ea5e9',
    '--trange-line': '#22c55e',
    '--qr-rps': '#60a5fa',
    '--qr-eps': '#f97316',
    '--chart-qr-rps-label': '#60a5fa',
    '--chart-qr-eps-label': '#f97316',
    '--qr-growth-up': '#16a34a',
    '--qr-growth-down': '#dc2626',
    '--qr-label': '#888888',
    '--subpane-guide': '#888888',
    '--chart-drawing': '#3b82f6',
    '--chart-drawing-bg': '#1e293b',
    '--chart-drawing-handle': '#ffffff',
    '--stats-strong': '#84cc16',
    '--stats-up': '#22c55e',
    '--stats-neutral': '#f59e0b',
    '--stats-down': '#ef4444',
    '--stats-text': '#bcbab6',
    '--stats-muted': '#8e8b86',
    '--stats-bg': '#30302e',
    '--panel-box-bg': '#252525',
    '--stats-border': '#cccccc',
    '--bg-card': '#ffffff',
    '--color-dark-700': '#30302e',
    '--surface-panel-raised': '#30302e',
    '--surface-panel-header': '#202020',
    '--surface-panel-box': '#252525',
    '--surface-dropdown': '#191919',
    '--text-primary': '#bcbab6',
    '--text-muted': '#8e8b86',
    '--field-invalid': '#d6705f',
    // New semantic tokens (their intended literals).
    '--chart-bg-top': '#6e7b8b',
    '--chart-bg-bottom': '#776a5a',
    '--chart-pattern-fill': '#252525',
    '--chart-pattern-label-text': '#ffffff',
    '--chart-drawing-label-text': '#ffffff',
    '--color-focus-ring': '#5b8def',
  };

  for (const [token, hex] of Object.entries(EXPECTED)) {
    it(`${token} → ${hex}`, () => {
      expect(flatten(token)).toBe(hex);
    });
  }
});
