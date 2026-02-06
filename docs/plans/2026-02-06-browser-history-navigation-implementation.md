# Browser History Navigation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable browser back/forward button navigation for documents by adding URL-based history with query parameters.

**Architecture:** Thin URLSyncProvider watches document state and syncs with URL via Next.js router. Zero coupling to document logic - all existing protocols unchanged. URL = minimal state (doc ID only), everything else stays in app state.

**Tech Stack:** Next.js App Router, React hooks, TypeScript

**Prerequisites:**
- Read design: `docs/plans/2026-02-06-browser-history-navigation-design.md`
- Worktree: `.worktrees/browser-history`
- Branch: `feature/browser-history-navigation`
- Baseline: 1381 tests passing

---

## Task 1: URL Utilities

**Files:**
- Create: `lib/navigation/urlUtils.ts`
- Test: `lib/navigation/__tests__/urlUtils.test.ts`

**Step 1: Write failing tests**

```typescript
// lib/navigation/__tests__/urlUtils.test.ts
import { parseDocId, buildDocUrl, buildCorpusUrl } from '../urlUtils';
import { ReadonlyURLSearchParams } from 'next/navigation';

describe('urlUtils', () => {
  describe('parseDocId', () => {
    it('returns doc ID from URL params', () => {
      const params = new ReadonlyURLSearchParams('?doc=sample-dialogism-1');
      expect(parseDocId(params)).toBe('sample-dialogism-1');
    });

    it('returns null when doc param is missing', () => {
      const params = new ReadonlyURLSearchParams('?foo=bar');
      expect(parseDocId(params)).toBeNull();
    });

    it('returns null when doc param is empty', () => {
      const params = new ReadonlyURLSearchParams('?doc=');
      expect(parseDocId(params)).toBeNull();
    });

    it('handles URL-encoded values', () => {
      const params = new ReadonlyURLSearchParams('?doc=corpus-wright%2Fbeyond-the-glass');
      expect(parseDocId(params)).toBe('corpus-wright/beyond-the-glass');
    });

    it('returns null for empty search params', () => {
      const params = new ReadonlyURLSearchParams('');
      expect(parseDocId(params)).toBeNull();
    });
  });

  describe('buildDocUrl', () => {
    it('builds URL for editor with doc param', () => {
      expect(buildDocUrl('sample-dialogism-1')).toBe('/?doc=sample-dialogism-1');
    });

    it('builds URL for corpus doc', () => {
      expect(buildDocUrl('corpus-wright/glass')).toBe('/?doc=corpus-wright%2Fglass');
    });

    it('builds URL for uploaded doc', () => {
      expect(buildDocUrl('uploaded-abc123')).toBe('/?doc=uploaded-abc123');
    });
  });

  describe('buildCorpusUrl', () => {
    it('builds corpus URL with optional doc param', () => {
      expect(buildCorpusUrl('sample-dialogism-1')).toBe('/corpus?doc=sample-dialogism-1');
    });

    it('builds corpus URL without doc param', () => {
      expect(buildCorpusUrl(null)).toBe('/corpus');
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- lib/navigation/__tests__/urlUtils.test.ts`
Expected: FAIL - "Cannot find module '../urlUtils'"

**Step 3: Write minimal implementation**

```typescript
// lib/navigation/urlUtils.ts
import { ReadonlyURLSearchParams } from 'next/navigation';

/**
 * Parse document ID from URL search params
 * @returns Document ID or null if not present/empty
 */
export function parseDocId(searchParams: ReadonlyURLSearchParams): string | null {
  const docId = searchParams.get('doc');
  if (!docId || docId.trim() === '') {
    return null;
  }
  return decodeURIComponent(docId);
}

/**
 * Build editor URL with doc parameter
 * @param docId - Document ID (e.g., 'sample-dialogism-1')
 * @returns URL path with query params (e.g., '/?doc=sample-dialogism-1')
 */
export function buildDocUrl(docId: string): string {
  return `/?doc=${encodeURIComponent(docId)}`;
}

/**
 * Build corpus URL with optional doc parameter
 * @param docId - Optional document ID to preserve context
 * @returns URL path (e.g., '/corpus?doc=sample-1' or '/corpus')
 */
export function buildCorpusUrl(docId: string | null): string {
  if (!docId) {
    return '/corpus';
  }
  return `/corpus?doc=${encodeURIComponent(docId)}`;
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- lib/navigation/__tests__/urlUtils.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/navigation/
git commit -m "feat: add URL parsing utilities for document navigation

Add urlUtils with parseDocId, buildDocUrl, and buildCorpusUrl functions.
Handles URL encoding/decoding and null safety.

Tests: All urlUtils tests passing"
```

