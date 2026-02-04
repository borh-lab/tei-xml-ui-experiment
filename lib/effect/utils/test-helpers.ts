/**
 * Effect Testing Utilities
 *
 * Provides helper functions and test implementations for testing
 * Effect-based services in isolation without browser dependencies.
 *
 * These utilities enable:
 * - Fast unit tests (no browser, no I/O)
 * - Deterministic test behavior (pure values, no side effects)
 * - Test isolation (each test gets fresh instances)
 * - Easy mocking (swap implementations without changing code)
 */

import { Effect, Layer, Context } from 'effect';

// ============================================================================
// Test Context
// ============================================================================

/**
 * Test context provides all required services for tests
 *
 * Tests can provide this context to Effect programs to run them
 * with mock implementations instead of real browser/services.
 */
export interface TestContext {
  readonly storage: TestStorageService;
  readonly validation: TestValidationService;
  readonly ai: MockAIService;
  readonly document: TestDocumentService;
}

// ============================================================================
// Mock Storage Service (In-Memory)
// ============================================================================

/**
 * In-memory storage for tests
 *
 * Simulates localStorage without touching the browser.
 * Each instance is isolated - perfect for test isolation.
 */
export class TestStorageService {
  private store = new Map<string, string>();

  /**
   * Get value from storage
   */
  get<T>(key: string): Effect.Effect<T | null, never> {
    return Effect.sync(() => {
      const value = this.store.get(key);
      if (!value) return null;

      try {
        return JSON.parse(value) as T;
      } catch {
        return value as T;
      }
    });
  }

  /**
   * Set value in storage
   */
  set<T>(key: string, value: T): Effect.Effect<void, never> {
    return Effect.sync(() => {
      this.store.set(key, JSON.stringify(value));
    });
  }

  /**
   * Remove value from storage
   */
  remove(key: string): Effect.Effect<void, never> {
    return Effect.sync(() => {
      this.store.delete(key);
    });
  }

  /**
   * Clear all values
   */
  clear(): Effect.Effect<void, never> {
    return Effect.sync(() => {
      this.store.clear();
    });
  }

  /**
   * Check if key exists
   */
  has(key: string): Effect.Effect<boolean, never> {
    return Effect.sync(() => this.store.has(key));
  }

  /**
   * Get all keys
   */
  keys(): Effect.Effect<readonly string[], never> {
    return Effect.sync(() => Array.from(this.store.keys()));
  }

  /**
   * Get storage size (number of items)
   */
  size(): Effect.Effect<number, never> {
    return Effect.sync(() => this.store.size);
  }
}

// ============================================================================
// Mock Validation Service
// ============================================================================

/**
 * Test validation service
 *
 * Provides deterministic validation results for testing.
 * Configure specific validation results per test.
 */
export class TestValidationService {
  private validationResults = new Map<string, ValidationResult>();
  private defaultResult: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  /**
   * Set validation result for specific XML content
   */
  setValidationResult(xmlHash: string, result: ValidationResult): void {
    this.validationResults.set(xmlHash, result);
  }

  /**
   * Set default validation result (used when no specific result set)
   */
  setDefaultResult(result: ValidationResult): void {
    this.defaultResult = result;
  }

  /**
   * Validate XML document
   */
  validate(xml: string): Effect.Effect<ValidationResult, never> {
    return Effect.sync(() => {
      const hash = simpleHash(xml);
      return this.validationResults.get(hash) || this.defaultResult;
    });
  }

  /**
   * Clear all configured results
   */
  clear(): void {
    this.validationResults.clear();
  }
}

// ============================================================================
// Mock AI Service
// ============================================================================

/**
 * Test AI service
 *
 * Returns deterministic AI responses without hitting real API.
 * Configure responses per test scenario.
 */
export class MockAIService {
  private dialogueSpans: DialogueSpan[] = [
    {
      start: 0,
      end: 50,
      text: 'Sample dialogue',
      confidence: 0.95,
    },
  ];

  private speakerAttribution: string = 'speaker-1';

  /**
   * Set dialogue spans to return from detectDialogue
   */
  setDialogueSpans(spans: DialogueSpan[]): void {
    this.dialogueSpans = spans;
  }

