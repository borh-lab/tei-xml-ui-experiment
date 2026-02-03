import { QuickSearch, SearchResult } from '@/lib/search/QuickSearch';
import { TEIDocument } from '@/lib/tei';

// Mock TEIDocument
jest.mock('@/lib/tei', () => ({
  TEIDocument: jest.fn(),
}));

describe('QuickSearch', () => {
  let mockDocument: TEIDocument;
  let mockDialogue: any[];

  beforeEach(() => {
    mockDialogue = [
      {
        who: 'speaker1',
        content: 'Hello world',
        element: { closest: { getAttribute: jest.fn(() => '1') } }
      },
      {
        who: 'speaker2',
        content: 'Goodbye world',
        element: { closest: { getAttribute: jest.fn(() => '1') } }
      },
      {
        who: 'speaker1',
        content: 'Hello again',
        element: { closest: { getAttribute: jest.fn(() => '2') } }
      }
    ];

    mockDocument = {
      getDialogue: jest.fn(() => mockDialogue)
    } as unknown as TEIDocument;
  });

  describe('search', () => {
    it('should return empty state for short queries', () => {
      const search = new QuickSearch(mockDocument);
      const result = search.search('hi');

      expect(result.results).toEqual([]);
      expect(result.totalResults).toBe(0);
      expect(result.query).toBe('hi');
    });

    it('should find matching dialogue passages', () => {
      const search = new QuickSearch(mockDocument);
      const result = search.search('hello');

      expect(result.totalResults).toBe(2);
      expect(result.results[0].content).toBe('Hello world');
      expect(result.results[1].content).toBe('Hello again');
      expect(result.currentIndex).toBe(0);
    });

    it('should perform case-insensitive search', () => {
      const search = new QuickSearch(mockDocument);
      const result = search.search('WORLD');

      expect(result.totalResults).toBe(2);
      expect(result.results[0].content).toBe('Hello world');
      expect(result.results[1].content).toBe('Goodbye world');
    });

    it('should return empty results when no matches', () => {
      const search = new QuickSearch(mockDocument);
      const result = search.search('nonexistent');

      expect(result.totalResults).toBe(0);
      expect(result.results).toEqual([]);
    });

    it('should handle null document', () => {
      const search = new QuickSearch(null);
      const result = search.search('hello');

      expect(result.results).toEqual([]);
      expect(result.totalResults).toBe(0);
    });
  });

  describe('navigation', () => {
    it('should navigate to next result', () => {
      const search = new QuickSearch(mockDocument);
      search.search('hello');

      const first = search.getCurrentResult();
      expect(first?.content).toBe('Hello world');

      const next = search.nextResult();
      expect(next?.content).toBe('Hello again');
      expect(search.getState().currentIndex).toBe(1);
    });

    it('should wrap around to first result', () => {
      const search = new QuickSearch(mockDocument);
      search.search('hello');

      search.nextResult(); // Move to second
      const next = search.nextResult(); // Should wrap to first

      expect(next?.content).toBe('Hello world');
      expect(search.getState().currentIndex).toBe(0);
    });

    it('should navigate to previous result', () => {
      const search = new QuickSearch(mockDocument);
      search.search('hello');

      const prev = search.previousResult();
      expect(prev?.content).toBe('Hello again');
      expect(search.getState().currentIndex).toBe(1);
    });

    it('should wrap around to last result when going back', () => {
      const search = new QuickSearch(mockDocument);
      search.search('hello');

      const prev = search.previousResult(); // Should wrap to last
      expect(prev?.content).toBe('Hello again');
      expect(search.getState().currentIndex).toBe(1);
    });

    it('should return null when no results', () => {
      const search = new QuickSearch(mockDocument);
      search.search('nonexistent');

      expect(search.nextResult()).toBeNull();
      expect(search.previousResult()).toBeNull();
    });

    it('should set current index directly', () => {
      const search = new QuickSearch(mockDocument);
      search.search('hello');

      const result = search.setCurrentIndex(1);
      expect(result?.content).toBe('Hello again');
      expect(search.getState().currentIndex).toBe(1);
    });

    it('should return null for invalid index', () => {
      const search = new QuickSearch(mockDocument);
      search.search('hello');

      expect(search.setCurrentIndex(-1)).toBeNull();
      expect(search.setCurrentIndex(10)).toBeNull();
    });
  });

  describe('state management', () => {
    it('should get current search state', () => {
      const search = new QuickSearch(mockDocument);
      search.search('hello');

      const state = search.getState();
      expect(state.query).toBe('hello');
      expect(state.totalResults).toBe(2);
      expect(state.currentIndex).toBe(0);
      expect(state.results).toHaveLength(2);
    });

    it('should clear search state', () => {
      const search = new QuickSearch(mockDocument);
      search.search('hello');
      search.clear();

      const state = search.getState();
      expect(state.query).toBe('');
      expect(state.totalResults).toBe(0);
      expect(state.results).toEqual([]);
    });

    it('should update document', () => {
      const search = new QuickSearch(mockDocument);
      const newDocument = {
        getDialogue: jest.fn(() => [])
      } as unknown as TEIDocument;

      search.setDocument(newDocument);
      search.search('hello');

      expect(newDocument.getDialogue).toHaveBeenCalled();
    });
  });

  describe('highlightMatches', () => {
    it('should highlight matching text', () => {
      const content = 'Hello world';
      const highlighted = QuickSearch.highlightMatches(content, 'hello');

      expect(highlighted).toContain('<mark>');
      expect(highlighted).toContain('</mark>');
    });

    it('should return original content if no query', () => {
      const content = 'Hello world';
      const highlighted = QuickSearch.highlightMatches(content, '');

      expect(highlighted).toBe(content);
    });

    it('should escape special regex characters', () => {
      const content = 'Price: $100';
      const highlighted = QuickSearch.highlightMatches(content, '$100');

      expect(highlighted).toContain('<mark>$100</mark>');
    });
  });

  describe('getContext', () => {
    it('should return context around match', () => {
      const content = 'This is a long passage with some text in the middle that matches';
      const context = QuickSearch.getContext(content, 'middle', 10);

      expect(context).toContain('middle');
      expect(context.length).toBeLessThan(content.length);
    });

    it('should add ellipsis for truncated content', () => {
      const content = 'This is a very long passage with some text in the middle that matches and continues';
      const context = QuickSearch.getContext(content, 'middle', 20);

      expect(context).toMatch(/^\.\.\./);
      expect(context).toMatch(/\.\.\.$/);
    });

    it('should return beginning if no match', () => {
      const content = 'This is a passage';
      const context = QuickSearch.getContext(content, 'nonexistent');

      expect(context).toBe('This is a passage');
    });

    it('should return truncated beginning if match is near start', () => {
      const content = 'Start of passage with more content';
      const context = QuickSearch.getContext(content, 'Start', 20);

      expect(context).not.toMatch(/^\.\.\./);
      expect(context).toMatch(/\.\.\.$/);
    });
  });
});

// XSS Sanitization Tests
import { sanitizeHTML } from '@/lib/utils/sanitizer';

describe('XSS Sanitization', () => {
  test('should sanitize malicious scripts', () => {
    const malicious = '<script>alert("XSS")</script>Hello';
    const sanitized = sanitizeHTML(malicious);
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).toContain('Hello');
  });

  test('should sanitize img onerror', () => {
    const malicious = '<img src="x" onerror="alert(1)">';
    const sanitized = sanitizeHTML(malicious);
    expect(sanitized).not.toContain('onerror');
  });

  test('should allow safe HTML', () => {
    const safe = '<mark>highlighted</mark> text';
    const sanitized = sanitizeHTML(safe);
    expect(sanitized).toContain('<mark>');
  });
});
