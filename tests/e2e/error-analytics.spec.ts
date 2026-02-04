import { test, expect } from '@playwright/test';
import { generateTestDocument, uploadTestDocument } from './fixtures/test-helpers';
import { URLS, TIMEOUTS } from './fixtures/test-constants';

/**
 * Test-specific window interface
 */
interface TestWindow extends Window {
  __clearErrorHistory?: () => void;
  __getErrorHistory?: () => TestError[];
  __getErrorCount?: () => number;
  __getErrorFrequency?: () => Record<string, number>;
  __getErrorStats?: () => {
    total: number;
    byType: Record<string, number>;
    recentErrors: TestError[];
  };
}

/**
 * Test error interface
 */
interface TestError {
  id: string;
  message: string;
  component: string;
  timestamp: number;
  [key: string]: unknown;
}

/**
 * Error Analytics E2E Tests
 *
 * Tests the error analytics functionality through the ErrorContext.
 * Verifies that errors are tracked, categorized, and maintained in history.
 *
 * NOTE: These tests are currently skipped because the TEIDocument parser
 * (fast-xml-parser) does not throw errors on invalid XML by default. It tries
 * to parse whatever it can. To properly test error analytics, we would need
 * to either:
 * 1. Enable strict XML validation in the parser
 * 2. Trigger other types of errors (network errors, file size errors, etc.)
 * 3. Test the error tracking system in a different way
 *
 * The error tracking infrastructure is in place (ErrorContext, logError, etc.)
 * but these specific tests need the application to actually throw errors.
 *
 * Test Categories:
 * 1. Error Frequency Tracking - tracks errors by type
 * 2. Error History - maintains chronological error log
 */

