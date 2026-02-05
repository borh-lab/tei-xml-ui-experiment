# E2E Test Suite Redesign: Protocol-First, Value-Oriented Testing

**Date:** 2025-02-05
**Status:** 🔄 Design Complete, Ready for Implementation
**Issue:** Current tests are coupled to DOM implementation, use timing-based assertions, and didn't catch critical sample gallery bug

## Executive Summary

This redesign transforms the e2e test suite from **implementation-coupled, timing-based tests** to **protocol-first, value-oriented tests**. The key insight: tests should verify **what the app does** (state transitions, capabilities) not **what the DOM looks like** (CSS selectors, timing).

### Problems Solved

| Problem | Current Approach | New Approach |
|---------|-----------------|--------------|
| **Sample gallery bug not caught** | Tests check `.monaco-editor` exists | Tests verify state transition: gallery → editor with loaded document |
| **Flaky timing tests** | `waitForTimeout(500)` everywhere | `waitForState({ location: 'editor', document: { loaded: true } })` |
| **Brittle selectors** | `button[title*="said"]`, `.fixed.z-50` | `[data-test-action="apply-tag"][data-test-tag="said"]` |
| **Braided helpers** | `uploadTestDocument` does 40 lines of nav/upload | `app.samples().load()` is single responsibility |
| **XML string coupling** | Tests return XML strings | Tests use `TEIDocument` values |
| **No protocol boundaries** | Tests use `page` directly | Tests use `TEIEditorApp` protocol |

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         E2E Test                                │
├─────────────────────────────────────────────────────────────────┤
│  TEIEditorApp (Protocol)                                        │
│  ├── getState() / waitForState()                               │
│  ├── samples(): SampleProtocol                                 │
│  ├── editor(): DocumentProtocol                                │
│  └── tags(): TagProtocol                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    State Exposure Layer                         │
│  __TEI_EDITOR_STATE__ = { location, document, viewMode, ... }  │
│  data-test-* attributes on all interactive elements            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         React App                               │
│  EditorLayout, SampleGallery, TagToolbar, etc.                 │
└─────────────────────────────────────────────────────────────────┘
```

## Section 1: App Protocol Layer

**Purpose:** Expose app capabilities and state as first-class API, not through CSS selectors.

```typescript
// tests/e2e/protocol/TEIEditorApp.ts
export class TEIEditorApp {
  static async create(page: Page): Promise<TEIEditorApp>;

  // Explicit state queries
  async getState(): Promise<AppState>;
  async waitForState(expected: Partial<AppState>): Promise<AppState>;

  // Capability protocols
  samples(): SampleProtocol;
  editor(): DocumentProtocol;
  tags(): TagProtocol;
  panels(): PanelsProtocol;
}

interface AppState {
  location: 'gallery' | 'editor' | 'welcome';
  document: { loaded: boolean; title?: string; passageCount?: number } | null;
  viewMode: 'wysiwyg' | 'xml' | 'split';
  panels: {
    validation: boolean;
    bulk: boolean;
    entities: boolean;
    viz: boolean;
  };
}
```

**Usage:**
```typescript
const app = await TEIEditorApp.create(page);
await app.samples().load('gift-of-the-magi');
await app.waitForState({ location: 'editor', document: { loaded: true } });
```

## Section 2: Test Data Protocol (Values Over Places)

**Purpose:** Tests work with domain values, not XML wire format.

```typescript
// tests/e2e/fixtures/TEIDocument.ts
export interface PassageValue {
  speaker: string;
  text: string;
  tags?: TagValue[];
}

export interface TEIDocumentValue {
  header: { title: string; author?: string };
  passages: PassageValue[];
}

export class TEIDocument {
  static valid(options: {
    title: string;
    speakers: string[];
    passages: number;
  }): TEIDocumentValue;

  static invalid(options: {
    error: 'unclosed-tag' | 'missing-root' | 'malformed'
  }): TEIDocumentValue;
}

