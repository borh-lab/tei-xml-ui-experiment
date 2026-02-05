'use client';

import { useState, useEffect, useCallback } from 'react';
import type { AIMode } from '@/components/ai/AIModeSwitcher';
import { DialogueSpan } from '@/lib/ai/providers';
import type { TEIDocument, TEINode } from '@/lib/tei/types';

export interface UseAISuggestionsResult {
  aiMode: AIMode;
  setAIMode: (mode: AIMode) => void;
  suggestions: DialogueSpan[];
  acceptSuggestion: (suggestion: DialogueSpan) => void;
  rejectSuggestion: (suggestion: DialogueSpan) => void;
}

export interface UseAISuggestionsOptions {
  document: TEIDocument | null;
}

/**
 * Manages AI mode and dialogue detection suggestions.
 *
 * This hook handles:
 * - AI mode (manual, suggest, auto)
 * - Dialogue detection simulation
 * - Accept/reject suggestion handlers
 */
export function useAISuggestions(
  options: UseAISuggestionsOptions
): UseAISuggestionsResult {
  const { document } = options;

  const [aiMode, setAIMode] = useState<AIMode>('manual');
  const [suggestions, setSuggestions] = useState<DialogueSpan[]>([]);

  // Accept suggestion handler
  const acceptSuggestion = useCallback((suggestion: DialogueSpan) => {
    console.log('Accept suggestion:', suggestion);
    setSuggestions((prev) =>
      prev.filter((s) => !(s.start === suggestion.start && s.end === suggestion.end))
    );
  }, []);

  // Reject suggestion handler
  const rejectSuggestion = useCallback((suggestion: DialogueSpan) => {
    console.log('Reject suggestion:', suggestion);
    setSuggestions((prev) =>
      prev.filter((s) => !(s.start === suggestion.start && s.end === suggestion.end))
    );
  }, []);

  // Simulate AI detection when in suggest or auto mode
  useEffect(() => {
    let isMounted = true;

    async function detectDialogue() {
      if (!document || aiMode === 'manual') return;

      const tei = document.state.parsed.TEI as TEINode | undefined;
      const text = tei?.text as TEINode | undefined;
      const body = text?.body as TEINode | undefined;
      const paragraphs = body?.p;
      const textContent = Array.isArray(paragraphs) ? paragraphs.join(' ') : paragraphs?.['#text'] || '';

      // Simulate AI dialogue detection (placeholder until Task 13)
      const detectedSpans: DialogueSpan[] = [];
      const quoteRegex = /"([^"]+)"/g;
      let match;

      while ((match = quoteRegex.exec(textContent)) !== null) {
        detectedSpans.push({
          start: match.index,
          end: match.index + match[0].length,
          text: match[1],
          confidence: 0.7 + Math.random() * 0.25, // Random confidence between 0.7 and 0.95
        });
      }

      if (isMounted) {
        setSuggestions(detectedSpans);
      }
    }

    detectDialogue();

    return () => {
      isMounted = false;
    };
  }, [aiMode, document]);

  return {
    aiMode,
    setAIMode,
    suggestions,
    acceptSuggestion,
    rejectSuggestion,
  };
}
