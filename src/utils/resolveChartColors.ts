// Canvas cannot consume CSS custom properties or `color-mix()` directly, so we
// resolve var expressions to concrete rgb strings via a probe <span> mounted
// inside the themed chart wrapper (it must inherit the app's --chart-* tokens).
// Results are cached per expression and re-resolved on mount via a new resolver.

export type ColorResolver = {
  resolve(varExpr: string): string;
  destroy(): void;
};

const FALLBACK = '#888888';

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
    resolve(varExpr: string): string {
      const cached = cache.get(varExpr);
      if (cached) return cached;
      let resolved = FALLBACK;
      try {
        probe.style.color = '';
        probe.style.color = varExpr;
        const computed = getComputedStyle(probe).color;
        if (computed) resolved = computed;
      } catch {
        resolved = FALLBACK;
      }
      cache.set(varExpr, resolved);
      return resolved;
    },
    destroy() {
      cache.clear();
      probe.remove();
    },
  };
}
