# Hickey-Style Architectural Review: TEI Dialogue Editor

**Review Date:** 2025-02-04
**Reviewer:** Claude (Hickey Principles)
**Scope:** Entire codebase with focus on testability

---

## Executive Summary

**Current State:** The TEI Dialogue Editor has significant architectural entanglement that makes testing fragile and composition difficult. While some good practices exist (AIProvider interface, reducer pattern), the fundamental architecture follows "easy" (filiar React patterns) rather than "simple" (unentangled design).

**Key Finding:** The codebase exhibits **place-oriented mutation** throughout—React state, localStorage, refs—all creating hidden dependencies that tests must dance around.

**Recommendation:** Adopt Effect's **declarative, composable architecture** to separate concerns, model state explicitly, and enable true composability.

---

## Dimension 1: Simplicity vs Ease (Unentangled vs Familiar)

### Current State: ❌ COMPLEX (Braided Concerns)

**Example 1: EditorLayout.tsx - The God Component**

```tsx
// ❌ 22 useState hooks in one component (lines 44-67)
const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
const [aiMode, setAIMode] = useState<AIMode>('manual');
const [suggestions, setSuggestions] = useState<DialogueSpan[]>([]);
const [selectedText, setSelectedText] = useState<string>('');
const [bulkPanelOpen, setBulkPanelOpen] = useState(false);
const [vizPanelOpen, setVizPanelOpen] = useState(false);
const [validationPanelOpen, setValidationPanelOpen] = useState(false);
const [selectedPassages, setSelectedPassages] = useState<string[]>([]);
const [isBulkMode, setIsBulkMode] = useState(false);
const [highlightedPassageId, setHighlightedPassageId] = useState<string | null>(null);
const [currentPassageId, setCurrentPassageId] = useState<string | null>(null);
const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);
// ... 11 more useState hooks
```

**Hickey Analysis:**
- **Braided concerns:** UI state, business logic, data fetching, side effects all mixed
- **Easy (familiar):** Standard React pattern everyone knows
- **Simple (unentangled):** NO - Each state variable is a "twist" that entangles with others
- **Mutation hidden:** `setBulkPanelOpen` doesn't just change one thing—it triggers re-renders, affects layout, changes focus

**Better Approach (Values Over Places):**
```typescript
// ✅ Simple: Value-oriented state (succession of values)
interface EditorState {
  readonly commandPalette: boolean;
  readonly aiMode: AIMode;
  readonly panels: Readonly<{
    bulk: boolean;
    viz: boolean;
    validation: boolean;
  }>;
  readonly selection: Readonly<{
    passages: readonly string[];
    currentId: string | null;
  }>;
}

// State transition returns NEW value (immutability)
const nextState: EditorState = {
  ...currentState,
  panels: { ...currentState.panels, bulk: true }
};
```

---

**Example 2: DocumentContext - Place-Oriented State Management**

```tsx
// ❌ Context creates 8 places that mutate independently
const [loadingSample, setLoadingSample] = useState(false);
const [loadingProgress, setLoadingProgress] = useState(0);
const [skipAutoLoad, setSkipAutoLoad] = useState(false);
const [validationResults, setValidationResults] = useState(null);
const [isValidating, setIsValidating] = useState(false);
```

**Hickey Analysis:**
- **Places, not values:** Each `setXxx mutates a place that components must defensively copy
- **Hidden temporal coupling:** `loadingProgress` must be updated at specific times during `loadSample`—implicit protocol
- **No composition:** Can't combine `loadingSample` + `validationResults` into reusable workflows

**Effect Pattern:**
```typescript
// ✅ Declarative: Program describes WHAT, not HOW
import { Effect } from 'effect';

// Load document is a program that can be run, composed, retried
const loadDocument = (sampleId: string) =>
  Effect.gen(function* (_) {
    yield Effect.tryPromise(() => fetchSample(sampleId));
    const content = yield Effect.allValidating(content);
    yield validateDocument(content);
    yield updateState({ document: content });
  });

