// @ts-nocheck
'use client';

import React from 'react';
import type { TEIDocument } from '@/lib/tei/types';
import type { PassageID, CharacterID, TextRange } from '@/lib/tei/types';
import { useDocumentService } from '@/lib/effect/react/hooks';
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
 * EffectDocumentProvider
 *
 * React context provider that uses Effect for document operations.
 * Provides the same interface as the React DocumentContext for drop-in compatibility.
 *
 * @example
 * ```tsx
 * <EffectDocumentProvider>
 *   <App />
 * </EffectDocumentProvider>
 * ```
 */
export function EffectDocumentProvider({ children }: { children: React.ReactNode }) {
  const docService = useDocumentService();

  // Adapter to match React DocumentContext interface
  const contextValue: DocumentContextType = {
    document: docService.document,
    loadDocument: docService.loadDocument,
    setDocument: () => {
      throw new Error('setDocument is not supported in Effect version. Use loadDocument instead.');
    },
    clearDocument: docService.clearDocument,
    addTag: async (passageId: PassageID, range: TextRange, tagName: string, attrs?: Record<string, string>) => {
      // Route to appropriate Effect method based on tag name
      switch (tagName) {
        case 'said':
          if (!attrs?.who) {
            throw new Error('said tag requires "who" attribute');
          }
          return await docService.addSaidTag(passageId, range, attrs.who as CharacterID);

        case 'q':
          return await docService.addQTag(passageId, range);

        case 'persName':
          if (!attrs?.ref) {
            throw new Error('persName tag requires "ref" attribute');
          }
          return await docService.addPersNameTag(passageId, range, attrs.ref);

        default:
          throw new Error(`Unsupported tag name: ${tagName}`);
      }
    },
    removeTag: docService.removeTag,
    undo: docService.undo,
    redo: docService.redo,
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
