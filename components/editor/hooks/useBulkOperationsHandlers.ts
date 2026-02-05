'use client';

import { useCallback } from 'react';

export interface UseBulkOperationsHandlersResult {
  handleTagAll: (speakerId: string) => Promise<void>;
  handleSelectAllUntagged: () => void;
  handleSelectLowConfidence: () => void;
  handleExportSelection: () => void;
  handleValidateSelection: () => Promise<any[]>;
  handleConvert: () => void;
}

export interface UseBulkOperationsHandlersOptions {
  document: any;
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

  const handleTagAll = useCallback(async (speakerId: string) => {
    if (!document) return;

    const newDoc = { ...document };
    const paragraphs = (newDoc as any).parsed.TEI.text.body.p;
    const passagesToTag = [...selectedPassages];

    selectedPassages.forEach((index) => {
      if (paragraphs[index] && paragraphs[index].said) {
        paragraphs[index].said = paragraphs[index].said.map((s: Record<string, unknown>) => ({
          ...s,
          '@who': speakerId,
        }));
      }
    });

    const { serializeDocument } = await import('@/lib/tei/operations');
    const updatedXML = serializeDocument(document);
    await updateDocument(updatedXML);
    setSelectedPassages([]);

    // Log to pattern database
    const { db } = await import('@/lib/db/PatternDB');
    await db.logCorrection('bulk_tag', speakerId, passagesToTag, 1.0, 'middle');
  }, [document, updateDocument, selectedPassages, setSelectedPassages]);

  const handleSelectAllUntagged = useCallback(() => {
    if (!document) return;

    const untaggedIndices = new Set<number>();
    const paragraphs = (document as any).parsed.TEI.text.body.p;

    paragraphs.forEach((para: any, index: number) => {
      const hasUntagged = para.said?.some((s: Record<string, unknown>) => !s['@who'] || s['@who'] === '');
      if (hasUntagged) {
        untaggedIndices.add(index);
      }
    });

    setSelectedPassages(Array.from(untaggedIndices).map(String));
  }, [document, setSelectedPassages]);

  const handleSelectLowConfidence = useCallback(() => {
    console.log('Selecting low confidence passages');
  }, []);

  const handleExportSelection = useCallback(() => {
    if (!document || selectedPassages.length === 0) return;

    const selectedParagraphs = selectedPassages.map(
      (index) => (document as any).parsed.TEI.text.body.p[Number(index)]
    );

    const data = JSON.stringify(selectedParagraphs, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = globalThis.document.createElement('a');
    a.href = url;
    a.download = 'tei-export-' + Date.now() + '.json';
    a.click();

    URL.revokeObjectURL(url);
  }, [document, selectedPassages]);

  const handleValidateSelection = useCallback(async (): Promise<any[]> => {
    if (!document || selectedPassages.length === 0) return [];

    const issues: any[] = [];
    const paragraphs = (document as any).parsed.TEI.text.body.p;

    selectedPassages.forEach((indexStr) => {
      const index = Number(indexStr);
      const para = paragraphs[index];
      if (!para.said) {
        issues.push({
          type: 'warning',
          message: 'Paragraph ' + (index + 1) + ': No dialogue found',
          location: { index },
        });
      } else {
        para.said.forEach((s: Record<string, unknown>, i: number) => {
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
  }, [document, selectedPassages]);

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