export class TEISerializer {
  static serialize(doc: TEIDocumentValue): string;
  static deserialize(xml: string): TEIDocumentValue;
}
```

**Usage:**
```typescript
const doc = TEIDocument.valid({
  title: 'Test',
  speakers: ['#narrator', '#della'],
  passages: 5
});
const xml = TEISerializer.serialize(doc);
await app.editor().load(doc);  // Protocol handles serialization
```

## Section 3: Explicit State Succession

**Purpose:** Eliminate `waitForTimeout` by making state observable.

**Implementation:**

1. **Expose state in EditorLayout:**
```tsx
// EditorLayout.tsx
useEffect(() => {
  (window as any).__TEI_EDITOR_STATE__ = {
    location: editorState.document ? 'editor' : 'gallery',
    document: {
      loaded: !!editorState.document,
      title: editorState.document?.title,
      passageCount: getParagraphs().length,
    },
    viewMode: viewMode.viewMode,
    panels: editorUI.panelStates,
  };
}, [editorState.document, viewMode.viewMode, editorUI.panelStates]);
```

2. **StateMonitor reads from window:**
```typescript
// tests/e2e/protocol/StateMonitor.ts
async current(): Promise<AppState> {
  return await this.page.evaluate(() => {
    return (window as any).__TEI_EDITOR_STATE__;
  });
}

async waitFor(matcher: Partial<AppState>): Promise<AppState> {
  return await this.page.waitForFunction(
    (expected) => {
      const state = (window as any).__TEI_EDITOR_STATE__;
      return matchState(state, expected);
    },
    matcher,
    { timeout: 5000 }
  );
}
```

**Usage:**
```typescript
// Before: await page.waitForTimeout(500);
// After:
await app.waitForState({ location: 'editor', document: { loaded: true } });
```

## Section 4: Composable Page Objects

**Purpose:** Page objects are pure queries/actions, not navigation controllers.

```typescript
// tests/e2e/pages/GalleryPage.ts
export class GalleryPage {
  async getSamples(): Promise<Sample[]>;
  async clickSample(id: string): Promise<void>;
  async isVisible(): Promise<boolean>;
}

// tests/e2e/pages/EditorPage.ts
export class EditorPage {
  async getDocument(): Promise<{ title: string; passageCount: number }>;
  async isVisible(): Promise<boolean>;
  async getPassage(index: number): Promise<Passage>;
}

// tests/e2e/pages/Passage.ts
export class Passage {
  async select(): Promise<void>;
  async applyTag(tag: string): Promise<void>;
  async getText(): Promise<string>;
}
```

**Usage:**
```typescript
// Before: editorPage.goto() does navigation + loading + waiting
// After: composable
const gallery = new GalleryPage(page);
await gallery.clickSample('gift-of-the-magi');
await app.waitForState({ location: 'editor' });
```

## Section 5: Test Attributes (Stable Contracts)

**Purpose:** Decouple tests from CSS classes, titles, DOM structure.

**Attribute naming:**
- `data-test-page` - Page identifier (gallery, editor, welcome)
- `data-test-action` - User action (load-sample, apply-tag, export)
- `data-test-state` - Component state (ready, loading, error)
- `data-test-sample-id` - Business entity identifier
- `data-test-passage` - Passage index

**Examples:**
```tsx
<div data-test-page="gallery">
  <div data-test-sample-card data-test-sample-id="gift-of-the-magi">
    <h3 data-test-sample-title>The Gift of the Magi</h3>
    <button data-test-action="load-sample" data-test-sample-id="gift-of-the-magi">
      Load Sample
    </button>
  </div>
</div>

<div data-test-page="editor">
  <div data-test-passage="0" data-test-state="normal">...</div>
  <div data-test-passage="1" data-test-state="highlighted">...</div>
</div>

<div data-test-panel="tag-toolbar">
  <button data-test-action="apply-tag" data-test-tag="said">Apply &lt;said&gt;</button>
  <button data-test-action="apply-tag" data-test-tag="q">Apply &lt;q&gt;</button>
</div>
```

**Test usage:**
```typescript
// Before: page.locator('button[title*="said"]').first()
// After: page.locator('[data-test-action="apply-tag"][data-test-tag="said"]')
```

## Section 6: Protocol-Based Helpers

**Purpose:** Reusable workflows with state verification.

```typescript
// tests/e2e/protocols/SampleProtocol.ts
export class SampleProtocol {
  async list(): Promise<Sample[]>;
  async load(sampleId: string): Promise<AppState>;
  async exists(sampleId: string): Promise<boolean>;
}

