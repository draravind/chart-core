import type { ReactNode } from 'react';
import type { AppearanceOverrides } from '../appearance/types';
import { effectiveAppearance } from '../appearance/registry';
import { ColorField, NumberField, SliderField } from './SettingsFields';

// Shared appearance-editing vocabulary: the sparse-delta path helpers plus the
// row builders they feed. Extracted from SettingsDialog so the gear dialog and
// the focused Candles popup render the SAME rows from one definition — two
// implementations of "up colour" is how the two surfaces drift apart.

export type Path = string[];

export function getAt(obj: unknown, path: Path): unknown {
  let cur: unknown = obj;
  for (const k of path) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[k];
  }
  return cur;
}

export function setIn(
  obj: AppearanceOverrides,
  path: Path,
  value: unknown,
): AppearanceOverrides {
  const [head, ...rest] = path;
  const src = { ...((obj ?? {}) as Record<string, unknown>) };
  if (rest.length === 0) {
    src[head] = value;
  } else {
    src[head] = setIn(src[head] as AppearanceOverrides, rest, value);
  }
  return src as AppearanceOverrides;
}

// Immutably delete a path, pruning now-empty ancestor objects so the persisted
// delta stays minimal (and `effectiveAppearance` falls back to the default).
export function deleteIn(
  obj: AppearanceOverrides,
  path: Path,
): AppearanceOverrides {
  const [head, ...rest] = path;
  const src = { ...((obj ?? {}) as Record<string, unknown>) };
  if (rest.length === 0) {
    delete src[head];
  } else {
    const child = src[head];
    if (child && typeof child === 'object') {
      const next = deleteIn(child as AppearanceOverrides, rest) as Record<
        string,
        unknown
      >;
      if (Object.keys(next).length === 0) delete src[head];
      else src[head] = next;
    }
  }
  return src as AppearanceOverrides;
}

/** Everything a row builder needs, derived once per surface. */
export type AppearanceRowCtx = {
  appearance: AppearanceOverrides;
  onAppearanceChange: (next: AppearanceOverrides) => void;
  resolveColor: (expr: string) => string;
};

export function makeAppearanceRows(ctx: AppearanceRowCtx) {
  const { appearance, onAppearanceChange, resolveColor } = ctx;
  const eff = effectiveAppearance(appearance);
  const commit = (path: Path, value: unknown) =>
    onAppearanceChange(setIn(appearance, path, value));
  const reset = (path: Path) => onAppearanceChange(deleteIn(appearance, path));

  // A color that lives in the injected CSS-var map: when unset, show the themed
  // `var(--key)` so the swatch matches the live chart.
  const colorVarRow = (key: string, label: string) => {
    const override = appearance.colors?.[key];
    return (
      <ColorField
        key={key}
        label={label}
        colorExpr={override ?? `var(--${key})`}
        isOverridden={override !== undefined}
        resolveColor={resolveColor}
        onCommit={(hex) => commit(['colors', key], hex)}
        onReset={() => reset(['colors', key])}
      />
    );
  };

  // A concrete color scalar (background/crosshair/pattern colors).
  const colorRow = (path: Path, label: string) => (
    <ColorField
      key={path.join('.')}
      label={label}
      colorExpr={String(getAt(eff, path))}
      isOverridden={getAt(appearance, path) !== undefined}
      resolveColor={resolveColor}
      onCommit={(hex) => commit(path, hex)}
      onReset={() => reset(path)}
    />
  );

  const numberRow = (
    path: Path,
    label: string,
    opts: { min?: number; max?: number; step?: number } = {},
  ) => {
    const value = Number(getAt(eff, path));
    return (
      <NumberField
        key={path.join('.')}
        spec={{
          key: path.join('.'),
          label,
          kind: 'number',
          default: value,
          ...opts,
        }}
        value={value}
        onCommit={(v) => commit(path, v)}
      />
    );
  };

  const sliderRow = (path: Path, label: string) => (
    <SliderField
      key={path.join('.')}
      label={label}
      value={Number(getAt(eff, path))}
      onCommit={(v) => commit(path, v)}
    />
  );

  return { eff, commit, reset, colorVarRow, colorRow, numberRow, sliderRow };
}

/**
 * The candle rows, defined ONCE and rendered by both the gear dialog's Candles
 * section and the focused Candles popup.
 *
 * The two colors are the CANDLE-SPECIFIC `--candle-up` / `--candle-down` tokens
 * (which default to `var(--chart-positive)` / `var(--chart-negative)`), NOT the
 * chart-wide pair: those also drive the OHLC readout, Volume's default bars, the
 * `--qr-growth-*` aliases and the ruler, and silently recolouring all of them
 * from a popup titled "Candles" is exactly the surprise its framing invites.
 */
export function CandleRows(ctx: AppearanceRowCtx): ReactNode {
  const { colorVarRow, sliderRow } = makeAppearanceRows(ctx);
  return (
    <>
      {colorVarRow('candle-up', 'Up color')}
      {colorVarRow('candle-down', 'Down color')}
      {sliderRow(['candle', 'opacity'], 'Opacity')}
    </>
  );
}
