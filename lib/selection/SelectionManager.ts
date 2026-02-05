/**
 * Selection Manager (Value-Oriented)
 *
 * Pure functions for capturing and restoring text selections.
 * No mutable cached state - selections are immutable values.
 */

import type { SelectionSnapshot, TextRange, TagInfo } from './types';
import type { PassageID } from '@/lib/tei/types';
import type { TEIDocument } from '@/lib/tei/types';
import {
  smartSelectionAdjust,
  snapToTagBoundaries,
  validateSelection,
  validateAgainstSchema,
  schemaAwareSmartSelection,
  type SelectionAdjustment,
  type SchemaValidationResult,
  type TEI_P5_CONSTRAINTS,
} from './SmartSelection';

export class SelectionManager {
  /**
   * Pure function: Capture selection as value (no cached state)
   */
  captureSelection(): SelectionSnapshot | null {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return null;
    }

    const range = selection.getRangeAt(0);
    const text = range.toString();

    if (!text || text.trim().length === 0) {
      return null;
    }

    // Find passage container
    const passageElement = this.findPassageElement(range.commonAncestorContainer);
    if (!passageElement) {
      return null;
    }

    const passageId = passageElement.getAttribute('data-passage-id') as PassageID;
    if (!passageId) {
      return null;
    }

    const offsets = this.calculateOffsets(passageElement, range);

