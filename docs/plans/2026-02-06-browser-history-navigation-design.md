# Browser History Navigation Design

**Date:** 2026-02-06
**Status:** Design Approved

## Overview

Add browser history navigation to the TEI XML editor, enabling the back/forward buttons to work for document-level navigation. The design keeps URLs minimal and decouples routing from document loading logic.

## Requirements

- Browser back button returns to previous document
- Forward button works after navigating back
- URLs are shareable and represent current document state
- Failed loads don't create broken history entries
- Passage navigation (J/K keys) and view modes remain internal state

## URL Structure

### Format

- **Editor:** `/?doc={document-id}`
- **Corpus:** `/corpus?doc={document-id}` (optional, preserves context)
- **Gallery:** `/` (no params)

### Document ID Sources

- Sample documents: `sample-{name}` (e.g., `sample-dialogism-1`)
- Uploaded files: `uploaded-{hash}` (hash-based ID)
- Corpus files: `corpus-{path}` (e.g., `corpus-wright/beyond-the-glass`)

### History Behavior

- Each successful document load creates one history entry
- Back button returns to previous document or gallery
- Failed loads don't modify URL or history
- Passage navigation, view modes, panel toggles → no URL change

## Architecture

### New Component: URLSyncProvider

A thin provider that wraps the app and handles URL ↔ document synchronization.

```typescript
// app/providers.tsx (new file)
<URLSyncProvider>
  <DocumentProvider>
    <App />
  </DocumentProvider>
</URLSyncProvider>
```

### Responsibilities

1. **Read URL on mount** → Parse `?doc=X`, trigger load if present
2. **Listen to document changes** → On successful load, `router.push(?doc=X)`
3. **Handle navigation events** → Listen for `popstate`, reload doc from URL

### Key Design Principle

The provider is a **side-effect** - it watches document state and updates URL, but never drives document loading itself except on initial mount. All loading flows through the existing DocumentProtocol.

### Integration Points

- **useDocumentV2:** Already has `loadDocument()` and `loadSample()` - no changes needed
- **DocumentContext:** Add `currentDocId` readonly property for URL sync to read
- **Editor pages:** Wrap existing content, zero changes to editor logic

## Data Flow

### Initial Load (Direct URL)

```
1. URLSyncProvider mounts
2. Reads searchParams: { doc: 'sample-dialogism-1' }
3. Calls documentService.loadSample('dialogism-1')
4. Document loads successfully → Editor renders
5. URL already correct, no push needed
```

### Document Load via Gallery

```
1. User clicks sample in gallery
2. documentService.loadSample('dialogism-1')
3. Document loads successfully
4. URLSyncProvider detects document.id === 'sample-dialogism-1'
5. router.push(`/?doc=sample-dialogism-1`)
```

### Back Button Navigation

```
1. User clicks browser back
2. URL changes: /?doc=sample-dialogism-1 → /?
3. URLSyncProvider receives popstate event
4. Reads new searchParams: {}
5. No doc param → clear current document (back to gallery)
```

### Failed Load

```
1. URL has ?doc=nonexistent
2. loadSample('nonexistent') throws
3. URLSyncProvider catches error
4. Shows error in gallery UI
5. URL stays at ?doc=nonexistent (user can manually edit)
```

### Corpus Navigation

```
Editor: /?doc=sample-1
→ User clicks Corpus link
→ router.push('/corpus?doc=sample-1')
→ CorpusBrowser reads doc param, highlights that doc
→ User selects different doc
→ router.push('/?doc=corpus-wright/glass')
```

## Error Handling

### Error States

1. **Document Not Found:**
   - URL: `/?doc=nonexistent`
   - UI: Gallery with error banner "Document 'nonexistent' not found"
   - Action: User selects another sample or uploads file
   - URL: Keeps the bad ID (user can edit manually)

2. **Invalid Document:**
   - URL: `/?doc=sample-broken`
   - UI: Gallery with error "Failed to parse document"
   - Details: Show validation error summary
   - URL: Preserved for debugging

3. **Network Error (corpus files):**
   - URL: `/?doc=corpus-external/unreachable`
   - UI: Gallery with error "Could not load document"
   - Action: Retry button, back to gallery
   - URL: Preserved

### Error Display

New component `DocumentLoadError` renders in gallery view when `loadError` state is set:

```typescript
// In URLSyncProvider
const [loadError, setLoadError] = useState<Error | null>(null)

// Gallery checks for error
{loadError && <DocumentLoadError error={loadError} />}
{!document && !loadError && <SampleGallery ... />}
```

**No Alerts:** All errors are inline UI, never `alert()` or `window.confirm()`.

## Testing

### Unit Tests

**URLSyncProvider Logic:**
- Parse doc ID from URL on mount
- Trigger load for valid doc ID
- Don't trigger load for missing/empty doc param
- Update URL after successful document load
- Handle popstate events
- Don't create history entry for failed loads

**URL Parsing:**
- Extract `doc` from search params
- Handle URL-encoded values
- Return null for missing/invalid params

### Integration Tests

**Full Navigation Flow:**
- Load document → URL updated
- Back button → previous document restored
- Forward button → forward document restored
- Failed load → URL unchanged

**Corpus Integration:**
- Corpus page preserves doc param
- Navigate corpus ↔ editor with doc context

### E2E Tests

**Browser Navigation:**
```typescript
test('back button navigates to previous document', async () => {
  await loadDocument('sample-1')
  expect(page.url()).toContain('doc=sample-1')
  await loadDocument('sample-2')
  expect(page.url()).toContain('doc=sample-2')
  await page.goBack()
  expect(page.url()).toContain('doc=sample-1')
})
```

**Direct URL Access:**
```typescript
test('opening URL with doc param loads that document', async () => {
  await page.goto('/?doc=dialogism-1')
  await expect(page.locator('[data-testid="editor"]')).toBeVisible()
})
```

**Error Handling:**
- Bad doc ID shows error in gallery
- URL preserves bad ID for manual correction

## Implementation

### New Files

1. **`app/providers.tsx`** - Provider wrapper with URLSyncProvider
2. **`lib/navigation/URLSyncProvider.tsx`** - Main URL sync logic
3. **`lib/navigation/urlUtils.ts`** - URL parsing/helpers
4. **`components/navigation/DocumentLoadError.tsx`** - Error display component

### Modified Files

1. **`app/layout.tsx`** - Wrap children in providers
2. **`app/page.tsx`** - Render error if present, otherwise existing logic
3. **`lib/context/DocumentContext.tsx`** - Add `currentDocId: string | null` readonly
4. **`app/corpus/page.tsx`** - Read `doc` param to highlight selected doc

### No Changes Needed

- `useDocumentV2.ts` - already has load methods
- `DocumentProtocol` - business logic unchanged
- Editor components - routing is external concern

### Dependencies

- `next/navigation` (already available)
- No new packages needed

### Implementation Order

1. URL utils (parsing logic)
2. URLSyncProvider (core sync logic)
3. DocumentLoadError component
4. Integrate into app layout
5. Add doc param to corpus page
6. Tests

## Design Principles

### Decomplected

- URL = minimal state (document ID only)
- App state = everything else (passage, view mode, panels)
- Router is dumb adapter: URL changes → trigger load
- No coupling between routing and document loading logic

### Fail-Safe

- Failed loads never pollute browser history
- URLs always represent valid state or show clear error
- Back button never gets user stuck

### Extensible

- Easy to add `&passage=n` later if needed
- Additional params (view mode, panel state) won't break structure
- Query params accommodate future features without route changes
