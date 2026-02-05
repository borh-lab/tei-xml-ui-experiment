// @ts-nocheck
import { useState, useCallback } from 'react';
import { SearchResult } from '@/lib/search/QuickSearch';

export function useQuickSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleResultClick = useCallback((result: SearchResult) => {
    setSelectedResult(result);
  }, []);

  return {
    isOpen,
    open,
    close,
    selectedResult,
    onResultClick: handleResultClick,
  };
}
