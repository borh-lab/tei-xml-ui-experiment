/**
 * Tests for TagSuggestionsPanel component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { TagSuggestionsPanel } from '@/components/suggestions/TagSuggestionsPanel';
import type { Suggestion } from '@/lib/values/Suggestion';
import { clearSuggestionCache } from '@/lib/protocols/suggestions';

describe('TagSuggestionsPanel', () => {
  const mockSuggestions: Suggestion[] = [
    {
      tagType: 'said',
      confidence: 0.85,
      reason: 'Dialogue detected: contains quotes, speech verb(s): said',
    },
    {
      tagType: 'q',
      confidence: 0.75,
      reason: 'Quote detected: contains double quotes',
    },
    {
      tagType: 'persName',
      confidence: 0.6,
      reason: 'Name detected: contains 2 capitalized word(s)',
    },
  ];

  beforeEach(() => {
    clearSuggestionCache();
  });

  it('should render all suggestions', () => {
    render(
      <TagSuggestionsPanel
        suggestions={mockSuggestions}
        onSuggestionClick={jest.fn()}
      />
    );

    expect(screen.getByText('<said>')).toBeInTheDocument();
    expect(screen.getByText('<q>')).toBeInTheDocument();
    expect(screen.getByText('<persName>')).toBeInTheDocument();
  });

  it('should show empty state when no suggestions', () => {
    render(
      <TagSuggestionsPanel
        suggestions={[]}
        onSuggestionClick={jest.fn()}
      />
    );

    expect(screen.getByText(/no suggestions/i)).toBeInTheDocument();
  });

  it('should call onSuggestionClick when suggestion is clicked', () => {
    const handleClick = jest.fn();

    render(
      <TagSuggestionsPanel
        suggestions={mockSuggestions}
        onSuggestionClick={handleClick}
      />
    );

    const firstSuggestion = screen.getByText('<said>');
    firstSuggestion.click();

    expect(handleClick).toHaveBeenCalledTimes(1);
    expect(handleClick).toHaveBeenCalledWith(mockSuggestions[0]);
  });

  it('should filter suggestions by confidence when filter is set', () => {
    render(
      <TagSuggestionsPanel
        suggestions={mockSuggestions}
        onSuggestionClick={jest.fn()}
        minConfidence={0.7}
      />
    );

    // Should only show suggestions with confidence >= 0.7
    expect(screen.getByText('<said>')).toBeInTheDocument();
    expect(screen.getByText('<q>')).toBeInTheDocument();
    expect(screen.queryByText('<persName>')).not.toBeInTheDocument();
  });

  it('should display title', () => {
    render(
      <TagSuggestionsPanel
        suggestions={mockSuggestions}
        onSuggestionClick={jest.fn()}
      />
    );

    expect(screen.getByText(/tag suggestions/i)).toBeInTheDocument();
  });

  it('should display suggestion count', () => {
    render(
      <TagSuggestionsPanel
        suggestions={mockSuggestions}
        onSuggestionClick={jest.fn()}
      />
    );

    expect(screen.getByText(/3 suggestions/i)).toBeInTheDocument();
  });

  it('should update suggestion count when filtering', () => {
    render(
      <TagSuggestionsPanel
        suggestions={mockSuggestions}
        onSuggestionClick={jest.fn()}
        minConfidence={0.7}
      />
    );

    expect(screen.getByText(/2 suggestions/i)).toBeInTheDocument();
  });

  it('should show loading state', () => {
    render(
      <TagSuggestionsPanel
        suggestions={[]}
        onSuggestionClick={jest.fn()}
        isLoading={true}
      />
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
});
