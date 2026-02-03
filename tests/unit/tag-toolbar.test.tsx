// Mock window.getSelection and related methods
const mockGetSelection = jest.fn();
const mockAddRange = jest.fn();
const mockRemoveAllRanges = jest.fn();
const mockGetBoundingClientRect = jest.fn();

Object.defineProperty(window, 'getSelection', {
  value: mockGetSelection,
  writable: true,
});

// Mock document.addEventListener and document.removeEventListener
const mockAddEventListener = jest.fn();
const mockRemoveEventListener = jest.fn();

Object.defineProperty(document, 'addEventListener', {
  value: mockAddEventListener,
  writable: true,
});

Object.defineProperty(document, 'removeEventListener', {
  value: mockRemoveEventListener,
  writable: true,
});

// Mock document with characters
const mockDocument: any = {
  state: {
    xml: '',
    parsed: {},
    revision: 0,
    metadata: {},
    passages: [],
    dialogue: [],
    characters: [
      { id: 'char-1', xmlId: 'speaker1', name: 'Speaker 1' },
      { id: 'char-2', xmlId: 'speaker2', name: 'Speaker 2' },
    ],
    relationships: [],
  },
  events: [],
};

// Mock functions
const mockAddSaidTag = jest.fn();
const mockAddGenericTag = jest.fn();
const mockLogError = jest.fn();

// Mock useDocumentContext and useErrorContext
jest.mock('@/lib/context/DocumentContext', () => ({
  useDocumentContext: () => ({
    document: mockDocument,
    addSaidTag: mockAddSaidTag,
    addGenericTag: mockAddGenericTag,
  }),
}));

jest.mock('@/lib/context/ErrorContext', () => ({
  useErrorContext: () => ({
    logError: mockLogError,
  }),
}));

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TagToolbar } from '@/components/editor/TagToolbar';
import type { TEIDocument } from '@/lib/tei/types';

