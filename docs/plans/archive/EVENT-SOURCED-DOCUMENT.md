# Event-Sourced Document Model Design

**Author:** Claude (Hickey-Inspired Architecture)
**Date:** 2025-02-04
**Status:** Design Document
**Context:** Migrating TEI Dialogue Editor to Effect-based architecture

---

## Executive Summary

This document outlines the design for an **event-sourced document model** using Effect, enabling explicit time modeling, state succession as values, and composable operations. The design addresses the core architectural problems identified in the Hickey review:

- **Place-oriented mutation** → Value-oriented state succession
- **Hidden state transitions** → Explicit event log
- **No time travel** → Full history replay capability
- **Untestable state changes** → Observable state transitions

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Concepts](#core-concepts)
3. [Type System](#type-system)
4. [Event Design](#event-design)
5. [State Transitions](#state-transitions)
6. [History Management](#history-management)
7. [Effect Integration](#effect-integration)
8. [Implementation Plan](#implementation-plan)

---

## Architecture Overview

### Current State Problems

**From Hickey Review (Dimension 4):**

```typescript
// ❌ Current: Mutation erases history
export function addSaidTag(
  doc: TEIDocument,
  passageId: PassageID,
  range: TextRange,
  speaker: CharacterID
): TEIDocument {
  const passage = doc.parsed.TEI.text.body.p[passageId];
  passage.said = { speaker: `#${speaker}`, ...range };
  return doc; // Returns "same" object but mutated internally
}
```

**Problems:**

1. **No explicit time** - Can't see what changed between revision 10 and 11
2. **Mutation hidden** - Returns `doc` like nothing changed
3. **No time travel** - Can't inspect document at revision 50
4. **Tests can't observe** - Can't verify intermediate states

### Proposed Solution: Event Sourcing with Effect

```typescript
// ✅ Event-sourced: Succession of values
import { Effect, Schema } from 'effect';

// Each operation returns NEW value with event appended
const addSaidTag = (doc: TEIDocument, params: AddSaidTagParams) =>
  Effect.gen(function* (_) {
    // 1. Validate preconditions
    yield* validatePassageExists(doc, params.passageId);
    yield* validateCharacterExists(doc, params.speaker);

    // 2. Create event
    const event = {
      type: 'saidTagAdded' as const,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      revision: doc.state.revision + 1,
      ...params,
    };

    // 3. Apply event to create new state
    const newState = yield* applyEvent(doc.state, event);

    // 4. Return new document value
    return {
      state: newState,
      events: [...doc.events, event],
    };
  });
```

**Benefits:**

- **Explicit time** - Each event has timestamp and revision
- **No mutation** - Returns new immutable value
- **Time travel** - Replay events to any revision
- **Observable** - Tests can inspect each transition

---

## Core Concepts

### 1. Document as Value

A TEI document is an **immutable value** consisting of:

```typescript
interface TEIDocument {
  readonly state: DocumentState; // Current materialized state (O(1) access)
  readonly events: readonly DocumentEvent[]; // Complete append-only history
}
```

**Key Properties:**

- **Immutable** - All fields are `readonly`
- **Value-oriented** - No place semantics; safe to share
- **Event-sourced** - State derived from event log
- **Composable** - Can be passed around freely

### 2. State as Succession of Values

Each state transition creates a **new value**:

```typescript
// Initial state
const doc0 = loadDocument(xml);

// After first operation → new value
const doc1 = await addSaidTag(doc0, params).runPromise();

// After second operation → another new value
const doc2 = await addCharacter(doc1, character).runPromise();

// All three values coexist (time travel is trivial)
console.log(doc0.state.revision); // 0
console.log(doc1.state.revision); // 1
console.log(doc2.state.revision); // 2
```

### 3. Event Log as Source of Truth

The event log is **append-only** and **immutable**:

```typescript
type EventLog = readonly DocumentEvent[];

// Events are never modified, only appended
const newLog = [...oldLog, newEvent];

// Can reconstruct state at any point in time
const stateAtRevision50 = rebuildState(events.slice(0, 51));
```

---

## Type System

### Document State

```typescript
/**
 * Document state (materialized current state)
 *
 * This is the current materialized view of the document.
 * All fields are readonly to prevent mutation.
 * Created by applying events in order.
 */
interface DocumentState {
  readonly xml: string; // Original XML
  readonly parsed: TEINode; // Parsed XML tree
  readonly revision: number; // Current revision number
  readonly metadata: DocumentMetadata; // Title, author, etc.

  // Materialized views (O(1) access via structural sharing)
  readonly passages: readonly Passage[];
  readonly dialogue: readonly Dialogue[];
  readonly characters: readonly Character[];
  readonly relationships: readonly Relationship[];
}
```

### TEI Document

```typescript
/**
 * TEI Document (immutable value)
 *
 * A TEI document consists of:
 * - state: Current materialized state (O(1) access)
 * - events: Complete history of changes (enables undo/redo)
 *
 * All operations return a new TEIDocument value instead of
 * mutating the existing one.
 */
interface TEIDocument {
  readonly state: DocumentState;
  readonly events: readonly DocumentEvent[];
}
```

### Null Document

```typescript
/**
 * Null document sentinel
 *
 * Used to represent the absence of a document.
 * Distinct from null/undefined for type safety.
 */
type NullDocument = {
  readonly state: null;
  readonly events: readonly [];
};

type MaybeTEIDocument = TEIDocument | NullDocument;
```

---

## Event Design

### Event Type Union

```typescript
/**
 * Document event (append-only log)
 *
 * Events represent state transitions. Each event has a timestamp
 * and revision number. Events are append-only - never modified.
 */
type DocumentEvent =
  // Document lifecycle
  | { type: 'loaded'; xml: string; timestamp: number; revision: number }

  // Tag operations
  | {
      type: 'saidTagAdded';
      id: TagID;
      passageId: PassageID;
      range: TextRange;
      speaker: CharacterID;
      timestamp: number;
      revision: number;
    }
  | {
      type: 'qTagAdded';
      id: TagID;
      passageId: PassageID;
      range: TextRange;
      timestamp: number;
      revision: number;
    }
  | {
      type: 'persNameTagAdded';
      id: TagID;
      passageId: PassageID;
      range: TextRange;
      ref: string;
      timestamp: number;
      revision: number;
    }
  | { type: 'tagRemoved'; id: TagID; timestamp: number; revision: number }

  // Character operations
  | {
      type: 'characterAdded';
      id: CharacterID;
      character: Character;
      timestamp: number;
      revision: number;
    }
  | {
      type: 'characterUpdated';
      id: CharacterID;
      updates: Partial<Omit<Character, 'id' | 'xmlId'>>;
      timestamp: number;
      revision: number;
    }
  | { type: 'characterRemoved'; id: CharacterID; timestamp: number; revision: number }

  // Relationship operations
  | {
      type: 'relationAdded';
      id: string;
      relation: Relationship;
      timestamp: number;
      revision: number;
    }
  | { type: 'relationRemoved'; id: string; timestamp: number; revision: number }

  // Validation events
  | { type: 'validated'; timestamp: number; revision: number; errors: readonly ValidationError[] }

  // Batch operations
  | { type: 'batch'; operations: readonly DocumentEvent[]; timestamp: number; revision: number };
```

### Event Properties

All events share:

```typescript
interface BaseEvent {
  readonly type: string; // Event discriminator
  readonly timestamp: number; // Unix timestamp (ms)
  readonly revision: number; // Monotonically increasing
}
```

**Key Design Principles:**

1. **Append-only** - Events are never modified after creation
2. **Ordered** - Revision numbers enforce total order
3. **Serializable** - All events can be serialized to JSON
4. **Typed** - Each event type has specific fields

---

## State Transitions

### Pure Functions with Effect

All state transitions are **pure functions** returning `Effect<TEIDocument, Error>`:

```typescript
/**
 * Add a <said> tag to a passage
 *
 * Returns Effect that produces new document with updated state and event log
 */
const addSaidTag = (
  doc: TEIDocument,
  passageId: PassageID,
  range: TextRange,
  speaker: CharacterID
): Effect.Effect<TEIDocument, Error> =>
  Effect.gen(function* (_) {
    // 1. Validate preconditions
    const passage = yield* Effect.optionFromOptional(
      Option.fromNullable(doc.state.passages.find((p) => p.id === passageId)),
      () => new Error(`Passage not found: ${passageId}`)
    );

    const character = yield* Effect.optionFromOptional(
      Option.fromNullable(doc.state.characters.find((c) => c.id === speaker)),
      () => new Error(`Character not found: ${speaker}`)
    );

    // 2. Create new tag
    const tagId = `tag-${crypto.randomUUID()}` as TagID;
    const newTag: Tag = {
      id: tagId,
      type: 'said',
      range,
      attributes: { who: `#${speaker}` },
    };

    // 3. Create new passage (immutable update)
    const newPassage: Passage = {
      ...passage,
      tags: [...passage.tags, newTag],
    };

    // 4. Create updated passages array
    const updatedPassages = doc.state.passages.map((p) => (p.id === passageId ? newPassage : p));

    // 5. Create new dialogue entry
    const newDialogue: Dialogue = {
      id: tagId,
      passageId,
      range,
      speaker,
      content: passage.content.substring(range.start, range.end),
    };

    // 6. Create new state
    const newState: DocumentState = {
      ...doc.state,
      passages: updatedPassages,
      dialogue: [...doc.state.dialogue, newDialogue],
      revision: doc.state.revision + 1,
    };

    // 7. Create event
    const event: DocumentEvent = {
      type: 'saidTagAdded',
      id: tagId,
      passageId,
      range,
      speaker,
      timestamp: Date.now(),
      revision: newState.revision,
    };

    // 8. Return new document value
    return {
      state: newState,
      events: [...doc.events, event],
    };
  });
```

### Composability

Operations compose seamlessly:

```typescript
// Sequential composition
const result = Effect.gen(function* (_) {
  const doc1 = yield* addSaidTag(doc0, params1);
  const doc2 = yield* addCharacter(doc1, character1);
  const doc3 = yield* addRelation(doc2, relation1);
  return doc3;
});

// Parallel composition (independent operations)
const batchResult = Effect.all([
  addCharacter(doc, char1),
  addCharacter(doc, char2),
  addCharacter(doc, char3),
]);
```

---

## History Management

### Time Travel

Time travel is trivial with event sourcing:

```typescript
/**
 * Get document state at specific revision
 */
const getStateAtRevision = (doc: TEIDocument, targetRevision: number): DocumentState => {
  // Filter events to target revision
  const eventsToReplay = doc.events.filter((e) => e.revision <= targetRevision);

  // Rebuild state from events
  return rebuildState(eventsToReplay);
};

/**
 * Time travel to revision
 * Returns new document value at that point in time
 */
const timeTravel = (doc: TEIDocument, targetRevision: number): TEIDocument => {
  return {
    state: getStateAtRevision(doc, targetRevision),
    events: doc.events.slice(0, targetRevision + 1),
  };
};

// Usage
const docAtRevision50 = timeTravel(currentDoc, 50);
console.log(docAtRevision50.state.revision); // 50
```

### Undo/Redo

```typescript
/**
 * Undo to previous revision
 */
const undo = (doc: TEIDocument): TEIDocument => {
  if (doc.state.revision === 0) {
    return doc; // Already at initial state
  }

  return timeTravel(doc, doc.state.revision - 1);
};

/**
 * Redo to next revision
 */
const redo = (doc: TEIDocument): TEIDocument => {
  if (doc.state.revision >= doc.events.length - 1) {
    return doc; // Already at latest state
  }

  return timeTravel(doc, doc.state.revision + 1);
};

/**
 * Undo multiple steps
 */
const undoSteps = (doc: TEIDocument, steps: number): TEIDocument => {
  const targetRevision = Math.max(0, doc.state.revision - steps);
  return timeTravel(doc, targetRevision);
};
```

### State Reconstruction

```typescript
/**
 * Rebuild document state from events
 * Applies events in order to reconstruct current state
 */
const rebuildState = (events: readonly DocumentEvent[]): DocumentState => {
  let state: DocumentState | null = null;

  for (const event of events) {
    switch (event.type) {
      case 'loaded':
        state = loadDocumentInternal(event.xml);
        break;

      case 'saidTagAdded':
        state = applySaidTagAdded(state!, event);
        break;

      case 'tagRemoved':
        state = applyTagRemoved(state!, event);
        break;

      case 'characterAdded':
        state = applyCharacterAdded(state!, event);
        break;

      case 'characterRemoved':
        state = applyCharacterRemoved(state!, event);
        break;

      case 'relationAdded':
        state = applyRelationAdded(state!, event);
        break;

      case 'relationRemoved':
        state = applyRelationRemoved(state!, event);
        break;

      default:
        const exhaustive: never = event;
        break;
    }
  }

  return state!;
};
```

---

## Effect Integration

### Protocol-Based Design

Define protocols for composable operations:

```typescript
/**
 * Document operations protocol
 */
interface DocumentOperations {
  readonly loadDocument: (xml: string) => Effect<TEIDocument, ParseError>;
  readonly addTag: (doc: TEIDocument, params: AddTagParams) => Effect<TEIDocument, ValidationError>;
  readonly removeTag: (doc: TEIDocument, tagId: TagID) => Effect<TEIDocument, NotFoundError>;
  readonly addCharacter: (
    doc: TEIDocument,
    character: Character
  ) => Effect<TEIDocument, DuplicateError>;
  readonly undo: (doc: TEIDocument) => TEIDocument;
  readonly redo: (doc: TEIDocument) => TEIDocument;
  readonly timeTravel: (doc: TEIDocument, revision: number) => TEIDocument;
}
```

### Validation Layer

```typescript
/**
 * Validate passage exists
 */
const validatePassageExists = (
  doc: TEIDocument,
  passageId: PassageID
): Effect.Effect<Passage, Error> =>
  Effect.gen(function* (_) {
    const passage = yield* Effect.optionFromOptional(
      Option.fromNullable(doc.state.passages.find((p) => p.id === passageId)),
      () => new Error(`Passage not found: ${passageId}`)
    );

    return passage;
  });

/**
 * Validate character exists
 */
const validateCharacterExists = (
  doc: TEIDocument,
  characterId: CharacterID
): Effect.Effect<Character, Error> =>
  Effect.gen(function* (_) {
    const character = yield* Effect.optionFromOptional(
      Option.fromNullable(doc.state.characters.find((c) => c.id === characterId)),
      () => new Error(`Character not found: ${characterId}`)
    );

    return character;
  });
```

### Persistence Layer

```typescript
/**
 * Document storage protocol
 */
interface DocumentStorage {
  readonly save: (doc: TEIDocument) => Effect<void, StorageError>;
  readonly load: (id: string) => Effect<TEIDocument, NotFoundError>;
  readonly list: () => Effect<readonly DocumentInfo[], StorageError>;
}

/**
 * Browser storage implementation (IndexedDB)
 */
class BrowserDocumentStorage implements DocumentStorage {
  save = (doc: TEIDocument) =>
    Effect.tryPromise({
      try: () => this.db.put('documents', this.serialize(doc)),
      catch: (error) => new StorageError('Failed to save', error),
    });

  load = (id: string) =>
    Effect.tryPromise({
      try: () => this.db.get('documents', id),
      catch: (error) => new StorageError('Failed to load', error),
    });

  // ...
}

/**
 * Test storage implementation (in-memory)
 */
class TestDocumentStorage implements DocumentStorage {
  private documents = new Map<string, TEIDocument>();

  save = (doc: TEIDocument) =>
    Effect.sync(() => {
      const id = doc.state.metadata.title;
      this.documents.set(id, doc);
    });

  load = (id: string) =>
    Effect.fromNullable(
      this.documents.get(id),
      () => new NotFoundError(`Document not found: ${id}`)
    );

  list = () =>
    Effect.sync(() =>
      Array.from(this.documents.values()).map((d) => ({
        id: d.state.metadata.title,
        title: d.state.metadata.title,
        author: d.state.metadata.author,
      }))
    );
}
```

---

## Implementation Plan

### Phase 1: Core Types (Week 1)

**Tasks:**

1. ✅ Define `TEIDocument`, `DocumentState`, `DocumentEvent` types
2. ✅ Define entity types (`Character`, `Relationship`, `Passage`, `Tag`)
3. ✅ Create event type union with all event variants
4. ⬜ Add Effect Schema definitions for validation

**Files:**

- `lib/tei/types.ts` (already done)
- `lib/tei/schema.ts` (new - Effect Schema definitions)

### Phase 2: State Transition Functions (Week 2)

**Tasks:**

1. ✅ Implement `loadDocument` with event sourcing
2. ✅ Implement `addSaidTag`, `addQTag`, `addPersNameTag`
3. ✅ Implement `removeTag`
4. ✅ Implement `addCharacter`, `updateCharacter`, `removeCharacter`
5. ✅ Implement `addRelation`, `removeRelation`
6. ⬜ Add Effect wrappers for error handling
7. ⬜ Add validation layer

**Files:**

- `lib/tei/operations.ts` (already done - pure functions)
- `lib/tei/effect-operations.ts` (new - Effect wrappers)
- `lib/tei/validation.ts` (new - validation layer)

### Phase 3: History Management (Week 3)

**Tasks:**

1. ✅ Implement `undo`, `redo`, `timeTravel`
2. ✅ Implement `rebuildState` from events
3. ⬜ Add event replay optimization (snapshots)
4. ⬜ Add event serialization/deserialization
5. ⬜ Add event persistence layer

**Files:**

- `lib/tei/history.ts` (new - undo/redo/timeTravel)
- `lib/tei/persistence.ts` (new - storage layer)
- `lib/tei/serialization.ts` (new - event serialization)

### Phase 4: Effect Integration (Week 4)

**Tasks:**

1. ⬜ Install Effect packages: `@effect/schema`, `@effect/platform`
2. ⬜ Define protocols (interfaces) for operations
3. ⬜ Implement browser storage with IndexedDB
4. ⬜ Implement test storage for unit tests
5. ⬜ Add validation with Effect Schema

**Files:**

- `lib/tei/protocols.ts` (new - interface definitions)
- `lib/tei/storage/browser.ts` (new - IndexedDB storage)
- `lib/tei/storage/test.ts` (new - in-memory storage)
- `lib/tei/validation/effect-schema.ts` (new - schema validation)

### Phase 5: Testing (Week 5)

**Tasks:**

1. ⬜ Unit tests for state transitions
2. ⬜ Unit tests for undo/redo
3. ⬜ Unit tests for time travel
4. ⬜ Integration tests for persistence
5. ⬜ Property-based tests with Effect `fc` (fast-check)

**Files:**

- `lib/tei/__tests__/operations.test.ts` (update)
- `lib/tei/__tests__/history.test.ts` (new)
- `lib/tei/__tests__/persistence.test.ts` (new)

### Phase 6: Component Integration (Week 6)

**Tasks:**

1. ⬜ Create `DocumentProvider` using Effect
2. ⬜ Refactor `EditorLayout` to use Effect operations
3. ⬜ Add undo/redo UI
4. ⬜ Add history inspector (event log viewer)
5. ⬜ Add time travel debugger

**Files:**

- `components/DocumentProvider.tsx` (new - Effect-based context)
- `components/EditorLayout.tsx` (refactor - use Effect operations)
- `components/HistoryInspector.tsx` (new - event log viewer)
- `components/TimeTravelDebugger.tsx` (new - revision slider)

---

## Key Benefits

### 1. Time Travel

```typescript
// Jump to any revision
const docAtRevision = timeTravel(currentDoc, 50);

// Compare revisions
const diff = compareRevisions(currentDoc, 50, 60);

// See what changed
const eventsBetween = getEventsBetween(currentDoc, 50, 60);
```

### 2. Debugging

```typescript
// Inspect full event log
console.log(
  doc.events.map((e) => ({
    type: e.type,
    timestamp: new Date(e.timestamp).toISOString(),
    revision: e.revision,
  }))
);

// Replay from specific point
const replayFrom = replayEvents(doc.events.slice(50));
```

### 3. Testability

```typescript
// Test can observe each transition
test('should add tag and validate', async () => {
  const doc0 = loadDocument(xml);

  // Apply operation
  const doc1 = await addSaidTag(doc0, params).runPromise();

  // Verify state transition
  expect(doc1.state.revision).toBe(1);
  expect(doc1.state.passages[0].tags).toHaveLength(1);

  // Can still access original state
  expect(doc0.state.revision).toBe(0);
  expect(doc0.state.passages[0].tags).toHaveLength(0);
});
```

### 4. Composition

```typescript
// Compose operations
const pipeline = Effect.gen(function* (_) {
  const doc1 = yield* addSaidTag(doc0, params1);
  const doc2 = yield* addCharacter(doc1, character);
  const doc3 = yield* validateDocument(doc2);
  return doc3;
});

// Add cross-cutting concerns
const pipelineWithLogging = pipe(
  pipeline,
  Effect.tap((doc) => Effect.sync(() => console.log('Revision:', doc.state.revision))),
  Effect.catchAll((error) => Effect.sync(() => console.error('Error:', error)))
);
```

### 5. Persistence

```typescript
// Save document with full history
await storage.save(doc).runPromise();

// Load document
const loaded = await storage.load(id).runPromise();

// Resume editing from any point
const resumed = timeTravel(loaded, targetRevision);
```

---

## Migration Strategy

### Step 1: Add Effect to Project

```bash
npm install effect @effect/schema @effect/platform
```

### Step 2: Create Effect Wrappers

Keep existing pure functions, add Effect wrappers:

```typescript
// lib/tei/operations.ts (keep as-is)
export function addSaidTag(doc: TEIDocument, ...): TEIDocument {
  // Pure function implementation
}

// lib/tei/effect-operations.ts (new)
export const addSaidTagE = (doc: TEIDocument, ...) =>
  Effect.try(() => addSaidTag(doc, ...));
```

### Step 3: Gradual Migration

1. **Phase 1**: New features use Effect operations
2. **Phase 2**: Refactor critical paths to Effect (document loading, tagging)
3. **Phase 3**: Refactor UI components to use Effect
4. **Phase 4**: Remove old mutation-based code

### Step 4: Testing Strategy

1. **Unit tests**: Test pure functions first
2. **Integration tests**: Test Effect compositions
3. **E2E tests**: Update to use new operations

---

## Open Questions

1. **Event Snapshots**: For large documents (1000+ revisions), should we add snapshots every N revisions to speed up rebuilding?

2. **Event Compression**: Should we compress old events (e.g., merge multiple character edits into one)?

3. **Collaborative Editing**: How do we handle concurrent edits? (Operational Transformation vs CRDTs)

4. **Memory Management**: Should we lazy-load historical states to reduce memory footprint?

5. **Effect Version**: Which Effect version to target? (Current: none, Proposed: 3.x latest)

---

## References

- **Hickey Review**: `/docs/HICKEY-ARCHITECTURAL-REVIEW.md`
- **Current Types**: `/lib/tei/types.ts`
- **Current Operations**: `/lib/tei/operations.ts`
- **Effect Documentation**: https://effect.website/
- **Event Sourcing**: https://martinfowler.com/eaaDev/EventSourcing.html

---

## Conclusion

The event-sourced document model provides:

- **Explicit time modeling** via event log
- **Immutable state succession** as values
- **Composable operations** via Effect
- **Time travel debugging** via event replay
- **Testable transitions** via pure functions

This addresses the core architectural problems identified in the Hickey review and provides a solid foundation for future features (collaborative editing, offline support, conflict resolution).

**Next Steps:**

1. Review and approve design
2. Create implementation plan with subagent-driven-development
3. Set up git-worktree for isolated development
4. Implement incrementally with TDD

---

**Status:** Ready for Implementation
**Priority:** High (addresses critical architectural issues)
**Effort:** 6 weeks (1 developer)
