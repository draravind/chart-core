// Canvas cannot consume CSS custom properties or `color-mix()` directly, so we
// resolve var expressions to concrete values via a probe <span> mounted inside
// the themed chart wrapper (it must inherit the app's tokens). Results are cached
// per (property, expression) and re-resolved on mount via a new resolver.
//
// The resolver is not colour-only: passing `prop` lets it read back any resolved
// CSS property (font-weight / font-size / font-family), which is how the two
// canvas `ctx.font` strings reach the token system (see `composeCanvasFont`).

export type ColorResolver = {
  resolve(varExpr: string, prop?: string): string;
  destroy(): void;
};

// The resolver's last-resort colour when the DOM probe can't answer. A single
// literal (not a token — it is the fallback FOR the token machinery) imported
// everywhere a fallback guard was previously inlined as a bare hex.
export const FALLBACK_COLOR = '#888888';

export function createColorResolver(host: HTMLElement): ColorResolver {
  const probe = document.createElement('span');
  probe.style.position = 'absolute';
  probe.style.width = '0';
  probe.style.height = '0';
  probe.style.visibility = 'hidden';
  probe.style.pointerEvents = 'none';
  host.appendChild(probe);
  const cache = new Map<string, string>();

  return {
    resolve(varExpr: string, prop = 'color'): string {
      const key = `${prop}|${varExpr}`;
      const cached = cache.get(key);
      if (cached !== undefined) return cached;
      // A colour resolve keeps the historical #888888 last resort. A non-colour
      // resolve has no sensible colour fallback, so it returns '' and lets the
      // caller (composeCanvasFont) supply an explicit literal string instead.
      const empty = prop === 'color' ? FALLBACK_COLOR : '';
      let resolved = empty;
      try {
        probe.style.setProperty(prop, '');
        probe.style.setProperty(prop, varExpr);
        const computed = getComputedStyle(probe).getPropertyValue(prop);
        if (computed) resolved = computed;
      } catch {
        resolved = empty;
      }
      cache.set(key, resolved);
      return resolved;
    },
    destroy() {
      cache.clear();
      probe.remove();
    },
  };
}

/**
 * Compose a canvas `ctx.font` string from a weight token + a size token + the
 * shared base font family, resolving each through the probe (canvas evaluates no
 * CSS variables). `getComputedStyle` forces layout, so resolve ONCE per draw
 * pass and reuse — never per label. Returns `fallback` verbatim if any part
 * resolves empty (e.g. the probe is unmounted), so the font never becomes
 * `"undefined undefined …"`.
 */
export function composeCanvasFont(
  resolve: (expr: string, prop?: string) => string,
  weightVar: string,
  sizeVar: string,
  fallback: string,
): string {
  const weight = resolve(weightVar, 'font-weight');
  const size = resolve(sizeVar, 'font-size');
  const family = resolve('var(--font-family-base)', 'font-family');
  if (!weight || !size || !family) return fallback;
  return `${weight} ${size} ${family}`;
}
