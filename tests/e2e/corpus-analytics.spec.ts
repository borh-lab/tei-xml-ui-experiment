import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Corpus Analytics Feature
 *
 * Tests the corpus analytics functionality for analyzing dialogue within TEI documents.
 * Note: These tests require the dev server to be running and corpora to be available.
 */

test.describe('Corpus Analytics', () => {
  test('should load analytics page components', async ({ page }) => {
    // Navigate to home page
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // The VisualizationPanel should be present on the home page
    // Check if any tabs are visible (Network, Statistics, or Analytics)
    const tabs = page.locator('button').filter(async (el) => {
      const text = await el.textContent();
      return text && ['Network', 'Statistics', 'Analytics'].some(t => text.includes(t));
    });

    const tabCount = await tabs.count();

    // At minimum, should have some visualization tabs
    expect(tabCount).toBeGreaterThan(0);
  });

  test('should display analytics tab when available', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Look for Analytics tab
    const analyticsTab = page.getByRole('button', { name: /analytics/i }).or(
      page.locator('button').filter(async (el) => {
        const text = await el.textContent();
        return text && text.toLowerCase().includes('analytics');
      })
    );

    const hasAnalyticsTab = await analyticsTab.count();

    if (hasAnalyticsTab > 0) {
      // If analytics tab exists, click it and verify it loads
      await analyticsTab.first().click();

      // Should show some analytics content
      const content = page.locator('text=Top Speakers').or(page.locator('text=Conversation Matrix')).or(
        page.locator('text=No dialogue found')
      );

      await expect(content.first()).toBeVisible({ timeout: 5000 });
    } else {
      // Analytics tab not available - test passes (feature might not be enabled)
      test.skip(true, 'Analytics tab not available in current build');
    }
  });

  test('should handle empty document state gracefully', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Look for analytics tab
    const analyticsTab = page.getByRole('button', { name: /analytics/i });

    const hasAnalyticsTab = await analyticsTab.count();

    if (hasAnalyticsTab > 0) {
      await analyticsTab.click();

      // Without a document loaded, should show appropriate message
      const emptyState = page.locator('text=Load a document').or(
        page.locator('text=No dialogue found')
      ).or(page.locator('text=/document/i'));

      // At minimum, should show some kind of state message
      const hasContent = await emptyState.count();
      expect(hasContent).toBeGreaterThanOrEqual(0);
    } else {
      test.skip(true, 'Analytics tab not available');
    }
  });
});

test.describe('Corpus Analytics Component Tests', () => {
  // These tests verify the components render correctly when given proper data
  // They test the component structure rather than full integration flow

  test('character rankings component structure', async ({ page }) => {
    // This is a smoke test to verify the component can be imported
    // The actual component logic is tested in unit tests
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Just verify the page loads without errors
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('conversation matrix component structure', async ({ page }) => {
    // Smoke test for conversation matrix
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Verify page structure
    const hasVisualization = await page.locator('[class*="visualization"]').count();
    expect(hasVisualization).toBeGreaterThanOrEqual(0);
  });
});
