// @ts-nocheck
import { test, expect } from '@playwright/test';
import { uploadTestDocument } from './fixtures/test-helpers';
import { URLS, TIMEOUTS } from './fixtures/test-constants';

/**
 * Large File Handling E2E Tests
 *
 * Tests the file size validation and warning system for large file uploads.
 * Verifies that users receive appropriate feedback for files of different sizes.
 *
 * Test Categories:
 * 1. Large File Warning - files >100KB show warning but process successfully
 * 2. Oversized File Rejection - files >5MB are rejected with error
 */

test.describe('Large File Handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(URLS.HOME);
    await page.waitForLoadState('networkidle');
  });

  test('shows warning for 150KB file but processes successfully', async ({ page }) => {
    // Generate a 150KB TEI document
    // Average character is ~1 byte, so we need ~150,000 characters
    // Each passage is roughly 200 characters, so we need ~750 passages
    const largeContent = generateLargeTEIDocument({
      speakers: ['speaker1', 'speaker2', 'speaker3'],
      passages: 750,
      wordsPerPassage: 30,
    });

    const fileSizeKB = largeContent.length / 1024;
    console.log(`Generated file size: ${fileSizeKB.toFixed(2)}KB`);

    // Upload the large file
    await uploadTestDocument(page, {
      name: 'large-150kb.tei.xml',
      content: largeContent,
    });

    // Wait for processing
    await page.waitForLoadState('networkidle');

    // Verify warning toast appears
    await expect(page.getByText(/large file detected/i)).toBeVisible({
      timeout: TIMEOUTS.ELEMENT_VISIBLE,
    });

    // Verify warning mentions file size
    await expect(page.getByText(/kb.*processing may take longer/i)).toBeVisible();

    // Verify performance suggestion is shown
    await expect(page.getByText(/consider splitting large files/i)).toBeVisible();

    // Despite warning, file should still process successfully
    await expect(page.getByText(/document uploaded successfully/i)).toBeVisible({
      timeout: TIMEOUTS.ELEMENT_VISIBLE,
    });

    // Verify editor loads with the large document
    await expect(page.getByText('Rendered View')).toBeVisible({
      timeout: TIMEOUTS.ELEMENT_VISIBLE,
    });

    // Verify document content is actually loaded
    await expect(page.getByText('TEI Source')).toBeVisible();
  });

  test('rejects 6MB file with error toast', async ({ page }) => {
    // Generate a 6MB TEI document
    // 6MB = ~6,000,000 bytes
    // Each passage is roughly 300 characters, so we need ~20,000 passages
    const hugeContent = generateLargeTEIDocument({
      speakers: ['speaker1', 'speaker2', 'speaker3', 'speaker4', 'speaker5'],
      passages: 20000,
      wordsPerPassage: 35,
    });

    const fileSizeMB = hugeContent.length / (1024 * 1024);
    console.log(`Generated file size: ${fileSizeMB.toFixed(2)}MB`);

    // Upload the oversized file
    await uploadTestDocument(page, {
      name: 'huge-6mb.tei.xml',
      content: hugeContent,
    });

    // Wait for processing
    await page.waitForLoadState('networkidle');

    // Verify error toast appears
    await expect(page.getByText(/file size.*exceeds.*5mb limit/i)).toBeVisible({
      timeout: TIMEOUTS.ELEMENT_VISIBLE,
    });

    // Verify error mentions the actual file size
    await expect(page.getByText(/\d+\.\d+mb/i)).toBeVisible();

    // Verify suggestion to upload smaller file
    await expect(page.getByText(/please upload a smaller file/i)).toBeVisible();

    // Verify success toast does NOT appear
    await expect(page.getByText(/document uploaded successfully/i)).not.toBeVisible({
      timeout: TIMEOUTS.ELEMENT_VISIBLE,
    });

    // Verify editor does NOT load
    await expect(page.getByText('Rendered View')).not.toBeVisible();

    // Verify "No document loaded" message is still visible
    await expect(page.getByText('No document loaded')).toBeVisible();
  });

  test('processes small file without warnings', async ({ page }) => {
    // Generate a small file (<100KB)
    const smallContent = generateLargeTEIDocument({
      speakers: ['speaker1', 'speaker2'],
      passages: 10,
      wordsPerPassage: 20,
    });

    const fileSizeKB = smallContent.length / 1024;
    console.log(`Generated file size: ${fileSizeKB.toFixed(2)}KB`);

    // Upload the small file
    await uploadTestDocument(page, {
      name: 'small-10kb.tei.xml',
      content: smallContent,
    });

    // Wait for processing
    await page.waitForLoadState('networkidle');

    // Verify NO warning toast appears
    await expect(page.getByText(/large file detected/i)).not.toBeVisible();

    // Verify success toast appears
    await expect(page.getByText(/document uploaded successfully/i)).toBeVisible({
      timeout: TIMEOUTS.ELEMENT_VISIBLE,
    });

    // Verify editor loads normally
    await expect(page.getByText('Rendered View')).toBeVisible({
      timeout: TIMEOUTS.ELEMENT_VISIBLE,
    });
  });

  test('rejects file larger than 5MB', async ({ page }) => {
    // Generate a file larger than 5MB to test boundary condition
    // We need >5MB = ~5,500,000 bytes to ensure it's over the limit
    const boundaryContent = generateLargeTEIDocument({
      speakers: ['speaker1', 'speaker2', 'speaker3', 'speaker4', 'speaker5'],
      passages: 24000, // More passages to ensure we're over 5MB
      wordsPerPassage: 35,
    });

    const fileSizeMB = boundaryContent.length / (1024 * 1024);
    console.log(`Generated file size: ${fileSizeMB.toFixed(2)}MB`);

    // Verify the file is actually larger than 5MB
    expect(fileSizeMB).toBeGreaterThan(5);

    // Upload the oversized file
    await uploadTestDocument(page, {
      name: 'oversized-5.5mb.tei.xml',
      content: boundaryContent,
    });

    // Wait for processing
    await page.waitForLoadState('networkidle');

    // Should be rejected
    await expect(page.getByText(/file size.*exceeds.*5mb limit/i)).toBeVisible({
      timeout: TIMEOUTS.ELEMENT_VISIBLE,
    });
  });
});

