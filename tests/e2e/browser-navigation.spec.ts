// @ts-nocheck
import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Browser Navigation Feature
 *
 * Tests the browser's back/forward button integration and URL-based navigation.
 */

test.describe('Browser Navigation', () => {
  test('back button navigates to previous document', async ({ page }) => {
    // Start at home page (gallery)
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Load first document
    await page.locator(`[data-test-sample-card="yellow-wallpaper"]`).click();
    await page.waitForURL(/\?doc=yellow-wallpaper/);
    await page.waitForLoadState('networkidle');
    const firstUrl = page.url();

    // Go back to gallery
    await page.goBack();
    await expect(page).toHaveURL('/');

    // Load second document
    await page.locator(`[data-test-sample-card="gift-of-the-magi"]`).click();
    await page.waitForURL(/\?doc=gift-of-the-magi/);
    await page.waitForLoadState('networkidle');
    const secondUrl = page.url();

    expect(secondUrl).not.toBe(firstUrl);

    // Go back - should return to gallery
    await page.goBack();
    await expect(page).toHaveURL('/', { timeout: 5000 });
    await expect(page.locator('[data-test-page="gallery"]')).toBeVisible();
  });

  test('opening URL with doc param loads that document', async ({ page }) => {
    // Navigate directly to URL with doc parameter
    await page.goto('/?doc=yellow-wallpaper');
    await page.waitForLoadState('networkidle');

    // Should show editor, not gallery
    await expect(page.locator('[id^="passage-"]').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-test-page="gallery"]')).not.toBeVisible();

    // URL should contain doc parameter
    await expect(page).toHaveURL(/\?doc=yellow-wallpaper/);
  });

  test('bad doc ID shows error in gallery', async ({ page }) => {
    // Navigate to URL with non-existent document
    await page.goto('/?doc=nonexistent-document');
    await page.waitForLoadState('networkidle');

    // Should show error message
    await expect(page.getByText(/Failed to load document/i)).toBeVisible({ timeout: 5000 });

    // Error message should mention the doc ID
    await expect(page.getByText(/nonexistent-document/i)).toBeVisible();

    // Should have "Back to Gallery" link
    await expect(page.getByRole('link', { name: /back to gallery/i })).toBeVisible();
  });

  test('corpus page preserves doc param', async ({ page }) => {
    // Load a document on home page
    await page.goto('/?doc=yellow-wallpaper');
    await page.waitForLoadState('networkidle');

    // Navigate to corpus page
    await page.goto('/corpus?doc=yellow-wallpaper');
    await page.waitForLoadState('networkidle');

    // URL should contain doc parameter
    await expect(page).toHaveURL(/\/corpus\?doc=yellow-wallpaper/);
  });
});