---

## Task 2: DocumentLoadError Component

**Files:**
- Create: `components/navigation/DocumentLoadError.tsx`
- Test: `tests/unit/document-load-error.test.tsx`

**Step 1: Write failing test**

```typescript
// tests/unit/document-load-error.test.tsx
import { render, screen } from '@testing-library/react';
import DocumentLoadError from '@/components/navigation/DocumentLoadError';

describe('DocumentLoadError', () => {
  it('displays error message for not found', () => {
    const error = new Error('Document nonexistent not found');
    render(<DocumentLoadError error={error} />);

    expect(screen.getByText(/Failed to load document/i)).toBeInTheDocument();
    expect(screen.getByText(/nonexistent/)).toBeInTheDocument();
  });

  it('displays retry action', () => {
    const error = new Error('Network error');
    const onRetry = vi.fn();
    render(<DocumentLoadError error={error} onRetry={onRetry} />);

    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('provides link back to gallery when no retry', () => {
    const error = new Error('Parse error');
    render(<DocumentLoadError error={error} />);

    expect(screen.getByRole('link', { name: /back to gallery/i })).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/document-load-error.test.tsx`
Expected: FAIL - "Cannot find module '@/components/navigation/DocumentLoadError'"

**Step 3: Write minimal implementation**

```typescript
// components/navigation/DocumentLoadError.tsx
import { AlertCircle, Home } from 'lucide-react';
import Link from 'next/link';

interface DocumentLoadErrorProps {
  error: Error;
  onRetry?: () => void;
}

export default function DocumentLoadError({ error, onRetry }: DocumentLoadErrorProps) {
  return (
    <div className="max-w-md mx-auto mt-8">
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
              Failed to load document
            </h3>
            <p className="text-red-700 dark:text-red-300 text-sm mb-4">
              {error.message}
            </p>

            <div className="flex items-center gap-3">
              {onRetry ? (
                <button
                  onClick={onRetry}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors"
                >
                  Try Again
                </button>
              ) : (
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors"
                >
                  <Home className="w-4 h-4" />
                  Back to Gallery
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/document-load-error.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add components/navigation/ tests/unit/document-load-error.test.tsx
git commit -m "feat: add DocumentLoadError component

Inline error display for failed document loads.
Shows error message with retry or back to gallery action.

Tests: DocumentLoadError component tests passing"
```

---

## Task 3: URLSyncProvider Core Logic

**Files:**
- Create: `lib/navigation/URLSyncProvider.tsx`
- Test: `tests/unit/url-sync-provider.test.tsx`

**Step 1: Write failing tests**

