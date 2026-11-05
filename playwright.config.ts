import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

const fileUrl = pathToFileURL(resolve('dist/garage.html')).href;
const httpUrl = 'http://localhost:4173/garage.html';

/** E2E always runs against the built single file: run `npm run build` first. */
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { trace: 'retain-on-failure' },
  webServer: {
    command: 'npm run preview',
    url: httpUrl,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: 'chromium-file',
      use: { ...devices['Desktop Chrome'] },
      metadata: { appUrl: fileUrl },
    },
    {
      name: 'firefox-file',
      use: { ...devices['Desktop Firefox'] },
      metadata: { appUrl: fileUrl },
    },
    {
      name: 'chromium-http',
      use: { ...devices['Desktop Chrome'] },
      metadata: { appUrl: httpUrl },
    },
    {
      name: 'mobile-android',
      use: { ...devices['Pixel 7'] },
      metadata: { appUrl: httpUrl },
    },
    {
      name: 'mobile-ios',
      use: { ...devices['iPhone 15'] },
      metadata: { appUrl: httpUrl },
    },
  ],
});
