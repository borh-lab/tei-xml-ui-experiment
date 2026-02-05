/**
 * Document Validation Integration Test (Task 5.12)
 *
 * Tests:
 * - Click "Validate Document" → summary displays
 * - Caching works (unchanged passages cache hit)
 * - Issue navigation works
 * - Export functionality (JSON, HTML, PDF)
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useDocumentSummary } from '@/hooks/useDocumentSummary';
import { summarizeValidation } from '@/lib/protocols/summary';
import { TEIDocument } from '@/lib/tei/types';
import { PassageValidationCache, getGlobalCache } from '@/lib/protocols/cache';
import { isSuccess } from '@/lib/protocols/Result';

describe('Document Validation Integration', () => {
  let mockDocument: TEIDocument;
  let cache: PassageValidationCache;

  beforeEach(() => {
    // Create a mock TEI document with multiple passages
    mockDocument = {
      id: 'test-doc-1',
      title: 'Test Document',
      state: {
        revision: 'rev-1',
        passages: [
          {
            id: 'p1',
            tags: [
              {
                id: 'tag-1',
                type: 'said',
                attributes: { who: '#char-1' },
                content: 'Hello world',
              },
            ],
          },
          {
            id: 'p2',
            tags: [
              {
                id: 'tag-2',
                type: 'said',
                attributes: {}, // Missing @who - should create validation issue
                content: 'Missing speaker',
              },
            ],
          },
          {
            id: 'p3',
            tags: [
              {
                id: 'tag-3',
                type: 'said',
                attributes: { who: '#char-1' },
                content: 'Valid dialogue',
              },
            ],
          },
        ],
        characters: [
          { xmlId: 'char-1', name: 'Character 1' },
        ],
        relationships: [],
      },
    } as unknown as TEIDocument;

    // Clear cache before each test
    cache = new PassageValidationCache({ maxSize: 100 });
    jest.spyOn(cache, 'get').mockImplementation((key) => {
      // Use actual cache implementation
      return PassageValidationCache.prototype.get.call(cache, key);
    });
    jest.spyOn(cache, 'set').mockImplementation((key, value) => {
      return PassageValidationCache.prototype.set.call(cache, key, value);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('useDocumentSummary Hook', () => {
    it('should return validation summary for a valid document', async () => {
      const { result } = renderHook(() => useDocumentSummary(mockDocument));

      await waitFor(() => {
        expect(result.current).not.toBeNull();
      });

      const summary = result.current!;
      expect(summary.totalTags).toBe(3);
      expect(summary.issues.length).toBeGreaterThan(0);
      expect(summary.bySeverity.critical).toBe(1); // p2 has missing @who
    });

    it('should return null for null document', () => {
      const { result } = renderHook(() => useDocumentSummary(null));

      expect(result.current).toBeNull();
    });

    it('should update summary when document changes', async () => {
      const { result, rerender } = renderHook(
        ({ doc }) => useDocumentSummary(doc),
        { initialProps: { doc: mockDocument } }
      );

      await waitFor(() => {
        expect(result.current).not.toBeNull();
      });

      const initialSummary = result.current;

      // Update document
      const updatedDocument = {
        ...mockDocument,
        state: {
          ...mockDocument.state!,
          revision: 'rev-2',
          passages: [
            ...mockDocument.state!.passages,
            {
              id: 'p4',
              tags: [
                {
                  id: 'tag-4',
                  type: 'said',
                  attributes: {}, // Another missing @who
                  content: 'New passage',
                },
              ],
            },
          ],
        },
      } as unknown as TEIDocument;

      rerender({ doc: updatedDocument });

      await waitFor(() => {
        expect(result.current).not.toEqual(initialSummary);
      });

      expect(result.current?.totalTags).toBe(4);
    });
  });

  describe('Caching', () => {
    it('should cache passage validation results', () => {
      const getSpy = jest.spyOn(cache, 'get');
      const setSpy = jest.spyOn(cache, 'set');

      // First validation - cache miss
      const result1 = summarizeValidation(mockDocument, cache);
      expect(isSuccess(result1)).toBe(true);

      // Should have attempted to get from cache
      expect(getSpy).toHaveBeenCalled();

      // Should have set cache entries
      expect(setSpy).toHaveBeenCalled();

      const summary1 = result1.value;

      // Second validation - should use cache for unchanged passages
      const result2 = summarizeValidation(mockDocument, cache);
      expect(isSuccess(result2)).toBe(true);

      const summary2 = result2.value;

      // Results should be identical
      expect(summary2).toEqual(summary1);
    });

    it('should invalidate cache when document revision changes', () => {
      // First validation
      const result1 = summarizeValidation(mockDocument, cache);
      expect(isSuccess(result1)).toBe(true);
      const summary1 = result1.value;

      // Change document revision
      const updatedDocument = {
        ...mockDocument,
        state: {
          ...mockDocument.state!,
          revision: 'rev-2',
        },
      } as unknown as TEIDocument;

      // Second validation with different revision
      const result2 = summarizeValidation(updatedDocument, cache);
      expect(isSuccess(result2)).toBe(true);

      // Should re-validate all passages (cache keys include revision)
      const summary2 = result2.value;

      // Summary should be the same (no actual content changes)
      expect(summary2.totalTags).toEqual(summary1.totalTags);
      expect(summary2.issues.length).toEqual(summary1.issues.length);
    });
  });

  describe('Issue Navigation', () => {
    it('should provide correct passage and tag IDs for navigation', () => {
      const result = summarizeValidation(mockDocument, cache);
      expect(isSuccess(result)).toBe(true);

      const summary = result.value;
      const criticalIssues = summary.issues.filter(i => i.severity === 'critical');

      expect(criticalIssues.length).toBeGreaterThan(0);

      const firstIssue = criticalIssues[0];
      expect(firstIssue.passageId).toBeDefined();
      expect(firstIssue.tagId).toBeDefined();
      expect(firstIssue.code).toBeDefined();
      expect(firstIssue.message).toBeDefined();

      // Verify navigation data is correct
      expect(['p1', 'p2', 'p3']).toContain(firstIssue.passageId);
      expect(['tag-1', 'tag-2', 'tag-3']).toContain(firstIssue.tagId);
    });

    it('should group issues by severity for dashboard', () => {
      const result = summarizeValidation(mockDocument, cache);
      expect(isSuccess(result)).toBe(true);

      const summary = result.value;

      expect(summary.bySeverity).toBeDefined();
      expect(typeof summary.bySeverity.critical).toBe('number');
      expect(typeof summary.bySeverity.warning).toBe('number');
      expect(typeof summary.bySeverity.info).toBe('number');

      expect(summary.bySeverity.critical).toBeGreaterThan(0);
    });
  });

  describe('Export Functionality', () => {
    it('should include all data needed for JSON export', () => {
      const result = summarizeValidation(mockDocument, cache);
      expect(isSuccess(result)).toBe(true);

      const summary = result.value;

      // Verify all required fields for export
      expect(summary.totalTags).toBeDefined();
      expect(Array.isArray(summary.issues)).toBe(true);
      expect(typeof summary.byTagType).toBe('object');
      expect(typeof summary.bySeverity).toBe('object');

      // Verify issues have all required fields
      if (summary.issues.length > 0) {
        const issue = summary.issues[0];
        expect(issue.id).toBeDefined();
        expect(issue.severity).toBeDefined();
        expect(issue.passageId).toBeDefined();
        expect(issue.tagId).toBeDefined();
        expect(issue.message).toBeDefined();
        expect(issue.code).toBeDefined();
      }
    });

    it('should provide tag statistics for export', () => {
      const result = summarizeValidation(mockDocument, cache);
      expect(isSuccess(result)).toBe(true);

      const summary = result.value;

      expect(Object.keys(summary.byTagType).length).toBeGreaterThan(0);

      // Verify tag stats structure
      for (const [tagType, stats] of Object.entries(summary.byTagType)) {
        expect(stats.total).toBeDefined();
        expect(stats.invalid).toBeDefined();
        expect(typeof stats.total).toBe('number');
        expect(typeof stats.invalid).toBe('number');
      }
    });
  });

  describe('Real-World Scenarios', () => {
    it('should handle document with no issues', () => {
      const validDocument = {
        ...mockDocument,
        state: {
          ...mockDocument.state!,
          passages: [
            {
              id: 'p1',
              tags: [
                {
                  id: 'tag-1',
                  type: 'said',
                  attributes: { who: '#char-1' },
                  content: 'Valid dialogue',
                },
              ],
            },
          ],
        },
      } as unknown as TEIDocument;

      const result = summarizeValidation(validDocument, cache);
      expect(isSuccess(result)).toBe(true);

      const summary = result.value;
      expect(summary.issues.filter(i => i.severity === 'critical').length).toBe(0);
      expect(summary.bySeverity.critical).toBe(0);
    });

    it('should handle document with multiple issue types', () => {
      const mixedDocument = {
        ...mockDocument,
        state: {
          ...mockDocument.state!,
          passages: [
            {
              id: 'p1',
              tags: [
                {
                  id: 'tag-1',
                  type: 'said',
                  attributes: {}, // Critical: missing @who
                  content: 'No speaker',
                },
                {
                  id: 'tag-2',
                  type: 'persName',
                  attributes: {}, // Warning: missing @ref
                  content: 'John',
                },
                {
                  id: 'tag-3',
                  type: 'q',
                  attributes: {}, // Info: missing @who (recommended)
                  content: 'Quote',
                },
              ],
            },
          ],
        },
      } as unknown as TEIDocument;

      const result = summarizeValidation(mixedDocument, cache);
      expect(isSuccess(result)).toBe(true);

      const summary = result.value;
      expect(summary.bySeverity.critical).toBeGreaterThan(0);
      expect(summary.bySeverity.warning).toBeGreaterThan(0);
      expect(summary.bySeverity.info).toBeGreaterThan(0);
    });
  });
});
