import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

// ---------------------------------------------------------------------------
// Layer-aware dismissal primitive. A module-level STACK of open popups (a
// "layer" each): a document-level pointerdown in the CAPTURE phase decides
// dismissal for the TOPMOST layer only, and a document-level keydown in the
// BUBBLE phase closes the topmost on Escape.
//
// Why capture for the press, bubble for the key — the two root causes this
// fixes both live on the chart surface:
//   1. The plot's pointerdown handler calls preventDefault(), which per spec
//      cancels the compat `mousedown` but NOT the pointerdown itself. Listening
//      for `pointerdown` (not `mousedown`) is what hears the press at all.
//   2. The price-axis rescale strip calls stopPropagation() on its pointerdown,
//      so a bubble-phase listener never sees it. Listening in the CAPTURE phase
//      runs before the strip can stop anything.
// Capture also runs before whatever OPENS a popup, so a layer can never be
// closed by its own opening press — which is what retires the old per-popup
// `timeStamp` open-guards.
//
// Escape stays in the BUBBLE phase on purpose: a focused input (an inline
// rename, a delete-confirm) sees Escape first and its own stopPropagation keeps
// it. An IME composition (`isComposing`) is skipped — Escape then belongs to the
// candidate window. The stack already yields topmost-only dismissal, so no
// stopPropagation is needed here and none is used.
//
// Two stacks exist in the running product — one here, one in the app — because
// the package boundary means an app layer and a chart-core layer don't know
// about each other. That matches the pre-existing per-copy behaviour and is not
// a regression.
// ---------------------------------------------------------------------------

type Layer = {
  // Content ref plus, when the trigger is a SEPARATE element (a gear button that
  // lives outside the panel), that trigger's ref too — so pressing the trigger
  // while open reads as "inside" and its own click toggles cleanly instead of
  // dismiss-then-reopen. A popup whose ref already wraps its trigger needs only
  // the one ref.
  els: RefObject<HTMLElement | null>[];
  onDismiss: () => void;
  // false ⇒ modal-ish: the pointer path ignores it entirely (Escape still
  // closes it). Default true.
  outsidePress: boolean;
};

const stack: Layer[] = [];
let attached = false;

function onPointerDownCapture(e: Event): void {
  const top = stack[stack.length - 1];
  if (!top || !top.outsidePress) return;
  const target = e.target as Node | null;
  for (const ref of top.els) {
    const el = ref.current;
    if (el && target && el.contains(target)) return; // inside the top layer
  }
  top.onDismiss();
}

function onKeyDownBubble(e: KeyboardEvent): void {
  if (e.key !== 'Escape' || e.isComposing) return;
  const top = stack[stack.length - 1];
  if (!top) return;
  top.onDismiss();
}

function attach(): void {
  if (attached) return;
  // The capture flag MUST be repeated on removeEventListener (below) or the pair
  // won't match and the listener leaks.
  document.addEventListener('pointerdown', onPointerDownCapture, true);
  document.addEventListener('keydown', onKeyDownBubble, false);
  attached = true;
}

function detach(): void {
  if (!attached || stack.length > 0) return;
  document.removeEventListener('pointerdown', onPointerDownCapture, true);
  document.removeEventListener('keydown', onKeyDownBubble, false);
  attached = false;
}

/**
 * Push a layer onto the stack; returns an unregister that pops it. The two
 * document listeners are attached while the stack is non-empty and detached when
 * it drains. Plain TS (no React) so the whole primitive is testable by
 * dispatching raw events at `document`.
 */
export function registerLayer(layer: Layer): () => void {
  stack.push(layer);
  attach();
  return () => {
    const i = stack.lastIndexOf(layer);
    if (i !== -1) stack.splice(i, 1);
    detach();
  };
}

export type DismissOptions = { outsidePress?: boolean };

/**
 * React wrapper over the core: registers a layer while `open`, popping it on
 * close. `close`, `refs` and `outsidePress` are read through a ref refreshed on
 * each render, so a parent re-rendering with a fresh `close` identity never
 * pops-and-repushes the layer (which would silently promote it to the top of the
 * stack — harmless while flat, a correctness bug once order means something).
 */
export function useDismissable(
  open: boolean,
  close: () => void,
  refs: RefObject<HTMLElement | null>[],
  opts?: DismissOptions,
): void {
  const layerRef = useRef<Layer>({
    els: refs,
    onDismiss: close,
    outsidePress: opts?.outsidePress ?? true,
  });
  // Refresh the live values in place every render — never re-register.
  layerRef.current.els = refs;
  layerRef.current.onDismiss = close;
  layerRef.current.outsidePress = opts?.outsidePress ?? true;

  useEffect(() => {
    if (!open) return;
    return registerLayer(layerRef.current);
  }, [open]);
}
