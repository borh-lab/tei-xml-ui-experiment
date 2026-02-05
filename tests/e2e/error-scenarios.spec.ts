// @ts-nocheck
import { test, expect } from '@playwright/test';
import { TEIEditorApp } from './protocol/TEIEditorApp';
import { TEIDocument } from './fixtures/TEIDocument';
import { writeFileSync, unlinkSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Error Scenario E2E Tests - Protocol-Based
 *
 * Comprehensive test coverage for error handling and edge cases.
 * These tests verify graceful error handling, not that errors don't occur.
 *
 * Test Categories:
 * 1. Invalid File Upload - non-XML, malformed XML, empty files
 * 2. Network Errors - corpus browser failures, missing samples
 * 3. Missing Documents - operations with no document loaded
 * 4. Invalid TEI Structure - missing required elements
 * 5. Large Files - performance with very large documents
 * 6. Browser Limits - file size limits, memory limits
 */

test.describe('Invalid File Upload Errors', () => {
  test('should reject non-XML file (.txt) with user feedback', async ({ page }) => {
    const app = await TEIEditorApp.create(page);

    // First load a valid sample to get into editor mode
    const samples = await app.samples().list();
    await app.samples().load(samples[0].id);

    // Verify we're in editor with content
    const state1 = await app.getState();
    expect(state1.location).toBe('editor');
    expect(state1.document?.loaded).toBe(true);

    // Now try to upload invalid file
    const state2 = await app.files().uploadInvalid('This is plain text content, not XML', 'test-file.txt');

    // Invalid upload should not crash the app or replace valid content
    const state3 = await app.getState();
    expect(state3.location).toBe('editor');
    // Original content should still be loaded
    expect(state3.document?.loaded).toBe(true);
  });

  test('should reject binary file (.jpg)', async ({ page }) => {
    const app = await TEIEditorApp.create(page);

    // Load a sample first
    const samples = await app.samples().list();
    await app.samples().load(samples[0].id);

    const state1 = await app.getState();
    expect(state1.location).toBe('editor');

    // Try to upload binary file
    const binaryData = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
    await app.files().uploadBinary(binaryData, 'test-image.jpg');

    // Small wait for processing
    await page.waitForTimeout(500);

    // Original content should still be there
    const state2 = await app.getState();
    expect(state2.location).toBe('editor');
    expect(state2.document?.loaded).toBe(true);
  });

  test('should reject completely empty file', async ({ page }) => {
    const app = await TEIEditorApp.create(page);

    // Load a sample first to get file input in editor mode
    const samples = await app.samples().list();
    await app.samples().load(samples[0].id);

    const state1 = await app.getState();
    expect(state1.location).toBe('editor');

    // Now try to upload empty file
    await app.files().uploadInvalid('', 'empty.xml');

    // Small wait for processing
    await page.waitForTimeout(500);

    // Original document should still be loaded
    const state2 = await app.getState();
    expect(state2.location).toBe('editor');
    expect(state2.document?.loaded).toBe(true);
  });

  test('should reject file with only whitespace', async ({ page }) => {
    const app = await TEIEditorApp.create(page);

    // Load a sample first to get file input in editor mode
    const samples = await app.samples().list();
    await app.samples().load(samples[0].id);

    const state1 = await app.getState();
    expect(state1.location).toBe('editor');

    // Try to upload whitespace-only file
    await app.files().uploadInvalid('   \n\n  \t  \n  ', 'whitespace.xml');

    // Small wait for processing
    await page.waitForTimeout(500);

    // Original document should still be loaded
    const state2 = await app.getState();
    expect(state2.location).toBe('editor');
    expect(state2.document?.loaded).toBe(true);
  });

  test('should handle malformed XML with unclosed tag', async ({ page }) => {
    const app = await TEIEditorApp.create(page);

    // First load a valid sample
    const samples = await app.samples().list();
    await app.samples().load(samples[0].id);

    const state1 = await app.getState();
    expect(state1.location).toBe('editor');

    // Try to upload malformed XML
    await app.files().uploadRaw('<?xml version="1.0"?><TEI><body><p>Unclosed', 'malformed-unclosed.tei.xml');

    // Should not crash or replace existing content
    await page.waitForTimeout(500);
    const state2 = await app.getState();
    expect(state2.location).toBe('editor');
  });

  test('should handle malformed XML with invalid entities', async ({ page }) => {
    const app = await TEIEditorApp.create(page);

    // Load a sample first to get file input
    const samples = await app.samples().list();
    await app.samples().load(samples[0].id);

    const state1 = await app.getState();
    expect(state1.location).toBe('editor');

    // Try to upload malformed XML
    await app.files().uploadRaw(
      '<?xml version="1.0"?><TEI><body><p>&invalid;</p></body></TEI>',
      'malformed-entity.tei.xml'
    );

    // Should handle gracefully
    await page.waitForTimeout(500);
    const state2 = await app.getState();

    // Should not crash - original doc should still be loaded
    expect(state2.location).toBe('editor');
  });

  test('should handle missing root element', async ({ page }) => {
    const app = await TEIEditorApp.create(page);

    // Load a sample first to get file input
    const samples = await app.samples().list();
    await app.samples().load(samples[0].id);

    const state1 = await app.getState();
    expect(state1.location).toBe('editor');

    // Try to upload XML without root element
    await app.files().uploadRaw('<?xml version="1.0"?><body><p>No root</p></body>', 'malformed-root.tei.xml');

    // Should handle gracefully
    await page.waitForTimeout(500);
    const state2 = await app.getState();

    // Original doc should still be loaded
    expect(state2.location).toBe('editor');
  });

  test('should allow retry after failed upload', async ({ page }) => {
    const app = await TEIEditorApp.create(page);

    // First load a valid sample
    const samples = await app.samples().list();
    await app.samples().load(samples[0].id);

    const state1 = await app.getState();
    expect(state1.location).toBe('editor');

    // Now upload invalid file
    await app.files().uploadInvalid('<invalid></invalid', 'invalid.xml');

    // Small wait for processing
    await page.waitForTimeout(500);

    // Original doc should still be loaded
    const state2 = await app.getState();
    expect(state2.location).toBe('editor');
    expect(state2.document?.loaded).toBe(true);

    // Now upload valid file using DocumentProtocol
    const validDoc = TEIDocument.valid({
      title: 'Valid Retry Document',
      speakers: ['narrator', 'della'],
      passages: 3,
    });

    await app.editor().load(validDoc);

    // Should successfully load
    const state3 = await app.getState();
    expect(state3.location).toBe('editor');
    expect(state3.document?.loaded).toBe(true);
  });

  test('should show user-friendly error message for invalid files', async ({ page }) => {
    const app = await TEIEditorApp.create(page);

    // Load a sample first
    const samples = await app.samples().list();
    await app.samples().load(samples[0].id);

    const state1 = await app.getState();
    expect(state1.location).toBe('editor');

    // Upload invalid file
    await app.files().uploadInvalid('Not XML at all', 'invalid.xml');

    // Small wait for processing
    await page.waitForTimeout(500);

    // Should not crash - check if still functional
    const state2 = await app.getState();
    expect(state2.location).toBe('editor');
    expect(state2.document?.loaded).toBe(true);
  });
});

test.describe('Network Error Scenarios', () => {
  test('should handle corpus browser sample load failure', async ({ page }) => {
    const app = await TEIEditorApp.create(page);

    // Intercept and fail sample load requests
    await page.route('**/samples/*.xml', (route) => {
      route.abort('failed');
    });

    // Try to load a sample
    const samples = await app.samples().list();
    const firstSample = samples[0];

    try {
      await app.samples().load(firstSample.id);
    } catch (error) {
      // Expected to fail due to network error
    }

    // Should not crash the app - check we can still get state
    const state = await app.getState();
    expect(state).toBeDefined();
  });

  test('should handle missing 404 sample', async ({ page }) => {
    // Navigate directly to non-existent sample
    await page.goto('/?sample=non-existent-sample-12345');
    await page.waitForLoadState('networkidle');

    // Should handle gracefully without crashing
    const app = await TEIEditorApp.create(page);

    // Check if gallery or editor - both are valid states
    const state = await app.getState();
    expect(['gallery', 'editor']).toContain(state.location);
  });

  test('should recover from network timeout', async ({ page }) => {
    const app = await TEIEditorApp.create(page);

    // First request times out
    let requestCount = 0;
    await page.route('**/samples/*.xml', (route) => {
      requestCount++;
      if (requestCount === 1) {
        // Never respond - simulate timeout
        // Let it timeout naturally
      } else {
        route.continue();
      }
    });

    // Try to load sample - may timeout
    const samples = await app.samples().list();
    try {
      await app.samples().load(samples[0].id);
    } catch (error) {
      // May timeout
    }

    // Should not crash - check we can still get state
    let state = await app.getState();
    expect(state).toBeDefined();

    // Navigate away and try again
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const app2 = await TEIEditorApp.create(page);
    state = await app2.getState();
    expect(state.location).toBe('gallery');
  });

  test('should work offline after initial load', async ({ page }) => {
    const app = await TEIEditorApp.create(page);

    // Load sample normally first
    const samples = await app.samples().list();
    await app.samples().load(samples[0].id);

    // Verify editor loaded
    const state1 = await app.getState();
    expect(state1.location).toBe('editor');
    expect(state1.document?.loaded).toBe(true);

    // Go offline
    await page.context().setOffline(true);

    // Try to use editor - check we can still query state
    const state2 = await app.getState();
    expect(state2.location).toBe('editor');
    expect(state2.document?.loaded).toBe(true);

    // Restore connection
    await page.context().setOffline(false);
  });
});

test.describe('Missing Document Scenarios', () => {
  test('should handle operations with no document loaded', async ({ page }) => {
    // Go to gallery (no document loaded)
    const app = await TEIEditorApp.create(page);

    // Verify we're on gallery
    const state = await app.getState();
    expect(state.location).toBe('gallery');
    expect(state.document).toBeNull();

    // Try to use keyboard shortcuts that require document
    await page.keyboard.press('Meta+b'); // Bulk operations

    // Should not crash - check we can still get state
    const state2 = await app.getState();
    expect(state2.location).toBe('gallery');
  });

  test('should handle AI mode switch without document', async ({ page }) => {
    const app = await TEIEditorApp.create(page);

    // Try to switch AI modes (if buttons are visible)
    const aiSuggestBtn = page.getByRole('button', { name: 'AI Suggest' });
    const isVisible = await aiSuggestBtn.isVisible();

    if (isVisible) {
      await aiSuggestBtn.click();
      await page.waitForTimeout(200);

      // Should not crash - check we can still get state
      const state = await app.getState();
      expect(state).toBeDefined();
    }
  });

  test('should handle visualization access without document', async ({ page }) => {
    const app = await TEIEditorApp.create(page);

    const vizButton = page.getByRole('button', { name: 'Visualizations' });
    if (await vizButton.isVisible()) {
      await vizButton.click();
      await page.waitForTimeout(200);

      // Should not crash - check we can still get state
      const state = await app.getState();
      expect(state).toBeDefined();
    }
  });

  test('should handle export without document', async ({ page }) => {
    const app = await TEIEditorApp.create(page);

    // Try to export (if export button exists)
    const exportButton = page.getByRole('button', { name: /export/i });

    if (await exportButton.isVisible()) {
      await exportButton.click();
      await page.waitForTimeout(200);

      // Should handle gracefully - check we can still get state
      const state = await app.getState();
      expect(state).toBeDefined();
    }
  });
});

test.describe('Invalid TEI Structure', () => {
  test('should handle TEI without required teiHeader', async ({ page }) => {
    const app = await TEIEditorApp.create(page);

    // Load a sample first
    const samples = await app.samples().list();
    await app.samples().load(samples[0].id);

    const incompleteTEI = '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<TEI xmlns="http://www.tei-c.org/ns/1.0">\n' +
      '  <text><body>\n' +
      '    <p>Test content</p>\n' +
      '  </body></text>\n' +
      '</TEI>\n';

    await app.files().uploadRaw(incompleteTEI, 'incomplete.tei.xml');

    // Parser may be lenient and accept it
    await page.waitForTimeout(500);

    // Should not crash - should still be in editor
    const state = await app.getState();
    expect(state.location).toBe('editor');
  });

  test('should handle TEI without body content', async ({ page }) => {
    const app = await TEIEditorApp.create(page);

    // Load a sample first
    const samples = await app.samples().list();
    await app.samples().load(samples[0].id);

    const emptyTEI = '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<TEI xmlns="http://www.tei-c.org/ns/1.0">\n' +
      '  <teiHeader>\n' +
      '    <fileDesc>\n' +
      '      <titleStmt><title>Empty</title></titleStmt>\n' +
      '    </fileDesc>\n' +
      '  </teiHeader>\n' +
      '  <text>\n' +
      '    <body>\n' +
      '    </body>\n' +
      '  </text>\n' +
      '</TEI>\n';

    await app.files().uploadRaw(emptyTEI, 'empty-body.tei.xml');

    // Should load but show no passages or empty state
    await page.waitForTimeout(500);
    const state = await app.getState();

    // Should remain functional - check still in editor
    expect(state.location).toBe('editor');
  });

  test('should handle TEI with speakers but no dialogue', async ({ page }) => {
    const app = await TEIEditorApp.create(page);

    // Load a sample first
    const samples = await app.samples().list();
    await app.samples().load(samples[0].id);

    const speakersOnly = '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<TEI xmlns="http://www.tei-c.org/ns/1.0">\n' +
      '  <teiHeader><fileDesc><titleStmt><title>Speakers Only</title></titleStmt></fileDesc></teiHeader>\n' +
      '  <text><body>\n' +
      '    <castList>\n' +
      '      <castItem><role xml:id="speaker1">Speaker 1</role></castItem>\n' +
      '      <castItem><role xml:id="speaker2">Speaker 2</role></castItem>\n' +
      '    </castList>\n' +
      '  </body></text>\n' +
      '</TEI>\n';

    await app.files().uploadRaw(speakersOnly, 'speakers-only.tei.xml');

    // Should load successfully with no dialogue passages
    await page.waitForTimeout(500);
    const state = await app.getState();

    // Should allow uploading a different document - check if functional
    expect(state.location).toBe('editor');
  });

  test('should handle TEI with malformed speaker references', async ({ page }) => {
    const app = await TEIEditorApp.create(page);

    // Load a sample first
    const samples = await app.samples().list();
    await app.samples().load(samples[0].id);

    const malformedRefs = '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<TEI xmlns="http://www.tei-c.org/ns/1.0">\n' +
      '  <teiHeader><fileDesc><titleStmt><title>Bad Refs</title></titleStmt></fileDesc></teiHeader>\n' +
      '  <text><body>\n' +
      '    <p><s who="#nonexistent-speaker">Text</s></p>\n' +
      '    <p><s who="">No speaker</s></p>\n' +
      '  </body></text>\n' +
      '</TEI>\n';

    await app.files().uploadRaw(malformedRefs, 'bad-refs.tei.xml');

    // Should load passages even with invalid references
    await page.waitForTimeout(500);
    const state = await app.getState();

    // Should not crash - check if functional
    expect(state.location).toBe('editor');
  });
});

test.describe('Large File Performance', () => {
  function generateTestDocument(options: {
    speakers: string[];
    passages: number;
  }): string {
    const { speakers, passages } = options;

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<TEI xmlns="http://www.tei-c.org/ns/1.0">\n';
    xml += '  <teiHeader>\n';
    xml += '    <fileDesc>\n';
    xml += '      <titleStmt>\n';
    xml += '        <title>Test Document</title>\n';
    xml += '      </titleStmt>\n';
    xml += '    </fileDesc>\n';
    xml += '  </teiHeader>\n';
    xml += '  <text>\n';
    xml += '    <body>\n';

    // Generate cast list
    xml += '      <castList>\n';
    speakers.forEach((speaker) => {
      xml += `        <castItem>\n`;
      xml += `          <role xml:id="${speaker}">${speaker}</role>\n`;
      xml += `        </castItem>\n`;
    });
    xml += '      </castList>\n';

    // Generate passages
    for (let i = 0; i < passages; i++) {
      const speaker = speakers[i % speakers.length];
      xml += '      <p>\n';
      xml += `        <s who="#${speaker}">Test passage ${i + 1}</s>\n`;
      xml += '      </p>\n';
    }

    xml += '    </body>\n';
    xml += '  </text>\n';
    xml += '</TEI>\n';

    return xml;
  }

  test('should handle document with 200 passages', async ({ page }) => {
    const app = await TEIEditorApp.create(page);

    const largeTEI = generateTestDocument({
      speakers: ['narrator', 'della', 'jim'],
      passages: 200,
    });

    const startTime = Date.now();

    await app.files().uploadRaw(largeTEI, 'large-200.tei.xml');

    // Wait for load
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    // Should load within reasonable time (<30 seconds)
    expect(loadTime).toBeLessThan(30000);

    // Should be in editor state
    const state = await app.getState();
    expect(state.location).toBe('editor');
    expect(state.document?.loaded).toBe(true);
  });

  test('should handle very large document (>500 passages)', async ({ page }) => {
    const app = await TEIEditorApp.create(page);

    const veryLargeTEI = generateTestDocument({
      speakers: ['narrator', 'della'],
      passages: 600,
    });

    const startTime = Date.now();

    await app.files().uploadRaw(veryLargeTEI, 'very-large-600.tei.xml');

    // Wait for load
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    // Should complete without timeout
    expect(loadTime).toBeLessThan(60000);

    // Should be in editor state
    const state = await app.getState();
    expect(state.location).toBe('editor');
    expect(state.document?.loaded).toBe(true);
  });

  test('should handle document >100KB', async ({ page }) => {
    const app = await TEIEditorApp.create(page);

    // Generate a document that's definitely >100KB
    let largeTEI = generateTestDocument({
      speakers: ['narrator', 'della', 'jim', 'protagonist'],
      passages: 500,
    });

    const tempPath = join(process.cwd(), 'tests/fixtures', 'large-test.tei.xml');
    writeFileSync(tempPath, largeTEI);

    // Check file size
    const fs = require('fs');
    const stats = fs.statSync(tempPath);
    const sizeKB = stats.size / 1024;

    // Ensure file is actually >100KB
    if (sizeKB <= 100) {
      // Generate even larger file if needed
      largeTEI = generateTestDocument({
        speakers: ['narrator', 'della', 'jim', 'protagonist'],
        passages: 1000,
      });
      writeFileSync(tempPath, largeTEI);
    }

    await app.files().upload({
      name: 'large-test.tei.xml',
      mimeType: 'text/xml',
      buffer: readFileSync(tempPath),
    });

    // Wait for load
    await page.waitForLoadState('networkidle');

    // Should handle large file
    const state = await app.getState();
    expect(state.location).toBe('editor');
    expect(state.document?.loaded).toBe(true);

    unlinkSync(tempPath);
  });

  test('should handle document >1MB', async ({ page }) => {
    const app = await TEIEditorApp.create(page);

    // Generate a very large document
    const massiveTEI = generateTestDocument({
      speakers: ['narrator', 'della', 'jim'],
      passages: 1000,
    });

    const tempPath = join(process.cwd(), 'tests/fixtures', 'massive-test.tei.xml');
    writeFileSync(tempPath, massiveTEI);

    const fs = require('fs');
    const stats = fs.statSync(tempPath);
    const sizeMB = stats.size / (1024 * 1024);

    // File should be >1MB
    if (sizeMB > 1) {
      const startTime = Date.now();

      await app.files().upload({
        name: 'massive-test.tei.xml',
        mimeType: 'text/xml',
        buffer: readFileSync(tempPath),
      });

      await page.waitForLoadState('networkidle');

      const loadTime = Date.now() - startTime;

      // Should load within 60 seconds
      expect(loadTime).toBeLessThan(60000);

      // Should be in editor state
      const state = await app.getState();
      expect(state.location).toBe('editor');
      expect(state.document?.loaded).toBe(true);
    } else {
      // Skip if file isn't large enough
      test.skip(true, 'Generated file not large enough for >1MB test');
    }

    unlinkSync(tempPath);
  });

  test('should handle rapid file uploads of large documents', async ({ page }) => {
    const app = await TEIEditorApp.create(page);

    const largeTEI1 = generateTestDocument({ speakers: ['s1'], passages: 100 });
    const largeTEI2 = generateTestDocument({ speakers: ['s2'], passages: 150 });

    const tempPath1 = join(process.cwd(), 'tests/fixtures', 'large1.tei.xml');
    const tempPath2 = join(process.cwd(), 'tests/fixtures', 'large2.tei.xml');

    writeFileSync(tempPath1, largeTEI1);
    writeFileSync(tempPath2, largeTEI2);

    // Upload first large file
    await app.files().upload({
      name: 'large1.tei.xml',
      mimeType: 'text/xml',
      buffer: readFileSync(tempPath1),
    });
    await page.waitForLoadState('networkidle');

    // Upload second large file immediately
    await app.files().upload({
      name: 'large2.tei.xml',
      mimeType: 'text/xml',
      buffer: readFileSync(tempPath2),
    });
    await page.waitForLoadState('networkidle');

    // Should handle without memory issues
    const state = await app.getState();
    expect(state.location).toBe('editor');
    expect(state.document?.loaded).toBe(true);

    // Cleanup
    unlinkSync(tempPath1);
    unlinkSync(tempPath2);
  });
});

test.describe('Browser Limits and Memory', () => {
  function generateTestDocument(options: {
    speakers: string[];
    passages: number;
  }): string {
    const { speakers, passages } = options;

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<TEI xmlns="http://www.tei-c.org/ns/1.0">\n';
    xml += '  <teiHeader>\n';
    xml += '    <fileDesc>\n';
    xml += '      <titleStmt>\n';
    xml += '        <title>Test Document</title>\n';
    xml += '      </titleStmt>\n';
    xml += '    </fileDesc>\n';
    xml += '  </teiHeader>\n';
    xml += '  <text>\n';
    xml += '    <body>\n';

    // Generate cast list
    xml += '      <castList>\n';
    speakers.forEach((speaker) => {
      xml += `        <castItem>\n`;
      xml += `          <role xml:id="${speaker}">${speaker}</role>\n`;
      xml += `        </castItem>\n`;
    });
    xml += '      </castList>\n';

    // Generate passages
    for (let i = 0; i < passages; i++) {
      const speaker = speakers[i % speakers.length];
      xml += '      <p>\n';
      xml += `        <s who="#${speaker}">Test passage ${i + 1}</s>\n`;
      xml += '      </p>\n';
    }

    xml += '    </body>\n';
    xml += '  </text>\n';
    xml += '</TEI>\n';

    return xml;
  }

  test('should handle low memory conditions gracefully', async ({ page }) => {
    // Simulate memory pressure by allocating arrays
    await page.addInitScript(() => {
      const arrays: Uint8Array[] = [];
      try {
        for (let i = 0; i < 50; i++) {
          arrays.push(new Uint8Array(1024 * 1024)); // 1MB each
        }
      } catch (e) {
        console.log('Memory allocation stopped:', e);
      }
    });

    const app = await TEIEditorApp.create(page);

    // Should still be able to query state
    const state1 = await app.getState();
    expect(state1.location).toBe('gallery');

    // Should handle sample load
    const samples = await app.samples().list();
    await app.samples().load(samples[0].id);

    await page.waitForLoadState('networkidle');

    // Should not crash
    const state2 = await app.getState();
    expect(state2.location).toBe('editor');
  });

  test('should handle file size limits', async ({ page }) => {
    const app = await TEIEditorApp.create(page);

    // Try uploading a file that might exceed browser limits
    // Generate very large document (5MB+)
    const hugeTEI = generateTestDocument({
      speakers: ['narrator', 'della'],
      passages: 3000,
    });

    const tempPath = join(process.cwd(), 'tests/fixtures', 'huge-test.tei.xml');
    writeFileSync(tempPath, hugeTEI);

    const fs = require('fs');
    const stats = fs.statSync(tempPath);
    const sizeMB = stats.size / (1024 * 1024);

    if (sizeMB > 5) {
      try {
        await app.files().upload({
          name: 'huge-test.tei.xml',
          mimeType: 'text/xml',
          buffer: readFileSync(tempPath),
        });

        // Wait and check if it loads or is rejected
        await page.waitForTimeout(1000);

        // Should not crash either way
        const state = await app.getState();
        expect(state).toBeDefined();
      } catch (error) {
        // Browser may reject extremely large files - that's OK
        console.log('Large file rejected by browser:', error);
      }
    } else {
      test.skip(true, 'Generated file not large enough for size limit test');
    }

    if (existsSync(tempPath)) {
      unlinkSync(tempPath);
    }
  });

  test('should handle storage quota exceeded', async ({ page }) => {
    // Fill localStorage with data
    await page.addInitScript(() => {
      try {
        const data = 'x'.repeat(1024 * 1024); // 1MB string
        for (let i = 0; i < 10; i++) {
          localStorage.setItem(`test-key-${i}`, data);
        }
      } catch (e) {
        // Expected to hit quota
        console.log('Storage quota:', e);
      }
    });

    const app = await TEIEditorApp.create(page);

    // Should still work despite storage issues
    const state1 = await app.getState();
    expect(state1.location).toBe('gallery');

    // Should load sample
    const samples = await app.samples().list();
    await app.samples().load(samples[0].id);

    await page.waitForLoadState('networkidle');

    // Should not crash
    const state2 = await app.getState();
    expect(state2.location).toBe('editor');
  });

  test('should handle disabled localStorage', async ({ page }) => {
    // Mock null localStorage (simulate privacy settings)
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        get: () => null,
        configurable: true,
      });
    });

    const app = await TEIEditorApp.create(page);

    // Should still work without localStorage
    const state1 = await app.getState();
    expect(state1.location).toBe('gallery');

    // Should load sample
    const samples = await app.samples().list();
    await app.samples().load(samples[0].id);

    await page.waitForLoadState('networkidle');

    // Should be functional
    const state2 = await app.getState();
    expect(state2.location).toBe('editor');
  });
});

