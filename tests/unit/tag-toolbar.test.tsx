import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TagToolbar } from '@/components/editor/TagToolbar';

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

describe('TagToolbar', () => {
  const mockOnApplyTag = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset selection mock to return no selection by default
    mockGetSelection.mockReturnValue(null);
  });

  afterEach(() => {
    // Clean up any event listeners
    mockAddEventListener.mockClear();
    mockRemoveEventListener.mockClear();
  });

  it('should not render when no selection exists', () => {
    mockGetSelection.mockReturnValue(null);

    const { container } = render(<TagToolbar onApplyTag={mockOnApplyTag} />);

    expect(container.firstChild).toBeNull();
  });

  it('should set up event listeners on mount', () => {
    render(<TagToolbar onApplyTag={mockOnApplyTag} />);

    expect(mockAddEventListener).toHaveBeenCalledWith('mouseup', expect.any(Function));
    expect(mockAddEventListener).toHaveBeenCalledWith('keyup', expect.any(Function));
  });

  it('should clean up event listeners on unmount', () => {
    const { unmount } = render(<TagToolbar onApplyTag={mockOnApplyTag} />);

    unmount();

    expect(mockRemoveEventListener).toHaveBeenCalledWith('mouseup', expect.any(Function));
    expect(mockRemoveEventListener).toHaveBeenCalledWith('keyup', expect.any(Function));
  });

  it('should call onApplyTag with said tag and who attribute when said button clicked', async () => {
    // Create a mock selection with text
    const mockRange = {
      toString: () => 'Hello World',
      getBoundingClientRect: mockGetBoundingClientRect,
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

    const { container } = render(<TagToolbar onApplyTag={mockOnApplyTag} />);

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
    const saidButton = screen.getByText('<said>');
    fireEvent.click(saidButton);

    expect(mockOnApplyTag).toHaveBeenCalledWith('said', { 'who': '#speaker1' });
    expect(mockOnApplyTag).toHaveBeenCalledTimes(1);
  });

  it('should call onApplyTag with q tag when q button clicked', async () => {
    const mockRange = {
      toString: () => 'Selected text',
      getBoundingClientRect: mockGetBoundingClientRect,
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

    const { container } = render(<TagToolbar onApplyTag={mockOnApplyTag} />);

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

    expect(mockOnApplyTag).toHaveBeenCalledWith('q', undefined);
  });

  it('should call onApplyTag with persName tag when persName button clicked', async () => {
    const mockRange = {
      toString: () => 'Character Name',
      getBoundingClientRect: mockGetBoundingClientRect,
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

    const { container } = render(<TagToolbar onApplyTag={mockOnApplyTag} />);

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

    expect(mockOnApplyTag).toHaveBeenCalledWith('persName', undefined);
  });

  it('should have proper tooltips for accessibility', async () => {
    const mockRange = {
      toString: () => 'Text',
      getBoundingClientRect: mockGetBoundingClientRect,
    };

    mockGetBoundingClientRect.mockReturnValue({
      left: 0,
      top: 0,
      width: 50,
      right: 50,
      bottom: 20,
      x: 0,
      y: 0,
      height: 20,
      toJSON: () => ({})
    });

    const mockSelection = {
      rangeCount: 1,
      getRangeAt: () => mockRange,
      removeAllRanges: mockRemoveAllRanges,
      addRange: mockAddRange,
    };

    mockGetSelection.mockReturnValue(mockSelection as unknown as Selection);

    render(<TagToolbar onApplyTag={mockOnApplyTag} />);

    // Trigger the selection handler
    const mouseupCallback = mockAddEventListener.mock.calls.find(
      call => call[0] === 'mouseup'
    )?.[1];

    if (mouseupCallback) {
      mouseupCallback();
    }

    await waitFor(() => {
      expect(screen.getByText('<said>')).toBeInTheDocument();
    });

    // Check for title attributes on buttons
    const saidButton = screen.getByText('<said>');
    expect(saidButton).toHaveAttribute('title', 'Wrap in said tag (speaker1)');

    const qButton = screen.getByText('<q>');
    expect(qButton).toHaveAttribute('title', 'Wrap in q tag');

    const persNameButton = screen.getByText('<persName>');
    expect(persNameButton).toHaveAttribute('title', 'Wrap in persName tag');
  });

  it('should not render when selection is empty', () => {
    const mockRange = {
      toString: () => '',
      getBoundingClientRect: mockGetBoundingClientRect,
    };

    mockGetBoundingClientRect.mockReturnValue({
      left: 0,
      top: 0,
      width: 0,
      right: 0,
      bottom: 0,
      x: 0,
      y: 0,
      height: 0,
      toJSON: () => ({})
    });

    const mockSelection = {
      rangeCount: 1,
      getRangeAt: () => mockRange,
      removeAllRanges: mockRemoveAllRanges,
      addRange: mockAddRange,
    };

    mockGetSelection.mockReturnValue(mockSelection as unknown as Selection);

    const { container } = render(<TagToolbar onApplyTag={mockOnApplyTag} />);

    // Trigger the selection handler
    const mouseupCallback = mockAddEventListener.mock.calls.find(
      call => call[0] === 'mouseup'
    )?.[1];

    if (mouseupCallback) {
      mouseupCallback();
    }

    // Should not render because selection is empty
    expect(container.firstChild).toBeNull();
  });

  it('should not render when selection is only whitespace', () => {
    const mockRange = {
      toString: () => '   ',
      getBoundingClientRect: mockGetBoundingClientRect,
    };

    mockGetBoundingClientRect.mockReturnValue({
      left: 0,
      top: 0,
      width: 30,
      right: 30,
      bottom: 20,
      x: 0,
      y: 0,
      height: 20,
      toJSON: () => ({})
    });

    const mockSelection = {
      rangeCount: 1,
      getRangeAt: () => mockRange,
      removeAllRanges: mockRemoveAllRanges,
      addRange: mockAddRange,
    };

    mockGetSelection.mockReturnValue(mockSelection as unknown as Selection);

    const { container } = render(<TagToolbar onApplyTag={mockOnApplyTag} />);

    // Trigger the selection handler
    const mouseupCallback = mockAddEventListener.mock.calls.find(
      call => call[0] === 'mouseup'
    )?.[1];

    if (mouseupCallback) {
      mouseupCallback();
    }

    // Should not render because selection is only whitespace
    expect(container.firstChild).toBeNull();
  });

  it('should position toolbar above selection', async () => {
    const mockRange = {
      toString: () => 'Selected',
      getBoundingClientRect: mockGetBoundingClientRect,
    };

    // Mock getBoundingClientRect to return specific coordinates
    mockGetBoundingClientRect.mockReturnValue({
      left: 100,
      top: 300,
      width: 80,
      right: 180,
      bottom: 320,
      x: 100,
      y: 300,
      height: 20,
      toJSON: () => ({})
    });

    const mockSelection = {
      rangeCount: 1,
      getRangeAt: () => mockRange,
      removeAllRanges: mockRemoveAllRanges,
      addRange: mockAddRange,
    };

    mockGetSelection.mockReturnValue(mockSelection as unknown as Selection);

    const { container } = render(<TagToolbar onApplyTag={mockOnApplyTag} />);

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

    const toolbar = container.firstChild as HTMLElement;
    expect(toolbar).toHaveStyle({
      left: '140px', // 100 + 80/2
      top: '250px', // 300 - 50
    });
  });

  it('should hide toolbar after applying a tag', async () => {
    const mockRange = {
      toString: () => 'Text',
      getBoundingClientRect: mockGetBoundingClientRect,
    };

    mockGetBoundingClientRect.mockReturnValue({
      left: 0,
      top: 0,
      width: 50,
      right: 50,
      bottom: 20,
      x: 0,
      y: 0,
      height: 20,
      toJSON: () => ({})
    });

    const mockSelection = {
      rangeCount: 1,
      getRangeAt: () => mockRange,
      removeAllRanges: mockRemoveAllRanges,
      addRange: mockAddRange,
    };

    mockGetSelection.mockReturnValue(mockSelection as unknown as Selection);

    const { container } = render(<TagToolbar onApplyTag={mockOnApplyTag} />);

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

    // Click a button
    const qButton = screen.getByText('<q>');
    fireEvent.click(qButton);

    // Toolbar should be hidden after clicking
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });
});