    return {
      passageId,
      range: offsets,
      documentRevision: this.getDocumentRevision(passageElement),
      text,
      container: range.commonAncestorContainer,
    };
  }

  /**
   * Pure function: Restore selection with validation
   * Returns true if successful, false if document changed
   */
  restoreSelection(doc: TEIDocument, snapshot: SelectionSnapshot): boolean {
    // Validate document hasn't changed
    if (doc.state.revision !== snapshot.documentRevision) {
      return false;
    }

    const passageElement = document.querySelector(`[data-passage-id="${snapshot.passageId}"]`);
    if (!passageElement) {
      return false;
    }

    return this.setSelectionInNode(passageElement as HTMLElement, snapshot.range);
  }

  /**
   * Pure function: Get containing tag for current selection
   */
  getContainingTag(doc: TEIDocument, selection: SelectionSnapshot): TagInfo | null {
    const passage = doc.state.passages.find((p) => p.id === selection.passageId);
    if (!passage) return null;

    // Find tag that contains the selection range
    const containingTag = passage.tags.find(
      (tag) => selection.range.start >= tag.range.start && selection.range.end <= tag.range.end
    );

    if (!containingTag) {
      return null;
    }

    return {
      id: containingTag.id,
      type: containingTag.type,
      attributes: containingTag.attributes,
      range: containingTag.range,
    };
  }

  /**
   * Pure function: Check if selection is within a tag
   */
  isSelectionInTag(doc: TEIDocument, selection: SelectionSnapshot): boolean {
    return this.getContainingTag(doc, selection) !== null;
  }

  /**
   * Parinfer-like: Capture selection with smart boundary adjustment
   *
   * Automatically adjusts selection to maintain valid XML structure.
   * Returns the adjusted selection with adjustment details.
   *
   * @param doc - Current document
   * @param tagType - Type of tag to be applied (optional)
   * @returns Selection snapshot with adjustment info, or null if no selection
   */
  captureSmartSelection(
    doc: TEIDocument,
    tagType?: string
  ): {
    snapshot: SelectionSnapshot;
    adjustment: SelectionAdjustment;
  } | null {
    const snapshot = this.captureSelection();
    if (!snapshot) {
      return null;
    }

    // Get passage
    const passage = doc.state.passages.find(p => p.id === snapshot.passageId);
    if (!passage) {
      return null;
    }

    // Apply Parinfer-like adjustment
    const adjustment = smartSelectionAdjust(passage, snapshot.range, tagType);

    // If adjustment was made, update the snapshot
    if (adjustment.adjustedRange.start !== snapshot.range.start ||
        adjustment.adjustedRange.end !== snapshot.range.end) {

      return {
        snapshot: {
          ...snapshot,
          range: adjustment.adjustedRange,
          text: passage.content.substring(
            adjustment.adjustedRange.start,
            adjustment.adjustedRange.end
          ),
        },
        adjustment,
      };
    }

    return {
      snapshot,
      adjustment,
    };
  }

  /**
   * Parinfer-like: Validate selection before tag application
   *
   * Checks if a tag can be safely applied to the current selection.
   *
   * @param doc - Current document
   * @param tagType - Type of tag to apply
   * @returns Validation result with suggested adjustment if invalid
   */
  validateTagApplication(
    doc: TEIDocument,
    tagType: string
  ): {
    valid: boolean;
    reason?: string;
    adjustment?: SelectionAdjustment;
  } | null {
    const snapshot = this.captureSelection();
    if (!snapshot) {
      return null;
    }

    const passage = doc.state.passages.find(p => p.id === snapshot.passageId);
    if (!passage) {
      return null;
    }

    return validateSelection(passage, snapshot.range, tagType);
  }

  /**
   * Schema-aware smart selection (combines structural + schema validation)
   *
   * Validates both structural integrity and schema constraints before tag application.
   * Provides helpful error messages about missing attributes or invalid values.
   *
   * @param doc - Current document
   * @param tagType - Type of tag to apply
   * @param providedAttrs - Attributes that will be provided
   * @returns Validation result with schema-aware feedback
   */
  validateTagApplicationWithSchema(
    doc: TEIDocument,
    tagType: string,
    providedAttrs: Record<string, string> = {}
  ): {
    valid: boolean;
    reason?: string;
    adjustment?: SelectionAdjustment;
    missingAttributes?: string[];
    invalidAttributes?: Record<string, string>;
    suggestions?: string[];
  } | null {
    const snapshot = this.captureSelection();
    if (!snapshot) {
      return null;
    }

    const passage = doc.state.passages.find(p => p.id === snapshot.passageId);
    if (!passage) {
      return null;
    }

    // Check schema constraints
    const schemaValidation = validateAgainstSchema(
      passage,
      snapshot.range,
      tagType,
      providedAttrs,
      doc
    );

    if (!schemaValidation.valid) {
      return {
        valid: false,
        reason: schemaValidation.reason,
        missingAttributes: schemaValidation.missingAttributes,
        invalidAttributes: schemaValidation.invalidAttributes,
        suggestions: schemaValidation.suggestions,
      };
    }

    // Also check structural validation
    const structuralValidation = validateSelection(passage, snapshot.range, tagType);

    if (!structuralValidation.valid) {
      return {
        valid: false,
        reason: structuralValidation.reason,
        adjustment: structuralValidation.adjustment,
      };
    }

    return { valid: true };
  }

  /**
   * Capture selection with schema-aware validation
   *
   * Like captureSmartSelection, but validates against schema constraints.
   *
   * @param doc - Current document
   * @param tagType - Type of tag to apply
   * @param providedAttrs - Attributes that will be provided
   * @returns Validation result with adjustment info
   */
  captureSchemaAwareSelection(
    doc: TEIDocument,
    tagType: string,
    providedAttrs: Record<string, string> = {}
  ): {
    snapshot: SelectionSnapshot;
    adjustment: SelectionAdjustment;
    schemaValidation?: SchemaValidationResult;
  } | null {
    const snapshot = this.captureSelection();
    if (!snapshot) {
      return null;
    }

    const passage = doc.state.passages.find(p => p.id === snapshot.passageId);
    if (!passage) {
      return null;
    }

    // Apply schema-aware smart selection
    const result = schemaAwareSmartSelection(
      passage,
      snapshot.range,
      tagType,
      providedAttrs,
      doc
    );

    // Update snapshot if range was adjusted
    const adjustedSnapshot = result.adjustedRange.start !== snapshot.range.start ||
                          result.adjustedRange.end !== snapshot.range.end
      ? {
          ...snapshot,
          range: result.adjustedRange,
          text: passage.content.substring(
            result.adjustedRange.start,
            result.adjustedRange.end
          ),
        }
      : snapshot;

    return {
      snapshot: adjustedSnapshot,
      adjustment: result,
      schemaValidation: {
        valid: result.valid,
        missingAttributes: result.missingAttributes,
        invalidAttributes: result.invalidAttributes,
        suggestions: result.suggestions,
      },
    };
  }

  // Helper methods (private)

  private findPassageElement(node: Node): HTMLElement | null {
    let current: Node | null = node;
    while (current) {
      if (current instanceof HTMLElement) {
        const passageId = current.getAttribute('data-passage-id');
        if (passageId) return current;
      }
      current = current.parentNode;
    }
    return null;
  }

  private calculateOffsets(passageElement: HTMLElement, range: Range): TextRange {
    const rangeClone = range.cloneRange();
    const textRange = document.createRange();
    textRange.selectNodeContents(passageElement);
    textRange.setEnd(rangeClone.startContainer, rangeClone.startOffset);
    const start = textRange.toString().length;

    textRange.setEnd(rangeClone.endContainer, rangeClone.endOffset);
    const end = textRange.toString().length;

    return { start, end };
  }

  private getDocumentRevision(passageElement: HTMLElement): number {
    // Get revision from data attribute (set by renderer)
    const rev = passageElement.getAttribute('data-document-revision');
    return rev ? parseInt(rev, 10) : 0;
  }

  private setSelectionInNode(element: HTMLElement, range: TextRange): boolean {
    const selection = window.getSelection();
    if (!selection) return false;

    try {
      const textContent = element.textContent || '';
      const start = Math.max(0, Math.min(range.start, textContent.length));
      const end = Math.max(start, Math.min(range.end, textContent.length));

      const newRange = document.createRange();
      const nodes = this.findTextNodes(element);

      let currentOffset = 0;
      let startNode: Node | null = null;
      let startOffset = 0;
      let endNode: Node | null = null;
      let endOffset = 0;

      for (const node of nodes) {
        const length = node.textContent?.length || 0;

        if (!startNode && currentOffset + length >= start) {
          startNode = node;
          startOffset = start - currentOffset;
        }

        if (!endNode && currentOffset + length >= end) {
          endNode = node;
          endOffset = end - currentOffset;
          break; // Found end node
        }

        currentOffset += length;
      }

      if (startNode && endNode) {
        newRange.setStart(startNode, startOffset);
        newRange.setEnd(endNode, endOffset);
        selection.removeAllRanges();
        selection.addRange(newRange);
        return true;
      }

      return false;
    } catch (e) {
      console.error('Failed to restore selection:', e);
      return false;
    }
  }

  private findTextNodes(node: Node): Node[] {
    const textNodes: Node[] = [];

    function traverse(n: Node) {
      if (n.nodeType === Node.TEXT_NODE) {
        textNodes.push(n);
      } else {
        for (const child of Array.from(n.childNodes || [])) {
          traverse(child);
        }
      }
    }

    traverse(node);
    return textNodes;
  }
}
