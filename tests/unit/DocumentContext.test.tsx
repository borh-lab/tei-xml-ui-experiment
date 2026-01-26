import { renderHook, act } from '@testing-library/react';
import { useDocumentContext, DocumentProvider } from '@/lib/context/DocumentContext';

describe('DocumentContext', () => {
  test('should provide document to consumers', () => {
    const wrapper = ({ children }) => <DocumentProvider>{children}</DocumentProvider>;

    const { result } = renderHook(() => useDocumentContext(), { wrapper });

    expect(result.current).toBeDefined();
    expect(result.current.document).toBeNull();
  });

  test('should load document', () => {
    const wrapper = ({ children }) => <DocumentProvider>{children}</DocumentProvider>;
    const tei = `<TEI xmlns="http://www.tei-c.org/ns/1.0"><text><body><p>Test</p></body></text></TEI>`;

    const { result } = renderHook(() => useDocumentContext(), { wrapper });

    act(() => {
      result.current.loadDocument(tei);
    });

    expect(result.current.document).not.toBeNull();
  });
});
