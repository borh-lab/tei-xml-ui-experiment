/**
 * useEntities Hook (Task 6.2)
 *
 * Manages entity collections (characters, places, organizations).
 * Provides CRUD operations via applyEntityDelta protocol.
 * Tracks delta history for undo/redo support.
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import type { Entity, Character, Place, Organization } from '@/lib/tei/types';
import type { EntityDelta } from '@/lib/values/EntityDelta';

// EntityType is a union of all entity types
type EntityType = 'character' | 'place' | 'organization';
import {
  applyEntityDelta,
  getEntityById,
  getEntitiesByType,
  validateEntity,
  generateEntityId,
  generateXmlId,
} from '@/lib/protocols/entities';

/**
 * Entity collection state
 */
interface EntityState {
  readonly entities: readonly Entity[];
  readonly deltas: readonly EntityDelta[];
}

/**
 * Hook result interface
 */
export interface UseEntitiesResult {
  /** Current entity collection */
  entities: readonly Entity[];
  /** Delta history for undo/redo */
  deltas: readonly EntityDelta[];
  /** Loading state */
  loading: boolean;
  /** Error from last operation */
  error: Error | null;
  /** Apply entity delta (create/update/delete) */
  applyDelta: (delta: EntityDelta) => Promise<void>;
  /** Get all entities of specific type */
  getEntities: (entityType: EntityType) => Entity[];
  /** Get entity by ID */
  getEntityById: (id: string) => Entity | undefined;
  /** Get count of entities by type */
  getEntityCount: (entityType?: EntityType) => number;
  /** Create new character */
  createCharacter: (character: Omit<Character, 'id' | 'xmlId'>) => Promise<Character>;
  /** Create new place */
  createPlace: (place: Omit<Place, 'id' | 'xmlId'>) => Promise<Place>;
  /** Create new organization */
  createOrganization: (org: Omit<Organization, 'id' | 'xmlId'>) => Promise<Organization>;
  /** Update existing entity */
  updateEntity: (id: string, updates: Partial<Omit<Entity, 'id' | 'xmlId'>>) => Promise<void>;
  /** Delete entity by ID */
  deleteEntity: (id: string) => Promise<void>;
  /** Undo last delta */
  undo: () => void;
  /** Redo last undone delta */
  redo: () => void;
  /** Clear all entities and deltas */
  clear: () => void;
  /** Get entity usage in document (passages where referenced) */
  getEntityUsage: (entityId: string) => EntityUsage[];
}

/**
 * Entity usage information
 */
export interface EntityUsage {
  readonly passageId: string;
  readonly passageIndex: number;
  readonly tagCount: number;
  readonly tagIds: readonly string[];
}

/**
 * useEntities Hook
 *
 * Manages entity collections with full CRUD operations.
 * Uses applyEntityDelta protocol for all mutations.
 * Maintains delta history for undo/redo support.
 *
 * @example
 * ```tsx
 * function EntityManager() {
 *   const { entities, createCharacter, getEntityCount } = useEntities();
 *
 *   const handleCreate = async () => {
 *     await createCharacter({ name: 'Jane Doe', sex: 'F' });
 *   };
 *
 *   return <div>Total: {getEntityCount('character')}</div>;
 * }
 * ```
 */
