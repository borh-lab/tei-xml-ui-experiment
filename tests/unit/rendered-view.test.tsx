import { render, screen } from '@testing-library/react';
import { RenderedView } from '@/components/editor/RenderedView';

// Mock the document context
jest.mock('@/lib/context/DocumentContext', () => ({
  useDocumentContext: () => ({
    document: {
      parsed: {
        TEI: {
          text: {
            body: {
              p: 'This is sentence one. This is sentence two. This is sentence three.'
            }
          }
        }
      }
    }
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
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('should show selection controls in bulk mode', () => {
    render(<RenderedView {...mockProps} isBulkMode={true} />);

    expect(screen.getByText('Select All')).toBeInTheDocument();
    expect(screen.getByText('Deselect All')).toBeInTheDocument();
  });

  test('should deselect all passages when Deselect All clicked', async () => {
    const { userEvent } = require('@testing-library/user-event');
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
});
