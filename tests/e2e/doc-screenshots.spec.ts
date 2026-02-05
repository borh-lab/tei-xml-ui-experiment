// @ts-nocheck
import { test, expect } from '@playwright/test';

/**
 * Documentation Screenshot Tests
 *
 * These tests capture screenshots for documentation purposes.
 * Screenshots are saved to test-results/ and can be moved to docs/images/
 *
 * Run with: bun run test:e2e tests/e2e/doc-screenshots.spec.ts
 */

// Use viewport matching Playwright's native recording size
test.use({
  viewport: { width: 800, height: 450 },
  deviceScaleFactor: 1,
});

/**
 * Helper function to load a sample document
 */
async function loadSample(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  // Check if we need to load a document
  const hasNoDocument = await page.getByText('No document loaded').isVisible().catch(() => false);

  if (hasNoDocument) {
    // Click Load File button and upload sample
    const loadButton = page.getByRole('button', { name: 'Load File' }).first();
    await loadButton.click();

    // Wait for file input to appear and use it
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('lib/data/samples/jane-eyre-sample.xml');

    // Wait for document to load
    await page.waitForSelector('[id^="passage-"]', { timeout: 10000 });
    await page.waitForTimeout(1500);
  }
}

test.describe('Documentation Screenshots', () => {
  test('basic-editor', async ({ page }) => {
    await loadSample(page);

    // Capture basic editor view
    await page.screenshot({ path: 'test-results/screenshots/basic-editor.png' });
  });

  test('navigation', async ({ page }) => {
    await loadSample(page);

    // Navigate to show focus state
    await page.keyboard.press('j');
    await page.waitForTimeout(300);

    await page.screenshot({ path: 'test-results/screenshots/navigation-focused.png' });
  });

  test('command-palette', async ({ page }) => {
    await loadSample(page);

    // Open command palette
    await page.keyboard.press('Meta+k');
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'test-results/screenshots/command-palette.png' });
  });

  test('bulk-operations', async ({ page }) => {
    await loadSample(page);

    // Open bulk operations
    await page.keyboard.press('Meta+b');
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'test-results/screenshots/bulk-operations.png' });
  });

  test('keyboard-shortcuts', async ({ page }) => {
    await loadSample(page);

    // Show keyboard shortcuts
    await page.keyboard.press('?');
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'test-results/screenshots/keyboard-shortcuts.png' });
  });

  test('annotation-workflow', async ({ page }) => {
    await loadSample(page);

    // Click on first passage
    const passage = page.locator('[id^="passage-"]').first();
    await passage.click();
    await page.waitForTimeout(300);

    await page.screenshot({ path: 'test-results/screenshots/passage-selected.png' });

    // Apply Narrative tag
    await page.keyboard.press('1');
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'test-results/screenshots/passage-annotated.png' });
  });
});
