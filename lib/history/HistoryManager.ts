/**
 * History Utilities for Undo/Redo Operations
 *
 * In the event-sourcing architecture, undo/redo is built into the
 * document operations (undoTo, redoFrom). These utilities provide
 * convenient helpers for UI components.
 *
 * History state is derived from the document, not stored separately.
 */

import type { TEIDocument } from '@/lib/tei/types';
import { undoTo, redoFrom } from '@/lib/tei/operations';

/**
 * Get history state from document
 *
 * Extracts undo/redo capability information from the document.
 * Useful for UI components to enable/disable undo/redo buttons.
 */
export function getHistoryState(doc: TEIDocument | null): {
  canUndo: boolean;
  canRedo: boolean;
  currentRevision: number;
  totalRevisions: number;
} {
  if (!doc) {
    return {
      canUndo: false,
      canRedo: false,
      currentRevision: 0,
      totalRevisions: 0,
    };
  }

  const currentRevision = doc.state.revision;
  const totalRevisions = doc.events.length;

  return {
    canUndo: currentRevision > 0,
    canRedo: currentRevision < totalRevisions - 1,
    currentRevision,
    totalRevisions,
  };
}

/**
 * Undo to previous revision
 *
 * Convenience wrapper that validates undo is possible before executing.
 *
 * @param doc - Current document
 * @returns Document at previous revision, or same document if cannot undo
 */
export function undo(doc: TEIDocument): TEIDocument {
  const historyState = getHistoryState(doc);

  if (!historyState.canUndo) {
    return doc;
  }

  const targetRevision = Math.max(0, historyState.currentRevision - 1);
  return undoTo(doc, targetRevision);
}

/**
 * Redo to next revision
 *
 * Convenience wrapper that validates redo is possible before executing.
 *
 * @param doc - Current document
 * @returns Document at next revision, or same document if cannot redo
 */
export function redo(doc: TEIDocument): TEIDocument {
  const historyState = getHistoryState(doc);

  if (!historyState.canRedo) {
    return doc;
  }

  return redoFrom(doc, historyState.currentRevision);
}

/**
 * Go to specific revision
 *
 * @param doc - Current document
 * @param revision - Target revision
 * @returns Document at target revision, or same document if invalid
 */
export function goToRevision(doc: TEIDocument, revision: number): TEIDocument {
  if (revision < 0 || revision >= doc.events.length) {
    return doc;
  }

  return undoTo(doc, revision);
}
