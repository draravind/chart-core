// Pure multi-pointer reducer. Owns the "how many fingers are down, and what does
// this move mean" decision so the Chart's document handler stays a thin dispatch
// and the logic is testable in node (no DOM). The map is the whole state: one
// entry per live pointer, keyed by `pointerId`, holding its last client (x, y).
// The reducer MUTATES the map in place (add on down, update on move, remove on
// up/cancel) and returns what the gesture layer should do this frame.
//
// Mode is decided purely by how many pointers survive the event: 0 → idle,
// 1 → pan, ≥2 → pinch. A move on the single pointer reports its raw travel
// (`panDx`/`panDy`); a move on either of the first two pointers reports the
// pinch ratio (new spread ÷ old spread). Distance always uses the first two
// pointers in insertion order, so a stray third finger changes nothing.
export type PointerId = number;
export type PointerPos = { x: number; y: number };
export type PointerMap = Map<PointerId, PointerPos>;

export type PointerEv = {
  type: 'down' | 'move' | 'up' | 'cancel';
  pointerId: PointerId;
  x: number;
  y: number;
};

export type PointerResult = {
  mode: 'idle' | 'pan' | 'pinch';
  panDx?: number;
  panDy?: number;
  zoomRatio?: number;
};

const modeOf = (n: number): PointerResult['mode'] =>
  n === 0 ? 'idle' : n === 1 ? 'pan' : 'pinch';

// Spread between the FIRST TWO live pointers (insertion order). 0 for <2 — a
// zero spread is also the signal that a ratio can't be formed this frame.
export function pointerDistance(map: PointerMap): number {
  const it = map.values();
  const a = it.next().value as PointerPos | undefined;
  const b = it.next().value as PointerPos | undefined;
  if (!a || !b) return 0;
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function reducePointers(
  prev: PointerMap,
  ev: PointerEv,
): PointerResult {
  if (ev.type === 'down') {
    prev.set(ev.pointerId, { x: ev.x, y: ev.y });
    return { mode: modeOf(prev.size) };
  }
  if (ev.type === 'up' || ev.type === 'cancel') {
    prev.delete(ev.pointerId);
    return { mode: modeOf(prev.size) };
  }
  // move — an unseen pointer (never pressed on the plot) is ignored.
  const cur = prev.get(ev.pointerId);
  if (!cur) return { mode: modeOf(prev.size) };

  if (prev.size === 1) {
    const panDx = ev.x - cur.x;
    const panDy = ev.y - cur.y;
    cur.x = ev.x;
    cur.y = ev.y;
    return { mode: 'pan', panDx, panDy };
  }

  // Two or more: pinch. Measure the first-two spread before and after moving
  // this pointer. A move on a third finger leaves the spread unchanged (ratio
  // 1); a zero prior spread can't form a ratio, so none is reported.
  const prevDist = pointerDistance(prev);
  cur.x = ev.x;
  cur.y = ev.y;
  const currDist = pointerDistance(prev);
  const res: PointerResult = { mode: 'pinch' };
  if (prevDist > 0) res.zoomRatio = currDist / prevDist;
  return res;
}
