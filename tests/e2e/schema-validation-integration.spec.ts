/**
 * E2E Tests for Schema Validation Integration
 *
 * Comprehensive end-to-end tests for schema selection and validation behavior.
 * These tests verify that different schemas actually produce different validation results.
 *
 * Philosophy: E2E tests should be the primary validation mechanism for schema behavior.
 */

import { test, expect } from '@playwright/test';
import { EditorPage } from './pages/EditorPage';
import { uploadTestDocument } from './fixtures/test-helpers';

test.describe('Schema Validation - Complete Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home page and wait for it to load
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check if we need to load a document (welcome screen)
    const hasPassage = await page.locator('[id^="passage-"]').count() > 0;

    if (!hasPassage) {
      // We're on welcome screen - load a simple valid document first
      const simpleXml = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader>
    <fileDesc>
      <titleStmt><title>Test</title></titleStmt>
      <publicationStmt><publisher>Test</publisher><date>2024</date></publicationStmt>
      <sourceDesc><p>Test</p></sourceDesc>
    </fileDesc>
  </teiHeader>
  <text><body><p>Initial document</p></body></text>
</TEI>`;

      await uploadTestDocument(page, {
        name: 'initial-test.tei.xml',
        content: simpleXml,
      });

      // Wait for document to load
      await page.waitForSelector('[id^="passage-"]', { state: 'attached', timeout: 10000 });
      await page.waitForTimeout(500);
    }
  });

  test('should validate dialogue document with tei-minimal schema', async ({ page }) => {
    // Create a valid dialogue document (tei-minimal allows sp, speaker, stage)
    const dialogueXml = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader>
    <fileDesc>
      <titleStmt>
        <title>Dialogue Test</title>
      </titleStmt>
      <publicationStmt>
        <publisher>Test</publisher>
        <date>2024</date>
      </publicationStmt>
      <sourceDesc>
        <p>Test</p>
      </sourceDesc>
    </fileDesc>
  </teiHeader>
  <text>
    <body>
      <sp>
        <speaker>Character A</speaker>
        <p>Hello!</p>
      </sp>
      <sp>
        <speaker>Character B</speaker>
        <stage>(waves)</stage>
        <p>Hi there!</p>
      </sp>
    </body>
  </text>
</TEI>`;

    await uploadTestDocument(page, {
      name: 'dialogue-test.tei.xml',
      content: dialogueXml,
    });

    // Wait for validation
    await page.waitForTimeout(1000);

    // Open validation panel
    await page.getByRole('button', { name: 'Validation' }).click();
    await page.waitForTimeout(300);

    // Should be valid with tei-minimal schema
    await expect(page.getByText(/document is valid/i)).toBeVisible();

    // Verify schema selector shows tei-minimal (default)
    const schemaValue = await page.locator('#schema-select').inputValue();
    expect(schemaValue).toBe('tei-minimal');
  });

  test('should validate prose document with tei-novel schema', async ({ page }) => {
    // Create a valid prose document (tei-novel allows div, quote, name)
    const proseXml = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader>
    <fileDesc>
      <titleStmt>
        <title>Prose Test</title>
        <author>Test Author</author>
      </titleStmt>
      <publicationStmt>
        <publisher>Test</publisher>
        <date>2024</date>
      </publicationStmt>
      <sourceDesc>
        <p>Test</p>
      </sourceDesc>
    </fileDesc>
  </teiHeader>
  <text>
    <body>
      <div type="chapter">
        <head>Chapter One</head>
        <p>This is a story with <name>John</name> as the main character.</p>
        <quote>
          <p>To be or not to be.</p>
        </quote>
      </div>
    </body>
  </text>
</TEI>`;

    await uploadTestDocument(page, {
      name: 'prose-test.tei.xml',
      content: proseXml,
    });

    // Wait for validation
    await page.waitForTimeout(1000);

    // Open validation panel
    await page.getByRole('button', { name: 'Validation' }).click();
    await page.waitForTimeout(300);

    // Switch to tei-novel schema
    await page.locator('#schema-select').selectOption('tei-novel');
    await page.waitForTimeout(500);

    // Should be valid with tei-novel schema
    await expect(page.getByText(/document is valid/i)).toBeVisible();
  });

  test('should show different validation results for different schemas', async ({ page }) => {
    // Create document with dialogue elements (sp, speaker)
    const mixedXml = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader>
    <fileDesc>
      <titleStmt>
        <title>Mixed Content Test</title>
      </titleStmt>
      <publicationStmt>
        <publisher>Test</publisher>
        <date>2024</date>
      </publicationStmt>
      <sourceDesc>
        <p>Test</p>
      </sourceDesc>
    </fileDesc>
  </teiHeader>
  <text>
    <body>
      <sp>
        <speaker>Character</speaker>
        <p>Some dialogue.</p>
      </sp>
    </body>
  </text>
</TEI>`;

    await uploadTestDocument(page, {
      name: 'mixed-content.tei.xml',
      content: mixedXml,
    });

    await page.waitForTimeout(1000);

    // Open validation panel
    await page.getByRole('button', { name: 'Validation' }).click();
    await page.waitForTimeout(300);

    // With tei-minimal (default) - should be VALID
    await expect(page.getByText(/document is valid/i)).toBeVisible();

    // Switch to tei-novel - should show VALIDATION ERRORS
    // (tei-novel doesn't allow sp/speaker elements at body level)
    await page.locator('#schema-select').selectOption('tei-novel');
    await page.waitForTimeout(500);

    // Should now show validation errors
    const hasErrors = await page.getByText(/error/i).count();
    expect(hasErrors).toBeGreaterThan(0);
  });

  test('should handle schema errors gracefully', async ({ page }) => {
    // Create an invalid document
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
      <unknownTag>This tag is not in any schema</unknownTag>
    </body>
  </text>
</TEI>`;

    await uploadTestDocument(page, {
      name: 'invalid-schema-test.tei.xml',
      content: invalidXml,
    });

    await page.waitForTimeout(1000);

    // Open validation panel
    await page.getByRole('button', { name: 'Validation' }).click();
    await page.waitForTimeout(300);

    // Should show validation errors
    await expect(page.getByText(/validation error|unknown|invalid/i)).toBeVisible();

    // Verify error is displayed
    const errorCount = await page.locator('[role="alert"]').count();
    expect(errorCount).toBeGreaterThan(0);
  });

  test('should persist schema selection and re-validate', async ({ page }) => {
    // Load any document
    await page.getByRole('button', { name: 'Validation' }).click();
    await page.waitForTimeout(300);

    // Select tei-all schema
    await page.locator('#schema-select').selectOption('tei-all');
    await page.waitForTimeout(500);

    // Get selected value
    const selectedSchema = await page.locator('#schema-select').inputValue();
    expect(selectedSchema).toBe('tei-all');

    // Reload page
    await page.reload();
    await page.waitForTimeout(1000);

    // Open validation panel again
    await page.getByRole('button', { name: 'Validation' }).click();
    await page.waitForTimeout(300);

    // Schema selection should persist
    const persistedSchema = await page.locator('#schema-select').inputValue();
    expect(persistedSchema).toBe('tei-all');
  });

  test('should display schema metadata in UI', async ({ page }) => {
    // Open validation panel
    await page.getByRole('button', { name: 'Validation' }).click();
    await page.waitForTimeout(300);

    // Verify schema selector label
    await expect(page.getByText('Validation Schema')).toBeVisible();

    // Select tei-minimal to see its metadata
    await page.locator('#schema-select').selectOption('tei-minimal');
    await page.waitForTimeout(300);

    // Should show description
    await expect(page.getByText(/dialogue|Core TEI/i)).toBeVisible();

    // Should show tags
    const tagsVisible = await page.getByText(/dialogue|fast|lightweight/i).count();
    expect(tagsVisible).toBeGreaterThan(0);

    // Select tei-all to see different metadata
    await page.locator('#schema-select').selectOption('tei-all');
    await page.waitForTimeout(300);

    // Should show different description
    await expect(page.getByText(/complete|comprehensive|TEI P5/i)).toBeVisible();
  });

  test('should re-validate when schema is changed', async ({ page }) => {
    // Create a valid document
    const validXml = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader>
    <fileDesc>
      <titleStmt>
        <title>Valid Document</title>
      </titleStmt>
      <publicationStmt>
        <publisher>Test</publisher>
        <date>2024</date>
      </publicationStmt>
      <sourceDesc>
        <p>Test</p>
      </sourceDesc>
    </fileDesc>
  </teiHeader>
  <text>
    <body>
      <p>Simple paragraph.</p>
    </body>
  </text>
</TEI>`;

    await uploadTestDocument(page, {
      name: 'simple-valid.tei.xml',
      content: validXml,
    });

    await page.waitForTimeout(1000);

    // Open validation panel
    await page.getByRole('button', { name: 'Validation' }).click();
    await page.waitForTimeout(300);

    // Should be valid initially
    await expect(page.getByText(/document is valid/i)).toBeVisible();

    // Change schema
    await page.locator('#schema-select').selectOption('tei-all');
    await page.waitForTimeout(500);

    // Should re-validate and still be valid
    await expect(page.getByText(/document is valid/i)).toBeVisible();

    // Change schema again
    await page.locator('#schema-select').selectOption('tei-novel');
    await page.waitForTimeout(500);

    // Should still be valid
    await expect(page.getByText(/document is valid/i)).toBeVisible();
  });

  test('should show available schemas in dropdown', async ({ page }) => {
    // Open validation panel
    await page.getByRole('button', { name: 'Validation' }).click();
    await page.waitForTimeout(300);

    // Get all options from schema selector
    const schemaSelect = page.locator('#schema-select');
    const options = await schemaSelect.locator('option').all();

    // Should have at least 3 schemas
    expect(options.length).toBeGreaterThanOrEqual(3);

    // Get option values/text
    const optionTexts = await Promise.all(
      options.map(async (option) => await option.textContent())
    );

    // Should contain our three schemas
    expect(optionTexts.some(text => text?.includes('Minimal'))).toBeTruthy();
    expect(optionTexts.some(text => text?.includes('Complete'))).toBeTruthy();
    expect(optionTexts.some(text => text?.includes('Novel'))).toBeTruthy();
  });

  test('should handle validation timeout gracefully', async ({ page }) => {
    // Create a complex document that might take longer to validate
    const largeXml = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader>
    <fileDesc>
      <titleStmt>
        <title>Large Document</title>
      </titleStmt>
      <publicationStmt>
        <publisher>Test</publisher>
        <date>2024</date>
      </publicationStmt>
      <sourceDesc>
        <p>Test</p>
      </sourceDesc>
    </fileDesc>
  </teiHeader>
  <text>
    <body>
      ${Array(50).fill('<p>Test paragraph with some content.</p>').join('\n      ')}
    </body>
  </text>
</TEI>`;

    await uploadTestDocument(page, {
      name: 'large-document.tei.xml',
      content: largeXml,
    });

    // Open validation panel
    await page.getByRole('button', { name: 'Validation' }).click();
    await page.waitForTimeout(300);

    // Should complete validation (might take a moment)
    await page.waitForTimeout(2000);

    // Panel should be visible
    await expect(page.locator('[role="region"][aria-label="Validation Results"]')).toBeVisible();
  });

  test('should validate with tei-all schema (comprehensive)', async ({ page }) => {
    // Create document with many TEI elements
    const comprehensiveXml = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader>
    <fileDesc>
      <titleStmt>
        <title>Comprehensive Test</title>
        <author>Test Author</author>
      </titleStmt>
      <publicationStmt>
        <publisher>Test Publisher</publisher>
        <date>2024</date>
      </publicationStmt>
      <sourceDesc>
        <p>Test source</p>
      </sourceDesc>
    </fileDesc>
  </teiHeader>
  <text>
    <body>
      <div>
        <head>Section</head>
        <p>Paragraph with <emph>emphasis</emph> and <q>quote</q>.</p>
        <p>Paragraph with a <name>named entity</name>.</p>
        <sp>
          <speaker>Speaker</speaker>
          <p>Dialogue within prose.</p>
        </sp>
        <quote>
          <p>A quoted paragraph.</p>
        </quote>
      </div>
    </body>
  </text>
</TEI>`;

    await uploadTestDocument(page, {
      name: 'comprehensive-test.tei.xml',
      content: comprehensiveXml,
    });

    await page.waitForTimeout(1000);

    // Open validation panel
    await page.getByRole('button', { name: 'Validation' }).click();
    await page.waitForTimeout(300);

    // Switch to tei-all (comprehensive schema)
    await page.locator('#schema-select').selectOption('tei-all');
    await page.waitForTimeout(1000);

    // Should be valid with comprehensive schema
    await expect(page.getByText(/document is valid/i)).toBeVisible();
  });
});

