import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './apps/municipality/e2e',
  fullyParallel: true,
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:3001',
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
    },
  },
  webServer: {
    command: 'pnpm start',
    url: 'http://127.0.0.1:3001',
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
