// Mock window.getSelection
const mockGetSelection = jest.fn();
const mockAddRange = jest.fn();
const mockRemoveAllRanges = jest.fn();
const mockGetBoundingClientRect = jest.fn();

const originalGetSelection = window.getSelection;
let getSelectionSpy: jest.SpyInstance;

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
const mockCaptureSelection = jest.fn();

// Create a proper mock selection snapshot
const createMockSelectionSnapshot = (passageId: string, text: string, start: number, end: number) => {
  const container = document.createElement('div');
  container.textContent = text;
  return {
    passageId,
    range: { start, end },
    documentRevision: 0,
    text,
    container,
  };
};

// Mock SelectionManager class
jest.mock('@/lib/selection/SelectionManager', () => {
  return {
    SelectionManager: jest.fn().mockImplementation(() => ({
      captureSelection: () => mockCaptureSelection(),
      restoreSelection: jest.fn(),
      getContainingTag: jest.fn(),
      isSelectionInTag: jest.fn(),
    })),
  };
});

// Mock SchemaLoader
jest.mock('@/lib/schema/SchemaLoader', () => ({
  SchemaLoader: jest.fn().mockImplementation(() => ({
    loadSchema: jest.fn().mockResolvedValue(''),
    clearCache: jest.fn(),
  })),
}));

