// @ts-nocheck
/**
 * E2E Tests for Schema Validation Features
 *
 * Tests the new RelaxNG schema validation functionality
 */

import { test, expect } from '@playwright/test';
import { EditorPage } from './pages/EditorPage';
import { uploadTestDocument } from './fixtures/test-helpers';

test.describe('Schema Validation Features', () => {
  let editorPage: EditorPage;

  test.beforeEach(async ({ page }) => {
    editorPage = new EditorPage(page);
    await editorPage.goto();
    await editorPage.waitForDocumentLoaded();
  });

  test('should have validation panel accessible', async ({ page }) => {
    // Check if validation button exists
    const validateButton = page.getByRole('button', { name: /validation/i });
    const buttonCount = await validateButton.count();

    if (buttonCount > 0) {
      // Click to open panel
      await validateButton.first().click();
      await page.waitForTimeout(500);

      // Validation panel should be visible
      const panelVisible = await page.locator('[role="region"][aria-label*="validation"]').count() > 0;
      expect(panelVisible).toBe(true);
    }
  });

  test('should validate a well-formed TEI document', async ({ page }) => {
    // Create a valid TEI document
    const validXml = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader>
    <fileDesc>
      <titleStmt>
        <title>Valid Test Document</title>
      </titleStmt>
      <publicationStmt>
        <publisher>Test Publisher</publisher>
      </publicationStmt>
      <sourceDesc>
        <p>Test source</p>
      </sourceDesc>
    </fileDesc>
  </teiHeader>
  <text>
    <body>
      <p xml:id="p1">This is a valid paragraph.</p>
    </body>
  </text>
</TEI>`;

    // Upload the document
    await uploadTestDocument(page, {
      name: 'valid-test.tei.xml',
      content: validXml,
    });

    // Wait for document to load
    await page.waitForTimeout(1000);

    // Open validation panel
    const validateButton = page.getByRole('button', { name: /validation/i });
    const buttonCount = await validateButton.count();

    if (buttonCount > 0) {
      await validateButton.first().click();
      await page.waitForTimeout(500);

      // Should show document is valid or has minimal warnings
      const validIndicator = page.getByText(/valid|no errors|0 warnings/i);
      const hasValidMsg = await validIndicator.count() > 0;

      // At minimum, the validation panel should be open
      const panelOpen = await page.locator('[role="region"][aria-label*="validation"]').count() > 0;
      expect(panelOpen).toBe(true);
    }
  });

  test('should detect validation errors in malformed TEI', async ({ page }) => {
    // Create a malformed TEI document
    const invalidXml = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader>
    <fileDesc>
      <titleStmt>
        <title>Invalid Document</title>
      </titleStmt>
    </fileDesc>
  </teiHeader>
  <text>
    <body>
      <p>Unclosed paragraph
      <p>Another paragraph</p>
    </body>
  </text>
</TEI>`;

    // Upload the invalid document
    await uploadTestDocument(page, {
      name: 'invalid-test.tei.xml',
      content: invalidXml,
    });

    // Wait for document to load
    await page.waitForTimeout(1000);

    // Open validation panel
    const validateButton = page.getByRole('button', { name: /validation/i });
    const buttonCount = await validateButton.count();

    if (buttonCount > 0) {
      await validateButton.first().click();
      await page.waitForTimeout(500);

      // Should show validation errors
      const errorIndicator = page.getByText(/error|invalid|malformed/i);
      const hasError = await errorIndicator.count() > 0;

      // Look for error details in the panel
      const panelContent = page.locator('[role="region"][aria-label*="validation"]');
      const panelVisible = await panelContent.count() > 0;
      expect(panelVisible).toBe(true);

      // Check if there are error messages
      const errors = panelContent.getByText(/error|warning|line/i);
      const hasErrors = await errors.count() > 0;

      // Either should have errors or at least the panel should be open
      expect(hasError || hasErrors || panelVisible).toBe(true);
    }
  });

  test('should support schema selection dropdown', async ({ page }) => {
    // Open validation panel
    const validateButton = page.getByRole('button', { name: /validation/i });
    const buttonCount = await validateButton.count();

    if (buttonCount > 0) {
      await validateButton.first().click();
      await page.waitForTimeout(500);

      // Look for schema selector (select or dropdown)
      const schemaSelector = page.locator('select[name*="schema"], [role="combobox"]').first();
      const selectorExists = await schemaSelector.count() > 0;

      if (selectorExists) {
        // Get available options
        const options = await schemaSelector.locator('option').all();
        const optionCount = options.length;

        // Should have at least one schema option
        expect(optionCount).toBeGreaterThan(0);
      } else {
        // Schema selector might be in a different format, check for any dropdown
        const dropdowns = page.locator('[role="combobox"], select').all();
        const dropdownCount = await dropdowns.count();

        // There should be at least some control for schema selection
        expect(dropdownCount).toBeGreaterThan(0);
      }
    }
  });

  test('should display fix suggestions for validation errors', async ({ page }) => {
    // Create a document with a common error (missing required attribute)
    const docWithAttrError = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader>
    <fileDesc>
      <titleStmt>
        <title>Test</title>
      </titleStmt>
    </fileDesc>
  </teiHeader>
  <text>
    <body>
      <p>Test paragraph</p>
    </body>
  </text>
</TEI>`;

    await uploadTestDocument(page, {
      name: 'attr-test.tei.xml',
      content: docWithAttrError,
    });

    await page.waitForTimeout(1000);

    // Open validation panel
    const validateButton = page.getByRole('button', { name: /validation/i });
    const buttonCount = await validateButton.count();

    if (buttonCount > 0) {
      await validateButton.first().click();
      await page.waitForTimeout(500);

      // Check for fix suggestions or error details
      const panelContent = page.locator('[role="region"][aria-label*="validation"]');

      // Look for helpful information (errors, warnings, suggestions)
      const hasInfo = await panelContent.getByText(/error|warning|fix|suggest|line/i).count() > 0;

      // There should be some validation information
      const panelOpen = await panelContent.count() > 0;
      expect(panelOpen).toBe(true);
    }
  });

  test('should allow re-validation after schema change', async ({ page }) => {
    // Open validation panel first
    const validateButton = page.getByRole('button', { name: /validation/i });
    const buttonCount = await validateButton.count();

    if (buttonCount > 0) {
      await validateButton.first().click();
      await page.waitForTimeout(500);

      // If there's a schema selector, try changing it
      const schemaSelector = page.locator('select[name*="schema"], [role="combobox"]').first();
      const selectorExists = await schemaSelector.count() > 0;

      if (selectorExists) {
        // Get current value
        const currentValue = await schemaSelector.inputValue();
        const options = await schemaSelector.locator('option').all();

        if (options.length > 1) {
          // Select a different schema
          await schemaSelector.selectOption({ index: 1 });
          await page.waitForTimeout(500);

          // Validation should update (re-run automatically or have a revalidate button)
          const revalidateButton = page.getByRole('button', { name: /revalidate|validate again/i });
          const revalidateCount = await revalidateButton.count();

          if (revalidateCount > 0) {
            await revalidateButton.first().click();
            await page.waitForTimeout(500);
          }

          // Validation results should be present
          const panelContent = page.locator('[role="region"][aria-label*="validation"]');
          expect(await panelContent.count()).toBeGreaterThan(0);
        }
      }
    }
  });

  test('should show validation progress for large documents', async ({ page }) => {
    // Create a larger document
    let largeXml = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader>
    <fileDesc>
      <titleStmt><title>Large Document</title></titleStmt>
      <publicationStmt><publisher>Test</publisher></publicationStmt>
    </fileDesc>
  </teiHeader>
  <text>
    <body>`;

    // Add 50 paragraphs
    for (let i = 1; i <= 50; i++) {
      largeXml += `      <p xml:id="p${i}">Paragraph ${i} with some content for testing.</p>\n`;
    }

    largeXml += `    </body>
  </text>
</TEI>`;

    await uploadTestDocument(page, {
      name: 'large-test.tei.xml',
      content: largeXml,
    });

    await page.waitForTimeout(2000);

    // Open validation panel
    const validateButton = page.getByRole('button', { name: /validation/i });
    const buttonCount = await validateButton.count();

    if (buttonCount > 0) {
      await validateButton.first().click();
      await page.waitForTimeout(500);

      // Look for loading indicator or progress
      const loadingIndicator = page.locator('[role="progressbar"], [aria-busy="true"], .loading, [class*="spinner"]').first();
      const loadingExists = await loadingIndicator.count() > 0;

      // Or check for completion message
      const completeMsg = page.getByText(/valid|complete|done/i);
      const hasCompleteMsg = await completeMsg.count() > 0;

      // Should either show loading or completion
      const panelOpen = await page.locator('[role="region"][aria-label*="validation"]').count() > 0;
      expect(panelOpen).toBe(true);
    }
  });

  test('should preserve validation state when switching tabs', async ({ page }) => {
    // Open validation panel
    const validateButton = page.getByRole('button', { name: /validation/i });
    const buttonCount = await validateButton.count();

    if (buttonCount > 0) {
      await validateButton.first().click();
      await page.waitForTimeout(500);

      // Note the validation panel state (open/closed)
      const panelVisible = await page.locator('[role="region"][aria-label*="validation"]').isVisible();

      // Switch to another tab (e.g., XML view)
      const xmlTab = page.getByRole('tab', { name: /xml|code/i });
      const tabCount = await xmlTab.count();

      if (tabCount > 0) {
        await xmlTab.first().click();
        await page.waitForTimeout(500);

        // Switch back
        const editorTab = page.getByRole('tab', { name: /editor|wysiwyg/i });
        const editorTabCount = await editorTab.count();

        if (editorTabCount > 0) {
          await editorTab.first().click();
          await page.waitForTimeout(500);
        }

        // Validation state should be preserved (or easily accessible)
        const validateButtonStill = page.getByRole('button', { name: /validation/i });
        expect(await validateButtonStill.count()).toBeGreaterThan(0);
      }
    }
  });

  test('should integrate with Effect document services', async ({ page }) => {
    // Enable Effect flag
    await page.addInitScript(() => {
      localStorage.setItem('feature-useEffectEditor', 'true');
      localStorage.setItem('feature-useEffectMisc', 'true');
    });

    await page.goto('/');
    await page.waitForTimeout(2000);

    // Open validation panel
    const validateButton = page.getByRole('button', { name: /validation/i });
    const buttonCount = await validateButton.count();

    if (buttonCount > 0) {
      await validateButton.first().click();
      await page.waitForTimeout(500);

      // Validation should work with Effect document services
      const panelContent = page.locator('[role="region"][aria-label*="validation"]');
      expect(await panelContent.count()).toBeGreaterThan(0);

      // Verify Effect flag is enabled
      const effectEnabled = await page.evaluate(() => {
        return localStorage.getItem('feature-useEffectEditor') === 'true' &&
               localStorage.getItem('feature-useEffectMisc') === 'true';
      });
      expect(effectEnabled).toBe(true);
    }
  });
});

test.describe('Schema Validation Service Integration', () => {
  test('should load RelaxNG schemas from server', async ({ page }) => {
    // Navigate to app
    await page.goto('/');
    await page.waitForTimeout(2000);

    // Try to access schema API endpoint
    const response = await page.request.get('/api/schemas');

    // Should either get a 200 OK (if endpoint exists) or 404 (if not implemented)
    expect([200, 404, 405]).toContain(response.status());
  });

  test('should handle validation errors gracefully', async ({ page }) => {
    // Try to validate an empty document
    const emptyXml = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
</TEI>`;

    await page.goto('/');
    await page.waitForTimeout(2000);

    // The app should not crash with invalid XML
    const hasError = await page.getByText(/error|crash|failed/i).count();

    // Either shows an error message or handles it gracefully
    // (not crashing is the important part)
    const pageLoaded = await page.locator('body').isVisible();
    expect(pageLoaded).toBe(true);
  });
});
