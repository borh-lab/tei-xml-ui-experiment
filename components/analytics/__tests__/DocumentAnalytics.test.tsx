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
    characters: []
  }
} as any;

jest.mock('@/lib/effect', () => ({
  useDocumentService: () => ({
    document: mockDocument,
    updateDocument: jest.fn(),
    loadingSample: false,
    loadingProgress: 0,
    validationResults: null,
    isValidating: false,
    addSaidTag: jest.fn(),
    addTag: jest.fn(),
  }),
}));

describe('DocumentAnalytics', () => {
  it('should display rankings after analysis', async () => {
    render(<DocumentAnalytics />);

    // Wait for async analysis to complete
    await screen.findByText('Top Speakers');

    expect(screen.getByText('Top Speakers')).toBeInTheDocument();
    // Conversation matrix shows "No conversations found" when no addressees
    expect(screen.getByText('No conversations found')).toBeInTheDocument();
  });
});
