'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDocumentContext } from '@/lib/context/DocumentContext';
import { parseDocId, buildDocUrl } from './urlUtils';

interface URLSyncProviderProps {
  children: React.ReactNode;
  searchParams: ReadonlyURLSearchParams | URLSearchParams;
}

// Create NavigationContext for error state
const NavigationContext = createContext<{
  loadError: Error | null;
}>({
  loadError: null,
});

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within URLSyncProvider');
  }
  return context;
}

/**
 * Synchronizes document state with URL for browser history navigation.
 *
 * Responsibilities:
 * 1. On mount: parse URL, load document if ?doc=X present
 * 2. On document load: update URL to ?doc=X
 * 3. On back/forward: reload document from URL
 */
export default function URLSyncProvider({ children, searchParams }: URLSyncProviderProps) {
  const router = useRouter();
  const documentService = useDocumentContext();
  const { document, loadSample, loadDocument, currentDocId } = documentService;

  const [loadError, setLoadError] = useState<Error | null>(null);
  const isSyncingRef = useRef(false);
  const lastDocIdRef = useRef<string | null>(null);

  // Load document from URL on mount
  useEffect(() => {
    if (isSyncingRef.current) return;

    const docId = parseDocId(searchParams);
    if (!docId) {
      setLoadError(null);
      return;
    }

    isSyncingRef.current = true;
    lastDocIdRef.current = docId;

    const loadFromUrl = async () => {
      try {
        if (docId.startsWith('sample-')) {
          const sampleName = docId.replace('sample-', '');
          await loadSample(sampleName);
        } else if (docId.startsWith('uploaded-')) {
          // Uploaded docs - would need file lookup logic
          throw new Error('Uploaded document not found in history');
        } else if (docId.startsWith('corpus-')) {
          // Corpus docs - would need corpus loading logic
          const corpusPath = docId.replace('corpus-', '');
          await loadDocument(corpusPath);
        } else {
          throw new Error(`Invalid document ID format: ${docId}`);
        }
        setLoadError(null);
      } catch (error) {
        setLoadError(error as Error);
        console.error('Failed to load document from URL:', error);
      } finally {
        isSyncingRef.current = false;
      }
    };

    loadFromUrl();
  }, [searchParams, loadSample, loadDocument]);

  // Update URL when document loads successfully
  useEffect(() => {
    if (isSyncingRef.current) return;

    if (!currentDocId || currentDocId === lastDocIdRef.current) {
      return;
    }

    isSyncingRef.current = true;
    lastDocIdRef.current = currentDocId;

    router.push(buildDocUrl(currentDocId));
    isSyncingRef.current = false;
  }, [currentDocId, router]);

  // Handle browser back/forward
  useEffect(() => {
    const handlePopState = () => {
      // On popstate, reload from URL (useEffect above will handle it)
      // The router will update searchParams, triggering our mount effect
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigationValue = { loadError };

  return (
    <NavigationContext.Provider value={navigationValue}>
      {children}
    </NavigationContext.Provider>
  );
}
