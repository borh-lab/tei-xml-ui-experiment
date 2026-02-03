# Foundation Plan: Immutable Architecture & Event System

> **Goal:** Establish core immutable data structures, event system, and undo/redo infrastructure that all features will build upon.

**Architecture:** Materialized current state + append-only event log. Document state is an immutable value; updates create new values. Time is explicit through event history.

**Tech Stack:** TypeScript, React 19, Immer (for convenient immutable updates), existing TEI parser

---

## Executive Summary

This plan refactors the existing mutable `TEIDocument` class into an **immutable value-oriented architecture** with explicit time modeling through events.

### Key Changes from Current Code

**Before (mutable):**
```typescript
class TEIDocument {
  public rawXML: string;           // ❌ Mutable
  public parsed: TEINode;          // ❌ Mutable
  public metadata: any = {};        // ❌ Mutable
  public changes: any[] = [];       // ❌ Mutable

  addSaidTag(...) {
    // ❌ Mutates this.parsed in-place
    this.parsed.TEI.text.body.p[passageIndex] = { /* ... */ };
  }
}
```

**After (immutable):**
```typescript
type TEIDocument = {
  readonly state: DocumentState;           // ✅ Immutable value
  readonly events: readonly DocumentEvent[]; // ✅ Append-only log
};

type DocumentState = {
  readonly xml: string;
  readonly parsed: TEINode;
  readonly revision: number;
  readonly characters: readonly Character[];
  readonly dialogue: readonly Dialogue[];
};

// ✅ Updates return NEW document value
function addSaidTag(doc: TEIDocument, ...): TEIDocument {
  return {
    state: { ...doc.state, /* updated state */ },
    events: [...doc.events, newEvent]
  };
}
```

---

## Core Data Structures

### 1. TEIDocument as Immutable Value

**Files:**
- Create: `lib/tei/types.ts` (new types file)
- Create: `lib/tei/TEIDocument.ts` (refactored)

**Type Definition:**
```typescript
// lib/tei/types.ts

// Stable IDs for content-addressable references
export type PassageID = string;  // Format: "passage-{hash}"
export type TagID = string;      // Format: "tag-{hash}"
export type CharacterID = string; // Format: "char-{xml-id}"

// Document state as immutable value
export interface DocumentState {
  readonly xml: string;
  readonly parsed: TEINode;
  readonly revision: number;
  readonly metadata: {
    readonly title: string;
    readonly author: string;
    readonly created: Date;
  };

  // Materialized views (cheap to copy)
  readonly passages: readonly Passage[];
  readonly dialogue: readonly Dialogue[];
  readonly characters: readonly Character[];
  readonly relationships: readonly Relationship[];
}

// Document with history (time is explicit)
export interface TEIDocument {
  readonly state: DocumentState;
  readonly events: readonly DocumentEvent[];
}

// Event types (append-only log)
export type DocumentEvent =
  | { type: 'loaded'; xml: string; timestamp: number; revision: number }
  | { type: 'saidTagAdded'; id: TagID; passageId: PassageID; range: TextRange; speaker: CharacterID; timestamp: number; revision: number }
  | { type: 'tagRemoved'; id: TagID; timestamp: number; revision: number }
  | { type: 'characterAdded'; id: CharacterID; character: Character; timestamp: number; revision: number }
  | { type: 'characterRemoved'; id: CharacterID; timestamp: number; revision: number }
  | { type: 'relationAdded'; id: string; relation: Relationship; timestamp: number; revision: number }
  | { type: 'relationRemoved'; id: string; timestamp: number; revision: number };

// Supporting types
export interface TextRange {
  readonly start: number;
  readonly end: number;
}

export interface Dialogue {
  readonly id: TagID;
  readonly passageId: PassageID;
  readonly range: TextRange;
  readonly speaker: CharacterID | null;
  readonly content: string;
}

export interface Character {
  readonly id: CharacterID;
  readonly xmlId: string;
  readonly name: string;
  readonly sex?: 'M' | 'F' | 'Other';
  readonly age?: number;
}

export interface Relationship {
  readonly id: string;
  readonly from: CharacterID;
  readonly to: CharacterID;
  readonly type: string;
  readonly subtype?: string;
}

export interface Passage {
  readonly id: PassageID;
  readonly index: number;  // Display order, not identifier
  readonly content: string;
  readonly tags: readonly Tag[];
}

export interface Tag {
  readonly id: TagID;
  readonly type: 'said' | 'q' | 'persName' | 'placeName' | 'orgName';
  readonly range: TextRange;
  readonly attributes: Readonly<Record<string, string>>;
}
```

### 2. Document Operations (Pure Functions)

**Files:**
- Create: `lib/tei/operations.ts`

