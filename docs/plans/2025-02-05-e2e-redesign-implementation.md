# E2E Test Redesign - Implementation Plan

**Branch:** feature/e2e-test-redesign
**Worktree:** ../tei-xml-e2e-redesign
**Created:** 2025-02-05
**Status:** 🚧 In Progress

## Overview

This plan breaks down the e2e test redesign into specific, actionable tasks. Each task has clear acceptance criteria and can be completed independently.

## Phase 1: Foundation (Days 1-2)

### Task 1.1: Add State Exposure to EditorLayout

**File:** `components/editor/EditorLayout.tsx`

**Changes:**
```tsx
// Add after line ~448 (before return)
useEffect(() => {
  if (typeof window === 'undefined') return;

  const state = {
    location: editorState.document ? 'editor' : 'gallery',
    document: editorState.document ? {
      loaded: true,
      title: editorState.document.title || 'Untitled',
      passageCount: getParagraphs().length,
    } : null,
    viewMode: viewMode.viewMode,
    panels: {
      validation: editorUI.panelStates.validationPanelOpen,
      bulk: editorUI.panelStates.bulkPanelOpen,
      entities: editorUI.panelStates.entityPanelOpen,
      viz: editorUI.panelStates.vizPanelOpen,
    },
  };

  (window as any).__TEI_EDITOR_STATE__ = state;
}, [editorState.document, viewMode.viewMode, editorUI.panelStates, getParagraphs]);
```

**Acceptance Criteria:**
- [ ] State object is exposed on `window.__TEI_EDITOR_STATE__`
- [ ] State updates when document loads/unloads
- [ ] State updates when view mode changes
- [ ] State updates when panels open/close
- [ ] Manual test: Open DevTools console, type `window.__TEI_EDITOR_STATE__`, verify state

### Task 1.2: Add Test Attributes to SampleGallery

**File:** `components/samples/SampleGallery.tsx`

**Changes:**
```tsx
// Wrap main container
<div data-test-page="gallery">
  {samples.map(sample => (
    <Card
      key={sample.id}
      data-test-sample-card
      data-test-sample-id={sample.id}
      data-test-state={loading ? 'loading' : 'ready'}
    >
      <CardHeader>
        <CardTitle data-test-sample-title>{sample.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p>{sample.description}</p>
        <Button
          data-test-action="load-sample"
          data-test-sample-id={sample.id}
        >
          Load Sample
        </Button>
      </CardContent>
    </Card>
  ))}
</div>
```

**Acceptance Criteria:**
- [ ] `data-test-page="gallery"` on main container
- [ ] `data-test-sample-card` and `data-test-sample-id` on each sample card
- [ ] `data-test-action="load-sample"` and `data-test-sample-id` on load button
- [ ] Manual test: Use DevTools to verify attributes exist

### Task 1.3: Add Test Attributes to RenderedView

**File:** `components/editor/RenderedView.tsx`

**Changes:**
```tsx
// Wrap main container
<div data-test-page="editor">
  {passages.map((passage, index) => (
    <div
      key={passage.id}
      data-test-passage={index}
      data-test-state={highlightedId === passage.id ? 'highlighted' : 'normal'}
      className={...}
    >
      {passage.content}
    </div>
  ))}
</div>
```

**Acceptance Criteria:**
- [ ] `data-test-page="editor"` on main container
- [ ] `data-test-passage` with index on each passage
- [ ] `data-test-state` reflects highlight state
- [ ] Manual test: DevTools inspection confirms attributes

### Task 1.4: Add Test Attributes to TagToolbar

**File:** `components/editor/TagToolbar.tsx`

**Changes:**
```tsx
// Wrap toolbar
<div
  data-test-panel="tag-toolbar"
  data-test-state={visible ? 'visible' : 'hidden'}
  className={...}
>
  {tags.map(tag => (
    <Button
      key={tag.name}
      data-test-action="apply-tag"
      data-test-tag={tag.name}
      data-test-attributes={JSON.stringify(tag.requiredAttributes || [])}
    >
      {tag.label}
    </Button>
  ))}
</div>
```

**Acceptance Criteria:**
- [ ] `data-test-panel="tag-toolbar"` on toolbar container
- [ ] `data-test-action="apply-tag"` on each tag button
- [ ] `data-test-tag` contains tag name (said, q, persName)
- [ ] `data-test-state` reflects visibility
- [ ] Manual test: Verify with DevTools

### Task 1.5: Create StateMonitor Protocol

**New file:** `tests/e2e/protocol/StateMonitor.ts`

