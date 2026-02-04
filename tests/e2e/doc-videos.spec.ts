import { test, expect } from '@playwright/test';

/**
 * Documentation Video Generation Tests
 *
 * These tests generate WebM videos for documentation purposes.
 * Videos are saved to test-results/ and can be moved to docs/videos/
 */

test.use({
  video: 'on', // Enable video recording for all tests in this file
});

test.beforeEach(async ({ page }) => {
  // Clear localStorage for fresh state
  await page.goto('http://localhost:3000/');
  await page.evaluate(() => {
    localStorage.clear();
  });
});

test.describe('Documentation Videos', () => {
  test('test-basic', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await page.keyboard.press('j');
    await page.waitForTimeout(500);
    await page.keyboard.press('k');
    await page.waitForTimeout(500);
    await page.keyboard.press('j');
    await page.waitForTimeout(2000);
  });

  test('command-palette', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.keyboard.press('Meta+k');
    await expect(page.locator('input[placeholder*="search" i]')).toBeVisible();
    await page.waitForTimeout(1500);
  });

  test('bulk-operations', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.keyboard.press('Meta+b');
    await expect(page.getByText('Bulk Operations')).toBeVisible();
    await page.waitForTimeout(1500);
  });

  test('keyboard-shortcuts', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.keyboard.press('?');
    await expect(page.getByText('Keyboard Shortcuts')).toBeVisible();
    await page.waitForTimeout(2000);
  });

  test('character-network', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /Visualizations/i }).click();
    await expect(page.getByText('Character Network')).toBeVisible();
    await page.waitForTimeout(2000);
  });

  test('annotation-workflow', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    await page.waitForLoadState('networkidle');
    await page.locator('.passage').first().click();
    await page.waitForTimeout(500);
    await page.keyboard.press('1');
    await page.waitForTimeout(1000);
    await page.keyboard.press('j');
    await page.waitForTimeout(500);
    await page.keyboard.press('k');
    await page.waitForTimeout(500);
  });

  test('ai-assisted-session', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /AI Suggest/i }).click();
    await expect(page.getByText('AI Suggestions')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(2000);
  });
});
