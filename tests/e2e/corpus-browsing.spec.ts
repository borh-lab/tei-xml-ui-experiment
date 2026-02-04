import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Corpus Browsing Flows
 *
 * Tests the corpus browser functionality for browsing and viewing TEI documents
 * from various corpora collections.
 */

test.describe('Corpus Browsing', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to corpus browser
    await page.goto('/corpus');
    await page.waitForLoadState('networkidle');
  });

  test('should display corpus selector with available corpora', async ({ page }) => {
    // Should show main heading
    await expect(page.getByText('Browse TEI Corpora')).toBeVisible();

    // Should show description
    await expect(page.getByText(/Select a corpus to explore/)).toBeVisible();

    // Should display corpus cards
    await expect(page.getByText('Wright American Fiction')).toBeVisible();
    await expect(page.getByText('3,000+ novels from 1851-1875')).toBeVisible();

    await expect(page.getByText('Victorian Women Writers')).toBeVisible();
    await expect(page.getByText('Literary works by Victorian-era women authors')).toBeVisible();

    await expect(page.getByText('Indiana Magazine of History')).toBeVisible();

    // Should show browse collection buttons
    const browseButtons = page.getByRole('button', { name: 'Browse Collection' });
    await expect(browseButtons.first()).toBeVisible();
  });

  test('should load corpus and display documents', async ({ page }) => {
    // Click on Wright American Fiction corpus
    await page.getByText('Wright American Fiction').click();

    // Should show loading state
    await expect(page.getByText('Loading corpus...')).toBeVisible();

    // Wait for corpus to load (with timeout)
    await page.waitForSelector('text=Documents', { timeout: 10000 });

    // Should show corpus metadata
    await expect(page.getByText('Wright American Fiction')).toBeVisible();

    // Should show documents section
    await expect(page.getByRole('heading', { name: 'Documents' })).toBeVisible();

    // Should display corpus info
    await expect(page.getByText('Total Documents')).toBeVisible();
    await expect(page.getByText('Current Page')).toBeVisible();
    await expect(page.getByText('Page 1')).toBeVisible();

    // Should show "Back to Corpora" button
    await expect(page.getByRole('button', { name: 'Back to Corpora' })).toBeVisible();
  });

  test('should paginate through documents', async ({ page }) => {
    // Load a corpus
    await page.getByText('Wright American Fiction').click();
    await page.waitForSelector('text=Documents', { timeout: 10000 });

    // Check initial page
    await expect(page.getByText('Page 1')).toBeVisible();

    // Should have pagination controls
    const prevButton = page.getByRole('button', { name: 'Previous' });
    const nextButton = page.getByRole('button', { name: 'Next' });

    await expect(prevButton).toBeVisible();
    await expect(nextButton).toBeVisible();

    // Previous should be disabled on first page
    await expect(prevButton).toBeDisabled();

    // Click next button if enabled
    const isNextEnabled = await nextButton.isEnabled();
    if (isNextEnabled) {
      await nextButton.click();

      // Should show page 2
      await expect(page.getByText('Page 2')).toBeVisible();

      // Previous button should now be enabled
      await expect(prevButton).toBeEnabled();

      // Go back to page 1
      await prevButton.click();
      await expect(page.getByText('Page 1')).toBeVisible();
    }
  });

  test('should view document content', async ({ page }) => {
    // Load a corpus
    await page.getByText('Wright American Fiction').click();
    await page.waitForSelector('text=Documents', { timeout: 10000 });

    // Wait for documents to load
    await page.waitForSelector('text=Loading documents...', { state: 'hidden', timeout: 10000 });

    // Find and click the first "View" button
    const viewButton = page.getByRole('button', { name: 'View' }).first();
    const hasViewButton = await viewButton.count();

    if (hasViewButton > 0) {
      await viewButton.click();

      // Should show document content view
      await expect(page.getByText('Back to Documents')).toBeVisible();

      // Should display document title
      const documentTitle = page.locator('h1, h2').first();
      await expect(documentTitle).toBeVisible();

      // Should show encoding badges
      const badges = page.locator('.badge').or(page.locator('[class*="badge"]'));
      const hasBadges = (await badges.count()) > 0;
      if (hasBadges) {
        await expect(badges.first()).toBeVisible();
      }

      // Should display TEI content
      const contentArea = page.locator('pre').or(page.locator('.bg-muted'));
      await expect(contentArea.first()).toBeVisible();

      // Content should contain XML-like structure
      const content = await contentArea.first().textContent();
      expect(content).toBeTruthy();
      expect(content?.length || 0).toBeGreaterThan(0);
    }
  });

  test('should handle non-existent corpus gracefully', async ({ page }) => {
    // Try to navigate directly to a non-existent corpus
    await page.goto('/corpus?corpus=non-existent-corpus');
    await page.waitForLoadState('networkidle');

    // Should either show error state or redirect back to selector
    const hasError = await page.getByText(/Error Loading Corpus|not found/i).count();
    const hasSelector = await page.getByText('Browse TEI Corpora').count();

    // Should either show error or return to selector
    expect(hasError + hasSelector).toBeGreaterThan(0);

    // If error is shown, should have "Go Back" button
    if (hasError > 0) {
      await expect(page.getByRole('button', { name: 'Go Back' })).toBeVisible();

      // Click go back should return to selector
      await page.getByRole('button', { name: 'Go Back' }).click();
      await expect(page.getByText('Browse TEI Corpora')).toBeVisible();
    }
  });

  test('should display corpus information cards', async ({ page }) => {
    // Should show "About These Corpora" section
    await expect(page.getByText('About These Corpora')).toBeVisible();

    // Should display statistics
    await expect(page.getByText('Total Documents')).toBeVisible();
    await expect(page.getByText('3,000+')).toBeVisible();

    await expect(page.getByText('Encoding Types')).toBeVisible();
    await expect(page.getByText('Mixed')).toBeVisible();

    await expect(page.getByText('TEI Versions')).toBeVisible();
    await expect(page.getByText('P4, P5')).toBeVisible();

    await expect(page.getByText('Formats')).toBeVisible();
    await expect(page.getByText('XML')).toBeVisible();
  });
});
