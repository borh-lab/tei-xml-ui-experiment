// lib/navigation/urlUtils.ts
import { ReadonlyURLSearchParams } from 'next/navigation';

/**
 * Parse document ID from URL search params
 * @param searchParams - URL search params from Next.js
 * @returns Document ID or null if not present/empty
 */
export function parseDocId(searchParams: ReadonlyURLSearchParams): string | null {
  const docId = searchParams.get('doc');
  if (!docId || docId.trim() === '') {
    return null;
  }
  return decodeURIComponent(docId);
}

/**
 * Build editor URL with doc parameter
 * @param docId - Document ID (e.g., 'sample-dialogism-1')
 * @returns URL path with query params (e.g., '/?doc=sample-dialogism-1')
 */
export function buildDocUrl(docId: string): string {
  return `/?doc=${encodeURIComponent(docId)}`;
}

/**
 * Build corpus URL with optional doc parameter
 * @param docId - Optional document ID to preserve context
 * @returns URL path (e.g., '/corpus?doc=sample-1' or '/corpus')
 */
export function buildCorpusUrl(docId: string | null): string {
  if (!docId) {
    return '/corpus';
  }
  return `/corpus?doc=${encodeURIComponent(docId)}`;
}
