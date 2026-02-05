/**
 * EntityList Component Tests (Task 6.4)
 *
 * Tests for entity list table with filtering and sorting.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { EntityList } from '@/components/entities/EntityList';
import type { Character } from '@/lib/tei/types';

describe('EntityList Component', () => {
  const mockOnEdit = jest.fn();
  const mockOnDelete = jest.fn();
  const mockOnNewEntity = jest.fn();

  const mockCharacters: Character[] = [
    {
      id: 'char-jane-doe' as Character['id'],
      xmlId: 'jane-doe',
      name: 'Jane Doe',
      sex: 'F',
      age: 30,
    },
    {
      id: 'char-john-smith' as Character['id'],
      xmlId: 'john-smith',
      name: 'John Smith',
      sex: 'M',
      age: 25,
    },
    {
      id: 'char-bob-johnson' as Character['id'],
      xmlId: 'bob-johnson',
      name: 'Bob Johnson',
      sex: 'M',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render entity table', () => {
      render(
        <EntityList
          entities={mockCharacters}
          entityType="character"
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onNewEntity={mockOnNewEntity}
        />
      );

      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
      expect(screen.getByText('John Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
    });

    it('should display entity count', () => {
      render(
        <EntityList
          entities={mockCharacters}
          entityType="character"
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onNewEntity={mockOnNewEntity}
        />
      );

      expect(screen.getByText(/Showing 3 of 3 characters/i)).toBeInTheDocument();
    });

    it('should render "New Character" button', () => {
      render(
        <EntityList
          entities={mockCharacters}
          entityType="character"
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onNewEntity={mockOnNewEntity}
        />
      );

      expect(screen.getByRole('button', { name: /new character/i })).toBeInTheDocument();
    });

    it('should render filter input', () => {
      render(
        <EntityList
          entities={mockCharacters}
          entityType="character"
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onNewEntity={mockOnNewEntity}
        />
      );

      expect(screen.getByPlaceholderText(/filter characters by name/i)).toBeInTheDocument();
    });
  });

  describe('Filtering', () => {
    it('should filter entities by name', () => {
      render(
        <EntityList
          entities={mockCharacters}
          entityType="character"
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onNewEntity={mockOnNewEntity}
        />
      );

      const filterInput = screen.getByPlaceholderText(/filter characters by name/i);
      fireEvent.change(filterInput, { target: { value: 'Jane' } });

      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
      expect(screen.queryByText('John Smith')).not.toBeInTheDocument();
      expect(screen.queryByText('Bob Johnson')).not.toBeInTheDocument();
    });

    it('should show empty message when no results', () => {
      render(
        <EntityList
          entities={mockCharacters}
          entityType="character"
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onNewEntity={mockOnNewEntity}
        />
      );

      const filterInput = screen.getByPlaceholderText(/filter characters by name/i);
      fireEvent.change(filterInput, { target: { value: 'NonExistent' } });

      expect(screen.getByText(/No characters found matching/i)).toBeInTheDocument();
    });
  });

  describe('Sorting', () => {
    it('should sort entities by name ascending by default', () => {
      render(
        <EntityList
          entities={[mockCharacters[2], mockCharacters[0], mockCharacters[1]]}
          entityType="character"
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onNewEntity={mockOnNewEntity}
        />
      );

      const rows = screen.getAllByRole('row').slice(1); // Skip header
      expect(rows[0]).toHaveTextContent('Bob Johnson');
      expect(rows[1]).toHaveTextContent('Jane Doe');
      expect(rows[2]).toHaveTextContent('John Smith');
    });

    it('should toggle sort order when clicking name header', () => {
      render(
        <EntityList
          entities={mockCharacters}
          entityType="character"
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onNewEntity={mockOnNewEntity}
        />
      );

      const nameHeader = screen.getByText(/name/i);
      fireEvent.click(nameHeader);
      fireEvent.click(nameHeader);

      // Should show descending arrow
      expect(nameHeader).toHaveTextContent(/name ↓/);
    });
  });

  describe('Actions', () => {
    it('should call onEdit when Edit button is clicked', () => {
      render(
        <EntityList
          entities={mockCharacters}
          entityType="character"
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onNewEntity={mockOnNewEntity}
        />
      );

      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      fireEvent.click(editButtons[0]);

      expect(mockOnEdit).toHaveBeenCalledWith(mockCharacters[0]);
    });

    it('should call onDelete when Delete button is clicked', () => {
      render(
        <EntityList
          entities={mockCharacters}
          entityType="character"
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onNewEntity={mockOnNewEntity}
        />
      );

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      fireEvent.click(deleteButtons[0]);

      expect(mockOnDelete).toHaveBeenCalledWith(mockCharacters[0]);
    });

    it('should call onNewEntity when New button is clicked', () => {
      render(
        <EntityList
          entities={mockCharacters}
          entityType="character"
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onNewEntity={mockOnNewEntity}
        />
      );

      const newButton = screen.getByRole('button', { name: /new character/i });
      fireEvent.click(newButton);

      expect(mockOnNewEntity).toHaveBeenCalled();
    });
  });

  describe('Empty State', () => {
    it('should show empty message when no entities', () => {
      render(
        <EntityList
          entities={[]}
          entityType="character"
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onNewEntity={mockOnNewEntity}
        />
      );

      expect(screen.getByText(/No characters found/i)).toBeInTheDocument();
      expect(screen.getByText(/Click "New character" to create one/i)).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should disable buttons when loading', () => {
      render(
        <EntityList
          entities={mockCharacters}
          entityType="character"
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onNewEntity={mockOnNewEntity}
          loading={true}
        />
      );

      expect(screen.getByRole('button', { name: /new character/i })).toBeDisabled();
    });
  });
});