describe('TagToolbar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset selection mock to return no selection by default
    mockGetSelection.mockReturnValue(null);
  });

  afterEach(() => {
    // Clean up any event listeners
    mockAddEventListener.mockClear();
    mockRemoveEventListener.mockClear();
    mockAddSaidTag.mockClear();
    mockAddGenericTag.mockClear();
    mockLogError.mockClear();
  });

  it('should not render when no selection exists', () => {
    mockGetSelection.mockReturnValue(null);

    const { container } = render(<TagToolbar />);

    expect(container.firstChild).toBeNull();
  });

  it('should set up event listeners on mount', () => {
    render(<TagToolbar />);

    expect(mockAddEventListener).toHaveBeenCalledWith('mouseup', expect.any(Function));
    expect(mockAddEventListener).toHaveBeenCalledWith('keyup', expect.any(Function));
  });

  it('should clean up event listeners on unmount', () => {
    const { unmount } = render(<TagToolbar />);

    unmount();

    expect(mockRemoveEventListener).toHaveBeenCalledWith('mouseup', expect.any(Function));
    expect(mockRemoveEventListener).toHaveBeenCalledWith('keyup', expect.any(Function));
  });

  it('should call addSaidTag when said button clicked', async () => {
    // Create a mock passage element
    const passageElement = document.createElement('div');
    passageElement.setAttribute('data-passage-id', 'passage-123');
    passageElement.textContent = 'Hello World';
    document.body.appendChild(passageElement);

    // Create a mock selection with text
    const mockRange = {
      toString: () => 'Hello World',
      getBoundingClientRect: mockGetBoundingClientRect,
      commonAncestorContainer: passageElement,
      startContainer: passageElement.firstChild!,
      startOffset: 0,
      endContainer: passageElement.firstChild!,
      endOffset: 5,
    };

    mockGetBoundingClientRect.mockReturnValue({
      left: 100,
      top: 100,
      width: 50,
      right: 150,
      bottom: 150,
      x: 100,
      y: 100,
      height: 50,
      toJSON: () => ({})
    });

    const mockSelection = {
      rangeCount: 1,
      getRangeAt: () => mockRange,
      removeAllRanges: mockRemoveAllRanges,
      addRange: mockAddRange,
    };

    mockGetSelection.mockReturnValue(mockSelection as unknown as Selection);

    const { container } = render(<TagToolbar />);

    // Trigger the selection handler by calling the event listener callback
    const mouseupCallback = mockAddEventListener.mock.calls.find(
      call => call[0] === 'mouseup'
    )?.[1];

    if (mouseupCallback) {
      mouseupCallback();
    }

    // Wait for state update
    await waitFor(() => {
      expect(container.firstChild).not.toBeNull();
    });

    // Find and click the said button
    const saidButton = screen.getByText('1. Speaker 1');
    fireEvent.click(saidButton);

    expect(mockAddSaidTag).toHaveBeenCalled();
    expect(mockAddSaidTag).toHaveBeenCalledTimes(1);

    // Clean up
    document.body.removeChild(passageElement);
  });

  it('should call addGenericTag with q tag when q button clicked', async () => {
    const passageElement = document.createElement('div');
    passageElement.setAttribute('data-passage-id', 'passage-456');
    passageElement.textContent = 'Selected text';
    document.body.appendChild(passageElement);

    const mockRange = {
      toString: () => 'Selected text',
      getBoundingClientRect: mockGetBoundingClientRect,
      commonAncestorContainer: passageElement,
      startContainer: passageElement.firstChild!,
      startOffset: 0,
      endContainer: passageElement.firstChild!,
      endOffset: 13,
    };

    mockGetBoundingClientRect.mockReturnValue({
      left: 200,
      top: 200,
      width: 100,
      right: 300,
      bottom: 250,
      x: 200,
      y: 200,
      height: 50,
      toJSON: () => ({})
    });

    const mockSelection = {
      rangeCount: 1,
      getRangeAt: () => mockRange,
      removeAllRanges: mockRemoveAllRanges,
      addRange: mockAddRange,
    };

    mockGetSelection.mockReturnValue(mockSelection as unknown as Selection);

    const { container } = render(<TagToolbar />);

    // Trigger the selection handler
    const mouseupCallback = mockAddEventListener.mock.calls.find(
      call => call[0] === 'mouseup'
    )?.[1];

    if (mouseupCallback) {
      mouseupCallback();
    }

    await waitFor(() => {
      expect(container.firstChild).not.toBeNull();
    });

    const qButton = screen.getByText('<q>');
    fireEvent.click(qButton);

    expect(mockAddGenericTag).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ start: 0, end: 13 }), 'q', undefined);

    document.body.removeChild(passageElement);
  });

  it('should call addGenericTag with persName tag when persName button clicked', async () => {
    const passageElement = document.createElement('div');
    passageElement.setAttribute('data-passage-id', 'passage-789');
    passageElement.textContent = 'Character Name';
    document.body.appendChild(passageElement);

    const mockRange = {
      toString: () => 'Character Name',
      getBoundingClientRect: mockGetBoundingClientRect,
      commonAncestorContainer: passageElement,
      startContainer: passageElement.firstChild!,
      startOffset: 0,
      endContainer: passageElement.firstChild!,
      endOffset: 14,
    };

    mockGetBoundingClientRect.mockReturnValue({
      left: 150,
      top: 150,
      width: 75,
      right: 225,
      bottom: 175,
      x: 150,
      y: 150,
      height: 25,
      toJSON: () => ({})
    });

    const mockSelection = {
      rangeCount: 1,
      getRangeAt: () => mockRange,
      removeAllRanges: mockRemoveAllRanges,
      addRange: mockAddRange,
    };

    mockGetSelection.mockReturnValue(mockSelection as unknown as Selection);

    const { container } = render(<TagToolbar />);

    // Trigger the selection handler
    const mouseupCallback = mockAddEventListener.mock.calls.find(
      call => call[0] === 'mouseup'
    )?.[1];

    if (mouseupCallback) {
      mouseupCallback();
    }

    await waitFor(() => {
      expect(container.firstChild).not.toBeNull();
    });

    const persNameButton = screen.getByText('<persName>');
    fireEvent.click(persNameButton);

    expect(mockAddGenericTag).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ start: 0, end: 14 }), 'persName', undefined);

    document.body.removeChild(passageElement);
  });

  it('should hide toolbar after applying a tag', async () => {
    const passageElement = document.createElement('div');
    passageElement.setAttribute('data-passage-id', 'passage-hide');
    passageElement.textContent = 'Text to tag';
    document.body.appendChild(passageElement);

    const mockRange = {
      toString: () => 'Text to tag',
      getBoundingClientRect: mockGetBoundingClientRect,
      commonAncestorContainer: passageElement,
      startContainer: passageElement.firstChild!,
      startOffset: 0,
      endContainer: passageElement.firstChild!,
      endOffset: 12,
    };

    mockGetBoundingClientRect.mockReturnValue({
      left: 100,
      top: 100,
      width: 50,
      right: 150,
      bottom: 150,
      x: 100,
      y: 100,
      height: 50,
      toJSON: () => ({})
    });

    const mockSelection = {
      rangeCount: 1,
      getRangeAt: () => mockRange,
      removeAllRanges: mockRemoveAllRanges,
      addRange: mockAddRange,
    };

    mockGetSelection.mockReturnValue(mockSelection as unknown as Selection);

    const { container } = render(<TagToolbar />);

    const mouseupCallback = mockAddEventListener.mock.calls.find(
      call => call[0] === 'mouseup'
    )?.[1];

    if (mouseupCallback) {
      mouseupCallback();
    }

    await waitFor(() => {
      expect(container.firstChild).not.toBeNull();
    });

    // Click a button to apply tag
    const qButton = screen.getByText('<q>');
    fireEvent.click(qButton);

    // Toolbar should be hidden (container cleared)
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });

    document.body.removeChild(passageElement);
  });

  it('should hide toolbar when escape key is pressed', async () => {
    const passageElement = document.createElement('div');
    passageElement.setAttribute('data-passage-id', 'passage-escape');
    passageElement.textContent = 'Test';
    document.body.appendChild(passageElement);

    const mockRange = {
      toString: () => 'Test',
      getBoundingClientRect: mockGetBoundingClientRect,
      commonAncestorContainer: passageElement,
      startContainer: passageElement.firstChild!,
      startOffset: 0,
      endContainer: passageElement.firstChild!,
      endOffset: 4,
    };

    mockGetBoundingClientRect.mockReturnValue({
      left: 50,
      top: 50,
      width: 30,
      right: 80,
      bottom: 80,
      x: 50,
      y: 50,
      height: 30,
      toJSON: () => ({})
    });

    const mockSelection = {
      rangeCount: 1,
      getRangeAt: () => mockRange,
      removeAllRanges: mockRemoveAllRanges,
      addRange: mockAddRange,
    };

    mockGetSelection.mockReturnValue(mockSelection as unknown as Selection);

    const { container } = render(<TagToolbar />);

    const mouseupCallback = mockAddEventListener.mock.calls.find(
      call => call[0] === 'mouseup'
    )?.[1];

    if (mouseupCallback) {
      mouseupCallback();
    }

    await waitFor(() => {
      expect(container.firstChild).not.toBeNull();
    });

    // Press Escape key
    const keydownCallback = mockAddEventListener.mock.calls.find(
      call => call[0] === 'keydown'
    )?.[1];

    if (keydownCallback) {
      keydownCallback({ key: 'Escape' } as KeyboardEvent);
    }

    // Toolbar should be hidden
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });

    document.body.removeChild(passageElement);
  });

  it('should render speaker buttons from document characters', async () => {
    const passageElement = document.createElement('div');
    passageElement.setAttribute('data-passage-id', 'passage-speakers');
    passageElement.textContent = 'Hello';
    document.body.appendChild(passageElement);

    const mockRange = {
      toString: () => 'Hello',
      getBoundingClientRect: mockGetBoundingClientRect,
      commonAncestorContainer: passageElement,
      startContainer: passageElement.firstChild!,
      startOffset: 0,
      endContainer: passageElement.firstChild!,
      endOffset: 5,
    };

    mockGetBoundingClientRect.mockReturnValue({
      left: 100,
      top: 100,
      width: 50,
      right: 150,
      bottom: 150,
      x: 100,
      y: 100,
      height: 50,
      toJSON: () => ({})
    });

    const mockSelection = {
      rangeCount: 1,
      getRangeAt: () => mockRange,
      removeAllRanges: mockRemoveAllRanges,
      addRange: mockAddRange,
    };

    mockGetSelection.mockReturnValue(mockSelection as unknown as Selection);

    const { container } = render(<TagToolbar />);

    const mouseupCallback = mockAddEventListener.mock.calls.find(
      call => call[0] === 'mouseup'
    )?.[1];

    if (mouseupCallback) {
      mouseupCallback();
    }

    await waitFor(() => {
      expect(container.firstChild).not.toBeNull();
    });

    // Should show both speakers
    expect(screen.getByText('1. Speaker 1')).toBeInTheDocument();
    expect(screen.getByText('2. Speaker 2')).toBeInTheDocument();

    document.body.removeChild(passageElement);
  });

  it('should close toolbar when clicking close button', async () => {
    const passageElement = document.createElement('div');
    passageElement.setAttribute('data-passage-id', 'passage-close');
    passageElement.textContent = 'Close me';
    document.body.appendChild(passageElement);

    const mockRange = {
      toString: () => 'Close me',
      getBoundingClientRect: mockGetBoundingClientRect,
      commonAncestorContainer: passageElement,
      startContainer: passageElement.firstChild!,
      startOffset: 0,
      endContainer: passageElement.firstChild!,
      endOffset: 8,
    };

    mockGetBoundingClientRect.mockReturnValue({
      left: 100,
      top: 100,
      width: 50,
      right: 150,
      bottom: 150,
      x: 100,
      y: 100,
      height: 50,
      toJSON: () => ({})
    });

    const mockSelection = {
      rangeCount: 1,
      getRangeAt: () => mockRange,
      removeAllRanges: mockRemoveAllRanges,
      addRange: mockAddRange,
    };

    mockGetSelection.mockReturnValue(mockSelection as unknown as Selection);

    const { container } = render(<TagToolbar />);

    const mouseupCallback = mockAddEventListener.mock.calls.find(
      call => call[0] === 'mouseup'
    )?.[1];

    if (mouseupCallback) {
      mouseupCallback();
    }

    await waitFor(() => {
      expect(container.firstChild).not.toBeNull();
    });

    // Click the close button
    const closeButton = screen.getByText('✕');
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });

    document.body.removeChild(passageElement);
  });

  it('should limit to 9 speaker buttons', async () => {
    // Override mock document with 10 characters
    mockDocument.state.characters = Array.from({ length: 10 }, (_, i) => ({
      id: `char-${i}`,
      xmlId: `speaker${i}`,
      name: `Speaker ${i}`,
    }));

    const passageElement = document.createElement('div');
    passageElement.setAttribute('data-passage-id', 'passage-limit');
    passageElement.textContent = 'Test';
    document.body.appendChild(passageElement);

    const mockRange = {
      toString: () => 'Test',
      getBoundingClientRect: mockGetBoundingClientRect,
      commonAncestorContainer: passageElement,
      startContainer: passageElement.firstChild!,
      startOffset: 0,
      endContainer: passageElement.firstChild!,
      endOffset: 4,
    };

    mockGetBoundingClientRect.mockReturnValue({
      left: 100,
      top: 100,
      width: 50,
      right: 150,
      bottom: 150,
      x: 100,
      y: 100,
      height: 50,
      toJSON: () => ({})
    });

    const mockSelection = {
      rangeCount: 1,
      getRangeAt: () => mockRange,
      removeAllRanges: mockRemoveAllRanges,
      addRange: mockAddRange,
    };

    mockGetSelection.mockReturnValue(mockSelection as unknown as Selection);

    render(<TagToolbar />);

    const mouseupCallback = mockAddEventListener.mock.calls.find(
      call => call[0] === 'mouseup'
    )?.[1];

    if (mouseupCallback) {
      mouseupCallback();
    }

    await waitFor(() => {
      expect(screen.getByText('1. Speaker 0')).toBeInTheDocument();
      expect(screen.getByText('9. Speaker 8')).toBeInTheDocument();
    });

    // Should only have 9 speakers (not 10)
    expect(screen.queryByText('10. Speaker 9')).not.toBeInTheDocument();

    document.body.removeChild(passageElement);
  });
});
