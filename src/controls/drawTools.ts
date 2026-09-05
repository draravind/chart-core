import {
  Minus,
  MousePointer2,
  MoveHorizontal,
  MoveVertical,
  Ruler,
  Slash,
  TrendingUp,
  Type,
} from 'lucide-react';
import type { DrawingTool } from '../drawings/types';

// The drawing-tool catalog (cursor + every tool), in display order. Shared by the
// floating DrawToolbar (the only tool-selection surface). `satisfies` (not a
// `: DrawToolDef[]` annotation, not `as const`) keeps each row's `tool` at its
// literal value, so the exhaustiveness assertion below has a narrow union to check.
export type DrawToolDef = { tool: DrawingTool; label: string; Icon: typeof Minus };

export const DRAW_TOOLS = [
  { tool: 'cursor', label: 'Cursor', Icon: MousePointer2 },
  { tool: 'trendline', label: 'Trend line', Icon: TrendingUp },
  { tool: 'ray', label: 'Ray', Icon: Slash },
  { tool: 'hline', label: 'Horizontal line', Icon: Minus },
  { tool: 'vline', label: 'Vertical line', Icon: MoveVertical },
  { tool: 'hray', label: 'Horizontal ray', Icon: MoveHorizontal },
  { tool: 'text', label: 'Text', Icon: Type },
  { tool: 'ruler', label: 'Ruler', Icon: Ruler },
] satisfies readonly DrawToolDef[];

// A new DrawingTool that never reaches the palette is unreachable in the UI.
// `never` here ⇒ full coverage; anything else fails `pnpm typecheck`.
type Uncovered = Exclude<DrawingTool, (typeof DRAW_TOOLS)[number]['tool']>;
// The [T] tuple wrapper is required: a bare `Uncovered extends never` is a
// DISTRIBUTIVE conditional and collapses to `never` when Uncovered is never,
// which would fail on the covered case instead of the uncovered one.
const _exhaustive: [Uncovered] extends [never] ? true : Uncovered = true;
void _exhaustive;
