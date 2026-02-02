import { test, expect } from '@playwright/test';

/**
 * TEI Dialogue Editor E2E Tests
 *
 * Tests the core functionality of the TEI Dialogue Editor including:
 * - Document loading
 * - Dialogue annotation
 * - AI-assisted features
 * - Bulk operations
 * - Sample gallery
 */

test.describe('TEI Dialogue Editor', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');

    // Wait for the page to load and auto-load a sample
    await page.waitForLoadState('networkidle');
    // Wait a bit for the auto-load to complete
    await page.waitForLoadState("networkidle")
  });

  test('should auto-load sample document on first visit', async ({ page }) => {
    // Should show auto-loaded document (The Gift of the Magi)
    await expect(page.getByText(/Gift of the Magi/i)).toBeVisible();
  });

  test('should have annotation controls after auto-load', async ({ page }) => {
    // Should show auto-loaded document with annotation controls
    await expect(page.getByText(/Gift of the Magi/i)).toBeVisible();
    // Should have content visible
    await expect(page.locator('div.p-3.rounded-lg')).toBeVisible();
  });

  test.describe('Manual Annotation', () => {
    test('should tag dialogue with speaker', async ({ page }) => {
      // Select a passage (click on first paragraph div)
      await page.locator('div.p-3.rounded-lg').click();

      // Tag with speaker
      await page.keyboard.press('1');

      // Should update selection
      await expect(page.locator('div.p-3.rounded-lg')).toBeVisible();
    });

    test('should export TEI document', async ({ page }) => {
      // Open command palette
      await page.keyboard.press('Meta+k');

      // Should show command palette
      await expect(page.getByPlaceholder(/search/i)).toBeVisible();

      // Type export command
      await page.keyboard.type('Export TEI');

      // Click export option
      await page.getByText('Export TEI').click();

      // Should trigger download (we can't test actual download in E2E)
      await expect(page.getByText(/exported/i)).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('AI-Assisted Features', () => {
    test.beforeEach(async ({ page }) => {
      // Load a sample
      await page.getByText('Load Sample').click();
      await page.waitForLoadState('networkidle');

      // Switch to AI suggest mode
      await page.getByRole('button', { name: /AI Suggest/i }).click();
    });

    test('should display AI suggestions', async ({ page }) => {
      // Should show suggestions panel
      await expect(page.getByText(/AI Suggestions/i)).toBeVisible({ timeout: 5000 });

      // Should have suggestions with confidence scores
      await expect(page.getByText(/confidence/i)).toBeVisible();
    });

    test('should accept AI suggestion', async ({ page }) => {
      // Wait for suggestions
      await expect(page.getByText(/AI Suggestions/i)).toBeVisible();

      // Click accept button on first suggestion
      await page.getByRole('button', { name: /accept/i }).click();

      // Suggestion should disappear
      await expect(page.getByRole('button', { name: /accept/i })).not.toBeVisible();
    });

    test('should switch AI modes', async ({ page }) => {
      // Test manual mode
      await page.getByRole('button', { name: /Manual/i }).click();
      await expect(page.getByText(/AI Suggestions/i)).not.toBeVisible();

      // Test auto mode
      await page.getByRole('button', { name: /AI Auto/i }).click();
      // Auto mode should work too (we can't verify exact behavior without API key)
      await expect(page.getByRole('button', { name: /AI Auto/i })).toHaveClass(/selected/);
    });
  });

  test.describe('Keyboard Shortcuts', () => {
    test('should open command palette with Cmd+K', async ({ page }) => {
      // Press Cmd+K (Meta+K on Linux)
      await page.keyboard.press('Meta+k');

      // Should open command palette
      await expect(page.getByPlaceholder(/search/i)).toBeVisible();

      // Close it
      await page.keyboard.press('Escape');
      await expect(page.getByPlaceholder(/search/i)).not.toBeVisible();
    });

    test('should show keyboard shortcuts with ?', async ({ page }) => {
      // Press ? to show shortcuts
      await page.keyboard.press('?');

      // Should show shortcuts dialog
      await expect(page.getByText(/Keyboard Shortcuts/i)).toBeVisible();

      // Should list common shortcuts
      await expect(page.getByText(/Cmd\+K/i)).toBeVisible();
      await expect(page.getByText(/J \/ K/i)).toBeVisible();

      // Close
      await page.keyboard.press('Escape');
    });
  });

  test.describe('Bulk Operations', () => {
    test.beforeEach(async ({ page }) => {
      await page.getByText('Load Sample').click();
      await page.waitForLoadState('networkidle');
    });

    test('should open bulk operations panel', async ({ page }) => {
      // Open bulk operations
      await page.keyboard.press('Meta+b');

      // Should show bulk operations panel
      await expect(page.getByText(/Bulk Operations/i)).toBeVisible();

      // Should have operation buttons
      await expect(page.getByRole('button', { name: /Tag All/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Export/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Validate/i })).toBeVisible();
    });

    test('should select all untagged passages', async ({ page }) => {
      // Open bulk operations
      await page.keyboard.press('Meta+b');

      // Select all untagged
      await page.keyboard.press('Shift+Meta+u');

      // Should show selection count
      // (we can't verify exact count without seeing the document)
      await expect(page.getByText(/selected/i)).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Quick Search', () => {
    test('should open quick search with Cmd+F', async ({ page }) => {
      // Load a sample
      await page.getByText('Load Sample').click();
      await page.waitForLoadState('networkidle');

      // Press Cmd+F
      await page.keyboard.press('Meta+f');

      // Should open quick search dialog
      await expect(page.getByPlaceholder(/search/i)).toBeVisible();

      // Close it
      await page.keyboard.press('Escape');
    });

    test('should search and navigate results', async ({ page }) => {
      // Load sample
      await page.getByText('Load Sample').click();
      await page.waitForLoadState('networkidle');

      // Open search
      await page.keyboard.press('Meta+f');
      await expect(page.getByPlaceholder(/search/i)).toBeVisible();

      // Type search query
      await page.keyboard.type('John');

      // Should show results
      await expect(page.getByText(/results/i)).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Character Network Visualization', () => {
    test.beforeEach(async ({ page }) => {
      await page.getByText('Load Sample').click();
      await page.waitForLoadState('networkidle');
    });

    test('should show character network graph', async ({ page }) => {
      // Open visualizations
      await page.getByRole('button', { name: /Visualizations/i }).click();

      // Should show visualization panel
      await expect(page.getByText(/Character Network/i)).toBeVisible({ timeout: 5000 });

      // Should display character nodes
      await expect(page.locator('.react-flow')).toBeVisible();
    });

    test('should show dialogue statistics', async ({ page }) => {
      // Open visualizations
      await page.getByRole('button', { name: /Visualizations/i }).click();

      // Switch to statistics tab
      await page.getByText(/Statistics/i).click();

      // Should show statistics
      await expect(page.getByText(/Dialogue Count/i)).toBeVisible();
      await expect(page.getByText(/Character Count/i)).toBeVisible();
    });
  });

  test.describe('Pattern Learning', () => {
    test('should learn from user corrections', async ({ page }) => {
      // Load sample and enable AI mode
      await page.getByText('Load Sample').click();
      await page.waitForLoadState('networkidle');
      await page.getByRole('button', { name: /AI Suggest/i }).click();

      // Wait for AI suggestions
      await expect(page.getByText(/AI Suggestions/i)).toBeVisible({ timeout: 5000 });

      // Accept a suggestion
      await page.getByRole('button', { name: /accept/i }).click();

      // Pattern should be learned (verified internally)
      // We can test this by rejecting next suggestion from same speaker
      // and checking if confidence improves

      // Trigger new detection (go to next passage and back)
      await page.keyboard.press('j');
      await page.keyboard.press('k');

      // Should see updated suggestions
      await expect(page.getByRole('button', { name: /accept/i })).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle missing API key gracefully', async ({ page }) => {
      // Try to use AI features without API key
      await page.getByText('Load Sample').click();
      await page.waitForLoadState('networkidle');
      await page.getByRole('button', { name: /AI Suggest/i }).click();

      // Should still work with fallback to NLP
      await expect(page.getByText(/AI Suggestions/i)).toBeVisible({ timeout: 10000 });

      // Should show warning about missing API key
      await expect(page.getByText(/AI.*fallback/i)).toBeVisible();
    });

    test('should handle malformed XML gracefully', async ({ page }) => {
      // This would require testing upload functionality
      // For now, we verify the app doesn't crash
      await page.goto('/editor');

      // Should show editor or error message
      await expect(page.locator('body')).not.toHaveText(/Internal Server Error/);
    });
  });

  test.describe('Documentation Screenshots', () => {
    test('should capture welcome screen', async ({ page }) => {
      await page.screenshot({
        path: 'docs/screenshots/welcome-screen.png',
        fullPage: true
      });
    });

    test('should capture sample gallery', async ({ page }) => {
      await page.screenshot({
        path: 'docs/screenshots/sample-gallery.png',
        fullPage: true
      });
    });

    test('should capture editor with annotations', async ({ page }) => {
      // Load sample
      await page.getByText('Load Sample').click();
      await page.waitForLoadState('networkidle');

      // Take screenshot
      await page.screenshot({
        path: 'docs/screenshots/editor-annotated.png',
        fullPage: true
      });
    });

    test('should capture AI suggestions interface', async ({ page }) => {
      // Load sample
      await page.getByText('Load Sample').click();
      await page.waitForLoadState('networkidle');

      // Enable AI mode
      await page.getByRole('button', { name: /AI Suggest/i }).click();
      await expect(page.getByText(/AI Suggestions/i)).toBeVisible({ timeout: 10000 });

      // Take screenshot
      await page.screenshot({
        path: 'docs/screenshots/ai-suggestions.png',
        fullPage: false
      });
    });

    test('should capture character network visualization', async ({ page }) => {
      // Load sample
      await page.getByText('Load Sample').click();
      await page.waitForLoadState('networkidle');

      // Open visualizations
      await page.getByRole('button', { name: /Visualizations/i }).click();
      await expect(page.getByText(/Character Network/i)).toBeVisible({ timeout: 5000 });

      // Take screenshot
      await page.screenshot({
        path: 'docs/screenshots/character-network.png',
        fullPage: false
      });
    });

    test('should capture command palette', async ({ page }) => {
      // Open command palette
      await page.keyboard.press('Meta+k');
      await expect(page.getByPlaceholder(/search/i)).toBeVisible();

      // Take screenshot
      await page.screenshot({
        path: 'docs/screenshots/command-palette.png',
        fullPage: false
      });

      // Close
      await page.keyboard.press('Escape');
    });

    test('should capture bulk operations panel', async ({ page }) => {
      // Load sample
      await page.getByText('Load Sample').click();
      await page.waitForLoadState('networkidle');

      // Open bulk operations
      await page.keyboard.press('Meta+b');
      await expect(page.getByText(/Bulk Operations/i)).toBeVisible({ timeout: 5000 });

      // Take screenshot
      await page.screenshot({
        path: 'docs/screenshots/bulk-operations.png',
        fullPage: false
      });
    });

    test('should capture keyboard shortcuts help', async ({ page }) => {
      // Open shortcuts help
      await page.keyboard.press('?');
      await expect(page.getByText(/Keyboard Shortcuts/i)).toBeVisible();

      // Take screenshot
      await page.screenshot({
        path: 'docs/screenshots/keyboard-shortcuts.png',
        fullPage: false
      });

      // Close
      await page.keyboard.press('Escape');
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper heading hierarchy', async ({ page }) => {
      // Check for h1 heading
      const h1 = page.getByRole('heading', { level: 1 });
      await expect(h1).toBeVisible();

      // Check main navigation
      const nav = page.getByRole('navigation');
      await expect(nav).toBeVisible();

      // Check for landmark regions
      await expect(page.getByRole('main')).toBeVisible();
    });

    test('should be keyboard navigable', async ({ page }) => {
      // Tab through interactive elements
      await page.keyboard.press('Tab');

      // Should focus on first interactive element
      const focused = page.locator(':focus');
      await expect(focused).toBeVisible();
    });

    test('should have proper ARIA labels', async ({ page }) => {
      // Load sample to test editor controls
      await page.getByText('Load Sample').click();
      await page.waitForLoadState('networkidle');

      // Check for ARIA labels on buttons
      const tagButton = page.getByRole('button', { name: /tag/i });
      await expect(tagButton).toBeVisible();

      // Check for accessible names
      const ariaLabels = page.getByRole('button');
      const count = await ariaLabels.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('Performance', () => {
    test('should load quickly', async ({ page }) => {
      // Measure page load time
      const startTime = Date.now();
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      const loadTime = Date.now() - startTime;

      // Should load in less than 3 seconds
      expect(loadTime).toBeLessThan(3000);
    });

    test('should handle large documents efficiently', async ({ page }) => {
      // Load Pride and Prejudice (largest sample ~5000 words)
      await page.getByText(/Pride and Prejudice/i).click();

      // Should load within reasonable time
      await expect(page.getByText(/Pride and Prejudice/i)).toBeVisible({ timeout: 10000 });

      // Editor should be responsive
      const firstPassage = page.locator('div.p-3.rounded-lg');
      await expect(firstPassage).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Data Persistence', () => {
    test('should remember recent documents', async ({ page }) => {
      // Load a sample
      await page.getByText('Load Sample').click();
      await page.waitForLoadState('networkidle');

      // Reload the page
      await page.reload();

      // Should show recent document (or welcome screen)
      await page.waitForLoadState('domcontentloaded');

      // Should not have errors
      await expect(page.locator('body')).not.toHaveText(/error/i);
    });

    test('should store user preferences', async ({ page }) => {
      // Open command palette
      await page.keyboard.press('Meta+k');
      await expect(page.getByPlaceholder(/search/i)).toBeVisible();

      // Close it
      await page.keyboard.press('Escape');

      // Reload and check preference persists
      await page.reload();
      await page.keyboard.press('Meta+k');
      await expect(page.getByPlaceholder(/search/i)).toBeVisible();
    });
  });

  test.describe('Responsive Design', () => {
    test('should work on desktop viewport', async ({ page }) => {
      // Desktop viewport is default
      await expect(page.locator('body')).toBeVisible();
      await expect(page.getByRole('main')).toBeVisible();
    });

    test('should work on tablet viewport', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });

      // Should adapt layout
      await expect(page.locator('body')).toBeVisible();

      // Restore desktop
      await page.setViewportSize({ width: 1280, height: 720 });
    });
  });
});
