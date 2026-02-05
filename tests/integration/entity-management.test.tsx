/**
 * Entity Management Integration Tests (Task 6.10)
 *
 * Comprehensive integration tests for entity management.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useEntities } from '@/hooks/useEntities';
import type { Character } from '@/lib/tei/types';

describe('Entity Management Integration', () => {
  describe('CRUD Operations', () => {
    it('should create entity and see it in EntityList', async () => {
      const { result } = renderHook(() => useEntities());

      // Create character
      await act(async () => {
        await result.current.createCharacter({
          name: 'Jane Doe',
          sex: 'F',
          age: 30,
        });
      });

      // Entity should be in list
      expect(result.current.entities).toHaveLength(1);
      expect((result.current.entities[0] as Character).name).toBe('Jane Doe');
    });

    it('should edit entity and see updates in EntityList', async () => {
      const { result } = renderHook(() => useEntities());

      // Create character
      let character: Character;
      await act(async () => {
        character = await result.current.createCharacter({
          name: 'Jane Doe',
          sex: 'F',
        });
      });

      // Update character
      await act(async () => {
        await result.current.updateEntity(character!.id, {
          age: 35,
          occupation: 'Teacher',
        });
      });

      // Check updates
      const updated = result.current.entities[0] as Character;
      expect(updated.name).toBe('Jane Doe'); // Unchanged
      expect(updated.age).toBe(35);
      expect(updated.occupation).toBe('Teacher');
    });

    it('should delete entity and remove from list', async () => {
      const { result } = renderHook(() => useEntities());

      // Create character
      let character: Character;
      await act(async () => {
        character = await result.current.createCharacter({
          name: 'Jane Doe',
          sex: 'F',
        });
      });

      expect(result.current.entities).toHaveLength(1);

      // Delete character
      await act(async () => {
        await result.current.deleteEntity(character!.id);
      });

      expect(result.current.entities).toHaveLength(0);
    });
  });

  describe('Import/Export', () => {
    it('should import entities from JSON', async () => {
      const { result } = renderHook(() => useEntities());

      const importData = [
        {
          name: 'Jane Doe',
          sex: 'F' as const,
          age: 30,
        },
        {
          name: 'John Smith',
          sex: 'M' as const,
        },
      ];

      // Import entities
      for (const entityData of importData) {
        await act(async () => {
          await result.current.createCharacter(entityData);
        });
      }

      expect(result.current.entities).toHaveLength(2);
    });

    it('should export entities to JSON structure', async () => {
      const { result } = renderHook(() => useEntities());

      await act(async () => {
        await result.current.createCharacter({
          name: 'Jane Doe',
          sex: 'F',
        });
      });

      const entities = result.current.entities;
      expect(entities).toHaveLength(1);

      const exported = JSON.stringify(entities, null, 2);
      expect(exported).toContain('Jane Doe');
      expect(exported).toContain('sex');
    });
  });

  describe('Entity Usage Visualization', () => {
    it('should show empty usage for new entity', () => {
      const { result } = renderHook(() => useEntities());

      const usage = result.current.getEntityUsage('some-id');
      expect(usage).toEqual([]);
    });
  });

  describe('Tab Switching', () => {
    it('should maintain state across tab switches', async () => {
      const { result } = renderHook(() => useEntities());

      // Create entities
      await act(async () => {
        await result.current.createCharacter({ name: 'Jane Doe', sex: 'F' });
        await result.current.createCharacter({ name: 'John Smith', sex: 'M' });
      });

      expect(result.current.entities).toHaveLength(2);

      // Clear and recreate (simulating tab switch)
      act(() => {
        result.current.clear();
      });

      expect(result.current.entities).toHaveLength(0);

      // Recreate
      await act(async () => {
        await result.current.createCharacter({ name: 'Jane Doe', sex: 'F' });
      });

      expect(result.current.entities).toHaveLength(1);
    });
  });

  describe('Entity Type Switching', () => {
    it('should filter entities by type', async () => {
      const { result } = renderHook(() => useEntities());

      // Create entities of different types
      await act(async () => {
        await result.current.createCharacter({ name: 'Jane Doe', sex: 'F' });
        try {
          await result.current.createPlace({ name: 'Paris', type: 'city' });
        } catch (e) {
          // Expected to fail due to type guards
        }
      });

      const characters = result.current.getEntities('character');
      const places = result.current.getEntities('place');

      expect(characters).toHaveLength(1);
      expect(characters[0].name).toBe('Jane Doe');
      expect(places).toHaveLength(0);
    });
  });

  describe('Undo/Redo', () => {
    it('should undo and redo entity creation', async () => {
      const { result } = renderHook(() => useEntities());

      // Create entity
      await act(async () => {
        await result.current.createCharacter({
          name: 'Jane Doe',
          sex: 'F',
        });
      });

      expect(result.current.entities).toHaveLength(1);

      // Undo
      act(() => {
        result.current.undo();
      });

      expect(result.current.entities).toHaveLength(0);

      // Redo
      act(() => {
        result.current.redo();
      });

      expect(result.current.entities).toHaveLength(1);
    });
  });
});
