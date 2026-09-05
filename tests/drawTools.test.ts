import { describe, it, expect } from 'vitest';
import { DRAW_TOOLS } from '../src/controls/drawTools';

// Shape guard for the drawing-tool catalog — the only tool-selection surface now
// that the Draw dropdown is gone. The type-level exhaustiveness assertion in
// drawTools.ts covers "nothing missing"; this covers "nothing doubled or blank"
// and locks the cursor-first order the palette renders in.
describe('draw tool catalog', () => {
  it('lists cursor first', () => {
    expect(DRAW_TOOLS[0].tool).toBe('cursor');
  });

  it('has no duplicate tools', () => {
    const tools = DRAW_TOOLS.map((t) => t.tool);
    expect(new Set(tools).size).toBe(tools.length);
  });

  it('gives every entry a non-empty label and an Icon', () => {
    for (const entry of DRAW_TOOLS) {
      expect(entry.label.trim().length).toBeGreaterThan(0);
      expect(entry.Icon).toBeTruthy();
    }
  });
});
