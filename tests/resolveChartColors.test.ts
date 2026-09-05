// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';

import {
  createColorResolver,
  composeCanvasFont,
} from '../src/utils/resolveChartColors';

// composeCanvasFont is pure — a fake resolver keyed by `${prop}|${expr}` pins its
// composition + fallback behaviour without a DOM.
describe('composeCanvasFont', () => {
  const fake =
    (map: Record<string, string>) =>
    (expr: string, prop = 'color'): string =>
      map[`${prop}|${expr}`] ?? '';

  it('composes "<weight> <size> <family>" in order', () => {
    const resolve = fake({
      'font-weight|var(--w)': '600',
      'font-size|var(--s)': '9px',
      'font-family|var(--font-family-base)':
        "'Helvetica Neue', Helvetica, Arial, sans-serif",
    });
    expect(composeCanvasFont(resolve, 'var(--w)', 'var(--s)', 'FB')).toBe(
      "600 9px 'Helvetica Neue', Helvetica, Arial, sans-serif",
    );
  });

  it('returns the fallback verbatim if any part resolves empty (probe unmounted)', () => {
    const resolve = fake({ 'font-weight|var(--w)': '600' }); // size + family empty
    expect(composeCanvasFont(resolve, 'var(--w)', 'var(--s)', 'FALLBACK')).toBe(
      'FALLBACK',
    );
  });
});

describe('createColorResolver', () => {
  it('reads back a non-colour property and caches per (prop, expr)', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const r = createColorResolver(host);

    const spy = vi.spyOn(globalThis, 'getComputedStyle');
    const base = spy.mock.calls.length;

    const a = r.resolve('700', 'font-weight');
    const b = r.resolve('700', 'font-weight');
    expect(a).toBe(b); // stable
    // Second call served from the cache — getComputedStyle ran once for the pair.
    expect(spy.mock.calls.length - base).toBe(1);

    r.resolve('700', 'font-weight'); // still cached
    expect(spy.mock.calls.length - base).toBe(1);

    // A colour resolve (prop defaults to 'color') is a distinct cache key.
    r.resolve('700', 'color');
    expect(spy.mock.calls.length - base).toBe(2);

    spy.mockRestore();
    r.destroy();
    host.remove();
  });
});
