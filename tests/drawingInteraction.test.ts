import { describe, it, expect } from 'vitest';
import {
  reduceDrawing,
  clicksFor,
  buildDrawing,
  type DraftState,
} from '../src/drawings/interaction';
import type { DrawingShape } from '../src/drawings/types';

const A = { date: '2024-01-05', price: 100 };
const B = { date: '2024-01-10', price: 120 };
let counter = 0;
const ctx = (tool: Parameters<typeof reduceDrawing>[2]['tool']) => ({
  tool,
  makeId: () => `id-${++counter}`,
});
const idle: DraftState = { phase: 'idle' };

describe('clicksFor', () => {
  it('encodes anchors-per-tool', () => {
    expect(clicksFor('hline')).toBe(1);
    expect(clicksFor('text')).toBe(1);
    expect(clicksFor('trendline')).toBe(2);
    expect(clicksFor('ruler')).toBe(2);
  });
});

describe('reduceDrawing — placement', () => {
  it('one-click tools commit immediately and select the new shape', () => {
    const r = reduceDrawing(idle, { type: 'down', anchor: A }, ctx('hline'));
    expect(r.draft.phase).toBe('idle');
    expect(r.commit?.type).toBe('hline');
    expect(r.consumedPointer).toBe(true);
    expect(r.selectId).toBe(r.commit?.id);
  });

  it('two-click tools enter placing then commit on the second click', () => {
    const first = reduceDrawing(idle, { type: 'down', anchor: A }, ctx('trendline'));
    expect(first.draft.phase).toBe('placing');
    expect(first.commit).toBeUndefined();
    expect(first.consumedPointer).toBe(true);

    const second = reduceDrawing(
      first.draft,
      { type: 'down', anchor: B },
      ctx('trendline'),
    );
    expect(second.draft.phase).toBe('idle');
    expect(second.commit?.type).toBe('trendline');
    const tl = second.commit as Extract<DrawingShape, { type: 'trendline' }>;
    expect(tl.a).toEqual(A);
    expect(tl.b).toEqual(B);
    expect(second.consumedPointer).toBe(true);
  });

  it('escape cancels an in-flight placement (and consumes the gesture)', () => {
    const placing = reduceDrawing(idle, { type: 'down', anchor: A }, ctx('ray'));
    const esc = reduceDrawing(placing.draft, { type: 'escape' }, ctx('ray'));
    expect(esc.draft.phase).toBe('idle');
    expect(esc.consumedPointer).toBe(true);
  });
});

describe('reduceDrawing — cursor select/drag/pan', () => {
  const shape: DrawingShape = { id: 'x1', type: 'trendline', a: A, b: B };

  it('a hit in cursor mode starts a drag and selects (suppresses pan)', () => {
    const r = reduceDrawing(
      idle,
      { type: 'down', anchor: A, target: { id: 'x1', hit: { kind: 'body' }, shape } },
      ctx('cursor'),
    );
    expect(r.draft.phase).toBe('dragging');
    expect(r.selectId).toBe('x1');
    expect(r.consumedPointer).toBe(true);
  });

  it('a pure miss in cursor mode deselects and allows pan', () => {
    const r = reduceDrawing(idle, { type: 'down', anchor: A, target: null }, ctx('cursor'));
    expect(r.draft.phase).toBe('idle');
    expect(r.selectId).toBeNull();
    expect(r.consumedPointer).toBe(false);
  });

  it('mouseup while dragging commits the working copy', () => {
    const dragging: DraftState = {
      phase: 'dragging',
      id: 'x1',
      grab: { kind: 'body' },
      origin: shape,
    };
    const moved: DrawingShape = { ...shape, a: { date: A.date, price: 150 } };
    const r = reduceDrawing(dragging, { type: 'up', working: moved }, ctx('cursor'));
    expect(r.draft.phase).toBe('idle');
    expect(r.commit).toBe(moved);
    expect(r.consumedPointer).toBe(true);
  });
});

describe('buildDrawing', () => {
  it('builds each shape from its anchors', () => {
    expect(buildDrawing('hline', [{ date: 'd', price: 7 }], 'i').type).toBe('hline');
    expect((buildDrawing('hline', [{ date: 'd', price: 7 }], 'i') as { price: number }).price).toBe(7);
    expect((buildDrawing('vline', [{ date: 'd', price: 7 }], 'i') as { date: string }).date).toBe('d');
  });
});
