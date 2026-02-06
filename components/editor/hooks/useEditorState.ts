'use client';

import { useState, useCallback, useRef } from 'react';
import { useDocumentV2 } from '@/hooks/useDocumentV2';
import { SelectionManager } from '@/lib/selection/SelectionManager';
import type { TagInfo } from '@/lib/selection/types';
import type { TEINode } from '@/lib/tei/types';
import type { Fix } from '@/lib/validation/types';
import { toast } from '@/components/ui/use-toast';
import { TagQueue } from '@/lib/queue/TagQueue';
import type { QueuedTag, TagQueueState } from '@/lib/queue/TagQueue';
import type { DocumentState } from '@/lib/values/DocumentState';
import type { TEIDocument, PassageID, CharacterID } from '@/lib/tei/types';
import type { ValidationResult } from '@/lib/validation/types';

export interface UseEditorStateResult {
  // Document state (from useDocumentV2)
  document: TEIDocument | null;
  updateDocument: (xml: string) => Promise<void>;
  loadingSample: boolean;
  loadingProgress: number;
  validationResults: ValidationResult | null;
  isValidating: boolean;
  addSaidTag: (passageId: string, range: { start: number; end: number }, speakerId: string) => Promise<void>;
  addTag: (passageId: string, range: { start: number; end: number }, tagName: string, attrs?: Record<string, string>) => Promise<void>;
  // Passage navigation
  activePassageIndex: number;
  setActivePassageIndex: (index: number) => void;
  currentPassageId: string;
  setCurrentPassageId: (id: string) => void;
  highlightedPassageId: string | null;
  setHighlightedPassageId: (id: string | null) => void;
  // Tag operations
  handleApplyTag: (tag: string, attrs?: Record<string, string>) => Promise<void>;
  // Selection manager
  selectionManager: SelectionManager;
  // Helper functions
  getPassageIds: () => string[];
  handleTagAttributeUpdate: (tagName: string, attributes: Record<string, string>) => Promise<void>;
  // Tag queue
  queue?: {
    state: TagQueueState;
    multiTagMode: boolean;
    toggleMultiTagMode: () => void;
    addToQueue: (tag: Omit<QueuedTag, 'id' | 'timestamp'>) => string;
    removeFromQueue: (id: string) => void;
    clearQueue: () => void;
    applyQueue: () => Promise<void>;
    isApplyingQueue: boolean;
  };
}

export interface UseEditorStateOptions {
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  tagToEdit: TagInfo | null;
  initialState?: DocumentState;
}

/**
 * Manages core editor state including document operations and passage navigation.
 *
 * V2: Wraps useDocumentV2 and adds editor-specific operations.
 * Uses explicit state protocol instead of hidden Ref-based state.
 */
