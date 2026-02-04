'use client';

import React from 'react';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DialogueSpan } from '@/lib/ai/providers';
import { db } from '@/lib/db/PatternDB';
import { extract, determinePosition } from '@/lib/learning/PatternExtractor';
import { logger } from '@/lib/utils/logger';

export interface InlineSuggestionsProps {
  suggestions: DialogueSpan[];
  onAccept: (suggestion: DialogueSpan) => void;
  onReject: (suggestion: DialogueSpan) => void;
  highlightedText?: string;
  currentPosition?: number;
  totalPositions?: number;
  aiMode?: 'manual' | 'suggest' | 'auto';
}

/**
 * InlineSuggestions Component
 *
 * Displays AI-detected dialogue with confidence scores and accept/reject actions.
 * Shows suggested text highlighting and provides keyboard shortcuts for quick actions.
 */
export const InlineSuggestions = React.memo(
  ({
    suggestions,
    onAccept,
    onReject,
    highlightedText,
    currentPosition = 0,
    totalPositions = 1,
    aiMode = 'manual',
  }: InlineSuggestionsProps) => {
    if (suggestions.length === 0) {
      return null;
    }

    // Determine position in section for pattern learning
    const position = determinePosition(currentPosition, totalPositions);

    const handleAccept = async (suggestion: DialogueSpan) => {
      try {
        // Extract and store patterns
        const patterns = extract(suggestion.text, (suggestion as any).speaker || '', position);

        await db.storeLearnedPattern((suggestion as any).speaker || '', patterns);

        logger.info('Pattern learned', {
          speaker: (suggestion as any).speaker,
          patternCount: patterns.phrases.size,
        });

        // Call parent's onAccept handler
        onAccept(suggestion);
      } catch (error) {
        logger.error('Failed to record pattern:', error);
        // Still call onAccept even if recording fails
        onAccept(suggestion);
      }
    };

    const handleReject = async (suggestion: DialogueSpan) => {
      try {
        // Log rejection for learning
        await db.logCorrection(
          suggestion.text,
          '', // No speaker selected
          [], // No speaker selected
          suggestion.confidence,
          position
        );

        logger.debug('Suggestion rejected', {
          text: suggestion.text,
          confidence: suggestion.confidence,
        });

        // Call parent's onReject handler
        onReject(suggestion);
      } catch (error) {
        logger.error('Failed to record rejection:', error);
        // Still call onReject even if recording fails
        onReject(suggestion);
      }
    };

    const getConfidenceColor = (confidence: number): string => {
      if (confidence >= 0.8) return 'bg-green-100 text-green-800 border-green-300';
      if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      return 'bg-red-100 text-red-800 border-red-300';
    };

    const getConfidenceLabel = (confidence: number): string => {
      if (confidence >= 0.8) return 'High';
      if (confidence >= 0.6) return 'Medium';
      return 'Low';
    };

    return (
      <div className="space-y-2" role="list" aria-label="AI suggestions">
        {suggestions.map((suggestion, index) => (
          <div
            key={`${suggestion.start}-${suggestion.end}-${index}`}
            className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg hover:shadow-sm transition-shadow"
            role="listitem"
          >
            {/* Confidence Badge */}
            <Badge
              variant="outline"
              className={`${getConfidenceColor(suggestion.confidence)} shrink-0`}
            >
              {(suggestion.confidence * 100).toFixed(0)}%{' '}
              {getConfidenceLabel(suggestion.confidence)}
            </Badge>

            {/* Suggested Text */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground mb-1">AI suggests dialogue:</p>
              <p className="text-sm text-muted-foreground italic line-clamp-2">
                {`"${suggestion.text}"`}
              </p>
              {highlightedText && suggestion.text.includes(highlightedText) && (
                <span className="inline-block mt-1 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs rounded">
                  Matched selection
                </span>
              )}
              {aiMode === 'auto' && suggestion.confidence >= 0.8 && (
                <span className="inline-block mt-1 px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs rounded">
                  Will be auto-applied
                </span>
              )}
              {aiMode === 'auto' && suggestion.confidence < 0.8 && (
                <span className="inline-block mt-1 px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 text-xs rounded">
                  Requires review
                </span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleAccept(suggestion)}
                className="text-green-600 hover:text-green-700 hover:bg-green-100 dark:text-green-400 dark:hover:bg-green-950/30"
                aria-label={`Accept suggestion: ${suggestion.text}`}
                title="Accept (A)"
              >
                <Check className="h-4 w-4" />
                <span className="sr-only">Accept</span>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleReject(suggestion)}
                className="text-red-600 hover:text-red-700 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-950/30"
                aria-label={`Reject suggestion: ${suggestion.text}`}
                title="Reject (X)"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Reject</span>
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison for suggestions array
    if (prevProps.suggestions.length !== nextProps.suggestions.length) {
      return false;
    }

    return prevProps.suggestions.every((suggestion, index) => {
      const next = nextProps.suggestions[index];
      return suggestion.text === next.text && suggestion.confidence === next.confidence;
    });
  }
);

InlineSuggestions.displayName = 'InlineSuggestions';

/**
 * InlineSuggestionItem Component
 *
 * Individual suggestion item for more granular control
 */
export interface InlineSuggestionItemProps {
  suggestion: DialogueSpan;
  onAccept: () => void;
  onReject: () => void;
  showFullText?: boolean;
}

export function InlineSuggestionItem({
  suggestion,
  onAccept,
  onReject,
  showFullText = true,
}: InlineSuggestionItemProps) {
  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800 border-green-300';
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-red-100 text-red-800 border-red-300';
  };

  return (
    <div className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded hover:shadow-sm transition-shadow">
      <Badge variant="outline" className={`${getConfidenceColor(suggestion.confidence)}`}>
        {(suggestion.confidence * 100).toFixed(0)}%
      </Badge>

      {showFullText && (
        <span className="flex-1 text-sm text-muted-foreground italic truncate">
          {`"${suggestion.text}"`}
        </span>
      )}

      <Button
        size="xs"
        variant="ghost"
        onClick={onAccept}
        className="text-green-600 hover:text-green-700 hover:bg-green-100"
        aria-label="Accept suggestion"
        title="Accept (A)"
      >
        <Check className="h-3 w-3" />
      </Button>
      <Button
        size="xs"
        variant="ghost"
        onClick={onReject}
        className="text-red-600 hover:text-red-700 hover:bg-red-100"
        aria-label="Reject suggestion"
        title="Reject (X)"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}
