// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RefObject } from 'react';
import { registerLayer } from '../src/controls/useDismissable';

// Exercises the plain-TS core of the dismissal primitive by dispatching raw
// events at `document` — no React, no testing-library (chart-core ships neither).
// happy-dom is enabled per-file by the annotation above; the node default the
// rest of the suite runs under is untouched.
//
// happy-dom has no PointerEvent, so a press is a MouseEvent named 'pointerdown';
// the handler only reads `target`, so the class doesn't matter.

const cleanups: Array<() => void> = [];

function ref(el: HTMLElement | null): RefObject<HTMLElement | null> {
  return { current: el };
}

function el(): HTMLElement {
  const node = document.createElement('div');
  document.body.appendChild(node);
  return node;
}

function open(
  els: RefObject<HTMLElement | null>[],
  onDismiss: () => void,
  outsidePress = true,
) {
  const layer = { els, onDismiss, outsidePress };
  const unregister = registerLayer(layer);
  cleanups.push(unregister);
  return { layer, unregister };
}

function press(target: EventTarget): void {
  target.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
}

function escape(target: EventTarget = document, isComposing = false): void {
  const ev = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
  if (isComposing) Object.defineProperty(ev, 'isComposing', { value: true });
  target.dispatchEvent(ev);
}

afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
  document.body.innerHTML = '';
});

describe('dismissal layer stack', () => {
  it('1. an outside press closes the layer once', () => {
    const panel = el();
    const outside = el();
    const close = vi.fn();
    open([ref(panel)], close);
    press(outside);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('2. a press inside the layer is ignored', () => {
    const panel = el();
    const child = document.createElement('span');
    panel.appendChild(child);
    const close = vi.fn();
    open([ref(panel)], close);
    press(child);
    expect(close).not.toHaveBeenCalled();
  });

  it('3. Escape closes the layer', () => {
    const close = vi.fn();
    open([ref(el())], close);
    escape();
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('4. a target that stopPropagations the press is still caught (capture beats it)', () => {
    // Mirrors the price-axis strip (Chart.tsx:3311): its own pointerdown listener
    // calls stopPropagation, but the document CAPTURE listener already ran.
    const outside = el();
    outside.addEventListener('pointerdown', (e) => e.stopPropagation());
    const close = vi.fn();
    open([ref(el())], close);
    press(outside);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('5. a layer that never opened does not dismiss', () => {
    // The React `open=false` case: nothing registered, so an outside press and
    // Escape do nothing.
    const close = vi.fn();
    press(el());
    escape();
    expect(close).not.toHaveBeenCalled();
  });

  it('6. a separate trigger ref is treated as inside (the gear-reopen guard)', () => {
    const panel = el();
    const trigger = el(); // a gear button living outside the panel
    const close = vi.fn();
    open([ref(panel), ref(trigger)], close);
    press(trigger);
    expect(close).not.toHaveBeenCalled();
  });

  it('7. a nullish ref is skipped and an outside press still closes', () => {
    const panel = el();
    const outside = el();
    const close = vi.fn();
    open([ref(null), ref(panel)], close);
    expect(() => press(outside)).not.toThrow();
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('8. after unregister, neither a press nor Escape fires (cleanup / capture-flag match)', () => {
    const outside = el();
    const close = vi.fn();
    const { unregister } = open([ref(el())], close);
    unregister();
    press(outside);
    escape();
    expect(close).not.toHaveBeenCalled();
  });

  it('10. with two layers open, an outside press closes only the top', () => {
    const outside = el();
    const closeA = vi.fn();
    const closeB = vi.fn();
    open([ref(el())], closeA);
    const b = open([ref(el())], closeB);
    press(outside);
    expect(closeB).toHaveBeenCalledTimes(1);
    expect(closeA).not.toHaveBeenCalled();
    // Closing the top pops it; the next press reaches the one beneath.
    b.unregister();
    press(outside);
    expect(closeA).toHaveBeenCalledTimes(1);
  });

  it('11. with two layers open, Escape closes only the top', () => {
    const closeA = vi.fn();
    const closeB = vi.fn();
    open([ref(el())], closeA);
    open([ref(el())], closeB);
    escape();
    expect(closeB).toHaveBeenCalledTimes(1);
    expect(closeA).not.toHaveBeenCalled();
  });

  it('12. an inner input that stopPropagations Escape keeps the layer open', () => {
    // Mirrors an inline rename input (SourceSelector.tsx:285): its own keydown
    // handler stops the Escape before it bubbles to the document listener.
    const input = el();
    input.addEventListener('keydown', (e) => e.stopPropagation());
    const close = vi.fn();
    open([ref(el())], close);
    escape(input);
    expect(close).not.toHaveBeenCalled();
  });

  it('13. Escape during an IME composition is ignored', () => {
    const close = vi.fn();
    open([ref(el())], close);
    escape(document, true);
    expect(close).not.toHaveBeenCalled();
  });

  it('14. mutating onDismiss in place runs the newest callback and keeps stack order', () => {
    // The register-on-open-only rule: the layer's fields are refreshed in place
    // each render, never re-registered — so it keeps its position and the latest
    // callback runs.
    const outside = el();
    const closeA = vi.fn();
    const staleB = vi.fn();
    const freshB = vi.fn();
    open([ref(el())], closeA);
    const b = open([ref(el())], staleB);
    b.layer.onDismiss = freshB; // what the wrapper does on re-render
    press(outside);
    expect(freshB).toHaveBeenCalledTimes(1);
    expect(staleB).not.toHaveBeenCalled();
    expect(closeA).not.toHaveBeenCalled(); // B kept the top, not promoted A
  });

  // Case 6 above is chart-core specific (a): a press on a SEPARATE trigger ref
  // while open does not dismiss — the gear-reopen guard. Case (b) below is the
  // second chart-core specific. outsidePress:false is exercised app-side (no
  // chart-core layer uses it).

  it('(b). a press dispatched while the stack is empty cannot self-close the next layer', () => {
    // The DrawingStylePopup self-close guard, now structural: the opening press
    // dispatches before the layer registers (capture runs before React mounts
    // it), so it never reaches the layer.
    const outside = el();
    const close = vi.fn();
    press(outside); // stack empty — handler returns early
    open([ref(el())], close); // registers in the same task
    expect(close).not.toHaveBeenCalled();
  });
});
