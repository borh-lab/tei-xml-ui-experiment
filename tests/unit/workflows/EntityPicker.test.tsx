/**
 * Tests for EntityPicker Component
 *
 * Tests dropdown component for selecting characters/places/organizations.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EntityPicker } from '@/components/workflows/EntityPicker';
import type { AvailableEntity } from '@/lib/protocols/workflows';

const mockEntities: AvailableEntity[] = [
  {
    id: 'char-1',
    name: 'Alice',
    type: 'character',
    archived: false,
    usageCount: 5,
  },
  {
    id: 'char-2',
    name: 'Bob',
    type: 'character',
    archived: false,
    usageCount: 3,
  },
  {
    id: 'char-3',
    name: 'Archived Character',
    type: 'character',
    archived: true,
    usageCount: 1,
  },
];

describe('EntityPicker Component', () => {
  test('should render entity picker with placeholder', () => {
    render(
      <EntityPicker
        entities={mockEntities}
        onSelect={() => {}}
        placeholder="Select a character"
      />
    );

    expect(screen.getByText('Select a character')).toBeInTheDocument();
  });

  test('should show entities when opened', async () => {
    render(
      <EntityPicker
        entities={mockEntities}
        onSelect={() => {}}
      />
    );

    // Click to open dropdown
    const button = screen.getByRole('combobox');
    fireEvent.click(button);

    // Should show non-archived entities
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });

    // Should not show archived entities
    expect(screen.queryByText('Archived Character')).not.toBeInTheDocument();
  });

  test('should filter entities by search text', async () => {
    render(
      <EntityPicker
        entities={mockEntities}
        onSelect={() => {}}
      />
    );

    // Open dropdown
    const button = screen.getByRole('combobox');
    fireEvent.click(button);

    // Type search text
    const searchInput = screen.getByRole('searchbox');
    fireEvent.change(searchInput, { target: { value: 'Ali' } });

    // Should only show matching entities
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.queryByText('Bob')).not.toBeInTheDocument();
    });
  });

  test('should show entity usage count', async () => {
    render(
      <EntityPicker
        entities={mockEntities}
        onSelect={() => {}}
        showUsageCount={true}
      />
    );

    // Open dropdown
    fireEvent.click(screen.getByRole('combobox'));

    // Should show usage counts
    await waitFor(() => {
      expect(screen.getByText(/5.*uses/)).toBeInTheDocument();
      expect(screen.getByText(/3.*uses/)).toBeInTheDocument();
    });
  });

  test('should call onSelect when entity is selected', async () => {
    const onSelect = jest.fn();

    render(
      <EntityPicker
        entities={mockEntities}
        onSelect={onSelect}
      />
    );

    // Open dropdown
    fireEvent.click(screen.getByRole('combobox'));

    // Click on entity
    await waitFor(() => {
      fireEvent.click(screen.getByText('Alice'));
    });

    // Should call onSelect with entity
    expect(onSelect).toHaveBeenCalledWith(mockEntities[0]);
  });

  test('should handle empty entities list', () => {
    render(
      <EntityPicker
        entities={[]}
        onSelect={() => {}}
        placeholder="No entities available"
      />
    );

    expect(screen.getByText('No entities available')).toBeInTheDocument();
  });
});
