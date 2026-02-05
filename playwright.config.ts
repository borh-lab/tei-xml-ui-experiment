// @ts-nocheck
import { defineConfig, devices } from '@playwright/test';

/**
 * See https://playwright.dev/docs/test-configuration.
 * @see https://playwright.dev/docs/api/class-testconfig.
 */
export default defineConfig({
  testDir: './tests/e2e',
  /* Maximum time one test can run */
  timeout: 60 * 1000,
  expect: {
    /* Maximum time expect() should wait for the condition to be met. */
    timeout: 5000,
  },
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/reporter */
  reporter: [
    ['html'],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  /* Shared settings for all tests. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Screenshot configuration */
    screenshot: 'only-on-failure',
  },

  /* Configure projects - Chromium only (matches Nix setup) */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'doc-videos',
      testMatch: '**/doc-videos.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        video: 'on', // Always record videos for doc generation
      },
      // Use a different port to avoid conflicts
      webServer: {
        command: 'npm run dev',
        url: 'http://localhost:3001',
        port: 3001,
        reuseExistingServer: false, // Always start fresh
        timeout: 120 * 1000,
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true, // Always reuse if server is running
    timeout: 120 * 1000,
  },
});
