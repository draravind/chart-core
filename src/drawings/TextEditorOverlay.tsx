import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import type { ChartScaleApi } from '../types';
import { useDismissable } from '../controls/useDismissable';
import { effectiveDrawingStyle } from './defaults';
import { projectAnchor, type ProjScale } from './projection';
import { TEXT_PAD_X, TEXT_PAD_Y, textSeedWidth } from './textLayout';
import type { TextDrawing } from './types';

// On-canvas text editor: a positioned HTML <textarea> (SVG has no caret/IME)
// glued to its anchor bar. It auto-grows BOTH axes to its content (`white-space:
// pre`, no wrapping) so what you type matches the SVG box the renderer draws once
// committed — width from the widest line, height from the newline count.
// Enter, a press anywhere outside the editor, or blur each commits one write per
// edit (the live preview is the editor itself); Escape on an empty box deletes
// the shape. A committed-once guard keeps those paths from double-writing.
//
// It stays glued through pan/zoom via `scaleApi.subscribe` — never a layout
// effect keyed on `scaleApi`, which is a single stable object mutated in place
// (such an effect fires once, and a pan never re-renders React). This is the
// same seam the app's overlay plugins use.

// Editor and renderer share the same padding so their boxes cannot drift apart.
const PAD_X = TEXT_PAD_X;
const PAD_Y = TEXT_PAD_Y;

type Props = {
  shape: TextDrawing;
  scaleApi: ChartScaleApi;
  buildProjScale: () => ProjScale;
  marginLeft: number;
  marginTop: number;
  resolveColor: (expr: string) => string;
  // Persist the edited text (replace-by-id) and close the editor.
  onCommit: (text: string) => void;
  // Escape / blur on an empty box: delete the shape and close.
  onDeleteEmpty: () => void;
};

export default function TextEditorOverlay({
  shape,
  scaleApi,
  buildProjScale,
  marginLeft,
  marginTop,
  resolveColor,
  onCommit,
  onDeleteEmpty,
}: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const areaRef = useRef<HTMLTextAreaElement | null>(null);
  const eff = effectiveDrawingStyle(shape.style);
  const [value, setValue] = useState(shape.style?.text ?? '');

  // Screen position of the anchor (top-left of the box), panned-local + pan
  // offset + margins. Written straight onto the node so a pan (no React
  // re-render) still moves it.
  const reposition = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const p = projectAnchor(shape.a, buildProjScale());
    el.style.left = `${marginLeft + scaleApi.baseTranslateX + p.x}px`;
    el.style.top = `${marginTop + p.y}px`;
  }, [shape.a, scaleApi, buildProjScale, marginLeft, marginTop]);

  // Auto-grow BOTH axes to the content: zero each axis, then read the content
  // extent back off the real element. `scrollWidth`/`scrollHeight` measure the
  // textarea's own font, so they can't drift from it the way a mirror node would.
  // Width never falls below the seed so an empty box stays grabbable.
  const autoGrow = useCallback(() => {
    const ta = areaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${ta.scrollHeight}px`;
    ta.style.width = '0px';
    ta.style.width = `${Math.max(ta.scrollWidth, textSeedWidth(eff.fontSize) + 2 * PAD_X)}px`;
  }, [eff.fontSize]);

  useLayoutEffect(() => {
    reposition();
    autoGrow();
    const ta = areaRef.current;
    if (ta) {
      ta.focus();
      const n = ta.value.length;
      ta.setSelectionRange(n, n);
    }
    // Only on mount / shape change — the subscribe below handles pan/zoom.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shape.id]);

  // Stay glued through pan/zoom.
  useEffect(() => {
    const off = scaleApi.subscribe(() => reposition());
    return off;
  }, [scaleApi, reposition]);

  // One-shot: blur, Enter/Escape, and an outside press can all fire together
  // (Enter's preventDefault stops blur, but a real chart click never blurs —
  // the plot's pointerdown preventDefault suppresses the focus change — so the
  // outside-press path below is the only one that hears a click on the chart).
  const committedRef = useRef(false);
  const commit = () => {
    if (committedRef.current) return;
    committedRef.current = true;
    if (value.trim() === '') onDeleteEmpty();
    else onCommit(value);
  };

  // Commit when the press lands outside the editor. The shared layer stack hears
  // the press in the CAPTURE phase, before the plot's own pointerdown handler —
  // the only way to catch a click on a surface that cancels the compat mouse
  // events (see useDismissable's header). `commit` is idempotent, so the Escape
  // this hook also handles simply no-ops after the keydown path already ran.
  useDismissable(true, commit, [wrapRef]);

  return (
    <div
      ref={wrapRef}
      style={{ position: 'absolute', left: 0, top: 0, zIndex: 4 }}
      data-chart-wheel-scroll
      data-chart-native-menu
      data-chart-texteditor
    >
      <textarea
        ref={areaRef}
        value={value}
        spellCheck={false}
        autoComplete="off"
        wrap="off"
        onChange={(e) => {
          setValue(e.target.value);
          autoGrow();
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          // Enter commits; Shift+Enter inserts a newline (kept in the text and
          // rendered as its own line). Escape commits, or deletes an empty box.
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            commit();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            commit();
          }
        }}
        style={{
          boxSizing: 'border-box',
          padding: `${PAD_Y}px ${PAD_X}px`,
          resize: 'none',
          overflow: 'hidden',
          whiteSpace: 'pre',
          border: `1px solid ${resolveColor(eff.color)}`,
          borderRadius: 3,
          outline: 'none',
          margin: 0,
          fontSize: eff.fontSize,
          lineHeight: 1.35,
          fontFamily: 'var(--font-family-base)',
          color: resolveColor(eff.color),
          background: resolveColor(eff.bgColor),
        }}
      />
    </div>
  );
}
