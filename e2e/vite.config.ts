import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// Dedicated fixture dev server for the Playwright gesture harness. NOT the root
// `vite.config.ts` (that one is library-mode and emits no app). Serves
// `e2e/fixture/` — a bare <Chart> over a checked-in OHLCV dataset — and is
// allowed to reach up into `src/` so the fixture imports the live source.
const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');

export default defineConfig({
  root: resolve(here, 'fixture'),
  plugins: [react()],
  server: {
    port: 5177,
    fs: { allow: [repoRoot] },
  },
});
