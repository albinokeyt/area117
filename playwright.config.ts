import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e', workers: 1, timeout: 90000,
  use: { baseURL: 'http://127.0.0.1:3107', headless: true },
  webServer: { command: 'node tests/start-server.mjs', url: 'http://127.0.0.1:3107', timeout: 120000, reuseExistingServer: false },
});