export function useEntities(): UseEntitiesResult {
  const [state, setState] = useState<EntityState>(() => ({
    entities: [],
    deltas: [],
  }));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Track undo/redo position
  const deltaPositionRef = useRef(state.deltas.length);

  /**
   * Apply entity delta to collection
   */
  const applyDelta = useCallback(async (delta: EntityDelta) => {
    setLoading(true);
    setError(null);

    try {
      // Validate entity data
      const validation = validateEntity(delta.entity);
      if (!validation.success) {
        throw new Error(validation.error?.message || 'Entity validation failed');
      }

      // Apply delta using protocol
      const result = applyEntityDelta(state.entities, delta);

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to apply entity delta');
      }

      // Update state using functional update to avoid stale closure
      setState(prevState => ({
        entities: result.value,
        deltas: [...prevState.deltas, delta],
      }));

      // Update undo position
      deltaPositionRef.current = state.deltas.length + 1;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [state.entities, state.deltas.length]);

  /**
   * Get all entities of specific type
   */
  const getEntities = useCallback((entityType: EntityType): Entity[] => {
    return getEntitiesByType(state.entities, entityType);
  }, [state.entities]);

  /**
   * Get entity by ID
   */
  const getEntityByIdCallback = useCallback((id: string): Entity | undefined => {
    return getEntityById(state.entities, id);
  }, [state.entities]);

  /**
   * Get count of entities by type
   */
  const getEntityCount = useCallback((entityType?: EntityType): number => {
    if (entityType) {
      return getEntitiesByType(state.entities, entityType).length;
    }
    return state.entities.length;
  }, [state.entities]);

  /**
   * Create new character
   */
  const createCharacter = useCallback(async (
    characterData: Omit<Character, 'id' | 'xmlId'>
  ): Promise<Character> => {
    const xmlId = generateXmlId(characterData.name);
    const id = `character-${xmlId}` as Character['id'];

    const character: Character = {
      ...characterData,
      id,
      xmlId,
    };

    const { createCreateDelta } = await import('@/lib/values/EntityDelta');
    const delta = createCreateDelta('character', character);

    await applyDelta(delta);
    return character;
  }, [applyDelta]);

  /**
   * Create new place
   */
  const createPlace = useCallback(async (
    placeData: Omit<Place, 'id' | 'xmlId'>
  ): Promise<Place> => {
    const xmlId = generateXmlId(placeData.name);
    const id = `place-${xmlId}`;

    const place: Place = {
      ...placeData,
      id,
      xmlId,
    };

    const { createCreateDelta } = await import('@/lib/values/EntityDelta');
    const delta = createCreateDelta('place', place);

    await applyDelta(delta);
    return place;
  }, [applyDelta]);

  /**
   * Create new organization
   */
  const createOrganization = useCallback(async (
    orgData: Omit<Organization, 'id' | 'xmlId'>
  ): Promise<Organization> => {
    const xmlId = generateXmlId(orgData.name);
    const id = `organization-${xmlId}`;

    const org: Organization = {
      ...orgData,
      id,
      xmlId,
    };

    const { createCreateDelta } = await import('@/lib/values/EntityDelta');
    const delta = createCreateDelta('organization', org);

    await applyDelta(delta);
    return org;
  }, [applyDelta]);

  /**
   * Update existing entity
   */
  const updateEntity = useCallback(async (
    id: string,
    updates: Partial<Omit<Entity, 'id' | 'xmlId'>>
  ): Promise<void> => {
    const entity = getEntityById(state.entities, id);
    if (!entity) {
      throw new Error(`Entity not found: ${id}`);
    }

    // Determine entity type
    let entityType: EntityType;
    if ('sex' in entity) {
      entityType = 'character';
    } else if ('coordinates' in entity) {
      entityType = 'place';
    } else {
      entityType = 'organization';
    }

    const updated: Entity = {
      ...entity,
      ...updates,
    };

    const { createUpdateDelta } = await import('@/lib/values/EntityDelta');
    const delta = createUpdateDelta(entityType, updated);

    await applyDelta(delta);
  }, [state.entities, applyDelta]);

  /**
   * Delete entity by ID
   */
  const deleteEntity = useCallback(async (id: string): Promise<void> => {
    const entity = getEntityById(state.entities, id);
    if (!entity) {
      throw new Error(`Entity not found: ${id}`);
    }

    // Determine entity type
    let entityType: EntityType;
    if ('sex' in entity) {
      entityType = 'character';
    } else if ('coordinates' in entity) {
      entityType = 'place';
    } else {
      entityType = 'organization';
    }

    const { createDeleteDelta } = await import('@/lib/values/EntityDelta');
    const delta = createDeleteDelta(entityType, entity);

    await applyDelta(delta);
  }, [state.entities, applyDelta]);

  /**
   * Undo last delta
   */
  const undo = useCallback(() => {
    setState(prevState => {
      if (deltaPositionRef.current === 0) return prevState;

      // Revert to previous state by replaying all deltas except the last one
      const deltasToReplay = prevState.deltas.slice(0, deltaPositionRef.current - 1);
      let entities: readonly Entity[] = [];

      for (const delta of deltasToReplay) {
        const result = applyEntityDelta(entities, delta);
        if (result.success) {
          entities = result.value;
        }
      }

      deltaPositionRef.current--;
      return { entities, deltas: prevState.deltas };
    });
  }, []);

  /**
   * Redo last undone delta
   */
  const redo = useCallback(() => {
    setState(prevState => {
      if (deltaPositionRef.current >= prevState.deltas.length) return prevState;

      // Apply the next delta
      const delta = prevState.deltas[deltaPositionRef.current];
      const result = applyEntityDelta(prevState.entities, delta);

      if (result.success) {
        deltaPositionRef.current++;
        return {
          entities: result.value,
          deltas: prevState.deltas,
        };
      }

      return prevState;
    });
  }, []);

  /**
   * Clear all entities and deltas
   */
  const clear = useCallback(() => {
    setState({
      entities: [],
      deltas: [],
    });
    deltaPositionRef.current = 0;
    setError(null);
  }, []);

  /**
   * Get entity usage in document
   * TODO: Implement passage/tag lookup once document integration is added
   */
  const getEntityUsage = useCallback((entityId: string): EntityUsage[] => {
    // This will be implemented when document integration is added
    // For now, return empty array
    return [];
  }, []);

  return {
    entities: state.entities,
    deltas: state.deltas,
    loading,
    error,
    applyDelta,
    getEntities,
    getEntityById: getEntityByIdCallback,
    getEntityCount,
    createCharacter,
    createPlace,
    createOrganization,
    updateEntity,
    deleteEntity,
    undo,
    redo,
    clear,
    getEntityUsage,
  };
}