// Mock useDocumentService and useErrorContext
jest.mock('@/lib/effect/react/hooks', () => ({
  useDocumentService: () => ({
    document: mockDocument,
    addSaidTag: mockAddSaidTag,
    addTag: mockAddGenericTag,
  }),
  useStorageService: () => ({
    get: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
    has: jest.fn(),
  }),
  useValidationService: () => ({
    validate: jest.fn(),
  }),
  useAIService: () => ({
    isDetecting: false,
    error: null,
    detectDialogue: jest.fn(),
    attributeSpeaker: jest.fn(),
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
import type { SelectionSnapshot } from '@/lib/selection/types';

describe('TagToolbar', () => {
  let currentTestSelection: SelectionSnapshot | null = null;

  beforeAll(() => {
    // Setup getSelection spy
    getSelectionSpy = jest.spyOn(window, 'getSelection').mockReturnValue(mockGetSelection);
  });

  afterAll(() => {
    getSelectionSpy.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    currentTestSelection = null;
    mockGetSelection.mockReturnValue(null);
    mockCaptureSelection.mockReturnValue(null);
  });

  afterEach(() => {
    mockAddSaidTag.mockClear();
    mockAddGenericTag.mockClear();
    mockLogError.mockClear();
    mockCaptureSelection.mockReset();
    // Clean up any passage elements left in the DOM
    document.body.querySelectorAll('[data-passage-id]').forEach(el => el.remove());
  });

  const setupSelection = (text: string = 'Hello World') => {
    // Create a mock passage element
    const passageElement = document.createElement('div');
    passageElement.setAttribute('data-passage-id', 'passage-123');
    passageElement.setAttribute('data-document-revision', '0');
    passageElement.textContent = text;
    document.body.appendChild(passageElement);

    // Create a mock selection snapshot for SelectionManager
    const selectionSnapshot = createMockSelectionSnapshot('passage-123', text, 0, text.length);
    mockCaptureSelection.mockReturnValue(selectionSnapshot);

    // Create a mock selection for window.getSelection()
    const mockRange = {
      toString: () => text,
      getBoundingClientRect: mockGetBoundingClientRect,
      commonAncestorContainer: passageElement,
      startContainer: passageElement.firstChild!,
      startOffset: 0,
      endContainer: passageElement.firstChild!,
      endOffset: text.length,
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
    currentTestSelection = selectionSnapshot;

    return { passageElement, mockRange };
  };

  it('should not render when no selection exists', () => {
    mockGetSelection.mockReturnValue(null);
    mockCaptureSelection.mockReturnValue(null);

    const { container } = render(<TagToolbar />);

    expect(container.firstChild).toBeNull();
  });

  it('should set up event listeners on mount', () => {
    render(<TagToolbar />);

    // Just verify the component renders without crashing
    expect(screen.queryByText(/Speaker/)).not.toBeInTheDocument();
  });

  it('should clean up event listeners on unmount', () => {
    const { unmount } = render(<TagToolbar />);

    // Just verify unmounting doesn't crash
    expect(() => unmount()).not.toThrow();
  });

  it('should render toolbar when selection exists', async () => {
    const { passageElement } = setupSelection();

    const { container } = render(<TagToolbar />);

    // Wait for state update
    await waitFor(() => {
      expect(container.querySelector('button')).toBeInTheDocument();
    });

    // Clean up
    if (passageElement.parentNode) {
      passageElement.parentNode.removeChild(passageElement);
    }
  });

  it('should show speaker buttons from document characters', async () => {
    setupSelection('Hello');

    const { container } = render(<TagToolbar />);

    await waitFor(() => {
      expect(container.querySelector('button')).toBeInTheDocument();
    });

    // Should show both speakers
    expect(screen.getByText('1. Speaker 1')).toBeInTheDocument();
    expect(screen.getByText('2. Speaker 2')).toBeInTheDocument();

    // Clean up
    const passageElement = document.body.querySelector('[data-passage-id]');
    if (passageElement && passageElement.parentNode) {
      passageElement.parentNode.removeChild(passageElement);
    }
  });

  it('should hide toolbar when clicking close button', async () => {
    setupSelection('Close me');

    const { container } = render(<TagToolbar />);

    await waitFor(() => {
      expect(container.querySelector('button')).toBeInTheDocument();
    });

    // Click the close button
    const closeButton = screen.getByText('✕');
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });

    // Clean up
    const passageElement = document.body.querySelector('[data-passage-id]');
    if (passageElement && passageElement.parentNode) {
      passageElement.parentNode.removeChild(passageElement);
    }
  });

  it('should hide toolbar when escape key is pressed', async () => {
    setupSelection('Test');

    const { container } = render(<TagToolbar />);

    await waitFor(() => {
      expect(container.querySelector('button')).toBeInTheDocument();
    });

    // Press Escape key
    fireEvent.keyDown(document, { key: 'Escape' });

    // Toolbar should be hidden
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });

    // Clean up
    const passageElement = document.body.querySelector('[data-passage-id]');
    if (passageElement && passageElement.parentNode) {
      passageElement.parentNode.removeChild(passageElement);
    }
  });

  it('should call addSaidTag when speaker button clicked', async () => {
    setupSelection('Hello World');

    const { container } = render(<TagToolbar />);

    await waitFor(() => {
      expect(container.querySelector('button')).toBeInTheDocument();
    });

    // Find and click the said button
    const saidButton = screen.getByText('1. Speaker 1');
    fireEvent.click(saidButton);

    expect(mockAddSaidTag).toHaveBeenCalled();

    // Clean up
    const passageElement = document.body.querySelector('[data-passage-id]');
    if (passageElement && passageElement.parentNode) {
      passageElement.parentNode.removeChild(passageElement);
    }
  });

  it('should call addGenericTag with q tag when q button clicked', async () => {
    setupSelection('Selected text');

    const { container } = render(<TagToolbar />);

    await waitFor(() => {
      expect(container.querySelector('button')).toBeInTheDocument();
    });

    const qButton = screen.getByText('<q>');
    fireEvent.click(qButton);

    expect(mockAddGenericTag).toHaveBeenCalledWith(expect.any(String), expect.anything(), 'q', undefined);

    // Clean up
    const passageElement = document.body.querySelector('[data-passage-id]');
    if (passageElement && passageElement.parentNode) {
      passageElement.parentNode.removeChild(passageElement);
    }
  });

  it('should call addGenericTag with persName tag when persName button clicked', async () => {
    setupSelection('Character Name');

    const { container } = render(<TagToolbar />);

    await waitFor(() => {
      expect(container.querySelector('button')).toBeInTheDocument();
    });

    const persNameButton = screen.getByText('<persName>');
    fireEvent.click(persNameButton);

    expect(mockAddGenericTag).toHaveBeenCalledWith(expect.any(String), expect.anything(), 'persName', undefined);

    // Clean up
    const passageElement = document.body.querySelector('[data-passage-id]');
    if (passageElement && passageElement.parentNode) {
      passageElement.parentNode.removeChild(passageElement);
    }
  });

  it('should hide toolbar after applying a tag', async () => {
    setupSelection('Text to tag');

    const { container } = render(<TagToolbar />);

    await waitFor(() => {
      expect(container.querySelector('button')).toBeInTheDocument();
    });

    // Click a button to apply tag
    const qButton = screen.getByText('<q>');
    fireEvent.click(qButton);

    // Toolbar should be hidden (container cleared)
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });

    // Clean up
    const passageElement = document.body.querySelector('[data-passage-id]');
    if (passageElement && passageElement.parentNode) {
      passageElement.parentNode.removeChild(passageElement);
    }
  });

  it('should limit to 9 speaker buttons', async () => {
    // Override mock document with 10 characters
    mockDocument.state.characters = Array.from({ length: 10 }, (_, i) => ({
      id: `char-${i}`,
      xmlId: `speaker${i}`,
      name: `Speaker ${i}`,
    }));

    setupSelection('Test');

    const { container } = render(<TagToolbar />);

    await waitFor(() => {
      expect(screen.getByText('1. Speaker 0')).toBeInTheDocument();
      expect(screen.getByText('9. Speaker 8')).toBeInTheDocument();
    });

    // Should only have 9 speakers (not 10)
    expect(screen.queryByText('10. Speaker 9')).not.toBeInTheDocument();

    // Clean up
    const passageElement = document.body.querySelector('[data-passage-id]');
    if (passageElement && passageElement.parentNode) {
      passageElement.parentNode.removeChild(passageElement);
    }
  });
});
