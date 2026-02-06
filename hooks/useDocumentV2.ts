/**
 * useDocumentV2 Hook - Thin adapter for DocumentProtocol V2
 *
 * Unlike V1 (300+ lines with braided state), V2 is a thin adapter:
 * - React state management only (no business logic)
 * - Delegates to protocols (all logic in pure functions)
 * - No embedded validation (validation is separate protocol)
 * - Easy to test (protocols can be tested without React)
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import { Effect, pipe } from 'effect';
import type {
  TEIDocument,
  PassageID,
  CharacterID,
  TextRange,
  Character,
  Relationship,
} from '@/lib/tei/types';
import type {
  DocumentState,
} from '@/lib/values/DocumentState';
import {
  initialState,
} from '@/lib/values/DocumentState';
import type { DocumentProtocol } from '@/lib/effect/protocols/DocumentV2';
import { DocumentProtocolLive } from '@/lib/effect/protocols/DocumentV2';
import type { ValidationProtocol } from '@/lib/effect/protocols/ValidationV2';
import { ValidationProtocolLive } from '@/lib/effect/protocols/ValidationV2';

/**
 * Hook result interface
 */
export interface UseDocumentV2Result {
  /** Current document state */
  state: DocumentState;
  /** Document operations */
  operations: {
    loadDocument: (xml: string, docId?: string) => Promise<void>;
    loadSample: (sampleId: string) => Promise<void>;
    addSaidTag: (passageId: PassageID, range: TextRange, speaker: CharacterID) => Promise<void>;
    addQTag: (passageId: PassageID, range: TextRange) => Promise<void>;
    addPersNameTag: (passageId: PassageID, range: TextRange, ref: string) => Promise<void>;
    removeTag: (tagId: string) => Promise<void>;
    addCharacter: (character: Character) => Promise<void>;
    updateCharacter: (characterId: CharacterID, updates: Partial<Omit<Character, 'id' | 'xmlId'>>) => Promise<void>;
    removeCharacter: (characterId: CharacterID) => Promise<void>;
    addRelationship: (relation: Omit<Relationship, 'id'>) => Promise<void>;
    removeRelationship: (relationId: string) => Promise<void>;
    validate: (schemaPath?: string) => Promise<void>;
  };
}

/**
 * useDocumentV2 Hook
 *
 * @param initial - Optional initial state (enables state injection for testing)
 * @param protocol - Optional protocol override (enables protocol injection for testing)
 * @param validationProtocol - Optional validation protocol override
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { state, operations } = useDocumentV2();
 *
 *   const handleLoad = async () => {
 *     await operations.loadDocument(xmlString);
 *   };
 *
 *   return <div>{state.document && <DocumentView document={state.document} />}</div>;
 * }
 * ```
 */
export function useDocumentV2(
  initial: DocumentState | undefined = undefined,
  protocol: DocumentProtocol = DocumentProtocolLive,
  validationProtocol: ValidationProtocol = ValidationProtocolLive
): UseDocumentV2Result {
  const [state, setState] = useState<DocumentState>(initial ?? initialState());

  // Wrap Effect program in setState
  const setStateFromEffect = useCallback(<E,>(
    effect: Effect.Effect<DocumentState, E>
  ): Promise<void> => {
    const program = pipe(
      effect,
      Effect.match({
        onSuccess: (value) => {
          setState(value);
          return undefined;
        },
        onFailure: (error) => {
          setState(prev => ({ ...prev, error: error as Error }));
          return undefined;
        }
      })
    );

    return Effect.runPromise(program) as Promise<void>;
  }, []);

  // Memoize operations (only recreate when state changes)
  const operations = useMemo(() => ({
    loadDocument: async (xml: string, docId?: string) => {
      await setStateFromEffect(protocol.loadDocument(state, xml));
      // Update currentDocId after document loads
      if (docId) {
        setState(prev => ({ ...prev, currentDocId: docId }));
      }
    },

    loadSample: async (sampleId: string) => {
      // Import sample loader dynamically
      const { loadSample: loadSampleOp } = await import('@/lib/samples/sampleLoader');
      const xml = await loadSampleOp(sampleId);
      await setStateFromEffect(protocol.loadDocument(state, xml));
      setState(prev => ({ ...prev, currentDocId: `sample-${sampleId}` }));
    },

    addSaidTag: (passageId: PassageID, range: TextRange, speaker: CharacterID) =>
      setStateFromEffect(protocol.addSaidTag(state, passageId, range, speaker)),

    addQTag: (passageId: PassageID, range: TextRange) =>
      setStateFromEffect(protocol.addQTag(state, passageId, range)),

    addPersNameTag: (passageId: PassageID, range: TextRange, ref: string) =>
      setStateFromEffect(protocol.addPersNameTag(state, passageId, range, ref)),

    removeTag: (tagId: string) =>
      setStateFromEffect(protocol.removeTag(state, tagId)),

    addCharacter: (character: Character) =>
      setStateFromEffect(protocol.addCharacter(state, character)),

    updateCharacter: (characterId: CharacterID, updates: Partial<Omit<Character, 'id' | 'xmlId'>>) =>
      setStateFromEffect(protocol.updateCharacter(state, characterId, updates)),

    removeCharacter: (characterId: CharacterID) =>
      setStateFromEffect(protocol.removeCharacter(state, characterId)),

    addRelationship: (relation: Omit<Relationship, 'id'>) =>
      setStateFromEffect(protocol.addRelationship(state, relation)),

    removeRelationship: (relationId: string) =>
      setStateFromEffect(protocol.removeRelationship(state, relationId)),

    validate: (schemaPath: string = '/public/schemas/tei-novel.rng') =>
      setStateFromEffect(
        Effect.map(
          validationProtocol.validateState(state, schemaPath),
          (snapshot) => ({ ...state, validation: snapshot })
        )
      ),
  }), [state, setStateFromEffect, protocol, validationProtocol]);

  return { state, operations };
}