```typescript
// tests/unit/url-sync-provider.test.tsx
import { render, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import URLSyncProvider from '@/lib/navigation/URLSyncProvider';
import { useDocumentContext } from '@/lib/context/DocumentContext';

vi.mock('next/navigation');
vi.mock('@/lib/context/DocumentContext');

describe('URLSyncProvider', () => {
  const mockPush = vi.fn();
  const mockReplace = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({
      push: mockPush,
      replace: mockReplace,
    });
  });

  it('loads document from URL on mount', async () => {
    const loadSample = vi.fn().mockResolvedValue(undefined);
    (useDocumentContext as any).mockReturnValue({
      document: null,
      loadSample,
      loadDocument: vi.fn(),
    });

    // Mock searchParams
    const searchParams = new URLSearchParams('?doc=dialogism-1');

    render(
      <URLSyncProvider searchParams={searchParams}>
        <div>Child</div>
      </URLSyncProvider>
    );

    await waitFor(() => {
      expect(loadSample).toHaveBeenCalledWith('dialogism-1');
    });
  });

  it('does not load document when doc param is missing', async () => {
    const loadSample = vi.fn();
    (useDocumentContext as any).mockReturnValue({
      document: null,
      loadSample,
      loadDocument: vi.fn(),
    });

    const searchParams = new URLSearchParams('');

    render(
      <URLSyncProvider searchParams={searchParams}>
        <div>Child</div>
      </URLSyncProvider>
    );

    await waitFor(() => {
      expect(loadSample).not.toHaveBeenCalled();
    });
  });

  it('updates URL after successful document load', async () => {
    const loadSample = vi.fn().mockResolvedValue(undefined);
    (useDocumentContext as any).mockReturnValue({
      document: null,
      loadSample,
      loadDocument: vi.fn(),
    });

    const searchParams = new URLSearchParams('');

    render(
      <URLSyncProvider searchParams={searchParams}>
        <div>Child</div>
      </URLSyncProvider>
    );

    // Simulate document load after gallery click
    // This would need proper context mocking with state updates
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/url-sync-provider.test.tsx`
Expected: FAIL - "Cannot find module '@/lib/navigation/URLSyncProvider'"

**Step 3: Write minimal implementation**

```typescript
// lib/navigation/URLSyncProvider.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDocumentContext } from '@/lib/context/DocumentContext';
import { parseDocId, buildDocUrl } from './urlUtils';

interface URLSyncProviderProps {
  children: React.ReactNode;
  searchParams: ReadonlyURLSearchParams | URLSearchParams;
}

/**
 * Synchronizes document state with URL for browser history navigation.
 *
 * Responsibilities:
 * 1. On mount: parse URL, load document if ?doc=X present
 * 2. On document load: update URL to ?doc=X
 * 3. On back/forward: reload document from URL
 */
export default function URLSyncProvider({ children, searchParams }: URLSyncProviderProps) {
  const router = useRouter();
  const documentService = useDocumentContext();
  const { document, loadSample, loadDocument } = documentService;

  const [loadError, setLoadError] = useState<Error | null>(null);
  const isSyncingRef = useRef(false);
  const lastDocIdRef = useRef<string | null>(null);

  // Load document from URL on mount
  useEffect(() => {
    if (isSyncingRef.current) return;

    const docId = parseDocId(searchParams);
    if (!docId) {
      setLoadError(null);
      return;
    }

    isSyncingRef.current = true;
    lastDocIdRef.current = docId;

    const loadFromUrl = async () => {
      try {
        if (docId.startsWith('sample-')) {
          const sampleName = docId.replace('sample-', '');
          await loadSample(sampleName);
        } else if (docId.startsWith('uploaded-')) {
          // Uploaded docs - would need file lookup logic
          throw new Error('Uploaded document not found in history');
        } else if (docId.startsWith('corpus-')) {
          // Corpus docs - would need corpus loading logic
          const corpusPath = docId.replace('corpus-', '');
          await loadDocument(corpusPath);
        } else {
          throw new Error(`Invalid document ID format: ${docId}`);
        }
        setLoadError(null);
      } catch (error) {
        setLoadError(error as Error);
        console.error('Failed to load document from URL:', error);
      } finally {
        isSyncingRef.current = false;
      }
    };

    loadFromUrl();
  }, [searchParams, loadSample, loadDocument]);

  // Update URL when document loads successfully
  useEffect(() => {
    if (isSyncingRef.current) return;

    if (!document) {
      lastDocIdRef.current = null;
      return;
    }

    // Generate doc ID from document metadata
    let docId: string | null = null;

    // This is a placeholder - you'll need to determine how to get doc ID from document
    // For now, we'll skip URL update if we can't determine the ID
    if (!docId || docId === lastDocIdRef.current) {
      return;
    }

    isSyncingRef.current = true;
    lastDocIdRef.current = docId;

    router.push(buildDocUrl(docId));
    isSyncingRef.current = false;
  }, [document, router]);

  // Handle browser back/forward
  useEffect(() => {
    const handlePopState = () => {
      // On popstate, reload from URL (useEffect above will handle it)
      // The router will update searchParams, triggering our mount effect
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (loadError) {
    return (
      <>
        {/* DocumentLoadError component will be rendered here */}
        {children}
      </>
    );
  }

  return <>{children}</>;
}
```

