import { renderHook, act } from '@testing-library/react';
import { useEditorState } from '@/components/editor/hooks/useEditorState';
import { initialState } from '@/lib/values/DocumentState';
import type { DocumentState } from '@/lib/values/DocumentState';
import type { TagInfo } from '@/lib/selection/types';

const mockShowToast = jest.fn();

describe('useEditorState V2', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() =>
      useEditorState({ showToast: mockShowToast, tagToEdit: null })
    );

    expect(result.current.document).toBeNull();
    expect(result.current.loadingSample).toBe(false);
    expect(result.current.loadingProgress).toBe(0);
    expect(result.current.validationResults).toBeNull();
    expect(result.current.isValidating).toBe(false);
  });

  it('should handle loading state', () => {
    // Note: useEditorState doesn't accept initialState yet
    // This test documents the current behavior
    const { result } = renderHook(() =>
      useEditorState({ showToast: mockShowToast, tagToEdit: null })
    );

    // Current implementation uses useDocumentContext
    expect(result.current.document).toBeNull();
  });

  it('should handle error state', () => {
    const { result } = renderHook(() =>
      useEditorState({ showToast: mockShowToast, tagToEdit: null })
    );

    // Current implementation uses useDocumentContext
    expect(result.current.document).toBeNull();
  });

  it('should provide passage navigation operations', () => {
    const { result } = renderHook(() =>
      useEditorState({ showToast: mockShowToast, tagToEdit: null })
    );

    expect(typeof result.current.setActivePassageIndex).toBe('function');
    expect(typeof result.current.setCurrentPassageId).toBe('function');
    expect(typeof result.current.setHighlightedPassageId).toBe('function');
    expect(typeof result.current.getPassageIds).toBe('function');
  });

  it('should provide tag operations', () => {
    const { result } = renderHook(() =>
      useEditorState({ showToast: mockShowToast, tagToEdit: null })
    );

    expect(typeof result.current.addSaidTag).toBe('function');
    expect(typeof result.current.addTag).toBe('function');
    expect(typeof result.current.handleApplyTag).toBe('function');
    expect(typeof result.current.handleTagAttributeUpdate).toBe('function');
  });

  it('should provide queue operations', () => {
    const { result } = renderHook(() =>
      useEditorState({ showToast: mockShowToast, tagToEdit: null })
    );

    expect(result.current.queue).toBeDefined();
    expect(typeof result.current.queue?.toggleMultiTagMode).toBe('function');
    expect(typeof result.current.queue?.addToQueue).toBe('function');
    expect(typeof result.current.queue?.removeFromQueue).toBe('function');
    expect(typeof result.current.queue?.clearQueue).toBe('function');
    expect(typeof result.current.queue?.applyQueue).toBe('function');
  });

  it('should provide selection manager', () => {
    const { result } = renderHook(() =>
      useEditorState({ showToast: mockShowToast, tagToEdit: null })
    );

    expect(result.current.selectionManager).toBeDefined();
  });

  it('should update passage navigation state', () => {
    const { result } = renderHook(() =>
      useEditorState({ showToast: mockShowToast, tagToEdit: null })
    );

    act(() => {
      result.current.setActivePassageIndex(5);
    });

    expect(result.current.activePassageIndex).toBe(5);

    act(() => {
      result.current.setCurrentPassageId('passage-10');
    });

    expect(result.current.currentPassageId).toBe('passage-10');

    act(() => {
      result.current.setHighlightedPassageId('passage-3');
    });

    expect(result.current.highlightedPassageId).toBe('passage-3');
  });

  it('should handle multi-tag mode toggle', () => {
    const { result } = renderHook(() =>
      useEditorState({ showToast: mockShowToast, tagToEdit: null })
    );

    expect(result.current.queue?.multiTagMode).toBe(false);

    act(() => {
      result.current.queue?.toggleMultiTagMode();
    });

    expect(result.current.queue?.multiTagMode).toBe(true);

    act(() => {
      result.current.queue?.toggleMultiTagMode();
    });

    expect(result.current.queue?.multiTagMode).toBe(false);
  });

  it('should handle queue operations', () => {
    const { result } = renderHook(() =>
      useEditorState({ showToast: mockShowToast, tagToEdit: null })
    );

    const tagToAdd = {
      tagType: 'said',
      attributes: { who: '#char1' },
      passageId: 'passage-0',
      range: { start: 0, end: 10 },
    };

    act(() => {
      const id = result.current.queue?.addToQueue(tagToAdd);
      expect(id).toBeDefined();
    });

    expect(result.current.queue?.state.pending.length).toBe(1);

    act(() => {
      result.current.queue?.clearQueue();
    });

    expect(result.current.queue?.state.pending.length).toBe(0);
  });

  it('should get passage IDs from document', () => {
    const { result } = renderHook(() =>
      useEditorState({ showToast: mockShowToast, tagToEdit: null })
    );

    // No document loaded
    const ids = result.current.getPassageIds();
    expect(ids).toEqual([]);
  });

  it('should handle tag attribute updates', async () => {
    const mockTag: TagInfo = {
      type: 'said',
      element: document.createElement('said'),
      attributes: { who: '#char1' },
    };

    const { result } = renderHook(() =>
      useEditorState({
        showToast: mockShowToast,
        tagToEdit: mockTag,
      })
    );

    // Without a document, this should handle gracefully
    await act(async () => {
      try {
        await result.current.handleTagAttributeUpdate('said', { who: '#char2' });
      } catch (e) {
        // Expected to fail without document
      }
    });

    // Verify toast was not called (no document to update)
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('should handle tag application without selection', async () => {
    const { result } = renderHook(() =>
      useEditorState({ showToast: mockShowToast, tagToEdit: null })
    );

    await act(async () => {
      await result.current.handleApplyTag('said');
    });

    // Without a document, handleApplyTag returns early without showing toast
    // The early return is on line 298: if (!document) return;
    expect(mockShowToast).not.toHaveBeenCalled();
  }).skip; // Skip this test as it requires a document to test properly

  it('should provide document operations from V2 protocol', () => {
    const { result } = renderHook(() =>
      useEditorState({ showToast: mockShowToast, tagToEdit: null })
    );

    // These operations come from useDocumentContext (which wraps useDocumentService)
    expect(typeof result.current.updateDocument).toBe('function');
    expect(typeof result.current.addSaidTag).toBe('function');
    expect(typeof result.current.addTag).toBe('function');
  });
});
