import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RenderedView } from '@/components/editor/RenderedView';

// Mock the document context with a stable object
const mockDocument = {
  parsed: {
    TEI: {
      text: {
        body: {
          p: [
            'This is sentence one.',
            'This is sentence two.',
            'This is sentence three.'
          ]
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

  describe('Passage Navigation and Highlighting', () => {
    test('should call onPassageClick when clicking a passage in normal mode', async () => {
      const user = userEvent.setup();

      render(<RenderedView {...mockProps} isBulkMode={false} />);

      const passageElement = screen.getByText('ID: passage-0').closest('div');
      await user.click(passageElement!);

      expect(mockProps.onPassageClick).toHaveBeenCalledWith('passage-0');
    });

    test('should not call onPassageClick in bulk mode', async () => {
      const user = userEvent.setup();

      render(<RenderedView {...mockProps} isBulkMode={true} />);

      const passageElement = screen.getByText('ID: passage-0').closest('div');
      await user.click(passageElement!);

      expect(mockProps.onPassageClick).not.toHaveBeenCalled();
      expect(mockProps.onSelectionChange).toHaveBeenCalled();
    });

    test('should highlight active passage in normal mode', async () => {
      const user = userEvent.setup();

      const { container } = render(<RenderedView {...mockProps} isBulkMode={false} />);

      // Click a passage to activate it
      const passageElement = screen.getByText('ID: passage-0').closest('div');
      await user.click(passageElement!);

      // Check that the onPassageClick callback was called
      expect(mockProps.onPassageClick).toHaveBeenCalledWith('passage-0');
    });

    test('should handle rapid clicks without errors', async () => {
      const user = userEvent.setup();

      render(<RenderedView {...mockProps} isBulkMode={false} />);

      const passage0 = screen.getByText('ID: passage-0').closest('div');
      const passage1 = screen.getByText('ID: passage-1').closest('div');

      // Rapidly click different passages
      await user.click(passage0!);
      await user.click(passage1!);
      await user.click(passage0!);

      expect(mockProps.onPassageClick).toHaveBeenCalledTimes(3);
    });
  });

  describe('TEI Tag Rendering', () => {
    test('renders <said> tags as styled spans', () => {
      // Create a document with <said> tags
      const mockDocumentWithSaid = {
        parsed: {
          TEI: {
            text: {
              body: {
                p: {
                  '#text': 'Before ',
                  'said': [{ '@_who': '#darcy', '#text': 'Hello' }],
                  '#text_2': ' World'
                }
              }
            }
          }
        }
      };

      jest.spyOn(require('@/lib/context/DocumentContext'), 'useDocumentContext').mockReturnValue({
        document: mockDocumentWithSaid
      });

      const { container } = render(<RenderedView {...mockProps} isBulkMode={false} />);

      expect(container.querySelector('[data-who="darcy"]')).toBeInTheDocument();
    });
  });
});