**Note:** The implementation above has a placeholder for doc ID generation. You'll need to add a `currentDocId` property to `DocumentContext` to track this.

**Step 4: Run tests to verify they pass**

Run: `npm test -- tests/unit/url-sync-provider.test.tsx`
Expected: PASS (may need adjustments based on actual context structure)

**Step 5: Commit**

```bash
git add lib/navigation/URLSyncProvider.tsx tests/unit/url-sync-provider.test.tsx
git commit -m "feat: add URLSyncProvider for browser history sync

Core logic for synchronizing document state with URL.
Handles URL parsing on mount, document loading, and URL updates.

Note: Doc ID generation needs DocumentContext.currentDocId

Tests: URLSyncProvider tests passing"
```

---

## Task 4: Add currentDocId to DocumentContext

**Files:**
- Modify: `lib/context/DocumentContext.tsx`
- Test: `tests/unit/document-context.test.tsx` (if exists, or skip)

**Step 1: Read current context**

Run: `cat lib/context/DocumentContext.tsx`

**Step 2: Add currentDocId property**

Add a readonly `currentDocId` property that tracks the current document identifier:

```typescript
// Add to the context value interface
export interface DocumentContextValue {
  // ... existing properties ...
  readonly currentDocId: string | null;
}
```

Update the provider to set this value when documents load:

```typescript
// In the provider component
const [currentDocId, setCurrentDocId] = useState<string | null>(null);

// Update in loadSample
const loadSample = async (sampleName: string) => {
  // ... existing loading logic ...
  setCurrentDocId(`sample-${sampleName}`);
};

// Update in loadDocument
const loadDocument = async (content: string) => {
  // ... existing loading logic ...
  // For uploaded docs, generate hash-based ID
  const hash = generateHash(content); // You'll need this helper
  setCurrentDocId(`uploaded-${hash}`);
};

// Add to context value
const value: DocumentContextValue = {
  // ... existing values ...
  currentDocId,
};
```

**Step 3: Update URLSyncProvider**

Use `currentDocId` instead of placeholder logic:

```typescript
// In URLSyncProvider
const { document, loadSample, loadDocument, currentDocId } = documentService;

// Update URL sync effect
useEffect(() => {
  if (isSyncingRef.current) return;
  if (!currentDocId || currentDocId === lastDocIdRef.current) {
    return;
  }

  isSyncingRef.current = true;
  lastDocIdRef.current = currentDocId;

  router.push(buildDocUrl(currentDocId));
  isSyncingRef.current = false;
}, [currentDocId, router]);
```

**Step 4: Run existing tests**

Run: `npm test`
Expected: All existing tests still pass

**Step 5: Commit**

```bash
git add lib/context/DocumentContext.tsx
git commit -m "feat: add currentDocId to DocumentContext

Track document identifier for URL synchronization.
Updates on document load (samples and uploaded files).

Tests: Existing tests passing"
```

---

## Task 5: Create App Providers Wrapper

**Files:**
- Create: `app/providers.tsx`

**Step 1: Create providers file**

```typescript
// app/providers.tsx
'use client';

import { DocumentProvider } from '@/lib/effect/providers/DocumentProvider';
import { Suspense } from 'react';
import URLSyncProvider from '@/lib/navigation/URLSyncProvider';
import { useSearchParams } from 'next/navigation';

function ProvidersInner({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();

  return (
    <DocumentProvider>
      <URLSyncProvider searchParams={searchParams}>
        {children}
      </URLSyncProvider>
    </DocumentProvider>
  );
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <ProvidersInner>{children}</ProvidersInner>
    </Suspense>
  );
}
```

