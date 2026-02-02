import { SelectionManager } from '@/lib/selection/SelectionManager';

describe('SelectionManager', () => {
  let selectionManager: SelectionManager;
  let mockContainer: HTMLElement;

  beforeEach(() => {
    selectionManager = new SelectionManager();
    mockContainer = document.createElement('div');
    mockContainer.setAttribute('data-passage-id', 'passage-0');
    document.body.appendChild(mockContainer);
  });

  afterEach(() => {
    document.body.removeChild(mockContainer);
  });

  describe('captureSelection', () => {
    it('should return null when no selection exists', () => {
      const result = selectionManager.captureSelection();
      expect(result).toBeNull();
    });

    it('should capture selection range with text', () => {
      mockContainer.textContent = 'Hello world';
      const textNode = mockContainer.firstChild!;

      const range = document.createRange();
      range.setStart(textNode, 0);
      range.setEnd(textNode, 5);

      const selection = window.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);

      const result = selectionManager.captureSelection();

      expect(result).not.toBeNull();
      expect(result!.text).toBe('Hello');
      expect(result!.passageId).toBe('passage-0');
    });

    it('should calculate character offsets within passage', () => {
      mockContainer.innerHTML = 'Hello <span>world</span> test';

      // Select "world"
      const span = mockContainer.querySelector('span')!;
      const textNode = span.firstChild!;
      const range = document.createRange();
      range.setStart(textNode, 0);
      range.setEnd(textNode, 5);

      const selection = window.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);

      const result = selectionManager.captureSelection();

      expect(result).not.toBeNull();
      expect(result!.text).toBe('world');
      // "Hello " is 6 chars before the span
      expect(result!.startOffset).toBe(6);
      expect(result!.endOffset).toBe(11);
    });
  });

  describe('restoreSelection', () => {
    it('should restore selection at given offsets', () => {
      mockContainer.textContent = 'Hello world test';

      const offsets = { start: 6, end: 11, passageId: 'passage-0' };
      selectionManager.restoreSelection(offsets);

      const selection = window.getSelection();
      const text = selection?.toString() || '';
      expect(text).toBe('world');
    });
  });

  describe('getContainingTag', () => {
    it('should return null when selection is not in a tag', () => {
      mockContainer.textContent = 'Plain text';
      const textNode = mockContainer.firstChild!;
      const range = document.createRange();
      range.setStart(textNode, 0);
      range.setEnd(textNode, 5);

      const selection = window.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);

      const result = selectionManager.getContainingTag();
      expect(result).toBeNull();
    });

    it('should return tag info when selection is within a tag', () => {
      mockContainer.innerHTML = '<span data-tag="said" data-who="#speaker1">Hello</span>';
      const span = mockContainer.querySelector('span')!;
      const textNode = span.firstChild!;
      const range = document.createRange();
      range.setStart(textNode, 0);
      range.setEnd(textNode, 5);

      const selection = window.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);

      const result = selectionManager.getContainingTag();
      expect(result).not.toBeNull();
      expect(result!.tagName).toBe('said');
      expect(result!.attributes).toEqual({ 'who': '#speaker1' });
    });
  });
});
