/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SectionalBreakdown } from '@/components/analytics/SectionalBreakdown';
import { ByPassage, ByChapter } from '@/lib/analytics/sectional';

describe('SectionalBreakdown', () => {
  it('should display section bars', () => {
    const breakdown = {
      groups: [
        { label: 'Chapter 1', quoteCount: 100, percent: 50 },
        { label: 'Chapter 2', quoteCount: 50, percent: 25 }
      ],
      totalQuotes: 150
    };

    render(
      <SectionalBreakdown
        breakdown={breakdown}
        currentStrategy={ByChapter}
        onStrategyChange={jest.fn()}
      />
    );

    expect(screen.getByText('Chapter 1')).toBeInTheDocument();
    expect(screen.getByText('100 (50.0%)')).toBeInTheDocument();
  });

  it('should display empty state when no quotes', () => {
    const breakdown = {
      groups: [],
      totalQuotes: 0
    };

    render(
      <SectionalBreakdown
        breakdown={breakdown}
        currentStrategy={ByPassage}
        onStrategyChange={jest.fn()}
      />
    );

    expect(screen.getByText('No dialogue found in this document')).toBeInTheDocument();
  });

  it('should call onStrategyChange when button clicked', () => {
    const onStrategyChange = jest.fn();
    const breakdown = {
      groups: [{ label: 'Passage 1', quoteCount: 10, percent: 100 }],
      totalQuotes: 10
    };

    render(
      <SectionalBreakdown
        breakdown={breakdown}
        currentStrategy={ByPassage}
        onStrategyChange={onStrategyChange}
      />
    );

    const chapterButton = screen.getByRole('button', { name: /chapter/i });
    fireEvent.click(chapterButton);

    expect(onStrategyChange).toHaveBeenCalledWith(ByChapter);
  });
});
