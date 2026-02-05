/**
 * Tests for useSelection hook
 */

import { renderHook, act } from '@testing-library/react';
import { useSelection } from '@/hooks/useSelection';
import type { Selection } from '@/lib/values/Selection';

// Mock DOM utilities
function createMockPassageElement(passageId: string, text: string): HTMLElement {
  const passageDiv = document.createElement('div');
  passageDiv.setAttribute('data-passage-id', passageId);
  passageDiv.textContent = text;
  document.body.appendChild(passageDiv);
  return passageDiv;
}

function cleanupMockElements() {
  document.body.innerHTML = '';
}

describe('useSelection', () => {
  beforeEach(() => {
    cleanupMockElements();
  });

  afterEach(() => {
    cleanupMockElements();
  });

  it('should return null initially', () => {
    const { result } = renderHook(() => useSelection());
    expect(result.current).toBeNull();
  });

  it('should return null when no selection exists', () => {
    const { result } = renderHook(() => useSelection());

    // Mock empty selection
    const mockSelection = {
      rangeCount: 0,
      toString: () => '',
    };

    const originalGetSelection = window.getSelection;
    window.getSelection = jest.fn(() => mockSelection as any);

    act(() => {
      const event = new Event('selectionchange');
      document.dispatchEvent(event);
    });

    window.getSelection = originalGetSelection;

    expect(result.current).toBeNull();
  });

  it('should capture selection with passage ID from DOM', () => {
    // Create a mock passage element in DOM
    const passageDiv = createMockPassageElement('passage-123', 'Hello world this is a test');

    // Create a text node within the passage
    const textNode = passageDiv.firstChild!;

    const mockRange = {
      startContainer: textNode,
      endContainer: textNode,
      startOffset: 0,
      endOffset: 5,
      commonAncestorContainer: textNode,
      cloneRange: () => ({}),
    };

    const mockSelection = {
      rangeCount: 1,
      getRangeAt: (index: number) => mockRange,
      toString: () => 'Hello',
    };

    const originalGetSelection = window.getSelection;
    window.getSelection = jest.fn(() => mockSelection as any);

    const { result } = renderHook(() => useSelection());

    act(() => {
      const event = new Event('selectionchange');
      document.dispatchEvent(event);
    });

    window.getSelection = originalGetSelection;

    const selection = result.current as Selection | null;
    expect(selection).not.toBeNull();
    expect(selection?.passageId).toBe('passage-123');
    expect(selection?.text).toBe('Hello');
  });

  it('should update selection when user changes text selection', () => {
    const passageDiv = createMockPassageElement('passage-456', 'Hello world this is a test');
    const textNode = passageDiv.firstChild!;

    const mockRange1 = {
      startContainer: textNode,
      endContainer: textNode,
      startOffset: 0,
      endOffset: 5,
      commonAncestorContainer: textNode,
      cloneRange: () => ({}),
    };

    const mockSelection1 = {
      rangeCount: 1,
      getRangeAt: () => mockRange1,
      toString: () => 'Hello',
    };

    const originalGetSelection = window.getSelection;
    window.getSelection = jest.fn(() => mockSelection1 as any);

    const { result } = renderHook(() => useSelection());

    act(() => {
      const event = new Event('selectionchange');
      document.dispatchEvent(event);
    });

    const firstSelection = result.current;
    expect(firstSelection).not.toBeNull();
    expect(firstSelection?.text).toBe('Hello');

    // Change selection
    const mockRange2 = {
      startContainer: textNode,
      endContainer: textNode,
      startOffset: 6,
      endOffset: 11,
      commonAncestorContainer: textNode,
      cloneRange: () => ({}),
    };

    const mockSelection2 = {
      rangeCount: 1,
      getRangeAt: () => mockRange2,
      toString: () => 'world',
    };

    window.getSelection = jest.fn(() => mockSelection2 as any);

    act(() => {
      const event = new Event('selectionchange');
      document.dispatchEvent(event);
    });

    window.getSelection = originalGetSelection;

    const secondSelection = result.current;
    expect(secondSelection).not.toBeNull();
    expect(secondSelection?.text).toBe('world');
    expect(secondSelection).not.toEqual(firstSelection);
  });

  it('should return null for empty text selection', () => {
    const passageDiv = createMockPassageElement('passage-789', 'Hello world');
    const textNode = passageDiv.firstChild!;

    const mockRange = {
      startContainer: textNode,
      endContainer: textNode,
      startOffset: 0,
      endOffset: 0,
      commonAncestorContainer: textNode,
      cloneRange: () => ({}),
    };

    const mockSelection = {
      rangeCount: 1,
      getRangeAt: () => mockRange,
      toString: () => '',
    };

    const originalGetSelection = window.getSelection;
    window.getSelection = jest.fn(() => mockSelection as any);

    const { result } = renderHook(() => useSelection());

    act(() => {
      const event = new Event('selectionchange');
      document.dispatchEvent(event);
    });

    window.getSelection = originalGetSelection;

    expect(result.current).toBeNull();
  });

  it('should cleanup event listener on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');

    const { unmount } = renderHook(() => useSelection());

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('selectionchange', expect.any(Function));
  });
});