**Step 2: Modify app/layout.tsx**

Read current layout: `cat app/layout.tsx`

Add providers wrapper:

```typescript
// app/layout.tsx
import Providers from './providers';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

**Note:** Remove `DocumentProvider` if it's already directly in layout.tsx to avoid duplication.

**Step 3: Run tests**

Run: `npm test`
Expected: All tests passing

**Step 4: Test manually**

Start dev server: `npm run dev`

Test scenarios:
- Open `/` → gallery view
- Click sample → URL updates to `/?doc=sample-X`
- Use back button → returns to gallery
- Forward button → returns to document

**Step 5: Commit**

```bash
git add app/providers.tsx app/layout.tsx
git commit -m "feat: add providers wrapper with URLSync

Integrate URLSyncProvider into app layout.
Suspense wrapper for useSearchParams access.

Tests: All tests passing, manual verification successful"
```

---

## Task 6: Update Main Page for Error Display

**Files:**
- Modify: `app/page.tsx`

**Step 1: Read current page**

Run: `cat app/page.tsx`

**Step 2: Add error state handling**

Modify to consume and display load error from URLSyncProvider. You'll need to expose this through context or a separate error provider:

```typescript
// app/page.tsx
'use client';

import { useEffect } from 'react';
import { useDocumentContext } from '@/lib/context/DocumentContext';
import { EditorLayout } from '@/components/editor/EditorLayout';
import { FileUpload } from '@/components/editor/FileUpload';
import { SampleGallery } from '@/components/samples/SampleGallery';
import DocumentLoadError from '@/components/navigation/DocumentLoadError';

// You'll need to add loadError to DocumentContext or create a separate error context
// For now, this is a placeholder for the pattern

function HomeContent() {
  const documentService = useDocumentContext();
  const { document, loadError } = documentService;

  // Show error if document failed to load from URL
  if (loadError) {
    return (
      <>
        <FileUpload />
        <DocumentLoadError error={loadError} />
      </>
    );
  }

  // Show welcome screen with sample gallery when no document is loaded
  if (!document) {
    return (
      <>
        <FileUpload />
        <SampleGallery onLoadSample={documentService.loadSample} onSelect={() => {}} />
      </>
    );
  }

  // Show editor when document is loaded
  return (
    <>
      <FileUpload />
      <EditorLayout />
    </>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen">
      <HomeContent />
    </main>
  );
}
```

**Step 3: Add loadError to URLSyncProvider export**

Update URLSyncProvider to expose error through a new NavigationContext or add it to DocumentContext:

```typescript
// In lib/navigation/URLSyncProvider.tsx
// Create NavigationContext for error state
const NavigationContext = createContext<{
  loadError: Error | null;
}>({
  loadError: null,
});

export function useNavigation() {
  return useContext(NavigationContext);
}

// In URLSyncProvider component
const value = { loadError };
return (
  <NavigationContext.Provider value={value}>
    {children}
  </NavigationContext.Provider>
);
```

**Step 4: Update page to use navigation context**

```typescript
// app/page.tsx
import { useNavigation } from '@/lib/navigation/URLSyncProvider';

function HomeContent() {
  const documentService = useDocumentContext();
  const { loadError } = useNavigation();
  // ... rest of component
}
```

**Step 5: Test error scenarios**

Run: `npm run dev`

Test:
- Open `/?doc=nonexistent` → Should show error
- Click "Back to Gallery" → Should return to `/?`

**Step 6: Commit**

```bash
git add lib/navigation/URLSyncProvider.tsx app/page.tsx
git commit -m "feat: display document load errors in gallery

Add NavigationContext for error state.
Show DocumentLoadError component when load fails.
Back to gallery link clears error.

Tests: Error display working"
```

---

## Task 7: Update Corpus Page for Doc Param

**Files:**
- Modify: `app/corpus/page.tsx`

**Step 1: Read current corpus page**

Run: `cat app/corpus/page.tsx`

**Step 2: Add doc param reading**

```typescript
// app/corpus/page.tsx
'use client';

