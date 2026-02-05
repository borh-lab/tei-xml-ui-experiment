/**
 * EntityUsageViz Component Tests (Task 6.5)
 */

import { render, screen } from '@testing-library/react';
import { EntityUsageViz } from '@/components/entities/EntityUsageViz';
import type { Character } from '@/lib/tei/types';

describe('EntityUsageViz Component', () => {
  const mockCharacter: Character = {
    id: 'char-jane-doe' as Character['id'],
    xmlId: 'jane-doe',
    name: 'Jane Doe',
    sex: 'F',
  };

  it('should render empty state when no usages', () => {
    render(
      <EntityUsageViz
        entity={mockCharacter}
        usages={[]}
      />
    );

    expect(screen.getByText(/No usage found/i)).toBeInTheDocument();
    expect(screen.getByText(/not referenced in any passages/i)).toBeInTheDocument();
  });

  it('should render usage list with passages', () => {
    const usages = [
      {
        passageId: 'passage-1',
        passageIndex: 0,
        tagCount: 3,
        tagIds: ['tag-1', 'tag-2', 'tag-3'],
      },
      {
        passageId: 'passage-2',
        passageIndex: 1,
        tagCount: 1,
        tagIds: ['tag-4'],
      },
    ];

    render(
      <EntityUsageViz
        entity={mockCharacter}
        usages={usages}
      />
    );

    expect(screen.getByText(/Usage for "Jane Doe"/i)).toBeInTheDocument();
    expect(screen.getByText(/2 passages/i)).toBeInTheDocument();
    expect(screen.getByText(/Passage 1/i)).toBeInTheDocument();
    expect(screen.getByText(/3 tags/i)).toBeInTheDocument();
  });
});
