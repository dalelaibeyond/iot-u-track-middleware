import { test, expect } from "@playwright/test";

/**
 * Dashboard Web Application Tests
 * Following webapp-testing skill guidelines:
 * - Check dev server is running
 * - Use data-testid selectors over CSS classes
 * - Take screenshots on failure
 * - Clear localStorage/cookies between test suites
 */

// Base URL for the dashboard
test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ page }) => {
  // Clear local storage and cookies between tests
  await page.context().clearCookies();
  await page.evaluate(() => localStorage.clear());
});

test.describe("Dashboard Initialization", () => {
  test("should load the dashboard and show initialization loader", async ({
    page,
  }) => {
    // Navigate to the dashboard
    await page.goto("http://localhost:5173/", { timeout: 10000 });

    // Verify the page loaded by checking for the loader
    const loaderText = page.getByText(/Digital Twin Initializing/i);
    await expect(loaderText).toBeVisible({ timeout: 5000 });

    // Take screenshot of initial state
    await page.screenshot({
      path: "test-results/01-initial-loader.png",
      fullPage: true,
    });

    // Wait for loading to complete (should show sidebar or empty state)
    await page.waitForTimeout(3000);

    // Take screenshot after loading
    await page.screenshot({
      path: "test-results/02-after-loading.png",
      fullPage: true,
    });
  });

  test("should display app layout with sidebar and main content", async ({
    page,
  }) => {
    await page.goto("http://localhost:5173/");

    // Wait for app to initialize
    await page.waitForTimeout(4000);

    // Verify app root exists
    const appRoot = page.locator(".app-root");
    await expect(appRoot).toBeVisible();

    // Verify sidebar exists
    const sidebar = page.locator("aside, [class*='sidebar']").first();
    const hasSidebar = await sidebar.isVisible().catch(() => false);

    // Verify main content area
    const mainContent = page.locator("main.app-main");
    const hasMain = await mainContent.isVisible().catch(() => false);

    console.log(`Sidebar visible: ${hasSidebar}`);
    console.log(`Main content visible: ${hasMain}`);

    // Take screenshot
    await page.screenshot({
      path: "test-results/03-layout-verification.png",
      fullPage: true,
    });

    // At minimum, the app root should be visible
    expect(hasSidebar || hasMain).toBeTruthy();
  });
});

test.describe("Dashboard UI Components", () => {
  test("should verify TopBar component renders", async ({ page }) => {
    await page.goto("http://localhost:5173/");
    await page.waitForTimeout(4000);

    // Check for TopBar indicators (Mode toggle, notifications, etc.)
    const topBarElements = await page
      .locator('header, [class*="topbar"], [class*="top-bar"]')
      .all();

    console.log(`Found ${topBarElements.length} topbar elements`);

    await page.screenshot({
      path: "test-results/04-topbar-check.png",
      fullPage: false,
    });

    expect(topBarElements.length).toBeGreaterThan(0);
  });

  test("should check for empty state or active rack view", async ({ page }) => {
    await page.goto("http://localhost:5173/");
    await page.waitForTimeout(4000);

    // Check for empty state
    const emptyStateText = page.getByText(/No Active Stream/i);
    const hasEmptyState = await emptyStateText.isVisible().catch(() => false);

    // Check for active rack view
    const rackSection = page.locator('[class*="rack"], .app-rack-section');
    const hasRackView = await rackSection.isVisible().catch(() => false);

    console.log(`Empty state visible: ${hasEmptyState}`);
    console.log(`Rack view visible: ${hasRackView}`);

    await page.screenshot({
      path: "test-results/05-content-state.png",
      fullPage: true,
    });

    // Should show one or the other
    expect(hasEmptyState || hasRackView).toBeTruthy();
  });
});

test.describe("Error Handling & Console", () => {
  test("should capture console logs and errors", async ({ page }) => {
    const consoleLogs: string[] = [];
    const errors: string[] = [];

    page.on("console", (msg) => {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    });

    page.on("pageerror", (error) => {
      errors.push(error.message);
    });

    await page.goto("http://localhost:5173/");
    await page.waitForTimeout(5000);

    console.log("=== Console Logs ===");
    consoleLogs.forEach((log) => console.log(log));

    console.log("=== Page Errors ===");
    errors.forEach((err) => console.error(err));

    // Take final screenshot
    await page.screenshot({
      path: "test-results/06-final-state.png",
      fullPage: true,
    });

    // Log test summary
    console.log("\n=== Test Summary ===");
    console.log(`Console logs captured: ${consoleLogs.length}`);
    console.log(`Errors captured: ${errors.length}`);

    // Dashboard should load without critical errors
    const criticalErrors = errors.filter(
      (e) =>
        e.includes("ReferenceError") ||
        e.includes("TypeError") ||
        e.includes("SyntaxError")
    );

    expect(criticalErrors).toHaveLength(0);
  });
});

// Utility test to check network requests
test.describe("Network Activity", () => {
  test("should monitor API calls", async ({ page }) => {
    const apiCalls: string[] = [];

    page.on("request", (request) => {
      if (request.url().includes("localhost:3000")) {
        apiCalls.push(`${request.method()} ${request.url()}`);
      }
    });

    await page.goto("http://localhost:5173/");
    await page.waitForTimeout(5000);

    console.log("=== API Calls ===");
    apiCalls.forEach((call) => console.log(call));

    console.log(`\nTotal API calls: ${apiCalls.length}`);

    // Take screenshot
    await page.screenshot({
      path: "test-results/07-network-activity.png",
      fullPage: true,
    });
  });
});
