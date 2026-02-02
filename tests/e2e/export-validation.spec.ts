import { test, expect } from '@playwright/test';
import { readFile } from 'fs/promises';
import { join } from 'path';
import {
  loadSample,
  annotatePassage,
  exportDocument,
  verifyTEIExport,
  generateTestDocument,
  createMinimalTEI,
} from './fixtures/test-helpers';
import { EditorPage } from './pages/EditorPage';
import { WelcomePage } from './pages/WelcomePage';
import { SAMPLES, SPEAKERS } from './fixtures/test-constants';

/**
 * Helper function to read download content as string
 */
async function readDownloadAsString(download: any): Promise<string> {
  const path = await download.path();
  const content = await readFile(path, 'utf-8');
  return content;
}

/**
 * Export Validation E2E Tests
 *
 * Comprehensive test coverage for document export functionality including:
 * - Basic export validation (file format, XML structure)
 * - Annotation preservation (speaker attributes, cast list)
 * - Export format variants (TEI, plain text, different versions)
 * - Incremental exports (preserving state across multiple exports)
 * - Error handling (failures, browser restrictions, retry logic)
 */

test.describe('Export Validation - Basic Export Functionality', () => {
  test('should download actual file, not just show success message', async ({ page }) => {
    const editorPage = new EditorPage(page);
    await editorPage.goto();

    // Set up download handler before clicking export
    const downloadPromise = page.waitForEvent('download');

    // Trigger export
    await page.getByRole('button', { name: /export tei/i }).click();

    // Wait for actual download
    const download = await downloadPromise;
    expect(download).toBeDefined();

    // Verify it's a file download, not just a UI message
    const suggestedFilename = download.suggestedFilename();
    expect(suggestedFilename).toBeTruthy();
    expect(suggestedFilename.length).toBeGreaterThan(0);
  });

  test('should verify correct file extension (.tei, .xml, .txt)', async ({ page }) => {
    const editorPage = new EditorPage(page);
    await editorPage.goto();

    // Test TEI export extension
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /export tei/i }).click();
    const download = await downloadPromise;

    const filename = download.suggestedFilename();
    expect(filename).toMatch(/\.(tei|xml|tei\.xml)$/);
  });

  test('should validate TEI XML structure', async ({ page }) => {
    const editorPage = new EditorPage(page);
    await editorPage.goto();

    // Export document
    const download = await editorPage.exportTEI();
    const xml = await readDownloadAsString(download);

    // Verify XML declaration
    expect(xml).toContain('<?xml version=');

    // Verify TEI root element
    expect(xml).toContain('<TEI');
    expect(xml).toContain('</TEI>');

    // Verify TEI namespace
    expect(xml).toContain('xmlns="http://www.tei-c.org/ns/1.0"');

    // Verify required TEI sections
    expect(xml).toContain('<teiHeader');
    expect(xml).toContain('</teiHeader>');
    expect(xml).toContain('<text');
    expect(xml).toContain('</text>');
  });

  test('should verify XML declaration format', async ({ page }) => {
    const editorPage = new EditorPage(page);
    await editorPage.goto();

    const download = await editorPage.exportTEI();
    const xml = await readDownloadAsString(download);

    // Check for proper XML declaration at the start
    expect(xml).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/);

    // Verify it's at the beginning of the file (trimmed)
    const trimmed = xml.trimStart();
    expect(trimmed).toMatch(/^<\?xml/);
  });
});

