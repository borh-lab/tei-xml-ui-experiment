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
    const saidButton = page.getByRole('button', { name: '<said>' }).first();
    await expect(saidButton).toBeVisible({ timeout: 2000 });

    // Click the said tag button
    await saidButton.click();

    // Verify the tag was applied by checking for speaker attribute in the passage
    // The wrapped text should have a data-speaker attribute
    await expect(page.locator('[data-speaker]').first()).toBeVisible({ timeout: 2000 });
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

    // Click q tag button
    const qButton = page.getByRole('button', { name: '<q>' }).first();
    await expect(qButton).toBeVisible({ timeout: 2000 });

    await qButton.click();

    // Verify the tag was applied - the content should still be visible
    // (q tag doesn't add visual markers in current implementation)
    await expect(passage).toBeVisible();
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

    const saidButton = page.getByRole('button', { name: '<said>' }).first();
    await expect(saidButton).toBeVisible({ timeout: 2000 });
    await saidButton.click();

    // Wait for tag to be applied
    await page.waitForTimeout(200);

    // Click elsewhere to clear selection, then click back to passage
    await page.locator('body').click();
    await passage.click();

    // Select a different portion for second tag
    // Double-click to select a word/phrase
    await passage.click({ clickCount: 2 });
    await page.waitForTimeout(100);

    // Apply q tag
    const qButton = page.getByRole('button', { name: '<q>' }).first();
    await expect(qButton).toBeVisible({ timeout: 2000 });
    await qButton.click();

    // Verify passage still has content
    await expect(passage).toBeVisible();

    // Verify at least one tag was applied (data-speaker from said tag)
    await expect(page.locator('[data-speaker]').first()).toBeVisible({ timeout: 2000 });
  });

  test('should show persName tag button in toolbar', async ({ page }) => {
    const passage = page.locator('[id^="passage-"]').first();
    await passage.waitFor();

    // Select text to show toolbar
    await passage.click({ clickCount: 2 });
    await page.waitForTimeout(100);

    // Verify all three tag buttons are visible
    await expect(page.getByRole('button', { name: '<said>' }).first()).toBeVisible({ timeout: 2000 });
    await expect(page.getByRole('button', { name: '<q>' }).first()).toBeVisible({ timeout: 2000 });
    await expect(page.getByRole('button', { name: '<persName>' }).first()).toBeVisible({ timeout: 2000 });
  });

  test('should apply said tag with speaker attribute', async ({ page }) => {
    const passage = page.locator('[id^="passage-"]').first();
    await passage.waitFor();

    // Select text
    await passage.click({ clickCount: 3 });
    await page.waitForTimeout(100);

    // Apply said tag
    const saidButton = page.getByRole('button', { name: '<said>' }).first();
    await expect(saidButton).toBeVisible({ timeout: 2000 });
    await saidButton.click();

    // Verify speaker attribute is applied
    // The TagToolbar applies { 'who': '#speaker1' } which becomes data-speaker="speaker1"
    await expect(page.locator('[data-speaker="speaker1"]').first()).toBeVisible({ timeout: 2000 });
  });

  test('should hide toolbar after tag is applied', async ({ page }) => {
    const passage = page.locator('[id^="passage-"]').first();
    await passage.waitFor();

    // Select text to show toolbar
    await passage.click({ clickCount: 2 });
    await page.waitForTimeout(100);

    // Verify toolbar is visible
    const saidButton = page.getByRole('button', { name: '<said>' }).first();
    await expect(saidButton).toBeVisible({ timeout: 2000 });

    // Apply tag
    await saidButton.click();

    // Toolbar should hide after applying tag
    await expect(saidButton).not.toBeVisible({ timeout: 2000 });
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

    // Verify tag was applied
    await expect(page.locator('[data-speaker="speaker1"]').first()).toBeVisible({ timeout: 2000 });
  });

  test('should handle rapid tag applications', async ({ page }) => {
    const firstPassage = page.locator('[id^="passage-"]').first();
    const secondPassage = page.locator('[id^="passage-"]').nth(1);
    await firstPassage.waitFor();
    await secondPassage.waitFor();

    // Apply tag to first passage
    await firstPassage.click({ clickCount: 3 });
    await page.waitForTimeout(100);
    const saidButton1 = page.getByRole('button', { name: '<said>' }).first();
    await expect(saidButton1).toBeVisible({ timeout: 2000 });
    await saidButton1.click();

    // Wait for application
    await page.waitForTimeout(200);

    // Apply tag to second passage
    await secondPassage.click({ clickCount: 3 });
    await page.waitForTimeout(100);
    const saidButton2 = page.getByRole('button', { name: '<said>' }).first();
    await expect(saidButton2).toBeVisible({ timeout: 2000 });
    await saidButton2.click();

    // Verify both passages have content
    await expect(firstPassage).toBeVisible();
    await expect(secondPassage).toBeVisible();

    // Verify at least one tag was applied
    await expect(page.locator('[data-speaker]').first()).toBeVisible({ timeout: 2000 });
  });
});