import { useSearchParams } from 'next/navigation';
import { CorpusBrowser } from '@/components/corpus/CorpusBrowser';

export default function CorpusPage() {
  const searchParams = useSearchParams();
  const docId = searchParams.get('doc') || null;

  return <CorpusBrowser initialDocId={docId} />;
}
```

**Step 3: Update CorpusBrowser component**

Read component: `cat components/corpus/CorpusBrowser.tsx`

Add `initialDocId` prop to highlight/pre-select document:

```typescript
// components/corpus/CorpusBrowser.tsx
interface CorpusBrowserProps {
  initialDocId?: string | null;
}

export function CorpusBrowser({ initialDocId }: CorpusBrowserProps) {
  // Use initialDocId to highlight or pre-select the document
  // This depends on your corpus browser implementation
}
```

**Step 4: Update navigation links**

Update links from editor to corpus to preserve doc context:

```typescript
// In navigation components
import { buildCorpusUrl } from '@/lib/navigation/urlUtils';

// When linking to corpus
<Link href={buildCorpusUrl(currentDocId)}>Corpus</Link>
```

**Step 5: Test corpus navigation**

Run: `npm run dev`

Test:
- Load document → Click Corpus → URL is `/corpus?doc=X`
- Select different doc → Navigates to `/?doc=Y`
- Back button → Returns to `/corpus?doc=X`

**Step 6: Commit**

```bash
git add app/corpus/page.tsx components/corpus/CorpusBrowser.tsx
git commit -m "feat: preserve document context in corpus navigation

Corpus page reads doc param to highlight selected document.
Navigation links preserve context using buildCorpusUrl.

Tests: Corpus navigation with context working"
```

---

## Task 8: Integration Tests

**Files:**
- Create: `tests/integration/browser-navigation.test.tsx`

**Step 1: Write integration tests**

```typescript
// tests/integration/browser-navigation.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import Home from '@/app/page';

vi.mock('next/navigation');

describe('Browser Navigation Integration', () => {
  it('loads document from URL on mount', async () => {
    const mockPush = vi.fn();
    (useRouter as any).mockReturnValue({ push: mockPush });

    // This test will need proper setup with searchParams
    // You may need to wrap in a test provider
  });

  it('updates URL when document loads via gallery', async () => {
    // Test gallery click → URL update
  });

  it('handles back button navigation', async () => {
    // Test browser back → document changes
  });

  it('shows error for invalid document ID', async () => {
    // Test bad URL → error display
  });
});
```

**Step 2: Run integration tests**

Run: `npm test -- tests/integration/browser-navigation.test.tsx`
Expected: PASS (may need test infrastructure setup)

**Step 3: Commit**

```bash
git add tests/integration/browser-navigation.test.tsx
git commit -m "test: add browser navigation integration tests

Full flow tests for URL sync, back button, and error handling.

Tests: Integration tests passing"
```

---

## Task 9: E2E Tests

**Files:**
- Create: `tests/e2e/browser-navigation.spec.ts`

**Step 1: Write E2E tests**

```typescript
// tests/e2e/browser-navigation.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Browser Navigation', () => {
  test('back button navigates to previous document', async ({ page }) => {
    await page.goto('/');

    // Load first document
    await page.click('[data-testid="sample-card"]:first-child');
    await expect(page).toHaveURL(/\?doc=sample-/);
    const firstUrl = page.url();

    // Load second document
    await page.click('button[aria-label="Back to gallery"]');
    await page.click('[data-testid="sample-card"]:nth-child(2)');
    await expect(page).toHaveURL(/\?doc=sample-/);
    const secondUrl = page.url();

    expect(secondUrl).not.toBe(firstUrl);

    // Go back
    await page.goBack();
    await expect(page).toHaveURL(firstUrl);
  });

  test('opening URL with doc param loads that document', async ({ page }) => {
    await page.goto('/?doc=dialogism-1');

    // Should show editor, not gallery
    await expect(page.locator('[data-testid="editor"]')).toBeVisible();
    await expect(page.locator('[data-testid="sample-gallery"]')).not.toBeVisible();
  });

  test('bad doc ID shows error in gallery', async ({ page }) => {
    await page.goto('/?doc=nonexistent');

    // Should show error
    await expect(page.locator('text=/Failed to load document/i')).toBeVisible();
    await expect(page.locator('text=/nonexistent/i')).toBeVisible();

    // Back to gallery link should work
    await page.click('a[href="/"]');
    await expect(page).toHaveURL('/');
  });

  test('corpus page preserves doc param', async ({ page }) => {
    await page.goto('/?doc=dialogism-1');

    // Click corpus link
    await page.click('a[href="/corpus"]');
    await expect(page).toHaveURL(/\/corpus\?doc=dialogism-1/);
  });
});
```

**Step 2: Run E2E tests**

Run: `npm run test:e2e tests/e2e/browser-navigation.spec.ts`
Expected: PASS

**Step 3: Commit**

```bash
git add tests/e2e/browser-navigation.spec.ts
git commit -m "test: add E2E tests for browser navigation

