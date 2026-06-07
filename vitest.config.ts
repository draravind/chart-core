import { defineConfig } from 'vitest/config';

// Compute functions are pure TS (no DOM), so the node environment is enough.
// Tests live outside `src/` so the library's `tsc`/dts build never sees them.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