**Implementation:**
```typescript
import { Page, expect } from '@playwright/test';

export interface AppState {
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

function matchState(actual: AppState, expected: Partial<AppState>): boolean {
  if (expected.location && actual.location !== expected.location) return false;
  if (expected.document) {
    if (expected.document.loaded && !actual.document?.loaded) return false;
    if (expected.document.title && actual.document?.title !== expected.document.title) return false;
  }
  if (expected.viewMode && actual.viewMode !== expected.viewMode) return false;
  if (expected.panels) {
    if (expected.panels.validation !== actual.panels.validation) return false;
    if (expected.panels.bulk !== actual.panels.bulk) return false;
  }
  return true;
}

export class StateMonitor {
  constructor(private page: Page) {}

  async current(): Promise<AppState> {
    const state = await this.page.evaluate(() => {
      return (window as any).__TEI_EDITOR_STATE__;
    });
    return state;
  }

  async waitFor(matcher: Partial<AppState>, timeout = 5000): Promise<AppState> {
    const state = await this.page.waitForFunction(
      (expected) => {
        const actual = (window as any).__TEI_EDITOR_STATE__;
        return matchState(actual, expected);
      },
      matcher,
      { timeout }
    );
    return state.jsonValue() as unknown as AppState;
  }

  async onChange(callback: (state: AppState) => void): Promise<void> {
    await this.page.exposeFunction('onStateChange', callback);
    await this.page.evaluate(() => {
      let previousState = (window as any).__TEI_EDITOR_STATE__;
      const observer = new MutationObserver(() => {
        const currentState = (window as any).__TEI_EDITOR_STATE__;
        if (JSON.stringify(previousState) !== JSON.stringify(currentState)) {
          previousState = currentState;
          (window as any).onStateChange(currentState);
        }
      });
      observer.observe(document.body, { subtree: true, childList: true });
    });
  }
}
```

**Acceptance Criteria:**
- [ ] `current()` returns state from window object
- [ ] `waitFor()` waits for state to match matcher
- [ ] `onChange()` subscribes to state changes
- [ ] Unit test: Create test file verifying StateMonitor works

### Task 1.6: Create TEIEditorApp Protocol

**New file:** `tests/e2e/protocol/TEIEditorApp.ts`

**Implementation:**
```typescript
import { Page } from '@playwright/test';
import { StateMonitor, AppState } from './StateMonitor';
import { SampleProtocol } from './protocols/SampleProtocol';
import { DocumentProtocol } from './protocols/DocumentProtocol';
import { TagProtocol } from './protocols/TagProtocol';

export class TEIEditorApp {
  private monitor: StateMonitor;
  private _samples?: SampleProtocol;
  private _editor?: DocumentProtocol;
  private _tags?: TagProtocol;

  private constructor(private page: Page, monitor: StateMonitor) {
    this.monitor = monitor;
  }

  static async create(page: Page): Promise<TEIEditorApp> {
    const monitor = new StateMonitor(page);
    const app = new TEIEditorApp(page, monitor);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    return app;
  }

  async getState(): Promise<AppState> {
    return await this.monitor.current();
  }

  async waitForState(expected: Partial<AppState>): Promise<AppState> {
    return await this.monitor.waitFor(expected);
  }

  samples(): SampleProtocol {
    if (!this._samples) {
      this._samples = new SampleProtocol(this);
    }
    return this._samples;
  }

  editor(): DocumentProtocol {
    if (!this._editor) {
      this._editor = new DocumentProtocol(this);
    }
    return this._editor;
  }

  tags(): TagProtocol {
    if (!this._tags) {
      this._tags = new TagProtocol(this);
    }
    return this._tags;
  }

  page(): Page {
    return this.page;
  }
}
```

**Acceptance Criteria:**
- [ ] Static `create()` method initializes app
- [ ] `getState()` returns current state
- [ ] `waitForState()` waits for state match
- [ ] Protocol methods return singleton instances

### Task 1.7: Create TEIDocument Test Data Protocol

**New file:** `tests/e2e/fixtures/TEIDocument.ts`

