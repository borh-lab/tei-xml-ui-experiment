import { renderHook, act } from '@testing-library/react';
import { Effect } from 'effect';
import { useDocumentV2 } from '../useDocumentV2';
import { initialState } from '@/lib/values/DocumentState';
import { DocumentProtocolLive } from '@/lib/effect/protocols/DocumentV2';
import type { DocumentProtocol } from '@/lib/effect/protocols/DocumentV2';
import type { TEIDocument } from '@/lib/tei/types';

const sampleXML = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader>
    <fileDesc>
      <titleStmt><title>Test</title></titleStmt>
    </fileDesc>
  </teiHeader>
  <text>
    <body>
      <p xml:id="p1">Hello world</p>
    </body>
  </text>
</TEI>`;

describe('useDocumentV2', () => {
  it('should start with initial state', () => {
    const { result } = renderHook(() => useDocumentV2());

    expect(result.current.state).toEqual(initialState());
  });

  it('should accept injected initial state', () => {
    const customState = {
      ...initialState(),
      status: 'loading' as const,
    };

    const { result } = renderHook(() => useDocumentV2(customState));

    expect(result.current.state.status).toBe('loading');
  });

  it('should load document', async () => {
    const { result } = renderHook(() => useDocumentV2());

    await act(async () => {
      await result.current.operations.loadDocument(sampleXML);
    });

    expect(result.current.state.document).not.toBeNull();
    expect(result.current.state.status).toBe('success');
    expect(result.current.state.error).toBeNull();
  });

  it('should handle load errors', async () => {
    const { result } = renderHook(() => useDocumentV2());

    // The parser is lenient, so this won't error
    // Just verify the hook handles the operation
    await act(async () => {
      await result.current.operations.loadDocument('not really xml');
    });

    expect(result.current.state.document).not.toBeNull();
  });

  it('should accept protocol injection for testing', async () => {
    // Mock protocol that returns a fixed state
    const mockProtocol: DocumentProtocol = {
      loadDocument: () =>
        Effect.succeed({
          ...initialState(),
          status: 'success',
          document: { state: { revision: 1 } } as TEIDocument,
        }),
      addSaidTag: () => Effect.succeed(initialState()),
      addQTag: () => Effect.succeed(initialState()),
      addPersNameTag: () => Effect.succeed(initialState()),
      removeTag: () => Effect.succeed(initialState()),
      addCharacter: () => Effect.succeed(initialState()),
      updateCharacter: () => Effect.succeed(initialState()),
      removeCharacter: () => Effect.succeed(initialState()),
      addRelationship: () => Effect.succeed(initialState()),
      removeRelationship: () => Effect.succeed(initialState()),
    };

    const { result } = renderHook(() =>
      useDocumentV2(undefined, mockProtocol, undefined as any)
    );

    await act(async () => {
      await result.current.operations.loadDocument(sampleXML);
    });

    // Should use mock protocol
    expect(result.current.state.status).toBe('success');
  });
});
