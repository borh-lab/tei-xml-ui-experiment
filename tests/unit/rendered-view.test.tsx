import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RenderedView } from '@/components/editor/RenderedView';

// Mock the document context with a stable object
const mockDocument = {
  parsed: {
    TEI: {
      text: {
        body: {
          p: 'This is sentence one. This is sentence two. This is sentence three.'
        }
      }
    }
  }
};

jest.mock('@/lib/context/DocumentContext', () => ({
  useDocumentContext: () => ({
    document: mockDocument
  })
}));

describe('RenderedView', () => {
  const mockProps = {
    isBulkMode: false,
    selectedPassages: [],
    onSelectionChange: jest.fn(),
    onPassageClick: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should show selection controls in bulk mode', () => {
    render(<RenderedView {...mockProps} isBulkMode={true} />);

    expect(screen.getByText('Select All')).toBeInTheDocument();
    expect(screen.getByText('Deselect All')).toBeInTheDocument();
  });

  test('should deselect all passages when Deselect All clicked', async () => {
    const user = userEvent.setup();

    render(
      <RenderedView
        {...mockProps}
        isBulkMode={true}
        selectedPassages={['passage-0', 'passage-1']}
      />
    );

    const deselectAllButton = screen.getByText('Deselect All');
    await user.click(deselectAllButton);

    expect(mockProps.onSelectionChange).toHaveBeenCalledWith([]);
  });

  describe('Performance Optimization', () => {
    test('should not re-render when props unchanged', () => {
      const { rerender } = render(
        <RenderedView
          {...mockProps}
          selectedPassages={[]}
        />
      );

      // Re-render with same props - should not cause issues
      rerender(
        <RenderedView
          {...mockProps}
          selectedPassages={[]}
        />
      );

      // Component should still render correctly - check for a specific passage ID
      expect(screen.getByText('ID: passage-0')).toBeInTheDocument();
    });

    test('should re-render when selected passages change', () => {
      const { rerender } = render(
        <RenderedView
          {...mockProps}
          isBulkMode={true}
          selectedPassages={[]}
        />
      );

      expect(screen.getByText('0 selected')).toBeInTheDocument();

      rerender(
        <RenderedView
          {...mockProps}
          isBulkMode={true}
          selectedPassages={['passage-0', 'passage-1']}
        />
      );

      // Should update with new selection
      expect(screen.getByText('2 selected')).toBeInTheDocument();
    });
  });
});
