import { defineConfig, devices } from '@playwright/test';

// Gesture behavior-lock harness. One Chromium project, deterministic viewport,
// no retries (a flaky lock is not a lock). The fixture dev server is booted by
// Playwright via `e2e/vite.config.ts`.
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5177',
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: {
    command: 'pnpm exec vite --config e2e/vite.config.ts',
    url: 'http://localhost:5177',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