**Implementation:**
```typescript
export interface TagValue {
  name: string;
  attributes?: Record<string, string>;
}

export interface PassageValue {
  speaker: string;
  text: string;
  tags?: TagValue[];
}

export interface HeaderValue {
  title: string;
  author?: string;
}

export interface TEIDocumentValue {
  header: HeaderValue;
  passages: PassageValue[];
}

export class TEIDocument {
  static valid(options: {
    title: string;
    speakers: string[];
    passages: number;
  }): TEIDocumentValue {
    const passages: PassageValue[] = [];
    for (let i = 0; i < options.passages; i++) {
      const speaker = options.speakers[i % options.speakers.length];
      passages.push({
        speaker,
        text: `Test passage ${i + 1}`,
        tags: [],
      });
    }

    return {
      header: { title: options.title },
      passages,
    };
  }

  static invalid(options: {
    error: 'unclosed-tag' | 'missing-root' | 'malformed'
  }): TEIDocumentValue {
    // Return value that will serialize to invalid XML
    if (options.error === 'unclosed-tag') {
      return {
        header: { title: 'Invalid' },
        passages: [{ speaker: '#test', text: '<unclosed' }],
      };
    }
    // ... other error types
    return {
      header: { title: 'Invalid' },
      passages: [],
    };
  }

  static withPassages(passages: PassageValue[]): TEIDocumentValue {
    return {
      header: { title: 'Custom Document' },
      passages,
    };
  }
}
```

**Acceptance Criteria:**
- [ ] `valid()` creates document with specified passages
- [ ] `invalid()` creates document that serializes to invalid XML
- [ ] `withPassages()` creates custom document
- [ ] Unit tests verify value structure

### Task 1.8: Create TEISerializer

**New file:** `tests/e2e/fixtures/TEISerializer.ts`

**Implementation:**
```typescript
import { TEIDocumentValue } from './TEIDocument';

export class TEISerializer {
  static serialize(doc: TEIDocumentValue): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<TEI xmlns="http://www.tei-c.org/ns/1.0">\n';
    xml += '  <teiHeader>\n';
    xml += '    <fileDesc>\n';
    xml += '      <titleStmt>\n';
    xml += `        <title>${this.escapeXml(doc.header.title)}</title>\n`;
    if (doc.header.author) {
      xml += `        <author>${this.escapeXml(doc.header.author)}</author>\n`;
    }
    xml += '      </titleStmt>\n';
    xml += '    </fileDesc>\n';
    xml += '  </teiHeader>\n';
    xml += '  <text>\n';
    xml += '    <body>\n';
    xml += '      <castList>\n';
    const speakers = new Set(doc.passages.map(p => p.speaker));
    speakers.forEach(speaker => {
      xml += `        <castItem><role xml:id="${speaker}">${speaker}</role></castItem>\n`;
    });
    xml += '      </castList>\n';

    doc.passages.forEach(passage => {
      xml += '      <p>\n';
      xml += `        <s who="${passage.speaker}">${this.escapeXml(passage.text)}</s>\n`;
      xml += '      </p>\n';
    });

    xml += '    </body>\n';
    xml += '  </text>\n';
    xml += '</TEI>\n';
    return xml;
  }

  private static escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
```

**Acceptance Criteria:**
- [ ] Serializes valid TEI document
- [ ] Escapes XML special characters
- [ ] Generates valid XML structure
- [ ] Unit tests verify output is parseable

### Task 1.9: Create SampleProtocol

**New file:** `tests/e2e/protocols/SampleProtocol.ts`

**Implementation:**
```typescript
import { TEIEditorApp } from '../TEIEditorApp';
import { AppState } from '../StateMonitor';

export interface Sample {
  id: string;
  title: string;
  state?: string;
}

export class SampleProtocol {
  constructor(private app: TEIEditorApp) {}

  async list(): Promise<Sample[]> {
    const state = await this.app.getState();
    if (state.location !== 'gallery') {
      throw new Error('Not on gallery page. Current location: ' + state.location);
    }

    return await this.app.page().evaluate(() => {
      const cards = document.querySelectorAll('[data-test-sample-card]');
      return Array.from(cards).map(card => ({
        id: card.getAttribute('data-sample-id'),
        title: card.querySelector('[data-test-sample-title]')?.textContent,
        state: card.getAttribute('data-test-state'),
      }));
    });
  }

  async load(sampleId: string): Promise<AppState> {
    const button = this.app.page().locator(
      `[data-test-action="load-sample"][data-test-sample-id="${sampleId}"]`
    );

    const count = await button.count();
    if (count === 0) {
      throw new Error(`Sample not found: ${sampleId}`);
    }

    await button.first().click();

    // Wait for state transition
    const newState = await this.app.waitForState({
      location: 'editor',
      document: { loaded: true },
    });

    return newState;
  }

  async exists(sampleId: string): Promise<boolean> {
    const samples = await this.list();
    return samples.some(s => s.id === sampleId);
  }
}
```

**Acceptance Criteria:**
- [ ] `list()` returns available samples
- [ ] `load()` clicks sample and waits for editor state
- [ ] `exists()` checks if sample exists
- [ ] Error handling for invalid sample ID

