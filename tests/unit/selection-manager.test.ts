import { SelectionManager } from '@/lib/selection/SelectionManager';
import type { TEIDocument } from '@/lib/tei/types';
import type { SelectionSnapshot } from '@/lib/selection/types';

describe('SelectionManager', () => {
  let selectionManager: SelectionManager;
  let mockContainer: HTMLElement;

  beforeEach(() => {
    selectionManager = new SelectionManager();
    mockContainer = document.createElement('div');
    mockContainer.setAttribute('data-passage-id', 'passage-abc123');
    mockContainer.setAttribute('data-document-revision', '0');
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
      expect(result!.passageId).toBe('passage-abc123');
      expect(result!.range.start).toBe(0);
      expect(result!.range.end).toBe(5);
      expect(result!.documentRevision).toBe(0);
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
      expect(result!.range.start).toBe(6);
      expect(result!.range.end).toBe(11);
    });
  });

  describe('restoreSelection', () => {
    it('should restore selection at given offsets', () => {
      mockContainer.textContent = 'Hello world test';

      // Create a mock TEIDocument
      const mockDoc: TEIDocument = {
        state: {
          xml: '',
          parsed: {},
          revision: 0,
          metadata: {},
          passages: [],
          dialogue: [],
          characters: [],
          relationships: [],
        },
        events: [],
      };

      const snapshot: SelectionSnapshot = {
        passageId: 'passage-abc123',
        range: { start: 6, end: 11 },
        documentRevision: 0,
        text: 'world',
        container: mockContainer,
      };

      const result = selectionManager.restoreSelection(mockDoc, snapshot);
      expect(result).toBe(true);

      const selection = window.getSelection();
      const text = selection?.toString() || '';
      expect(text).toBe('world');
    });

    it('should return false when document revision has changed', () => {
      mockContainer.textContent = 'Hello world test';

      // Create a mock TEIDocument with different revision
      const mockDoc: TEIDocument = {
        state: {
          xml: '',
          parsed: {},
          revision: 5, // Different from snapshot's revision
          metadata: {},
          passages: [],
          dialogue: [],
          characters: [],
          relationships: [],
        },
        events: [],
      };

      const snapshot: SelectionSnapshot = {
        passageId: 'passage-abc123',
        range: { start: 6, end: 11 },
        documentRevision: 0,
        text: 'world',
        container: mockContainer,
      };

      const result = selectionManager.restoreSelection(mockDoc, snapshot);
      expect(result).toBe(false);
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

      const snapshot = selectionManager.captureSelection();
      expect(snapshot).not.toBeNull();

      const mockDoc: TEIDocument = {
        state: {
          xml: '',
          parsed: {},
          revision: 0,
          metadata: {},
          passages: [
            {
              id: 'passage-abc123',
              content: 'Plain text',
              tags: [], // No tags
            },
          ],
          dialogue: [],
          characters: [],
          relationships: [],
        },
        events: [],
      };

      const result = selectionManager.getContainingTag(mockDoc, snapshot!);
      expect(result).toBeNull();
    });

    it('should return tag info when selection is within a tag', () => {
      mockContainer.textContent = 'Hello world';
      const textNode = mockContainer.firstChild!;
      const range = document.createRange();
      range.setStart(textNode, 0);
      range.setEnd(textNode, 5);

      const selection = window.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);

      const snapshot = selectionManager.captureSelection();
      expect(snapshot).not.toBeNull();

      const mockDoc: TEIDocument = {
        state: {
          xml: '',
          parsed: {},
          revision: 0,
          metadata: {},
          passages: [
            {
              id: 'passage-abc123',
              content: 'Hello world',
              tags: [
                {
                  id: 'tag-xyz',
                  type: 'said',
                  range: { start: 0, end: 5 },
                  attributes: { who: '#speaker1' },
                },
              ],
            },
          ],
          dialogue: [],
          characters: [],
          relationships: [],
        },
        events: [],
      };

      const result = selectionManager.getContainingTag(mockDoc, snapshot!);
      expect(result).not.toBeNull();
      expect(result!.type).toBe('said');
      expect(result!.attributes).toEqual({ who: '#speaker1' });
    });
  });

  describe('isSelectionInTag', () => {
    it('should return false when selection is not in a tag', () => {
      mockContainer.textContent = 'Plain text';
      const textNode = mockContainer.firstChild!;
      const range = document.createRange();
      range.setStart(textNode, 0);
      range.setEnd(textNode, 5);

      const selection = window.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);

      const snapshot = selectionManager.captureSelection();
      expect(snapshot).not.toBeNull();

      const mockDoc: TEIDocument = {
        state: {
          xml: '',
          parsed: {},
          revision: 0,
          metadata: {},
          passages: [
            {
              id: 'passage-abc123',
              content: 'Plain text',
              tags: [],
            },
          ],
          dialogue: [],
          characters: [],
          relationships: [],
        },
        events: [],
      };

      const result = selectionManager.isSelectionInTag(mockDoc, snapshot!);
      expect(result).toBe(false);
    });

    it('should return true when selection is within a tag', () => {
      mockContainer.textContent = 'Hello world';
      const textNode = mockContainer.firstChild!;
      const range = document.createRange();
      range.setStart(textNode, 0);
      range.setEnd(textNode, 5);

      const selection = window.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);

      const snapshot = selectionManager.captureSelection();
      expect(snapshot).not.toBeNull();

      const mockDoc: TEIDocument = {
        state: {
          xml: '',
          parsed: {},
          revision: 0,
          metadata: {},
          passages: [
            {
              id: 'passage-abc123',
              content: 'Hello world',
              tags: [
                {
                  id: 'tag-xyz',
                  type: 'said',
                  range: { start: 0, end: 5 },
                  attributes: { who: '#speaker1' },
                },
              ],
            },
          ],
          dialogue: [],
          characters: [],
          relationships: [],
        },
        events: [],
      };

      const result = selectionManager.isSelectionInTag(mockDoc, snapshot!);
      expect(result).toBe(true);
    });
  });
});
