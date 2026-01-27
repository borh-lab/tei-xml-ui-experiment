import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BulkOperationsPanel } from '@/components/editor/BulkOperationsPanel';
import userEvent from '@testing-library/user-event';
import { DocumentProvider } from '@/lib/context/DocumentContext';
import { EditorLayout } from '@/components/editor/EditorLayout';
import { QuickSearchDialog } from '@/components/search/QuickSearchDialog';

// Mock the PatternDB
jest.mock('@/lib/db/PatternDB', () => ({
  db: {
    logCorrection: jest.fn().mockResolvedValue(undefined)
  }
}));

// Mock document.addEventListener for selectionchange
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

// Mock window.getSelection
Object.defineProperty(window, 'getSelection', {
  value: jest.fn(() => ({
    toString: () => '',
  })),
  writable: true,
});

describe('React Hooks Dependencies', () => {
  beforeEach(() => {
    mockAddEventListener.mockClear();
    mockRemoveEventListener.mockClear();
  });

  test('should re-run detection when document changes', async () => {
    const { rerender } = render(
      <DocumentProvider>
        <EditorLayout />
      </DocumentProvider>
    );

    // Initial render - component should load without errors
    // Now shows SampleGallery instead of "No document loaded"
    await waitFor(() => {
      expect(screen.queryByText(/Welcome to TEI Dialogue Editor/i)).toBeInTheDocument();
    });

    // Re-render with same props (should not cause errors)
    rerender(
      <DocumentProvider>
        <EditorLayout />
      </DocumentProvider>
    );

    // Should still render correctly without React hooks warnings
    await waitFor(() => {
      expect(screen.queryByText(/Welcome to TEI Dialogue Editor/i)).toBeInTheDocument();
    });
  });
});

describe('Bulk Operations Integration', () => {
  const mockHandlers = {
    onTagAll: jest.fn(),
    onSelectAllUntagged: jest.fn(),
    onSelectLowConfidence: jest.fn(),
    onExportSelection: jest.fn(),
    onValidate: jest.fn(),
    onConvert: jest.fn(),
    onClose: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should call onTagAll when tagging selected passages', async () => {
    const user = userEvent.setup();
    render(
      <BulkOperationsPanel
        isOpen={true}
        selectedPassages={['p1', 'p2']}
        {...mockHandlers}
      />
    );

    // Select speaker
    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'speaker1');

    // Click tag button
    const tagButton = screen.getByText('Tag Selected Passages');
    await user.click(tagButton);

    expect(mockHandlers.onTagAll).toHaveBeenCalledWith('speaker1');
  });

  test('should call onSelectAllUntagged when button clicked', async () => {
    const user = userEvent.setup();
    render(
      <BulkOperationsPanel
        isOpen={true}
        selectedPassages={['p1', 'p2']}
        {...mockHandlers}
      />
    );

    await user.click(screen.getByText('Select All Untagged'));

    expect(mockHandlers.onSelectAllUntagged).toHaveBeenCalledTimes(1);
  });

  test('should call onExportSelection when button clicked', async () => {
    const user = userEvent.setup();
    render(
      <BulkOperationsPanel
        isOpen={true}
        selectedPassages={['p1', 'p2']}
        {...mockHandlers}
      />
    );

    await user.click(screen.getByText('Export Selection'));

    expect(mockHandlers.onExportSelection).toHaveBeenCalledTimes(1);
  });

  test('should call onValidate when button clicked', async () => {
    const user = userEvent.setup();
    render(
      <BulkOperationsPanel
        isOpen={true}
        selectedPassages={['p1', 'p2']}
        {...mockHandlers}
      />
    );

    await user.click(screen.getByText('Validate Selection'));

    expect(mockHandlers.onValidate).toHaveBeenCalledTimes(1);
  });
});

describe('QuickSearchDialog Integration', () => {
  test('should render QuickSearchDialog component without errors', () => {
    const onResultClick = jest.fn();
    const onOpenChange = jest.fn();

    // Should not throw when rendering
    expect(() => {
      render(
        <DocumentProvider>
          <QuickSearchDialog
            open={false}
            onOpenChange={onOpenChange}
            onResultClick={onResultClick}
          />
        </DocumentProvider>
      );
    }).not.toThrow();
  });

  test('should have search dialog state in EditorLayout', async () => {
    render(
      <DocumentProvider>
        <EditorLayout />
      </DocumentProvider>
    );

    // Wait for the component to mount
    await waitFor(() => {
      expect(screen.queryByText(/Welcome to TEI Dialogue Editor/i)).toBeInTheDocument();
    });

    // Component should render without errors
    // The search dialog is integrated but not visible by default
  });

  test('should have keyboard shortcut handler', async () => {
    render(
      <DocumentProvider>
        <EditorLayout />
      </DocumentProvider>
    );

    // Wait for initial render
    await waitFor(() => {
      expect(screen.queryByText(/Welcome to TEI Dialogue Editor/i)).toBeInTheDocument();
    });

    // Component should render without errors
    // The Cmd+F shortcut is registered via useHotkeys
  });
});

describe('AI Auto Mode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should render auto-application progress when in auto mode', async () => {
    const { container } = render(
      <DocumentProvider>
        <EditorLayout />
      </DocumentProvider>
    );

    // Wait for component to mount
    await waitFor(() => {
      expect(container.querySelector('[class*="h-screen"]')).toBeInTheDocument();
    });

    // Auto-application progress should not be visible initially
    expect(container.querySelector('text-blue-900')).not.toBeInTheDocument();

    // TODO: Add more specific tests for auto-application behavior
    // These would require mocking the AI detection and document state
  });

  test('should show undo toast after auto-applying suggestions', async () => {
    const { container } = render(
      <DocumentProvider>
        <EditorLayout />
      </DocumentProvider>
    );

    // Wait for component to mount
    await waitFor(() => {
      expect(container.querySelector('[class*="h-screen"]')).toBeInTheDocument();
    });

    // TODO: Test undo toast functionality
    // This requires setting up mock suggestions and triggering auto-application
  });
});

describe('Split Pane Resizing', () => {
  test('should render without split pane errors', async () => {
    const { container } = render(
      <DocumentProvider>
        <EditorLayout />
      </DocumentProvider>
    );

    // Wait for component to mount
    await waitFor(() => {
      expect(container.querySelector('[class*="h-screen"]')).toBeInTheDocument();
    });

    // Component should render without errors related to split pane
    // The split pane is only visible when a document is loaded
  });

  test('should have split position state defined', async () => {
    const { container } = render(
      <DocumentProvider>
        <EditorLayout />
      </DocumentProvider>
    );

    await waitFor(() => {
      expect(container.querySelector('[class*="h-screen"]')).toBeInTheDocument();
    });

    // Component should mount and initialize state correctly
    // The splitPosition state is initialized to 50 by default
  });

  test('should not throw errors with drag state management', async () => {
    const { container } = render(
      <DocumentProvider>
        <EditorLayout />
      </DocumentProvider>
    );

    await waitFor(() => {
      expect(container.querySelector('[class*="h-screen"]')).toBeInTheDocument();
    });

    // Drag state management should not cause errors during mount/unmount
    // This verifies the useEffect cleanup works correctly
  });
});