// Tests can provide mock implementations without changing production
```

---

### Red Flag: "Team knows this pattern"

**Current Code:**
```tsx
// ❌ Familiar but entangled
useEffect(() => {
  const savedMode = localStorage.getItem('tei-editor-view-mode');
  if (savedMode) setViewMode(savedMode);
}, []);

useEffect(() => {
  localStorage.setItem('tei-editor-view-mode', viewMode);
}, [viewMode]);
```

**Hickey Feedback:** "This is the 'easy' way (standard React localStorage pattern). Is it 'simple' (unentangled)? The component is now tightly coupled to browser localStorage, making it hard to test and impossible to compose."

**Simple Alternative (Protocol First):**
```typescript
// ✅ Protocol: ViewModeStorage interface
interface ViewModeStorage {
  get(): Promise<ViewMode | null>;
  set(mode: ViewMode): Promise<void>;
}

// Production implementation
class BrowserViewModeStorage implements ViewModeStorage {
  async get() {
    return localStorage.getItem('view-mode') as ViewMode | null;
  }
  async set(mode: ViewMode) {
    localStorage.setItem('view-mode', mode);
  }
}

// Test implementation (no browser, pure values)
class TestViewModeStorage implements ViewModeStorage {
  private mode: ViewMode | null = null;
  async get() { return this.mode; }
  async set(mode: ViewMode) { this.mode = mode; }
}
```

---

## Dimension 2: Values Over Places (Immutability Benefits)

### Current State: ❌ PLACE-ORIENTED EVERYWHERE

**Example 1: TEI Operations - Mutation by Default**

```typescript
// ❌ lib/tei/operations.ts - Functions mutate the document
export function addSaidTag(
  doc: TEIDocument,
  passageId: PassageID,
  range: TextRange,
  speaker: CharacterID
): TEIDocument {
  // MUTATION: Creates new object BUT also mutates internal state
  const passage = doc.parsed.TEI.text.body.p[passageId];
  passage.said = {
    speaker: `#${speaker}`,
    ...range
  };
  return doc; // Returns "same" object but it's mutated
}
```

**Hickey Analysis:**
- **Places everywhere:** The `doc` parameter is a place—mutation has side effects
- **Hidden mutation:** Returns `doc` like nothing changed, but it's different now
- **No composability:** Can't chain operations reliably without copying between each step
- **Time erased:** Can't see the succession of states (untagged → tagged)

**Effect Pattern:**
```typescript
// ✅ Value-oriented: Each operation returns NEW value
import { Effect } from 'effect';

// Document is a value, not a place
interface TagEvent {
  readonly _tag: 'addSaid';
  readonly passageId: PassageID;
  readonly range: TextRange;
  readonly speaker: CharacterID;
  readonly timestamp: number;
}

// Pure function - no mutation
const addSaidTag = (
  doc: TEIDocument,
  event: TagEvent
): TEIDocument => ({
  ...doc,
  parsed: {
    ...doc.parsed,
    TEI: {
      ...doc.parsed.TEI,
      text: {
        ...doc.parsed.TEI.text,
        body: doc.parsed.TEI.text.body.map(passage =>
          passage.id === event.passageId
            ? { ...passage, said: event.speaker }
            : passage
        )
      }
    }
  }
});
```

---

**Example 2: SelectionManager - Mutable State**

```typescript
// ❌ lib/selection/SelectionManager.ts
export class SelectionManager {
  private selectedText: { start: number; end: number } | null = null;

  selectText(start: number, end: number) {
    // PLACE mutation - state changes in place
    this.selectedText = { start, end };
  }
}
```

**Hickey Feedback:** "This is a mutable place. Any caller holding a reference to `SelectionManager` sees different state over time—place creates coordination problems. Values share safely; places don't."

**Simple Alternative:**
```typescript
// ✅ Value: Selection as immutable value
type Selection = { readonly start: number; readonly end: number } | null;

// Function returns new state (value, not place)
const selectText = (
  current: Selection,
  start: number,
  end: number
): Selection => ({ start, end });

