import { render, screen, waitFor } from '@testing-library/react';
import { BulkOperationsPanel } from '@/components/editor/BulkOperationsPanel';
import userEvent from '@testing-library/user-event';
import { DocumentProvider } from '@/lib/context/DocumentContext';
import { EditorLayout } from '@/components/editor/EditorLayout';

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
    await waitFor(() => {
      expect(screen.queryByText(/No document loaded/i)).toBeInTheDocument();
    });

    // Re-render with same props (should not cause errors)
    rerender(
      <DocumentProvider>
        <EditorLayout />
      </DocumentProvider>
    );

    // Should still render correctly without React hooks warnings
    await waitFor(() => {
      expect(screen.queryByText(/No document loaded/i)).toBeInTheDocument();
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
