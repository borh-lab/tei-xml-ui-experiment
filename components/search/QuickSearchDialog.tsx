// @ts-nocheck
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useDocumentService } from '@/lib/effect/react/hooks';
import { QuickSearch, SearchResult, SearchState } from '@/lib/search/QuickSearch';
import { Search, ChevronUp, ChevronDown, X } from 'lucide-react';
import { sanitizeHTML } from '@/lib/utils/sanitizer';

interface QuickSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResultClick?: (result: SearchResult) => void;
}

export function QuickSearchDialog({ open, onOpenChange, onResultClick }: QuickSearchDialogProps) {
  const { document } = useDocumentService();
  const [search] = useState(() => new QuickSearch());
  const [query, setQuery] = useState('');
  const [searchState, setSearchState] = useState<SearchState>({
    query: '',
    results: [],
    currentIndex: -1,
    totalResults: 0,
  });

  // Update search instance when document changes
  useEffect(() => {
    search.setDocument(document);
  }, [document, search]);

  // Perform search when query changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Setting state in response to query prop change is intentional
    const state = search.search(query);
    setSearchState(state);
  }, [query, search]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        // Cmd/Ctrl + Enter: Jump to current result
        const current = search.getCurrentResult();
        if (current && onResultClick) {
          onResultClick(current);
          onOpenChange(false);
        }
      } else if (e.key === 'F3' || (e.key === 'g' && (e.ctrlKey || e.metaKey))) {
        // F3 or Ctrl/Cmd + G: Find next
        e.preventDefault();
        const next = search.nextResult();
        if (next) {
          setSearchState(search.getState());
        }
      } else if (e.key === 'F3' && e.shiftKey && (e.ctrlKey || e.metaKey)) {
        // Shift + F3: Find previous
        e.preventDefault();
        const prev = search.previousResult();
        if (prev) {
          setSearchState(search.getState());
        }
      } else if (e.key === 'Escape') {
        onOpenChange(false);
      }
    },
    [search, onResultClick, onOpenChange]
  );

  const handleNext = () => {
    const next = search.nextResult();
    if (next) {
      setSearchState(search.getState());
    }
  };

  const handlePrevious = () => {
    const prev = search.previousResult();
    if (prev) {
      setSearchState(search.getState());
    }
  };

  const handleResultClick = (result: SearchResult) => {
    if (onResultClick) {
      onResultClick(result);
    }
    onOpenChange(false);
  };

  const handleClear = () => {
    setQuery('');
    search.clear();
    setSearchState(search.getState());
  };

  // Reset search when dialog closes
  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Resetting state on dialog close is intentional
      setQuery('');
      search.clear();
      setSearchState(search.getState());
    }
  }, [open, search]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <div className="space-y-4">
          {/* Search input */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search passages... (Cmd/Ctrl+F)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-9"
                autoFocus
              />
              {query && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                  onClick={handleClear}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Navigation controls */}
          {searchState.totalResults > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevious}
                  disabled={searchState.totalResults === 0}
                >
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNext}
                  disabled={searchState.totalResults === 0}
                >
                  Next
                  <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </div>

              <div className="text-sm text-muted-foreground">
                {searchState.currentIndex + 1} of {searchState.totalResults} results
              </div>
            </div>
          )}

          {/* Results */}
          {query.length >= 2 && searchState.totalResults === 0 && (
            <div className="text-center text-sm text-muted-foreground py-8">
              No results found for &quot;{query}&quot;
            </div>
          )}

          {searchState.results.length > 0 && (
            <div className="max-h-96 overflow-y-auto space-y-2">
              {searchState.results.map((result, idx) => {
                const isCurrent = idx === searchState.currentIndex;
                const context = QuickSearch.getContext(result.content, query);

                return (
                  <div
                    key={result.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      isCurrent ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                    }`}
                    onClick={() => handleResultClick(result)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium">{result.speaker}</span>
                      {result.chapter && (
                        <span className="text-xs opacity-70">Section {result.chapter}</span>
                      )}
                    </div>
                    <div
                      className="text-sm"
                      dangerouslySetInnerHTML={{
                        __html: sanitizeHTML(QuickSearch.highlightMatches(context, query)),
                      }}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* Keyboard shortcuts help */}
          <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
            <div className="flex justify-between">
              <span>Next result:</span>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">F3 or Cmd/Ctrl + G</kbd>
            </div>
            <div className="flex justify-between">
              <span>Previous result:</span>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Shift + F3</kbd>
            </div>
            <div className="flex justify-between">
              <span>Jump to result:</span>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Cmd/Ctrl + Enter</kbd>
            </div>
            <div className="flex justify-between">
              <span>Close:</span>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Esc</kbd>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
