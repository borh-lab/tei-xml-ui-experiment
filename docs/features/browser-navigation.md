# Browser History Navigation

## Overview

The TEI XML editor supports browser history navigation, allowing users to navigate between documents using the back and forward buttons. This feature creates shareable URLs and preserves document state in the browser's history.

## URL Format

The editor uses query parameters to represent document state:

- **Editor View:** `/?doc={document-id}`
- **Corpus View:** `/corpus?doc={document-id}` (optional, preserves context)
- **Gallery:** `/` (no parameters)

## Document IDs

Document IDs follow a specific format based on their source:

### Sample Documents
- **Format:** `sample-{name}`
- **Examples:**
  - `sample-dialogism-1`
  - `sample-wright-glass`
- **Usage:** Pre-loaded TEI samples from the gallery

### Uploaded Files
- **Format:** `uploaded-{hash}`
- **Example:** `uploaded-a1b2c3d4`
- **Note:** Auto-generated hash-based IDs for user uploads

### Corpus Files
- **Format:** `corpus-{path}`
- **Examples:**
  - `corpus-wright/beyond-the-glass`
  - `corpus-novel-dialogism/test-doc`
- **Usage:** Files loaded from TEI corpora

## Usage

### Direct Links

Share direct links to documents. The URL fully encodes the document state:

```
https://your-app.com/?doc=sample-dialogism-1
```

When someone opens this link, the editor will automatically load the specified document.

### Browser Back Button

Navigate back through document history using the browser's back button. Each document load creates a new history entry.

**Example flow:**
1. User opens gallery: `/`
2. Clicks sample 1: `/?doc=sample-dialogism-1`
3. Clicks sample 2: `/?doc=sample-wright-glass`
4. Presses back → returns to sample 1
5. Presses back → returns to gallery

### Forward Button

After navigating back, the forward button works as expected to return to more recently viewed documents.

### Corpus Context

When navigating to the corpus browser, the current document context is preserved:

```
Editor: /?doc=sample-1
→ Click Corpus link
→ Corpus: /corpus?doc=sample-1 (highlights current doc)
→ Select different doc
→ Editor: /?doc=corpus-wright/new-doc
```

## What's NOT in the URL

Some editor state is intentionally kept out of the URL:

- **Passage navigation** (J/K keys, clicking outline)
- **View mode** (split/preview/source)
- **Panel toggles** (outline, entities, stats)
- **Scroll position**
- **Selection state**

These remain as internal application state and reset on page reload.

## Implementation

The browser navigation feature is implemented in:

- **`lib/navigation/URLSyncProvider.tsx`** - Main URL synchronization logic
- **`lib/navigation/urlUtils.ts`** - URL parsing and building utilities
- **`app/providers.tsx`** - Provider wrapper integrating URLSyncProvider

### Key Components

**URLSyncProvider:**
- Reads `?doc=X` parameter on mount
- Triggers document load via existing DocumentProtocol
- Updates URL when document loads successfully
- Handles browser back/forward via `popstate` events

**Design Principles:**
- **Decoupled:** URL state is separate from document loading logic
- **Fail-safe:** Failed loads don't create broken history entries
- **Minimal:** URLs only contain essential state (document ID)

## Error Handling

### Document Not Found

If a URL references a non-existent document:
- URL remains unchanged (user can manually edit)
- Gallery shows error banner: "Document '{doc-id}' not found"
- User can select another sample or upload a file

### Invalid Document

If a document fails validation:
- URL preserved for debugging
- Gallery shows error: "Failed to parse document"
- Validation errors displayed inline

## Testing

The feature includes comprehensive tests:

- **Unit tests:** `tests/unit/url-sync-provider.test.tsx`
- **Integration tests:** `tests/integration/browser-navigation.test.tsx`
- **E2E tests:** `tests/e2e/browser-navigation.spec.ts`

Test coverage includes:
- URL parsing and building
- Document loading from URL
- Browser back/forward navigation
- Error handling for invalid documents
- History entry creation

## Design Documentation

For detailed design and architecture, see:
- **Design:** `docs/plans/2026-02-06-browser-history-navigation-design.md`
- **Implementation:** `docs/plans/2026-02-06-browser-history-navigation-implementation.md`