// Composition is trivial and safe
const selection1 = selectText(null, 10, 20);
const selection2 = selectText(selection1, 15, 25);
// Both selections are valid values that can coexist
```

---

## Dimension 3: Design for Composition (Decomposition)

### Current State: ❌ NOT COMPOSABLE

**Example 1: AI Provider - Tightly Coupled Implementation**

```typescript
// ❌ lib/ai/openai.ts - Concrete implementation mixed with protocol
export async function detectDialogue(text: string): Promise<DialogueSpan[]> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [{ role: 'system', content: '...' }]
    })
  });
  // OpenAI-specific logic inseparable from interface
}
```

**Hickey Analysis:**
- **Not separable:** Can't use `detectDialogue` without OpenAI dependency
- **Can't compose:** Can't wrap with caching, logging, retry logic without changing implementation
- **Testing pain:** Must mock HTTP requests or hit real API

**Effect Pattern (Protocol First, Composable):**
```typescript
// ✅ Protocol First: Define what we need
interface DialogueDetection {
  detect(text: string): Effect<DialogueSpan[], ApiError>;
}

// ✅ Composable: Layer protocol with cross-cutting concerns
const detectDialogue = (text: string) =>
  pipe(
    fetchFromLLM({ model: 'gpt-4', prompt: text }),
    cacheResults(),
    retryThreeTimes(),
    logAPICalls(),
    validateResponse()
  )(text);

// ✅ Test implementation without HTTP
const mockDetectDialogue = (text: string) =>
  Effect.succeed([
    { start: 0, end: 10, text: '...', confidence: 0.9 }
  ]);
```

---

**Example 2: Validation - Cross-Cutting Concern Entangled**

```tsx
// ❌ DocumentContext.loadDocumentHandler - Validation mixed with loading
const loadDocumentHandler = useCallback((xml: string) => {
  dispatch({ type: 'LOAD', xml });
  setValidationResults(null);
  validateOnly(xml).catch(err => {
    console.error('Failed to validate after load:', err);
  });
}, [logError, validateOnly]);
```

**Hickey Feedback:** "Validation is cross-cutting (happens during loading AND saving), but it's braided into the loading logic. Can't validate independently without triggering a document load. This is not composable."

**Simple Alternative (Composable):**
```typescript
// ✅ Composable: Validation as separate Effect
const loadDocument = (xml: string) =>
  pipe(
    parseXML,
    validateDocument,
    loadIntoState,
    clearValidationCache
  )(xml);

const validateDocument = (xml: string) =>
  pipe(
    sendToValidationAPI,
    cacheValidationResult,
    logValidationErrors
  )(xml);

// Tests can use validation independently
const validationResult = await validateDocument(xml).runPromise();
```

---

## Dimension 4: Time and State Modeling (Succession of Values)

### Current State: ❌ TIME IMPLICIT, MUTATION ERASES HISTORY

**Example 1: History Manager - Hidden State Transitions**

```typescript
// ❌ lib/history/HistoryManager.ts
export function getHistoryState(document: TEIDocument | null) {
  if (!document) {
    return { canUndo: false, canRedo: false, currentRevision: 0 };
  }

  // PROBLEM: History state DERIVED from document, but not explicitly modeled
  // Changes to document implicitly change history state
  return {
    canUndo: document.revision > 0,
    canRedo: document.revision < document.history.length - 1,
    currentRevision: document.revision
  };
}
```

**Hickey Analysis:**
- **Time implicit:** History is "there" but not explicitly modeled as succession
- **Mutation erases past:** When `dispatch({ type: 'ADD_SAID_TAG' })` happens, old document is gone—can't see what changed
- **No time travel:** Can't inspect document at revision 50 without replaying 1-49

**Effect Pattern (Explicit Time Modeling):**
```typescript
// ✅ Explicit time: Event Sourcing
type DocumentEvent =
  | { type: 'loaded'; xml: string; timestamp: number }
  | { type: 'tag-added'; passageId: string; tag: TagInfo; timestamp: number }
  | { type: 'character-added'; character: Character; timestamp: number };

