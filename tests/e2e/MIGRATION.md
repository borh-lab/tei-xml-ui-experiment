# E2E Test Migration Guide

This document describes the migration from a monolithic test structure to a modular, maintainable architecture.

## Table of Contents

- [Overview](#overview)
- [Architecture Changes](#architecture-changes)
- [New Helper Functions](#new-helper-functions)
- [Migration Guide](#migration-guide)
- [Examples](#examples)
- [Before and After](#before-and-after)

## Overview

### The Problem

The original test structure had several issues:
- **Monolithic tests** - All test logic in one large file
- **Code duplication** - Repeated patterns across tests
- **Hard to maintain** - Changes required updating multiple places
- **No reusability** - Test helpers mixed with test logic
- **Poor organization** - Difficult to find specific functionality

### The Solution

We've restructured the tests into a modular architecture:
- **Page Objects** - Encapsulate page-specific logic
- **Test Helpers** - Reusable utility functions
- **Test Constants** - Centralized configuration
- **Separation of Concerns** - Clear boundaries between components

## Architecture Changes

### Old Structure

```
tests/e2e/
└── tei-dialogue-editor.spec.ts  (400+ lines of mixed concerns)
```

### New Structure

```
tests/e2e/
├── fixtures/
│   ├── test-helpers.ts       # Reusable helper functions
│   └── test-constants.ts     # Test constants and configuration
├── pages/
│   ├── EditorPage.ts         # Editor page object
│   ├── WelcomePage.ts        # Welcome page object
│   └── VisualizationPage.ts  # Visualization page object
├── tei-dialogue-editor.spec.ts  # Test specifications (cleaner)
├── README.md                 # Comprehensive documentation
└── MIGRATION.md              # This file
```

### Benefits

1. **Reusability** - Helpers can be used across multiple tests
2. **Maintainability** - Changes to one component don't affect others
3. **Readability** - Test files are shorter and clearer
4. **Scalability** - Easy to add new tests and helpers
5. **Testability** - Individual components can be tested independently

## New Helper Functions

### Document Operations

#### `uploadTestDocument(page, doc)`

Uploads a test document to the editor.

**Parameters:**
- `page: Page` - Playwright page object
- `doc: { name: string; content: string }` - Document to upload

**Example:**
```typescript
await uploadTestDocument(page, {
  name: 'test-document.tei.xml',
  content: '<?xml version="1.0"?><TEI>...</TEI>'
});
```

#### `loadSample(page, sampleName)`

Loads a sample document from the gallery.

**Parameters:**
- `page: Page` - Playwright page object
- `sampleName: string` - Name of the sample to load

**Example:**
```typescript
await loadSample(page, 'yellow-wallpaper');
```

#### `generateTestDocument(options)`

Generates a test TEI document with specified parameters.

**Parameters:**
- `options: {
    speakers: string[];
    passages: number;
    namespaces?: boolean;
    declarations?: boolean;
  }`

**Example:**
```typescript
const xml = generateTestDocument({
  speakers: ['narrator', 'della', 'jim'],
  passages: 10,
  namespaces: true,
  declarations: true
});
```

#### `createMinimalTEI(options)`

Creates a minimal TEI document for edge case testing.

**Parameters:**
- `options: { passages?: number[] }`

**Example:**
```typescript
const xml = createMinimalTEI({
  passages: [1, 2, 3]
});
```

#### `createMalformedTEI(options)`

Creates malformed TEI for error testing.

**Parameters:**
- `options: { error: 'unclosed-tag' | 'invalid-xml' | 'missing-root' }`

**Example:**
```typescript
const badXML = createMalformedTEI({
  error: 'unclosed-tag'
});
```

### Editor Operations

#### `waitForEditorReady(page)`

Waits for the editor to be ready.

**Parameters:**
- `page: Page` - Playwright page object

**Example:**
```typescript
await waitForEditorReady(page);
```

#### `annotatePassage(page, index, speaker)`

Annotates a passage with a speaker.

**Parameters:**
- `page: Page` - Playwright page object
- `index: number` - Passage index
- `speaker: string` - Speaker name

**Example:**
```typescript
await annotatePassage(page, 0, 'narrator');
```

#### `exportDocument(page)`

Triggers export and returns download promise.

**Parameters:**
- `page: Page` - Playwright page object

**Returns:**
- `Promise<Download>` - Playwright download object

**Example:**
```typescript
const download = await exportDocument(page);
```

#### `verifyTEIExport(page, expectedContent)`

Downloads and verifies TEI export.

**Parameters:**
- `page: Page` - Playwright page object
- `expectedContent: string[]` - Expected content in the XML

**Example:**
```typescript
await verifyTEIExport(page, [
  '<TEI',
  '<castList',
  'narrator'
]);
```

### Utilities

#### `mockConsoleErrors(page)`

Captures console errors for testing.

**Parameters:**
- `page: Page` - Playwright page object

**Returns:**
- `Promise<string[]>` - Array of error messages

**Example:**
```typescript
const errors = await mockConsoleErrors(page);
// Run test actions
// Check errors array
expect(errors).toHaveLength(0);
```

## Test Constants

### URLs

```typescript
URLS.HOME         // '/'
URLS.EDITOR       // '/editor'
URLS.SAMPLES      // '/samples'
```

### Selectors

```typescript
SELECTORS.PASSAGE           // '.passage'
SELECTORS.SAMPLE_GALLERY    // '[data-testid="sample-gallery"]'
SELECTORS.COMMAND_PALETTE   // '[data-testid="command-palette"]'
SELECTORS.BULK_PANEL        // '[data-testid="bulk-operations"]'
SELECTORS.VIZ_PANEL         // '[data-testid="visualizations"]'
```

### Timeouts

```typescript
TIMEOUTS.PAGE_LOAD         // 30000ms
TIMEOUTS.NETWORK_IDLE      // 10000ms
TIMEOUTS.ELEMENT_VISIBLE   // 5000ms
TIMEOUTS.AI_SUGGESTION     // 10000ms
```

### Viewport Presets

```typescript
VIEWPORTS.IPHONE_SE    // { width: 375, height: 667, name: 'iPhone SE' }
VIEWPORTS.IPHONE_12    // { width: 390, height: 844, name: 'iPhone 12 Pro' }
VIEWPORTS.ANDROID      // { width: 360, height: 640, name: 'Android' }
VIEWPORTS.IPAD         // { width: 768, height: 1024, name: 'iPad' }
VIEWPORTS.IPAD_PRO     // { width: 1024, height: 1366, name: 'iPad Pro' }
VIEWPORTS.DESKTOP      // { width: 1280, height: 720, name: 'Desktop' }
```

### Sample Documents

```typescript
SAMPLES.YELLOW_WALLPAPER        // 'yellow-wallpaper'
SAMPLES.GIFT_OF_THE_MAGI        // 'gift-of-magi'
SAMPLES.PRIDE_AND_PREJUDICE     // 'pride-and-prejudice'
```

### Speaker Names

```typescript
SPEAKERS.NARRATOR      // 'narrator'
SPEAKERS.DELLA         // 'della'
SPEAKERS.JIM           // 'jim'
SPEAKERS.PROTAGONIST   // 'protagonist'
```

## Migration Guide

### Step 1: Identify Reusable Patterns

Look for repeated code in your tests:
- Document loading
- Annotation workflows
- Export operations
- Common assertions

### Step 2: Extract to Helper Functions

Move repeated code to `test-helpers.ts`:

**Before:**
```typescript
// In test file
const tempPath = join(process.cwd(), 'temp-test.tei.xml');
writeFileSync(tempPath, doc.content);
const fileInput = page.locator('input[type="file"]');
await fileInput.setInputFiles(tempPath);
unlinkSync(tempPath);
```

**After:**
```typescript
// In test file
await uploadTestDocument(page, doc);

// In test-helpers.ts
export async function uploadTestDocument(page: Page, doc: { name: string; content: string }): Promise<void> {
  const tempPath = join(process.cwd(), 'temp-test.tei.xml');
  writeFileSync(tempPath, doc.content);
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(tempPath);
  unlinkSync(tempPath);
}
```

### Step 3: Create Page Objects

Identify pages and create page objects:

**Before:**
```typescript
// In test file
await page.goto('/editor');
await page.waitForLoadState('networkidle');
await page.waitForSelector('.passage');
await page.click('.passage:first-child');
await page.keyboard.press('1');
```

**After:**
```typescript
// In test file
const editorPage = new EditorPage(page);
await editorPage.goto();
await editorPage.annotatePassage(0, 'speaker1');

// In EditorPage.ts
export class EditorPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/editor');
    await waitForEditorReady(this.page);
  }

  async annotatePassage(index: number, speaker: string) {
    const passage = this.page.locator('.passage').nth(index);
    await passage.click();
    const speakerIndex = parseInt(speaker.replace(/\D/g, '')) || 1;
    await this.page.keyboard.press(speakerIndex.toString());
    await passage.waitForElementState('stable');
  }
}
```

### Step 4: Use Constants

Replace magic values with constants:

**Before:**
```typescript
await page.goto('/');
await page.waitForTimeout(10000);
const viewport = { width: 375, height: 667 };
```

**After:**
```typescript
await page.goto(URLS.HOME);
await page.waitForTimeout(TIMEOUTS.NETWORK_IDLE);
const viewport = VIEWPORTS.IPHONE_SE;
```

### Step 5: Organize Tests

Group related tests using `test.describe`:

```typescript
test.describe('Document Export', () => {
  test.beforeEach(async ({ page }) => {
    // Setup for all export tests
  });

  test('should export as TEI XML', async ({ page }) => {
    // Test export
  });

  test('should include all annotations', async ({ page }) => {
    // Test annotations in export
  });
});
```

## Examples

### Example 1: Loading a Document

**Before:**
```typescript
test('should load document', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Find and click sample
  await page.getByText('Yellow Wallpaper').click();
  await page.getByText('Load Sample').first().click();

  // Wait for editor
  await page.waitForURL(/\/editor/);
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('.passage', { timeout: 10000 });

  // Verify
  await expect(page.locator('.editor')).toBeVisible();
});
```

**After:**
```typescript
test('should load document', async ({ page }) => {
  const welcomePage = new WelcomePage(page);
  await welcomePage.goto();
  await welcomePage.loadSample('yellow-wallpaper');

  await expect(page.locator('.editor')).toBeVisible();
});
```

### Example 2: Annotating Passages

**Before:**
```typescript
test('should annotate passage', async ({ page }) => {
  await page.goto('/editor');
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('.passage');

  const passage = page.locator('.passage').nth(0);
  await passage.click();
  await page.keyboard.press('1');
  await passage.waitForElementState('stable');

  await expect(passage).toContainText('speaker1');
});
```

**After:**
```typescript
test('should annotate passage', async ({ page }) => {
  const editorPage = new EditorPage(page);
  await editorPage.goto();
  await editorPage.annotatePassage(0, 'speaker1');

  const passage = editorPage.getPassage(0);
  await expect(passage).toContainText('speaker1');
});
```

### Example 3: Exporting Documents

**Before:**
```typescript
test('should export document', async ({ page }) => {
  await page.goto('/editor');
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('.passage');

  // Click export button
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /export/i }).click();
  const download = await downloadPromise;

  // Verify
  expect(download.suggestedFilename()).toMatch(/\.tei?xml$/);
  const content = await download.read();
  const xml = content.toString();
  expect(xml).toContain('<?xml');
  expect(xml).toContain('<TEI');
});
```

**After:**
```typescript
test('should export document', async ({ page }) => {
  const editorPage = new EditorPage(page);
  await editorPage.goto();

  await verifyTEIExport(page, ['<?xml', '<TEI']);
});
```

### Example 4: Testing Edge Cases

**Before:**
```typescript
test('should handle malformed XML', async ({ page }) => {
  await page.goto('/');

  const badXML = '<?xml version="1.0"?><TEI><body><p>Unclosed';
  const tempPath = join(process.cwd(), 'temp-test.tei.xml');
  writeFileSync(tempPath, badXML);

  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(tempPath);
  unlinkSync(tempPath);

  // Check for error message
  await expect(page.getByText(/error/i)).toBeVisible();
});
```

**After:**
```typescript
test('should handle malformed XML', async ({ page }) => {
  await page.goto('/');

  const badXML = createMalformedTEI({ error: 'unclosed-tag' });
  await uploadTestDocument(page, {
    name: 'bad-xml.tei.xml',
    content: badXML
  });

  await expect(page.getByText(/error/i)).toBeVisible();
});
```

### Example 5: Mobile Testing

**Before:**
```typescript
test('should work on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/');

  const mobileNav = page.locator('.mobile-navigation');
  await expect(mobileNav).toBeVisible();

  await page.tap('.menu-button');
  await expect(page.locator('.menu')).toBeVisible();
});
```

**After:**
```typescript
test.describe('Mobile', () => {
  test.use({ ...VIEWPORTS.IPHONE_SE, hasTouch: true });

  test('should work on mobile', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('.mobile-navigation')).toBeVisible();

    await page.tap('.menu-button');
    await expect(page.locator('.menu')).toBeVisible();
  });
});
```

## Before and After

### Complete Test Example

**Before (Monolithic):**
```typescript
import { test, expect } from '@playwright/test';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

test('complete workflow', async ({ page }) => {
  // Setup
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Load sample
  await page.getByText('Yellow Wallpaper').click();
  await page.getByText('Load Sample').first().click();
  await page.waitForURL(/\/editor/);
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('.passage');

  // Annotate
  const passage1 = page.locator('.passage').nth(0);
  await passage1.click();
  await page.keyboard.press('1');
  await passage1.waitForElementState('stable');

  const passage2 = page.locator('.passage').nth(1);
  await passage2.click();
  await page.keyboard.press('2');
  await passage2.waitForElementState('stable');

  // Export
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /export/i }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/\.tei?xml$/);
  const content = await download.read();
  const xml = content.toString();

  expect(xml).toContain('<?xml');
  expect(xml).toContain('<TEI');
  expect(xml).toContain('speaker1');
  expect(xml).toContain('speaker2');
});
```

**After (Modular):**
```typescript
import { test, expect } from '@playwright/test';
import { WelcomePage } from './pages/WelcomePage';
import { EditorPage } from './pages/EditorPage';
import { verifyTEIExport } from './fixtures/test-helpers';

test('complete workflow', async ({ page }) => {
  // Load document
  const welcomePage = new WelcomePage(page);
  await welcomePage.goto();
  await welcomePage.loadSample('yellow-wallpaper');

  // Annotate passages
  const editorPage = new EditorPage(page);
  await editorPage.annotatePassage(0, 'speaker1');
  await editorPage.annotatePassage(1, 'speaker2');

  // Verify export
  await verifyTEIExport(page, [
    '<?xml',
    '<TEI',
    'speaker1',
    'speaker2'
  ]);
});
```

### Benefits Summary

**Before:**
- 45 lines of code
- Mixed concerns
- Hard to reuse
- Difficult to maintain
- Duplication likely in other tests

**After:**
- 18 lines of code
- Clear separation of concerns
- Reusable components
- Easy to maintain
- DRY principle applied

## Adding New Tests

When adding new tests, follow this checklist:

1. **Check existing helpers** - Can you reuse existing functions?
2. **Create new helpers** - If code will be used more than once, extract it
3. **Use page objects** - Encapsulate page-specific logic
4. **Use constants** - Avoid magic values
5. **Follow patterns** - Look at similar tests for guidance
6. **Document changes** - Update README.md if adding new helpers
7. **Test independently** - Ensure the test can run alone

### Template for New Tests

```typescript
import { test, expect } from '@playwright/test';
import { EditorPage } from './pages/EditorPage';
import { generateTestDocument, uploadTestDocument } from './fixtures/test-helpers';
import { URLS, TIMEOUTS } from './fixtures/test-constants';

test.describe('My New Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Setup
  });

  test.afterEach(async ({ page }) => {
    // Cleanup
  });

  test('should do something', async ({ page }) => {
    // Arrange
    const editorPage = new EditorPage(page);

    // Act
    await editorPage.goto();
    // Perform actions

    // Assert
    await expect(page.locator('.result')).toBeVisible();
  });
});
```

## Additional Resources

- [Playwright Documentation](https://playwright.dev/)
- [Page Object Pattern](https://playwright.dev/docs/pom)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Test Organization](https://playwright.dev/docs/organizing-tests)
- [README.md](./README.md) - Comprehensive testing documentation

## Summary

The migration to a modular test architecture provides:

- **Better organization** - Clear structure and separation of concerns
- **Improved reusability** - Helpers and page objects can be reused
- **Easier maintenance** - Changes are localized to specific files
- **Enhanced readability** - Tests are shorter and clearer
- **Increased scalability** - Easy to add new tests and features
- **Better collaboration** - Team members can work on different parts independently

When in doubt, refer to the examples in this document or the comprehensive [README.md](./README.md).
