// @ts-nocheck
/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RenderedView } from '@/components/editor/RenderedView';

// Create mock passage IDs
const mockPassageId1 = 'passage-abc123';
const mockPassageId2 = 'passage-def456';
const mockPassageId3 = 'passage-ghi789';

// Mock the Effect-based useDocumentService hook
const mockDocument = {
  state: {
    xml: '',
    parsed: {},
    revision: 0,
    metadata: {},
    passages: [
      {
        id: mockPassageId1,
        content: 'This is sentence one.',
        tags: [],
      },
      {
        id: mockPassageId2,
        content: 'This is sentence two.',
        tags: [],
      },
      {
        id: mockPassageId3,
        content: 'This is sentence three.',
        tags: [],
      },
    ],
    dialogue: [],
    characters: [],
    relationships: [],
  },
  events: [],
};

jest.mock('@/lib/effect/react/hooks', () => ({
  useDocumentService: () => ({
    document: mockDocument,
    loadDocument: jest.fn(),
    updateTag: jest.fn(),
  }),
}));

describe('RenderedView (Effect-based)', () => {
  const mockProps = {
    isBulkMode: false,
    selectedPassages: [],
    onSelectionChange: jest.fn(),
    onPassageClick: jest.fn(),
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
        selectedPassages={[mockPassageId1, mockPassageId2]}
      />
    );

    const deselectAllButton = screen.getByText('Deselect All');
    await user.click(deselectAllButton);

    expect(mockProps.onSelectionChange).toHaveBeenCalledWith([]);
  });

  test('should render passages with IDs', () => {
    render(<RenderedView {...mockProps} />);

    expect(screen.getByText(`ID: ${mockPassageId1}`)).toBeInTheDocument();
    expect(screen.getByText(`ID: ${mockPassageId2}`)).toBeInTheDocument();
    expect(screen.getByText(`ID: ${mockPassageId3}`)).toBeInTheDocument();
  });

  test('should show selection count in bulk mode', () => {
    render(<RenderedView {...mockProps} isBulkMode={true} selectedPassages={[mockPassageId1, mockPassageId2]} />);

    expect(screen.getByText('2 selected')).toBeInTheDocument();
    expect(screen.getByText('3 total passages')).toBeInTheDocument();
  });
});