### Task 1.10: Create DocumentProtocol

**New file:** `tests/e2e/protocols/DocumentProtocol.ts`

**Implementation:**
```typescript
import { TEIEditorApp } from '../TEIEditorApp';
import { AppState } from '../StateMonitor';
import { TEIDocumentValue } from '../fixtures/TEIDocument';
import { TEISerializer } from '../fixtures/TEISerializer';

export class DocumentProtocol {
  constructor(private app: TEIEditorApp) {}

  async load(doc: TEIDocumentValue): Promise<AppState> {
    const xml = TEISerializer.serialize(doc);
    const buffer = Buffer.from(xml, 'utf-8');

    await this.app.page().locator('input[type="file"]').setInputFiles({
      name: 'test.tei.xml',
      mimeType: 'text/xml',
      buffer,
    });

    return await this.app.waitForState({
      location: 'editor',
      document: { loaded: true },
    });
  }

  async getCurrent(): Promise<TEIDocumentValue> {
    return await this.app.page().evaluate(() => {
      const state = (window as any).__TEI_EDITOR_STATE__;
      return state.document;
    });
  }

  async getPassageCount(): Promise<number> {
    const state = await this.app.getState();
    return state.document?.passageCount || 0;
  }
}
```

**Acceptance Criteria:**
- [ ] `load()` uploads document and waits for editor state
- [ ] `getCurrent()` returns document info
- [ ] `getPassageCount()` returns passage count from state

### Task 1.11: Create TagProtocol

**New file:** `tests/e2e/protocols/TagProtocol.ts`

**Implementation:**
```typescript
import { TEIEditorApp } from '../TEIEditorApp';

export class TagProtocol {
  constructor(private app: TEIEditorApp) {}

  async apply(tagName: string, attributes?: Record<string, string>): Promise<void> {
    const button = this.app.page().locator(
      `[data-test-action="apply-tag"][data-test-tag="${tagName}"]`
    );

    const count = await button.count();
    if (count === 0) {
      throw new Error(`Tag not found: ${tagName}`);
    }

    await button.first().click();

    // Wait for any loading/state changes
    await this.app.page().waitForTimeout(200);
  }

  async getAvailableTags(): Promise<string[]> {
    return await this.app.page().evaluate(() => {
      const buttons = document.querySelectorAll('[data-test-action="apply-tag"]');
      return Array.from(buttons).map(b => b.getAttribute('data-test-tag'));
    });
  }

  async isToolbarVisible(): Promise<boolean> {
    const toolbar = this.app.page().locator('[data-test-panel="tag-toolbar"]');
    const count = await toolbar.count();
    if (count === 0) return false;

    const state = await toolbar.first().getAttribute('data-test-state');
    return state === 'visible';
  }
}
```

**Acceptance Criteria:**
- [ ] `apply()` clicks tag button
- [ ] `getAvailableTags()` returns list of tags
- [ ] `isToolbarVisible()` checks toolbar state

### Task 1.12: Verify Phase 1 with Manual Test

**New file:** `tests/e2e/protocol/phase1-manual.spec.ts`

**Implementation:**
```typescript
import { test, expect } from '@playwright/test';
import { TEIEditorApp } from './protocol/TEIEditorApp';

test('Phase 1: Manual verification of protocols', async ({ page }) => {
  const app = await TEIEditorApp.create(page);

  // 1. Verify initial state
  let state = await app.getState();
  console.log('Initial state:', state);
  expect(state.location).toBe('gallery');

  // 2. List samples
  const samples = await app.samples().list();
  console.log('Available samples:', samples);
  expect(samples.length).toBeGreaterThan(0);

  // 3. Load first sample
  const firstSample = samples[0];
  await app.samples().load(firstSample.id);

  // 4. Verify state transition
  state = await app.getState();
  console.log('After load:', state);
  expect(state.location).toBe('editor');
  expect(state.document?.loaded).toBe(true);

  // 5. Verify document loaded
  const passageCount = await app.editor().getPassageCount();
  console.log('Passage count:', passageCount);
  expect(passageCount).toBeGreaterThan(0);
});
```

**Acceptance Criteria:**
- [ ] Test runs without errors
- [ ] State transitions are logged correctly
- [ ] Sample loading works end-to-end
- [ ] Manual inspection confirms protocols work

## Phase 2: Migrate Critical Tests (Days 3-4)

### Task 2.1: Rewrite document-upload.spec.ts Tests

**File:** `tests/e2e/document-upload.spec.ts`

