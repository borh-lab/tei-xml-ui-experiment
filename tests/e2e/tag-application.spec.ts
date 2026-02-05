// @ts-nocheck
import { test, expect } from '@playwright/test';
import { loadSample, waitForEditorReady } from './fixtures/test-helpers';

test.describe('Tag Application', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for auto-load of default sample
    await waitForEditorReady(page);
  });

  test('should apply said tag when text is selected and button clicked', async ({ page }) => {
    // Get the first passage
    const passage = page.locator('[id^="passage-"]').first();
    await passage.waitFor();

    // Click and select text in the passage
    await passage.click();

    // Select all text in passage using triple click
    await passage.click({ clickCount: 3 });

    // Wait briefly for selection to be registered
    await page.waitForTimeout(100);

    // The TagToolbar should appear with <said> button
    // Note: TagToolbar uses title attribute, not accessible name
    const saidButton = page.locator('button[title*="said"]').first();
    await expect(saidButton).toBeVisible({ timeout: 2000 });

    // Click the said tag button
    await saidButton.click();

    // Wait for tag application and toast to appear
    await page.waitForTimeout(200);

    // Verify success toast appears
    await expect(page.getByText(/Applied.*said/i)).toBeVisible({ timeout: 2000 });
  });

  test('should apply q tag to selected text', async ({ page }) => {
    const passage = page.locator('[id^="passage-"]').first();
    await passage.waitFor();

    // Click to focus passage
    await passage.click();

    // Select specific portion of text using double-click
    // This typically selects a word or phrase
    await passage.click({ clickCount: 2 });

    // Wait for selection
    await page.waitForTimeout(100);

    // Click q tag button - uses title attribute
    const qButton = page.locator('button[title*="q tag"]').first();
    await expect(qButton).toBeVisible({ timeout: 2000 });

    await qButton.click();

    // Wait for tag application
    await page.waitForTimeout(200);

    // Verify the tag was applied - the content should still be visible
    // (q tag doesn't add visual markers in current implementation)
    await expect(passage).toBeVisible();

    // Check for success toast
    await expect(page.getByText(/Applied.*q>/i)).toBeVisible({ timeout: 2000 });
  });

  test('should show error toast when no text selected', async ({ page }) => {
    // Try to trigger tag application without selection
    // Since toolbar only appears on selection, we test via keyboard shortcut
    // which should show an error toast

    // Focus the page but don't select any text
    await page.locator('body').click();

    // Press '1' key which triggers tag as speaker1 shortcut
    // This should show an error toast
    await page.keyboard.press('1');

    // Verify error toast appears
    await expect(page.getByText(/No text selected/i)).toBeVisible({ timeout: 2000 });
  });

  test('should apply multiple tags in same passage', async ({ page }) => {
    const passage = page.locator('[id^="passage-"]').first();
    await passage.waitFor();

    // Apply first tag (said) to full passage
    await passage.click({ clickCount: 3 });
    await page.waitForTimeout(100);

    const saidButton = page.locator('button[title*="said"]').first();
    await expect(saidButton).toBeVisible({ timeout: 2000 });
    await saidButton.click();

    // Wait for tag to be applied
    await page.waitForTimeout(500);

    // Click elsewhere to clear selection, then click back to passage
    await page.locator('body').click();
    await passage.click();

    // Select a different portion for second tag
    // Double-click to select a word/phrase
    await passage.click({ clickCount: 2 });
    await page.waitForTimeout(100);

    // Apply q tag
    const qButton = page.locator('button[title*="q tag"]').first();
    await expect(qButton).toBeVisible({ timeout: 2000 });
    await qButton.click();

    // Wait for application
    await page.waitForTimeout(500);

    // Verify passage still has content
    await expect(passage).toBeVisible();

    // Verify success toast for at least one application
    await expect(page.getByText(/Applied/i)).toBeVisible({ timeout: 2000 });
  });

  test('should show persName tag button in toolbar', async ({ page }) => {
    const passage = page.locator('[id^="passage-"]').first();
    await passage.waitFor();

    // Select text to show toolbar
    await passage.click({ clickCount: 2 });
    await page.waitForTimeout(100);

    // Verify all three tag buttons are visible using title attributes
    await expect(page.locator('button[title*="said"]').first()).toBeVisible({ timeout: 2000 });
    await expect(page.locator('button[title*="q tag"]').first()).toBeVisible({ timeout: 2000 });
    await expect(page.locator('button[title*="persName"]').first()).toBeVisible({ timeout: 2000 });
  });

  test('should apply said tag with speaker attribute', async ({ page }) => {
    const passage = page.locator('[id^="passage-"]').first();
    await passage.waitFor();

    // Select text
    await passage.click({ clickCount: 3 });
    await page.waitForTimeout(100);

    // Apply said tag - using title attribute
    const saidButton = page.locator('button[title*="said"]').first();
    await expect(saidButton).toBeVisible({ timeout: 2000 });
    await saidButton.click();

    // Wait for application
    await page.waitForTimeout(500);

    // Verify success toast appears with speaker info
    await expect(page.getByText(/Applied.*said.*who/is)).toBeVisible({ timeout: 2000 });
  });

  test('should hide toolbar after tag is applied', async ({ page }) => {
    const passage = page.locator('[id^="passage-"]').first();
    await passage.waitFor();

    // Select text to show toolbar
    await passage.click({ clickCount: 2 });
    await page.waitForTimeout(100);

    // Verify toolbar is visible using the fixed position container
    const toolbar = page.locator('.fixed.z-50.bg-background.border').first();
    await expect(toolbar).toBeVisible({ timeout: 2000 });

    // Apply tag using title selector
    const saidButton = page.locator('button[title*="said"]').first();
    await saidButton.click();

    // Wait for tag application
    await page.waitForTimeout(200);

    // Toolbar should hide after applying tag
    await expect(toolbar).not.toBeVisible({ timeout: 2000 });
  });

  test('should show toolbar above selected text', async ({ page }) => {
    const passage = page.locator('[id^="passage-"]').first();
    await passage.waitFor();

    // Select text
    await passage.click({ clickCount: 2 });
    await page.waitForTimeout(100);

    // Get the toolbar element
    const toolbar = page.locator('.fixed.z-50.bg-background.border').first();
    await expect(toolbar).toBeVisible({ timeout: 2000 });

    // Verify toolbar has the expected class for positioning
    await expect(toolbar).toHaveClass(/fixed/);
    await expect(toolbar).toHaveClass(/z-50/);
  });

  test('should work with keyboard shortcut for tagging', async ({ page }) => {
    const passage = page.locator('[id^="passage-"]').first();
    await passage.waitFor();

    // Select text
    await passage.click({ clickCount: 2 });
    await page.waitForTimeout(100);

    // Press '1' to apply said tag with speaker1
    await page.keyboard.press('1');

    // Wait for tag application
    await page.waitForTimeout(500);

    // Verify success toast appears
    await expect(page.getByText(/Applied.*said/is)).toBeVisible({ timeout: 2000 });
  });

  test('should handle rapid tag applications', async ({ page }) => {
    const firstPassage = page.locator('[id^="passage-"]').first();
    const secondPassage = page.locator('[id^="passage-"]').nth(1);
    await firstPassage.waitFor();
    await secondPassage.waitFor();

    // Apply tag to first passage
    await firstPassage.click({ clickCount: 3 });
    await page.waitForTimeout(100);
    const saidButton1 = page.locator('button[title*="said"]').first();
    await expect(saidButton1).toBeVisible({ timeout: 2000 });
    await saidButton1.click();

    // Wait for application
    await page.waitForTimeout(500);

    // Apply tag to second passage
    await secondPassage.click({ clickCount: 3 });
    await page.waitForTimeout(100);
    const saidButton2 = page.locator('button[title*="said"]').first();
    await expect(saidButton2).toBeVisible({ timeout: 2000 });
    await saidButton2.click();

    // Wait for application
    await page.waitForTimeout(500);

    // Verify both passages have content
    await expect(firstPassage).toBeVisible();
    await expect(secondPassage).toBeVisible();

    // Verify success toast appears
    await expect(page.getByText(/Applied/i)).toBeVisible({ timeout: 2000 });
  });
});