type DocumentState = {
  readonly events: DocumentEvent[];
  readonly currentRevision: number;
  readonly document: TEIDocument | null;
};

// State is EXPLICIT - succession of values
const state: DocumentState = {
  events: [
    { type: 'loaded', xml: '...', timestamp: 1000 },
    { type: 'tag-added', passageId: 'p1', tag: {...}, timestamp: 2000 }
  ],
  currentRevision: 1,
  document: applyEvents(events)
};

// Time travel is trivial - just filter events
const stateAtRevision50 = { ...state, events: state.events.slice(0, 51) };
```

---

**Example 2: Tests Can't Observe State Changes**

```typescript
// ❌ Current test: Can't see intermediate states
test('should add tag and validate', async ({ page }) => {
  await page.click(passage);  // 1. Click
  await page.click('said');   // 2. Tag
  // ❌ Can't verify intermediate state after click
  // ❌ Can't test validation independently of tagging
});
```

**Hickey Feedback:** "Tests can't observe the succession of states because mutation hides history. You can't say 'state after click but before tag'—that state never existed as a value."

**Effect Pattern (Observable State):**
```typescript
// ✅ Tests can observe each state transition
const tagAddedState = await stateStream.pipe(
  filter(state => state.lastEvent.type === 'tag-added'),
  take(1)
).runPromise();

expect(tagAddedState.document.tags).toContain(expectedTag);

// ✅ Can validate at any point in time
const validationState = await stateStream.pipe(
  filter(state => state.phase === 'validating')
).runPromise();
```

---

## Dimension 5: Protocols and Data Formats (Language of the System)

### Current State: ❌ PROTOCOLS IMPLICIT

**Example 1: File Upload - No Defined Contract**

```tsx
// ❌ tests/e2e/fixtures/test-helpers.ts
export async function uploadTestDocument(page: Page, doc: { name: string; content: string }) {
  const fileInput = page.locator('input[type="file"]');

  // ❌ Protocol is implicit: "call setInputFiles, then wait for passages"
  // No explicit contract for what "upload" means
  await fileInput.setInputFiles([{
    name: doc.name,
    mimeType: 'application/xml',
    buffer: Buffer.from(doc.content, 'utf-8')
  }]);

  // ❌ After this, state changes invisibly - no way to observe
}
```

**Hickey Feedback:** "The upload protocol is implicit. You call `setInputFiles`, then wait for passages to appear. But there's no explicit 'DocumentUploaded' event or state. Tests must guess when upload is complete by polling DOM—brittle."

**Effect Pattern (Protocol First):**
```typescript
// ✅ Protocol: Explicit upload contract
interface DocumentUpload {
  upload(doc: TestDocument): Effect<UploadResult, UploadError, BrowserEnv>;
}

// ✅ Implementation: Protocol is explicit
const uploadDocument = (doc: TestDocument) =>
  Effect.gen(function* (_) {
    // 1. Trigger upload
    yield Effect.tryPromise(() =>
      page.locator('input[type="file"]').setInputFiles([{
        name: doc.name,
        mimeType: 'application/xml',
        buffer: Buffer.from(doc.content, 'utf-8')
      }])
    );

    // 2. Wait for upload event (explicit state transition)
    yield Effect.retry(
      page.waitForSelector('[id^="passage-"]', { timeout: 10000 }),
      { times: 3 }
    );

    // 3. Return success value (observable result)
    return { uploaded: true, passageCount: yield getPassageCount() };
  });

