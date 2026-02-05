/**
 * Tests for SuggestionItem component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SuggestionItem } from '@/components/suggestions/SuggestionItem';
import type { Suggestion } from '@/lib/values/Suggestion';

describe('SuggestionItem', () => {
  const mockSuggestion: Suggestion = {
    tagType: 'said',
    confidence: 0.85,
    reason: 'Dialogue detected: contains quotes, speech verb(s): said',
  };

  it('should display suggestion tag type', () => {
    render(<SuggestionItem suggestion={mockSuggestion} onClick={jest.fn()} />);

    expect(screen.getByText('<said>')).toBeInTheDocument();
  });

  it('should display confidence score', () => {
    render(<SuggestionItem suggestion={mockSuggestion} onClick={jest.fn()} />);

    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  it('should display reason', () => {
    render(<SuggestionItem suggestion={mockSuggestion} onClick={jest.fn()} />);

    expect(screen.getByText(/Dialogue detected/)).toBeInTheDocument();
  });

  it('should show confidence bar', () => {
    const { container } = render(
      <SuggestionItem suggestion={mockSuggestion} onClick={jest.fn()} />
    );

    const progressBar = container.querySelector('[role="progressbar"]');
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveStyle({ width: '85%' });
  });

  it('should call onClick when clicked', () => {
    const handleClick = jest.fn();

    render(<SuggestionItem suggestion={mockSuggestion} onClick={handleClick} />);

    const item = screen.getByText('<said>').closest('div');
    fireEvent.click(item!);

    expect(handleClick).toHaveBeenCalledTimes(1);
    expect(handleClick).toHaveBeenCalledWith(mockSuggestion);
  });

  it('should be clickable', () => {
    const { container } = render(
      <SuggestionItem suggestion={mockSuggestion} onClick={jest.fn()} />
    );

    const item = container.querySelector('.suggestion-item');
    expect(item).toHaveClass('cursor-pointer');
  });

  it('should display different confidence levels correctly', () => {
    const lowConfidence: Suggestion = {
      tagType: 'q',
      confidence: 0.45,
      reason: 'Quote detected: contains question mark',
    };

    const { container } = render(
      <SuggestionItem suggestion={lowConfidence} onClick={jest.fn()} />
    );

    expect(screen.getByText('45%')).toBeInTheDocument();

    const progressBar = container.querySelector('[role="progressbar"]');
    expect(progressBar).toHaveStyle({ width: '45%' });
  });

  it('should display required attributes if present', () => {
    const suggestionWithAttrs: Suggestion = {
      tagType: 'said',
      confidence: 0.8,
      reason: 'Dialogue detected',
      requiredAttrs: { speaker: 'char-123' },
    };

    render(
      <SuggestionItem suggestion={suggestionWithAttrs} onClick={jest.fn()} />
    );

    // Should show that attributes are required
    expect(screen.getByText(/requires attributes/i)).toBeInTheDocument();
  });

  it('should not show required attributes message if not present', () => {
    render(<SuggestionItem suggestion={mockSuggestion} onClick={jest.fn()} />);

    expect(screen.queryByText(/requires attributes/i)).not.toBeInTheDocument();
  });
});