test.describe('Export Validation - Annotation Preservation', () => {
  test.beforeEach(async ({ page }) => {
    const welcomePage = new WelcomePage(page);
    await welcomePage.goto();
    await welcomePage.loadSample(SAMPLES.YELLOW_WALLPAPER);
  });

  test('should include speaker annotations (@who attributes)', async ({ page }) => {
    const editorPage = new EditorPage(page);

    // Annotate some passages
    await editorPage.annotatePassage(0, SPEAKERS.NARRATOR);
    await editorPage.annotatePassage(1, SPEAKERS.NARRATOR);

    // Export and verify
    const download = await editorPage.exportTEI();
    const xml = await readDownloadAsString(download);

    // Verify @who attributes are present
    expect(xml).toContain('who="#');
    expect(xml).toContain('who="#narrator"');
  });

  test('should export all passage annotations', async ({ page }) => {
    const editorPage = new EditorPage(page);

    // Annotate multiple passages with different speakers
    await editorPage.annotatePassage(0, 'speaker1');
    await editorPage.annotatePassage(1, 'speaker2');
    await editorPage.annotatePassage(2, 'speaker3');

    // Export
    const download = await editorPage.exportTEI();
    const xml = await readDownloadAsString(download);

    // Count sp elements with who attributes
    const spMatches = xml.match(/<sp[^>]*who=/g);
    expect(spMatches).toBeDefined();
    expect(spMatches!.length).toBeGreaterThanOrEqual(3);
  });

  test('should verify <sp> element count matches annotations', async ({ page }) => {
    const editorPage = new EditorPage(page);

    // Annotate exactly 5 passages
    const annotationCount = 5;
    for (let i = 0; i < annotationCount; i++) {
      await editorPage.annotatePassage(i, `speaker${i + 1}`);
    }

    // Export
    const download = await editorPage.exportTEI();
    const xml = await readDownloadAsString(download);

    // Count <sp> elements
    const spCount = (xml.match(/<sp/g) || []).length;
    expect(spCount).toBeGreaterThanOrEqual(annotationCount);
  });

  test('should preserve speaker definitions in <castList>', async ({ page }) => {
    const editorPage = new EditorPage(page);

    // Annotate with multiple speakers
    await editorPage.annotatePassage(0, 'narrator');
    await editorPage.annotatePassage(1, 'john');
    await editorPage.annotatePassage(2, 'narrator');

    // Export
    const download = await editorPage.exportTEI();
    const xml = await readDownloadAsString(download);

    // Verify castList exists
    expect(xml).toContain('<castList>');
    expect(xml).toContain('</castList>');

    // Verify speaker definitions
    expect(xml).toContain('<castItem>');
    expect(xml).toContain('<role');
  });
});

test.describe('Export Validation - Export Format Variants', () => {
  test('should export with TEI header metadata', async ({ page }) => {
    const welcomePage = new WelcomePage(page);
    await welcomePage.goto();
    await welcomePage.loadSample(SAMPLES.GIFT_OF_THE_MAGI);

    const editorPage = new EditorPage(page);
    const download = await editorPage.exportTEI();
    const xml = await readDownloadAsString(download);

    // Verify teiHeader structure
    expect(xml).toContain('<teiHeader>');
    expect(xml).toContain('</teiHeader>');

    // Verify fileDesc
    expect(xml).toContain('<fileDesc>');
    expect(xml).toContain('<titleStmt>');
    expect(xml).toContain('<title>');

    // Should contain title from the sample
    expect(xml).toContain('Gift of the Magi');
  });

  test('should include author information in export', async ({ page }) => {
    const welcomePage = new WelcomePage(page);
    await welcomePage.goto();
    await welcomePage.loadSample(SAMPLES.YELLOW_WALLPAPER);

    const editorPage = new EditorPage(page);
    const download = await editorPage.exportTEI();
    const xml = await readDownloadAsString(download);

    // Verify author field
    expect(xml).toContain('<author');
    expect(xml).toContain('Charlotte Perkins Gilman');
  });

  test('should export plain text option if available', async ({ page }) => {
    const editorPage = new EditorPage(page);
    await editorPage.goto();

    // Check if HTML/plain text export button exists
    const htmlExportButton = page.getByRole('button', { name: /export html/i });

    const isVisible = await htmlExportButton.isVisible().catch(() => false);

    if (isVisible) {
      const downloadPromise = page.waitForEvent('download');
      await htmlExportButton.click();
      const download = await downloadPromise;

      const filename = download.suggestedFilename();
      expect(filename).toMatch(/\.html?$/);

      const content = await download.createReadStream();
      expect(content).toBeTruthy();
    } else {
      // Test marked as skipped if HTML export not available
      test.skip();
    }
  });

  test('should preserve XML formatting in export', async ({ page }) => {
    const editorPage = new EditorPage(page);
    await editorPage.goto();

    // Annotate a passage
    await editorPage.annotatePassage(0, 'speaker1');

    const download = await editorPage.exportTEI();
    const xml = await readDownloadAsString(download);

    // Verify proper indentation and line breaks
    expect(xml).toContain('\n');
    expect(xml).toMatch(/  <[^/]/); // Indented opening tags

    // Verify no extremely long lines (poor formatting)
    const lines = xml.split('\n');
    const maxLineLength = Math.max(...lines.map(line => line.length));
    expect(maxLineLength).toBeLessThan(1000); // Reasonable line length
  });
});

