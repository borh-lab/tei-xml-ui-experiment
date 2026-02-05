// @ts-nocheck
/**
 * DocumentService Implementation
 *
 * Live implementation of DocumentService protocol using Effect and event sourcing.
 * Provides all document operations as composable Effect programs.
 */

import { Effect, Layer, Context, Ref, Option } from 'effect';
import {
  loadDocument as loadDocumentOp,
  addSaidTag as addSaidTagOp,
  addTag as addQTagOp,
  addPersNameTag as addPersNameTagOp,
  removeTag as removeTagOp,
  addCharacter as addCharacterOp,
  updateCharacter as updateCharacterOp,
  removeCharacter as removeCharacterOp,
  addRelationship as addRelationshipOp,
  removeRelationship as removeRelationshipOp,
} from '@/lib/tei/operations';
import {
  DocumentService,
  DocumentError,
  DocumentNotFoundError,
  DocumentParseError,
  InvalidOperationError,
  HistoryState,
} from '../protocols/Document';
import type {
  TEIDocument,
  PassageID,
  CharacterID,
  TextRange,
  Character,
  Relationship,
  DocumentEvent,
} from '../protocols/Document';

// ============================================================================
// DocumentService Implementation
// ============================================================================

/**
 * Make DocumentService
 *
 * Creates the DocumentService implementation with:
 * - Ref for storing current document (mutable reference in Effect)
 * - Event log for history
 * - All operations as Effect programs
 */