  /**
   * Set speaker to return from attributeSpeaker
   */
  setSpeakerAttribution(speakerId: string): void {
    this.speakerAttribution = speakerId;
  }

  /**
   * Detect dialogue in text
   */
  detectDialogue(text: string): Effect.Effect<readonly DialogueSpan[], never> {
    return Effect.sync(() => this.dialogueSpans);
  }

  /**
   * Attribute speaker to dialogue
   */
  attributeSpeaker(
    text: string,
    dialogue: readonly DialogueSpan[]
  ): Effect.Effect<string, never> {
    return Effect.sync(() => this.speakerAttribution);
  }

  /**
   * Validate document consistency
   */
  validateConsistency(document: any): Effect.Effect<readonly Issue[], never> {
    return Effect.sync(() => []);
  }
}

// ============================================================================
// Mock Document Service
// ============================================================================

/**
 * Test document service
 *
 * Provides in-memory document storage for testing document operations.
 */
export class TestDocumentService {
  private document: TEIDocument | null = null;
  private events: DocumentEvent[] = [];

  /**
   * Load document from XML
   */
  load(xml: string): Effect.Effect<TEIDocument, never> {
    return Effect.sync(() => {
      // Create mock document
      const doc: TEIDocument = {
        state: {
          xml,
          revision: 0,
          metadata: {
            title: 'Test Document',
            author: 'Test Author',
          },
          passages: [],
          dialogue: [],
          characters: [],
          relationships: [],
        },
        events: [
          {
            type: 'loaded',
            xml,
            timestamp: Date.now(),
            revision: 0,
          },
        ],
      };

      this.document = doc;
      this.events = doc.events;
      return doc;
    });
  }

  /**
   * Get current document
   */
  getDocument(): Effect.Effect<TEIDocument, never> {
    return Effect.sync(() => {
      if (!this.document) {
        throw new Error('No document loaded');
      }
      return this.document;
    });
  }

  /**
   * Add tag to document
   */
  addTag(
    passageId: PassageID,
    range: TextRange,
    tagName: string,
    attributes?: Record<string, string>
  ): Effect.Effect<TEIDocument, never> {
    return Effect.sync(() => {
      if (!this.document) {
        throw new Error('No document loaded');
      }

      // Create new document with tag added
      const newDoc: TEIDocument = {
        ...this.document,
        state: {
          ...this.document.state,
          revision: this.document.state.revision + 1,
        },
        events: [
          ...this.events,
          {
            type: 'tag-added',
            id: `tag-${Date.now()}`,
            passageId,
            range,
            tagName,
            attributes,
            timestamp: Date.now(),
            revision: this.document.state.revision + 1,
          },
        ],
      };

      this.document = newDoc;
      this.events = newDoc.events;
      return newDoc;
    });
  }

  /**
   * Remove tag from document
   */
  removeTag(tagId: string): Effect.Effect<TEIDocument, never> {
    return Effect.sync(() => {
      if (!this.document) {
        throw new Error('No document loaded');
      }

      const newDoc: TEIDocument = {
        ...this.document,
        state: {
          ...this.document.state,
          revision: this.document.state.revision + 1,
        },
        events: [
          ...this.events,
          {
            type: 'tag-removed',
            id: tagId,
            timestamp: Date.now(),
            revision: this.document.state.revision + 1,
          },
        ],
      };

      this.document = newDoc;
      this.events = newDoc.events;
      return newDoc;
    });
  }
}

// ============================================================================
// Test Layer (Dependency Injection)
// ============================================================================

/**
 * Create test layer with all mock services
 *
 * Provides all mock implementations as an Effect Layer for easy
 * dependency injection in tests.
 */
export function createTestLayer(): Layer.Layer<never> {
  return Layer.mergeAll(
    Layer.effectDiscard(Effect.succeed(new TestStorageService())),
    Layer.effectDiscard(Effect.succeed(new TestValidationService())),
    Layer.effectDiscard(Effect.succeed(new MockAIService())),
    Layer.effectDiscard(Effect.succeed(new TestDocumentService()))
  );
}

// ============================================================================
// Test Runner
// ============================================================================

