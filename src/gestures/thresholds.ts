// Click-vs-drag threshold. A press that never travels this far is a click (it
// selects / deselects, opens nothing, pans nothing); past it the gesture
// promotes to a drag. Touch gets a larger radius because a finger tap wanders
// 5–10px where a mouse press does not. The pointerType is passed at the
// promotion site so Tier 3 switches touch on with no further edit.
const DRAG_THRESHOLD_PX = 4; // mouse / pen
const TOUCH_DRAG_THRESHOLD_PX = 10; // finger

export const dragThresholdFor = (pointerType?: string): number =>
  pointerType === 'touch' ? TOUCH_DRAG_THRESHOLD_PX : DRAG_THRESHOLD_PX;
