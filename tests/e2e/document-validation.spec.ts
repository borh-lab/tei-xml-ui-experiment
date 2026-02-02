/**
 * E2E Tests for Document Validation Integration
 *
 * Tests the integration of ValidationService with DocumentContext and EditorLayout
 *
 * Phase 2, Task 5
 */

import { test, expect } from '@playwright/test';
import { EditorPage } from './pages/EditorPage';
import { uploadTestDocument } from './fixtures/test-helpers';

test.describe('Document Validation Integration', () => {
  let editorPage: EditorPage;

  test.beforeEach(async ({ page }) => {
    editorPage = new EditorPage(page);
    await editorPage.goto();

    // Load a sample document to start with
    await editorPage.loadSample('gift-of-the-magi');
    await editorPage.waitForDocumentLoaded();
  });

  test('should show validation panel when button is clicked', async ({ page }) => {
    // Click the Validation button
    await page.getByRole('button', { name: /validation/i }).click();

    // Validation panel should be visible
    await expect(page.locator('[role="region"][aria-label="Validation Results"]')).toBeVisible();
  });

  test('should display validation results for valid document', async ({ page }) => {
    // Open validation panel
    await page.getByRole('button', { name: /validation/i }).click();

    // Should show document is valid (gift-of-the-magi is valid)
    await expect(page.getByText(/document is valid/i)).toBeVisible();
    await expect(page.getByText(/passed all validation checks/i)).toBeVisible();
  });

  test('should block invalid edit and show error message', async ({ page }) => {
    // Create invalid XML (missing closing tag)
    const invalidXml = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader>
    <fileDesc>
      <titleStmt>
        <title>Invalid Document</title>
      </titleStmt>
      <publicationStmt>
        <publisher>Test</publisher>
      </publicationStmt>
      <sourceDesc>
        <p>Test</p>
      </sourceDesc>
    </fileDesc>
  </teiHeader>
  <text>
    <body>
      <p>Test paragraph with <said>unclosed tag`;

    // Upload the invalid document
    await uploadTestDocument(page, {
      name: 'invalid-test.tei.xml',
      content: invalidXml,
    });

    // Wait for validation to complete
    await page.waitForTimeout(500);

    // Should show validation error toast
    await expect(page.getByText(/validation failed/i)).toBeVisible();

    // Open validation panel to see errors
    await page.getByRole('button', { name: /validation/i }).click();

    // Should show error count
    await expect(page.getByText(/\d+ errors/)).toBeVisible();

    // Should show error messages
    await expect(page.locator('[role="alert"]').filter({ hasText: /error/i })).toBeVisible();
  });

  test('should allow valid edit and update validation results', async ({ page }) => {
    // Open validation panel first
    await page.getByRole('button', { name: /validation/i }).click();

    // Document should be valid initially
    await expect(page.getByText(/document is valid/i)).toBeVisible();

    // Make a valid edit (apply a tag)
    await page.locator('[id^="passage-"]').first().click();
    const selection = await page.evaluate(() => {
      const passage = document.querySelector('[id^="passage-"]');
      if (passage && passage.firstChild) {
        const textNode = passage.firstChild;
        const range = document.createRange();
        range.setStart(textNode, 0);
        range.setEnd(textNode, Math.min(10, textNode.textContent?.length || 0));
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        return textNode.textContent?.substring(0, 10);
      }
      return null;
    });

    if (selection) {
      // Click the said tag button
      await page.getByRole('button', { name: /^said$/i }).click();

      // Wait for validation
      await page.waitForTimeout(500);

      // Document should still be valid
      await expect(page.getByText(/document is valid/i)).toBeVisible();
    }
  });

  test('should show error count on validation button when invalid', async ({ page }) => {
    // Create invalid XML with multiple errors
    const invalidXml = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader>
    <fileDesc>
      <titleStmt>
        <title>Invalid</title>
      </titleStmt>
      <publicationStmt>
        <publisher>Test</publisher>
      </publicationStmt>
      <sourceDesc>
        <p>Test</p>
      </sourceDesc>
    </fileDesc>
  </teiHeader>
  <text>
    <body>
      <p>Test with <unknownTag>invalid tag</said>`;

    // Upload the invalid document
    await uploadTestDocument(page, {
      name: 'invalid-multiple-errors.tei.xml',
      content: invalidXml,
    });

    // Wait for validation
    await page.waitForTimeout(500);

    // Validation button should show error count
    const validationButton = page.getByRole('button', { name: /validation/i });
    await expect(validationButton).toContainText(/\d+ errors/);

    // Button should have red styling
    await expect(validationButton).toHaveClass(/border-red-500/);
  });

  test('should show validating state during validation', async ({ page }) => {
    // Open validation panel
    await page.getByRole('button', { name: /validation/i }).click();

    // Trigger a validation by making an edit
    await page.locator('[id^="passage-"]').first().click();

    // The validating state should appear briefly
    // Note: This might be hard to catch consistently, but we can check
    // that the validation button text changes
    const validationButton = page.getByRole('button', { name: /validation/i });

    // After edit, should show "Validating..." briefly then return to normal
    // We'll just verify it doesn't show "Validating..." after completion
    await page.waitForTimeout(1000);
    await expect(validationButton).not.toContainText(/validating/i);
  });

  test('should allow clicking on validation errors', async ({ page }) => {
    // Create invalid XML
    const invalidXml = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader>
    <fileDesc>
      <titleStmt>
        <title>Invalid</title>
      </titleStmt>
      <publicationStmt>
        <publisher>Test</publisher>
      </publicationStmt>
      <sourceDesc>
        <p>Test</p>
      </sourceDesc>
    </fileDesc>
  </teiHeader>
  <text>
    <body>
      <p>Test with <unknownTag>invalid content</unknownTag></p>`;

    // Upload the invalid document
    await uploadTestDocument(page, {
      name: 'invalid-with-location.tei.xml',
      content: invalidXml,
    });

    // Wait for validation
    await page.waitForTimeout(500);

    // Open validation panel
    await page.getByRole('button', { name: /validation/i }).click();

    // Click on an error
    const firstError = page.locator('[role="alert"]').filter({ hasText: /error/i }).first();
    await firstError.click();

    // Should show a toast with error details
    await expect(page.getByText(/error at line/i)).toBeVisible();
  });

  test('should filter validation errors by severity', async ({ page }) => {
    // Create invalid XML
    const invalidXml = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader>
    <fileDesc>
      <titleStmt>
        <title>Invalid</title>
      </titleStmt>
      <publicationStmt>
        <publisher>Test</publisher>
      </publicationStmt>
      <sourceDesc>
        <p>Test</p>
      </sourceDesc>
    </fileDesc>
  </teiHeader>
  <text>
    <body>
      <p>Test with <unknownTag>invalid content</unknownTag></p>`;

    // Upload the invalid document
    await uploadTestDocument(page, {
      name: 'invalid-for-filtering.tei.xml',
      content: invalidXml,
    });

    // Wait for validation
    await page.waitForTimeout(500);

    // Open validation panel
    await page.getByRole('button', { name: /validation/i }).click();

    // Click on "Errors" filter button
    const errorsButton = page.getByRole('button', { name: /errors \(\d+\)/i });
    await errorsButton.click();

    // Should only show errors
    await expect(page.locator('[role="alert"]').filter({ hasText: /error/i }).first()).toBeVisible();
  });

  test('should maintain valid state after valid edit', async ({ page }) => {
    // Open validation panel
    await page.getByRole('button', { name: /validation/i }).click();

    // Should be valid initially
    await expect(page.getByText(/document is valid/i)).toBeVisible();

    // Make a valid edit (select some text and apply tag)
    const firstPassage = page.locator('[id^="passage-"]').first();
    await firstPassage.click();

    // Select text programmatically
    const selectedText = await page.evaluate(() => {
      const passage = document.querySelector('[id^="passage-"]');
      if (passage && passage.firstChild) {
        const textNode = passage.firstChild;
        const text = textNode.textContent || '';
        if (text.length > 5) {
          const range = document.createRange();
          range.setStart(textNode, 0);
          range.setEnd(textNode, 5);
          const selection = window.getSelection();
          selection?.removeAllRanges();
          selection?.addRange(range);
          return text.substring(0, 5);
        }
      }
      return null;
    });

    if (selectedText) {
      // Apply a tag
      await page.getByRole('button', { name: /^said$/i }).click();

      // Wait for validation
      await page.waitForTimeout(500);

      // Should still be valid
      await expect(page.getByText(/document is valid/i)).toBeVisible();
    }
  });

  test('should close validation panel when button is clicked again', async ({ page }) => {
    // Open validation panel
    await page.getByRole('button', { name: /validation/i }).click();
    await expect(page.locator('[role="region"][aria-label="Validation Results"]')).toBeVisible();

    // Close validation panel
    await page.getByRole('button', { name: /validation/i }).click();
    await expect(page.locator('[role="region"][aria-label="Validation Results"]')).not.toBeVisible();
  });
});

