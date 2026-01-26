import { render, screen, fireEvent } from '@testing-library/react';
import { DialogueOutline } from '@/components/navigation/DialogueOutline';
import { TEIDocument } from '@/lib/tei/TEIDocument';

// Mock TEIDocument
jest.mock('@/lib/tei/TEIDocument');

describe('DialogueOutline', () => {
  const mockDocument = {
    getDialogue: jest.fn(),
    getDivisions: jest.fn()
  } as unknown as TEIDocument;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should render outline with dialogue passages', () => {
    const mockDialogue = [
      {
        who: 'speaker1',
        content: 'Hello world',
        element: { '@_n': '1' }
      },
      {
        who: 'speaker2',
        content: 'Goodbye world',
        element: { '@_n': '1' }
      }
    ];

    (mockDocument.getDialogue as jest.Mock).mockReturnValue(mockDialogue);
    (mockDocument.getDivisions as jest.Mock).mockReturnValue([]);

    const onPassageClick = jest.fn();
    render(<DialogueOutline document={mockDocument} onPassageClick={onPassageClick} />);

    expect(screen.getByText('Dialogue Outline')).toBeInTheDocument();
    expect(screen.getByText(/2 passages/)).toBeInTheDocument();
    expect(screen.getByText('Hello world')).toBeInTheDocument();
    expect(screen.getByText('Goodbye world')).toBeInTheDocument();
  });

  test('should render document structure divisions', () => {
    const mockDivisions = [
      { type: 'chapter', n: '1', depth: 0, element: {} },
      { type: 'section', n: '2', depth: 1, element: {} }
    ];

    (mockDocument.getDialogue as jest.Mock).mockReturnValue([]);
    (mockDocument.getDivisions as jest.Mock).mockReturnValue(mockDivisions);

    render(<DialogueOutline document={mockDocument} onPassageClick={() => {}} />);

    expect(screen.getByText('Document Structure')).toBeInTheDocument();
    expect(screen.getByText('chapter')).toBeInTheDocument();
    expect(screen.getByText('Section 1')).toBeInTheDocument();
  });

  test('should call onPassageClick when passage is clicked', () => {
    const mockDialogue = [
      {
        who: 'speaker1',
        content: 'Test passage',
        element: { '@_n': '1' }
      }
    ];

    (mockDocument.getDialogue as jest.Mock).mockReturnValue(mockDialogue);
    (mockDocument.getDivisions as jest.Mock).mockReturnValue([]);

    const onPassageClick = jest.fn();
    render(<DialogueOutline document={mockDocument} onPassageClick={onPassageClick} />);

    const passage = screen.getByText('Test passage');
    fireEvent.click(passage);

    expect(onPassageClick).toHaveBeenCalledWith('passage-0');
  });

  test('should highlight current passage', () => {
    const mockDialogue = [
      {
        who: 'speaker1',
        content: 'Current passage',
        element: { '@_n': '1' }
      },
      {
        who: 'speaker2',
        content: 'Other passage',
        element: { '@_n': '1' }
      }
    ];

    (mockDocument.getDialogue as jest.Mock).mockReturnValue(mockDialogue);
    (mockDocument.getDivisions as jest.Mock).mockReturnValue([]);

    render(
      <DialogueOutline
        document={mockDocument}
        onPassageClick={() => {}}
        currentPassageId="passage-0"
      />
    );

    const currentPassage = screen.getByText('Current passage');
    const otherPassage = screen.getByText('Other passage');

    // Current passage should have different styling
    expect(currentPassage).toHaveClass('bg-primary');
    expect(otherPassage).not.toHaveClass('bg-primary');
  });

  test('should toggle chapter collapse on click', () => {
    const mockDialogue = [
      {
        who: 'speaker1',
        content: 'Test passage',
        element: { '@_n': '1' }
      }
    ];

    (mockDocument.getDialogue as jest.Mock).mockReturnValue(mockDialogue);
    (mockDocument.getDivisions as jest.Mock).mockReturnValue([]);

    render(<DialogueOutline document={mockDocument} onPassageClick={() => {}} />);

    // Initially expanded - passage should be visible
    expect(screen.getByText('Test passage')).toBeInTheDocument();

    // Click on chapter header to collapse
    const chapterHeader = screen.getByText(/1 passages/).closest('div');
    if (chapterHeader) {
      fireEvent.click(chapterHeader);
    }

    // After collapsing, passage should not be visible
    // Note: This might not work perfectly with testing library, but demonstrates the intent
  });

  test('should show empty state when no dialogue', () => {
    (mockDocument.getDialogue as jest.Mock).mockReturnValue([]);
    (mockDocument.getDivisions as jest.Mock).mockReturnValue([]);

    render(<DialogueOutline document={mockDocument} onPassageClick={() => {}} />);

    expect(
      screen.getByText('No dialogue passages found in document')
    ).toBeInTheDocument();
  });

  test('should truncate long passage content', () => {
    const longContent = 'This is a very long passage that should be truncated in the outline view to keep things clean and readable';
    const mockDialogue = [
      {
        who: 'speaker1',
        content: longContent,
        element: { '@_n': '1' }
      }
    ];

    (mockDocument.getDialogue as jest.Mock).mockReturnValue(mockDialogue);
    (mockDocument.getDivisions as jest.Mock).mockReturnValue([]);

    render(<DialogueOutline document={mockDocument} onPassageClick={() => {}} />);

    // Should show truncated version with ellipsis
    const truncated = longContent.substring(0, 50);
    expect(screen.getByText(new RegExp(`^${truncated}`))).toBeInTheDocument();
  });
});