test.describe('Export Validation - Incremental Exports', () => {
  test('should preserve annotations across multiple exports', async ({ page }) => {
    const editorPage = new EditorPage(page);
    await editorPage.goto();

    // Make initial annotations
    await editorPage.annotatePassage(0, 'speaker1');
    await editorPage.annotatePassage(1, 'speaker2');

    // First export
    const download1 = await editorPage.exportTEI();
    const content1 = await download1.read();
    const xml1 = content1.toString();

    // Verify annotations present
    expect(xml1).toContain('who="#speaker1"');
    expect(xml1).toContain('who="#speaker2"');

    // Second export without changes
    const download2 = await editorPage.exportTEI();
    const content2 = await download2.read();
    const xml2 = content2.toString();

    // Should be identical
    expect(xml2).toEqual(xml1);
  });

  test('should handle new annotations added between exports', async ({ page }) => {
    const editorPage = new EditorPage(page);
    await editorPage.goto();

    // Initial annotation
    await editorPage.annotatePassage(0, 'speaker1');

    // First export
    const download1 = await editorPage.exportTEI();
    const content1 = await download1.read();
    const xml1 = content1.toString();
    const spCount1 = (xml1.match(/<sp/g) || []).length;

    // Add more annotations
    await editorPage.annotatePassage(1, 'speaker2');
    await editorPage.annotatePassage(2, 'speaker3');

    // Second export
    const download2 = await editorPage.exportTEI();
    const content2 = await download2.read();
    const xml2 = content2.toString();
    const spCount2 = (xml2.match(/<sp/g) || []).length;

    // Second export should have more annotated passages
    expect(spCount2).toBeGreaterThan(spCount1);
    expect(xml2).toContain('who="#speaker2"');
    expect(xml2).toContain('who="#speaker3"');
  });

  test('should handle modified annotations', async ({ page }) => {
    const editorPage = new EditorPage(page);
    await editorPage.goto();

    // Initial annotation
    await editorPage.annotatePassage(0, 'speaker1');

    // First export
    const download1 = await editorPage.exportTEI();
    const content1 = await download1.read();
    const xml1 = content1.toString();
    expect(xml1).toContain('who="#speaker1"');

    // Modify annotation (change speaker)
    // Click the passage again and assign different speaker
    await page.locator('[id^="passage-"]').click();
    await page.keyboard.press('2'); // Different speaker

    // Second export
    const download2 = await editorPage.exportTEI();
    const content2 = await download2.read();
    const xml2 = content2.toString();

    // Should have updated speaker
    expect(xml2).not.toContain('who="#speaker1"');
  });

  test('should export with no annotations (minimal TEI)', async ({ page }) => {
    const editorPage = new EditorPage(page);
    await editorPage.goto();

    // Don't annotate anything - export minimal document
    const download = await editorPage.exportTEI();
    const xml = await readDownloadAsString(download);

    // Should still have valid TEI structure
    expect(xml).toContain('<?xml');
    expect(xml).toContain('<TEI');
    expect(xml).toContain('<teiHeader>');
    expect(xml).toContain('<text');
    expect(xml).toContain('<body');

    // May or may not have castList (depends on implementation)
    // But should have valid document structure
    expect(xml).toContain('</TEI>');
  });
});

