'use client';

import { useCallback } from 'react';
import type { TEIDocument, TEINode } from '@/lib/tei/types';

export interface UseBulkOperationsHandlersResult {
  handleTagAll: (speakerId: string) => Promise<void>;
  handleSelectAllUntagged: () => void;
  handleSelectLowConfidence: () => void;
  handleExportSelection: () => void;
  handleValidateSelection: () => Promise<any[]>;
  handleConvert: () => void;
}

export interface UseBulkOperationsHandlersOptions {
  document: TEIDocument | null;
  updateDocument: (xml: string) => Promise<void>;
  selectedPassages: string[];
  setSelectedPassages: (passages: string[]) => void;
}

/**
 * Handles bulk operation callbacks.
 *
 * Provides handlers for bulk tagging, selection, and validation operations.
 */
export function useBulkOperationsHandlers(
  options: UseBulkOperationsHandlersOptions
): UseBulkOperationsHandlersResult {
  const { document, updateDocument, selectedPassages, setSelectedPassages } = options;

  // Helper to get paragraphs from document
  const getParagraphs = useCallback((): TEINode[] => {
    if (!document) return [];
    const tei = document.state.parsed.TEI as TEINode | undefined;
    const text = tei?.text as TEINode | undefined;
    const body = text?.body as TEINode | undefined;
    const p = body?.p;
    return Array.isArray(p) ? p : p ? [p] : [];
  }, [document]);

  const handleTagAll = useCallback(async (speakerId: string) => {
    if (!document) return;

    const paragraphs = getParagraphs();
    const passagesToTag = [...selectedPassages];

    selectedPassages.forEach((index) => {
      const idx = Number(index);
      if (paragraphs[idx] && paragraphs[idx].said) {
        const said = paragraphs[idx].said as TEINode[];
        if (Array.isArray(said)) {
          paragraphs[idx].said = said.map((s: TEINode) => ({
            ...s,
            '@who': speakerId,
          }));
        }
      }
    });

    const { serializeDocument } = await import('@/lib/tei/operations');
    const updatedXML = serializeDocument(document);
    await updateDocument(updatedXML);
    setSelectedPassages([]);

    // Log to pattern database
    const { db } = await import('@/lib/db/PatternDB');
    await db.logCorrection('bulk_tag', speakerId, passagesToTag, 1.0, 'middle');
  }, [document, updateDocument, selectedPassages, setSelectedPassages, getParagraphs]);

  const handleSelectAllUntagged = useCallback(() => {
    if (!document) return;

    const untaggedIndices = new Set<number>();
    const paragraphs = getParagraphs();

    paragraphs.forEach((para: TEINode, index: number) => {
      const said = para.said as TEINode[];
      if (Array.isArray(said)) {
        const hasUntagged = said.some((s: TEINode) => !s['@who'] || s['@who'] === '');
        if (hasUntagged) {
          untaggedIndices.add(index);
        }
      }
    });

    setSelectedPassages(Array.from(untaggedIndices).map(String));
  }, [document, setSelectedPassages, getParagraphs]);

  const handleSelectLowConfidence = useCallback(() => {
    console.log('Selecting low confidence passages');
  }, []);

  const handleExportSelection = useCallback(() => {
    if (!document || selectedPassages.length === 0) return;

    const paragraphs = getParagraphs();
    const selectedParagraphs = selectedPassages.map(
      (index) => paragraphs[Number(index)]
    );

    const data = JSON.stringify(selectedParagraphs, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = globalThis.document.createElement('a');
    a.href = url;
    a.download = 'tei-export-' + Date.now() + '.json';
    a.click();

    URL.revokeObjectURL(url);
  }, [document, selectedPassages, getParagraphs]);

  const handleValidateSelection = useCallback(async (): Promise<any[]> => {
    if (!document || selectedPassages.length === 0) return [];

    const issues: any[] = [];
    const paragraphs = getParagraphs();

    selectedPassages.forEach((indexStr) => {
      const index = Number(indexStr);
      const para = paragraphs[index];
      const said = para.said as TEINode[];

      if (!Array.isArray(said)) {
        issues.push({
          type: 'warning',
          message: 'Paragraph ' + (index + 1) + ': No dialogue found',
          location: { index },
        });
      } else {
        said.forEach((s: TEINode, i: number) => {
          if (!s['@who'] || s['@who'] === '') {
            issues.push({
              type: 'error',
              message: 'Paragraph ' + (index + 1) + ', dialogue ' + (i + 1) + ': Untagged speaker',
              location: { index, dialogueIndex: i },
            });
          }
        });
      }
    });

    console.log('Validation issues:', issues);
    return issues;
  }, [document, selectedPassages, getParagraphs]);

  const handleConvert = useCallback(() => {
    console.log('Converting selected passages to dialogue');
  }, []);

  return {
    handleTagAll,
    handleSelectAllUntagged,
    handleSelectLowConfidence,
    handleExportSelection,
    handleValidateSelection,
    handleConvert,
  };
}