test.describe('Schema Validation - Error Cases', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home page and wait for it to load
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check if we need to load a document
    const hasPassage = await page.locator('[id^="passage-"]').count() > 0;

    if (!hasPassage) {
      // Load initial document
      const simpleXml = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader>
    <fileDesc>
      <titleStmt><title>Test</title></titleStmt>
      <publicationStmt><publisher>Test</publisher><date>2024</date></publicationStmt>
      <sourceDesc><p>Test</p></sourceDesc>
    </fileDesc>
  </teiHeader>
  <text><body><p>Initial document</p></body></text>
</TEI>`;

      await uploadTestDocument(page, {
        name: 'initial-test.tei.xml',
        content: simpleXml,
      });

      await page.waitForSelector('[id^="passage-"]', { state: 'attached', timeout: 10000 });
      await page.waitForTimeout(500);
    }
  });

  test('should handle schema that doesn\'t match document type', async ({ page }) => {

    // Create document with dialogue elements
    const dialogueXml = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader>
    <fileDesc>
      <titleStmt><title>Test</title></titleStmt>
      <publicationStmt><publisher>Test</publisher><date>2024</date></publicationStmt>
      <sourceDesc><p>Test</p></sourceDesc>
    </fileDesc>
  </teiHeader>
  <text>
    <body>
      <sp><speaker>Character</speaker><p>Dialogue</p></sp>
    </body>
  </text>
</TEI>`;

    await uploadTestDocument(page, {
      name: 'dialogue-only.tei.xml',
      content: dialogueXml,
    });

    await page.waitForTimeout(1000);

    // Open validation panel
    await page.getByRole('button', { name: 'Validation' }).click();
    await page.waitForTimeout(300);

    // With tei-minimal - VALID
    await page.locator('#schema-select').selectOption('tei-minimal');
    await page.waitForTimeout(500);
    await expect(page.getByText(/document is valid/i)).toBeVisible();

    // With tei-novel - INVALID (tei-novel doesn't allow sp at body level)
    await page.locator('#schema-select').selectOption('tei-novel');
    await page.waitForTimeout(500);
    await expect(page.getByText(/error|unknown|unexpected/i)).toBeVisible();
  });

  test('should handle empty elements correctly', async ({ page }) => {
    const editorPage = new EditorPage(page);
    await editorPage.goto();
    await editorPage.waitForDocumentLoaded();

    // Document with empty paragraph
    const emptyXml = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader>
    <fileDesc>
      <titleStmt><title>Test</title></titleStmt>
      <publicationStmt><publisher>Test</publisher><date>2024</date></publicationStmt>
      <sourceDesc><p>Test</p></sourceDesc>
    </fileDesc>
  </teiHeader>
  <text>
    <body>
      <p></p>
    </body>
  </text>
</TEI>`;

    await uploadTestDocument(page, {
      name: 'empty-elements.tei.xml',
      content: emptyXml,
    });

    await page.waitForTimeout(1000);

    // Open validation panel
    await page.getByRole('button', { name: 'Validation' }).click();
    await page.waitForTimeout(300);

    // Empty paragraph should be valid (schemas allow empty text)
    await expect(page.getByText(/document is valid/i)).toBeVisible();
  });

  test('should show specific error messages for validation failures', async ({ page }) => {
    const editorPage = new EditorPage(page);
    await editorPage.goto();
    await editorPage.waitForDocumentLoaded();

    // Document with clearly invalid structure
    const invalidXml = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader>
    <fileDesc>
      <titleStmt><title>Test</title></titleStmt>
      <publicationStmt><publisher>Test</publisher><date>2024</date></publicationStmt>
      <sourceDesc><p>Test</p></sourceDesc>
    </fileDesc>
  </teiHeader>
  <text>
    <body>
      <totallyWrongElement>This should fail</totallyWrongElement>
    </body>
  </text>
</TEI>`;

    await uploadTestDocument(page, {
      name: 'wrong-element.tei.xml',
      content: invalidXml,
    });

    await page.waitForTimeout(1000);

    // Open validation panel
    await page.getByRole('button', { name: 'Validation' }).click();
    await page.waitForTimeout(300);

    // Should show specific error
    const errorText = await page.locator('[role="alert"]').first().textContent();
    expect(errorText).toMatch(/error|unknown|unexpected|totallyWrongElement/i);
  });
});

