import {
  createCreateDelta,
  createUpdateDelta,
  createDeleteDelta,
  createEntityDelta,
  isCreate,
  isUpdate,
  isDelete,
} from '@/lib/values/EntityDelta';

describe('EntityDelta value', () => {
  it('should create deltas', () => {
    const entity = { id: 'char-1', type: 'character', name: 'John', attributes: {} };
    const create = createCreateDelta('character', entity);
    expect(create.operation).toBe('create');
    expect(create.entityType).toBe('character');
    expect(create.entity).toBe(entity);
    expect(create.timestamp).toBeDefined();
    expect(isCreate(create)).toBe(true);
    expect(isUpdate(create)).toBe(false);
    expect(isDelete(create)).toBe(false);
  });

  it('should create update delta', () => {
    const entity = { id: 'char-1', type: 'character', name: 'John', attributes: {} };
    const update = createUpdateDelta('character', entity);
    expect(update.operation).toBe('update');
    expect(isUpdate(update)).toBe(true);
    expect(isCreate(update)).toBe(false);
  });

  it('should create delete delta', () => {
    const entity = { id: 'char-1', type: 'character', name: 'John', attributes: {} };
    const del = createDeleteDelta('character', entity);
    expect(del.operation).toBe('delete');
    expect(isDelete(del)).toBe(true);
    expect(isUpdate(del)).toBe(false);
  });

  it('should create delta with custom timestamp', () => {
    const entity = { id: 'char-1', type: 'character', name: 'John', attributes: {} };
    const timestamp = 1234567890;
    const delta = createEntityDelta('create', 'character', entity, timestamp);
    expect(delta.timestamp).toBe(timestamp);
  });

  it('should create delta with default timestamp', () => {
    const entity = { id: 'char-1', type: 'character', name: 'John', attributes: {} };
    const before = Date.now();
    const delta = createEntityDelta('create', 'character', entity);
    const after = Date.now();
    expect(delta.timestamp).toBeGreaterThanOrEqual(before);
    expect(delta.timestamp).toBeLessThanOrEqual(after);
  });
});