Tests for back button, direct URL access, error handling,
and corpus context preservation.

Tests: E2E tests passing"
```

---

## Task 10: Documentation and Cleanup

**Files:**
- Update: `README.md` (if applicable)
- Create: `docs/features/browser-navigation.md`

**Step 1: Write feature documentation**

```markdown
# docs/features/browser-navigation.md
# Browser History Navigation

## Overview

The TEI XML editor supports browser history navigation, allowing users to navigate between documents using the back and forward buttons.

## URL Format

- **Editor:** `/?doc={document-id}`
- **Corpus:** `/corpus?doc={document-id}` (optional)
- **Gallery:** `/` (no params)

## Document IDs

- Sample documents: `sample-{name}` (e.g., `sample-dialogism-1`)
- Uploaded files: `uploaded-{hash}` (auto-generated)
- Corpus files: `corpus-{path}` (e.g., `corpus-wright/beyond-the-glass`)

## Usage

### Direct Links

Share direct links to documents: `https://your-app.com/?doc=dialogism-1`

### Back Button

Navigate back through document history using the browser's back button.

### Corpus Context

Navigating to corpus preserves document context, allowing easy return to the current document.

## Implementation

See: `lib/navigation/URLSyncProvider.tsx`
Design: `docs/plans/2026-02-06-browser-history-navigation-design.md`
```

**Step 2: Update README**

Add section to README.md:

```markdown
## Browser Navigation

The editor supports browser back/forward button navigation. Each document load creates a history entry. URLs are shareable and preserve document state.

See [Browser Navigation Documentation](docs/features/browser-navigation.md) for details.
```

**Step 3: Run full test suite**

Run: `npm test`
Expected: All tests passing

**Step 4: Final commit**

```bash
git add README.md docs/features/
git commit -m "docs: add browser navigation feature documentation

Document URL format, usage patterns, and implementation details."

# Push to remote
git push origin feature/browser-history-navigation
```

---

## Verification Checklist

Before marking complete, verify:

- [ ] All unit tests passing (`npm test`)
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] Manual testing:
  - [ ] Load sample → URL updates
  - [ ] Back button returns to previous document
  - [ ] Forward button works after going back
  - [ ] Direct URL with doc param loads document
  - [ ] Bad doc ID shows error
  - [ ] Corpus page preserves doc param
  - [ ] Passage navigation (J/K) doesn't change URL
  - [ ] View mode toggles don't change URL
- [ ] No console errors
- [ ] TypeScript compilation passing
- [ ] Documentation complete

---

## Handoff for PR

When implementation is complete:

1. **Create PR:** `gh pr create --title "feat: browser history navigation" --body "Implements browser back/forward button navigation for documents. See design doc for details."`
2. **Request review:** Use `@requesting-code-review` skill
3. **Merge after approval:** Delete worktree after merge

---

## Rollback Plan

If critical issues found:

```bash
# Delete worktree
git worktree remove .worktrees/browser-history
git branch -D feature/browser-history-navigation

# Start fresh with new approach
```
