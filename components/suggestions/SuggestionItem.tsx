/**
 * SuggestionItem Component
 *
 * Displays a single tag suggestion with:
 * - Tag type
 * - Confidence score as progress bar
 * - Reason for suggestion
 * - Click handler
 */

import React from 'react';
import type { Suggestion } from '@/lib/values/Suggestion';

export interface SuggestionItemProps {
  /** The suggestion to display */
  suggestion: Suggestion;
  /** Click handler */
  onClick: (suggestion: Suggestion) => void;
}

/**
 * Convert confidence to percentage
 */
function confidenceToPercentage(confidence: number): number {
  return Math.round(confidence * 100);
}

/**
 * Get confidence color based on score
 */
function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return 'bg-green-500';
  if (confidence >= 0.6) return 'bg-yellow-500';
  if (confidence >= 0.4) return 'bg-orange-500';
  return 'bg-red-500';
}

/**
 * SuggestionItem component
 *
 * Displays a single suggestion with confidence bar and reason.
 * Clickable to apply the suggestion.
 */
export function SuggestionItem({ suggestion, onClick }: SuggestionItemProps) {
  const { tagType, confidence, reason, requiredAttrs } = suggestion;
  const percentage = confidenceToPercentage(confidence);
  const confidenceColor = getConfidenceColor(confidence);
  const hasRequiredAttrs = requiredAttrs && Object.keys(requiredAttrs).length > 0;

  const handleClick = () => {
    onClick(suggestion);
  };

  return (
    <div
      className="suggestion-item cursor-pointer p-3 border rounded-md hover:bg-accent/50 transition-colors"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">{`<${tagType}>`}</span>
          {hasRequiredAttrs && (
            <span className="text-xs text-muted-foreground">(requires attributes)</span>
          )}
        </div>
        <span className="text-sm font-medium">{percentage}%</span>
      </div>

      {/* Confidence bar */}
      <div className="w-full bg-secondary rounded-full h-2 mb-2">
        <div
          className={`h-2 rounded-full ${confidenceColor} transition-all`}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>

      {/* Reason */}
      <p className="text-xs text-muted-foreground">{reason}</p>
    </div>
  );
}
