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
    quotes: [
      { id: '1', speaker: 'alice', addressee: 'bob', text: 'Hello bob' },
      { id: '2', speaker: 'bob', addressee: 'alice', text: 'Hi alice' }
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
  it('should display rankings and matrix after analysis', async () => {
    render(<DocumentAnalytics />);

    // Wait for async analysis to complete
    await screen.findByText('Top Speakers');
    await screen.findByText('Conversation Matrix');

    expect(screen.getByText('Top Speakers')).toBeInTheDocument();
    expect(screen.getByText('Conversation Matrix')).toBeInTheDocument();
  });
});
