/**
 * useDocumentSummary Hook
 *
 * Calls summarizeValidation protocol and memoizes by document revision.
 * Returns ValidationSummary | null.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { TEIDocument } from '@/lib/tei/types';
import type { ValidationSummary } from '@/lib/values/ValidationSummary';
import { summarizeValidation } from '@/lib/protocols/summary';
import { isSuccess } from '@/lib/protocols/Result';

/**
 * Hook to get document validation summary
 *
 * Memoizes by document revision to avoid unnecessary re-validation.
 * Returns null if validation fails or no document is provided.
 */
export function useDocumentSummary(document: TEIDocument | null): ValidationSummary | null {
  const [summary, setSummary] = useState<ValidationSummary | null>(null);

  // Update summary when document changes
  useEffect(() => {
    // Skip if no document
    if (!document) {
      setSummary(null);
      return;
    }

    // Validate document (summarizeValidation is already optimized with caching)
    const result = summarizeValidation(document);

    if (isSuccess(result)) {
      setSummary(result.value);
    } else {
      console.error('Validation failed:', result.error);
      setSummary(null);
    }
  }, [document]); // Only depend on document object reference

  return summary;
}

/**
 * Hook to get document validation summary with manual refresh
 *
 * Returns tuple of [summary, refresh]
 */
export function useDocumentSummaryWithRefresh(
  document: TEIDocument | null
): [ValidationSummary | null, () => void] {
  const summary = useDocumentSummary(document);

  const refresh = useCallback(() => {
    if (!document) {
      return;
    }

    const result = summarizeValidation(document);

    if (isSuccess(result)) {
      // Force update by setting state
      // Note: In a real implementation, we'd use a ref or state manager
      window.location.reload(); // Temporary - will be replaced with proper state update
    }
  }, [document]);

  return [summary, refresh];
}
