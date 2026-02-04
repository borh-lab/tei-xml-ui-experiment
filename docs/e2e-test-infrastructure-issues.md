# E2E Test Infrastructure Issues

**Status:** Blocker identified, fix in progress
**Date:** 2026-02-04
**Related:** Schema integration feature (complete, waiting for push)

## Problem

E2E tests are failing due to test infrastructure issues in `tests/e2e/fixtures/test-helpers.ts`.

### Root Causes

1. **Sample Gallery Loading** (test-helpers.ts:19)
   - Looking for "The Gift of the Magi" text that doesn't exist or isn't clickable
   - SampleGallery component may have different structure than expected
   - Tests can't load sample documents to get into editor mode

2. **Document Upload** (test-helpers.ts:8-36)
   - `uploadTestDocument()` tries to detect if FileUpload button exists
   - Falls back to loading sample if not found
   - Sample loading fails, blocking test execution

3. **Editor Ready Detection** (pages/EditorPage.ts:21)
   - Expects "Sample Gallery" text to verify welcome screen
   - Text doesn't exist or isn't loaded when expected
   - Causes timeout on `editorPage.goto()`

### Test Failure Pattern

```
Error: locator.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for getByText('The Gift of the Magi')
    at fixtures/test-helpers.ts:19
```

## Current App Flow

From `app/page.tsx`:

```typescript
if (!document) {
  return <SampleGallery onLoadSample={loadSample} onSelect={() => {}} />;
}
return (
  <>
    <FileUpload />
    <EditorLayout />
  </>
);
```

- **No document loaded**: Shows `SampleGallery`
- **Document loaded**: Shows `FileUpload` + `EditorLayout`

## Fix Approach

### Phase 1: Document Actual UI

1. Inspect SampleGallery component structure
2. Document actual selector for sample cards
3. Document actual file upload flow
4. Document timing/latency patterns

### Phase 2: Rewrite test-helpers.ts

1. **Simplify uploadTestDocument()**
   - Use direct file input bypassing UI
   - Or fix sample loading to use actual selectors

2. **Fix EditorPage.goto()**
   - Don't require Sample Gallery text
   - Use more robust document detection
   - Handle both welcome and editor states

3. **Add debugging hooks**
   - Screenshots on failure
   - Better error messages
   - State inspection helpers

### Phase 3: Update Tests

1. Fix schema-validation-integration.spec.ts initialization
2. Add retry logic for flaky selectors
3. Use Playwright's test.step() for better debugging

## Temporary Workaround

Until E2E infrastructure is fixed, schema validation is verified by:

- ✅ 722/722 unit tests passing
- ✅ Integration tests (API level)
- ✅ Manual testing in browser

## Related Files

- `tests/e2e/fixtures/test-helpers.ts` - Primary issue
- `tests/e2e/pages/EditorPage.ts` - Editor initialization
- `tests/e2e/schema-validation-integration.spec.ts` - Tests (well-written, blocked by helpers)
- `app/page.tsx` - App flow reference
- `components/samples/SampleGallery.tsx` - Sample UI (needs inspection)
- `components/editor/FileUpload.tsx` - Upload UI (needs inspection)
