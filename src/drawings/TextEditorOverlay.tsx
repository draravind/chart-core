import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import type { ChartScaleApi } from '../types';
import { effectiveDrawingStyle } from './defaults';
import { projectAnchor, type ProjScale } from './projection';
import type { TextDrawing } from './types';

// On-canvas text editor: a positioned HTML <textarea> (SVG has no caret/IME)
// glued to its anchor bar. Fixed width, wraps (`pre-wrap`) and auto-grows its
// height to the content, so its wrapping tracks the SVG box the renderer draws
// once committed. Commit-on-blur / Enter routes one write per edit (the live
// preview is the editor itself); Escape on an empty box deletes the shape.
//
// It stays glued through pan/zoom via `scaleApi.subscribe` — never a layout
// effect keyed on `scaleApi`, which is a single stable object mutated in place
// (such an effect fires once, and a pan never re-renders React). This is the
// same seam the app's overlay plugins use.

const PAD_X = 6;
const PAD_Y = 4;

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

  // Auto-grow height to fit the wrapped content.
  const autoGrow = useCallback(() => {
    const ta = areaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${ta.scrollHeight}px`;
  }, []);

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

  const commit = () => {
    if (value.trim() === '') onDeleteEmpty();
    else onCommit(value);
  };

  const boxWidth = eff.boxWidth;

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
        onChange={(e) => {
          setValue(e.target.value);
          autoGrow();
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          // Enter commits; Shift+Enter inserts a newline (kept in the text and
          // preserved as a hard break by the wrap). Escape commits, or deletes
          // an empty box.
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
          width: boxWidth + 2 * PAD_X,
          padding: `${PAD_Y}px ${PAD_X}px`,
          resize: 'none',
          overflow: 'hidden',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
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