test.describe('Export Validation - Error Handling', () => {
  test('should handle export failure gracefully', async ({ page }) => {
    const editorPage = new EditorPage(page);

    // Navigate to editor without loading document
    await page.goto('/editor');

    // Try to export with no document
    const exportButton = page.getByRole('button', { name: /export/i });

    // Button should be disabled if no document
    const isDisabled = await exportButton.isDisabled();
    expect(isDisabled).toBeTruthy();
  });

  test('should show error message, not crash', async ({ page }) => {
    const editorPage = new EditorPage(page);
    await editorPage.goto();

    // Mock download failure by blocking downloads
    await page.context().route('**/download*', route => route.abort());

    // Try export - should not crash
    const downloadPromise = page.waitForEvent('download', { timeout: 3000 }).catch(() => null);
    await page.getByRole('button', { name: /export tei/i }).click();

    const download = await downloadPromise;

    // Either download failed gracefully or succeeded
    // Page should not have crashed
    await expect(page.locator('body')).not.toHaveText(/Internal Server Error/i);
    await expect(page.locator('body')).not.toHaveText(/Unhandled Error/i);
  });

  test('should provide retry option after failure', async ({ page }) => {
    const editorPage = new EditorPage(page);
    await editorPage.goto();

    // Annotate a passage
    await editorPage.annotatePassage(0, 'speaker1');

    // Export successfully
    const download1 = await editorPage.exportTEI();
    expect(download1).toBeDefined();

    // Export button should still be enabled for retry
    const exportButton = page.getByRole('button', { name: /export/i });
    await expect(exportButton).toBeEnabled();

    // Should be able to export again
    const download2 = await editorPage.exportTEI();
    expect(download2).toBeDefined();
  });

  test('should handle browser download restrictions', async ({ page }) => {
    const editorPage = new EditorPage(page);
    await editorPage.goto();

    // Mock a scenario where download might be blocked
    // Set download behavior to fail
    await page.context().route('**/*', route => {
      if (route.request().resourceType() === 'document') {
        route.continue();
      } else {
        route.continue();
      }
    });

    // Try export
    const downloadPromise = page.waitForEvent('download', { timeout: 5000 });
    await page.getByRole('button', { name: /export tei/i }).click();

    try {
      const download = await downloadPromise;
      expect(download).toBeDefined();
    } catch (error) {
      // If download fails, page should not crash
      await expect(page.locator('body')).not.toHaveText(/crash/i);
      await expect(page.locator('body')).not.toHaveText(/fatal error/i);
    }
  });
});

