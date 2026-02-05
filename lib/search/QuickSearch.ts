// @ts-nocheck
import { TEIDocument } from '@/lib/tei';

export interface SearchResult {
  id: string;
  content: string;
  speaker: string;
  chapter?: string;
  index: number;
  element: unknown;
}

export interface SearchState {
  query: string;
  results: SearchResult[];
  currentIndex: number;
  totalResults: number;
}

export class QuickSearch {
  private document: TEIDocument | null = null;
  private state: SearchState = {
    query: '',
    results: [],
    currentIndex: -1,
    totalResults: 0,
  };

  constructor(document: TEIDocument | null = null) {
    this.document = document;
  }

  setDocument(document: TEIDocument | null) {
    this.document = document;
    this.clear();
  }

  search(query: string): SearchState {
    if (!this.document || query.length < 2) {
      this.state = {
        query,
        results: [],
        currentIndex: -1,
        totalResults: 0,
      };
      return this.state;
    }

    const dialogue = this.document.getDialogue();
    const searchLower = query.toLowerCase();

    const results: SearchResult[] = dialogue
      .map((d, idx) => ({
        id: `passage-${idx}`,
        content: typeof d.content === 'string' ? d.content : '',
        speaker: d.who || 'Unknown',
        chapter: d.element?.closest?.getAttribute?.('n') || undefined,
        index: idx,
        element: d.element,
      }))
      .filter((result) => result.content.toLowerCase().includes(searchLower));

    this.state = {
      query,
      results,
      currentIndex: results.length > 0 ? 0 : -1,
      totalResults: results.length,
    };

    return this.state;
  }

  nextResult(): SearchResult | null {
    if (this.state.results.length === 0) return null;

    this.state.currentIndex = (this.state.currentIndex + 1) % this.state.results.length;
    return this.state.results[this.state.currentIndex];
  }

  previousResult(): SearchResult | null {
    if (this.state.results.length === 0) return null;

    this.state.currentIndex =
      (this.state.currentIndex - 1 + this.state.results.length) % this.state.results.length;
    return this.state.results[this.state.currentIndex];
  }

  setCurrentIndex(index: number): SearchResult | null {
    if (index < 0 || index >= this.state.results.length) return null;

    this.state.currentIndex = index;
    return this.state.results[index];
  }

  getCurrentResult(): SearchResult | null {
    if (this.state.currentIndex < 0 || this.state.currentIndex >= this.state.results.length) {
      return null;
    }
    return this.state.results[this.state.currentIndex];
  }

  getState(): SearchState {
    return { ...this.state };
  }

  clear() {
    this.state = {
      query: '',
      results: [],
      currentIndex: -1,
      totalResults: 0,
    };
  }

  // Highlight text matches in content
  static highlightMatches(content: string, query: string): string {
    if (!query) return content;

    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return content.replace(regex, '<mark>$1</mark>');
  }

  // Get context around match
  static getContext(content: string, query: string, contextLength = 40): string {
    const index = content.toLowerCase().indexOf(query.toLowerCase());
    if (index === -1) return content.substring(0, 80) + (content.length > 80 ? '...' : '');

    const start = Math.max(0, index - contextLength);
    const end = Math.min(content.length, index + query.length + contextLength);

    let result = content.substring(start, end);

    if (start > 0) result = '...' + result;
    if (end < content.length) result = result + '...';

    return result;
  }
}
