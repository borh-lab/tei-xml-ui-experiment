// @ts-nocheck
/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DocumentAnalytics } from '@/components/analytics/DocumentAnalytics';
import type { TEIDocument } from '@/lib/tei/types';

// Mock the useDocumentService hook
const mockDocument: TEIDocument = {
  parsed: {
    TEI: {
      text: {
        body: {
          p: [
            {
              said: [
                { '@who': 'alice', '#text': 'Hello bob' },
                { '@who': 'bob', '#text': 'Hi alice' }
              ]
            }
          ]
        }
      }
    }
  },
  state: {
    dialogue: [
      { id: '1', speaker: 'alice', content: 'Hello bob', passageId: 'p1', range: { start: 0, end: 10 } },
      { id: '2', speaker: 'bob', content: 'Hi alice', passageId: 'p1', range: { start: 11, end: 20 } }
    ],
    passages: [
      { id: 'p1', index: 0, content: 'Text', tags: [] },
      { id: 'p2', index: 1, content: 'More text', tags: [] }
    ],
    characters: []
  }
} as any;

jest.mock('@/lib/context/DocumentContext', () => ({
  useDocumentContext: () => ({
    document: mockDocument,
    loading: false,
    loadingSample: false,
    loadingProgress: 0,
    validationResults: null,
    isValidating: false,
    lastSavedRevision: null,
    lastSavedAt: null,
    error: null,
    loadDocument: jest.fn(),
    loadSample: jest.fn(),
    updateDocument: jest.fn(),
    setDocument: jest.fn(),
    clearDocument: jest.fn(),
    addSaidTag: jest.fn(),
    addQTag: jest.fn(),
    addPersNameTag: jest.fn(),
    addTag: jest.fn(),
    removeTag: jest.fn(),
    addCharacter: jest.fn(),
    updateCharacter: jest.fn(),
    removeCharacter: jest.fn(),
    addRelationship: jest.fn(),
    removeRelationship: jest.fn(),
    undo: jest.fn(),
    redo: jest.fn(),
    getHistoryState: jest.fn(),
    timeTravel: jest.fn(),
    validate: jest.fn(),
  }),
}));

describe('DocumentAnalytics', () => {
  it('should display rankings and sectional breakdown after analysis', async () => {
    render(<DocumentAnalytics />);

    // Wait for async analysis to complete
    await screen.findByText('Top Speakers');

    expect(screen.getByText('Top Speakers')).toBeInTheDocument();
    // Conversation matrix shows "No conversations found" when no addressees
    expect(screen.getByText('No conversations found')).toBeInTheDocument();
    // Sectional breakdown should be visible with "By Chapter" or "By Passage" buttons
    const chapterButton = await screen.findByText(/Chapter/i);
    expect(chapterButton).toBeInTheDocument();
  });
});