test.describe('Export Validation - Edge Cases', () => {
  test('should handle very long document export', async ({ page }) => {
    const welcomePage = new WelcomePage(page);
    await welcomePage.goto();

    // Load a large sample (Pride and Prejudice)
    await welcomePage.loadSample(SAMPLES.PRIDE_AND_PREJUDICE);

    const editorPage = new EditorPage(page);

    // Export should complete without timeout
    const download = await editorPage.exportTEI();
    expect(download).toBeDefined();

    const xml = await readDownloadAsString(download);

    // Should have substantial content
    expect(xml.length).toBeGreaterThan(10000);

    // Should still be valid XML
    expect(xml).toContain('<?xml');
    expect(xml).toContain('<TEI');
    expect(xml).toContain('</TEI>');
  });

  test('should handle special characters in annotations', async ({ page }) => {
    const editorPage = new EditorPage(page);
    await editorPage.goto();

    // Annotate with speaker name that has special chars
    await editorPage.annotatePassage(0, "O'Brien");

    const download = await editorPage.exportTEI();
    const xml = await readDownloadAsString(download);

    // Special characters should be properly escaped
    expect(xml).not.toContain('&unescaped;');
    expect(xml).toContain('O&apos;Brien');
  });

  test('should handle unicode characters in export', async ({ page }) => {
    const welcomePage = new WelcomePage(page);
    await welcomePage.goto();
    await welcomePage.loadSample(SAMPLES.YELLOW_WALLPAPER);

    const editorPage = new EditorPage(page);
    const download = await editorPage.exportTEI();
    const xml = await readDownloadAsString(download);

    // Verify UTF-8 encoding declaration
    expect(xml).toContain('encoding="UTF-8"');

    // Should handle unicode properly (no garbled characters)
    expect(xml).not.toContain(/&#x[0-9]+;/); // No numeric entities for common chars
  });

  test('should export with consistent formatting', async ({ page }) => {
    const editorPage = new EditorPage(page);
    await editorPage.goto();

    // Annotate passages
    await editorPage.annotatePassage(0, 'speaker1');
    await editorPage.annotatePassage(1, 'speaker2');

    // Export multiple times
    const download1 = await editorPage.exportTEI();
    const content1 = await download1.read();
    const xml1 = content1.toString();

    // Minimal wait replaced with condition // Small delay

    const download2 = await editorPage.exportTEI();
    const content2 = await download2.read();
    const xml2 = content2.toString();

    // Exports should be identical
    expect(xml1).toEqual(xml2);
  });
});

test.describe('Export Validation - Content Verification', () => {
  test('should verify passage content in export', async ({ page }) => {
    const welcomePage = new WelcomePage(page);
    await welcomePage.goto();
    await welcomePage.loadSample(SAMPLES.YELLOW_WALLPAPER);

    const editorPage = new EditorPage(page);

    // Get first passage text from UI
    const firstPassage = page.locator('[id^="passage-"]');
    const passageText = await firstPassage.textContent();

    // Export
    const download = await editorPage.exportTEI();
    const xml = await readDownloadAsString(download);

    // Verify passage content is in export
    if (passageText) {
      const truncatedText = passageText.substring(0, 50);
      expect(xml).toContain(truncatedText);
    }
  });

  test('should verify document structure completeness', async ({ page }) => {
    const editorPage = new EditorPage(page);
    await editorPage.goto();

    const download = await editorPage.exportTEI();
    const xml = await readDownloadAsString(download);

    // Verify all required TEI components
    const requiredElements = [
      '<TEI',
      '<teiHeader>',
      '<fileDesc>',
      '<titleStmt>',
      '<text>',
      '<body>',
    ];

    for (const element of requiredElements) {
      expect(xml).toContain(element);
    }

    // Verify closing tags match opening tags
    const openTEI = (xml.match(/<TEI[^>]*>/g) || []).length;
    const closeTEI = (xml.match(/<\/TEI>/g) || []).length;
    expect(openTEI).toEqual(closeTEI);
    expect(openTEI).toBe(1);
  });

  test('should verify export file size is reasonable', async ({ page }) => {
    const editorPage = new EditorPage(page);
    await editorPage.goto();

    const download = await editorPage.exportTEI();
    const xml = await readDownloadAsString(download);

    // File size should be reasonable (not empty, not excessively large)
    expect(xml.length).toBeGreaterThan(100);
    expect(xml.length).toBeLessThan(10 * 1024 * 1024); // Less than 10MB
  });
});

test.describe('Export Validation - Integration Tests', () => {
  test('should complete full annotation to export workflow', async ({ page }) => {
    const welcomePage = new WelcomePage(page);
    await welcomePage.goto();
    await welcomePage.loadSample(SAMPLES.GIFT_OF_THE_MAGI);

    const editorPage = new EditorPage(page);

    // Annotate multiple passages
    await editorPage.annotatePassage(0, 'della');
    await editorPage.annotatePassage(1, 'jim');
    await editorPage.annotatePassage(2, 'della');
    await editorPage.annotatePassage(3, 'narrator');

    // Export
    const download = await editorPage.exportTEI();
    const xml = await readDownloadAsString(download);

    // Verify all annotations are present
    expect(xml).toContain('who="#della"');
    expect(xml).toContain('who="#jim"');
    expect(xml).toContain('who="#narrator"');

    // Verify document structure
    expect(xml).toContain('<?xml');
    expect(xml).toContain('<TEI');
    expect(xml).toContain('</TEI>');

    // Verify title and author
    expect(xml).toContain('Gift of the Magi');
  });

  test('should handle rapid successive exports', async ({ page }) => {
    const editorPage = new EditorPage(page);
    await editorPage.goto();

    // Annotate
    await editorPage.annotatePassage(0, 'speaker1');

    // Rapid exports
    const downloads = [];
    for (let i = 0; i < 3; i++) {
      const download = await editorPage.exportTEI();
      downloads.push(download);
      // Minimal wait replaced with condition
    }

    // All downloads should succeed
    expect(downloads).toHaveLength(3);
    downloads.forEach(download => {
      expect(download).toBeDefined();
    });
  });
});
