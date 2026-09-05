import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// Standalone dev harness for chart-core: `pnpm dev` boots this and imports
// straight from `src/` for instant HMR on any source edit. Modelled on
// `e2e/vite.config.ts` (the fixture server) but a SEPARATE app on a different
// port so both can run at once, and it deliberately serves browsing chrome the
// Playwright behaviour-lock fixture must not grow. Reaches up into `src/` so the
// harness imports the live source.
const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');

export default defineConfig({
  root: here,
  plugins: [react()],
  server: {
    port: 5180,
    fs: { allow: [repoRoot] },
  },
});