**Core Operations:**
```typescript
// lib/tei/operations.ts

import { TEIDocument, DocumentState, DocumentEvent } from './types';

// ✅ Pure function: loads document, creates initial value
export function loadDocument(xml: string): TEIDocument {
  const parser = new XMLParser({ /* ... */ });
  const parsed = parser.parse(xml);

  const state: DocumentState = {
    xml,
    parsed,
    revision: 0,
    metadata: extractMetadata(parsed),
    passages: extractPassages(parsed),
    dialogue: [],
    characters: extractCharacters(parsed),
    relationships: []
  };

  const event: DocumentEvent = {
    type: 'loaded',
    xml,
    timestamp: Date.now(),
    revision: 0
  };

  return { state, events: [event] };
}

// ✅ Pure function: adds said tag, returns new document
export function addSaidTag(
  doc: TEIDocument,
  passageId: PassageID,
  range: TextRange,
  speaker: CharacterID
): TEIDocument {
  const passage = doc.state.passages.find(p => p.id === passageId);
  if (!passage) throw new Error(`Passage not found: ${passageId}`);

  const tagId = `tag-${crypto.randomUUID()}` as TagID;
  const newTag: Tag = {
    id: tagId,
    type: 'said',
    range,
    attributes: { speaker: `#${speaker}` }
  };

  const newPassage: Passage = {
    ...passage,
    tags: [...passage.tags, newTag]
  };

  const updatedPassages = doc.state.passages.map(p =>
    p.id === passageId ? newPassage : p
  );

  const newDialogue: Dialogue = {
    id: tagId,
    passageId,
    range,
    speaker,
    content: extractContent(passage, newTag)
  };

  const state: DocumentState = {
    ...doc.state,
    passages: updatedPassages,
    dialogue: [...doc.state.dialogue, newDialogue],
    revision: doc.state.revision + 1
  };

  const event: DocumentEvent = {
    type: 'saidTagAdded',
    id: tagId,
    passageId,
    range,
    speaker,
    timestamp: Date.now(),
    revision: state.revision
  };

  return { state, events: [...doc.events, event] };
}

// ✅ Pure function: removes tag
export function removeTag(doc: TEIDocument, tagId: TagID): TEIDocument {
  const state = doc.state;

  const updatedPassages = state.passages.map(passage => ({
    ...passage,
    tags: passage.tags.filter(t => t.id !== tagId)
  }));

  const updatedDialogue = state.dialogue.filter(d => d.id !== tagId);

  return {
    state: {
      ...state,
      passages: updatedPassages,
      dialogue: updatedDialogue,
      revision: state.revision + 1
    },
    events: [...doc.events, {
      type: 'tagRemoved',
      id: tagId,
      timestamp: Date.now(),
      revision: state.revision + 1
    }]
  };
}

// ✅ Pure function: undo to specific revision
export function undoTo(doc: TEIDocument, targetRevision: number): TEIDocument {
  const events = doc.events.filter(e => e.revision <= targetRevision);
  const state = rebuildState(events);
  return { state, events };
}

// ✅ Pure function: redo (replay events)
export function redoFrom(doc: TEIDocument, fromRevision: number): TEIDocument {
  const events = doc.events.filter(e => e.revision > fromRevision);
  const state = rebuildState(events);
  return { state, events };
}

// Helper: rebuild state from events
function rebuildState(events: readonly DocumentEvent[]): DocumentState {
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
      // ... other event types
    }
  }

  return state!;
}
```

---

## React Integration: Document Context with Reducer

### 3. Document Context with useReducer

**Files:**
- Modify: `lib/context/DocumentContext.tsx`

**Implementation:**
```typescript
// lib/context/DocumentContext.tsx
'use client';

import React, { useReducer, useCallback } from 'react';
import { TEIDocument, DocumentEvent, loadDocument, addSaidTag, removeTag, undoTo, redoFrom } from '@/lib/tei/operations';
import { produce } from 'immer'; // For convenient immutable updates

type DocumentAction =
  | { type: 'LOAD'; xml: string }
  | { type: 'ADD_SAID_TAG'; passageId: PassageID; range: TextRange; speaker: CharacterID }
  | { type: 'REMOVE_TAG'; tagId: TagID }
  | { type: 'UNDO'; targetRevision: number }
  | { type: 'REDO'; fromRevision: number };

function documentReducer(doc: TEIDocument, action: DocumentAction): TEIDocument {
  switch (action.type) {
    case 'LOAD':
      return loadDocument(action.xml);

    case 'ADD_SAID_TAG':
      return addSaidTag(doc, action.passageId, action.range, action.speaker);

    case 'REMOVE_TAG':
      return removeTag(doc, action.tagId);

    case 'UNDO':
      return undoTo(doc, action.targetRevision);

    case 'REDO':
      return redoFrom(doc, action.fromRevision);

    default:
      return doc;
  }
}

