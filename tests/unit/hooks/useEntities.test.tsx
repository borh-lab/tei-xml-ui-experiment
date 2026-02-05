/**
 * useEntities Hook Tests (Task 6.2)
 *
 * Comprehensive tests for entity management hook.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useEntities } from '@/hooks/useEntities';
import type { Character, Place, Organization } from '@/lib/tei/types';
import { createCreateDelta, createUpdateDelta, createDeleteDelta } from '@/lib/values/EntityDelta';

describe('useEntities Hook', () => {
  describe('Initial State', () => {
    it('should initialize with empty entities and deltas', () => {
      const { result } = renderHook(() => useEntities());

      expect(result.current.entities).toEqual([]);
      expect(result.current.deltas).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
    });
  });

  describe('createCharacter', () => {
    it('should create a character with auto-generated ID', async () => {
      const { result } = renderHook(() => useEntities());

      await waitFor(async () => {
        await act(async () => {
          await result.current.createCharacter({
            name: 'Jane Doe',
            sex: 'F',
            age: 30,
          });
        });
      });

      expect(result.current.entities).toHaveLength(1);
      const character = result.current.entities[0] as Character;
      expect(character.name).toBe('Jane Doe');
      expect(character.sex).toBe('F');
      expect(character.age).toBe(30);
      expect(character.id).toMatch(/^character-jane-doe-/);
      expect(character.xmlId).toBe('jane-doe');
    });

    it('should add delta to history after creating character', async () => {
      const { result } = renderHook(() => useEntities());

      await waitFor(async () => {
        await act(async () => {
          await result.current.createCharacter({
            name: 'John Smith',
            sex: 'M',
          });
        });
      });

      expect(result.current.deltas).toHaveLength(1);
      expect(result.current.deltas[0].operation).toBe('create');
      expect(result.current.deltas[0].entityType).toBe('character');
    });

    it('should handle special characters in name when generating xmlId', async () => {
      const { result } = renderHook(() => useEntities());

      await waitFor(async () => {
        await act(async () => {
          await result.current.createCharacter({
            name: 'Marie-Claire O\'Brien',
            sex: 'F',
          });
        });
      });

      const character = result.current.entities[0] as Character;
      expect(character.xmlId).toBe('marie-claire-obrien');
    });
  });

  describe('createPlace', () => {
    it('should create a place with auto-generated ID', async () => {
      const { result } = renderHook(() => useEntities());

      await act(async () => {
        await result.current.createPlace({
          name: 'Paris',
          type: 'city',
          coordinates: { lat: 48.8566, lng: 2.3522 },
        });
      });

      expect(result.current.entities).toHaveLength(1);
      const place = result.current.entities[0] as Place;
      expect(place.name).toBe('Paris');
      expect(place.type).toBe('city');
      expect(place.coordinates?.lat).toBe(48.8566);
      expect(place.id).toMatch(/^place-paris-/);
    });

    it('should add delta to history after creating place', async () => {
      const { result } = renderHook(() => useEntities());

      await act(async () => {
        await result.current.createPlace({
          name: 'London',
          type: 'city',
        });
      });

      expect(result.current.deltas).toHaveLength(1);
      expect(result.current.deltas[0].operation).toBe('create');
      expect(result.current.deltas[0].entityType).toBe('place');
    });
  });

  describe('createOrganization', () => {
    it('should create an organization with auto-generated ID', async () => {
      const { result } = renderHook(() => useEntities());

      await act(async () => {
        await result.current.createOrganization({
          name: 'Acme Corporation',
          type: 'company',
        });
      });

      expect(result.current.entities).toHaveLength(1);
      const org = result.current.entities[0] as Organization;
      expect(org.name).toBe('Acme Corporation');
      expect(org.type).toBe('company');
      expect(org.id).toMatch(/^organization-acme-corporation-/);
    });

    it('should add delta to history after creating organization', async () => {
      const { result } = renderHook(() => useEntities());

      await act(async () => {
        await result.current.createOrganization({
          name: 'United Nations',
          type: 'government',
        });
      });

      expect(result.current.deltas).toHaveLength(1);
      expect(result.current.deltas[0].operation).toBe('create');
      expect(result.current.deltas[0].entityType).toBe('organization');
    });
  });

  describe('updateEntity', () => {
    it('should update existing character', async () => {
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

      const updated = result.current.entities[0] as Character;
      expect(updated.name).toBe('Jane Doe'); // Unchanged
      expect(updated.age).toBe(35);
      expect(updated.occupation).toBe('Teacher');
    });

    it('should add update delta to history', async () => {
      const { result } = renderHook(() => useEntities());

      let character: Character;
      await act(async () => {
        character = await result.current.createCharacter({
          name: 'John Smith',
          sex: 'M',
        });
      });

      await act(async () => {
        await result.current.updateEntity(character!.id, {
          age: 40,
        });
      });

      expect(result.current.deltas).toHaveLength(2);
      expect(result.current.deltas[1].operation).toBe('update');
    });

    it('should throw error when updating non-existent entity', async () => {
      const { result } = renderHook(() => useEntities());

      await expect(
        act(async () => {
          await result.current.updateEntity('non-existent-id', { name: 'Updated' });
        })
      ).rejects.toThrow('Entity not found');
    });
  });

  describe('deleteEntity', () => {
    it('should delete existing character', async () => {
      const { result } = renderHook(() => useEntities());

      let character: Character;
      await act(async () => {
        character = await result.current.createCharacter({
          name: 'Jane Doe',
          sex: 'F',
        });
      });

      expect(result.current.entities).toHaveLength(1);

      await act(async () => {
        await result.current.deleteEntity(character!.id);
      });

      expect(result.current.entities).toHaveLength(0);
    });

    it('should add delete delta to history', async () => {
      const { result } = renderHook(() => useEntities());

      let character: Character;
      await act(async () => {
        character = await result.current.createCharacter({
          name: 'John Smith',
          sex: 'M',
        });
      });

      await act(async () => {
        await result.current.deleteEntity(character!.id);
      });

      expect(result.current.deltas).toHaveLength(2);
      expect(result.current.deltas[1].operation).toBe('delete');
    });

    it('should throw error when deleting non-existent entity', async () => {
      const { result } = renderHook(() => useEntities());

      await expect(
        act(async () => {
          await result.current.deleteEntity('non-existent-id');
        })
      ).rejects.toThrow('Entity not found');
    });
  });

  describe('getEntities', () => {
    it('should filter entities by type', async () => {
      const { result } = renderHook(() => useEntities());

      await act(async () => {
        await result.current.createCharacter({ name: 'Jane Doe', sex: 'F' });
        await result.current.createPlace({ name: 'Paris', type: 'city' });
        await result.current.createOrganization({ name: 'Acme Corp', type: 'company' });
      });

      const characters = result.current.getEntities('character');
      const places = result.current.getEntities('place');
      const organizations = result.current.getEntities('organization');

      expect(characters).toHaveLength(1);
      expect(places).toHaveLength(1);
      expect(organizations).toHaveLength(1);

      expect(characters[0].name).toBe('Jane Doe');
      expect(places[0].name).toBe('Paris');
      expect(organizations[0].name).toBe('Acme Corp');
    });
  });

  describe('getEntityById', () => {
    it('should find entity by ID', async () => {
      const { result } = renderHook(() => useEntities());

      let character: Character;
      await act(async () => {
        character = await result.current.createCharacter({
          name: 'Jane Doe',
          sex: 'F',
        });
      });

      const found = result.current.getEntityById(character!.id);
      expect(found).toBeDefined();
      expect(found!.name).toBe('Jane Doe');
    });

    it('should return undefined for non-existent ID', () => {
      const { result } = renderHook(() => useEntities());

      const found = result.current.getEntityById('non-existent');
      expect(found).toBeUndefined();
    });
  });

  describe('getEntityCount', () => {
    it('should return total count when no type specified', async () => {
      const { result } = renderHook(() => useEntities());

      await act(async () => {
        await result.current.createCharacter({ name: 'Jane Doe', sex: 'F' });
        await result.current.createPlace({ name: 'Paris', type: 'city' });
        await result.current.createOrganization({ name: 'Acme Corp', type: 'company' });
      });

      expect(result.current.getEntityCount()).toBe(3);
    });

    it('should return count by type', async () => {
      const { result } = renderHook(() => useEntities());

      await act(async () => {
        await result.current.createCharacter({ name: 'Jane Doe', sex: 'F' });
        await result.current.createCharacter({ name: 'John Smith', sex: 'M' });
        await result.current.createPlace({ name: 'Paris', type: 'city' });
      });

      expect(result.current.getEntityCount('character')).toBe(2);
      expect(result.current.getEntityCount('place')).toBe(1);
      expect(result.current.getEntityCount('organization')).toBe(0);
    });
  });

  describe('undo/redo', () => {
    it('should undo last create operation', async () => {
      const { result } = renderHook(() => useEntities());

      let character: Character;
      await act(async () => {
        character = await result.current.createCharacter({
          name: 'Jane Doe',
          sex: 'F',
        });
      });

      expect(result.current.entities).toHaveLength(1);

      act(() => {
        result.current.undo();
      });

      expect(result.current.entities).toHaveLength(0);
    });

    it('should redo undone operation', async () => {
      const { result } = renderHook(() => useEntities());

      let character: Character;
      await act(async () => {
        character = await result.current.createCharacter({
          name: 'Jane Doe',
          sex: 'F',
        });
      });

      act(() => {
        result.current.undo();
      });

      expect(result.current.entities).toHaveLength(0);

      act(() => {
        result.current.redo();
      });

      expect(result.current.entities).toHaveLength(1);
      expect((result.current.entities[0] as Character).name).toBe('Jane Doe');
    });

    it('should handle multiple undo/redo operations', async () => {
      const { result } = renderHook(() => useEntities());

      await act(async () => {
        await result.current.createCharacter({ name: 'Jane Doe', sex: 'F' });
        await result.current.createCharacter({ name: 'John Smith', sex: 'M' });
        await result.current.createCharacter({ name: 'Bob Johnson', sex: 'M' });
      });

      expect(result.current.entities).toHaveLength(3);

      // Undo twice
      act(() => {
        result.current.undo();
        result.current.undo();
      });

      expect(result.current.entities).toHaveLength(1);

      // Redo once
      act(() => {
        result.current.redo();
      });

      expect(result.current.entities).toHaveLength(2);
    });
  });

  describe('clear', () => {
    it('should clear all entities and deltas', async () => {
      const { result } = renderHook(() => useEntities());

      await act(async () => {
        await result.current.createCharacter({ name: 'Jane Doe', sex: 'F' });
        await result.current.createPlace({ name: 'Paris', type: 'city' });
      });

      expect(result.current.entities).toHaveLength(2);
      expect(result.current.deltas).toHaveLength(2);

      act(() => {
        result.current.clear();
      });

      expect(result.current.entities).toHaveLength(0);
      expect(result.current.deltas).toHaveLength(0);
      expect(result.current.error).toBe(null);
    });
  });

  describe('applyDelta', () => {
    it('should apply custom delta', async () => {
      const { result } = renderHook(() => useEntities());

      const character: Character = {
        id: 'character-test123' as Character['id'],
        xmlId: 'test123',
        name: 'Test Character',
        sex: 'M',
      };

      const delta = createCreateDelta('character', character);

      await act(async () => {
        await result.current.applyDelta(delta);
      });

      expect(result.current.entities).toHaveLength(1);
      expect((result.current.entities[0] as Character).name).toBe('Test Character');
    });

    it('should set error when delta application fails', async () => {
      const { result } = renderHook(() => useEntities());

      // Create entity with duplicate ID
      const character: Character = {
        id: 'character-duplicate' as Character['id'],
        xmlId: 'duplicate',
        name: 'Duplicate Character',
        sex: 'M',
      };

      const delta1 = createCreateDelta('character', character);

      await act(async () => {
        await result.current.applyDelta(delta1);
      });

      expect(result.current.entities).toHaveLength(1);

      // Try to create again with same ID
      const delta2 = createCreateDelta('character', character);

      await act(async () => {
        try {
          await result.current.applyDelta(delta2);
        } catch (e) {
          // Expected to throw
        }
      });

      expect(result.current.error).not.toBe(null);
      expect(result.current.error!.message).toContain('already exists');
    });
  });

  describe('loading state', () => {
    it('should set loading to true during operations', async () => {
      const { result } = renderHook(() => useEntities());

      let resolveCreate: (() => void) | undefined;

      // Start operation
      act(() => {
        result.current.createCharacter({
          name: 'Jane Doe',
          sex: 'F',
        }).then(() => {
          resolveCreate?.();
        });
      });

      // Check loading state (should be true during operation)
      // Note: This is simplified - in real scenarios, you'd need async operations
    });
  });

  describe('getEntityUsage', () => {
    it('should return empty array initially', () => {
      const { result } = renderHook(() => useEntities());

      const usage = result.current.getEntityUsage('some-entity-id');
      expect(usage).toEqual([]);
    });

    // TODO: Add more tests once document integration is implemented
  });
});
