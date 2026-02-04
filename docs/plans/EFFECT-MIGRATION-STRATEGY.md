# Incremental Migration Strategy: React to Effect

**Document Version:** 1.0
**Date:** 2026-02-04
**Author:** Migration Strategy Team
**Status:** Planning Phase

---

## Executive Summary

This document outlines a phased, incremental migration strategy from the current React-based architecture to Effect, following the architectural recommendations from the Hickey Review. The migration is designed to be **fully incremental**, allowing the application to remain functional at every phase with the ability to rollback at any point.

**Key Principles:**
- **No Big Bang Rewrite**: Migrate incrementally, module by module
- **Maintain Functionality**: App remains fully functional throughout migration
- **Tests Guide Refactoring**: Existing tests must pass at each phase
- **Rollback Ready**: Can revert to previous phase if issues arise
- **Production-Safe**: Active users continue working during migration

**Estimated Timeline:** 12-16 weeks across 4 phases

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Architectural Goals](#architectural-goals)
3. [Migration Overview](#migration-overview)
4. [Phase 1: Foundation Setup](#phase-1-foundation-setup)
5. [Phase 2: Core Protocols](#phase-2-core-protocols)
6. [Phase 3: Component Migration](#phase-3-component-migration)
7. [Phase 4: Full Effect Migration](#phase-4-full-effect-migration)
8. [Risk Management](#risk-management)
9. [Team Considerations](#team-considerations)
10. [Success Metrics](#success-metrics)

---

## Current State Analysis

### Current Architecture

**React State Management:**
- **EditorLayout**: 22 `useState` hooks (extreme coupling)
- **DocumentContext**: 8 additional state variables
- **Total State Complexity**: 30+ independent mutable state locations

**Key Components:**
```
components/
├── editor/
│   ├── EditorLayout.tsx (995 lines, 22 useState)
│   ├── RenderedView.tsx
│   ├── TagToolbar.tsx
│   ├── XMLCodeEditor.tsx
│   ├── BulkOperationsPanel.tsx
│   └── ... (15+ editor components)
├── ai/
│   ├── AIModeSwitcher.tsx
│   ├── InlineSuggestions.tsx
│   └── AIAssistant.tsx
├── visualization/
├── keyboard/
└── navigation/
```

**Core Libraries:**
```
lib/
├── tei/
│   ├── operations.ts (pure functions - GOOD)
│   ├── types.ts
│   └── entity-operations.ts
├── context/
│   └── DocumentContext.tsx (reducer pattern - PARTIAL GOOD)
├── ai/
│   └── providers.ts (interface exists - GOOD)
├── validation/
│   └── ValidationService.ts
├── storage/
│   └── recentDocuments.ts (localStorage coupled)
└── history/
    └── HistoryManager.ts
```

### What's Already Good

1. **TEI Operations**: Pure functions, immutable operations (event-sourced)
2. **AI Provider Interface**: Protocol exists for AI providers
3. **Reducer Pattern**: DocumentContext uses reducer (better than useState)
4. **Type Safety**: Strong TypeScript types throughout

### What Needs Migration

1. **React State**: All `useState` hooks → Effect services
2. **Context**: React Context → Effect layers
3. **Side Effects**: `useEffect` → Effect programs
4. **LocalStorage**: Direct access → Storage protocol
5. **Mutation**: Remaining mutations → immutable updates

---

## Architectural Goals

Based on the Hickey Review, we're targeting:

### 1. Simplicity Over Ease (Unentangled Design)

**Current (Complex):**
```tsx
// 22 useState hooks in one component
const [bulkPanelOpen, setBulkPanelOpen] = useState(false);
const [vizPanelOpen, setVizPanelOpen] = useState(false);
// ... 20 more
```

**Target (Simple):**
```typescript
// Single immutable state value
interface EditorState {
  readonly panels: Readonly<{
    bulk: boolean;
    viz: boolean;
    validation: boolean;
  }>;
  readonly selection: Readonly<SelectionState>;
  readonly document: TEIDocument | null;
}
```

### 2. Values Over Places (Immutability)

**Current (Place-Oriented):**
```typescript
// Mutable place - hidden state changes
class SelectionManager {
  private selectedText: { start: number; end: number } | null = null;
  selectText(start: number, end: number) {
    this.selectedText = { start, end }; // MUTATION
  }
}
```

**Target (Value-Oriented):**
```typescript
// Immutable value - explicit state transitions
type Selection = { readonly start: number; readonly end: number } | null;

const selectText = (
  current: Selection,
  start: number,
  end: number
): Selection => ({ start, end });
```

### 3. Protocol-First Design

**Current (Implicit Protocols):**
```tsx
// Protocol hidden in component - tight coupling to localStorage
useEffect(() => {
  const savedMode = localStorage.getItem('tei-editor-view-mode');
  if (savedMode) setViewMode(savedMode);
}, []);
```

**Target (Explicit Protocols):**
```typescript
// Protocol defined - can swap implementations
interface ViewModeStorage {
  get(): Effect<ViewMode | null>;
  set(mode: ViewMode): Effect<void>;
}

// Browser implementation
class BrowserViewModeStorage implements ViewModeStorage {
  get(): Effect<ViewMode | null> => // ...
}

// Test implementation
class TestViewModeStorage implements ViewModeStorage {
  // No browser dependency
}
```

### 4. Explicit Time Modeling

**Current (Implicit Time):**
```typescript
// History derived from document - implicit
const canUndo = document.revision > 0;
```

**Target (Explicit Time):**
```typescript
// Event sourcing - explicit succession of states
type DocumentEvent =
  | { type: 'loaded'; xml: string; timestamp: number }
  | { type: 'tag-added'; passageId: string; tag: TagInfo; timestamp: number };

type DocumentState = {
  readonly events: DocumentEvent[];
  readonly currentRevision: number;
  readonly document: TEIDocument | null;
};
```

---

## Migration Overview

### Migration Phases

```
┌─────────────────────────────────────────────────────────────────┐
│ Phase 1: Foundation Setup (Week 1-2)                            │
│ - Add Effect dependencies                                        │
│ - Create parallel architecture                                  │
│ - Setup testing infrastructure                                  │
├─────────────────────────────────────────────────────────────────┤
│ Phase 2: Core Protocols (Week 3-6)                              │
│ - Document protocol (event sourcing)                            │
│ - Storage protocol (localStorage abstraction)                   │
│ - Validation protocol (async Effect)                            │
│ - AI provider protocol (already exists)                         │
├─────────────────────────────────────────────────────────────────┤
│ Phase 3: Component Migration (Week 7-12)                        │
│ - Migrate leaf components first                                 │
│ - Migrate panel components                                      │
│ - Migrate complex components (EditorLayout)                     │
├─────────────────────────────────────────────────────────────────┤
│ Phase 4: Full Effect Migration (Week 13-16)                     │
│ - Remove React Context                                          │
│ - Remove all useState                                           │
│ - Pure Effect architecture                                      │
└─────────────────────────────────────────────────────────────────┘
```

### Parallel Implementation Strategy

```
Current React Architecture      Effect Architecture (New)
┌────────────────────────┐      ┌────────────────────────┐
│ React Context          │      │ Effect Services        │
│ - DocumentContext      │ ───▶ │ - DocumentService      │
│ - ErrorContext         │      │ - ErrorService         │
└────────────────────────┘      │ - StorageService       │
        │                       └────────────────────────┘
        ▼                                 │
┌────────────────────────┐                ▼
│ React Components       │      ┌────────────────────────┐
│ - EditorLayout         │ ───▶ │ Effect Components       │
│ - RenderedView         │      │ - EffectEditorLayout   │
│ - TagToolbar           │      │ - EffectRenderedView   │
└────────────────────────┘      └────────────────────────┘
        │                                 │
        └─────────────┬───────────────────┘
                      ▼
              ┌────────────────┐
              │ Feature Flags  │
              │ - useEffectEditor│
              └────────────────┘
```

---

## Phase 1: Foundation Setup (Week 1-2)

### Objectives

1. Install Effect dependencies
2. Create parallel directory structure
3. Setup Effect testing utilities
4. Create feature flag system
5. Verify no breaking changes to existing app

### Tasks

#### 1.1 Install Dependencies

```bash
npm install effect effect-ts-typeclass effect-plugin-ts
npm install @effect/schema   # For validation
npm install --save-dev @effect-jest/*  # Testing utilities
```

**Verification:**
```bash
npm run build  # Must succeed
npm run test   # All existing tests pass
```

#### 1.2 Create Parallel Directory Structure

```
lib/
├── effect/              # NEW: Effect-based services
│   ├── services/        # Effect service implementations
│   ├── protocols/       # Protocol interfaces
│   ├── layers/          # Effect layers (dependency injection)
│   └── utils/           # Effect utilities
├── react/               # EXISTING: Keep working
├── tei/                 # SHARED: Pure functions stay
└── context/             # EXISTING: Keep working
```

**Action:**
```bash
mkdir -p lib/effect/{services,protocols,layers,utils}
mkdir -p lib/effect/__tests__
```

#### 1.3 Create Feature Flag System

```typescript
// lib/effect/utils/featureFlags.ts
export const FeatureFlags = {
  useEffectEditor: false,
  useEffectStorage: false,
  useEffectValidation: false,
} as const;

export type FeatureFlag = keyof typeof FeatureFlags;

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(`feature-${flag}`) === 'true';
  }
  return FeatureFlags[flag];
}

// Enable features via localStorage
// localStorage.setItem('feature-useEffectEditor', 'true');
```

**Usage in Components:**
```tsx
// EditorLayout.tsx
import { isFeatureEnabled } from '@/lib/effect/utils/featureFlags';

export function EditorLayout() {
  const useEffectEditor = isFeatureEnabled('useEffectEditor');

  if (useEffectEditor) {
    return <EffectEditorLayout />;
  }

  return <ReactEditorLayout />; // Existing implementation
}
```

#### 1.4 Setup Effect Testing Utilities

```typescript
// lib/effect/utils/test-helpers.ts
import { Effect } from 'effect';
import { type TestContext } from '@effect-jest/runtime';

export function createTestLayer() {
  return Effect.all({
    // Provide mock implementations
    storage: TestStorageService,
    validation: TestValidationService,
    ai: MockAIProvider,
  });
}

export async function runEffectTest<E, A>(
  effect: Effect.Effect<A, E, TestContext>
): Promise<A> {
  return Effect.runPromise(effect.pipe(
    Effect.provideSomeLayer(createTestLayer())
  ));
}
```

#### 1.5 Verify Existing Tests

```bash
# Run all tests to ensure baseline
npm run test

# Run E2E tests
npm run test:e2e

# Expected: All tests pass
# If any fail: Fix before proceeding
```

### Testing Strategy for Phase 1

**Unit Tests:**
- Test feature flag system
- Test Effect installation (simple Effect program)
- Verify directory structure

**Integration Tests:**
- Run full test suite (must pass)
- Run E2E tests (must pass)

**Manual Testing:**
- Open app in browser
- Verify no visual changes
- Verify all features work

### Rollback Plan for Phase 1

**If Phase 1 fails:**
```bash
# Remove Effect dependencies
npm uninstall effect effect-ts-typeclass effect-plugin-ts @effect/schema

# Remove parallel structure
rm -rf lib/effect

# Revert feature flag changes
git checkout lib/effect/utils/featureFlags.ts
```

**Success Criteria:**
- [ ] Effect dependencies installed
- [ ] Parallel structure created
- [ ] Feature flags working
- [ ] All existing tests pass
- [ ] No visual changes to app

---

## Phase 2: Core Protocols (Week 3-6)

### Objectives

Create Effect-based protocols for core services. These protocols will define interfaces that both React and Effect implementations can use.

### Protocols to Migrate

1. **Document Protocol** (Week 3)
2. **Storage Protocol** (Week 4)
3. **Validation Protocol** (Week 5)
4. **AI Provider Protocol** (Week 6 - already exists, adapt to Effect)

---

### 2.1 Document Protocol (Week 3)

**Goal:** Create Effect-based document service with event sourcing

#### Current Implementation

```typescript
// lib/context/DocumentContext.tsx
// Uses React reducer + useEffect
const [document, dispatch] = useReducer(documentReducer, null);
```

#### New Effect Protocol

```typescript
// lib/effect/protocols/Document.ts
import { Effect } from 'effect';
import type { TEIDocument, PassageID, TextRange, CharacterID } from '@/lib/tei/types';

// ============================================================================
// Protocol Definition
// ============================================================================

export interface DocumentService {
  // Load document from XML
  load(xml: string): Effect<TEIDocument, DocumentError>;

  // Add tag to document
  addTag(
    passageId: PassageID,
    range: TextRange,
    tagName: string,
    attributes?: Record<string, string>
  ): Effect<TEIDocument, DocumentError>;

  // Remove tag
  removeTag(tagId: string): Effect<TEIDocument, DocumentError>;

  // Undo/redo
  undo(): Effect<TEIDocument, DocumentError>;
  redo(): Effect<TEIDocument, DocumentError>;

  // Get current state
  getDocument(): Effect<TEIDocument, DocumentError>;
}

// ============================================================================
// Error Types
// ============================================================================

export class DocumentError extends Error {
  readonly _tag = 'DocumentError';
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
  }
}

export class DocumentNotFoundError extends DocumentError {
  readonly _tag = 'DocumentNotFoundError';
}

export class TagOperationError extends DocumentError {
  readonly _tag = 'TagOperationError';
}

// ============================================================================
// Tags for dependency injection
// ============================================================================

export const DocumentService = Context.GenericTag<DocumentService>('@app/DocumentService');
```

#### Implementation

```typescript
// lib/effect/services/DocumentService.ts
import { Effect, Context, Ref } from 'effect';
import {
  loadDocument,
  addSaidTag,
  addTag,
  removeTag,
  undoTo,
  redoFrom,
} from '@/lib/tei/operations';
import { DocumentService, DocumentError } from '../protocols/Document';

// ============================================================================
// Live Implementation (production)
// ============================================================================

const makeDocumentService = Effect.gen(function* (_) {
  // Store document in Ref (mutable reference in Effect)
  const documentRef = yield* _(Ref.make<TEIDocument | null>(null));

  const service: DocumentService = {
    load: (xml: string) =>
      Effect.gen(function* (_) {
        const doc = loadDocument(xml); // Pure function from lib/tei/operations
        yield* _(Ref.set(documentRef, doc));
        return doc;
      }).pipe(Effect.mapError((err) => new DocumentError(err))),

    addTag: (passageId, range, tagName, attributes) =>
      Effect.gen(function* (_) {
        const doc = yield* _(Ref.get(documentRef));
        if (!doc) {
          return yield* _(Effect.fail(new DocumentNotFoundError()));
        }

        const updated = addTag(doc, passageId, range, tagName, attributes);
        yield* _(Ref.set(documentRef, updated));
        return updated;
      }),

    removeTag: (tagId) =>
      Effect.gen(function* (_) {
        const doc = yield* _(Ref.get(documentRef));
        if (!doc) {
          return yield* _(Effect.fail(new DocumentNotFoundError()));
        }

        const updated = removeTag(doc, tagId);
        yield* _(Ref.set(documentRef, updated));
        return updated;
      }),

    undo: () =>
      Effect.gen(function* (_) {
        const doc = yield* _(Ref.get(documentRef));
        if (!doc) {
          return yield* _(Effect.fail(new DocumentNotFoundError()));
        }

        const targetRevision = Math.max(0, doc.state.revision - 1);
        const updated = undoTo(doc, targetRevision);
        yield* _(Ref.set(documentRef, updated));
        return updated;
      }),

    redo: () =>
      Effect.gen(function* (_) {
        const doc = yield* _(Ref.get(documentRef));
        if (!doc) {
          return yield* _(Effect.fail(new DocumentNotFoundError()));
        }

        const updated = redoFrom(doc, doc.state.revision);
        yield* _(Ref.set(documentRef, updated));
        return updated;
      }),

    getDocument: () => Ref.get(documentRef).pipe(
      Effect.flatMap((doc) =>
        doc
          ? Effect.succeed(doc)
          : Effect.fail(new DocumentNotFoundError())
      )
    ),
  };

  return service;
});

// ============================================================================
// Layer (dependency injection)
// ============================================================================

export const DocumentServiceLive = Layer.effect(DocumentService, makeDocumentService);
```

#### Test Implementation

```typescript
// lib/effect/services/DocumentService.test.ts
import { Effect } from 'effect';
import { describe, it, expect } from '@effect/jest';
import { DocumentService } from './DocumentService';
import { TestDocumentService } from '../test/TestDocumentService';

describe('DocumentService', () => {
  it('should load document', async () => {
    const program = Effect.gen(function* (_) {
      const service = yield* _(DocumentService);
      const doc = yield* _(service.load('<TEI>...</TEI>'));

      expect(doc.state.metadata.title).toBeDefined();
    });

    await Effect.runPromise(
      program.pipe(
        Effect.provideSomeLayer(TestDocumentService)
      )
    );
  });

  it('should add tag', async () => {
    const program = Effect.gen(function* (_) {
      const service = yield* _(DocumentService);

      yield* _(service.load(testXML));
      const updated = yield* _(
        service.addTag('passage-1', { start: 0, end: 10 }, 'said', {
          who: '#speaker1'
        })
      );

      expect(updated.state.passages[0].tags).toHaveLength(1);
    });

    await Effect.runPromise(
      program.pipe(
        Effect.provideSomeLayer(TestDocumentService)
      )
    );
  });
});
```

#### React Integration (Bridge)

```typescript
// components/effect/DocumentProvider.tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { Effect, Runtime } from 'effect';
import { DocumentService } from '@/lib/effect/protocols/Document';
import { DocumentServiceLive } from '@/lib/effect/services/DocumentService';

// Create Effect runtime
const runtime = Runtime.defaultRuntime.pipe(
  Runtime.provideLayers(DocumentServiceLive)
);

interface DocumentContextType {
  document: TEIDocument | null;
  loadDocument: (xml: string) => Promise<void>;
  addTag: (passageId: PassageID, range: TextRange, tagName: string) => Promise<void>;
}

const DocumentContext = createContext<DocumentContextType | null>(null);

export function EffectDocumentProvider({ children }: { children: React.ReactNode }) {
  const [document, setDocument] = useState<TEIDocument | null>(null);

  const loadDocument = async (xml: string) => {
    const program = Effect.gen(function* (_) {
      const service = yield* _(DocumentService);
      return yield* _(service.load(xml));
    });

    const doc = await Effect.runPromise(program);
    setDocument(doc);
  };

  const addTag = async (passageId: PassageID, range: TextRange, tagName: string) => {
    const program = Effect.gen(function* (_) {
      const service = yield* _(DocumentService);
      return yield* _(service.addTag(passageId, range, tagName));
    });

    const updated = await Effect.runPromise(program);
    setDocument(updated);
  };

  return (
    <DocumentContext.Provider value={{ document, loadDocument, addTag }}>
      {children}
    </DocumentContext.Provider>
  );
}
```

### Testing Strategy for Document Protocol

**Unit Tests:**
- Test each DocumentService method
- Test error handling
- Test undo/redo
- Test concurrent operations

**Integration Tests:**
- Test React bridge
- Test feature flag switching between React/Effect

**Migration Tests:**
- Verify React and Effect implementations produce same results

### Rollback Plan for Document Protocol

**If issues arise:**
1. Disable feature flag: `localStorage.setItem('feature-useEffectEditor', 'false')`
2. Revert to React DocumentContext
3. Keep Effect code (no breaking changes)
4. Fix issues in next iteration

---

### 2.2 Storage Protocol (Week 4)

**Goal:** Abstract localStorage to enable testing

#### Current Implementation

```typescript
// Direct localStorage access throughout codebase
localStorage.getItem('tei-editor-view-mode');
localStorage.setItem('tei-editor-visited', 'true');
```

#### New Effect Protocol

```typescript
// lib/effect/protocols/Storage.ts
import { Effect } from 'effect';

export interface StorageService {
  get<T>(key: string): Effect<T | null, StorageError>;
  set<T>(key: string, value: T): Effect<void, StorageError>;
  remove(key: string): Effect<void, StorageError>;
  clear(): Effect<void, StorageError>;
}

export class StorageError extends Error {
  readonly _tag = 'StorageError';
}

export const StorageService = Context.GenericTag<StorageService>('@app/StorageService');
```

#### Implementations

**Browser Implementation:**
```typescript
// lib/effect/services/BrowserStorageService.ts
const makeBrowserStorage = Effect.succeed({
  get: <T>(key: string) =>
    Effect.tryPromise(() =>
      Promise.resolve(localStorage.getItem(key) as T | null)
    ),

  set: <T>(key: string, value: T) =>
    Effect.tryPromise(() =>
      Promise.resolve(localStorage.setItem(key, JSON.stringify(value)))
    ),

  remove: (key: string) =>
    Effect.tryPromise(() =>
      Promise.resolve(localStorage.removeItem(key))
    ),

  clear: () =>
    Effect.tryPromise(() =>
      Promise.resolve(localStorage.clear())
    ),
});

export const BrowserStorageLive = Layer.effect(
  StorageService,
  makeBrowserStorage
);
```

**Test Implementation:**
```typescript
// lib/effect/services/TestStorageService.ts
class InMemoryStorage {
  private store = new Map<string, string>();

  async get<T>(key: string): Promise<T | null> {
    const value = this.store.get(key);
    return value ? JSON.parse(value) : null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.store.set(key, JSON.stringify(value));
  }

  async remove(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}

export const TestStorageLive = Layer.effect(
  StorageService,
  Effect.succeed(new InMemoryStorage())
);
```

#### Usage Migration

**Before (React):**
```tsx
useEffect(() => {
  const savedMode = localStorage.getItem('tei-editor-view-mode');
  if (savedMode) setViewMode(savedMode as ViewMode);
}, []);
```

**After (Effect):**
```typescript
const loadViewMode = Effect.gen(function* (_) {
  const storage = yield* _(StorageService);
  const savedMode = yield* _(storage.get<ViewMode>('tei-editor-view-mode'));

  if (savedMode) {
    return { type: 'view-mode-loaded', mode: savedMode };
  }

  return { type: 'no-saved-mode' };
});
```

### Testing Strategy for Storage Protocol

**Unit Tests:**
- Test get/set/remove/clear
- Test JSON serialization
- Test error handling (quota exceeded)

**Integration Tests:**
- Test localStorage persistence
- Test concurrent access

**Migration Tests:**
- Verify React and Effect implementations compatible

---

### 2.3 Validation Protocol (Week 5)

**Goal:** Convert validation service to Effect

#### Current Implementation

```typescript
// lib/validation/ValidationService.ts
export async function validateDocument(xml: string): Promise<ValidationResult> {
  const response = await fetch('/api/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ xml }),
  });

  if (!response.ok) {
    throw new Error(`Validation error: ${response.statusText}`);
  }

  return response.json();
}
```

#### New Effect Protocol

```typescript
// lib/effect/protocols/Validation.ts
import { Effect } from 'effect';
import type { ValidationResult } from '@/lib/validation/ValidationService';

export interface ValidationService {
  validate(xml: string): Effect<ValidationResult, ValidationError>;
  clearCache(): Effect<void, ValidationError>;
}

export class ValidationError extends Error {
  readonly _tag = 'ValidationError';
}

export const ValidationService = Context.GenericTag<ValidationService>('@app/ValidationService');
```

#### Implementation

```typescript
// lib/effect/services/ValidationService.ts
const makeValidationService = Effect.succeed({
  validate: (xml: string) =>
    Effect.tryPromise({
      try: () =>
        fetch('/api/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ xml }),
        }).then((res) => {
          if (!res.ok) {
            throw new Error(`Validation API error: ${res.statusText}`);
          }
          return res.json() as Promise<ValidationResult>;
        }),
      catch: (err) => new ValidationError(err),
    }),

  clearCache: () => Effect.succeed(undefined),
});

export const ValidationServiceLive = Layer.effect(
  ValidationService,
  makeValidationService
);
```

#### Composable Enhancements

**With Caching:**
```typescript
const validateWithCache = (xml: string) =>
  Effect.gen(function* (_) {
    const cache = yield* _(CacheService);
    const cached = yield* _(cache.get<ValidationResult>(xml));

    if (cached) {
      return cached;
    }

    const validation = yield* _(ValidationService.validate(xml));
    yield* _(cache.set(xml, validation));

    return validation;
  });
```

**With Retry:**
```typescript
const validateWithRetry = (xml: string) =>
  ValidationService.validate(xml).pipe(
    Effect.retry({
      times: 3,
      delay: 1000, // 1 second
    })
  );
```

**With Logging:**
```typescript
const validateWithLogging = (xml: string) =>
  ValidationService.validate(xml).pipe(
    Effect.tap((result) =>
      Effect.log(`Validation result: ${result.valid ? 'PASS' : 'FAIL'}`)
    ),
    Effect.tapError((err) =>
      Effect.logError(`Validation failed: ${err.message}`)
    )
  );
```

---

### 2.4 AI Provider Protocol (Week 6)

**Goal:** Adapt existing AI provider interface to Effect

#### Current State (Already Good!)

```typescript
// lib/ai/AIProvider.ts (interface exists)
export interface AIProvider {
  detectDialogue(text: string): Promise<DialogueSpan[]>;
  attributeSpeakers(text: string, dialogue: DialogueSpan[]): Promise<SpeakerAttribution>;
  // ...
}
```

#### Adapt to Effect

```typescript
// lib/effect/protocols/AI.ts
import { Effect } from 'effect';
import type { DialogueSpan, SpeakerAttribution } from '@/lib/ai/types';

export interface AIService {
  detectDialogue(text: string): Effect<DialogueSpan[], AIError>;
  attributeSpeakers(
    text: string,
    dialogue: DialogueSpan[]
  ): Effect<SpeakerAttribution, AIError>;
}

export class AIError extends Error {
  readonly _tag = 'AIError';
}

export const AIService = Context.GenericTag<AIService>('@app/AIService');
```

#### Implementation (Wrapper Around Existing)

```typescript
// lib/effect/services/AIService.ts
import { openaiProvider } from '@/lib/ai/providers';

const makeAIService = Effect.succeed({
  detectDialogue: (text: string) =>
    Effect.tryPromise({
      try: () => openaiProvider.detectDialogue(text),
      catch: (err) => new AIError(err),
    }),

  attributeSpeakers: (text: string, dialogue: DialogueSpan[]) =>
    Effect.tryPromise({
      try: () => openaiProvider.attributeSpeakers(text, dialogue),
      catch: (err) => new AIError(err),
    }),
});

export const AIServiceLive = Layer.effect(AIService, makeAIService);
```

---

### Testing Strategy for Phase 2

**Protocol Tests:**
- Test each protocol implementation
- Test error handling
- Test timeout scenarios

**Integration Tests:**
- Test protocols together
- Test React bridge
- Test feature flag switching

**E2E Tests:**
- Run full E2E suite (must pass)
- No visual changes to app

### Rollback Plan for Phase 2

**If any protocol fails:**
1. Disable specific feature flag
2. Keep React implementation active
3. Fix Effect implementation
4. Re-enable when fixed

**Example:**
```typescript
// If DocumentService fails
localStorage.setItem('feature-useEffectDocument', 'false'); // Use React
localStorage.setItem('feature-useEffectStorage', 'true');   // Use Effect
```

### Success Criteria for Phase 2

- [ ] Document protocol implemented and tested
- [ ] Storage protocol implemented and tested
- [ ] Validation protocol implemented and tested
- [ ] AI protocol adapted to Effect
- [ ] All protocols have test implementations
- [ ] React bridge working for all protocols
- [ ] All existing tests pass
- [ ] Feature flags allow switching between React/Effect

---

## Phase 3: Component Migration (Week 7-12)

### Objectives

Migrate React components to Effect, starting with leaf components and working up to complex components.

### Migration Order

```
Week 7-8:  Leaf Components (no state dependencies)
  ├─ ExportButton.tsx
  ├─ TagBreadcrumb.tsx
  ├─ FileUpload.tsx
  └─ EntityTooltip.tsx

Week 9-10: Panel Components (minimal state)
  ├─ BulkOperationsPanel.tsx
  ├─ ValidationResultsDialog.tsx
  ├─ EntityEditorPanel.tsx
  └─ StructuralTagPalette.tsx

Week 11-12: Complex Components (EditorLayout)
  ├─ TagToolbar.tsx
  ├─ RenderedView.tsx
  ├─ XMLCodeEditor.tsx
  └─ EditorLayout.tsx (THE BIG ONE)
```

---

### Component Migration Pattern

#### Before (React)

```tsx
// components/editor/ExportButton.tsx
'use client';

import { useState } from 'react';
import { useDocumentContext } from '@/lib/context/DocumentContext';
import { Button } from '@/components/ui/button';

export function ExportButton() {
  const { document } = useDocumentContext();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);

    try {
      const xml = document?.state.xml || '';
      const blob = new Blob([xml], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `tei-export-${Date.now()}.xml`;
      a.click();

      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button onClick={handleExport} disabled={isExporting}>
      {isExporting ? 'Exporting...' : 'Export'}
    </Button>
  );
}
```

#### After (Effect)

```tsx
// components/editor/ExportButton.effect.tsx
'use client';

import { useEffect, useState } from 'react';
import { Effect } from 'effect';
import { Button } from '@/components/ui/button';
import { DocumentService } from '@/lib/effect/protocols/Document';

export function EffectExportButton() {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);

    try {
      // Run Effect program
      const xml = await Effect.runPromise(
        Effect.gen(function* (_) {
          const service = yield* _(DocumentService);
          const doc = yield* _(service.getDocument());
          return doc.state.xml;
        })
      );

      // Same export logic
      const blob = new Blob([xml], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `tei-export-${Date.now()}.xml`;
      a.click();

      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button onClick={handleExport} disabled={isExporting}>
      {isExporting ? 'Exporting...' : 'Export'}
    </Button>
  );
}
```

#### Feature Flag Integration

```tsx
// components/editor/ExportButton.tsx (unified)
import { isFeatureEnabled } from '@/lib/effect/utils/featureFlags';
import { ExportButton as ReactExportButton } from './ExportButton.react';
import { ExportButton as EffectExportButton } from './ExportButton.effect';

export function ExportButton() {
  if (isFeatureEnabled('useEffectExport')) {
    return <EffectExportButton />;
  }

  return <ReactExportButton />;
}
```

---

### Week 7-8: Leaf Components

#### ExportButton Migration

**Tasks:**
1. Create `ExportButton.effect.tsx`
2. Update `ExportButton.tsx` with feature flag
3. Write tests for Effect version
4. Verify both versions work identically

**Tests:**
```typescript
// components/editor/__tests__/ExportButton.test.tsx
describe('ExportButton', () => {
  it('should export document', async () => {
    const { getByText } = render(
      <DocumentProvider>
        <ExportButton />
      </DocumentProvider>
    );

    await userEvent.click(getByText('Export'));

    // Verify download triggered
    expect(global.URL.createObjectURL).toHaveBeenCalled();
  });
});
```

#### TagBreadcrumb Migration

**Pattern:**
```tsx
// components/editor/TagBreadcrumb.effect.tsx
export function EffectTagBreadcrumb() {
  const [selectedTag, setSelectedTag] = useState<TagInfo | null>(null);

  // Watch document changes via Effect stream
  useEffect(() => {
    const program = Effect.gen(function* (_) {
      const service = yield* _(DocumentService);
      return yield* _(service.getDocument());
    });

    const stream = Effect.runPromise(program);

    stream.then((doc) => {
      // Update breadcrumb based on document
    });
  }, []);

  return (
    <div className="flex items-center gap-2">
      {/* Breadcrumb UI */}
    </div>
  );
}
```

#### FileUpload Migration

**Effect Program:**
```typescript
const uploadDocument = (file: File) =>
  Effect.gen(function* (_) {
    // Read file
    const content = yield* _(
      Effect.tryPromise(() => file.text())
    );

    // Validate
    const validation = yield* _(
      ValidationService.validate(content)
    );

    if (!validation.valid) {
      return yield* _(
        Effect.fail(new ValidationError('Invalid XML'))
      );
    }

    // Load document
    const doc = yield* _(
      DocumentService.load(content)
    );

    return doc;
  });
```

### Week 9-10: Panel Components

#### BulkOperationsPanel Migration

**Complexity: Medium**
- Multiple state variables
- Selection management
- Bulk operations

**Effect Approach:**
```tsx
export function EffectBulkOperationsPanel() {
  const [selectedPassages, setSelectedPassages] = useState<Set<string>>(new Set());

  const handleTagAll = async (speakerId: string) => {
    const program = Effect.gen(function* (_) {
      const doc = yield* _(DocumentService.getDocument());

      // Apply tags to all selected passages
      const operations = Array.from(selectedPassages).map((passageId) =>
        DocumentService.addTag(
          passageId as PassageID,
          { start: 0, end: 10 }, // Simplified
          'said',
          { who: `#${speakerId}` }
        )
      );

      yield* _(Effect.all(operations, { concurrency: 'unbounded' }));
    });

    await Effect.runPromise(program);
  };

  return (
    <div className="panel">
      {/* Panel UI */}
    </div>
  );
}
```

### Week 11-12: Complex Components

#### EditorLayout Migration (The Big One)

**Current State:**
- 22 useState hooks
- 995 lines of code
- Multiple concerns mixed

**Migration Strategy:**
1. **Break into smaller components**
2. **Extract state to services**
3. **Use Effect for async operations**
4. **Keep UI in React (for now)**

**Step 1: Extract State Services**

```typescript
// lib/effect/services/EditorStateService.ts
export interface EditorStateService {
  getPanelState(): Effect<PanelState>;
  setPanelOpen(panel: string, open: boolean): Effect<void>;
  getSelectionState(): Effect<SelectionState>;
  setSelection(selection: SelectionState): Effect<void>;
}

const makeEditorStateService = Effect.gen(function* (_) {
  const panelStateRef = yield* _(Ref.make<PanelState>({
    bulk: false,
    viz: false,
    validation: false,
  }));

  const selectionStateRef = yield* _(Ref.make<SelectionState>({
    passages: [],
    currentId: null,
  }));

  return {
    getPanelState: () => Ref.get(panelStateRef),
    setPanelOpen: (panel, open) =>
      Ref.update(panelStateRef, (state) => ({
        ...state,
        [panel]: open,
      })),

    getSelectionState: () => Ref.get(selectionStateRef),
    setSelection: (selection) =>
      Ref.set(selectionStateRef, selection),
  };
});
```

**Step 2: Simplify Component**

```tsx
// components/editor/EditorLayout.effect.tsx
export function EffectEditorLayout() {
  const [panelState, setPanelState] = useState<PanelState>({
    bulk: false,
    viz: false,
    validation: false,
  });

  const [document, setDocument] = useState<TEIDocument | null>(null);

  // Load document on mount
  useEffect(() => {
    const program = Effect.gen(function* (_) {
      const doc = yield* _(DocumentService.getDocument());
      return doc;
    });

    Effect.runPromise(program).then(setDocument);
  }, []);

  // Handle panel toggle
  const handlePanelToggle = async (panel: string) => {
    const newState = { ...panelState, [panel]: !panelState[panel] };
    setPanelState(newState);

    // Persist to storage
    await Effect.runPromise(
      StorageService.set('panel-state', newState)
    );
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Toolbar */}
      <TagToolbar onApplyTag={handleApplyTag} />

      {/* Panels */}
      {panelState.bulk && (
        <BulkOperationsPanel onClose={() => handlePanelToggle('bulk')} />
      )}

      {/* Main content */}
      <RenderedView document={document} />
    </div>
  );
}
```

### Testing Strategy for Phase 3

**Unit Tests:**
- Test each migrated component
- Test Effect programs
- Test error handling

**Integration Tests:**
- Test component interactions
- Test state persistence
- Test feature flag switching

**E2E Tests:**
- Run full E2E suite
- Test with both React and Effect versions
- Verify no visual differences

**Visual Regression:**
- Take screenshots of React version
- Take screenshots of Effect version
- Compare for differences

### Rollback Plan for Phase 3

**If component migration fails:**
1. Disable specific component feature flag
2. Keep React version active
3. Fix Effect version
4. Re-enable when fixed

**Example:**
```typescript
// If ExportButton effect version has bugs
localStorage.setItem('feature-useEffectExport', 'false'); // Use React
localStorage.setItem('feature-useEffectTagToolbar', 'true'); // Use Effect
```

### Success Criteria for Phase 3

- [ ] All leaf components migrated
- [ ] All panel components migrated
- [ ] EditorLayout simplified (< 500 lines)
- [ ] All components have tests
- [ ] Feature flags allow component-level switching
- [ ] No visual changes to app
- [ ] All E2E tests pass

---

## Phase 4: Full Effect Migration (Week 13-16)

### Objectives

Complete migration to pure Effect architecture:
1. Remove React Context
2. Remove all useState
3. Pure Effect architecture
4. Optional: React-free UI (using Effect-based UI lib)

---

### Week 13: Remove React Context

**Current:**
```tsx
// lib/context/DocumentContext.tsx (React Context)
const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

export function DocumentProvider({ children }) {
  const [document, dispatch] = useReducer(documentReducer, null);
  // ...
}
```

**Target:**
```typescript
// lib/effect/services/DocumentService.ts (Effect Layer)
// Already implemented in Phase 2

// Main app layer
export const MainLayer = Layer.mergeAll(
  DocumentServiceLive,
  StorageServiceLive,
  ValidationServiceLive,
  AIServiceLive,
  EditorStateServiceLive,
);
```

**Migration:**
```tsx
// app/page.tsx
import { Layer, Runtime } from 'effect';
import { MainLayer } from '@/lib/effect/layers/Main';

const runtime = Runtime.defaultRuntime.pipe(
  Runtime.provideLayers(MainLayer)
);

export default function HomePage() {
  return (
    <EffectRuntimeProvider runtime={runtime}>
      <EffectEditorLayout />
    </EffectRuntimeProvider>
  );
}
```

---

### Week 14: Remove All useState

**Identify remaining useState:**
```bash
# Find all useState usage
grep -r "useState" components/ --include="*.tsx"
```

**Replace with Effect Ref:**
```tsx
// Before
const [isPanelOpen, setIsPanelOpen] = useState(false);

// After
const isPanelOpenRef = useRef(Ref.make(false));
const isPanelOpen = Ref.get(isPanelOpenRef);
const setIsPanelOpen = (value: boolean) =>
  Effect.runPromise(Ref.set(isPanelOpenRef, value));
```

**Or use Effect services:**
```tsx
// Better: Use service
const panelState = await Effect.runPromise(
  EditorStateService.getPanelState()
);
```

---

### Week 15: Pure Effect Architecture

**Goal:** Remove React hooks entirely from business logic

**Before (React + Effect mixed):**
```tsx
export function EditorLayout() {
  const [document, setDocument] = useState(null);

  useEffect(() => {
    const loadDoc = async () => {
      const doc = await Effect.runPromise(DocumentService.load(xml));
      setDocument(doc);
    };
    loadDoc();
  }, []);

  return <div>{/* ... */}</div>;
}
```

**After (Pure Effect):**
```tsx
export const EditorLayoutProgram = Effect.gen(function* (_) {
  // All logic in Effect
  const document = yield* _(DocumentService.getDocument());
  const panelState = yield* _(EditorStateService.getPanelState());
  const selection = yield* _(SelectionService.getSelection());

  // Return UI description
  return {
    document,
    panelState,
    selection,
  };
});

// React component just renders
export function EditorLayout() {
  const [state, setState] = useState(null);

  useEffect(() => {
    Effect.runPromise(EditorLayoutProgram).then(setState);
  }, []);

  if (!state) return <div>Loading...</div>;

  return (
    <div>
      <RenderedView document={state.document} />
      {/* ... */}
    </div>
  );
}
```

---

### Week 16: Optional - React-Free UI

**Investigate Effect-based UI:**
- **Effect UI Libraries** (research needed)
- **Teleport** (Effect-based UI framework)
- **Build custom** (using Effect streams)

**If staying with React:**
- Keep React for rendering only
- All state in Effect services
- React as "view layer" only

---

### Testing Strategy for Phase 4

**Architecture Tests:**
- Verify no React Context
- Verify no useState in business logic
- Verify all state in Effect services

**Integration Tests:**
- Test entire app with Effect
- Test error recovery
- Test persistence

**E2E Tests:**
- Full E2E suite
- Performance tests
- Memory leak tests

### Rollback Plan for Phase 4

**Critical: At this point, rollback is difficult**

**If major issues arise:**
1. Revert to Phase 3 (component-level feature flags)
2. Keep React Context for critical paths
3. Fix Effect architecture
4. Retry migration

**Recommendation:**
- Keep feature flags until 2 weeks of production use
- Monitor for bugs, performance issues
- Only remove flags after confidence

### Success Criteria for Phase 4

- [ ] React Context removed
- [ ] No useState in business logic
- [ ] Pure Effect architecture
- [ ] All tests pass
- [ ] Performance acceptable
- [ ] No memory leaks
- [ ] Production-ready

---

## Risk Management

### High-Risk Areas

#### 1. Team Learning Curve

**Risk:** Team unfamiliar with Effect concepts

**Mitigation:**
- **Week 1:** Effect training workshop
- **Ongoing:** Pair programming for Effect code
- **Documentation:** Internal Effect patterns guide
- **Code Review:** Effect experts review all PRs

**Resources:**
- Effect documentation: https://effect.website
- Effect Discord: Community support
- Internal patterns guide: Create during migration

#### 2. Performance Degradation

**Risk:** Effect runtime overhead

**Mitigation:**
- **Baseline:** Measure current performance
- **Each Phase:** Performance tests
- **Optimization:** Lazy evaluation, batching
- **Monitoring:** Performance metrics in production

**Metrics to Track:**
- Page load time
- Time to interactive
- Memory usage
- FPS (frames per second)

**Acceptable Degradation:**
- < 10% slower: Acceptable
- 10-20% slower: Investigate optimization
- > 20% slower: Critical issue

#### 3. Integration with Existing React Components

**Risk:** Effect services incompatible with React components

**Mitigation:**
- **Bridge Pattern:** React wrappers for Effect services
- **Feature Flags:** Component-level switching
- **Gradual Migration:** Not all-or-nothing
- **Testing:** Integration tests for bridges

**Example Bridge:**
```tsx
// Bridge between Effect service and React component
export function useDocumentService() {
  const [document, setDocument] = useState<TEIDocument | null>(null);

  const loadDocument = useCallback(async (xml: string) => {
    const doc = await Effect.runPromise(DocumentService.load(xml));
    setDocument(doc);
  }, []);

  return { document, loadDocument };
}
```

#### 4. Breaking Changes During Migration

**Risk:** Bugs introduced during migration

**Mitigation:**
- **Feature Flags:** Instant rollback
- **Comprehensive Tests:** Unit + Integration + E2E
- **Canary Releases:** Test with subset of users
- **Monitoring:** Error tracking, user feedback

**Rollback Process:**
1. Disable feature flag
2. Verify React version works
3. Fix Effect version
4. Re-enable flag
5. Monitor closely

---

### Medium-Risk Areas

#### 1. Test Maintenance

**Risk:** Tests become outdated during migration

**Mitigation:**
- Update tests alongside code
- Keep tests implementation-agnostic
- Test protocols, not implementations

#### 2. Documentation

**Risk:** Outdated documentation

**Mitigation:**
- Update docs with each phase
- Effect patterns guide
- Migration checklist

#### 3. Third-Party Libraries

**Risk:** Incompatibility with Effect

**Mitigation:**
- Research compatibility early
- Build adapters if needed
- Consider alternatives

---

### Low-Risk Areas

#### 1. Developer Experience

**Risk:** Effect harder to use than React

**Mitigation:**
- TypeScript support (strong types help)
- Patterns guide (copy-paste examples)
- Tooling (Effect CLI)

---

## Team Considerations

### Skill Requirements

**Essential Skills:**
- TypeScript (advanced)
- Functional programming concepts
- Effect basics (Effect, Layer, Context)

**Nice-to-Have:**
- Category theory basics
- Previous Effect experience

### Training Plan

**Week 1: Effect Basics**
- Day 1: What is Effect? Why use it?
- Day 2: Effect programs (Effect.gen)
- Day 3: Error handling (Effect.either)
- Day 4: Dependency injection (Layer, Context)
- Day 5: Hands-on workshop

**Week 2: Effect Patterns**
- Day 1: Services and protocols
- Day 2: Refs and state management
- Day 3: Streams and async
- Day 4: Testing in Effect
- Day 5: Migration patterns workshop

**Ongoing:**
- Weekly Effect office hours
- Code review guidelines
- Patterns guide updates

### Roles and Responsibilities

**Effect Lead:**
- Own Effect architecture decisions
- Review all Effect code
- Mentor team members
- Write patterns guide

**React Maintainer:**
- Keep React code working
- Write/maintain bridges
- Test compatibility

**QA Engineer:**
- Write Effect tests
- Update E2E tests
- Verify feature flags

**DevOps Engineer:**
- Update CI/CD pipelines
- Add performance monitoring
- Set up canary deployments

---

## Success Metrics

### Technical Metrics

**Code Quality:**
- [ ] Reduction in useState count (target: 0)
- [ ] Increase in test coverage (target: 90%+)
- [ ] Decrease in component complexity (target: < 200 lines)

**Performance:**
- [ ] Page load time within 10% of baseline
- [ ] Time to interactive within 10% of baseline
- [ ] Memory usage within 10% of baseline

**Reliability:**
- [ ] All existing tests pass
- [ ] New tests added for Effect code
- [ ] E2E tests pass 100%

### Business Metrics

**User Experience:**
- [ ] No visual changes to app
- [ ] No feature regressions
- [ ] Same or better performance

**Development Velocity:**
- [ ] Time to add new features (measure before/after)
- [ ] Bug fix time (measure before/after)
- [ ] Onboarding time for new devs (measure before/after)

---

## Migration Checklist

### Phase 1: Foundation Setup
- [ ] Install Effect dependencies
- [ ] Create parallel directory structure
- [ ] Create feature flag system
- [ ] Setup Effect testing utilities
- [ ] Verify all existing tests pass
- [ ] No visual changes to app

### Phase 2: Core Protocols
- [ ] Document protocol implemented
- [ ] Storage protocol implemented
- [ ] Validation protocol implemented
- [ ] AI protocol adapted to Effect
- [ ] All protocols have test implementations
- [ ] React bridge working for all protocols
- [ ] Feature flags allow switching between React/Effect

### Phase 3: Component Migration
- [ ] Leaf components migrated (ExportButton, TagBreadcrumb, FileUpload, EntityTooltip)
- [ ] Panel components migrated (BulkOperationsPanel, ValidationResultsDialog, EntityEditorPanel, StructuralTagPalette)
- [ ] Complex components migrated (TagToolbar, RenderedView, XMLCodeEditor)
- [ ] EditorLayout simplified (< 500 lines)
- [ ] All components have tests
- [ ] Feature flags allow component-level switching
- [ ] No visual changes to app
- [ ] All E2E tests pass

### Phase 4: Full Effect Migration
- [ ] React Context removed
- [ ] No useState in business logic
- [ ] Pure Effect architecture
- [ ] All tests pass
- [ ] Performance acceptable
- [ ] No memory leaks
- [ ] Production-ready

---

## Conclusion

This migration strategy provides a clear, incremental path from React to Effect while maintaining functionality and minimizing risk. The phased approach allows for:

1. **Incremental Progress**: Each phase delivers value
2. **Rollback Safety**: Can revert at any phase
3. **Team Learning**: Gradual skill development
4. **Production Stability**: App remains functional throughout

### Key Takeaways

- **No Big Bang**: Incremental migration over 12-16 weeks
- **Feature Flags**: Enable safe rollback at any point
- **Tests First**: Maintain test coverage throughout
- **Team Investment**: Training essential for success

### Next Steps

1. **Review and Approval**: Stakeholder sign-off
2. **Team Training**: Week 1 Effect workshop
3. **Phase 1 Kickoff**: Install dependencies, setup structure
4. **Weekly Check-ins**: Track progress, adjust plan

### Questions to Address Before Starting

1. **Timeline**: Is 12-16 weeks acceptable?
2. **Resources**: Do we have Effect expertise on the team?
3. **Priority**: Is this migration higher priority than new features?
4. **Risk Tolerance**: Are we comfortable with potential short-term slowdown?

---

**Document Status:** Ready for Review
**Next Review Date:** After Phase 1 completion
**Owner:** Architecture Team