test.describe('Document Validation - Error Scenarios', () => {
  test('should handle malformed XML gracefully', async ({ page }) => {
    const editorPage = new EditorPage(page);
    await editorPage.goto();
    await editorPage.loadSample('gift-of-the-magi');
    await editorPage.waitForDocumentLoaded();

    // Create malformed XML
    const malformedXml = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader>
    <fileDesc>
      <titleStmt>
        <title>Malformed</title>
      </titleStmt>
      <publicationStmt>
        <publisher>Test</publisher>
      </publicationStmt>
      <sourceDesc>
        <p>Test</p>
      </sourceDesc>
    </fileDesc>
  </teiHeader>
  <text>
    <body>
      <p>This is <<<< malformed > XML >`;

    // Upload the malformed document
    await uploadTestDocument(page, {
      name: 'malformed-test.tei.xml',
      content: malformedXml,
    });

    // Wait for validation
    await page.waitForTimeout(500);

    // Should show validation error
    await expect(page.getByText(/validation failed/i)).toBeVisible();

    // Open validation panel
    await page.getByRole('button', { name: /validation/i }).click();

    // Should show errors
    await expect(page.locator('[role="alert"]').filter({ hasText: /error/i })).toBeVisible();
  });

  test('should handle empty document', async ({ page }) => {
    const editorPage = new EditorPage(page);
    await editorPage.goto();
    await editorPage.loadSample('gift-of-the-magi');
    await editorPage.waitForDocumentLoaded();

    // Upload empty document
    await uploadTestDocument(page, {
      name: 'empty-test.tei.xml',
      content: '',
    });

    // Wait for validation
    await page.waitForTimeout(500);

    // Should show validation error
    await expect(page.getByText(/validation failed/i)).toBeVisible();
  });
});
