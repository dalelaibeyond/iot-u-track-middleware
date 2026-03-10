import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for dashboard testing
 * Following webapp-testing skill:
 * - Tests run against local dev server on port 5173
 * - Screenshots captured on failure
 * - Traces collected for debugging
 */

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false, // Run serially to avoid state conflicts
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker for serial tests
  reporter: "html",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: true, // Use already running server
    timeout: 120000,
  },
});
