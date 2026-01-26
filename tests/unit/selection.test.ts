import { getSelectionRange } from '@/lib/utils/selection';

describe('getSelectionRange', () => {
  beforeEach(() => {
    // Mock window.getSelection
    global.getSelection = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return null when no selection exists', () => {
    (global.getSelection as jest.Mock).mockReturnValue(null);

    const result = getSelectionRange();

    expect(result).toBeNull();
  });

  it('should return null when selection has no ranges', () => {
    const mockSelection = {
      rangeCount: 0,
    };

    (global.getSelection as jest.Mock).mockReturnValue(mockSelection);

    const result = getSelectionRange();

    expect(result).toBeNull();
  });

  it('should return null when selection has empty text', () => {
    const mockRange = {
      toString: () => '',
      startOffset: 0,
      endOffset: 0,
      commonAncestorContainer: document.createElement('div'),
    };

    const mockSelection = {
      rangeCount: 1,
      getRangeAt: (index: number) => mockRange,
    };

    (global.getSelection as jest.Mock).mockReturnValue(mockSelection);

    const result = getSelectionRange();

    expect(result).toBeNull();
  });

  it('should extract selection range with text, offsets, and container', () => {
    const mockContainer = document.createElement('div');
    const mockRange = {
      toString: () => 'selected text',
      startOffset: 5,
      endOffset: 18,
      commonAncestorContainer: mockContainer,
    };

    const mockSelection = {
      rangeCount: 1,
      getRangeAt: (index: number) => mockRange,
    };

    (global.getSelection as jest.Mock).mockReturnValue(mockSelection);

    const result = getSelectionRange();

    expect(result).not.toBeNull();
    expect(result?.text).toBe('selected text');
    expect(result?.startOffset).toBe(5);
    expect(result?.endOffset).toBe(18);
    expect(result?.container).toBe(mockContainer);
  });

  it('should get range at index 0', () => {
    const mockRange = {
      toString: () => 'test',
      startOffset: 0,
      endOffset: 4,
      commonAncestorContainer: document.createElement('span'),
    };

    const mockSelection = {
      rangeCount: 1,
      getRangeAt: jest.fn().mockReturnValue(mockRange),
    };

    (global.getSelection as jest.Mock).mockReturnValue(mockSelection);

    getSelectionRange();

    expect(mockSelection.getRangeAt).toHaveBeenCalledWith(0);
  });
});