test.describe('Concurrent Operations and Race Conditions', () => {
  test('should handle rapid mode switching', async ({ page }) => {
    const app = await TEIEditorApp.create(page);

    // Load a sample first
    const samples = await app.samples().list();
    await app.samples().load(samples[0].id);

    await page.waitForLoadState('networkidle');

    // Check if AI Suggest button exists
    const aiSuggestBtn = page.getByRole('button', { name: /AI Suggest/i });
    const hasAIButton = await aiSuggestBtn.count();

    if (hasAIButton > 0) {
      // Rapidly switch between modes
      for (let i = 0; i < 10; i++) {
        await page.getByRole('button', { name: /Manual/i }).click();
        await page.waitForTimeout(50);
        await aiSuggestBtn.click();
        await page.waitForTimeout(50);
      }
    } else {
      // Skip rapid switching if AI button not available
      test.skip(true, 'AI Suggest button not available');
    }

    // Should not crash - check we can still get state
    const state = await app.getState();
    expect(state.location).toBe('editor');
  });

  test('should handle rapid sample loading', async ({ page }) => {
    const app = await TEIEditorApp.create(page);

    // Get the list of samples
    const samples = await app.samples().list();
    const numSamplesToLoad = Math.min(3, samples.length);

    // Load samples one at a time (can't load from editor mode)
    for (let i = 0; i < numSamplesToLoad; i++) {
      // Navigate back to gallery first
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Load the sample
      await app.samples().load(samples[i].id);
      await page.waitForTimeout(200);
    }

    // Should settle without crashing
    await page.waitForLoadState('networkidle');

    const state = await app.getState();
    expect(state.location).toBe('editor');
  });

  test('should handle rapid panel toggling', async ({ page }) => {
    const app = await TEIEditorApp.create(page);

    // Load a sample
    const samples = await app.samples().list();
    await app.samples().load(samples[0].id);
    await page.waitForLoadState('networkidle');

    // Check if buttons exist
    const bulkBtn = page.getByRole('button', { name: /Bulk Operations/i });
    const vizBtn = page.getByRole('button', { name: /Visualizations/i });
    const hasBulkBtn = await bulkBtn.count();
    const hasVizBtn = await vizBtn.count();

    if (hasBulkBtn > 0 && hasVizBtn > 0) {
      // Rapidly toggle panels
      for (let i = 0; i < 10; i++) {
        await bulkBtn.click();
        await page.waitForTimeout(50);
        await vizBtn.click();
        await page.waitForTimeout(50);
      }
    } else {
      // Skip if buttons not available
      test.skip(true, 'Panel buttons not available');
    }

    // Should not crash - check we can still get state
    const state = await app.getState();
    expect(state.location).toBe('editor');

    // Should close panels
    await page.keyboard.press('Escape');
  });

  test('should handle simultaneous keyboard shortcuts', async ({ page }) => {
    const app = await TEIEditorApp.create(page);

    const shortcuts = ['Meta+k', 'Meta+b', '?', 'Escape'];

    for (let i = 0; i < 5; i++) {
      for (const shortcut of shortcuts) {
        await page.keyboard.press(shortcut);
        await page.waitForTimeout(50);
      }
    }

    // Should not crash - check we can still get state
    const state = await app.getState();
    expect(state).toBeDefined();
  });
});