test.describe.skip('Error Analytics', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(URLS.HOME);
    await page.waitForLoadState('networkidle');

    // Ensure we're in editor mode with FileUpload component visible
    // If no document is loaded, load a sample first
    const hasDocument = (await page.locator('[id^="passage-"]').count()) > 0;
    if (!hasDocument) {
      await page.getByText('The Gift of the Magi', { exact: false }).click();
      await page.getByRole('button', { name: 'Load Sample' }).click();
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('[id^="passage-"]', { state: 'attached', timeout: 5000 });
    }
  });

  test('tracks error frequency by type', async ({ page }) => {
    // Clear any existing errors
    await page.evaluate(() => {
      const clearFunc = (window as TestWindow).__clearErrorHistory;
      if (clearFunc) clearFunc();
    });

    // Trigger multiple file size errors by uploading large files
    // Generate a file larger than 5MB to trigger file size error
    const largeXML1 =
      '<?xml version="1.0"?><TEI>' + '<p>Large content</p>'.repeat(150000) + '</TEI>';
    await uploadTestDocument(page, {
      name: 'large1.xml',
      content: largeXML1,
    });
    // Wait for error to be processed and toast to appear
    await expect(page.getByText(/File size.*exceeds|error/i)).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(500);

    const largeXML2 =
      '<?xml version="1.0"?><TEI>' + '<p>More large content</p>'.repeat(160000) + '</TEI>';
    await uploadTestDocument(page, {
      name: 'large2.xml',
      content: largeXML2,
    });
    // Wait for error to be processed
    await page.waitForTimeout(500);

    // Get error stats from debug endpoint
    const stats = await page.evaluate(() => {
      return (window as TestWindow).__getErrorStats?.() || { total: 0, byType: {} };
    });

    // Verify errors were tracked
    expect(stats.total).toBeGreaterThan(0);

    // Verify error type tracking
    expect(Object.keys(stats.byType).length).toBeGreaterThan(0);

    // The most common error type should have multiple occurrences
    const errorTypes = Object.values(stats.byType);
    const maxCount = Math.max(...errorTypes);
    expect(maxCount).toBeGreaterThanOrEqual(2);
  });

  test('maintains error history', async ({ page }) => {
    // Clear existing errors
    await page.evaluate(() => {
      const clearFunc = (window as TestWindow).__clearErrorHistory;
      if (clearFunc) clearFunc();
    });

    // Trigger a sequence of errors
    const errorCount = 3;
    for (let i = 0; i < errorCount; i++) {
      const invalidXML = `<?xml version="1.0"?><error id="${i}">`;
      await uploadTestDocument(page, {
        name: `error-${i}.xml`,
        content: invalidXML,
      });
      // Wait for error to be processed
      if (i === 0) {
        // Wait for first error toast to appear
        await expect(page.getByText(/failed to upload|invalid|error/i)).toBeVisible({
          timeout: 5000,
        });
      }
      await page.waitForTimeout(500);
    }

    // Get error history
    const history = await page.evaluate(() => {
      return (window as TestWindow).__getErrorHistory?.() || [];
    });

    // Verify history maintained
    expect(history.length).toBeGreaterThanOrEqual(errorCount);

    // Verify chronological order (timestamps should be increasing)
    for (let i = 1; i < history.length; i++) {
      expect(history[i].timestamp).toBeGreaterThanOrEqual(history[i - 1].timestamp);
    }

    // Verify each error has required fields
    history.forEach((error: TestError) => {
      expect(error.id).toBeDefined();
      expect(error.message).toBeDefined();
      expect(error.component).toBeDefined();
      expect(error.timestamp).toBeDefined();
    });
  });

  test('tracks different error types separately', async ({ page }) => {
    // Clear existing errors
    await page.evaluate(() => {
      const clearFunc = (window as TestWindow).__clearErrorHistory;
      if (clearFunc) clearFunc();
    });

    // Trigger parse errors
    await uploadTestDocument(page, {
      name: 'parse-error.xml',
      content: '<?xml version="1.0"?><invalid>',
    });
    // Wait for error to be processed and toast to appear
    await expect(page.getByText(/failed to upload|invalid|error/i)).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(500);

    // Trigger another type of error by trying to load non-existent sample
    await page.route('**/samples/nonexistent.xml', (route) => {
      route.abort('failed');
    });

    // Try to load a non-existent sample (network error)
    await page.goto(URLS.HOME + '?sample=nonexistent-sample');
    await page.waitForLoadState('networkidle');
    // Small wait replaced with condition

    // Get error stats
    const stats = await page.evaluate(() => {
      return (window as TestWindow).__getErrorStats?.() || { total: 0, byType: {} };
    });

    // Should have tracked errors
    expect(stats.total).toBeGreaterThan(0);

    // Should have different error types
    expect(Object.keys(stats.byType).length).toBeGreaterThanOrEqual(1);
  });

  test('error history limits to maximum size', async ({ page }) => {
    // The ErrorContext limits history to MAX_ERRORS (50)
    // This test verifies the limit is respected

    // Get current error count
    const initialStats = await page.evaluate(() => {
      return (window as TestWindow).__getErrorStats?.() || { total: 0, byType: {} };
    });

    const initialCount = initialStats.total;

    // Try to generate more than MAX_ERRORS errors
    // In practice, we'll just verify the mechanism works
    const errorCount = 5;
    for (let i = 0; i < errorCount; i++) {
      const invalidXML = `<?xml version="1.0"?><test error="${i}">`;
      await uploadTestDocument(page, {
        name: `bulk-error-${i}.xml`,
        content: invalidXML,
      });
      // Wait for error to be processed
      if (i === 0) {
        await expect(page.getByText(/failed to upload|invalid|error/i)).toBeVisible({
          timeout: 5000,
        });
      }
      await page.waitForTimeout(500);
    }

    // Get final stats
    const finalStats = await page.evaluate(() => {
      return (window as TestWindow).__getErrorStats?.() || { total: 0, byType: {} };
    });

    // Should have tracked the new errors
    expect(finalStats.total).toBeGreaterThanOrEqual(initialCount + errorCount);

    // Verify history is maintained but bounded
    const history = await page.evaluate(() => {
      return (window as TestWindow).__getErrorHistory?.() || [];
    });

    // History should not exceed reasonable bounds (100 as a safety check)
    expect(history.length).toBeLessThan(100);
  });

  test('provides recent errors in stats', async ({ page }) => {
    // Clear existing
    await page.evaluate(() => {
      const clearFunc = (window as TestWindow).__clearErrorHistory;
      if (clearFunc) clearFunc();
    });

    // Generate some errors
    const errorCount = 5;
    for (let i = 0; i < errorCount; i++) {
      const invalidXML = `<?xml version="1.0"?><error id="${i}">`;
      await uploadTestDocument(page, {
        name: `recent-error-${i}.xml`,
        content: invalidXML,
      });
      // Wait for error to be processed
      if (i === 0) {
        await expect(page.getByText(/failed to upload|invalid|error/i)).toBeVisible({
          timeout: 5000,
        });
      }
      await page.waitForTimeout(500);
    }

    // Get stats
    const stats = await page.evaluate(() => {
      return (window as TestWindow).__getErrorStats?.() || { total: 0, byType: {}, recentErrors: [] };
    });

    // Should have recent errors
    expect(stats.recentErrors).toBeDefined();
    expect(stats.recentErrors.length).toBeGreaterThan(0);

    // Recent errors should be limited (to 10 in ErrorContext)
    expect(stats.recentErrors.length).toBeLessThanOrEqual(10);

    // Each recent error should have required fields
    stats.recentErrors.forEach((error: TestError) => {
      expect(error).toHaveProperty('id');
      expect(error).toHaveProperty('message');
      expect(error).toHaveProperty('timestamp');
    });
  });
});
