/**
 * Entity Management Protocol (Task 6.1)
 *
 * Pure functions for entity CRUD operations.
 * Validates entity ID uniqueness and data integrity.
 */

import type { Result } from './Result';
import { success, failure, isSuccess, isFailure } from './Result';
import type { Entity, Character, Place, Organization } from '@/lib/tei/types';
import type { EntityDelta, EntityType } from '@/lib/values/EntityDelta';
import { isCharacter, isPlace, isOrganization } from '@/lib/tei/types';

/**
 * Apply entity delta to entity collection
 *
 * This protocol:
 * 1. Validates the operation based on entity type
 * 2. Validates entity ID uniqueness for create operations
 * 3. Performs the appropriate operation (create/update/delete)
 * 4. Returns Result<Entity[]> with the updated collection
 *
 * Operations:
 * - create: Append entity to collection (validates ID uniqueness)
 * - update: Replace entity with matching ID
 * - delete: Remove entity with matching ID
 */
export function applyEntityDelta(
  entities: readonly Entity[],
  delta: EntityDelta
): Result<Entity[]> {
  try {
    const { operation, entityType, entity } = delta;

    // Validate entity matches the declared type
    const typeValidation = validateEntityType(entity, entityType);
    if (isFailure(typeValidation)) {
      return typeValidation;
    }

    switch (operation) {
      case 'create':
        return handleCreate(entities, entity);
      case 'update':
        return handleUpdate(entities, entity);
      case 'delete':
        return handleDelete(entities, entity);
      default:
        return failure(
          'UNKNOWN_OPERATION',
          `Unknown entity operation: ${(operation as string)}`,
          false
        );
    }
  } catch (error) {
    return failure(
      'ENTITY_ERROR',
      error instanceof Error ? error.message : 'Unknown error applying entity delta',
      false,
      { operation: delta.operation, entityType: delta.entityType }
    );
  }
}

/**
 * Validate that entity matches the declared type
 */
function validateEntityType(entity: Entity, entityType: EntityType): Result<void> {
  switch (entityType) {
    case 'character':
      if (!isCharacter(entity)) {
        return failure(
          'TYPE_MISMATCH',
          'Entity is not a character',
          false,
          { expected: 'character', hasSex: 'sex' in entity }
        );
      }
      break;
    case 'place':
      if (!isPlace(entity)) {
        return failure(
          'TYPE_MISMATCH',
          'Entity is not a place',
          false,
          { expected: 'place', hasCoordinates: 'coordinates' in entity }
        );
      }
      break;
    case 'organization':
      if (!isOrganization(entity)) {
        return failure(
          'TYPE_MISMATCH',
          'Entity is not an organization',
          false,
          {
            expected: 'organization',
            hasSex: 'sex' in entity,
            hasCoordinates: 'coordinates' in entity,
            hasType: 'type' in entity
          }
        );
      }
      break;
    default:
      return failure(
        'UNKNOWN_ENTITY_TYPE',
        `Unknown entity type: ${entityType}`,
        false
      );
  }

  return success(undefined);
}

/**
 * Handle create operation
 *
 * Validates that the entity ID is unique before adding to collection.
 */
function handleCreate(entities: readonly Entity[], entity: Entity): Result<Entity[]> {
  // Check for ID uniqueness
  const idExists = entities.some(e => e.id === entity.id);

  if (idExists) {
    return failure(
      'DUPLICATE_ID',
      `Entity with ID "${entity.id}" already exists`,
      true,
      { entityId: entity.id }
    );
  }

  // Append entity to collection
  return success([...entities, entity]);
}

/**
 * Handle update operation
 *
 * Replaces entity with matching ID in the collection.
 */
function handleUpdate(entities: readonly Entity[], entity: Entity): Result<Entity[]> {
  // Find entity index
  const index = entities.findIndex(e => e.id === entity.id);

  if (index === -1) {
    return failure(
      'ENTITY_NOT_FOUND',
      `Entity with ID "${entity.id}" not found for update`,
      true,
      { entityId: entity.id }
    );
  }

  // Replace entity at index
  const updated = [...entities];
  updated[index] = entity;

  return success(updated);
}

/**
 * Handle delete operation
 *
 * Removes entity with matching ID from the collection.
 */
function handleDelete(entities: readonly Entity[], entity: Entity): Result<Entity[]> {
  // Find entity index
  const index = entities.findIndex(e => e.id === entity.id);

  if (index === -1) {
    return failure(
      'ENTITY_NOT_FOUND',
      `Entity with ID "${entity.id}" not found for deletion`,
      true,
      { entityId: entity.id }
    );
  }

  // Remove entity from collection
  const updated = entities.filter(e => e.id !== entity.id);

  return success(updated);
}

/**
 * Get entity by ID from collection
 */
export function getEntityById(
  entities: readonly Entity[],
  id: string
): Entity | undefined {
  return entities.find(e => e.id === id);
}

/**
 * Filter entities by type
 */
export function getEntitiesByType(
  entities: readonly Entity[],
  entityType: EntityType
): Entity[] {
  switch (entityType) {
    case 'character':
      return entities.filter(isCharacter);
    case 'place':
      return entities.filter(isPlace);
    case 'organization':
      return entities.filter(isOrganization);
    default:
      return [];
  }
}

/**
 * Validate entity data
 *
 * Checks that required fields are present and valid.
 */
export function validateEntity(entity: Entity): Result<void> {
  // Check required fields
  if (!entity.id || entity.id.trim() === '') {
    return failure(
      'INVALID_ENTITY',
      'Entity ID is required',
      true
    );
  }

  if (!entity.xmlId || entity.xmlId.trim() === '') {
    return failure(
      'INVALID_ENTITY',
      'Entity xmlId is required',
      true
    );
  }

  if (!entity.name || entity.name.trim() === '') {
    return failure(
      'INVALID_ENTITY',
      'Entity name is required',
      true
    );
  }

  return success(undefined);
}

/**
 * Generate unique entity ID
 */
export function generateEntityId(entityType: EntityType): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `${entityType}-${timestamp}-${random}`;
}

/**
 * Generate xmlId from name
 *
 * Creates a URL-safe xmlId from entity name.
 */
export function generateXmlId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
