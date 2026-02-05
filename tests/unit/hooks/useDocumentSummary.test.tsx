/**
 * Tests for useDocumentSummary hook
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useDocumentSummary } from '@/hooks/useDocumentSummary';
import { loadDocument } from '@/lib/tei';

describe('useDocumentSummary', () => {
  test('should return null for null document', () => {
    const { result } = renderHook(() => useDocumentSummary(null));

    expect(result.current).toBeNull();
  });

  test('should return null for undefined document', () => {
    const { result } = renderHook(() => useDocumentSummary(undefined as any));

    expect(result.current).toBeNull();
  });

  test('should validate document and return summary', async () => {
    const tei = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader>
    <fileDesc>
      <titleStmt><title>Test</title></titleStmt>
    </fileDesc>
  </teiHeader>
  <text>
    <body>
      <p>Hello world</p>
    </body>
  </text>
</TEI>`;

    const doc = loadDocument(tei);
    const { result } = renderHook(() => useDocumentSummary(doc));

    // Wait for validation to complete
    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    expect(result.current).toBeDefined();
    expect(result.current?.totalTags).toBe(0);
    expect(result.current?.issues).toHaveLength(0);
  });

  test('should detect validation issues', async () => {
    const tei = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader>
    <fileDesc>
      <titleStmt><title>Test</title></titleStmt>
    </fileDesc>
  </teiHeader>
  <text>
    <body>
      <p>
        <said>Hello</said>
      </p>
    </body>
  </text>
</TEI>`;

    const doc = loadDocument(tei);
    const { result } = renderHook(() => useDocumentSummary(doc));

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    expect(result.current?.issues.length).toBeGreaterThan(0);
    expect(result.current?.issues[0].code).toBe('MISSING_REQUIRED_ATTR');
  });

  test('should memoize by revision', async () => {
    const tei = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader>
    <fileDesc>
      <titleStmt><title>Test</title></titleStmt>
    </fileDesc>
  </teiHeader>
  <text>
    <body>
      <p>Hello world</p>
    </body>
  </text>
</TEI>`;

    const doc = loadDocument(tei);
    const { result, rerender } = renderHook(
      ({ document }) => useDocumentSummary(document),
      { initialProps: { document: doc } }
    );

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    const firstSummary = result.current;

    // Re-render with same document (same revision)
    rerender({ document: doc });

    // Should return same summary (memoized)
    expect(result.current).toBe(firstSummary);
  });

  test('should update when document revision changes', async () => {
    const tei1 = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader>
    <fileDesc>
      <titleStmt><title>Test</title></titleStmt>
    </fileDesc>
  </teiHeader>
  <text>
    <body>
      <p>Hello world</p>
    </body>
  </text>
</TEI>`;

    const tei2 = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader>
    <fileDesc>
      <titleStmt><title>Test</title></titleStmt>
    </fileDesc>
  </teiHeader>
  <text>
    <body>
      <p>
        <said>Hello</said>
      </p>
    </body>
  </text>
</TEI>`;

    const doc1 = loadDocument(tei1);
    const doc2 = loadDocument(tei2);

    const { result, rerender } = renderHook(
      ({ document }) => useDocumentSummary(document),
      { initialProps: { document: doc1 } }
    );

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    const firstSummary = result.current;
    expect(firstSummary?.totalTags).toBe(0);

    // Re-render with different document (different revision)
    rerender({ document: doc2 });

    await waitFor(() => {
      expect(result.current).not.toBeNull();
      expect(result.current?.totalTags).toBe(1);
    });

    expect(result.current).not.toBe(firstSummary);
  });

  test('should handle multiple passages', async () => {
    const tei = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader>
    <fileDesc>
      <titleStmt><title>Test</title></titleStmt>
    </fileDesc>
  </teiHeader>
  <text>
    <body>
      <p>
        <said who="#speaker1">Hello</said>
      </p>
      <p>
        <said>World</said>
      </p>
    </body>
  </text>
</TEI>`;

    const doc = loadDocument(tei);
    const { result } = renderHook(() => useDocumentSummary(doc));

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    expect(result.current?.totalTags).toBe(2);
    expect(result.current?.issues.length).toBeGreaterThan(0);
  });

  test('should aggregate by tag type', async () => {
    const tei = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader>
    <fileDesc>
      <titleStmt><title>Test</title></titleStmt>
    </fileDesc>
  </teiHeader>
  <text>
    <body>
      <p>
        <said who="#speaker1">Hello</said>
        <q who="#speaker1">Quote</q>
        <persName ref="#char1">John</persName>
      </p>
    </body>
  </text>
</TEI>`;

    const doc = loadDocument(tei);
    const { result } = renderHook(() => useDocumentSummary(doc));

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    expect(result.current?.byTagType).toHaveProperty('said');
    expect(result.current?.byTagType).toHaveProperty('q');
    expect(result.current?.byTagType).toHaveProperty('persName');
  });

  test('should aggregate by severity', async () => {
    const tei = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader>
    <fileDesc>
      <titleStmt><title>Test</title></titleStmt>
    </fileDesc>
  </teiHeader>
  <text>
    <body>
      <p>
        <said>Hello</said>
        <q>Quote</q>
      </p>
    </body>
  </text>
</TEI>`;

    const doc = loadDocument(tei);
    const { result } = renderHook(() => useDocumentSummary(doc));

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    expect(result.current?.bySeverity).toHaveProperty('critical');
    expect(result.current?.bySeverity).toHaveProperty('warning');
    expect(result.current?.bySeverity).toHaveProperty('info');
  });
});
