import { test, expect } from '@playwright/test';
import { loadSample, waitForEditorReady } from './fixtures/test-helpers';

test.describe('Tag Selection and Editing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for auto-load of default sample
    await waitForEditorReady(page);
  });

  test('should display tags with visual indicators (data-tag attributes)', async ({ page }) => {
    // The rendered view should contain elements with data-tag attributes
    // First, let's apply a tag to create visual indicators
    const passage = page.locator('[id^="passage-"]').first();
    await passage.waitFor();
    await passage.click({ clickCount: 3 });

    // Apply said tag
    const saidButton = page.getByRole('button', { name: '<said>' }).first();
    await expect(saidButton).toBeVisible({ timeout: 2000 });
    await saidButton.click();

    // Now check for visual indicators
    // Tags should have data-tag attribute and visual styling
    const taggedElements = page.locator('[data-tag]');
    await expect(taggedElements.first()).toBeVisible({ timeout: 2000 });
  });

  test('should select tag when clicked in rendered view', async ({ page }) => {
    // Apply a tag first
    const passage = page.locator('[id^="passage-"]').first();
    await passage.waitFor();
    await passage.click({ clickCount: 3 });

    const saidButton = page.getByRole('button', { name: '<said>' }).first();
    await saidButton.click();

    // Wait for tag to be applied
    await page.waitForTimeout(500);

    // Click on the tagged element
    const taggedElement = page.locator('[data-tag="said"]').first();
    await expect(taggedElement).toBeVisible();
    await taggedElement.click();

    // Verify tag is selected - should show in breadcrumb
    const breadcrumbTag = page.getByText(/<said>/);
    await expect(breadcrumbTag).toBeVisible({ timeout: 2000 });
  });

  test('should open edit dialog on double-click', async ({ page }) => {
    // Apply a tag first
    const passage = page.locator('[id^="passage-"]').first();
    await passage.waitFor();
    await passage.click({ clickCount: 3 });

    const saidButton = page.getByRole('button', { name: '<said>' }).first();
    await saidButton.click();

    // Wait for tag to be applied
    await page.waitForTimeout(500);

    // Double-click on the tagged element
    const taggedElement = page.locator('[data-tag="said"]').first();
    await expect(taggedElement).toBeVisible();
    await taggedElement.dblclick();

    // Verify edit dialog opens
    const dialogTitle = page.getByText(/Edit Tag|Edit <said>/i);
    await expect(dialogTitle).toBeVisible({ timeout: 2000 });
  });

  test('should show tag hierarchy in breadcrumb when tag selected', async ({ page }) => {
    // Apply a tag
    const passage = page.locator('[id^="passage-"]').first();
    await passage.waitFor();
    await passage.click({ clickCount: 3 });

    const saidButton = page.getByRole('button', { name: '<said>' }).first();
    await saidButton.click();

    // Click on the tagged element
    const taggedElement = page.locator('[data-tag="said"]').first();
    await taggedElement.click();

    // Breadcrumb should show tag path
    const breadcrumb = page.locator('.breadcrumb, [data-testid="tag-breadcrumb"]');
    await expect(breadcrumb).toBeVisible({ timeout: 2000 });

    // Should contain the tag name
    await expect(page.getByText(/<said>/)).toBeVisible();
  });

  test('should update tag attributes via edit dialog', async ({ page }) => {
    // Apply a tag first
    const passage = page.locator('[id^="passage-"]').first();
    await passage.waitFor();
    await passage.click({ clickCount: 3 });

    const saidButton = page.getByRole('button', { name: '<said>' }).first();
    await saidButton.click();

    // Double-click to open edit dialog
    const taggedElement = page.locator('[data-tag="said"]').first();
    await taggedElement.dblclick();

    // Wait for dialog
    const dialog = page.getByRole('dialog').or(page.locator('[role="dialog"]'));
    await expect(dialog.first()).toBeVisible({ timeout: 2000 });

    // Edit attributes (e.g., change who attribute)
    const whoInput = page.getByLabel(/who|@who/i).or(page.locator('input[name="who"]'));
    if (await whoInput.isVisible()) {
      await whoInput.fill('speaker2');
    }

    // Apply changes
    const applyButton = page.getByRole('button', { name: /apply|save|update/i });
    await applyButton.click();

    // Verify changes applied - check for success message or updated attribute
    await expect(page.getByText(/applied|updated|success/i).first()).toBeVisible({ timeout: 2000 });
  });

  test('should highlight selected tag visually', async ({ page }) => {
    // Apply a tag
    const passage = page.locator('[id^="passage-"]').first();
    await passage.waitFor();
    await passage.click({ clickCount: 3 });

    const saidButton = page.getByRole('button', { name: '<said>' }).first();
    await saidButton.click();

    // Click to select
    const taggedElement = page.locator('[data-tag="selected"]')
      .or(page.locator('[data-tag="said"].ring-2'))
      .or(page.locator('[data-tag="said"].selected'));
    await page.waitForTimeout(500);

    // The element should have a visual selection indicator
    // Check for ring, border, or other selection styling
    await taggedElement.click();

    // After clicking, it should have selection styling
    const selectedTag = page.locator('[data-tag="said"].ring-2, [data-tag="said"][data-selected="true"]');
    await expect(selectedTag.first()).toBeVisible({ timeout: 2000 });
  });

  test('should support breadcrumb navigation to parent tags', async ({ page }) => {
    // This test will be more meaningful once we have nested tags
    // For now, test that clicking breadcrumb works
    const passage = page.locator('[id^="passage-"]').first();
    await passage.waitFor();
    await passage.click({ clickCount: 3 });

    const saidButton = page.getByRole('button', { name: '<said>' }).first();
    await saidButton.click();

    // Click on tagged element
    const taggedElement = page.locator('[data-tag="said"]').first();
    await taggedElement.click();

    // Breadcrumb should be visible
    const breadcrumbLink = page.locator('.breadcrumb a, [data-testid="tag-breadcrumb"] a').first();
    await expect(breadcrumbLink).toBeVisible({ timeout: 2000 });
  });

  test('should cancel tag editing without applying changes', async ({ page }) => {
    // Apply a tag
    const passage = page.locator('[id^="passage-"]').first();
    await passage.waitFor();
    await passage.click({ clickCount: 3 });

    const saidButton = page.getByRole('button', { name: '<said>' }).first();
    await saidButton.click();

    // Double-click to open edit dialog
    const taggedElement = page.locator('[data-tag="said"]').first();
    await taggedElement.dblclick();

    // Wait for dialog
    const dialog = page.getByRole('dialog').or(page.locator('[role="dialog"]'));
    await expect(dialog.first()).toBeVisible({ timeout: 2000 });

    // Click cancel button
    const cancelButton = page.getByRole('button', { name: /cancel|close/i }).first();
    await cancelButton.click();

    // Dialog should close
    await expect(dialog).not.toBeVisible({ timeout: 2000 });
  });
});
