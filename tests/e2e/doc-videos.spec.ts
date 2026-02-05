// @ts-nocheck
import { test, expect } from '@playwright/test';

/**
 * Documentation Video Generation Tests
 *
 * These tests generate WebM videos for documentation purposes.
 * Videos are saved to test-results/ and can be moved to docs/videos/
 *
 * Run with: bun run test:e2e --project=doc-videos
 */

test.beforeEach(async ({ page }) => {
  // Clear localStorage for fresh state
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
  });
});

test.describe('Documentation Videos', () => {
  test('test-basic', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
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
    await page.waitForTimeout(2000);
    await page.keyboard.press('Meta+k');
    // Wait a bit for the command palette to appear (non-blocking)
    await page.waitForTimeout(1500);
  });

  test('bulk-operations', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await page.keyboard.press('Meta+b');
    // Wait a bit for bulk operations panel to appear (non-blocking)
    await page.waitForTimeout(1500);
  });

  test('keyboard-shortcuts', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await page.keyboard.press('?');
    // Wait a bit for shortcuts dialog to appear (non-blocking)
    await page.waitForTimeout(2000);
  });

  test('character-network', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    // Try to find and click visualizations button with timeout
    try {
      const vizButton = page.getByRole('button', { name: /visualizations/i });
      await vizButton.click({ timeout: 10000 });
      await page.waitForTimeout(2000);
    } catch {
      // If button not found, just wait - video still captures the page
      await page.waitForTimeout(3000);
    }
  });

  test('annotation-workflow', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    // Try to find a passage to click
    try {
      const passage = page.locator('[id^="passage-"]').first();
      await passage.click({ timeout: 10000 });
      await page.waitForTimeout(500);
      await page.keyboard.press('1');
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
    await page.waitForTimeout(2000);
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