test.describe('Schema Selection - User Experience', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home page and wait for it to load
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check if we need to load a document
    const hasPassage = await page.locator('[id^="passage-"]').count() > 0;

    if (!hasPassage) {
      // Load initial document
      const simpleXml = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader>
    <fileDesc>
      <titleStmt><title>Test</title></titleStmt>
      <publicationStmt><publisher>Test</publisher><date>2024</date></publicationStmt>
      <sourceDesc><p>Test</p></sourceDesc>
    </fileDesc>
  </teiHeader>
  <text><body><p>Initial document</p></body></text>
</TEI>`;

      await uploadTestDocument(page, {
        name: 'initial-test.tei.xml',
        content: simpleXml,
      });

      await page.waitForSelector('[id^="passage-"]', { state: 'attached', timeout: 10000 });
      await page.waitForTimeout(500);
    }
  });

  test('should have intuitive default schema selection', async ({ page }) => {

    // Open validation panel
    await page.getByRole('button', { name: 'Validation' }).click();
    await page.waitForTimeout(300);

    // Default should be tei-minimal (fastest)
    const defaultSchema = await page.locator('#schema-select').inputValue();
    expect(defaultSchema).toBe('tei-minimal');

    // Description should mention it's fast/lightweight
    await expect(page.getByText(/dialogue|lightweight|fast/i)).toBeVisible();
  });

  test('should provide helpful schema descriptions', async ({ page }) => {
    const editorPage = new EditorPage(page);
    await editorPage.goto();
    await editorPage.waitForDocumentLoaded();

    // Open validation panel
    await page.getByRole('button', { name: 'Validation' }).click();
    await page.waitForTimeout(300);

    // Check each schema has meaningful description
    const schemas = ['tei-minimal', 'tei-all', 'tei-novel'];

    for (const schema of schemas) {
      await page.locator('#schema-select').selectOption(schema);
      await page.waitForTimeout(300);

      // Should have description
      const description = await page.locator('.schema-description, [class*="schema-info"]').textContent();
      expect(description?.length).toBeGreaterThan(10); // Has meaningful text

      // Should have tags
      const tags = await page.locator('.tag').count();
      expect(tags).toBeGreaterThan(0);
    }
  });

  test('should make schema switching smooth', async ({ page }) => {
    const editorPage = new EditorPage(page);
    await editorPage.goto();
    await editorPage.waitForDocumentLoaded();

    // Open validation panel
    await page.getByRole('button', { name: 'Validation' }).click();
    await page.waitForTimeout(300);

    const startTime = Date.now();

    // Switch through all schemas quickly
    await page.locator('#schema-select').selectOption('tei-minimal');
    await page.waitForTimeout(300);
    await page.locator('#schema-select').selectOption('tei-all');
    await page.waitForTimeout(300);
    await page.locator('#schema-select').selectOption('tei-novel');
    await page.waitForTimeout(300);

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Should complete in reasonable time (< 5 seconds for 3 switches)
    expect(duration).toBeLessThan(5000);
  });
});
