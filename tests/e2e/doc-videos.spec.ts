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
  viewport: { width: 800, height: 450 },
  deviceScaleFactor: 1,
});

/**
 * Helper function to load a sample document
 * Handles both SampleGallery and direct navigation scenarios
 */
async function loadSample(page: Page): Promise<void> {
  // Capture console errors
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  try {
    await page.goto('/', { timeout: 30000, waitUntil: 'domcontentloaded' });
  } catch (error) {
    console.error('Navigation failed:', error);
    console.error('Console errors:', errors);
    throw error;
  }

  // Check if we're on the welcome screen
  const hasWelcome = await page.getByText('Welcome to TEI Dialogue Editor').isVisible().catch(() => false);

  if (hasWelcome) {
    // Find and click Load Sample button
    const loadButton = page.getByRole('button', { name: 'Load Sample' }).first();
    await loadButton.click();

    // Wait for document to load
    await page.waitForSelector('[id^="passage-"]', { timeout: 10000 });
    await page.waitForTimeout(1500);
  }
}

test.describe('Documentation Videos', () => {
  test('test-basic', async ({ page }) => {
    await loadSample(page);

    // Show navigation
    await page.keyboard.press('j');
    await page.waitForTimeout(500);
    await page.keyboard.press('k');
    await page.waitForTimeout(500);
    await page.keyboard.press('j');
    await page.waitForTimeout(2000);
  });

  test('command-palette', async ({ page }) => {
    await loadSample(page);

    // Open command palette
    await page.keyboard.press('Meta+k');
    await page.waitForTimeout(2000);
  });

  test('bulk-operations', async ({ page }) => {
    await loadSample(page);

    // Open bulk operations
    await page.keyboard.press('Meta+b');
    await page.waitForTimeout(2000);
  });

  test('keyboard-shortcuts', async ({ page }) => {
    await loadSample(page);

    // Show keyboard shortcuts
    await page.keyboard.press('?');
    await page.waitForTimeout(2500);
  });

  test('character-network', async ({ page }) => {
    await loadSample(page);

    // Try to find and click visualizations button
    try {
      const vizButton = page.getByRole('button', { name: /visualizations/i });
      await vizButton.click({ timeout: 10000 });
      await page.waitForTimeout(2000);
    } catch {
      // If button not found, just show the editor
      await page.waitForTimeout(3000);
    }
  });

  test('annotation-workflow', async ({ page }) => {
    await loadSample(page);

    // Click on first passage and annotate
    const passage = page.locator('[id^="passage-"]').first();
    await passage.click();
    await page.waitForTimeout(500);

    // Apply Narrative tag
    await page.keyboard.press('1');
    await page.waitForTimeout(1000);

    // Navigate to next passage
    await page.keyboard.press('j');
    await page.waitForTimeout(500);

    // Navigate back
    await page.keyboard.press('k');
    await page.waitForTimeout(500);

    // Show final state
    await page.waitForTimeout(1500);
  });

  test('ai-assisted-session', async ({ page }) => {
    await loadSample(page);

    // Try to click AI Suggest button
    try {
      const aiButton = page.getByRole('button', { name: /AI Suggest/i });
      await aiButton.click({ timeout: 10000 });
      // Wait for suggestions (might not appear without API key)
      await page.waitForTimeout(3000);
    } catch {
      // If button not found, just show the editor
      await page.waitForTimeout(3000);
    }
  });
});
