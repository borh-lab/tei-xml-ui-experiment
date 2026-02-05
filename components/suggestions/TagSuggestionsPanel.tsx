/**
 * TagSuggestionsPanel Component
 *
 * Displays a list of tag suggestions with:
 * - All suggestions from useSuggestions hook
 * - Filterable by confidence
 * - Empty state when no suggestions
 * - Clickable to apply suggestions
 */

import React from 'react';
import { SuggestionItem } from './SuggestionItem';
import type { Suggestion } from '@/lib/values/Suggestion';
import './TagSuggestionsPanel.css';

export interface TagSuggestionsPanelProps {
  /** Array of suggestions to display */
  suggestions: Suggestion[];
  /** Click handler for suggestions */
  onSuggestionClick: (suggestion: Suggestion) => void;
  /** Minimum confidence to display (default: 0) */
  minConfidence?: number;
  /** Loading state */
  isLoading?: boolean;
}

/**
 * TagSuggestionsPanel component
 *
 * Displays a list of tag suggestions with filtering and empty states.
 */
export function TagSuggestionsPanel({
  suggestions,
  onSuggestionClick,
  minConfidence = 0,
  isLoading = false,
}: TagSuggestionsPanelProps) {
  // Filter suggestions by confidence
  const filteredSuggestions = suggestions.filter(
    (s) => s.confidence >= minConfidence
  );

  return (
    <div className="tag-suggestions-panel">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Tag Suggestions</h3>
        {!isLoading && (
          <span className="text-sm text-muted-foreground">
            {filteredSuggestions.length} suggestion{filteredSuggestions.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="text-muted-foreground">Loading suggestions...</div>
        </div>
      ) : filteredSuggestions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-muted-foreground">No suggestions available</p>
          <p className="text-xs text-muted-foreground mt-2">
            Select some text to see tag suggestions
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredSuggestions.map((suggestion) => (
            <SuggestionItem
              key={`${suggestion.tagType}-${suggestion.confidence}`}
              suggestion={suggestion}
              onClick={onSuggestionClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
