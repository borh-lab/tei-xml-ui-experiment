import type { Entity } from '@/lib/tei/types';

export type EntityOperation = 'create' | 'update' | 'delete';
export type EntityType = 'character' | 'place' | 'organization';

export interface EntityDelta {
  readonly operation: EntityOperation;
  readonly entityType: EntityType;
  readonly entity: Entity;
  readonly timestamp: number;
}

export function createEntityDelta(
  operation: EntityOperation,
  entityType: EntityType,
  entity: Entity,
  timestamp: number = Date.now()
): EntityDelta {
  return { operation, entityType, entity, timestamp };
}

export function createCreateDelta(entityType: EntityType, entity: Entity): EntityDelta {
  return createEntityDelta('create', entityType, entity);
}

export function createUpdateDelta(entityType: EntityType, entity: Entity): EntityDelta {
  return createEntityDelta('update', entityType, entity);
}

export function createDeleteDelta(entityType: EntityType, entity: Entity): EntityDelta {
  return createEntityDelta('delete', entityType, entity);
}

export function isCreate(delta: EntityDelta): boolean {
  return delta.operation === 'create';
}

export function isUpdate(delta: EntityDelta): boolean {
  return delta.operation === 'update';
}

export function isDelete(delta: EntityDelta): boolean {
  return delta.operation === 'delete';
}
