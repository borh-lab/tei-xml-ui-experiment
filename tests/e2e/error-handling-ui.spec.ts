// @ts-nocheck
import { test, expect } from '@playwright/test';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { uploadTestDocument, generateTestDocument } from './fixtures/test-helpers';

test.describe('Error Handling UI', () => {
  test.beforeEach(async ({ page }) => {
    // Load a valid sample first to initialize the editor and make FileUpload available
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const validXml = generateTestDocument({
      speakers: ['speaker1'],
      passages: 2,
    });

    await uploadTestDocument(page, {
      name: 'initial.tei.xml',
      content: validXml,
    });

    await page.waitForLoadState('networkidle');
    await page
      .waitForSelector('[id^="passage-"]', { state: 'attached', timeout: 2000 })
      .catch(() => {});
  });

  test('shows toast notification on invalid file upload', async ({ page }) => {
    const invalidXml = 'invalid {{{ xml';
    const tempPath = join(process.cwd(), 'tests/fixtures', 'invalid-test.xml');
    writeFileSync(tempPath, invalidXml);

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(tempPath);

    const toast = page.locator('[data-sonner-toast]');
    await expect(toast).toBeVisible({ timeout: 5000 });
    await expect(toast).toContainText('Invalid TEI format', { timeout: 3000 });

    unlinkSync(tempPath);
  });

  test('toast auto-dismisses after 5 seconds', async ({ page }) => {
    const invalidXml = 'invalid {{{ xml';
    const tempPath = join(process.cwd(), 'tests/fixtures', 'invalid-auto.xml');
    writeFileSync(tempPath, invalidXml);

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(tempPath);

    const toast = page.locator('[data-sonner-toast]');
    await expect(toast).toBeVisible();
    // Wait for auto-dismiss (5 second timeout)
    await expect(toast).not.toBeVisible({ timeout: 6000 });

    unlinkSync(tempPath);
  });

  test('shows success toast on valid document upload', async ({ page }) => {
    const validXml = generateTestDocument({
      speakers: ['speaker2'],
      passages: 3,
    });

    await uploadTestDocument(page, {
      name: 'valid-test.tei.xml',
      content: validXml,
    });

    const toast = page.locator('[data-sonner-toast]');
    await expect(toast).toBeVisible({ timeout: 5000 });
    await expect(toast).toContainText('uploaded successfully');
  });

  test('dismissible toasts can be closed manually', async ({ page }) => {
    const invalidXml = 'invalid {{{ xml';
    const tempPath = join(process.cwd(), 'tests/fixtures', 'invalid-close.xml');
    writeFileSync(tempPath, invalidXml);

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(tempPath);

    const toast = page.locator('[data-sonner-toast]');
    await expect(toast).toBeVisible();

    const closeButton = toast.locator('button[aria-label="close"]');
    await closeButton.click();
    await expect(toast).not.toBeVisible();

    unlinkSync(tempPath);
  });

  test('multiple toasts stack correctly', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');

    for (let i = 0; i < 3; i++) {
      const tempPath = join(process.cwd(), `invalid-stack-${i}.xml`);
      writeFileSync(tempPath, 'invalid {{{ xml');

      await fileInput.setInputFiles(tempPath);
      await page.waitForLoadState('domcontentloaded');

      unlinkSync(tempPath);
    }

    const toasts = page.locator('[data-sonner-toast]');
    await expect(toasts).toHaveCount(3);
  });
});