**Actions:**
1. Rename existing file to `document-upload.legacy.spec.ts`
2. Create new `document-upload.spec.ts` using protocols
3. Migrate tests:
   - `should upload valid TEI document` → use `app.editor().load()`
   - `should reject non-XML file` → verify state stays in gallery
   - `should handle TEI with namespace` → use `TEIDocument.valid()`

**Acceptance Criteria:**
- [ ] New tests use protocols
- [ ] Old tests still pass (verification)
- [ ] No `waitForTimeout` in new tests
- [ ] All assertions use state queries

### Task 2.2: Rewrite tag-application.spec.ts Tests

**File:** `tests/e2e/tag-application.spec.ts`

**Actions:**
1. Rename to `tag-application.legacy.spec.ts`
2. Create new `tag-application.spec.ts` using protocols
3. Migrate tests:
   - `should apply said tag` → use `app.tags().apply('said')`
   - `should apply q tag` → use `app.tags().apply('q')`
   - `should show error toast when no text selected` → verify state unchanged

**Acceptance Criteria:**
- [ ] New tests use protocols
- [ ] Old tests still pass
- [ ] Tag application verified via state
- [ ] No CSS selectors in tests

### Task 2.3: Rewrite error-scenarios.spec.ts Tests

**File:** `tests/e2e/error-scenarios.spec.ts`

**Actions:**
1. Rename to `error-scenarios.legacy.spec.ts`
2. Create new `error-scenarios.spec.ts`
3. Migrate key tests:
   - `should handle malformed XML` → verify error state
   - `should reject non-XML file` → verify document preserved
   - `should allow retry after failed upload` → state-based verification

**Acceptance Criteria:**
- [ ] Error scenarios tested via state
- [ ] No conditional logic based on DOM counts
- [ ] State preservation verified explicitly
- [ ] Tests are deterministic

### Task 2.4: Compare Legacy vs New Test Results

**Script:** `scripts/compare-test-results.sh`

**Actions:**
1. Run legacy tests: save output
2. Run new tests: save output
3. Compare pass/fail rates
4. Document any differences

**Acceptance Criteria:**
- [ ] Both test suites run
- [ ] Comparison report generated
- [ ] New tests cover same scenarios
- [ ] No regressions introduced

## Phase 3: Migrate Remaining Tests (Days 5-6)

### Task 3.1: Migrate entity-modeling.spec.ts

**Actions:**
- Rename to legacy
- Create new version using protocols
- Use `app.panels()` to test entity editor

### Task 3.2: Migrate split-view-editing.spec.ts

**Actions:**
- Rename to legacy
- Test view mode switching via state
- Verify `viewMode` in state

### Task 3.3: Migrate remaining test files

**Files:**
- `corpus-analytics.spec.ts`
- `corpus-browsing.spec.ts`
- `error-analytics.spec.ts`
- `export-validation.spec.ts`
- `large-file-handling.spec.ts`
- `schema-validation-integration.spec.ts`
- etc.

**Acceptance Criteria:**
- [ ] All tests migrated
- [ ] No `waitForTimeout` remaining
- [ ] All tests use protocols
- [ ] 98%+ pass rate maintained

## Phase 4: Cleanup (Day 7)

### Task 4.1: Remove Legacy Test Files

**Actions:**
- Delete `*.legacy.spec.ts` files
- Remove old test helpers (`uploadTestDocument`, `generateTestDocument`)
- Update imports

### Task 4.2: Remove @ts-nocheck

**Actions:**
- Remove `@ts-nocheck` from all test files
- Fix any TypeScript errors
- Add proper types

### Task 4.3: Update Playwright Config

**File:** `playwright.config.ts`

**Actions:**
- Update defaults
- Add custom matchers
- Configure timeouts

### Task 4.4: Document Protocols

**New file:** `tests/e2e/README.md`

**Content:**
- How to use TEIEditorApp
- Protocol patterns
- State query examples
- Best practices

## Verification Tasks

### Task V.1: Run Full Test Suite

```bash
npm run test:e2e
```

**Expected:** 98%+ pass rate

### Task V.2: Verify Sample Gallery Bug is Caught

**Test:** Load sample, verify state transition

**Expected:** Test fails if sample doesn't load

### Task V.3: Performance Check

**Metric:** Test execution time

**Expected:** No significant slowdown

## Rollback Plan

If any phase fails:
1. Commit current work
2. Revert to previous phase
3. Document blockers
4. Adjust plan

## Success Metrics

- [ ] Sample gallery bug caught by tests
- [ ] Zero `waitForTimeout` calls in new tests
- [ ] 98%+ test pass rate
- [ ] All tests use protocols
- [ ] Type safety (@ts-nocheck removed)
- [ ] Documentation complete