/**
 * Run Effect test with test context
 *
 * Convenience function to run Effect programs with mock services.
 *
 * @example
 * ```ts
 * test('should load document', async () => {
 *   const program = Effect.gen(function* (_) {
 *     const doc = yield* _(DocumentService.load(testXML));
 *     expect(doc.state.metadata.title).toBeDefined();
 *   });
 *
 *   await runEffectTest(program);
 * });
 * ```
 */
export async function runEffectTest<A>(
  effect: Effect.Effect<A, never, TestContext>
): Promise<A> {
  return Effect.runPromise(
    Effect.provide(effect, createTestLayer())
  );
}

/**
 * Run Effect test with custom services
 *
 * Allows overriding specific mock services for test scenarios.
 *
 * @example
 * ```ts
 * test('should handle validation errors', async () => {
 *   const validation = new TestValidationService();
 *   validation.setValidationResult(hash(xml), {
 *     valid: false,
 *     errors: [new ValidationError('Invalid XML')],
 *   });
 *
 *   const program = Effect.gen(function* (_) {
 *     // ... test logic
 *   });
 *
 *   await runEffectTestWithServices(program, { validation });
 * });
 * ```
 */
export async function runEffectTestWithServices<A>(
  effect: Effect.Effect<A, never, Partial<TestContext>>,
  services: Partial<TestContext>
): Promise<A> {
  return Effect.runPromise(
    Effect.provide(
      effect,
      Layer.mergeAll(
        Layer.effectDiscard(Effect.succeed(services.storage || new TestStorageService())),
        Layer.effectDiscard(Effect.succeed(services.validation || new TestValidationService())),
        Layer.effectDiscard(Effect.succeed(services.ai || new MockAIService())),
        Layer.effectDiscard(Effect.succeed(services.document || new TestDocumentService()))
      )
    )
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Simple hash function for test keys
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash;
}

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Validation result
 */
export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly ValidationError[];
  readonly warnings: readonly ValidationWarning[];
}

/**
 * Validation error
 */
export interface ValidationError {
  readonly message: string;
  readonly line?: number;
  readonly column?: number;
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  readonly message: string;
  readonly line?: number;
  readonly column?: number;
}

/**
 * Dialogue span
 */
export interface DialogueSpan {
  readonly start: number;
  readonly end: number;
  readonly text: string;
  readonly confidence: number;
}

/**
 * Issue
 */
export interface Issue {
  readonly type: string;
  readonly message: string;
  readonly location?: string;
}

/**
 * TEI Document
 */
export interface TEIDocument {
  readonly state: DocumentState;
  readonly events: readonly DocumentEvent[];
}

/**
 * Document state
 */
export interface DocumentState {
  readonly xml: string;
  readonly revision: number;
  readonly metadata: DocumentMetadata;
  readonly passages: readonly Passage[];
  readonly dialogue: readonly Dialogue[];
  readonly characters: readonly Character[];
  readonly relationships: readonly Relationship[];
}

/**
 * Document metadata
 */
export interface DocumentMetadata {
  readonly title: string;
  readonly author: string;
}

/**
 * Passage
 */
export interface Passage {
  readonly id: string;
  readonly content: string;
}

/**
 * Dialogue
 */
export interface Dialogue {
  readonly id: string;
  readonly passageId: string;
  readonly speaker: string;
}

/**
 * Character
 */
export interface Character {
  readonly id: string;
  readonly name: string;
}

/**
 * Relationship
 */
export interface Relationship {
  readonly id: string;
  readonly from: string;
  readonly to: string;
}

/**
 * Document event
 */
export type DocumentEvent =
  | { readonly type: 'loaded'; readonly xml: string; readonly timestamp: number; readonly revision: number }
  | { readonly type: 'tag-added'; readonly id: string; readonly passageId: string; readonly range: TextRange; readonly tagName: string; readonly attributes?: Record<string, string>; readonly timestamp: number; readonly revision: number }
  | { readonly type: 'tag-removed'; readonly id: string; readonly timestamp: number; readonly revision: number };

/**
 * Text range
 */
export interface TextRange {
  readonly start: number;
  readonly end: number;
}

/**
 * Passage ID
 */
export type PassageID = string;

/**
 * Character ID
 */
export type CharacterID = string;
