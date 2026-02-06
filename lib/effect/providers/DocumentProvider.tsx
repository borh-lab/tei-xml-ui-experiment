// @ts-nocheck
'use client';

import React from 'react';
import type { TEIDocument } from '@/lib/tei/types';
import type { PassageID, CharacterID, TextRange } from '@/lib/tei/types';
import { useDocumentV2 } from '@/hooks/useDocumentV2';
import type { DocumentState } from '@/lib/values/DocumentState';
import { DocumentContext as ReactDocumentContext } from '@/lib/context/DocumentContext';

/**
 * DocumentContext Type
 *
 * Matches the React DocumentContext interface for compatibility.
 */
export interface DocumentContextType {
  document: TEIDocument | null;
  loadDocument: (xml: string) => Promise<TEIDocument>;
  setDocument: (document: TEIDocument) => void;
  clearDocument: () => void;
  addTag: (
    passageId: PassageID,
    range: TextRange,
    tagName: string,
    attrs?: Record<string, string>
  ) => Promise<void>;
  removeTag: (tagId: string) => Promise<void>;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
}

// Re-export the original context for compatibility
export const DocumentContext = ReactDocumentContext;

/**
 * EffectDocumentProvider (V2)
 *
 * React context provider that uses V2 state protocol for document operations.
 * V2 uses immutable state values and pure protocol functions.
 * Provides the same interface as the React DocumentContext for drop-in compatibility.
 *
 * @example
 * ```tsx
 * <EffectDocumentProvider>
 *   <App />
 * </EffectDocumentProvider>
 * ```
 */
export function EffectDocumentProvider({ children, initialState }: { children: React.ReactNode; initialState?: DocumentState }) {
  const { state, operations } = useDocumentV2(initialState);

  // Adapter to match React DocumentContext interface
  const contextValue: DocumentContextType = {
    document: state.document,
    loadDocument: operations.loadDocument,
    setDocument: () => {
      throw new Error('setDocument is not supported in V2. Use loadDocument instead.');
    },
    clearDocument: () => {
      throw new Error('clearDocument not implemented in V2 yet');
    },
    addTag: async (passageId: PassageID, range: TextRange, tagName: string, attrs?: Record<string, string>) => {
      // Route to appropriate V2 operation based on tag name
      switch (tagName) {
        case 'said':
          if (!attrs?.who) {
            throw new Error('said tag requires "who" attribute');
          }
          return await operations.addSaidTag(passageId, range, attrs.who as CharacterID);

        case 'q':
          return await operations.addQTag(passageId, range);

        case 'persName':
          if (!attrs?.ref) {
            throw new Error('persName tag requires "ref" attribute');
          }
          return await operations.addPersNameTag(passageId, range, attrs.ref);

        default:
          throw new Error(`Unsupported tag name: ${tagName}`);
      }
    },
    removeTag: operations.removeTag,
    undo: () => {
      throw new Error('undo not implemented in V2 yet');
    },
    redo: () => {
      throw new Error('redo not implemented in V2 yet');
    },
  };

  return <ReactDocumentContext.Provider value={contextValue as any}>{children}</ReactDocumentContext.Provider>;
}

/**
 * EffectDocumentProvider with feature flag support
 *
 * Automatically switches between React and Effect implementations
 * based on useEffectDocument feature flag.
 */
export default function DocumentProvider({ children }: { children: React.ReactNode }) {
  const { useStorageService } = require('@/lib/effect/react/hooks');
  const storage = useStorageService();

  // Check feature flag
  const [useEffect, setUseEffect] = React.useState(false);

  React.useEffect(() => {
    storage.get('useEffectDocument').then((enabled: boolean | null) => {
      setUseEffect(enabled === true);
    }).catch(() => {
      // Default to false if storage check fails
      setUseEffect(false);
    });
  }, [storage]);

  if (useEffect) {
    return <EffectDocumentProvider>{children}</EffectDocumentProvider>;
  }

  // Fall back to React version
  const ReactDocumentProvider = require('@/lib/context/DocumentContext').DocumentProvider;
  return <ReactDocumentProvider>{children}</ReactDocumentProvider>;
}
