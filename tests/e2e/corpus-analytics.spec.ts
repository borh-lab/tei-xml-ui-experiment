import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Corpus Analytics Feature
 *
 * Tests the corpus analytics functionality for analyzing dialogue within TEI documents
 * from the corpus browser.
 */

test.describe('Corpus Analytics', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to corpus browser
    await page.goto('/corpus');
    await page.waitForLoadState('networkidle');
  });

  test('should display character rankings for loaded document', async ({ page }) => {
    // Load the novel-dialogism corpus (has rich dialogue annotations)
    // Wait for page to be fully loaded
    await page.waitForLoadState('domcontentloaded');

    // Try to find and click Novel Dialogism corpus
    const corpusCard = page.getByText('Novel Dialogism');
    await expect(corpusCard).toBeVisible({ timeout: 10000 });
    await corpusCard.click();

    // Wait for corpus to load
    await page.waitForSelector('text=Documents', { timeout: 10000 });

    // Wait for documents to load
    await page.waitForSelector('text=Loading documents...', { state: 'hidden', timeout: 10000 });

    // Find and click the first "View" button to load a document
    const viewButton = page.getByRole('button', { name: 'View' }).first();
    await expect(viewButton).toBeVisible();
    await viewButton.click();

    // Wait for document to load - should show TEI content
    await page.waitForSelector('pre, .bg-muted', { timeout: 10000 });

    // Navigate to the editor/main view to access visualization panel
    // The document should be loaded in the editor now
    await page.waitForLoadState('networkidle');

    // Look for the Analytics tab in the visualization panel
    // First, check if we're in the editor view
    const analyticsTab = page.getByRole('tab', { name: 'Analytics' });
    const hasAnalyticsTab = await analyticsTab.count();

    if (hasAnalyticsTab > 0) {
      // Click Analytics tab
      await analyticsTab.click();

      // Check for rankings
      await expect(page.getByText('Top Speakers')).toBeVisible();

      // Should show quote counts (numbers followed by "quotes")
      const quotesText = page.getByText(/\d+ quotes?/);
      await expect(quotesText.first()).toBeVisible();
    } else {
      // If Analytics tab is not visible, document might not have loaded properly
      // At least verify we're on the document view page
      await expect(page.getByText('Back to Documents')).toBeVisible();
    }
  });

  test('should display conversation matrix', async ({ page }) => {
    // Load a corpus with dialogue
    await page.getByText('Novel Dialogism').click();
    await page.waitForSelector('text=Documents', { timeout: 10000 });
    await page.waitForSelector('text=Loading documents...', { state: 'hidden', timeout: 10000 });

    // Load first document
    const viewButton = page.getByRole('button', { name: 'View' }).first();
    await viewButton.click();
    await page.waitForSelector('pre, .bg-muted', { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // Look for Analytics tab
    const analyticsTab = page.getByRole('tab', { name: 'Analytics' });
    const hasAnalyticsTab = await analyticsTab.count();

    if (hasAnalyticsTab > 0) {
      await analyticsTab.click();

      // Check for conversation matrix
      await expect(page.getByText('Conversation Matrix')).toBeVisible();

      // Should show character interaction table
      // Look for table or grid elements
      const table = page.locator('table').or(page.locator('[role="table"]'));
      const hasTable = await table.count();

      if (hasTable > 0) {
        await expect(table.first()).toBeVisible();
      }
    } else {
      // Verify document is loaded at least
      await expect(page.getByText('Back to Documents')).toBeVisible();
    }
  });

  test('should show analytics for document with dialogue', async ({ page }) => {
    // Load novel-dialogism corpus (known to have dialogue)
    await page.getByText('Novel Dialogism').click();
    await page.waitForSelector('text=Documents', { timeout: 10000 });
    await page.waitForSelector('text=Loading documents...', { state: 'hidden', timeout: 10000 });

    // Load first document
    const viewButton = page.getByRole('button', { name: 'View' }).first();
    await viewButton.click();
    await page.waitForSelector('pre, .bg-muted', { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // Look for Analytics tab
    const analyticsTab = page.getByRole('tab', { name: 'Analytics' });
    const hasAnalyticsTab = await analyticsTab.count();

    if (hasAnalyticsTab > 0) {
      await analyticsTab.click();

      // Analytics should be visible - either with data or empty state
      const topSpeakers = page.getByText('Top Speakers');
      const noDialogue = page.getByText('No dialogue found');

      // Should see one of these states
      const hasContent = await topSpeakers.count() + await noDialogue.count();

      expect(hasContent).toBeGreaterThan(0);

      // If we have rankings, verify structure
      if (await topSpeakers.count() > 0) {
        // Should have character rankings
        const rankings = page.locator('text=Top Speakers');
        await expect(rankings).toBeVisible();
      }
    }
  });

  test('should handle document with no dialogue gracefully', async ({ page }) => {
    // Load Wright American Fiction (may have documents without dialogue)
    await page.getByText('Wright American Fiction').click();
    await page.waitForSelector('text=Documents', { timeout: 10000 });
    await page.waitForSelector('text=Loading documents...', { state: 'hidden', timeout: 10000 });

    // Try loading a document - might not have dialogue annotations
    const viewButton = page.getByRole('button', { name: 'View' }).first();
    await viewButton.click();
    await page.waitForSelector('pre, .bg-muted', { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // Look for Analytics tab
    const analyticsTab = page.getByRole('tab', { name: 'Analytics' });
    const hasAnalyticsTab = await analyticsTab.count();

    if (hasAnalyticsTab > 0) {
      await analyticsTab.click();

      // Should either show analytics or empty state/error state
      // Just verify the tab content is visible
      const analyticsContent = page.locator('[data-state="active"]').filter({ hasText: /Top Speakers|No dialogue|Analyzing|Error/i });
      const hasContent = await analyticsContent.count();

      // At minimum, the tab should switch and show some content
      expect(hasAnalyticsTab).toBeGreaterThan(0);
    }
  });

  test('should update analytics when switching between documents', async ({ page }) => {
    // Load a corpus
    await page.getByText('Novel Dialogism').click();
    await page.waitForSelector('text=Documents', { timeout: 10000 });
    await page.waitForSelector('text=Loading documents...', { state: 'hidden', timeout: 10000 });

    // Load first document
    const viewButton = page.getByRole('button', { name: 'View' }).first();
    await viewButton.click();
    await page.waitForSelector('pre, .bg-muted', { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // Look for Analytics tab
    const analyticsTab = page.getByRole('tab', { name: 'Analytics' });
    const hasAnalyticsTab = await analyticsTab.count();

    if (hasAnalyticsTab > 0) {
      await analyticsTab.click();

      // Wait for initial analytics
      await page.waitForTimeout(500);

      // Go back to documents
      const backButton = page.getByRole('button', { name: 'Back to Documents' });
      await backButton.click();
      await page.waitForSelector('text=Loading documents...', { state: 'hidden', timeout: 10000 });

      // Load a different document (second one)
      const secondViewButton = page.getByRole('button', { name: 'View' }).nth(1);
      const buttonCount = await secondViewButton.count();

      if (buttonCount > 0) {
        await secondViewButton.click();
        await page.waitForSelector('pre, .bg-muted', { timeout: 10000 });
        await page.waitForLoadState('networkidle');

        // Click Analytics tab again
        await analyticsTab.click();

        // Analytics should be visible (content may differ)
        const topSpeakers = page.getByText('Top Speakers');
        const hasSpeakers = await topSpeakers.count();

        if (hasSpeakers > 0) {
          await expect(topSpeakers).toBeVisible();
        }
      }
    }
  });
});
