import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TagBreadcrumb } from '@/components/editor/TagBreadcrumb';

// Mock window.getSelection and related methods
const mockGetSelection = jest.fn();
const mockAddRange = jest.fn();
const mockRemoveAllRanges = jest.fn();

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

describe('TagBreadcrumb', () => {
  const mockOnTagSelect = jest.fn();

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

  it('should render breadcrumb for nested tags', async () => {
    // Mock getSelection to return a range inside a tag
    const mockRange = {
      commonAncestorContainer: document.createElement('span'),
    };

    mockRange.commonAncestorContainer.setAttribute('data-tag', 'said');
    mockRange.commonAncestorContainer.setAttribute('data-who', '#speaker1');
    mockRange.commonAncestorContainer.setAttribute('data-ana', '#direct');

    const mockSelection = {
      rangeCount: 1,
      getRangeAt: () => mockRange,
      removeAllRanges: mockRemoveAllRanges,
      addRange: mockAddRange,
    };

    mockGetSelection.mockReturnValue(mockSelection as unknown as Selection);

    const { container } = render(<TagBreadcrumb onTagSelect={mockOnTagSelect} />);

    // Trigger the selection handler via keyup event (which uses getTagHierarchyFromSelection)
    const keyupCallback = mockAddEventListener.mock.calls.find((call) => call[0] === 'keyup')?.[1];

    if (keyupCallback) {
      keyupCallback();
    }

    await waitFor(() => {
      expect(container.querySelector('[data-slot="breadcrumb"]')).toBeInTheDocument();
    });
  });

  it('should update when cursor moves', async () => {
    const mockRange = {
      commonAncestorContainer: document.createElement('p'),
    };

    mockRange.commonAncestorContainer.setAttribute('data-tag', 'p');

    const mockSelection = {
      rangeCount: 1,
      getRangeAt: () => mockRange,
    };

    mockGetSelection.mockReturnValue(mockSelection as unknown as Selection);

    const { container } = render(<TagBreadcrumb onTagSelect={mockOnTagSelect} />);

    // Trigger initial selection via keyup
    const keyupCallback = mockAddEventListener.mock.calls.find((call) => call[0] === 'keyup')?.[1];

    if (keyupCallback) {
      keyupCallback();
    }

    await waitFor(() => {
      expect(container.querySelector('[data-slot="breadcrumb"]')).toBeInTheDocument();
    });

    // Simulate cursor move to different tag
    const mockRange2 = {
      commonAncestorContainer: document.createElement('said'),
    };

    mockRange2.commonAncestorContainer.setAttribute('data-tag', 'said');
    mockRange2.commonAncestorContainer.setAttribute('data-who', '#speaker1');

    mockSelection.getRangeAt = () => mockRange2;

    if (keyupCallback) {
      keyupCallback();
    }

    await waitFor(() => {
      // The tag name is rendered as "<said>" so we need to match the full text
      expect(screen.getByText(/said/)).toBeInTheDocument();
    });
  });

  it('should click breadcrumb to select tag', async () => {
    const mockRange = {
      commonAncestorContainer: document.createElement('said'),
    };

    mockRange.commonAncestorContainer.setAttribute('data-tag', 'said');
    mockRange.commonAncestorContainer.setAttribute('data-who', '#speaker1');

    const mockSelection = {
      rangeCount: 1,
      getRangeAt: () => mockRange,
    };

    mockGetSelection.mockReturnValue(mockSelection as unknown as Selection);

    render(<TagBreadcrumb onTagSelect={mockOnTagSelect} />);

    // Trigger selection via keyup
    const keyupCallback = mockAddEventListener.mock.calls.find((call) => call[0] === 'keyup')?.[1];

    if (keyupCallback) {
      keyupCallback();
    }

    await waitFor(() => {
      const breadcrumbItem = screen.getByText(/said/);
      expect(breadcrumbItem).toBeInTheDocument();
    });

    // Click on breadcrumb item - need to find the actual link element
    const breadcrumbLink = screen.getByRole('link', { name: /said/ });
    fireEvent.click(breadcrumbLink);

    await waitFor(() => {
      expect(mockOnTagSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          tagName: 'said',
          attributes: { who: '#speaker1' },
        })
      );
    });
  });

  it('should display tag attributes', async () => {
    const mockRange = {
      commonAncestorContainer: document.createElement('said'),
    };

    mockRange.commonAncestorContainer.setAttribute('data-tag', 'said');
    mockRange.commonAncestorContainer.setAttribute('data-who', '#speaker1');
    mockRange.commonAncestorContainer.setAttribute('data-ana', '#direct');

    const mockSelection = {
      rangeCount: 1,
      getRangeAt: () => mockRange,
    };

    mockGetSelection.mockReturnValue(mockSelection as unknown as Selection);

    const { container } = render(<TagBreadcrumb onTagSelect={mockOnTagSelect} />);

    // Trigger selection via keyup
    const keyupCallback = mockAddEventListener.mock.calls.find((call) => call[0] === 'keyup')?.[1];

    if (keyupCallback) {
      keyupCallback();
    }

    await waitFor(() => {
      expect(container.querySelector('[data-slot="breadcrumb"]')).toBeInTheDocument();
    });

    // Attributes should be visible
    const breadcrumbItem = screen.getByText(/said/);
    expect(breadcrumbItem).toBeInTheDocument();

    // Should show attribute count badge
    expect(screen.getByText(/2 attr/)).toBeInTheDocument();
  });

  it('should handle no tag at cursor position', () => {
    const mockRange = {
      commonAncestorContainer: document.createElement('div'),
    };

    // No data-tag attribute
    const mockSelection = {
      rangeCount: 1,
      getRangeAt: () => mockRange,
    };

    mockGetSelection.mockReturnValue(mockSelection as unknown as Selection);

    const { container } = render(<TagBreadcrumb onTagSelect={mockOnTagSelect} />);

    // Trigger selection via keyup
    const keyupCallback = mockAddEventListener.mock.calls.find((call) => call[0] === 'keyup')?.[1];

    if (keyupCallback) {
      keyupCallback();
    }

    // Should not render breadcrumb when no tag at cursor
    expect(container.querySelector('[data-slot="breadcrumb"]')).not.toBeInTheDocument();
  });

  it('should handle no selection', () => {
    mockGetSelection.mockReturnValue(null);

    const { container } = render(<TagBreadcrumb onTagSelect={mockOnTagSelect} />);

    // Should not render breadcrumb when no selection
    expect(container.querySelector('[data-slot="breadcrumb"]')).not.toBeInTheDocument();
  });

  it('should set up event listeners on mount', () => {
    render(<TagBreadcrumb onTagSelect={mockOnTagSelect} />);

    expect(mockAddEventListener).toHaveBeenCalledWith('click', expect.any(Function));
    expect(mockAddEventListener).toHaveBeenCalledWith('keyup', expect.any(Function));
  });

  it('should clean up event listeners on unmount', () => {
    const { unmount } = render(<TagBreadcrumb onTagSelect={mockOnTagSelect} />);

    unmount();

    expect(mockRemoveEventListener).toHaveBeenCalledWith('click', expect.any(Function));
    expect(mockRemoveEventListener).toHaveBeenCalledWith('keyup', expect.any(Function));
  });

  it('should handle deeply nested tag hierarchy', async () => {
    // Create a nested structure: TEI > text > body > p > said
    const saidElement = document.createElement('span');
    saidElement.setAttribute('data-tag', 'said');
    saidElement.setAttribute('data-who', '#speaker1');

    const pElement = document.createElement('p');
    pElement.setAttribute('data-tag', 'p');
    pElement.appendChild(saidElement);

    const bodyElement = document.createElement('div');
    bodyElement.setAttribute('data-tag', 'body');
    bodyElement.appendChild(pElement);

    const textElement = document.createElement('div');
    textElement.setAttribute('data-tag', 'text');
    textElement.appendChild(bodyElement);

    const teiElement = document.createElement('div');
    teiElement.setAttribute('data-tag', 'TEI');
    teiElement.appendChild(textElement);

    const mockRange = {
      commonAncestorContainer: saidElement,
    };

    const mockSelection = {
      rangeCount: 1,
      getRangeAt: () => mockRange,
    };

    mockGetSelection.mockReturnValue(mockSelection as unknown as Selection);

    const { container } = render(<TagBreadcrumb onTagSelect={mockOnTagSelect} />);

    // Trigger selection via keyup
    const keyupCallback = mockAddEventListener.mock.calls.find((call) => call[0] === 'keyup')?.[1];

    if (keyupCallback) {
      keyupCallback();
    }

    await waitFor(() => {
      expect(container.querySelector('[data-slot="breadcrumb"]')).toBeInTheDocument();
    });

    // Should show all levels of hierarchy
    expect(screen.getByText(/TEI/)).toBeInTheDocument();
    expect(screen.getByText(/text/)).toBeInTheDocument();
    expect(screen.getByText(/body/)).toBeInTheDocument();
    expect(screen.getByText(/p/)).toBeInTheDocument();
    expect(screen.getByText(/said/)).toBeInTheDocument();
  });

  it('should render without onTagSelect callback', async () => {
    const mockRange = {
      commonAncestorContainer: document.createElement('said'),
    };

    mockRange.commonAncestorContainer.setAttribute('data-tag', 'said');

    const mockSelection = {
      rangeCount: 1,
      getRangeAt: () => mockRange,
    };

    mockGetSelection.mockReturnValue(mockSelection as unknown as Selection);

    const { container } = render(<TagBreadcrumb />);

    // Trigger selection via keyup
    const keyupCallback = mockAddEventListener.mock.calls.find((call) => call[0] === 'keyup')?.[1];

    if (keyupCallback) {
      keyupCallback();
    }

    await waitFor(() => {
      expect(container.querySelector('[data-slot="breadcrumb"]')).toBeInTheDocument();
    });

    // Should still render breadcrumb even without callback
    expect(screen.getByText(/said/)).toBeInTheDocument();
  });
});