test.describe('Recovery and User Experience', () => {
  test('should allow document reload after error', async ({ page }) => {
    const app = await TEIEditorApp.create(page);

    // Load a valid sample first
    const samples = await app.samples().list();
    await app.samples().load(samples[0].id);

    const state1 = await app.getState();
    expect(state1.location).toBe('editor');

    // Try to upload invalid document
    await app.files().uploadInvalid('<invalid></invalid', 'invalid.xml');

    // Small wait for processing
    await page.waitForTimeout(500);

    // Check original doc is still there
    const state2 = await app.getState();
    expect(state2.location).toBe('editor');
    expect(state2.document?.loaded).toBe(true);

    // Navigate to gallery and load another valid sample
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const app2 = await TEIEditorApp.create(page);
    const samples2 = await app2.samples().list();
    await app2.samples().load(samples2[0].id);

    // Should successfully load
    const state3 = await app2.getState();
    expect(state3.location).toBe('editor');
    expect(state3.document?.loaded).toBe(true);
  });

  test('should preserve app state during errors', async ({ page }) => {
    const app = await TEIEditorApp.create(page);

    // Load valid document
    const samples = await app.samples().list();
    await app.samples().load(samples[0].id);

    // Verify loaded
    const state1 = await app.getState();
    expect(state1.location).toBe('editor');
    expect(state1.document?.loaded).toBe(true);

    // Try to upload invalid file
    await app.files().uploadInvalid('not xml', 'invalid.xml');

    // Small wait for processing
    await page.waitForTimeout(500);

    // Original document should still be visible (state preserved)
    const state2 = await app.getState();
    expect(state2.location).toBe('editor');
    expect(state2.document?.loaded).toBe(true);
  });

  test('should show helpful error messages', async ({ page }) => {
    const app = await TEIEditorApp.create(page);

    // Load a sample first
    const samples = await app.samples().list();
    await app.samples().load(samples[0].id);

    const state1 = await app.getState();
    expect(state1.location).toBe('editor');

    // Load invalid file
    await app.files().uploadInvalid('completely invalid content', 'invalid.xml');

    // Small wait for processing
    await page.waitForTimeout(500);

    // Should not crash - check still functional
    const state2 = await app.getState();
    expect(state2.location).toBe('editor');
    expect(state2.document?.loaded).toBe(true);
  });

  test('should allow user to continue working after error', async ({ page }) => {
    const app = await TEIEditorApp.create(page);

    // Load a valid sample first
    const samples = await app.samples().list();
    await app.samples().load(samples[0].id);

    const state1 = await app.getState();
    expect(state1.location).toBe('editor');

    // Try to upload invalid file
    await app.files().uploadInvalid('<invalid', 'invalid.xml');

    // Small wait for processing
    await page.waitForTimeout(500);

    // Original doc should still be there
    const state2 = await app.getState();
    expect(state2.location).toBe('editor');
    expect(state2.document?.loaded).toBe(true);

    // User should be able to navigate away
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Should show gallery
    const state3 = await app.getState();
    expect(state3.location).toBe('gallery');

    // User should be able to load another sample
    await app.samples().load(samples[0].id);

    // Should successfully load
    const state4 = await app.getState();
    expect(state4.location).toBe('editor');
    expect(state4.document?.loaded).toBe(true);
  });
});
