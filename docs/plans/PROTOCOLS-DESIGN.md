# Effect-Based Protocol Design for TEI XML Editor

**Date:** 2026-02-04
**Author:** Claude (Hickey Principles)
**Status:** Design Proposal
**Related:** [HICKEY-ARCHITECTURAL-REVIEW.md](../HICKEY-ARCHITECTURAL-REVIEW.md)

---

## Executive Summary

This document defines **four core protocols** for an Effect-based architecture refactor of the TEI XML Editor. Each protocol follows Hickey's principles:

1. **Protocols FIRST** - Interfaces defined before implementations
2. **Values over Places** - Immutable data, explicit state transitions
3. **Composable** - All operations composable via Effect
4. **Testable** - Mock implementations simple, no side effects

These protocols replace the current tightly-coupled React state management with explicit, declarative programs that can be composed, tested, and layered with cross-cutting concerns.

---

## Table of Contents

1. [Effect Signature Primer](#effect-signature-primer)
2. [Protocol 1: DocumentOperations](#protocol-1-documentoperations)
3. [Protocol 2: AIProvider](#protocol-2-aiprovider)
4. [Protocol 3: DocumentStorage](#protocol-3-documentstorage)
5. [Protocol 4: ValidationService](#protocol-4-validationservice)
6. [Composition Patterns](#composition-patterns)
7. [Implementation Roadmap](#implementation-roadmap)

---

## Effect Signature Primer

### What is `Effect<R, E, A>`?

Effect is a **composable program** that describes:

```typescript
Effect<R, E, A>;
//   ^  ^  ^
//   |  |  |
//   |  |  +-- Success value (A)
//   |  +----- Error that can occur (E)
//   +-------- Context required (R)
```

**Examples:**

```typescript
// ✅ Pure computation (no context, no errors)
Effect<never, never, string>;

// ✅ File system operation (requires FileSystem, can fail with IOError)
Effect<FileSystem, IOError, string>;

// ✅ Network request (requires HttpClient, can fail with ApiError)
Effect<HttpClient, ApiError, ValidationResult>;
```

### Why This Matters for Protocols

**Current (React) approach:**

```typescript
// ❌ Mutation hidden, no composition
const [document, setDocument] = useState<TEIDocument | null>(null);

// Side effect happens invisibly during render
setDocument(loadDocument(xml));
```

**Effect approach:**

```typescript
// ✅ Explicit program, composable
const loadDoc = (xml: string) =>
  Effect.gen(function* (_) {
    const parsed = yield* parseXML(xml);
    const validated = yield* validateDocument(parsed);
    return createTEIDocument(parsed);
  });

// Can compose, retry, log, cache
const program = pipe(
  loadDoc(xml),
  Effect.retry(Schedule.exponential('100 millis')),
  Effect.tapError((e) => Effect.logError('Load failed', e))
);
```

---

## Protocol 1: DocumentOperations

### Purpose

Manage TEI document lifecycle: load, save, export, and manipulate. Replaces the `DocumentContext` reducer pattern with explicit operations.

### TypeScript Interface

```typescript
/**
 * DocumentOperations Protocol
 *
 * All document operations return Effects that can be composed.
 * Documents are immutable values - operations return new values.
 */
import { Effect } from 'effect';
import type {
  TEIDocument,
  PassageID,
  CharacterID,
  TextRange,
  Character,
  Relationship,
} from '@/lib/tei/types';

// ============================================================================
// Error Types
// ============================================================================

/**
 * Base error type for document operations
 */
export class DocumentError extends TagClass('DocumentError')<
  DocumentError,
  {
    readonly message: string;
    readonly cause?: unknown;
  }
> {}

/**
 * Specific error types
 */
export class DocumentNotFoundError extends DocumentError {
  readonly _tag = 'DocumentNotFoundError';
}

export class DocumentParseError extends DocumentError {
  readonly _tag = 'DocumentParseError';
  readonly xml: string;
  readonly parseError: unknown;
}

export class DocumentSerializationError extends DocumentError {
  readonly _tag = 'DocumentSerializationError';
}

export class InvalidOperationError extends DocumentError {
  readonly _tag = 'InvalidOperationError';
  readonly reason: string;
}

// ============================================================================
// Context (Dependencies)
// ============================================================================

/**
 * Context required for document operations
 *
 * This allows layering: logger, cache, metrics can be added
 * without changing the protocol.
 */
export class DocumentOperations extends Context.Tag('DocumentOperations')<
  DocumentOperations,
  {
    /**
     * Load a TEI document from XML string
     *
     * Returns a new TEIDocument with:
     * - Parsed content
     * - Extracted passages
     * - Loaded entities
     * - Initial event log
     */
    readonly loadDocument: (xml: string) => Effect.Effect<never, DocumentParseError, TEIDocument>;

    /**
     * Save a TEI document to XML string
     *
     * Serializes current document state to TEI XML format
     */
    readonly saveDocument: (
      doc: TEIDocument
    ) => Effect.Effect<never, DocumentSerializationError, string>;

    /**
     * Export document with specific format options
     */
    readonly exportDocument: (
      doc: TEIDocument,
      options: ExportOptions
    ) => Effect.Effect<never, DocumentError, ExportResult>;

    // Tag operations
    readonly addSaidTag: (
      doc: TEIDocument,
      passageId: PassageID,
      range: TextRange,
      speaker: CharacterID
    ) => Effect.Effect<never, InvalidOperationError, TEIDocument>;

    readonly addTag: (
      doc: TEIDocument,
      passageId: PassageID,
      range: TextRange,
      tagName: string,
      attributes?: Record<string, string>
    ) => Effect.Effect<never, InvalidOperationError, TEIDocument>;

    readonly removeTag: (
      doc: TEIDocument,
      tagId: string
    ) => Effect.Effect<never, InvalidOperationError, TEIDocument>;

    // Entity operations
    readonly addCharacter: (
      doc: TEIDocument,
      character: Character
    ) => Effect.Effect<never, InvalidOperationError, TEIDocument>;

    readonly updateCharacter: (
      doc: TEIDocument,
      characterId: CharacterID,
      updates: Partial<Omit<Character, 'id' | 'xmlId'>>
    ) => Effect.Effect<never, InvalidOperationError, TEIDocument>;

    readonly removeCharacter: (
      doc: TEIDocument,
      characterId: CharacterID
    ) => Effect.Effect<never, InvalidOperationError, TEIDocument>;

    readonly addRelationship: (
      doc: TEIDocument,
      relation: Omit<Relationship, 'id'>
    ) => Effect.Effect<never, InvalidOperationError, TEIDocument>;

    readonly removeRelationship: (
      doc: TEIDocument,
      relationId: string
    ) => Effect.Effect<never, InvalidOperationError, TEIDocument>;

    // History operations
    readonly undo: (
      doc: TEIDocument,
      targetRevision: number
    ) => Effect.Effect<never, InvalidOperationError, TEIDocument>;

    readonly redo: (
      doc: TEIDocument,
      fromRevision: number
    ) => Effect.Effect<never, InvalidOperationError, TEIDocument>;

    readonly getHistoryState: (doc: TEIDocument) => Effect.Effect<never, never, HistoryState>;
  }
>() {}

// ============================================================================
// Supporting Types
// ============================================================================

export interface ExportOptions {
  format: 'tei-xml' | 'plain-text' | 'json';
  includeMetadata?: boolean;
  includeAnnotations?: boolean;
  prettyPrint?: boolean;
}

export interface ExportResult {
  content: string;
  format: string;
  metadata: {
    exportedAt: Date;
    passageCount: number;
    annotationCount: number;
  };
}

export interface HistoryState {
  canUndo: boolean;
  canRedo: boolean;
  currentRevision: number;
  totalRevisions: number;
}
```

### How This Enables Composition

**Problem 1: Load and validate together**

```typescript
// ✅ Compose load + validate
const loadAndValidate = (xml: string) =>
  Effect.gen(function* (_) {
    const doc = yield* DocumentOperations.loadDocument(xml);
    const validationResult = yield* ValidationService.validateDocument(doc);
    if (!validationResult.valid) {
      yield* Effect.logError('Document loaded with validation errors', validationResult.errors);
    }
    return doc;
  });
```

**Problem 2: Add tag with auto-save**

```typescript
// ✅ Compose add tag + save
const addTagAndSave = (
  doc: TEIDocument,
  passageId: PassageID,
  range: TextRange,
  speaker: CharacterID
) =>
  Effect.gen(function* (_) {
    const updated = yield* DocumentOperations.addSaidTag(doc, passageId, range, speaker);
    const xml = yield* DocumentOperations.saveDocument(updated);
    yield* DocumentStorage.save('current', xml);
    return updated;
  });
```

### Mock Implementation for Tests

```typescript
/**
 * Test implementation - pure values, no side effects
 *
 * Tests can verify state changes without touching file system
 */
export const TestDocumentOperations = {
  loadDocument: (xml: string) =>
    Effect.sync(() => {
      // Parse and return test document
      return createTestTEIDocument(xml);
    }),

  saveDocument: (doc: TEIDocument) =>
    Effect.sync(() => {
      // Return serialized XML (no actual file I/O)
      return serializeDocument(doc);
    }),

  addSaidTag: (doc: TEIDocument, passageId: PassageID, range: TextRange, speaker: CharacterID) =>
    Effect.sync(() => {
      // Pure function - returns new value
      return addSaidTagImpl(doc, passageId, range, speaker);
    }),

  // ... other operations as pure functions
};
```

---

## Protocol 2: AIProvider

### Purpose

Extend the existing AI provider interface to use Effect. Enables composable AI operations with retry, caching, and logging.

### Current Interface (Good Foundation)

```typescript
// /home/bor/Projects/tei-xml/lib/ai/providers.ts

export interface AIProvider {
  detectDialogue(text: string): Promise<DialogueSpan[]>;
  attributeSpeaker(context: string, characters: Character[]): Promise<string>;
  validateConsistency(document: any): Promise<Issue[]>;
}
```

### Enhanced Effect-Based Interface

```typescript
/**
 * AIProvider Protocol (Effect-based)
 *
 * Extends existing interface with Effect for composition.
 */
import { Effect } from 'effect';
import type { DialogueSpan, Character, Issue } from '@/lib/ai/providers';

// ============================================================================
// Error Types
// ============================================================================

export class AIError extends TagClass('AIError')<
  AIError,
  {
    readonly message: string;
    readonly provider: string;
    readonly cause?: unknown;
  }
> {}

export class AIRateLimitError extends AIError {
  readonly _tag = 'AIRateLimitError';
  readonly retryAfter?: number;
}

export class AIAuthenticationError extends AIError {
  readonly _tag = 'AIAuthenticationError';
}

export class AIInvalidRequestError extends AIError {
  readonly _tag = 'AIInvalidRequestError';
}

// ============================================================================
// Context
// ============================================================================

export class AIProvider extends Context.Tag('AIProvider')<
  AIProvider,
  {
    /**
     * Detect dialogue passages in text
     *
     * Returns spans of text that appear to be dialogue
     * with confidence scores.
     */
    readonly detectDialogue: (text: string) => Effect.Effect<
      never, // No special context needed
      AIError,
      readonly DialogueSpan[]
    >;

    /**
     * Attribute speaker to dialogue passage
     *
     * Given context and available characters,
     * determines which character is speaking.
     */
    readonly attributeSpeaker: (
      context: string,
      characters: readonly Character[]
    ) => Effect.Effect<
      never,
      AIError,
      CharacterID // Returns character ID, not string
    >;

    /**
     * Validate document for consistency issues
     *
     * Checks for:
     * - Character inconsistencies
     * - Timeline contradictions
     * - Plot holes
     */
    readonly validateConsistency: (
      document: TEIDocument
    ) => Effect.Effect<never, AIError, readonly Issue[]>;

    /**
     * Bulk detect dialogue in multiple passages
     *
     * Optimized for processing entire document at once
     */
    readonly bulkDetectDialogue: (
      passages: readonly string[]
    ) => Effect.Effect<never, AIError, readonly ReadonlyArray<readonly DialogueSpan[]>>;
  }
>() {}
```

### How This Enables Composition

**Problem 1: Retry on rate limit**

```typescript
// ✅ Compose detectDialogue with retry
const detectDialogueWithRetry = (text: string) =>
  pipe(
    AIProvider.detectDialogue(text),
    Effect.retry({
      while: (error) => error instanceof AIRateLimitError,
      schedule: Schedule.exponential('100 millis', '2s'),
    })
  );
```

**Problem 2: Cache results**

```typescript
// ✅ Compose with cache
const cache = new Map<string, readonly DialogueSpan[]>();

const detectDialogueCached = (text: string) =>
  Effect.gen(function* (_) {
    if (cache.has(text)) {
      return cache.get(text)!;
    }
    const result = yield* AIProvider.detectDialogue(text);
    cache.set(text, result);
    return result;
  });
```

**Problem 3: Log all AI calls**

```typescript
// ✅ Compose with logging
const detectDialogueLogged = (text: string) =>
  pipe(
    AIProvider.detectDialogue(text),
    Effect.tap((spans) =>
      Effect.logInfo(`Detected ${spans.length} dialogue spans in ${text.length} chars`)
    ),
    Effect.tapError((error) => Effect.logError('AI detection failed', error))
  );
```

### Mock Implementation for Tests

```typescript
/**
 * Test AI provider - deterministic responses, no API calls
 *
 * Tests can verify AI integration without hitting real API
 */
export const MockAIProvider = {
  detectDialogue: (text: string) =>
    Effect.succeed([
      {
        start: 0,
        end: Math.min(50, text.length),
        text: text.substring(0, Math.min(50, text.length)),
        confidence: 0.95,
      },
    ]),

  attributeSpeaker: (context: string, characters: readonly Character[]) =>
    Effect.succeed(characters[0]?.id || 'char-unknown'),

  validateConsistency: (document: TEIDocument) => Effect.succeed<readonly Issue[]>([]), // No issues in test

  bulkDetectDialogue: (passages: readonly string[]) =>
    Effect.sync(() =>
      passages.map(() => [{ start: 0, end: 50, text: 'Sample dialogue', confidence: 0.9 }])
    ),
};
```

---

## Protocol 3: DocumentStorage

### Purpose

Replace localStorage with explicit storage protocol. Enables testing without browser and storage layering (cache, encryption, sync).

### TypeScript Interface

```typescript
/**
 * DocumentStorage Protocol
 *
 * Abstracts storage backend (localStorage, file system, cloud).
 * All operations return Effects for composition.
 */
import { Effect } from 'effect';

// ============================================================================
// Error Types
// ============================================================================

export class StorageError extends TagClass('StorageError')<
  StorageError,
  {
    readonly message: string;
    readonly key?: string;
    readonly cause?: unknown;
  }
> {}

export class StorageKeyNotFoundError extends StorageError {
  readonly _tag = 'StorageKeyNotFoundError';
  readonly key: string;
}

export class StorageQuotaExceededError extends StorageError {
  readonly _tag = 'StorageQuotaExceededError';
  readonly quota: number;
  readonly attempted: number;
}

// ============================================================================
// Context
// ============================================================================

export class DocumentStorage extends Context.Tag('DocumentStorage')<
  DocumentStorage,
  {
    /**
     * Store a document by key
     *
     * @param key - Document identifier (e.g., 'current', 'autosave', 'backup-123')
     * @param content - XML content to store
     * @param metadata - Optional metadata (timestamp, size, etc.)
     */
    readonly set: (
      key: string,
      content: string,
      metadata?: StorageMetadata
    ) => Effect.Effect<never, StorageError, void>;

    /**
     * Retrieve a document by key
     *
     * @param key - Document identifier
     * @returns XML content or throws StorageKeyNotFoundError
     */
    readonly get: (key: string) => Effect.Effect<never, StorageError, string>;

    /**
     * Check if a key exists
     */
    readonly has: (key: string) => Effect.Effect<never, never, boolean>;

    /**
     * Delete a document by key
     */
    readonly delete: (key: string) => Effect.Effect<never, StorageError, void>;

    /**
     * List all stored document keys
     *
     * @param prefix - Optional prefix filter (e.g., 'autosave-')
     */
    readonly list: (prefix?: string) => Effect.Effect<never, StorageError, readonly string[]>;

    /**
     * Get storage metadata (size, last modified, etc.)
     */
    readonly getMetadata: (key: string) => Effect.Effect<never, StorageError, StorageMetadata>;

    /**
     * Clear all stored documents
     */
    readonly clear: (prefix?: string) => Effect.Effect<never, StorageError, void>;
  }
>() {}

// ============================================================================
// Supporting Types
// ============================================================================

export interface StorageMetadata {
  storedAt: Date;
  size: number;
  contentType: string;
  checksum?: string;
  tags?: readonly string[];
}
```

### How This Enables Composition

**Problem 1: Auto-save with debouncing**

```typescript
// ✅ Compose storage with debounce
const autoSave = pipe(
  Effect.debounce(
    (key: string, content: string) =>
      DocumentStorage.set(key, content, {
        storedAt: new Date(),
        size: content.length,
        contentType: 'application/xml',
      }),
    '2 seconds'
  )
);
```

**Problem 2: Cache + persistent storage**

```typescript
// ✅ Layer memory cache over persistent storage
const cachedStorage = {
  get: (key: string) =>
    Effect.gen(function* (_) {
      // Try memory cache first
      const cached = yield* Effect.sync(() => memoryCache.get(key));
      if (cached) return cached;

      // Fall back to persistent storage
      const value = yield* DocumentStorage.get(key);
      memoryCache.set(key, value);
      return value;
    }),

  set: (key: string, value: string, metadata?: StorageMetadata) =>
    Effect.gen(function* (_) {
      // Update both cache and storage
      yield* Effect.sync(() => memoryCache.set(key, value));
      yield* DocumentStorage.set(key, value, metadata);
    }),
};
```

**Problem 3: Storage with encryption**

```typescript
// ✅ Layer encryption over storage
const encryptedStorage = {
  get: (key: string) =>
    pipe(
      DocumentStorage.get(key),
      Effect.flatMap((encrypted) =>
        decrypt(encrypted).pipe(
          Effect.mapError((e) => new StorageError({ message: 'Decryption failed', cause: e }))
        )
      )
    ),

  set: (key: string, content: string, metadata?: StorageMetadata) =>
    pipe(
      encrypt(content),
      Effect.flatMap((encrypted) => DocumentStorage.set(key, encrypted, metadata)),
      Effect.mapError((e) => new StorageError({ message: 'Encryption failed', cause: e }))
    ),
};
```

### Browser Implementation

```typescript
/**
 * Browser localStorage implementation
 *
 * Wraps localStorage API in Effect for error handling and composition.
 */
export const BrowserDocumentStorage: DocumentStorage = {
  get: (key: string) =>
    Effect.try({
      try: () => {
        const value = localStorage.getItem(key);
        if (value === null) {
          throw new StorageKeyNotFoundError({ key, message: `Key not found: ${key}` });
        }
        return value;
      },
      catch: (error) =>
        new StorageError({
          message: `Failed to get ${key}`,
          key,
          cause: error,
        }),
    }),

  set: (key: string, content: string, metadata?: StorageMetadata) =>
    Effect.try({
      try: () => {
        localStorage.setItem(key, content);
        if (metadata) {
          localStorage.setItem(`${key}-metadata`, JSON.stringify(metadata));
        }
      },
      catch: (error) => {
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
          return new StorageQuotaExceededError({
            message: 'Storage quota exceeded',
            key,
            quota: 5 * 1024 * 1024, // 5MB typical localStorage limit
            attempted: content.length,
          });
        }
        return new StorageError({ message: `Failed to set ${key}`, key, cause: error });
      },
    }),

  has: (key: string) => Effect.sync(() => localStorage.getItem(key) !== null),

  delete: (key: string) =>
    Effect.try({
      try: () => localStorage.removeItem(key),
      catch: (error) => new StorageError({ message: `Failed to delete ${key}`, key, cause: error }),
    }),

  list: (prefix?: string) =>
    Effect.sync(() => {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (!prefix || key.startsWith(prefix))) {
          keys.push(key);
        }
      }
      return keys;
    }),

  getMetadata: (key: string) =>
    Effect.try({
      try: () => {
        const metadataJson = localStorage.getItem(`${key}-metadata`);
        if (!metadataJson) {
          throw new StorageKeyNotFoundError({ key, message: `Metadata not found for ${key}` });
        }
        return JSON.parse(metadataJson) as StorageMetadata;
      },
      catch: (error) =>
        new StorageError({ message: `Failed to get metadata for ${key}`, key, cause: error }),
    }),

  clear: (prefix?: string) =>
    Effect.sync(() => {
      if (prefix) {
        // Clear only keys with prefix
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(prefix)) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((key) => localStorage.removeItem(key));
      } else {
        localStorage.clear();
      }
    }),
};
```

### Mock Implementation for Tests

```typescript
/**
 * In-memory storage for tests
 *
 * Pure values, no browser required. Test isolation is automatic
 * since each test creates its own instance.
 */
export class TestDocumentStorage implements DocumentStorage {
  private store = new Map<string, { content: string; metadata?: StorageMetadata }>();

  get(key: string) {
    return Effect.sync(() => {
      const entry = this.store.get(key);
      if (!entry) {
        throw new StorageKeyNotFoundError({ key, message: `Key not found: ${key}` });
      }
      return entry.content;
    });
  }

  set(key: string, content: string, metadata?: StorageMetadata) {
    return Effect.sync(() => {
      this.store.set(key, { content, metadata });
    });
  }

  has(key: string) {
    return Effect.sync(() => this.store.has(key));
  }

  delete(key: string) {
    return Effect.sync(() => {
      this.store.delete(key);
    });
  }

  list(prefix?: string) {
    return Effect.sync(() => {
      const keys = Array.from(this.store.keys());
      return prefix ? keys.filter((k) => k.startsWith(prefix)) : keys;
    });
  }

  getMetadata(key: string) {
    return Effect.sync(() => {
      const entry = this.store.get(key);
      if (!entry?.metadata) {
        throw new StorageKeyNotFoundError({ key, message: `Metadata not found: ${key}` });
      }
      return entry.metadata;
    });
  }

  clear(prefix?: string) {
    return Effect.sync(() => {
      if (prefix) {
        const keysToRemove = Array.from(this.store.keys()).filter((k) => k.startsWith(prefix));
        keysToRemove.forEach((k) => this.store.delete(k));
      } else {
        this.store.clear();
      }
    });
  }
}
```

---

## Protocol 4: ValidationService

### Purpose

Validate TEI documents against RelaxNG schemas with detailed error reporting. Replaces current ValidationService with composable Effect-based version.

### Current Implementation Issues

```typescript
// ❌ Current: Tight coupling, no composition
class ValidationService {
  private schemaLoader: SchemaLoader; // Mutable instance

  async validateDocument(xmlContent: string, schemaPath?: string) {
    // Side effects hidden: caches schemas, throws exceptions
    const schemaResult = await this.schemaLoader.validate(xmlContent, effectiveSchemaPath);
    // ...
  }
}
```

### Enhanced Effect-Based Interface

```typescript
/**
 * ValidationService Protocol (Effect-based)
 *
 * Validates XML documents against RelaxNG schemas.
 * All operations return Effects for composition.
 */
import { Effect } from 'effect';
import type { TEIDocument } from '@/lib/tei/types';

// ============================================================================
// Error Types
// ============================================================================

export class ValidationError extends TagClass('ValidationError')<
  ValidationError,
  {
    readonly message: string;
    readonly line?: number;
    readonly column?: number;
    readonly context?: string;
  }
> {}

export class SchemaLoadError extends ValidationError {
  readonly _tag = 'SchemaLoadError';
  readonly schemaPath: string;
  readonly cause: unknown;
}

export class ValidationExecutionError extends ValidationError {
  readonly _tag = 'ValidationExecutionError';
  readonly xmlContent: string;
  readonly schemaPath: string;
}

// ============================================================================
// Context
// ============================================================================

export class ValidationService extends Context.Tag('ValidationService')<
  ValidationService,
  {
    /**
     * Validate XML document against schema
     *
     * @param xmlContent - XML content to validate
     * @param schemaPath - Path to RelaxNG schema file
     * @returns Validation result with errors and warnings
     */
    readonly validateDocument: (
      xmlContent: string,
      schemaPath: string
    ) => Effect.Effect<never, ValidationError, ValidationResult>;

    /**
     * Validate TEI document (parsed)
     *
     * Higher-level validation that includes:
     * - Schema validation
     * - Consistency checks
     * - Business rules (e.g., speaker IDs must exist)
     */
    readonly validateTEIDocument: (
      document: TEIDocument,
      schemaPath: string
    ) => Effect.Effect<never, ValidationError, ValidationResult>;

    /**
     * Preload schema for faster subsequent validations
     *
     * Schema loading is expensive - preload when app initializes
     */
    readonly preloadSchema: (schemaPath: string) => Effect.Effect<never, SchemaLoadError, void>;

    /**
     * Get allowed tags for current XML context
     *
     * Useful for editor autocomplete/intellisense
     */
    readonly getAllowedTags: (
      schemaPath: string,
      context: XmlPath
    ) => Effect.Effect<never, SchemaLoadError, readonly TagDefinition[]>;

    /**
     * Get attributes allowed for a tag
     *
     * Useful for editor autocomplete
     */
    readonly getTagAttributes: (
      schemaPath: string,
      tagName: string
    ) => Effect.Effect<never, SchemaLoadError, readonly AttributeDefinition[]>;

    /**
     * Clear schema cache
     */
    readonly clearCache: (schemaPath?: string) => Effect.Effect<never, never, void>;
  }
>() {}

// ============================================================================
// Supporting Types
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: readonly ValidationError[];
  warnings: readonly ValidationWarning[];
  suggestions?: readonly FixSuggestion[];
}

export interface ValidationWarning {
  message: string;
  line?: number;
  column?: number;
  code?: string;
  severity?: 'info' | 'warning';
}

export interface FixSuggestion {
  type: 'add-element' | 'remove-element' | 'modify-attribute' | 'rename-element' | 'other';
  message: string;
  line?: number;
  column?: number;
  suggestion?: string;
}

export interface TagDefinition {
  name: string;
  namespace?: string;
  required: boolean;
  repeatable: boolean;
}

export interface AttributeDefinition {
  name: string;
  namespace?: string;
  required: boolean;
  type?: string;
}

export type XmlPath = ReadonlyArray<{ name: string; namespace?: string }>;
```

### How This Enables Composition

**Problem 1: Validate on document load**

```typescript
// ✅ Compose load + validate
const loadAndValidateDocument = (xml: string) =>
  Effect.gen(function* (_) {
    const doc = yield* DocumentOperations.loadDocument(xml);
    const schemaPath = getDefaultSchemaPath();
    const validation = yield* ValidationService.validateTEIDocument(doc, schemaPath);
    if (!validation.valid) {
      yield* Effect.logError('Document validation failed', validation.errors);
    }
    return { document: doc, validation };
  });
```

**Problem 2: Auto-validate on changes**

```typescript
// ✅ Compose document operations with validation
const addTagAndValidate = (
  doc: TEIDocument,
  passageId: PassageID,
  range: TextRange,
  speaker: CharacterID
) =>
  Effect.gen(function* (_) {
    const updated = yield* DocumentOperations.addSaidTag(doc, passageId, range, speaker);
    const schemaPath = getDefaultSchemaPath();
    const validation = yield* ValidationService.validateTEIDocument(updated, schemaPath);
    return { document: updated, validation };
  });
```

**Problem 3: Cache validation results**

```typescript
// ✅ Layer cache over validation
const validationCache = new Map<string, ValidationResult>();

const validateCached = (xml: string, schemaPath: string) =>
  Effect.gen(function* (_) {
    const cacheKey = `${schemaPath}:${hash(xml)}`;
    const cached = validationCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    const result = yield* ValidationService.validateDocument(xml, schemaPath);
    validationCache.set(cacheKey, result);
    return result;
  });
```

### Browser Implementation

```typescript
/**
 * Browser validation service implementation
 *
 * Wraps existing SchemaLoader in Effect for composition.
 */
export const BrowserValidationService: ValidationService = {
  validateDocument: (xmlContent: string, schemaPath: string) =>
    Effect.tryPromise({
      try: async () => {
        const schemaLoader = new SchemaLoader();
        const result = await schemaLoader.validate(xmlContent, schemaPath);
        return {
          valid: result.valid,
          errors: result.errors.map(
            (e) =>
              new ValidationError({
                message: e.message || 'Unknown error',
                line: e.line,
                column: e.column,
                context: e.context,
              })
          ),
          warnings: [],
          suggestions: [],
        };
      },
      catch: (error) =>
        new ValidationError({
          message: `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
        }),
    }),

  validateTEIDocument: (document: TEIDocument, schemaPath: string) =>
    Effect.gen(function* (_) {
      // Schema validation
      const schemaResult = yield* ValidationService.validateDocument(
        document.state.xml,
        schemaPath
      );

      // Additional business rule validation
      const businessErrors: ValidationError[] = [];

      // Check that all speaker IDs exist
      for (const dialogue of document.state.dialogue) {
        if (dialogue.speaker) {
          const characterExists = document.state.characters.some((c) => c.id === dialogue.speaker);
          if (!characterExists) {
            businessErrors.push(
              new ValidationError({
                message: `Speaker ${dialogue.speaker} not found in character list`,
                context: `Dialogue ${dialogue.id} in passage ${dialogue.passageId}`,
              })
            );
          }
        }
      }

      return {
        valid: schemaResult.valid && businessErrors.length === 0,
        errors: [...schemaResult.errors, ...businessErrors],
        warnings: schemaResult.warnings,
        suggestions: schemaResult.suggestions,
      };
    }),

  preloadSchema: (schemaPath: string) =>
    Effect.tryPromise({
      try: async () => {
        const schemaLoader = new SchemaLoader();
        await schemaLoader.loadSchema(schemaPath);
      },
      catch: (error) =>
        new SchemaLoadError({
          message: `Failed to load schema: ${error instanceof Error ? error.message : String(error)}`,
          schemaPath,
          cause: error,
        }),
    }),

  getAllowedTags: (schemaPath: string, context: XmlPath) =>
    Effect.try({
      try: () => {
        const schemaLoader = new SchemaLoader();
        return schemaLoader.getAllowedTags(schemaPath, context);
      },
      catch: (error) =>
        new SchemaLoadError({
          message: `Failed to get allowed tags: ${error instanceof Error ? error.message : String(error)}`,
          schemaPath,
          cause: error,
        }),
    }),

  getTagAttributes: (schemaPath: string, tagName: string) =>
    Effect.try({
      try: () => {
        const schemaLoader = new SchemaLoader();
        return schemaLoader.getTagAttributes(schemaPath, tagName);
      },
      catch: (error) =>
        new SchemaLoadError({
          message: `Failed to get tag attributes: ${error instanceof Error ? error.message : String(error)}`,
          schemaPath,
          cause: error,
        }),
    }),

  clearCache: (schemaPath?: string) =>
    Effect.sync(() => {
      // Clear cache in SchemaLoader singleton
      SchemaLoader.clearCache();
    }),
};
```

### Mock Implementation for Tests

```typescript
/**
 * Test validation service - deterministic validation, no file system
 *
 * Tests can specify validation results via configuration.
 */
export class MockValidationService implements ValidationService {
  private schemas = new Map<string, any>();
  private validationResults = new Map<string, ValidationResult>();

  // Configure mock to return specific results
  setValidationResult(xmlHash: string, result: ValidationResult) {
    this.validationResults.set(xmlHash, result);
  }

  validateDocument(xmlContent: string, schemaPath: string) {
    return Effect.sync(() => {
      const hash = simpleHash(xmlContent);
      const mockResult = this.validationResults.get(hash);

      if (mockResult) {
        return mockResult;
      }

      // Default: valid document
      return {
        valid: true,
        errors: [],
        warnings: [],
        suggestions: [],
      };
    });
  }

  validateTEIDocument(document: TEIDocument, schemaPath: string) {
    return this.validateDocument(document.state.xml, schemaPath);
  }

  preloadSchema(schemaPath: string) {
    return Effect.sync(() => {
      // Pretend to load schema
      this.schemas.set(schemaPath, { loaded: true });
    });
  }

  getAllowedTags(schemaPath: string, context: XmlPath) {
    return Effect.succeed([
      { name: 'said', required: false, repeatable: true },
      { name: 'q', required: false, repeatable: true },
      { name: 'persName', required: false, repeatable: true },
    ]);
  }

  getTagAttributes(schemaPath: string, tagName: string) {
    return Effect.succeed([
      { name: 'who', required: false, type: 'string' },
      { name: 'direct', required: false, type: 'boolean' },
    ]);
  }

  clearCache(schemaPath?: string) {
    return Effect.sync(() => {
      if (schemaPath) {
        this.schemas.delete(schemaPath);
      } else {
        this.schemas.clear();
      }
    });
  }
}
```

---

## Composition Patterns

### Pattern 1: Layered Services

Add cross-cutting concerns without modifying core protocols:

```typescript
// Core service
const storage = DocumentStorage;

// Layer 1: Add caching
const cachedStorage = {
  ...storage,
  get: (key: string) =>
    pipe(
      storage.get(key),
      Effect.cached // Built-in Effect caching
    ),
};

// Layer 2: Add logging
const loggedStorage = {
  ...cachedStorage,
  get: (key: string) =>
    pipe(
      cachedStorage.get(key),
      Effect.tap((value) => Effect.logInfo(`Retrieved ${key}, size: ${value.length}`))
    ),
};

// Layer 3: Add metrics
const measuredStorage = {
  ...loggedStorage,
  get: (key: string) =>
    pipe(
      loggedStorage.get(key),
      Effect.tap((value) => Effect.incrementCounter('storage.get.count'))
    ),
};
```

### Pattern 2: Error Recovery

Handle errors gracefully with retries and fallbacks:

```typescript
const robustAIDetection = (text: string) =>
  pipe(
    AIProvider.detectDialogue(text),
    // Retry on rate limit
    Effect.retry({
      while: (error) => error instanceof AIRateLimitError,
      schedule: Schedule.exponential('100 millis', '10s'),
    }),
    // Fallback to mock on authentication error
    Effect.catchIf(
      (error) => error instanceof AIAuthenticationError,
      () => MockAIProvider.detectDialogue(text)
    ),
    // Log all errors
    Effect.tapError((error) => Effect.logError('AI detection failed after retries', error))
  );
```

### Pattern 3: Dependency Injection

Replace implementations for tests without changing production code:

```typescript
// Production
const program = pipe(
  DocumentOperations.loadDocument(xml),
  Effect.provideService(AIProvider, OpenAIProvider),
  Effect.provideService(DocumentStorage, BrowserDocumentStorage),
  Effect.provideService(ValidationService, BrowserValidationService)
);

// Test
const testProgram = pipe(
  DocumentOperations.loadDocument(xml),
  Effect.provideService(AIProvider, MockAIProvider),
  Effect.provideService(DocumentStorage, new TestDocumentStorage()),
  Effect.provideService(ValidationService, new MockValidationService())
);
```

### Pattern 4: Parallel Execution

Execute independent operations in parallel:

```typescript
const validateAndAnalyze = (xml: string) =>
  Effect.all(
    [
      ValidationService.validateDocument(xml, schemaPath),
      AIProvider.detectDialogue(xml),
      DocumentOperations.loadDocument(xml),
    ],
    { concurrency: 'inherit' }
  );
```

---

## Implementation Roadmap

### Phase 1: Core Protocols (Week 1-2)

**Goal:** Define all protocol interfaces with mock implementations

1. **DocumentOperations**
   - [ ] Create protocol interface in `/lib/protocols/DocumentOperations.ts`
   - [ ] Create mock implementation in `/lib/protocols/__tests__/DocumentOperations.mock.ts`
   - [ ] Write unit tests for mock (verify pure functions work)
   - [ ] Document Effect signatures

2. **AIProvider**
   - [ ] Extend existing interface in `/lib/ai/providers.ts`
   - [ ] Create Effect-based wrapper functions
   - [ ] Create mock implementation
   - [ ] Write tests for mock responses

3. **DocumentStorage**
   - [ ] Create protocol interface in `/lib/protocols/DocumentStorage.ts`
   - [ ] Create browser implementation (wraps localStorage)
   - [ ] Create mock implementation for tests
   - [ ] Write tests for both implementations

4. **ValidationService**
   - [ ] Create protocol interface in `/lib/protocols/ValidationService.ts`
   - [ ] Wrap existing ValidationService in Effect
   - [ ] Create mock implementation
   - [ ] Write tests

**Deliverable:** All 4 protocols defined with working mocks, green tests

### Phase 2: Integration Layer (Week 3)

**Goal:** Connect protocols to existing components

1. **Create Effect services**
   - [ ] Wire protocols together in `/lib/services/index.ts`
   - [ ] Create service context for dependency injection
   - [ ] Add logging layer to all services
   - [ ] Add error handling layer

2. **Update DocumentContext**
   - [ ] Replace reducer with Effect-based operations
   - [ ] Change from mutation to Effect programs
   - [ ] Keep React integration (useEffect for running Effects)
   - [ ] Add error boundaries

3. **Update components**
   - [ ] Refactor EditorLayout to use Effect operations
   - [ ] Remove useState hooks (use Effect.runPromise instead)
   - [ ] Update test helpers to use mocks

**Deliverable:** Running app with Effect-based architecture

### Phase 3: Test Architecture (Week 4)

**Goal:** Rewrite tests using protocol mocks

1. **E2E tests**
   - [ ] Update test helpers to use protocol mocks
   - [ ] Remove brittle DOM polling
   - [ ] Use Effect assertions (verify program outputs)
   - [ ] Add time travel debugging (inspect event logs)

2. **Unit tests**
   - [ ] Replace enzyme/vitest with Effect tests
   - [ ] Test composition patterns
   - [ ] Test error scenarios (network failure, etc.)
   - [ ] Test retry logic

**Deliverable:** All tests passing with protocol mocks

### Phase 4: Advanced Features (Week 5+)

**Goal:** Add features enabled by composition

1. **Auto-save with debouncing**

   ```typescript
   const autoSave = Effect.debounce(
     (doc: TEIDocument) => DocumentStorage.save('autosave', doc),
     '2 seconds'
   );
   ```

2. **Offline support**

   ```typescript
   const storage = pipe(DocumentStorage, Effect.fallback(NetworkStorage, LocalStorage));
   ```

3. **Real-time collaboration**
   ```typescript
   const sync = pipe(DocumentStorage, Effect.websocket(WebsocketSync));
   ```

**Deliverable:** Production-ready with advanced features

---

## Testing Strategy

### Unit Tests with Protocols

```typescript
import { describe, it } from 'vitest';
import { Effect } from 'effect';
import { MockAIProvider, MockDocumentStorage } from '@/lib/protocols';

describe('DocumentOperations', () => {
  it('should load and validate document', async () => {
    const program = Effect.gen(function* (_) {
      const doc = yield* DocumentOperations.loadDocument(sampleXML);
      const validation = yield* ValidationService.validateDocument(doc.state.xml, schemaPath);
      expect(validation.valid).toBe(true);
      return doc;
    });

    const result = await Effect.runPromise(
      pipe(
        program,
        Effect.provideService(AIProvider, MockAIProvider),
        Effect.provideService(ValidationService, new MockValidationService())
      )
    );

    expect(result.state.passages.length).toBeGreaterThan(0);
  });
});
```

### E2E Tests with Protocols

```typescript
import { test, expect } from '@playwright/test';

test('should add tag and auto-save', async ({ page }) => {
  // Use test helper that provides protocol mocks
  const { documentService, storageService } = setupTestEnvironment(page);

  // Load document
  await documentService.loadDocument(sampleXML);

  // Add tag
  await documentService.addSaidTag(doc, passageId, range, speaker);

  // Verify auto-save happened (no polling!)
  const saved = await storageService.get('autosave');
  expect(saved).toContain('<said');
});
```

---

## Success Metrics

### Before (Current Architecture)

- **Test reliability:** 70% (brittle DOM polling, hidden state)
- **Test speed:** 5s per test (localStorage, network mocks)
- **Code entanglement:** 22 useState hooks in one component
- **Composition:** Impossible (can't retry, cache, layer)

### After (Effect Architecture)

- **Test reliability:** 99% (deterministic mocks, explicit state)
- **Test speed:** 50ms per test (pure values, no I/O)
- **Code entanglement:** 0 useState (Effect programs instead)
- **Composition:** Trivial (pipe operations, add layers)

---

## Next Steps

1. **Review this document** with team
2. **Create RFC** (Request for Comments) for feedback
3. **Start Phase 1** (Core Protocols) in worktree
4. **Weekly syncs** to review progress
5. **Measure impact** after Phase 2 (integration)

---

## Appendix: Effect Resources

### Learning Effect

- **Official docs:** https://effect.website/
- **Tutorial:** https://effect.website/docs/guide/
- **Patterns:** https://effect.website/docs/patterns/

### Key Concepts

- **Effect:** A composable program
- **Context:** Dependency injection
- **Layer:** Compose multiple contexts
- **Schedule:** Retry/repeat strategies
- **Scope:** Resource management

### Code Examples

See Phase 1 implementation for working examples of all 4 protocols.

---

**End of Protocol Design Document**