// tests/e2e/protocols/DocumentProtocol.ts
export class DocumentProtocol {
  async load(doc: TEIDocumentValue): Promise<AppState>;
  async getCurrent(): Promise<TEIDocumentValue>;
  async getPassages(): Promise<PassageValue[]>;
}

// tests/e2e/protocols/TagProtocol.ts
export class TagProtocol {
  async apply(tagName: string, attributes?: Record<string, string>): Promise<void>;
  async getAvailableTags(): Promise<string[]>;
}
```

## Section 7: Test Rewrite Examples

**Example 1: Sample Loading**
```typescript
// BEFORE - DOM-coupled, timing-based
test('should upload valid TEI document', async ({ page }) => {
  const validTEI = generateTestDocument({ speakers: ['narrator'], passages: 5 });
  await uploadTestDocument(page, { name: 'test.tei.xml', content: validTEI });
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('[id^="passage-"]');
  await expect(page.locator('[id^="passage-"]')).toHaveCount(5);
});

// AFTER - Protocol-based, state-driven
test('should load document from sample gallery', async ({ page }) => {
  const app = await TEIEditorApp.create(page);
  await app.waitForState({ location: 'gallery' });
  const newState = await app.samples().load('gift-of-the-magi');
  expect(newState.location).equals('editor');
  expect(newState.document.loaded).equals(true);
});
```

**Example 2: Tag Application**
```typescript
// BEFORE - Brittle selectors, hidden timing
test('should apply said tag', async ({ page }) => {
  const passage = page.locator('[id^="passage-"]').first();
  await passage.click({ clickCount: 3 });
  await page.waitForTimeout(100);
  const saidButton = page.locator('button[title*="said"]').first();
  await saidButton.click();
  await expect(page.getByText(/Applied.*said/i)).toBeVisible();
});

// AFTER - Explicit actions, state verification
test('should apply said tag to selected text', async ({ page }) => {
  const app = await TEIEditorApp.create(page);
  await app.samples().load('gift-of-the-magi');
  const passage = await app.editor().getPassage(0);
  await passage.select();
  await app.tags().apply('said', { who: '#narrator' });
  const doc = await app.editor().getCurrent();
  expect(doc.passages[0].tags).toContain({ name: 'said' });
});
```

**Example 3: Error Handling**
```typescript
// BEFORE - Defensive conditionals
test('should reject non-XML file', async ({ page }) => {
  const hasGallery = await page.getByText(/Welcome to TEI/i).count();
  const hasEditor = await page.getByText('Rendered View').count();
  if (hasGallery > 0 && hasEditor === 0) {
    await page.getByText('The Gift of the Magi').click();
    await page.waitForSelector('button:has-text("Load Sample")');
    await page.getByRole('button', { name: 'Load Sample' }).click();
  }
  const file = { name: 'test.txt', mimeType: 'text/plain', buffer: Buffer.from('text') };
  await page.locator('input[type="file"]').setInputFiles(file);
  await page.waitForTimeout(500);
  await expect(page.getByText('Rendered View')).toBeVisible();
});

// AFTER - Explicit state expectations
test('should reject invalid file and preserve document', async ({ page }) => {
  const app = await TEIEditorApp.create(page);
  const beforeDoc = await app.samples().load('gift-of-the-magi');
  const invalidDoc = TEIDocument.invalid({ error: 'malformed' });
  await expect(async () => {
    await app.editor().load(invalidDoc);
  }).rejects.toThrow('Invalid XML');
  const afterState = await app.getState();
  expect(afterState.document.title).equals(beforeDoc.title);
});
```

## Section 8: Implementation Plan

### Phase 1: Foundation (No Breaking Changes)

**Tasks:**
1. Add `data-test-*` attributes to key components
2. Expose `__TEI_EDITOR_STATE__` in EditorLayout
3. Create protocol classes alongside existing helpers
4. Run existing tests to verify compatibility

**New files:**
```
tests/e2e/protocol/
  ├── TEIEditorApp.ts
  ├── StateMonitor.ts
  ├── pages/GalleryPage.ts
  ├── pages/EditorPage.ts
  ├── pages/Passage.ts
  ├── protocols/SampleProtocol.ts
  ├── protocols/DocumentProtocol.ts
  └── protocols/TagProtocol.ts
