import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  expect: { timeout: 15000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  outputDir: 'test-results',
  use: { browserName: 'chromium', screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  projects: [
    { name: 'mock-desktop', use: { baseURL: 'http://127.0.0.1:3100', viewport: { width: 1440, height: 1080 } } },
    { name: 'mock-mobile', use: { baseURL: 'http://127.0.0.1:3100', viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true } },
    { name: 'api-desktop', use: { baseURL: 'http://127.0.0.1:3101', viewport: { width: 1440, height: 1080 } } },
    { name: 'api-mobile', use: { baseURL: 'http://127.0.0.1:3101', viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true } },
  ],
  webServer: [
    { command: 'node scripts/smoke-server.mjs api', url: 'http://127.0.0.1:3102/api/health', timeout: 60000, reuseExistingServer: false },
    { command: 'node scripts/smoke-server.mjs mock', url: 'http://127.0.0.1:3100', timeout: 120000, reuseExistingServer: false },
    { command: 'node scripts/smoke-server.mjs web-api', url: 'http://127.0.0.1:3101', timeout: 120000, reuseExistingServer: false },
  ],
});
