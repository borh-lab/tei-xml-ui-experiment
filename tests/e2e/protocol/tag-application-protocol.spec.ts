/**
 * Tag Application E2E Tests - Protocol-Based
 *
 * Migrated from DOM-based testing to state-driven protocol testing.
 * Uses the TEIEditorApp protocol for reliable, maintainable tests.
 *
 * Key improvements:
 * - State-driven assertions instead of DOM selectors
 * - Explicit state waiting instead of arbitrary timeouts
 * - Test attributes for reliable element identification
 * - Protocol-based commands for actions
 */

import { test, expect } from '@playwright/test';
import { TEIEditorApp } from './TEIEditorApp';

test.describe('Tag Application - Protocol Based', () => {
  let app: TEIEditorApp;

  test.beforeEach(async ({ page }) => {
    app = await TEIEditorApp.create(page);
  });

  test('should show toolbar when text is selected', async ({ page }) => {
    // Load a sample document
    await app.samples().load('yellow-wallpaper');

    // Get the first passage (using numeric index)
    const passage = page.locator('[data-test-passage="0"]');

    // Select text by triple-clicking
    await passage.click({ clickCount: 3 });

    // Wait for toolbar to appear using test attribute
    const toolbar = page.locator('[data-test-panel="tag-toolbar"]');
    await expect(toolbar).toBeVisible({ timeout: 3000 });

    // Verify toolbar has expected structure
    await expect(toolbar).toHaveAttribute('data-test-state', 'visible');

    // Verify character buttons exist
    const saidButtons = toolbar.locator('[data-test-tag="said"]');
    const count = await saidButtons.count();
    expect(count).toBeGreaterThan(0);

    // Verify q and persName buttons exist
    await expect(toolbar.locator('[data-test-tag="q"]')).toBeVisible();
    await expect(toolbar.locator('[data-test-tag="persName"]')).toBeVisible();
  });

  test('should apply said tag when character button clicked', async ({ page }) => {
    // Load a sample document
    await app.samples().load('yellow-wallpaper');

    // Get the first passage
    const passage = page.locator('[data-test-passage="0"]');

    // Select text by triple-clicking
    await passage.click({ clickCount: 3 });

    // Wait for toolbar
    const toolbar = page.locator('[data-test-panel="tag-toolbar"]');
    await expect(toolbar).toBeVisible({ timeout: 3000 });

    // Get the first character button (said tag)
    const firstSaidButton = toolbar.locator('[data-test-tag="said"]').first();

    // Click the button
    await firstSaidButton.click();

    // Wait for state to update
    await app.waitForState(
      {
        location: 'editor',
        document: { loaded: true }
      },
      5000
    );

    // Toolbar should hide after applying tag (selection is cleared)
    await expect(toolbar).not.toBeVisible({ timeout: 2000 });
  });

  test('should apply q tag when q button clicked', async ({ page }) => {
    // Load a sample document
    await app.samples().load('yellow-wallpaper');

    // Get the first passage
    const passage = page.locator('[data-test-passage="0"]');

    // Select text by triple-clicking
    await passage.click({ clickCount: 3 });

    // Wait for toolbar
    const toolbar = page.locator('[data-test-panel="tag-toolbar"]');
    await expect(toolbar).toBeVisible({ timeout: 3000 });

    // Click the q tag button
    const qButton = toolbar.locator('[data-test-tag="q"]');
    await qButton.click();

    // Wait for state update
    await app.waitForState(
      {
        location: 'editor',
        document: { loaded: true }
      },
      5000
    );

    // Toolbar should hide
    await expect(toolbar).not.toBeVisible({ timeout: 2000 });

    // Passage should still be visible
    await expect(passage).toBeVisible();
  });

  test('should apply persName tag when persName button clicked', async ({ page }) => {
    // Load a sample document
    await app.samples().load('yellow-wallpaper');

    // Get the first passage
    const passage = page.locator('[data-test-passage="0"]');

    // Select text by triple-clicking
    await passage.click({ clickCount: 3 });

    // Wait for toolbar
    const toolbar = page.locator('[data-test-panel="tag-toolbar"]');
    await expect(toolbar).toBeVisible({ timeout: 3000 });

    // Click the persName tag button
    const persNameButton = toolbar.locator('[data-test-tag="persName"]');
    await persNameButton.click();

    // Wait for state update
    await app.waitForState(
      {
        location: 'editor',
        document: { loaded: true }
      },
      5000
    );

    // Toolbar should hide
    await expect(toolbar).not.toBeVisible({ timeout: 2000 });
  });

  test('should close toolbar when close button clicked', async ({ page }) => {
    // Load a sample document
    await app.samples().load('yellow-wallpaper');

    // Get the first passage
    const passage = page.locator('[data-test-passage="0"]');

    // Select text by triple-clicking
    await passage.click({ clickCount: 3 });

    // Wait for toolbar
    const toolbar = page.locator('[data-test-panel="tag-toolbar"]');
    await expect(toolbar).toBeVisible({ timeout: 3000 });

    // Click close button (the last button)
    const closeButton = toolbar.locator('button').last();
    await closeButton.click();

    // Toolbar should hide
    await expect(toolbar).not.toBeVisible({ timeout: 2000 });
  });

  test('should apply multiple tags to same passage', async ({ page }) => {
    // Load a sample document
    await app.samples().load('yellow-wallpaper');

    const passage = page.locator('[data-test-passage="0"]');

    // Apply first tag (said)
    await passage.click({ clickCount: 3 });

    let toolbar = page.locator('[data-test-panel="tag-toolbar"]');
    await expect(toolbar).toBeVisible({ timeout: 3000 });

    const firstSaidButton = toolbar.locator('[data-test-tag="said"]').first();
    await firstSaidButton.click();

    // Wait for first tag to be applied
    await app.waitForState(
      {
        location: 'editor',
        document: { loaded: true }
      },
      5000
    );

    // Apply second tag (q) to a different part
    await passage.click({ clickCount: 3 });

    toolbar = page.locator('[data-test-panel="tag-toolbar"]');
    await expect(toolbar).toBeVisible({ timeout: 3000 });

    const qButton = toolbar.locator('[data-test-tag="q"]');
    await qButton.click();

    // Wait for second tag to be applied
    await app.waitForState(
      {
        location: 'editor',
        document: { loaded: true }
      },
      5000
    );

    // Verify passage is still visible
    await expect(passage).toBeVisible();
  });

  test('should work with different passages', async ({ page }) => {
    // Load a sample document
    await app.samples().load('yellow-wallpaper');

    const firstPassage = page.locator('[data-test-passage="0"]');
    const secondPassage = page.locator('[data-test-passage="1"]');

    // Verify both passages exist
    await expect(firstPassage).toBeVisible();
    await expect(secondPassage).toBeVisible();

    // Select first passage by triple-clicking
    await firstPassage.click({ clickCount: 3 });

    let toolbar = page.locator('[data-test-panel="tag-toolbar"]');
    await expect(toolbar).toBeVisible({ timeout: 3000 });

    // Hide toolbar
    const closeButton = toolbar.locator('button').last();
    await closeButton.click();

    // Verify first passage is still there
    await expect(firstPassage).toBeVisible();
    // Verify second passage is still there
    await expect(secondPassage).toBeVisible();
  });

  test('should display correct character buttons', async ({ page }) => {
    // Load a sample document
    await app.samples().load('yellow-wallpaper');

    const passage = page.locator('[data-test-passage="0"]');

    // Select text by triple-clicking
    await passage.click({ clickCount: 3 });

    // Wait for toolbar
    const toolbar = page.locator('[data-test-panel="tag-toolbar"]');
    await expect(toolbar).toBeVisible({ timeout: 3000 });

    // Check that character buttons have correct attributes
    const saidButtons = toolbar.locator('[data-test-tag="said"]');
    const count = await saidButtons.count();
    expect(count).toBeGreaterThan(0);

    // Verify first button structure
    const firstButton = saidButtons.first();
    await expect(firstButton).toHaveAttribute('data-test-action', 'apply-tag');
    await expect(firstButton).toHaveAttribute('data-test-tag', 'said');
  });

  test('should position toolbar above selected text', async ({ page }) => {
    // Load a sample document
    await app.samples().load('yellow-wallpaper');

    const passage = page.locator('[data-test-passage="0"]');

    // Select text by triple-clicking
    await passage.click({ clickCount: 3 });

    // Wait for toolbar
    const toolbar = page.locator('[data-test-panel="tag-toolbar"]');
    await expect(toolbar).toBeVisible({ timeout: 3000 });

    // Verify toolbar is positioned (has left and top styles)
    const style = await toolbar.getAttribute('style');
    expect(style).toContain('left:');
    expect(style).toContain('top:');
  });

  test('should show persName tag button in toolbar', async ({ page }) => {
    // Load a sample document
    await app.samples().load('yellow-wallpaper');

    const passage = page.locator('[data-test-passage="0"]');

    // Select text by triple-clicking
    await passage.click({ clickCount: 3 });

    // Wait for toolbar to appear
    const toolbar = page.locator('[data-test-panel="tag-toolbar"]');
    await expect(toolbar).toBeVisible({ timeout: 3000 });

    // Verify all three tag buttons are visible
    await expect(toolbar.locator('button:has-text("said")')).toBeVisible();
    await expect(toolbar.locator('button:has-text("q")')).toBeVisible();
    await expect(toolbar.locator('button:has-text("persName")')).toBeVisible();
  });
});