tests/e2e/fixtures/
  ├── TEIDocument.ts
  └── TEISerializer.ts
```

**Components to add attributes:**
- `components/samples/SampleGallery.tsx` - `data-test-page="gallery"`, `data-test-sample-card`, `data-test-action="load-sample"`
- `components/editor/RenderedView.tsx` - `data-test-page="editor"`, `data-test-passage`
- `components/editor/TagToolbar.tsx` - `data-test-action="apply-tag"`, `data-test-tag`

### Phase 2: Migrate Critical Tests

**Priority tests to migrate:**
1. `document-upload.spec.ts` - Sample loading is the critical user flow
2. `tag-application.spec.ts` - Core editing functionality
3. `error-scenarios.spec.ts` - Error handling validation

Keep old tests as `*.legacy.spec.ts` for verification.

### Phase 3: Migrate Remaining Tests

Migrate all other test files:
- `entity-modeling.spec.ts`
- `split-view-editing.spec.ts`
- `schema-validation-integration.spec.ts`
- `file-upload-from-welcome.spec.ts`
- `large-file-handling.spec.ts`
- etc.

### Phase 4: Cleanup

- Remove `@ts-nocheck` from test files
- Add TypeScript types for all protocols
- Document protocol patterns
- Remove old helpers (`uploadTestDocument`, `generateTestDocument`, `loadSample`)
- Update `playwright.config.ts`

### Implementation Order

| Day | Tasks | Expected Outcome |
|-----|-------|------------------|
| 1 | Add `data-test-*` to SampleGallery, RenderedView, TagToolbar | Tests can use stable selectors |
| 2 | Expose `__TEI_EDITOR_STATE__`, create StateMonitor | State is observable |
| 3 | Create page objects (GalleryPage, EditorPage, Passage) | Composable queries/actions |
| 4 | Create TEIDocument protocol | Value-oriented test data |
| 5 | Migrate document-upload.spec.ts (5 tests) | Protocol-based sample loading tests |
| 6 | Migrate tag-application.spec.ts (10 tests) | Protocol-based tag tests |
| 7 | Fix regressions, verify all tests pass | Stable, improved test suite |

### Rollback Strategy

Each phase is independently reversible:
- Keep Git branches: `phase-1-foundation`, `phase-2-critical`, `phase-3-remaining`, `phase-4-cleanup`
- Run both old and new tests in parallel during Phase 2-3
- Can revert to previous phase if blockers encountered

## Success Criteria

1. **Sample gallery bug is caught:** New test fails if clicking sample doesn't load document
2. **No timing-based waits:** All `waitForTimeout` replaced with `waitForState`
3. **Tests pass:** 98%+ test pass rate maintained
4. **Faster execution:** Remove unnecessary `networkidle` waits
5. **Better maintainability:** UI changes don't break tests (protected by `data-test-*` layer)

## Design Principles Applied

1. **Simplicity over Ease:** Protocol-based tests are unfamiliar but unentangled
2. **Values over Places:** `TEIDocument` values instead of XML strings
3. **Design for Composition:** Page objects, protocols, monitors are independently usable
4. **Explicit Time Modeling:** `waitForState` instead of hidden succession
5. **Protocols First:** `data-test-*` attributes are stable contracts
6. **Constraints as Instruments:** State enums limit valid states

## Related Documents

- Original Hickey-style review identified these issues
- Implementation complete marker indicates schema validation is done (950 tests passing)
- Focus on e2e layer; unit/integration tests already follow good practices

## Open Questions

1. **State exposure in production:** Should `__TEI_EDITOR_STATE__` be removed in prod builds? (Recommend: yes, use `process.env.NODE_ENV !== 'production'`)

2. **Attribute namespace:** Should we namespace attributes (e.g., `data-e2e-test-*`) to avoid conflicts? (Recommend: no, `data-test-*` is standard convention)

3. **Monaco editor testing:** How to test code editor interactions without `.monaco-editor` selector? (Recommend: add `data-test-editor="monaco"` attribute)

4. **Test data storage:** Should generated XML files be cached for reuse? (Recommend: yes, in `tests/fixtures/generated/`)

## Next Steps

1. Get approval on this design document
2. Create detailed implementation plan with task breakdown
3. Set up git worktree for isolated development
4. Begin Phase 1: Foundation implementation
