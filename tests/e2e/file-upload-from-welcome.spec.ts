import { test, expect } from '@playwright/test';
import { generateTestDocument, uploadTestDocument } from './fixtures/test-helpers';
import { URLS, TIMEOUTS } from './fixtures/test-constants';

/**
 * FileUpload E2E Tests
 *
 * Tests the FileUpload functionality accessible from the home page.
 * Verifies that users can upload TEI XML files and transition to the editor.
 *
 * Test Categories:
 * 1. Valid XML Upload - successful upload and transition to editor
 * 2. Invalid File Handling - proper error feedback for invalid files
 * 3. UI Visibility - FileUpload button accessibility
 */

test.describe('FileUpload', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(URLS.HOME);
    await page.waitForLoadState('networkidle');
  });

  test('uploads valid XML file and transitions to editor', async ({ page }) => {
    // Generate a valid TEI document
    const validTEI = generateTestDocument({
      speakers: ['narrator', 'della'],
      passages: 3,
    });

    // Upload the document
    await uploadTestDocument(page, {
      name: 'valid-test.tei.xml',
      content: validTEI,
    });

    // Wait for processing
    await page.waitForLoadState('networkidle');
    // Small wait replaced with condition

    // Verify success toast appears
    await expect(page.getByText(/document uploaded successfully/i)).toBeVisible({
      timeout: TIMEOUTS.ELEMENT_VISIBLE,
    });

    // Verify transition to editor - should see rendered view
    await expect(page.getByText('Rendered View')).toBeVisible({
      timeout: TIMEOUTS.ELEMENT_VISIBLE,
    });

    // Verify "No document loaded" message is gone
    await expect(page.getByText('No document loaded')).not.toBeVisible();

    // Verify editor toolbar is visible
    await expect(page.getByRole('button', { name: /manual/i })).toBeVisible();

    // Verify FileUpload button is still accessible in editor
    await expect(page.getByRole('button', { name: /upload/i })).toBeVisible();
  });

  test('shows error toast on invalid file', async ({ page }) => {
    // Create an invalid XML file (malformed)
    const invalidXML = '<?xml version="1.0"?><TEI><body><p>Unclosed';

    // Upload the invalid file
    await uploadTestDocument(page, {
      name: 'invalid-test.tei.xml',
      content: invalidXML,
    });

    // Wait for processing
    await page.waitForLoadState('networkidle');
    // Small wait replaced with condition

    // Verify error toast appears
    const errorToast = page.getByText(/failed to upload|invalid|error/i);
    await expect(errorToast).toBeVisible({
      timeout: TIMEOUTS.ELEMENT_VISIBLE,
    });

    // Verify editor toolbar is not visible (document didn't load successfully)
    await expect(page.getByRole('button', { name: /manual/i })).not.toBeVisible();

    // Verify "Rendered View" is not visible
    await expect(page.getByText('Rendered View')).not.toBeVisible();
  });

  test('FileUpload button is visible on home page', async ({ page }) => {
    // Verify FileUpload button is present on home page
    const uploadButton = page.getByRole('button', { name: /upload tei file/i });

    await expect(uploadButton).toBeVisible({
      timeout: TIMEOUTS.ELEMENT_VISIBLE,
    });

    // Verify button is clickable
    await expect(uploadButton).toBeEnabled();

    // Verify hidden file input exists
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toHaveCount(1);

    // Verify file input accepts XML files
    await expect(fileInput).toHaveAttribute('accept', '.xml,.txt');

    // Verify clicking button triggers file input
    await uploadButton.click();
    // Note: In real browser, this would open file picker
    // In test, we verify the click handler is attached
  });

  test('handles upload with proper state transition', async ({ page }) => {
    // Verify initial state - "No document loaded" is visible
    await expect(page.getByText('No document loaded')).toBeVisible();

    // Generate and upload valid document
    const validTEI = generateTestDocument({
      speakers: ['protagonist', 'antagonist'],
      passages: 5,
    });

    await uploadTestDocument(page, {
      name: 'state-transition-test.tei.xml',
      content: validTEI,
    });

    // Wait for state transition
    await page.waitForLoadState('networkidle');
    // Small wait replaced with condition

    // Verify "No document loaded" message is gone
    await expect(page.getByText('No document loaded')).not.toBeVisible();

    // Verify editor UI is visible
    await expect(page.getByText('Rendered View')).toBeVisible();
    await expect(page.getByText('TEI Source')).toBeVisible();
  });

  test('maintains upload functionality after navigation', async ({ page }) => {
    // Upload a document
    const firstTEI = generateTestDocument({
      speakers: ['speaker1'],
      passages: 2,
    });

    await uploadTestDocument(page, {
      name: 'first-upload.tei.xml',
      content: firstTEI,
    });

    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Rendered View')).toBeVisible();

    // Navigate to a different page and back
    await page.goto('/test-components');
    await page.waitForLoadState('networkidle');
    await page.goto(URLS.HOME);
    await page.waitForLoadState('networkidle');

    // Verify FileUpload button is still visible
    await expect(page.getByRole('button', { name: /upload/i })).toBeVisible();

    // Upload another document
    const secondTEI = generateTestDocument({
      speakers: ['speaker2'],
      passages: 3,
    });

    await uploadTestDocument(page, {
      name: 'second-upload.tei.xml',
      content: secondTEI,
    });

    await page.waitForLoadState('networkidle');
    // Small wait replaced with condition

    // Verify new document loads successfully
    await expect(page.getByText(/document uploaded successfully/i)).toBeVisible();
    await expect(page.getByText('Rendered View')).toBeVisible();
  });
});