export function useEditorState(options: UseEditorStateOptions): UseEditorStateResult {
  const { showToast, tagToEdit, initialState: initialDocState } = options;

  // Get document state from useDocumentV2 (not useDocumentContext)
  const { state: docState, operations } = useDocumentV2(initialDocState);

  // Extract state values
  const document = docState.document;
  const loading = docState.status === 'loading';
  const validationResults = docState.validation?.results ?? null;
  const isValidating = false; // V2 doesn't have separate isValidating flag

  // Passage navigation state
  const [activePassageIndex, setActivePassageIndex] = useState<number>(-1);
  const [currentPassageId, setCurrentPassageId] = useState<string>('');
  const [highlightedPassageId, setHighlightedPassageId] = useState<string | null>(null);

  // Tag queue state
  const queueRef = useRef<TagQueue>(new TagQueue());
  const [queueState, setQueueState] = useState<TagQueueState>(() => queueRef.current.getState());
  const [multiTagMode, setMultiTagMode] = useState<boolean>(false);
  const [isApplyingQueue, setIsApplyingQueue] = useState<boolean>(false);

  // Maintain a single SelectionManager instance
  const selectionManager = useRef(new SelectionManager());

  // V2: Create updateDocument from operations
  const updateDocument = useCallback(async (xml: string) => {
    await operations.loadDocument(xml);
  }, [operations]);

  // V2: Add wrapper for addSaidTag that matches V1 signature
  const addSaidTag = useCallback(async (
    passageId: string,
    range: { start: number; end: number },
    speakerId: string
  ) => {
    await operations.addSaidTag(passageId as PassageID, range, speakerId as CharacterID);
  }, [operations]);

  // V2: Add wrapper for addTag that matches V1 signature
  const addTag = useCallback(async (
    passageId: string,
    range: { start: number; end: number },
    tagName: string,
    attrs?: Record<string, string>
  ) => {
    if (tagName === 'said') {
      const speakerId = attrs?.who?.substring(1) || 'unknown';
      await operations.addSaidTag(passageId as PassageID, range, speakerId as CharacterID);
    } else if (tagName === 'q') {
      await operations.addQTag(passageId as PassageID, range);
    } else if (tagName === 'persName') {
      await operations.addPersNameTag(passageId as PassageID, range, attrs?.ref || '');
    } else {
      // Generic tag - for now just use addQTag as fallback
      await operations.addQTag(passageId as PassageID, range);
    }
  }, [operations]);

  // V2: Mock loadingSample and loadingProgress (V2 doesn't track these separately)
  const loadingSample = loading;
  const loadingProgress = 0;

  // Helper to update queue state
  const updateQueueState = useCallback(() => {
    setQueueState(queueRef.current.getState());
  }, []);

  // Helper function to get all passage IDs from the document
  const getPassageIds = useCallback(() => {
    if (!document) return [];
    const tei = document.state.parsed.TEI as TEINode | undefined;
    const text = tei?.text as TEINode | undefined;
    const body = text?.body as TEINode | undefined;
    const p = body?.p;
    const paragraphs = Array.isArray(p) ? p : p ? [p] : [];
    return paragraphs.map((_, idx) => `passage-${idx}`);
  }, [document]);

  /**
   * Execute a fix action to resolve a validation error
   */
  const executeFix = useCallback(
    async (
      fix: Fix,
      passageId: string,
      range: { start: number; end: number },
      tagType: string
    ): Promise<void> => {
      try {
        switch (fix.type) {
          case 'add-attribute':
            // Re-apply tag with missing attribute added
            // If there are suggestedValues, use the first one
            const valueToAdd = fix.suggestedValues && fix.suggestedValues.length > 0
              ? fix.suggestedValues[0]
              : fix.value || '';
            await addTag(
              passageId,
              range,
              tagType,
              fix.attribute ? { [fix.attribute]: valueToAdd } : {}
            );
            showToast(`Added @${fix.attribute}="${valueToAdd}" to <${tagType}>`, 'success');
            break;

          case 'change-attribute':
            // Re-apply tag with corrected attribute value
            const valueToChange = fix.suggestedValues && fix.suggestedValues.length > 0
              ? fix.suggestedValues[0]
              : fix.value || '';
            await addTag(
              passageId,
              range,
              tagType,
              fix.attribute ? { [fix.attribute]: valueToChange } : {}
            );
            showToast(`Changed @${fix.attribute} to "${valueToChange}" in <${tagType}>`, 'success');
            break;

          case 'create-entity':
            // Open entity creation dialog (future task)
            showToast('Entity creation coming soon', 'info');
            break;

          case 'expand-selection':
            // Re-apply tag with expanded selection
            if (fix.expandedRange) {
              await addTag(passageId, fix.expandedRange, tagType, {});
              showToast(`Expanded selection for <${tagType}> tag`, 'success');
            }
            break;
        }
      } catch (error) {
        console.error('Failed to execute fix:', error);
        showToast('Failed to apply fix', 'error');
      }
    },
    [addTag, showToast]
  );

  // Toggle multi-tag mode
  const toggleMultiTagMode = useCallback(() => {
    setMultiTagMode(prev => !prev);
  }, []);

  // Add tag to queue
  const addToQueue = useCallback((tag: Omit<QueuedTag, 'id' | 'timestamp'>) => {
    const id = queueRef.current.add(tag);
    updateQueueState();
    return id;
  }, [updateQueueState]);

  // Remove tag from queue
  const removeFromQueue = useCallback((id: string) => {
    queueRef.current.remove(id);
    updateQueueState();
  }, [updateQueueState]);

  // Clear queue
  const clearQueue = useCallback(() => {
    queueRef.current.clear();
    updateQueueState();
  }, [updateQueueState]);

  // Apply all queued tags
  const applyQueue = useCallback(async () => {
    setIsApplyingQueue(true);
    const pending = queueRef.current.getPending();

    try {
      for (const tag of pending) {
        if (tag.tagType === 'said') {
          const speakerId = tag.attributes.who?.substring(1) || 'unknown';
          await addSaidTag(tag.passageId, tag.range, speakerId);
        } else {
          await addTag(tag.passageId, tag.range, tag.tagType, tag.attributes);
        }
        queueRef.current.markApplied(tag.id);
      }
    } catch (error) {
      console.error('Failed to apply queue:', error);
      // Mark remaining as failed
      pending.forEach(tag => queueRef.current.markFailed(tag.id));
    } finally {
      setIsApplyingQueue(false);
      updateQueueState();
    }
  }, [addSaidTag, addTag, updateQueueState]);

  /**
   * Show toast with action buttons for fixes
   */
  const showToastWithActions = useCallback((
    message: string,
    type: 'success' | 'error' | 'info' | 'warning',
    fixes?: Fix[],
    passageId?: string,
    range?: { start: number; end: number },
    tagType?: string
  ): void => {
    // If no fixes, show regular toast
    if (!fixes || fixes.length === 0) {
      showToast(message, type as 'success' | 'error' | 'info');
      return;
    }

    // Convert fixes to action buttons using sonner toast
    const actions = fixes.slice(0, 3).map(fix => ({
      label: fix.label,
      onClick: () => {
        if (passageId && range && tagType) {
          executeFix(fix, passageId, range, tagType);
        }
      },
    }));

    // Show first action with sonner toast
    if (actions.length > 0) {
      toast[type](message, {
        description: fixes.length > 1
          ? `${fixes.length} fixes available. First fix shown below.`
          : undefined,
        action: actions[0],
      });
    } else {
      showToast(message, type as 'success' | 'error' | 'info');
    }
  }, [showToast, executeFix]);

  // Generic handler for applying tags to selected text
  const handleApplyTag = useCallback(
    async (tag: string, attrs?: Record<string, string>) => {
      if (!document) return;

      const selectionManagerInstance = selectionManager.current;

      // Use schema-aware smart selection (validates structure + schema constraints)
      const smartSelection = selectionManagerInstance.captureSchemaAwareSelection(
        document,
        tag,
        attrs || {}
      );

      if (!smartSelection) {
        showToast('No text selected - Select text first, then click tag button', 'error');
        return;
      }

      const { snapshot, adjustment, schemaValidation } = smartSelection;
      const passageId = snapshot.passageId;
      const range: { start: number; end: number } = adjustment.adjustedRange;

      // Check schema validation first (before applying tag)
      if (schemaValidation && !schemaValidation.valid) {
        // Schema validation failed - show helpful error
        const errorMsg = schemaValidation.reason || 'Invalid tag application';

        // Show fixes as actionable toasts if available
        if (schemaValidation.fixes && schemaValidation.fixes.length > 0) {
          showToastWithActions(
            errorMsg,
            'warning',
            schemaValidation.fixes,
            passageId,
            range,
            tag
          );
        } else {
          // Fallback to showing errors as separate toasts (backward compatibility)
          // Show missing attributes
          if (schemaValidation.missingAttributes && schemaValidation.missingAttributes.length > 0) {
            const missing = schemaValidation.missingAttributes.join(', ');
            showToast(`Missing required attributes: ${missing}`, 'error');
          }

          // Show suggestions
          if (schemaValidation.suggestions && schemaValidation.suggestions.length > 0) {
            schemaValidation.suggestions.forEach(suggestion => {
              console.log('Suggestion:', suggestion);
            });
            // Show first suggestion as toast
            showToast(schemaValidation.suggestions[0], 'info');
          }

          // Show invalid attributes
          if (schemaValidation.invalidAttributes) {
            const invalidAttrs = Object.entries(schemaValidation.invalidAttributes)
              .map(([attr, reason]) => `${attr}: ${reason}`)
              .join(', ');
            showToast(`Invalid attributes: ${invalidAttrs}`, 'error');
          }
        }

        return; // Don't apply the tag
      }

      // Show adjustment message if selection was modified
      if (adjustment.adjustedRange.start !== adjustment.originalRange.start ||
          adjustment.adjustedRange.end !== adjustment.originalRange.end) {
        showToast(adjustment.reason, 'info');
      }

      // If multi-tag mode is enabled, add to queue instead of applying
      if (multiTagMode) {
        const queuedTag: Omit<QueuedTag, 'id' | 'timestamp'> = {
          tagType: tag,
          attributes: attrs || {},
          passageId,
          range,
        };
        addToQueue(queuedTag);
        const tagDisplay = attrs
          ? '<' + tag + ' ' + Object.entries(attrs)
              .map(([k, v]) => k + '="' + v + '"')
              .join(' ') + '>'
          : '<' + tag + '>';
        showToast(`Added ${tagDisplay} to queue (${queueRef.current.size} pending)`, 'info');
        return;
      }

      try {
        // Use value-oriented service methods based on tag type
        if (tag === 'said') {
          const speakerId = attrs?.who?.substring(1) || attrs?.speaker || 'unknown';
          await addSaidTag(passageId, range, speakerId);
        } else if (tag === 'q') {
          await addTag(passageId, range, 'q', attrs);
        } else if (tag === 'persName') {
          await addTag(passageId, range, 'persName', attrs);
        } else {
          // Generic tag fallback
          await addTag(passageId, range, tag, attrs);
        }

        // Success message
        const tagDisplay = attrs
          ? '<' + tag + ' ' + Object.entries(attrs)
              .map(([k, v]) => k + '="' + v + '"')
              .join(' ') + '>'
          : '<' + tag + '>';
        showToast('Applied ' + tagDisplay, 'success');

        // Note: Selection restoration after document update is not currently supported
        // due to document revision changing on each update
      } catch (error) {
        console.error('Failed to apply tag:', error);
        showToast('Failed to apply tag - See console for details', 'error');
      }
    },
    [document, addSaidTag, addTag, showToast, showToastWithActions, multiTagMode, addToQueue]
  );

  // Handle tag attribute updates from edit dialog
  const handleTagAttributeUpdate = useCallback(
    async (tagName: string, attributes: Record<string, string>) => {
      if (!document || !tagToEdit) return;

      try {
        // Find the element and update its attributes
        const element = tagToEdit.element;
        if (!element) {
          showToast('Element not found', 'error');
          return;
        }

        // Update data attributes on the element
        Object.entries(attributes).forEach(([key, value]) => {
          element.setAttribute('data-' + key, value);
        });

        // Update the document structure
        const { serializeDocument } = await import('@/lib/tei/operations');
        const updatedXML = serializeDocument(document);
        await updateDocument(updatedXML);

        showToast('Updated <' + tagName + '> attributes', 'success');
      } catch (error) {
        console.error('Failed to update tag attributes:', error);
        showToast('Failed to update tag attributes', 'error');
      }
    },
    [document, tagToEdit, updateDocument, showToast]
  );

  return {
    // Document state
    document,
    updateDocument,
    loadingSample,
    loadingProgress,
    validationResults,
    isValidating,
    addSaidTag,
    addTag,
    // Passage navigation
    activePassageIndex,
    setActivePassageIndex,
    currentPassageId,
    setCurrentPassageId,
    highlightedPassageId,
    setHighlightedPassageId,
    // Tag operations
    handleApplyTag,
    // Selection manager
    selectionManager: selectionManager.current,
    // Helper functions
    getPassageIds,
    handleTagAttributeUpdate,
    // Tag queue
    queue: {
      state: queueState,
      multiTagMode,
      toggleMultiTagMode,
      addToQueue,
      removeFromQueue,
      clearQueue,
      applyQueue,
      isApplyingQueue,
    },
  };
}
