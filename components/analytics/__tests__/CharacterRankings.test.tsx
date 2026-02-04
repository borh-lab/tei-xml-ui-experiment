/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CharacterRankings } from '@/components/analytics/CharacterRankings';

describe('CharacterRankings', () => {
  it('should display rankings with bars', () => {
    const rankings = [
      { characterId: 'char1', characterName: 'Alice', quoteCount: 100, percent: 50 },
      { characterId: 'char2', characterName: 'Bob', quoteCount: 60, percent: 30 },
      { characterId: 'char3', characterName: 'Charlie', quoteCount: 40, percent: 20 }
    ];

    render(<CharacterRankings rankings={rankings} />);

    expect(screen.getByText('Top Speakers')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('100 (50.0%)')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
  });

  it('should display empty state when no rankings', () => {
    render(<CharacterRankings rankings={[]} />);

    expect(screen.getByText('No dialogue found in this document')).toBeInTheDocument();
  });

  it('should limit to top 10 speakers', () => {
    const rankings = Array.from({ length: 15 }, (_, i) => ({
      characterId: `char${i}`,
      characterName: `Character ${i}`,
      quoteCount: 100 - i,
      percent: 10
    }));

    render(<CharacterRankings rankings={rankings} />);

    // Should only show top 10
    expect(screen.getAllByText(/Character \d+/)).toHaveLength(10);
  });
});
