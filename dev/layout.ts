// Reproduce user one's real chart aspect ratio so the harness chart box equals
// what they see in the trading app at any window width. Every constant below is
// sourced from the trading app; the numbers are pixels of desktop chrome.
//
// Source of truth for the split: user one's persisted `chartHeightFlex = 58.221`
// (%), row (user_id=1, key='chartHeightFlex') in
// trading_app/volumes/data/db/user_state.db.
export const CHART_HEIGHT_FLEX = 0.58221; // user one's split share

// Horizontal chrome to the LEFT/RIGHT of the chart column (→ chart WIDTH = 100vw − this):
//   16 + 16  .appShell L/R padding (space-4 each)   — App.module.css:8-10
//   + 260    sidebar column (minmax 220–260, pinned to 260 at desktop)
//   + 16     bodyGrid gap (space-4)
export const HORIZONTAL_CHROME = 16 + 16 + 260 + 16; // = 308px

// Vertical chrome ABOVE/BELOW the chart box (→ chart HEIGHT = flex × (100vh − this)):
//   8 + 16   .appShell pad (space-2 top + space-4 bottom) — App.module.css:8-10
//   + 46     toolbar row min-height                        — DesktopBody.tsx:45-58
//   + 12     center gap (space-3)
//   + 14     panel separator (centerSeparator, flush)
// The status pills sit INSIDE the 46px toolbar row, so they add nothing vertical.
export const VERTICAL_CHROME = 8 + 16 + 46 + 12 + 14; // = 96px

// The chart box's definite CSS size. It MUST carry a definite height — Chart
// measures its container and draws nothing while an axis measures 0
// (src/chartSizing.ts, draw:false). `100vh` (not `100dvh`) is correct: this is a
// desktop-only harness in a normal window, where the two are identical and `vh`
// is what the trading app's own desktop layout resolves to.
export const CHART_BOX_WIDTH = `calc(100vw - ${HORIZONTAL_CHROME}px)`;
export const CHART_BOX_HEIGHT = `calc(${CHART_HEIGHT_FLEX} * (100vh - ${VERTICAL_CHROME}px))`;