const makeDocumentService = Effect.gen(function* (_) {
  // Store document in Ref (Effect's mutable reference)
  const documentRef = yield* _(Ref.make<TEIDocument | null>(null));

  // ========================================================================
  // Document Lifecycle
  // ========================================================================

  const loadDocument = (xml: string): Effect.Effect<TEIDocument, DocumentParseError> =>
    Effect.gen(function* (_) {
      try {
        // Load document using existing pure function
        const doc = loadDocumentOp(xml);

        // Store in ref
        yield* _(Ref.set(documentRef, doc));

        return doc;
      } catch (error) {
        return yield* _(
          Effect.fail(
            new DocumentParseError({
              message: `Failed to parse document: ${error instanceof Error ? error.message : String(error)}`,
              xml,
              cause: error,
            })
          )
        );
      }
    });

  const getDocument = (): Effect.Effect<TEIDocument, DocumentNotFoundError> =>
    Effect.gen(function* (_) {
      const doc = yield* _(Ref.get(documentRef));

      if (!doc) {
        return yield* _(
          Effect.fail(
            new DocumentNotFoundError({
              message: 'No document loaded',
            })
          )
        );
      }

      return doc;
    });

  // ========================================================================
  // Tag Operations
  // ========================================================================

  const addSaidTag = (
    passageId: PassageID,
    range: TextRange,
    speaker: CharacterID
  ): Effect.Effect<TEIDocument, InvalidOperationError> =>
    Effect.gen(function* (_) {
      const doc = yield* _(getDocument());

      try {
        // Add tag using existing pure function
        const updated = addSaidTagOp(doc, passageId, range, speaker);

        // Create event
        const event: DocumentEvent = {
          type: 'saidTagAdded',
          id: `said-${passageId}-${Date.now()}`,
          passageId,
          range,
          speaker,
          timestamp: Date.now(),
          revision: updated.state.revision,
        };

        // Append event to document
        const docWithEvent = {
          ...updated,
          events: [...doc.events, event],
        };

        // Store updated document
        yield* _(Ref.set(documentRef, docWithEvent));

        return docWithEvent;
      } catch (error) {
        return yield* _(
          Effect.fail(
            new InvalidOperationError({
              message: `Failed to add said tag: ${error instanceof Error ? error.message : String(error)}`,
              reason: 'add-said-tag-failed',
            })
          )
        );
      }
    });

  const addQTag = (
    passageId: PassageID,
    range: TextRange
  ): Effect.Effect<TEIDocument, InvalidOperationError> =>
    Effect.gen(function* (_) {
      const doc = yield* _(getDocument());

      try {
        const updated = addQTagOp(doc, passageId, range);

        const event: DocumentEvent = {
          type: 'qTagAdded',
          id: `q-${passageId}-${Date.now()}`,
          passageId,
          range,
          timestamp: Date.now(),
          revision: updated.state.revision,
        };

        const docWithEvent = {
          ...updated,
          events: [...doc.events, event],
        };

        yield* _(Ref.set(documentRef, docWithEvent));

        return docWithEvent;
      } catch (error) {
        return yield* _(
          Effect.fail(
            new InvalidOperationError({
              message: `Failed to add q tag: ${error instanceof Error ? error.message : String(error)}`,
              reason: 'add-q-tag-failed',
            })
          )
        );
      }
    });

  const addPersNameTag = (
    passageId: PassageID,
    range: TextRange,
    ref: string
  ): Effect.Effect<TEIDocument, InvalidOperationError> =>
    Effect.gen(function* (_) {
      const doc = yield* _(getDocument());

      try {
        const updated = addPersNameTagOp(doc, passageId, range, ref);

        const event: DocumentEvent = {
          type: 'persNameTagAdded',
          id: `persName-${passageId}-${Date.now()}`,
          passageId,
          range,
          ref,
          timestamp: Date.now(),
          revision: updated.state.revision,
        };

        const docWithEvent = {
          ...updated,
          events: [...doc.events, event],
        };

        yield* _(Ref.set(documentRef, docWithEvent));

        return docWithEvent;
      } catch (error) {
        return yield* _(
          Effect.fail(
            new InvalidOperationError({
              message: `Failed to add persName tag: ${error instanceof Error ? error.message : String(error)}`,
              reason: 'add-persName-tag-failed',
            })
          )
        );
      }
    });

  const removeTag = (tagId: string): Effect.Effect<TEIDocument, InvalidOperationError> =>
    Effect.gen(function* (_) {
      const doc = yield* _(getDocument());

      try {
        const updated = removeTagOp(doc, tagId);

        const event: DocumentEvent = {
          type: 'tagRemoved',
          id: tagId,
          timestamp: Date.now(),
          revision: updated.state.revision,
        };

        const docWithEvent = {
          ...updated,
          events: [...doc.events, event],
        };

        yield* _(Ref.set(documentRef, docWithEvent));

        return docWithEvent;
      } catch (error) {
        return yield* _(
          Effect.fail(
            new InvalidOperationError({
              message: `Failed to remove tag: ${error instanceof Error ? error.message : String(error)}`,
              reason: 'remove-tag-failed',
            })
          )
        );
      }
    });

  // ========================================================================
  // Character Operations
  // ========================================================================

  const addCharacter = (character: Character): Effect.Effect<TEIDocument, InvalidOperationError> =>
    Effect.gen(function* (_) {
      const doc = yield* _(getDocument());

      try {
        const updated = addCharacterOp(doc, character);

        const event: DocumentEvent = {
          type: 'characterAdded',
          id: character.id,
          character,
          timestamp: Date.now(),
          revision: updated.state.revision,
        };

        const docWithEvent = {
          ...updated,
          events: [...doc.events, event],
        };

        yield* _(Ref.set(documentRef, docWithEvent));

        return docWithEvent;
      } catch (error) {
        return yield* _(
          Effect.fail(
            new InvalidOperationError({
              message: `Failed to add character: ${error instanceof Error ? error.message : String(error)}`,
              reason: 'add-character-failed',
            })
          )
        );
      }
    });

  const updateCharacter = (
    characterId: CharacterID,
    updates: Partial<Omit<Character, 'id' | 'xmlId'>>
  ): Effect.Effect<TEIDocument, InvalidOperationError> =>
    Effect.gen(function* (_) {
      const doc = yield* _(getDocument());

      try {
        const updated = updateCharacterOp(doc, characterId, updates);

        const event: DocumentEvent = {
          type: 'characterUpdated',
          id: characterId,
          updates,
          timestamp: Date.now(),
          revision: updated.state.revision,
        };

        const docWithEvent = {
          ...updated,
          events: [...doc.events, event],
        };

        yield* _(Ref.set(documentRef, docWithEvent));

        return docWithEvent;
      } catch (error) {
        return yield* _(
          Effect.fail(
            new InvalidOperationError({
              message: `Failed to update character: ${error instanceof Error ? error.message : String(error)}`,
              reason: 'update-character-failed',
            })
          )
        );
      }
    });

  const removeCharacter = (
    characterId: CharacterID
  ): Effect.Effect<TEIDocument, InvalidOperationError> =>
    Effect.gen(function* (_) {
      const doc = yield* _(getDocument());

      try {
        const updated = removeCharacterOp(doc, characterId);

        const event: DocumentEvent = {
          type: 'characterRemoved',
          id: characterId,
          timestamp: Date.now(),
          revision: updated.state.revision,
        };

        const docWithEvent = {
          ...updated,
          events: [...doc.events, event],
        };

        yield* _(Ref.set(documentRef, docWithEvent));

        return docWithEvent;
      } catch (error) {
        return yield* _(
          Effect.fail(
            new InvalidOperationError({
              message: `Failed to remove character: ${error instanceof Error ? error.message : String(error)}`,
              reason: 'remove-character-failed',
            })
          )
        );
      }
    });

  // ========================================================================
  // Relationship Operations
  // ========================================================================

  const addRelationship = (
    relation: Omit<Relationship, 'id'>
  ): Effect.Effect<TEIDocument, InvalidOperationError> =>
    Effect.gen(function* (_) {
      const doc = yield* _(getDocument());

      try {
        const updated = addRelationshipOp(doc, relation);

        const event: DocumentEvent = {
          type: 'relationAdded',
          id: `relation-${Date.now()}`,
          relation,
          timestamp: Date.now(),
          revision: updated.state.revision,
        };

        const docWithEvent = {
          ...updated,
          events: [...doc.events, event],
        };

        yield* _(Ref.set(documentRef, docWithEvent));

        return docWithEvent;
      } catch (error) {
        return yield* _(
          Effect.fail(
            new InvalidOperationError({
              message: `Failed to add relationship: ${error instanceof Error ? error.message : String(error)}`,
              reason: 'add-relationship-failed',
            })
          )
        );
      }
    });

  const removeRelationship = (
    relationId: string
  ): Effect.Effect<TEIDocument, InvalidOperationError> =>
    Effect.gen(function* (_) {
      const doc = yield* _(getDocument());

      try {
        const updated = removeRelationshipOp(doc, relationId);

        const event: DocumentEvent = {
          type: 'relationRemoved',
          id: relationId,
          timestamp: Date.now(),
          revision: updated.state.revision,
        };

        const docWithEvent = {
          ...updated,
          events: [...doc.events, event],
        };

        yield* _(Ref.set(documentRef, docWithEvent));

        return docWithEvent;
      } catch (error) {
        return yield* _(
          Effect.fail(
            new InvalidOperationError({
              message: `Failed to remove relationship: ${error instanceof Error ? error.message : String(error)}`,
              reason: 'remove-relationship-failed',
            })
          )
        );
      }
    });

  // ========================================================================
  // History Operations
  // ========================================================================

  const undo = (targetRevision?: number): Effect.Effect<TEIDocument, InvalidOperationError> =>
    Effect.gen(function* (_) {
      const doc = yield* _(getDocument());

      const target =
        targetRevision !== undefined ? targetRevision : Math.max(0, doc.state.revision - 1);

      if (target >= doc.state.revision) {
        return yield* _(
          Effect.fail(
            new InvalidOperationError({
              message: `Cannot undo: target revision ${target} is >= current revision ${doc.state.revision}`,
              reason: 'invalid-undo-target',
            })
          )
        );
      }

      // Rebuild document from events up to target revision
      const eventsToApply = doc.events.filter((e) => e.revision <= target);
      let rebuiltDoc = loadDocument(eventsToApply[0].xml);

      for (let i = 1; i < eventsToApply.length; i++) {
        const event = eventsToApply[i];
        rebuiltDoc = applyEvent(rebuiltDoc, event);
      }

      yield* _(Ref.set(documentRef, rebuiltDoc));

      return rebuiltDoc;
    });

  const redo = (fromRevision?: number): Effect.Effect<TEIDocument, InvalidOperationError> =>
    Effect.gen(function* (_) {
      const doc = yield* _(getDocument());

      const target = fromRevision !== undefined ? fromRevision : doc.state.revision + 1;

      if (target >= doc.events.length) {
        return yield* _(
          Effect.fail(
            new InvalidOperationError({
              message: `Cannot redo: target revision ${target} is beyond event log`,
              reason: 'invalid-redo-target',
            })
          )
        );
      }

      // Rebuild document from events up to target revision
      const eventsToApply = doc.events.filter((e) => e.revision <= target);
      let rebuiltDoc = loadDocument(eventsToApply[0].xml);

      for (let i = 1; i < eventsToApply.length; i++) {
        const event = eventsToApply[i];
        rebuiltDoc = applyEvent(rebuiltDoc, event);
      }

      yield* _(Ref.set(documentRef, rebuiltDoc));

      return rebuiltDoc;
    });

  const getHistoryState = (): Effect.Effect<HistoryState, never> =>
    Effect.gen(function* (_) {
      const doc = yield* _(Ref.get(documentRef));

      if (!doc) {
        return {
          canUndo: false,
          canRedo: false,
          currentRevision: 0,
          totalRevisions: 0,
        };
      }

      return {
        canUndo: doc.state.revision > 0,
        canRedo: doc.state.revision < doc.events.length - 1,
        currentRevision: doc.state.revision,
        totalRevisions: doc.events.length,
      };
    });

  const timeTravel = (targetRevision: number): Effect.Effect<TEIDocument, InvalidOperationError> =>
    Effect.gen(function* (_) {
      const doc = yield* _(getDocument());

      if (targetRevision < 0 || targetRevision >= doc.events.length) {
        return yield* _(
          Effect.fail(
            new InvalidOperationError({
              message: `Invalid revision: ${targetRevision} (must be 0-${doc.events.length - 1})`,
              reason: 'invalid-revision',
            })
          )
        );
      }

      // Rebuild document from events up to target revision
      const eventsToApply = doc.events.filter((e) => e.revision <= targetRevision);
      let rebuiltDoc = loadDocument(eventsToApply[0].xml);

      for (let i = 1; i < eventsToApply.length; i++) {
        const event = eventsToApply[i];
        rebuiltDoc = applyEvent(rebuiltDoc, event);
      }

      yield* _(Ref.set(documentRef, rebuiltDoc));

      return rebuiltDoc;
    });

  // ========================================================================
  // Return Service
  // ========================================================================

  return {
    loadDocument,
    getDocument,
    addSaidTag,
    addQTag,
    addPersNameTag,
    removeTag,
    addCharacter,
    updateCharacter,
    removeCharacter,
    addRelationship,
    removeRelationship,
    undo,
    redo,
    getHistoryState,
    timeTravel,
  } as const;
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Apply event to document
 *
 * Helper function to rebuild document from events.
 */
function applyEvent(doc: TEIDocument, event: DocumentEvent): TEIDocument {
  switch (event.type) {
    case 'loaded':
      return doc;

    case 'saidTagAdded':
      return addSaidTagOp(doc, event.passageId, event.range, event.speaker);

    case 'qTagAdded':
      return addQTagOp(doc, event.passageId, event.range);

    case 'persNameTagAdded':
      return addPersNameTagOp(doc, event.passageId, event.range, event.ref);

    case 'tagRemoved':
      return removeTagOp(doc, event.id);

    case 'characterAdded':
      return addCharacterOp(doc, event.character);

    case 'characterUpdated':
      return updateCharacterOp(doc, event.id, event.updates);

    case 'characterRemoved':
      return removeCharacterOp(doc, event.id);

    case 'relationAdded':
      return addRelationshipOp(doc, event.relation);

    case 'relationRemoved':
      return removeRelationshipOp(doc, event.id);

    default:
      const exhaustive: never = event;
      return doc;
  }
}

// ============================================================================
// Layer (Dependency Injection)
// ============================================================================

/**
 * DocumentServiceLive Layer
 *
 * Provides the live implementation of DocumentService.
 * This layer can be used to provide the service to Effect programs.
 */
export const DocumentServiceLive = Layer.effect(DocumentService, makeDocumentService);

// ============================================================================
// Test Implementation
// ============================================================================

/**
 * TestDocumentService
 *
 * Mock implementation for testing. Uses in-memory storage.
 */
export const TestDocumentService = {
  loadDocument: (xml: string) =>
    Effect.sync(() => {
      try {
        return loadDocumentOp(xml);
      } catch (error) {
        throw new DocumentParseError({
          message: `Parse error: ${error instanceof Error ? error.message : String(error)}`,
          xml,
          cause: error,
        });
      }
    }),

  getDocument: () =>
    Effect.sync(() => {
      throw new DocumentNotFoundError({
        message: 'No document loaded (test implementation)',
      });
    }),

  addSaidTag: () =>
    Effect.sync(() => {
      throw new Error('Not implemented in test mock');
    }),

  addQTag: () =>
    Effect.sync(() => {
      throw new Error('Not implemented in test mock');
    }),

  addPersNameTag: () =>
    Effect.sync(() => {
      throw new Error('Not implemented in test mock');
    }),

  removeTag: () =>
    Effect.sync(() => {
      throw new Error('Not implemented in test mock');
    }),

  addCharacter: () =>
    Effect.sync(() => {
      throw new Error('Not implemented in test mock');
    }),

  updateCharacter: () =>
    Effect.sync(() => {
      throw new Error('Not implemented in test mock');
    }),

  removeCharacter: () =>
    Effect.sync(() => {
      throw new Error('Not implemented in test mock');
    }),

  addRelationship: () =>
    Effect.sync(() => {
      throw new Error('Not implemented in test mock');
    }),

  removeRelationship: () =>
    Effect.sync(() => {
      throw new Error('Not implemented in test mock');
    }),

  undo: () =>
    Effect.sync(() => {
      throw new Error('Not implemented in test mock');
    }),

  redo: () =>
    Effect.sync(() => {
      throw new Error('Not implemented in test mock');
    }),

  getHistoryState: () =>
    Effect.sync(() => ({
      canUndo: false,
      canRedo: false,
      currentRevision: 0,
      totalRevisions: 0,
    })),

  timeTravel: () =>
    Effect.sync(() => {
      throw new Error('Not implemented in test mock');
    }),
};
