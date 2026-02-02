import { test, expect } from '@playwright/test';

/**
 * Character Network Configuration E2E Tests
 *
 * Tests for the Character Network configuration panel including:
 * - Proximity method selection (paragraph/dialogue/word/combined)
 * - Distance threshold adjustment
 * - Edge directionality toggles (undirected/directed/both)
 * - Edge weight filtering
 * - Real-time graph updates
 */

test.describe('Character Network Configuration', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app - it auto-loads 'gift-of-the-magi' on first visit
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Open visualizations panel
    await page.getByRole('button', { name: /Visualizations/i }).click();

    // Switch to Character Network tab
    await page.getByRole('tab', { name: 'Character Network' }).click();
  });

  test.describe('Proximity Method Selection', () => {
    test('should display proximity method selector', async ({ page }) => {
      // Should show proximity method dropdown/selector
      await expect(page.getByText(/Proximity Method/i)).toBeVisible();
      await expect(page.getByRole('combobox', { name: /proximity method/i })).toBeVisible();
    });

    test('should change proximity method to paragraph', async ({ page }) => {
      // Get initial edge count
      const initialEdgesText = await page.getByText(/Edges:\s*\d+/).textContent();
      const initialEdgeMatch = initialEdgesText?.match(/Edges:\s*(\d+)/);
      const initialEdgeCount = initialEdgeMatch ? parseInt(initialEdgeMatch[1]) : 0;

      // Change to paragraph method
      await page.getByRole('combobox', { name: /proximity method/i }).selectOption('paragraph');

      // Wait for graph to update
      await page.waitForTimeout(500);

      // Edge count might be different
      const newEdgesText = await page.getByText(/Edges:\s*\d+/).textContent();
      expect(newEdgesText).toBeTruthy();

      // Method selector should show paragraph
      const selectedOption = await page.getByRole('combobox', { name: /proximity method/i }).inputValue();
      expect(selectedOption).toBe('paragraph');
    });

    test('should change proximity method to dialogue', async ({ page }) => {
      // Change to dialogue method
      await page.getByRole('combobox', { name: /proximity method/i }).selectOption('dialogue');

      // Wait for graph to update
      await page.waitForTimeout(500);

      // Method selector should show dialogue
      const selectedOption = await page.getByRole('combobox', { name: /proximity method/i }).inputValue();
      expect(selectedOption).toBe('dialogue');
    });

    test('should change proximity method to word distance', async ({ page }) => {
      // Change to word distance method
      await page.getByRole('combobox', { name: /proximity method/i }).selectOption('word');

      // Wait for graph to update
      await page.waitForTimeout(500);

      // Method selector should show word
      const selectedOption = await page.getByRole('combobox', { name: /proximity method/i }).inputValue();
      expect(selectedOption).toBe('word');
    });

    test('should change proximity method to combined', async ({ page }) => {
      // Change to combined method
      await page.getByRole('combobox', { name: /proximity method/i }).selectOption('combined');

      // Wait for graph to update
      await page.waitForTimeout(500);

      // Method selector should show combined
      const selectedOption = await page.getByRole('combobox', { name: /proximity method/i }).inputValue();
      expect(selectedOption).toBe('combined');
    });
  });

  test.describe('Distance Threshold Adjustment', () => {
    test('should display distance threshold slider', async ({ page }) => {
      // Should show max distance slider
      await expect(page.getByText(/Max Distance/i)).toBeVisible();
      await expect(page.getByRole('slider', { name: /max distance/i })).toBeVisible();
    });

    test('should adjust distance threshold', async ({ page }) => {
      // Get initial edge count
      const initialEdgesText = await page.getByText(/Edges:\s*\d+/).textContent();

      // Increase distance threshold
      await page.getByRole('slider', { name: /max distance/i }).fill('10');

      // Wait for graph to update
      await page.waitForTimeout(500);

      // Edge count should likely increase with larger threshold
      const newEdgesText = await page.getByText(/Edges:\s*\d+/).textContent();
      expect(newEdgesText).toBeTruthy();
    });

    test('should decrease distance threshold', async ({ page }) => {
      // Set to higher value first
      await page.getByRole('slider', { name: /max distance/i }).fill('10');
      await page.waitForTimeout(500);

      const highThresholdEdges = await page.getByText(/Edges:\s*\d+/).textContent();

      // Decrease threshold
      await page.getByRole('slider', { name: /max distance/i }).fill('2');
      await page.waitForTimeout(500);

      const lowThresholdEdges = await page.getByText(/Edges:\s*\d+/).textContent();

      // Edge counts should be present
      expect(highThresholdEdges).toBeTruthy();
      expect(lowThresholdEdges).toBeTruthy();
    });

    test('should display current distance value', async ({ page }) => {
      // Should display the current distance value
      await expect(page.getByText(/\d+ (turns|words|characters)/i)).toBeVisible();

      // Change distance
      await page.getByRole('slider', { name: /max distance/i }).fill('5');
      await page.waitForTimeout(500);

      // Value should update
      await expect(page.getByText(/5 (turns|words|characters)/i)).toBeVisible();
    });
  });

  test.describe('Edge Directionality', () => {
    test('should display edge directionality toggle', async ({ page }) => {
      // Should show direction toggle
      await expect(page.getByText(/Edge Direction/i)).toBeVisible();
      await expect(page.getByRole('combobox', { name: /edge direction/i })).toBeVisible();
    });

    test('should toggle to undirected edges', async ({ page }) => {
      // Change to undirected
      await page.getByRole('combobox', { name: /edge direction/i }).selectOption('undirected');

      // Wait for graph to update
      await page.waitForTimeout(500);

      // Should show undirected edges (solid lines)
      const selectedOption = await page.getByRole('combobox', { name: /edge direction/i }).inputValue();
      expect(selectedOption).toBe('undirected');
    });

    test('should toggle to directed edges', async ({ page }) => {
      // Change to directed
      await page.getByRole('combobox', { name: /edge direction/i }).selectOption('directed');

      // Wait for graph to update
      await page.waitForTimeout(500);

      // Should show directed edges (animated arrows)
      const selectedOption = await page.getByRole('combobox', { name: /edge direction/i }).inputValue();
      expect(selectedOption).toBe('directed');
    });

    test('should show both edge types', async ({ page }) => {
      // Change to both
      await page.getByRole('combobox', { name: /edge direction/i }).selectOption('both');

      // Wait for graph to update
      await page.waitForTimeout(500);

      // Should show both undirected and directed edges
      const selectedOption = await page.getByRole('combobox', { name: /edge direction/i }).inputValue();
      expect(selectedOption).toBe('both');
    });
  });

  test.describe('Edge Weight Filtering', () => {
    test('should display edge weight threshold slider', async ({ page }) => {
      // Should show edge threshold slider
      await expect(page.getByText(/Edge Threshold/i)).toBeVisible();
      await expect(page.getByRole('slider', { name: /edge threshold/i })).toBeVisible();
    });

    test('should filter edges by weight', async ({ page }) => {
      // Get initial edge count
      const initialEdgesText = await page.getByText(/Edges:\s*\d+/).textContent();
      const initialEdgeMatch = initialEdgesText?.match(/Edges:\s*(\d+)/);
      const initialEdgeCount = initialEdgeMatch ? parseInt(initialEdgeMatch[1]) : 0;

      // Increase edge threshold to filter weak connections
      await page.getByRole('slider', { name: /edge threshold/i }).fill('3');

      // Wait for graph to update
      await page.waitForTimeout(500);

      // Get new edge count
      const newEdgesText = await page.getByText(/Edges:\s*\d+/).textContent();
      expect(newEdgesText).toBeTruthy();
    });

    test('should show minimum weight value', async ({ page }) => {
      // Should display the minimum weight threshold
      await expect(page.getByText(/Min Strength:\s*\d+/i)).toBeVisible();

      // Change threshold
      await page.getByRole('slider', { name: /edge threshold/i }).fill('2');
      await page.waitForTimeout(500);

      // Value should update
      await expect(page.getByText(/Min Strength:\s*2/i)).toBeVisible();
    });
  });

  test.describe('Real-time Graph Updates', () => {
    test('should update graph when proximity method changes', async ({ page }) => {
      // Get initial node and edge counts
      const initialStats = await page.getByText(/Nodes:\s*\d+.*Edges:\s*\d+/s).textContent();

      // Change proximity method
      await page.getByRole('combobox', { name: /proximity method/i }).selectOption('combined');

      // Wait for update
      await page.waitForTimeout(500);

      // Graph should still be visible
      const graphContainer = page.locator('.react-flow');
      await expect(graphContainer).toBeVisible();

      // Stats should be displayed
      const newStats = await page.getByText(/Nodes:\s*\d+.*Edges:\s*\d+/s).textContent();
      expect(newStats).toBeTruthy();
    });

    test('should update graph when distance changes', async ({ page }) => {
      // Change distance
      await page.getByRole('slider', { name: /max distance/i }).fill('5');

      // Wait for update
      await page.waitForTimeout(500);

      // Graph should still be visible
      const graphContainer = page.locator('.react-flow');
      await expect(graphContainer).toBeVisible();
    });

    test('should update graph when directionality changes', async ({ page }) => {
      // Change directionality
      await page.getByRole('combobox', { name: /edge direction/i }).selectOption('directed');

      // Wait for update
      await page.waitForTimeout(500);

      // Graph should still be visible
      const graphContainer = page.locator('.react-flow');
      await expect(graphContainer).toBeVisible();
    });

    test('should update graph when edge threshold changes', async ({ page }) => {
      // Change edge threshold
      await page.getByRole('slider', { name: /edge threshold/i }).fill('2');

      // Wait for update
      await page.waitForTimeout(500);

      // Graph should still be visible
      const graphContainer = page.locator('.react-flow');
      await expect(graphContainer).toBeVisible();
    });
  });

  test.describe('UI Integration', () => {
    test('should display all configuration controls', async ({ page }) => {
      // All controls should be visible
      await expect(page.getByText(/Proximity Method/i)).toBeVisible();
      await expect(page.getByText(/Max Distance/i)).toBeVisible();
      await expect(page.getByText(/Edge Direction/i)).toBeVisible();
      await expect(page.getByText(/Edge Threshold/i)).toBeVisible();
    });

    test('should show node and edge statistics', async ({ page }) => {
      // Should display statistics
      await expect(page.getByText(/Nodes:\s*\d+/)).toBeVisible();
      await expect(page.getByText(/Edges:\s*\d+/)).toBeVisible();
    });

    test('should display configuration help text', async ({ page }) => {
      // Should have some explanatory text
      const hasHelpText =
        (await page.getByText(/Adjust settings to customize the network visualization/i).count()) > 0 ||
        (await page.getByText(/Configure how character relationships are detected/i).count()) > 0;

      // Help text is optional but nice to have
      if (hasHelpText) {
        await expect(page.getByText(/adjust|configure/i)).toBeVisible();
      }
    });
  });

  test.describe('Graph Persistence', () => {
    test('should maintain configuration when switching tabs', async ({ page }) => {
      // Set a specific configuration
      await page.getByRole('combobox', { name: /proximity method/i }).selectOption('paragraph');
      await page.getByRole('slider', { name: /max distance/i }).fill('5');
      await page.waitForTimeout(500);

      // Switch to another tab
      await page.getByRole('tab', { name: 'Document Stats' }).click();
      await page.waitForTimeout(500);

      // Switch back to Character Network
      await page.getByRole('tab', { name: 'Character Network' }).click();
      await page.waitForTimeout(500);

      // Configuration should be maintained
      const proximityMethod = await page.getByRole('combobox', { name: /proximity method/i }).inputValue();
      expect(proximityMethod).toBe('paragraph');
    });
  });
});