export function DocumentProvider({ children }: { children: React.ReactNode }) {
  const [doc, dispatch] = useReducer(documentReducer, null);

  const loadDocument = useCallback((xml: string) => {
    dispatch({ type: 'LOAD', xml });
  }, []);

  const addSaidTag = useCallback((passageId: PassageID, range: TextRange, speaker: CharacterID) => {
    dispatch({ type: 'ADD_SAID_TAG', passageId, range, speaker });
  }, []);

  // ... other actions

  return (
    <DocumentContext.Provider value={{ doc, loadDocument, addSaidTag /* ... */ }}>
      {children}
    </DocumentContext.Provider>
  );
}
```

---

## Undo/Redo Infrastructure

### 4. History Management

**Files:**
- Create: `lib/history/HistoryManager.ts`

**Implementation:**
```typescript
// lib/history/HistoryManager.ts

export interface HistoryManager {
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly currentRevision: number;
  readonly totalRevisions: number;

  undo(doc: TEIDocument): TEIDocument;
  redo(doc: TEIDocument): TEIDocument;
  checkpoint(doc: TEIDocument): TEIDocument;
}

export function createHistoryManager(maxHistory: number = 100): HistoryManager {
  let currentRevision = 0;

  return {
    get canUndo() { return currentRevision > 0; },
    get canRedo() { return currentRevision < maxHistory - 1; },
    get currentRevision() { return currentRevision; },
    get totalRevisions() { return maxHistory; },

    undo(doc: TEIDocument) {
      if (!this.canUndo) return doc;
      const target = Math.max(0, currentRevision - 1);
      const newDoc = undoTo(doc, target);
      currentRevision = target;
      return newDoc;
    },

    redo(doc: TEIDocument) {
      if (!this.canRedo) return doc;
      const from = currentRevision;
      const newDoc = redoFrom(doc, from);
      currentRevision = from + 1;
      return newDoc;
    },

    checkpoint(doc: TEIDocument) {
      // Just returns current doc (history already in events)
      return doc;
    }
  };
}
```

---

## Implementation Tasks

### Task 1: Create Immutable Type Definitions
- Create `lib/tei/types.ts` with all immutable types
- Export `TEIDocument`, `DocumentState`, `DocumentEvent`, etc.
- Add JSDoc comments for each type

### Task 2: Refactor TEIDocument Class
- Rename existing `TEIDocument.ts` to `TEIDocument.old.ts`
- Create new `TEIDocument.ts` with pure functions
- Implement `loadDocument`, `serialize` (keep existing XML building)
- Add `addSaidTag`, `removeTag`, `undoTo`, `redoFrom`

### Task 3: Create Operations Module
- Create `lib/tei/operations.ts` with all document operations
- Implement pure functions for each operation
- Add helper functions (`extractContent`, `applySaidTagAdded`, etc.)

### Task 4: Update Document Context
- Refactor `DocumentContext.tsx` to use `useReducer`
- Create action types and reducer
- Add `canUndo`, `canRedo`, `undo`, `redo` to context API

### Task 5: Create History Manager
- Create `lib/history/HistoryManager.ts`
- Implement undo/redo with revision tracking
- Add tests for undo/redo behavior

### Task 6: Migration Utilities
- Create `lib/tei/migrate.ts` to convert old mutable TEIDocument to new immutable format
- Add tests for migration correctness

### Task 7: Unit Tests
- Test all operations return new values (don't mutate input)
- Test undo/redo restores correct state
- Test migration from old format

### Task 8: Integration Tests
- Test React Context with reducer
- Test undo/redo in UI context
- Test multiple sequential operations

---

## Success Criteria

✅ **Immutability:**
- All operations return new values (TypeScript readonly types enforce this)
- No method on TEIDocument modifies this
- Unit tests verify input unchanged after operations

✅ **Time Modeling:**
- Event log preserves complete history
- Can undo to any past revision
- Can redo after undo
- Events have timestamps and revision numbers

✅ **Performance:**
- Reads are O(1) (access doc.state fields)
- Writes copy small arrays (characters, dialogue ~100 items)
- No full document rebuild on every operation

✅ **Simplicity:**
- Clear separation: state is value, events are log
- No hidden mutation, no side effects
- Easy to test (pure functions)

---

## Dependencies

**Required:**
- Existing: `fast-xml-parser`, React 19, Next.js 16
- New: `immer` (for convenient immutable updates)

**No changes to:**
- XML parsing (keep existing)
- Serialization (keep existing XMLBuilder)
- TEI data structures (keep parsed format)

---

## Time Estimates

- Task 1 (Types): 1 hour
- Task 2 (TEIDocument refactor): 2 hours
- Task 3 (Operations): 3 hours
- Task 4 (Context): 2 hours
- Task 5 (History): 1 hour
- Task 6 (Migration): 2 hours
- Task 7 (Unit tests): 3 hours
- Task 8 (Integration tests): 2 hours

**Total:** ~16 hours (2 days)

---

**Plan Status:** ✅ Ready for implementation
**Complexity:** Low-Medium (core refactor, well-scoped)
**Risk:** Low (backwards compatibility via migration utilities)