/**
 * Helper function to generate large TEI documents for testing
 */
function generateLargeTEIDocument(options: {
  speakers: string[];
  passages: number;
  wordsPerPassage: number;
}): string {
  const { speakers, passages, wordsPerPassage } = options;

  // Sample words for generating content
  const sampleWords = [
    'the',
    'quick',
    'brown',
    'fox',
    'jumps',
    'over',
    'lazy',
    'dog',
    'hello',
    'world',
    'test',
    'document',
    'dialogue',
    'speaker',
    'said',
    'replied',
    'asked',
    'answered',
    'questioned',
    'responded',
    'conversation',
    'discussion',
    'talk',
    'chat',
    'speaking',
    'listening',
    'morning',
    'afternoon',
    'evening',
    'night',
    'day',
    'time',
  ];

  let passageContent = '';
  for (let i = 0; i < passages; i++) {
    const speaker = speakers[i % speakers.length];
    const words: string[] = [];

    for (let j = 0; j < wordsPerPassage; j++) {
      words.push(sampleWords[Math.floor(Math.random() * sampleWords.length)]);
    }

    passageContent += `    <p>
      <said who="${speaker}">"${words.join(' ')}."</said>
    </p>\n`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader>
    <fileDesc>
      <titleStmt>
        <title>Large Test Document</title>
      </titleStmt>
    </fileDesc>
  </teiHeader>
  <text>
    <body>
${passageContent}
    </body>
  </text>
</TEI>`;
}