// ✅ Test uses protocol directly
const uploadResult = await uploadDocument(testDoc).runPromise();
expect(uploadResult.passageCount).toBeGreaterThan(0);
```

---

## Dimension 6: Constraints as Instruments

### Current State: ❌ NO CONSTRAINTS, MAXIMUM OPTIONS

**Example: TEI Operations - Accepts Anything**

```typescript
// ❌ lib/tei/operations.ts
export function addCharacter(doc: TEIDocument, character: Character): TEIDocument {
  // ❌ NO CONSTRAINT: accepts any object with 'id' field
  doc.parsed.TEI.teiHeader.castList.push({
    xmlId: character.xmlId,
    ...character  // Spreads everything - no validation
  });
  return doc;
}
```

**Hickey Analysis:**
- **Too flexible:** Function accepts anything with `.id`—bugs waiting to happen
- **No learning:** Can't understand what this function requires without reading implementation
- **No composability:** Can't compose with validation without knowing the implicit contract

**Effect Pattern (Constrained Types):**
```typescript
// ✅ Explicit types as constraints
interface Character {
  readonly xmlId: string;  // Branded type - must follow format
  readonly name: string;
  readonly description?: string;
}

// ✅ Add character is constrained
const addCharacter = (doc: TEIDocument, character: Character) =>
  Effect.gen(function* (_) {
  // Validate constraint
  yield Effect.tryPromise(() =>
    validateXmlId(character.xmlId)
  );

  // Only then proceed
  return {
    ...doc,
    parsed: {
      ...doc.parsed,
      TEI: {
        ...doc.parsed.TEI,
        teiHeader: {
          ...doc.parsed.TEI.teiHeader,
          castList: [...doc.parsed.TEI.teiHeader.teiCastList, character]
        }
      }
    }
  };
});
```

---

## Summary: Hickey Principle Violations

| Principle | Current State | Violation Severity | Fix Priority |
|----------|--------------|-------------------|--------------|
| **Simplicity** | 22 useState hooks in one component | HIGH | Critical |
| **Values over Places** | State mutation everywhere | HIGH | Critical |
| **Composability** | AI providers can't be layered | HIGH | High |
| **Time Modeling** | History implicit, mutation erases past | MEDIUM | High |
| **Protocols First** | Upload/validation contracts implicit | HIGH | High |
| **Constraints** | TEI operations accept anything | MEDIUM | Medium |

---

## Red Flags STOP and Evaluate Design

1. **"This is standard React"** → YES this is familiar, but is it simple? 22 useState hooks says NO
2. **"Performance requires coupling"** → NO evidence of profiling; this is premature optimization
3. **"Tests are just flaky"** → NO, tests are brittle because architecture hides state
4. **"Effect is overkill"** → NO, Effect provides EXPLICIT TIME MODELING which is essential
5. **"Refactor is too risky"** → Current entanglement IS the risk—accumulating technical debt

---

## Recommended Architecture: Effect-Based Design

### Core Principles:

1. **Protocol First** - Define interfaces for all operations
2. **Value Orientation** - Immutable values, not mutable places
3. **Explicit Time** - State succession as events/values
4. **Composability** - All operations composable via Effect
5. **Constraint Types** - Branded types, schema validation

### Migration Strategy:

**Phase 1: Core Protocols** (Critical Path)
- Define `Document` as event-sourced value
- Create `AIProvider` protocol (already exists, good!)
- Create `DocumentStorage` protocol (localStorage replacement)
- Create `ValidationService` protocol

**Phase 2: Component Simplification**
- Break EditorLayout into focused components
- Each component takes Effect programs, not callbacks
- Components become pure functions of state

**Phase 3: Test Architecture**
- Tests provide Effect implementations (mocks)
- Test scenarios as Effect compositions
- Can replay history for debugging

**Phase 4: Application Layer**
- Route requests to Effect programs
- Side effects (file I/O, network) at boundaries
- Core logic pure and testable

---

## Next Steps

1. **Use subagent-driven-development** to design Effect-based architecture
2. **Create detailed implementation plan** using writing-plans skill
3. **Use git-worktrees** for isolated development
4. **Implement incrementally** with test-driven-development

---

**Conclusion:** The current architecture passes the "easy" test (familiar React patterns) but fails the "simple" test (unentangled design). Effect provides the toolkit to fix this. The question isn't "can we refactor?" but "WILL we design for simplicity or continue accumulating technical debt?"

**Recommendation:** YES - Rearchitect with Effect. The pain will be temporary; the benefits will compound.
