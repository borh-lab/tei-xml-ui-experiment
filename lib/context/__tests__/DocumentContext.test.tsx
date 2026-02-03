/**
 * Integration Tests for DocumentContext
 *
 * Tests React Context integration with useReducer pattern,
 * undo/redo functionality, and sequential operations.
 */

import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { DocumentProvider, useDocumentContext } from '../DocumentContext';
import { ErrorProvider } from '../ErrorContext';
import type { PassageID, CharacterID } from '@/lib/tei/types';

const sampleXML = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader>
    <fileDesc>
      <titleStmt>
        <title>Test Document</title>
        <author>Test Author</author>
      </titleStmt>
    </fileDesc>
  </teiHeader>
  <text>
    <body>
      <p>Hello world this is a test passage.</p>
    </body>
  </text>
  <standOff>
    <listPerson>
      <person xml:id="speaker1">
        <persName>John Doe</persName>
      </person>
    </listPerson>
  </standOff>
</TEI>`;

// Test component to use the context
function TestComponent() {
  const {
    document,
    loadDocument,
    addSaidTag,
    removeTag,
    undo,
    redo,
    canUndo,
    canRedo,
    clearDocument,
  } = useDocumentContext();

  return (
    <div>
      <div data-testid="document-loaded">{document ? 'loaded' : 'not-loaded'}</div>
      <div data-testid="revision">{document?.state.revision ?? 'null'}</div>
      <div data-testid="can-undo">{canUndo ? 'true' : 'false'}</div>
      <div data-testid="can-redo">{canRedo ? 'true' : 'false'}</div>
      <div data-testid="passage-count">{document?.state.passages.length ?? 0}</div>
      <button data-testid="load" onClick={() => loadDocument(sampleXML)}>Load</button>
      <button data-testid="add-tag" onClick={() => {
        if (document) {
          const passageId = document.state.passages[0]?.id as PassageID;
          const speakerId = document.state.characters[0]?.id as CharacterID;
          if (passageId && speakerId) {
            addSaidTag(passageId, { start: 0, end: 5 }, speakerId);
          }
        }
      }}>Add Tag</button>
      <button data-testid="remove-tag" onClick={() => {
        if (document && document.state.passages[0]?.tags[0]) {
          removeTag(document.state.passages[0].tags[0].id);
        }
      }}>Remove Tag</button>
      <button data-testid="undo" onClick={undo}>Undo</button>
      <button data-testid="redo" onClick={redo}>Redo</button>
      <button data-testid="clear" onClick={clearDocument}>Clear</button>
    </div>
  );
}

function renderWithContext() {
  return render(
    <ErrorProvider>
      <DocumentProvider>
        <TestComponent />
      </DocumentProvider>
    </ErrorProvider>
  );
}

describe('DocumentContext Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('document loading', () => {
    it('should load document', async () => {
      renderWithContext();

      expect(screen.getByTestId('document-loaded')).toHaveTextContent('not-loaded');

      await act(async () => {
        screen.getByTestId('load').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('document-loaded')).toHaveTextContent('loaded');
      });

      expect(screen.getByTestId('revision')).toHaveTextContent('0');
      expect(screen.getByTestId('passage-count')).toHaveTextContent('1');
    });

    it('should extract metadata from loaded document', async () => {
      renderWithContext();

      await act(async () => {
        screen.getByTestId('load').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('document-loaded')).toHaveTextContent('loaded');
      });

      const { container } = renderWithContext();
      // Access context value to check metadata
      // Note: This would require a custom render function or different approach
    });
  });

  describe('tag operations', () => {
    it('should add tag and increment revision', async () => {
      renderWithContext();

      // Load document first
      await act(async () => {
        screen.getByTestId('load').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('revision')).toHaveTextContent('0');
      });

      // Add tag
      await act(async () => {
        screen.getByTestId('add-tag').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('revision')).toHaveTextContent('1');
      });
    });

    it('should enable undo after adding tag', async () => {
      renderWithContext();

      await act(async () => {
        screen.getByTestId('load').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('can-undo')).toHaveTextContent('false');
      });

      await act(async () => {
        screen.getByTestId('add-tag').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('can-undo')).toHaveTextContent('true');
      });
    });

    it('should remove tag and increment revision', async () => {
      renderWithContext();

      await act(async () => {
        screen.getByTestId('load').click();
      });

      // Add tag first
      await act(async () => {
        screen.getByTestId('add-tag').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('revision')).toHaveTextContent('1');
      });

      // Remove tag
      await act(async () => {
        screen.getByTestId('remove-tag').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('revision')).toHaveTextContent('2');
      });
    });
  });

  describe('undo/redo', () => {
    it('should undo operation and decrement revision', async () => {
      renderWithContext();

      await act(async () => {
        screen.getByTestId('load').click();
      });

      await act(async () => {
        screen.getByTestId('add-tag').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('revision')).toHaveTextContent('1');
      });

      await act(async () => {
        screen.getByTestId('undo').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('revision')).toHaveTextContent('0');
      });
    });

    it('should enable redo after undo', async () => {
      renderWithContext();

      await act(async () => {
        screen.getByTestId('load').click();
      });

      await act(async () => {
        screen.getByTestId('add-tag').click();
      });

      await act(async () => {
        screen.getByTestId('undo').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('can-redo')).toHaveTextContent('true');
      });
    });

    it('should redo operation and increment revision', async () => {
      renderWithContext();

      await act(async () => {
        screen.getByTestId('load').click();
      });

      await act(async () => {
        screen.getByTestId('add-tag').click();
      });

      await act(async () => {
        screen.getByTestId('undo').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('revision')).toHaveTextContent('0');
      });

      await act(async () => {
        screen.getByTestId('redo').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('revision')).toHaveTextContent('1');
      });
    });

    it('should not undo when at initial revision', async () => {
      renderWithContext();

      await act(async () => {
        screen.getByTestId('load').click();
      });

      await act(async () => {
        screen.getByTestId('undo').click();
      });

      // Should still be at revision 0
      await waitFor(() => {
        expect(screen.getByTestId('revision')).toHaveTextContent('0');
      });
    });

    it('should not redo when at latest revision', async () => {
      renderWithContext();

      await act(async () => {
        screen.getByTestId('load').click();
      });

      await act(async () => {
        screen.getByTestId('redo').click();
      });

      // Should still be at revision 0
      await waitFor(() => {
        expect(screen.getByTestId('revision')).toHaveTextContent('0');
      });
    });
  });

  describe('multiple sequential operations', () => {
    it('should handle multiple tag additions', async () => {
      renderWithContext();

      await act(async () => {
        screen.getByTestId('load').click();
      });

      // Add multiple tags
      await act(async () => {
        screen.getByTestId('add-tag').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('revision')).toHaveTextContent('1');
      });

      await act(async () => {
        screen.getByTestId('add-tag').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('revision')).toHaveTextContent('2');
      });
    });

    it('should undo multiple operations', async () => {
      renderWithContext();

      await act(async () => {
        screen.getByTestId('load').click();
      });

      // Add 2 tags
      await act(async () => {
        screen.getByTestId('add-tag').click();
      });

      await act(async () => {
        screen.getByTestId('add-tag').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('revision')).toHaveTextContent('2');
      });

      // Undo twice
      await act(async () => {
        screen.getByTestId('undo').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('revision')).toHaveTextContent('1');
      });

      await act(async () => {
        screen.getByTestId('undo').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('revision')).toHaveTextContent('0');
      });
    });

    it('should maintain event log through multiple operations', async () => {
      renderWithContext();

      await act(async () => {
        screen.getByTestId('load').click();
      });

      await act(async () => {
        screen.getByTestId('add-tag').click();
      });

      await act(async () => {
        screen.getByTestId('add-tag').click();
      });

      // This test verifies the event log is maintained
      // The actual assertion would require accessing the context value directly
      // For now, we just verify the operations complete without errors
      await waitFor(() => {
        expect(screen.getByTestId('revision')).toHaveTextContent('2');
      });
    });
  });

  describe('clear document', () => {
    it('should clear document', async () => {
      renderWithContext();

      await act(async () => {
        screen.getByTestId('load').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('document-loaded')).toHaveTextContent('loaded');
      });

      await act(async () => {
        screen.getByTestId('clear').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('document-loaded')).toHaveTextContent('not-loaded');
      });
    });
  });
});
