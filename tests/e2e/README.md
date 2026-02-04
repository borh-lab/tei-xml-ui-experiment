# Playwright E2E Tests

End-to-end tests for the TEI Dialogue Editor using Playwright.

## Table of Contents

- [Quick Start](#quick-start)
- [Running Tests](#running-tests)
- [Test Organization](#test-organization)
- [Helper Utilities](#helper-utilities)
- [Page Object Pattern](#page-object-pattern)
- [Writing New Tests](#writing-new-tests)
- [Mobile Testing](#mobile-testing)
- [Debugging](#debugging)
- [Test Suites](#test-suites)
- [Documentation Screenshots](#documentation-screenshots)
- [Best Practices](#best-practices)

## Quick Start

### Prerequisites

1. **Using Nix (recommended):**

   ```bash
   nix flake update
   nix develop
   npm install
   npx playwright install
   ```

2. **Without Nix:**
   ```bash
   npm install
   npx playwright install
   ```

### Run All Tests

```bash
npm run test:e2e
```

## Running Tests

### Basic Test Commands

- **Run all tests:** `npm run test:e2e`
- **Run tests in UI mode:** `npm run test:e2e:ui`
- **Debug tests:** `npm run test:e2e:debug`
- **View test report:** `npm run test:e2e:report`
- **Run tests in headed mode:** `npm run test:e2e:headed`

### Browser-Specific Tests

- **Chromium only:** `npm run test:e2e:chromium`
- **Firefox only:** `npm run test:e2e:firefox`
- **WebKit only:** `npm run test:e2e:webkit`

### Running Specific Test Files

Run a specific test file:

```bash
npx playwright test tei-dialogue-editor.spec.ts
```

Run tests matching a pattern:

```bash
npx playwright test --grep "welcome screen"
```

Run specific test by title:

```bash
npx playwright test --grep "should load sample document"
```

### Running Tests by Project

Run tests on specific browser project:

```bash
# Run on Chromium
npx playwright test --project=chromium

# Run on Firefox
npx playwright test --project=firefox

# Run on WebKit
npx playwright test --project=webkit
```

## Test Organization

### Directory Structure

```
tests/e2e/
├── fixtures/
│   ├── test-helpers.ts       # Reusable helper functions
│   └── test-constants.ts     # Test constants and configurations
├── pages/
│   ├── EditorPage.ts         # Editor page object
│   ├── WelcomePage.ts        # Welcome page object
│   └── VisualizationPage.ts  # Visualization page object
├── tei-dialogue-editor.spec.ts  # Main test suite
└── README.md                 # This file
```

### Test File Organization

The test suite is organized into logical groups:

- **Welcome Screen** - Landing page and sample gallery
- **Document Loading** - File upload, sample loading
- **Manual Annotation** - Tagging speakers, editing
- **AI-Assisted Features** - Suggestions, mode switching
- **Keyboard Shortcuts** - Command palette, hotkeys
- **Bulk Operations** - Tagging, validation, export
- **Quick Search** - Find and navigation
- **Character Network** - Visualization graph
- **Pattern Learning** - Learning from corrections
- **Error Handling** - Graceful degradation
- **Documentation Screenshots** - Captures for docs
- **Accessibility** - ARIA labels, keyboard nav
- **Performance** - Load times, large documents
- **Data Persistence** - Recent documents, preferences
- **Responsive Design** - Different viewports

## Helper Utilities

### Test Helpers (`fixtures/test-helpers.ts`)

#### Document Operations

**`uploadTestDocument(page, doc)`**
Uploads a test document to the editor.

```typescript
await uploadTestDocument(page, {
  name: 'test-document.tei.xml',
  content: '<?xml version="1.0"?><TEI>...</TEI>',
});
```

**`loadSample(page, sampleName)`**
Loads a sample document from the gallery.

```typescript
await loadSample(page, 'yellow-wallpaper');
```

**`generateTestDocument(options)`**
Generates a test TEI document with specified parameters.

```typescript
const xml = generateTestDocument({
  speakers: ['narrator', 'della', 'jim'],
  passages: 10,
  namespaces: true,
  declarations: true,
});
```

**`createMinimalTEI(options)`**
Creates a minimal TEI document for edge case testing.

```typescript
const xml = createMinimalTEI({
  passages: [1, 2, 3],
});
```

**`createMalformedTEI(options)`**
Creates malformed TEI for error testing.

```typescript
const badXML = createMalformedTEI({
  error: 'unclosed-tag', // or 'invalid-xml' or 'missing-root'
});
```

#### Editor Operations

**`waitForEditorReady(page)`**
Waits for the editor to be ready.

```typescript
await waitForEditorReady(page);
```

**`annotatePassage(page, index, speaker)`**
Annotates a passage with a speaker.

```typescript
await annotatePassage(page, 0, 'narrator');
```

**`exportDocument(page)`**
Triggers export and returns download promise.

```typescript
const download = await exportDocument(page);
```

**`verifyTEIExport(page, expectedContent)`**
Downloads and verifies TEI export.

```typescript
await verifyTEIExport(page, ['<TEI', '<castList', 'narrator']);
```

#### Utilities

**`mockConsoleErrors(page)`**
Captures console errors for testing.

```typescript
const errors = await mockConsoleErrors(page);
// Run test actions
// Check errors array
```

### Test Constants (`fixtures/test-constants.ts`)

#### URLs

```typescript
URLS.HOME; // '/'
URLS.EDITOR; // '/editor'
URLS.SAMPLES; // '/samples'
```

#### Selectors

```typescript
SELECTORS.PASSAGE; // '.passage'
SELECTORS.SAMPLE_GALLERY; // '[data-testid="sample-gallery"]'
SELECTORS.COMMAND_PALETTE; // '[data-testid="command-palette"]'
SELECTORS.BULK_PANEL; // '[data-testid="bulk-operations"]'
SELECTORS.VIZ_PANEL; // '[data-testid="visualizations"]'
```

#### Timeouts (milliseconds)

```typescript
TIMEOUTS.PAGE_LOAD; // 30000
TIMEOUTS.NETWORK_IDLE; // 10000
TIMEOUTS.ELEMENT_VISIBLE; // 5000
TIMEOUTS.AI_SUGGESTION; // 10000
```

#### Viewport Presets

```typescript
VIEWPORTS.IPHONE_SE; // { width: 375, height: 667 }
VIEWPORTS.IPHONE_12; // { width: 390, height: 844 }
VIEWPORTS.ANDROID; // { width: 360, height: 640 }
VIEWPORTS.IPAD; // { width: 768, height: 1024 }
VIEWPORTS.IPAD_PRO; // { width: 1024, height: 1366 }
VIEWPORTS.DESKTOP; // { width: 1280, height: 720 }
```

#### Sample Documents

```typescript
SAMPLES.YELLOW_WALLPAPER; // 'yellow-wallpaper'
SAMPLES.GIFT_OF_THE_MAGI; // 'gift-of-magi'
SAMPLES.PRIDE_AND_PREJUDICE; // 'pride-and-prejudice'
```

#### Speaker Names

```typescript
SPEAKERS.NARRATOR; // 'narrator'
SPEAKERS.DELLA; // 'della'
SPEAKERS.JIM; // 'jim'
SPEAKERS.PROTAGONIST; // 'protagonist'
```

## Page Object Pattern

Page objects encapsulate page-specific logic and provide a clean API for tests.

### EditorPage (`pages/EditorPage.ts`)

```typescript
import { EditorPage } from './pages/EditorPage';

const editorPage = new EditorPage(page);

// Navigate to editor
await editorPage.goto();

// Annotate passages
await editorPage.annotatePassage(0, 'narrator');

// Open command palette
await editorPage.openCommandPalette();

// Open bulk operations
await editorPage.openBulkOperations();

// Open visualizations
await editorPage.openVisualizations();

// Get passage elements
const passage = editorPage.getPassage(0);
const allPassages = editorPage.getPassages();

// Export TEI
const download = await editorPage.exportTEI();
```

### WelcomePage (`pages/WelcomePage.ts`)

```typescript
import { WelcomePage } from './pages/WelcomePage';

const welcomePage = new WelcomePage(page);

// Navigate to home
await welcomePage.goto();

// Load sample
await welcomePage.loadSample('yellow-wallpaper');

// Get elements
const gallery = welcomePage.getSampleGallery();
const buttons = welcomePage.getLoadSampleButtons();
```

### Creating New Page Objects

```typescript
import { Page, expect } from '@playwright/test';

export class MyPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/my-page');
    await this.page.waitForLoadState('networkidle');
  }

  async performAction() {
    await this.page.click('.button');
    await expect(this.page.locator('.result')).toBeVisible();
  }

  getData() {
    return this.page.locator('.data');
  }
}
```

## Writing New Tests

### Test Template

```typescript
import { test, expect } from '@playwright/test';
import { EditorPage } from './pages/EditorPage';
import { WelcomePage } from './pages/WelcomePage';
import { uploadTestDocument, waitForEditorReady, annotatePassage } from './fixtures/test-helpers';
import { URLS, TIMEOUTS } from './fixtures/test-constants';

test.describe('My Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Setup before each test
    await page.goto(URLS.HOME);
  });

  test('should do something', async ({ page }) => {
    // Arrange
    const welcomePage = new WelcomePage(page);

    // Act
    await welcomePage.loadSample('yellow-wallpaper');

    // Assert
    await expect(page.locator('.editor')).toBeVisible();
  });

  test('should handle edge case', async ({ page }) => {
    // Test edge case
  });
});
```

### Best Practices for Writing Tests

1. **Use page objects** - Encapsulate page logic
2. **Use helpers** - Reuse common operations
3. **Use constants** - Avoid magic values
4. **Follow AAA pattern** - Arrange, Act, Assert
5. **Use descriptive names** - Test names should describe what they test
6. **Test one thing** - Each test should verify one behavior
7. **Use waits properly** - Use `waitForEditorReady` instead of arbitrary delays
8. **Check for errors** - Use `mockConsoleErrors` to catch issues

### Example: Testing a Feature

```typescript
test('should annotate multiple passages', async ({ page }) => {
  // Arrange
  const editorPage = new EditorPage(page);
  await editorPage.goto();

  // Act
  await editorPage.annotatePassage(0, 'narrator');
  await editorPage.annotatePassage(1, 'della');
  await editorPage.annotatePassage(2, 'jim');

  // Assert
  const passages = editorPage.getPassages();
  await expect(passages).toHaveCount(3);

  // Verify annotations
  await expect(passages.nth(0)).toContainText('narrator');
  await expect(passages.nth(1)).toContainText('della');
  await expect(passages.nth(2)).toContainText('jim');
});
```

## Mobile Testing

### Testing Different Viewports

```typescript
import { test, devices } from '@playwright/test';
import { VIEWPORTS } from './fixtures/test-constants';

test.describe('Mobile', () => {
  test.use({ ...VIEWPORTS.IPHONE_SE });

  test('should work on mobile', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.mobile-nav')).toBeVisible();
  });
});
```

### Testing Multiple Devices

```typescript
const devices = [VIEWPORTS.IPHONE_SE, VIEWPORTS.IPHONE_12, VIEWPORTS.ANDROID, VIEWPORTS.IPAD];

for (const device of devices) {
  test(`should work on ${device.name}`, async ({ page }) => {
    await page.setViewportSize(device);
    await page.goto('/');
    // Test behavior
  });
}
```

### Mobile-Specific Tests

```typescript
test.describe('Mobile Touch', () => {
  test.use({ ...VIEWPORTS.IPHONE_12, hasTouch: true });

  test('should handle tap gestures', async ({ page }) => {
    await page.goto('/');
    await page.tap('.button');
    await expect(page.locator('.result')).toBeVisible();
  });

  test('should handle swipe gestures', async ({ page }) => {
    await page.goto('/');
    await page.touchscreen.swipe(0, 100, 0, -100);
    // Verify swipe action
  });
});
```

## Debugging

### Using Debug Mode

Run tests in debug mode with step-by-step execution:

```bash
npm run test:e2e:debug
```

### Using UI Mode

Run tests with interactive UI:

```bash
npm run test:e2e:ui
```

### Using Headed Mode

Run tests in visible browser:

```bash
npm run test:e2e:headed
```

### Debugging Specific Tests

```bash
# Debug specific file
npx playwright test tei-dialogue-editor.spec.ts --debug

# Debug specific test
npx playwright test --debug -g "should load sample"
```

### Inspecting Selectors

Use Playwright Inspector to find selectors:

```bash
npx playwright codegen http://localhost:3000
```

### Viewing Traces

When a test fails, Playwright captures a trace:

```bash
npx playwright show-trace trace.zip
```

### Timeouts

Adjust timeouts for specific tests:

```typescript
test('slow test', async ({ page }) => {
  test.setTimeout(60000); // 60 seconds
  // Test code
});
```

## Test Suites

The test suite (`tei-dialogue-editor.spec.ts`) includes:

1. **Welcome Screen** - Landing page, sample gallery, navigation
2. **Document Loading** - File upload, sample loading, error handling
3. **Manual Annotation** - Tagging speakers, editing, validation
4. **AI-Assisted Features** - Suggestions, mode switching, learning
5. **Keyboard Shortcuts** - Command palette, hotkeys, help dialog
6. **Bulk Operations** - Tagging, validation, export
7. **Quick Search** - Find, navigation, highlighting
8. **Character Network** - Visualization, interactions
9. **Pattern Learning** - Learning from corrections
10. **Error Handling** - Invalid XML, missing files, edge cases
11. **Documentation Screenshots** - Captures for documentation
12. **Accessibility** - ARIA labels, keyboard navigation
13. **Performance** - Load times, large documents
14. **Data Persistence** - Recent documents, preferences
15. **Responsive Design** - Mobile, tablet, desktop

## Documentation Screenshots

Tests automatically capture screenshots in `docs/screenshots/`:

- `welcome-screen.png` - Welcome page
- `sample-gallery.png` - Sample document gallery
- `editor-annotated.png` - Editor with annotations
- `ai-suggestions.png` - AI suggestions panel
- `character-network.png` - Character network visualization
- `command-palette.png` - Command palette
- `bulk-operations.png` - Bulk operations panel
- `keyboard-shortcuts.png` - Keyboard shortcuts dialog

### Capturing Screenshots

```typescript
test('should capture screenshot', async ({ page }) => {
  await page.goto('/');
  await page.screenshot({
    path: 'docs/screenshots/my-feature.png',
    fullPage: true,
  });
});
```

## Viewing Results

### HTML Report

```bash
npm run test:e2e:report
```

This opens an HTML report with:

- Test results and status
- Screenshots (on failure)
- Traces (on retry)
- Timing information
- Error messages

### JUnit Report

Generated at `test-results/junit.xml` for CI integration.

### JSON Report

Generated at `test-results/results.json` for programmatic access.

## Best Practices

### 1. Test Independence

Each test should be independent and able to run alone:

```typescript
test('should work independently', async ({ page }) => {
  // Don't depend on state from previous tests
  await page.goto('/');
  // Test logic
});
```

### 2. Proper Cleanup

Clean up after tests:

```typescript
test.afterEach(async ({ page }) => {
  // Clean up temp files, reset state, etc.
});
```

### 3. Use Data Attributes

Use `data-testid` attributes for selectors:

```typescript
// Good
page.locator('[data-testid="submit-button"]');

// Avoid if possible
page.locator('.btn-primary'); // Can break with CSS changes
```

### 4. Avoid Arbitrary Waits

Use proper waits instead of fixed delays:

```typescript
// Good
await page.waitForSelector('.result');

// Avoid
await page.waitForTimeout(1000);
```

### 5. Test User Behavior

Test what users see and do:

```typescript
// Good
await page.click('button');
await expect(page.locator('.message')).toBeVisible();

// Avoid
expect(await page.evaluate(() => getState())).toBe('ready');
```

### 6. Handle Flakiness

Use retries for flaky tests (configured in `playwright.config.ts`):

```typescript
retries: process.env.CI ? 2 : 0;
```

### 7. Use Descriptive Names

```typescript
// Good
test('should display error message when file upload fails');

// Avoid
test('test upload');
```

### 8. Group Related Tests

```typescript
test.describe('Document Export', () => {
  test('should export as TEI XML');
  test('should include all annotations');
  test('should validate XML structure');
});
```

### 9. Use Page Objects

```typescript
// Good
const editorPage = new EditorPage(page);
await editorPage.annotatePassage(0, 'narrator');

// Avoid
await page.click('.passage:nth-child(1)');
await page.keyboard.press('1');
```

### 10. Test Edge Cases

```typescript
test.describe('Edge Cases', () => {
  test('should handle empty document');
  test('should handle very large document');
  test('should handle special characters');
  test('should handle invalid XML');
});
```
