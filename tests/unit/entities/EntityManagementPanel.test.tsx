/**
 * EntityManagementPanel Component Tests (Task 6.6)
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { EntityManagementPanel } from '@/components/entities/EntityManagementPanel';
import type { Character } from '@/lib/tei/types';

describe('EntityManagementPanel Component', () => {
  const mockCharacters: Character[] = [
    {
      id: 'char-jane-doe' as Character['id'],
      xmlId: 'jane-doe',
      name: 'Jane Doe',
      sex: 'F',
    },
    {
      id: 'char-john-smith' as Character['id'],
      xmlId: 'john-smith',
      name: 'John Smith',
      sex: 'M',
    },
  ];

  const mockOnSaveEntity = jest.fn();
  const mockOnDeleteEntity = jest.fn();
  const mockGetEntityUsage = jest.fn(() => []);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render entity type switcher', () => {
    render(
      <EntityManagementPanel
        entities={mockCharacters}
        onSaveEntity={mockOnSaveEntity}
        onDeleteEntity={mockOnDeleteEntity}
        getEntityUsage={mockGetEntityUsage}
      />
    );

    // Use getAllByText since "characters" appears in both the switcher and entity count
    expect(screen.getAllByText(/characters/i)).toHaveLength(2);
    expect(screen.getByText(/places/i)).toBeInTheDocument();
    expect(screen.getByText(/organizations/i)).toBeInTheDocument();
  });

  it('should render Browse tab by default', () => {
    render(
      <EntityManagementPanel
        entities={mockCharacters}
        onSaveEntity={mockOnSaveEntity}
        onDeleteEntity={mockOnDeleteEntity}
        getEntityUsage={mockGetEntityUsage}
      />
    );

    expect(screen.getByText(/Jane Doe/i)).toBeInTheDocument();
    expect(screen.getByText(/John Smith/i)).toBeInTheDocument();
  });

  it('should switch entity types', () => {
    render(
      <EntityManagementPanel
        entities={mockCharacters}
        onSaveEntity={mockOnSaveEntity}
        onDeleteEntity={mockOnDeleteEntity}
        getEntityUsage={mockGetEntityUsage}
      />
    );

    const placesButton = screen.getByText(/places/i);
    fireEvent.click(placesButton);

    // Should clear the list
    expect(screen.queryByText('Jane Doe')).not.toBeInTheDocument();
  });
});
