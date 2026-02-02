# E2E Test Status - 2025-02-02

## Summary

The E2E test infrastructure has been significantly improved with the following fixes:
- Integrated SampleGallery as welcome screen when no document is loaded
- Added auto-load functionality (gift-of-the-magi loads on first visit)
- Fixed mobile responsiveness issues
- Fixed some strict mode violations

**Current Status: ~225/260 tests passing (86% pass rate)**

## Tests Fixed ✅

1. **Auto-load test** - First visit automatically loads gift-of-the-magi sample
2. **Mobile responsive tests** - All 5 mobile viewport tests pass
3. **Sample gallery visibility** - Tests can now find sample titles on welcome screen

## Remaining Issues

### 1. Strict Mode Violations (Multiple)
**Pattern:** Tests use `page.locator('div.p-3.rounded-lg')` or `page.locator('[id^="passage-"]')` without `.first()` when there are multiple elements

**Affected tests:**
- `tests/e2e/document-upload.spec.ts` - 15+ occurrences
- `tests/e2e/tei-editor-real.spec.ts` - 10+ occurrences
- `tests/e2e/error-scenarios.spec.ts` - 8+ occurrences
- `tests/e2e/export-validation.spec.ts` - 5+ occurrences

**Fix:** Add `.first()` to locator or use `.nth(index)`:
```typescript
// Before
await expect(page.locator('div.p-3.rounded-lg')).toBeVisible();

// After
await expect(page.locator('div.p-3.rounded-lg').first()).toBeVisible();
```

### 2. Missing "Upload File" Button on Welcome Screen
**Issue:** Tests expect "Upload File" button to be visible on welcome screen, but it's only shown in editor

**Affected tests:**
- `tests/e2e/error-scenarios.spec.ts` - Lines 123, 139, 155, 208
- `tests/e2e/entity-modeling.spec.ts` - Line 10

**Fix:** Either:
1. Remove expectation of "Upload File" button on welcome screen
2. Update tests to load a document first before checking for upload button
3. Add "Upload File" button to welcome screen (if desired)

### 3. "Load Sample" Button Not Found
**Issue:** Tests try to click "Load Sample" button, but the new UI has individual cards with their own buttons

**Affected tests:**
- `tests/e2e/tei-dialogue-editor.spec.ts` - Lines 70, 139, 172, 236, 262, 299, 327, 358, 414
- `tests/e2e/export-validation.spec.ts` - Multiple locations via WelcomePage
- `tests/e2e/mobile-responsive.spec.ts` - Lines 55-56

**Fix:** Update test helpers to work with new card-based UI:
```typescript
// New approach - click on sample card title, then card's "Load Sample" button
await page.getByText(/yellow-wallpaper/i).click();
// Or find the card and click its specific button
await page.locator('button', { hasText: 'Load Sample' }).first().click();
```

### 4. Route Navigation Issues
**Issue:** Tests try to navigate to `/editor` route, but app is now single-page

**Affected tests:**
- `tests/e2e/export-validation.spec.ts` - WelcomePage expects URL change
- `tests/e2e/file-upload-from-welcome.spec.ts` - Lines 37, 53, 68

**Fix:** Remove URL navigation expectations, update to work with single-page app model

### 5. Missing "Back to Gallery" Button
**Issue:** Tests expect "← Back to Gallery" button that doesn't exist

**Affected tests:**
- `tests/e2e/tei-editor-real.spec.ts` - Line 80

**Fix:** Either add the button or remove/update the test

## Files Changed

1. `app/page.tsx` - Added SampleGallery as welcome screen
2. `lib/context/DocumentContext.tsx` - Added auto-load on first visit
3. `components/samples/SampleGallery.tsx` - Fixed mobile responsiveness
4. `tests/e2e/tei-dialogue-editor.spec.ts` - Fixed strict mode violations (partial)

## Next Steps

To complete the E2E test fixes:

1. **Fix strict mode violations** - Add `.first()` to all locators that may return multiple elements
2. **Update test helpers** - Modify `test-helpers.ts` `loadSample()` to work with new UI
3. **Fix upload button tests** - Remove or update tests expecting "Upload File" on welcome screen
4. **Fix Load Sample button tests** - Update to work with card-based UI
5. **Remove route navigation** - Update tests for single-page app model
6. **Add missing UI elements** - Either add "Back to Gallery" button or remove those tests

## Testing Commands

```bash
# Run specific test file
npm run test:e2e -- tests/e2e/mobile-responsive.spec.ts

# Run specific test
npm run test:e2e -- tests/e2e/tei-dialogue-editor.spec.ts:25

# Run all tests
npm run test:e2e
```
