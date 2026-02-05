// @ts-nocheck
import { test, expect } from '@playwright/test';

/**
 * Documentation Video Generation Tests
 *
 * These tests generate WebM videos for documentation purposes.
 * Videos are saved to test-results/ and can be moved to docs/videos/
 *
 * Run with: bun run test:e2e tests/e2e/doc-videos.spec.ts
 */

// Enable video recording for all tests in this file
// Match Playwright's native recording size (800x450) to avoid scaling artifacts
test.use({
  video: 'on',
  viewport: { width: 800, height: 450 }, // Match Playwright's native size
  deviceScaleFactor: 1,
});

test.beforeEach(async ({ page }) => {
  // Clear localStorage for fresh state before page loads
  await page.addInitScript(() => {
    localStorage.clear();
  });
});

test.describe('Documentation Videos', () => {
  test('test-basic', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Load a sample to show actual content
    const loadButton = page.getByRole('button', { name: 'Load Sample' }).first();
    await loadButton.click();
    await page.waitForTimeout(3000); // Wait for document to load

    // Show navigation
    await page.keyboard.press('j');
    await page.waitForTimeout(500);
    await page.keyboard.press('k');
    await page.waitForTimeout(500);
    await page.keyboard.press('j');
    await page.waitForTimeout(2000);
  });

  test('command-palette', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Load a sample first
    const loadButton = page.getByRole('button', { name: 'Load Sample' }).first();
    await loadButton.click();
    await page.waitForTimeout(2000);

    // Open command palette
    await page.keyboard.press('Meta+k');
    await page.waitForTimeout(2000);
  });

  test('bulk-operations', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Load a sample first
    const loadButton = page.getByRole('button', { name: 'Load Sample' }).first();
    await loadButton.click();
    await page.waitForTimeout(2000);

    // Open bulk operations
    await page.keyboard.press('Meta+b');
    await page.waitForTimeout(2000);
  });

  test('keyboard-shortcuts', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Load a sample first
    const loadButton = page.getByRole('button', { name: 'Load Sample' }).first();
    await loadButton.click();
    await page.waitForTimeout(2000);

    // Show keyboard shortcuts
    await page.keyboard.press('?');
    await page.waitForTimeout(2500);
  });

  test('character-network', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Load a sample first
    const loadButton = page.getByRole('button', { name: 'Load Sample' }).first();
    await loadButton.click();
    await page.waitForTimeout(2500);

    // Try to find and click visualizations button
    try {
      const vizButton = page.getByRole('button', { name: /visualizations/i });
      await vizButton.click({ timeout: 10000 });
      await page.waitForTimeout(2500);
    } catch {
      // If button not found, just wait - video still captures the page
      await page.waitForTimeout(3000);
    }
  });

  test('annotation-workflow', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Load a sample first
    const loadButton = page.getByRole('button', { name: 'Load Sample' }).first();
    await loadButton.click();
    await page.waitForTimeout(2500);

    // Click on a passage and annotate
    try {
      const passage = page.locator('[id^="passage-"]').first();
      await passage.click({ timeout: 10000 });
      await page.waitForTimeout(500);
      await page.keyboard.press('1'); // Narrative
      await page.waitForTimeout(1000);
      await page.keyboard.press('j');
      await page.waitForTimeout(500);
      await page.keyboard.press('k');
      await page.waitForTimeout(500);
    } catch {
      // If no passage found, just show page navigation
      await page.keyboard.press('j');
      await page.waitForTimeout(500);
      await page.keyboard.press('k');
      await page.waitForTimeout(500);
    }
  });

  test('ai-assisted-session', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Load a sample first
    const loadButton = page.getByRole('button', { name: 'Load Sample' }).first();
    await loadButton.click();
    await page.waitForTimeout(2500);

    // Try to click AI Suggest button
    try {
      const aiButton = page.getByRole('button', { name: /AI Suggest/i });
      await aiButton.click({ timeout: 10000 });
      // Wait for suggestions (might not appear without API key)
      await page.waitForTimeout(3000);
    } catch {
      // If button not found, just wait - video still captures the page
      await page.waitForTimeout(3000);
    }
  });
});
