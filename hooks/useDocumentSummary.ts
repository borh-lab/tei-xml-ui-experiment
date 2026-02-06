/**
 * useDocumentSummary Hook
 *
 * Calls summarizeValidation protocol and memoizes by document revision.
 * Returns ValidationSummary | null.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { TEIDocument } from '@/lib/tei/types';
import type { ValidationSummary } from '@/lib/values/ValidationSummary';
import type { ValidationResult } from '@/lib/validation/types';
import { summarizeValidation } from '@/lib/protocols/summary';
import { isSuccess } from '@/lib/protocols/Result';
import { createLRUCache, type CacheKey } from '@/lib/protocols/cache';

/**
 * Hook to get document validation summary
 *
 * Memoizes by document revision to avoid unnecessary re-validation.
 * Returns null if validation fails or no document is provided.
 */
export function useDocumentSummary(document: TEIDocument | null): ValidationSummary | null {
  const [summary, setSummary] = useState<ValidationSummary | null>(null);

  // Create cache instance once and reuse across renders
  const cache = useMemo(
    () => createLRUCache<CacheKey, ValidationResult[]>({ maxSize: 100, ttl: 300000 }),
    []
  );

  // Update summary when document changes
  useEffect(() => {
    // Skip if no document
    if (!document) {
      setSummary(null);
      return;
    }

    // Validate document (summarizeValidation is already optimized with caching)
    const result = summarizeValidation(document, cache);

    if (isSuccess(result)) {
      setSummary(result.value);
    } else {
      console.error('Validation failed:', result);
      setSummary(null);
    }
  }, [document, cache]); // Depend on document and cache

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
  const [summary, setSummary] = useState<ValidationSummary | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    // Force re-validation by incrementing refresh key
    setRefreshKey(prev => prev + 1);
  }, []);

  // Create cache instance once and reuse across renders
  const cache = useMemo(
    () => createLRUCache<CacheKey, ValidationResult[]>({ maxSize: 100, ttl: 300000 }),
    []
  );

  // Update summary when document or refresh key changes
  useEffect(() => {
    // Skip if no document
    if (!document) {
      setSummary(null);
      return;
    }

    // Validate document (summarizeValidation is already optimized with caching)
    const result = summarizeValidation(document, cache);

    if (isSuccess(result)) {
      setSummary(result.value);
    } else {
      console.error('Validation failed:', result);
      setSummary(null);
    }
  }, [document, refreshKey, cache]); // Depend on refreshKey to force re-validation

  return [summary, refresh];
}
