/**
 * Entity Management Protocol Tests (Task 6.1)
 *
 * Tests for:
 * - applyEntityDelta with create operation
 * - applyEntityDelta with update operation
 * - applyEntityDelta with delete operation
 * - Entity ID uniqueness validation
 * - Entity type validation
 * - Helper functions
 */

import {
  applyEntityDelta,
  getEntityById,
  getEntitiesByType,
  validateEntity,
  generateEntityId,
  generateXmlId,
} from '@/lib/protocols/entities';
import type { EntityDelta } from '@/lib/values/EntityDelta';
import { createCreateDelta, createUpdateDelta, createDeleteDelta } from '@/lib/values/EntityDelta';
import { isSuccess, isFailure } from '@/lib/protocols/Result';
import type { Character, Place, Organization } from '@/lib/tei/types';

describe('Entity Management Protocol', () => {
  describe('applyEntityDelta - Create Operation', () => {
    const mockCharacter: Character = {
      id: 'char-1',
      xmlId: 'john-doe',
      name: 'John Doe',
      sex: 'M',
    } as Character;

    it('should add entity to collection on create', () => {
      const entities: Entity[] = [];
      const delta = createCreateDelta('character', mockCharacter);

      const result = applyEntityDelta(entities, delta);

      if (!isSuccess(result)) {
        console.log('Error:', result.error);
      }
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0]).toEqual(mockCharacter);
      }
    });

    it('should validate ID uniqueness on create', () => {
      const entities: Entity[] = [mockCharacter];
      const duplicate = { ...mockCharacter, name: 'Jane Doe' };
      const delta = createCreateDelta('character', duplicate);

      const result = applyEntityDelta(entities, delta);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.code).toBe('DUPLICATE_ID');
        expect(result.error.message).toContain('already exists');
      }
    });

    it('should append multiple entities', () => {
      const entities: Entity[] = [];
      const char1: Character = { id: 'char-1', xmlId: 'john', name: 'John', sex: 'M' as const } as Character;
      const char2: Character = { id: 'char-2', xmlId: 'jane', name: 'Jane', sex: 'F' as const } as Character;

      const delta1 = createCreateDelta('character', char1);
      const delta2 = createCreateDelta('character', char2);

      const result1 = applyEntityDelta(entities, delta1);
      expect(isSuccess(result1)).toBe(true);

      const result2 = applyEntityDelta(isSuccess(result1) ? result1.value : [], delta2);

      expect(isSuccess(result2)).toBe(true);
      if (isSuccess(result2)) {
        expect(result2.value).toHaveLength(2);
      }
    });
  });

  describe('applyEntityDelta - Update Operation', () => {
    const mockCharacter: Character = {
      id: 'char-1',
      xmlId: 'john-doe',
      name: 'John Doe',
      sex: 'M',
    } as Character;

    it('should replace entity with matching ID', () => {
      const entities: Entity[] = [mockCharacter];
      const updated = { ...mockCharacter, name: 'John Smith' };
      const delta = createUpdateDelta('character', updated);

      const result = applyEntityDelta(entities, delta);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0].name).toBe('John Smith');
        expect(result.value[0].id).toBe('char-1');
      }
    });

    it('should fail if entity ID not found', () => {
      const entities: Entity[] = [mockCharacter];
      const notFound = { id: 'char-999', xmlId: 'ghost', name: 'Ghost', sex: 'M' as const } as Character;
      const delta = createUpdateDelta('character', notFound);

      const result = applyEntityDelta(entities, delta);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.code).toBe('ENTITY_NOT_FOUND');
      }
    });

    it('should preserve collection order on update', () => {
      const char1: Character = { id: 'char-1', xmlId: 'john', name: 'John', sex: 'M' as const } as Character;
      const char2: Character = { id: 'char-2', xmlId: 'jane', name: 'Jane', sex: 'F' as const } as Character;
      const char3: Character = { id: 'char-3', xmlId: 'bob', name: 'Bob', sex: 'M' as const } as Character;

      const entities: Entity[] = [char1, char2, char3];
      const updated = { ...char2, name: 'Jane Smith' };
      const delta = createUpdateDelta('character', updated);

      const result = applyEntityDelta(entities, delta);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value[0].id).toBe('char-1');
        expect(result.value[1].id).toBe('char-2');
        expect(result.value[1].name).toBe('Jane Smith');
        expect(result.value[2].id).toBe('char-3');
      }
    });
  });

  describe('applyEntityDelta - Delete Operation', () => {
    const mockCharacter: Character = {
      id: 'char-1',
      xmlId: 'john-doe',
      name: 'John Doe',
      sex: 'M',
    } as Character;

    it('should remove entity with matching ID', () => {
      const entities: Entity[] = [mockCharacter];
      const delta = createDeleteDelta('character', mockCharacter);

      const result = applyEntityDelta(entities, delta);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toHaveLength(0);
      }
    });

    it('should fail if entity ID not found', () => {
      const entities: Entity[] = [mockCharacter];
      const notFound = { id: 'char-999', xmlId: 'ghost', name: 'Ghost', sex: 'M' as const } as Character;
      const delta = createDeleteDelta('character', notFound);

      const result = applyEntityDelta(entities, delta);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.code).toBe('ENTITY_NOT_FOUND');
      }
    });

    it('should preserve other entities on delete', () => {
      const char1: Character = { id: 'char-1', xmlId: 'john', name: 'John', sex: 'M' as const } as Character;
      const char2: Character = { id: 'char-2', xmlId: 'jane', name: 'Jane', sex: 'F' as const } as Character;
      const char3: Character = { id: 'char-3', xmlId: 'bob', name: 'Bob', sex: 'M' as const } as Character;

      const entities: Entity[] = [char1, char2, char3];
      const delta = createDeleteDelta('character', char2);

      const result = applyEntityDelta(entities, delta);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toHaveLength(2);
        expect(result.value[0].id).toBe('char-1');
        expect(result.value[1].id).toBe('char-3');
      }
    });
  });

  describe('Entity Type Validation', () => {
    const mockCharacter: Character = {
      id: 'char-1',
      xmlId: 'john-doe',
      name: 'John Doe',
      sex: 'M',
    } as Character;

    const mockPlace: Place = {
      id: 'place-1',
      xmlId: 'london',
      name: 'London',
      type: 'city',
      coordinates: {
        lat: 51.5074,
        lng: -0.1278,
      },
    } as Place;

    const mockOrganization: Organization = {
      id: 'org-1',
      xmlId: 'acme-corp',
      name: 'Acme Corporation',
      type: 'company',
    } as Organization;

    it('should validate character type', () => {
      const delta = createCreateDelta('character', mockCharacter);
      const result = applyEntityDelta([], delta);
      expect(isSuccess(result)).toBe(true);
    });

    it('should validate place type', () => {
      const delta = createCreateDelta('place', mockPlace);
      const result = applyEntityDelta([], delta);
      if (!isSuccess(result)) {
        console.log('Place Error:', result.error);
        console.log('Place has coordinates?', 'coordinates' in mockPlace);
      }
      expect(isSuccess(result)).toBe(true);
    });

    it('should validate organization type', () => {
      const delta = createCreateDelta('organization', mockOrganization);
      const result = applyEntityDelta([], delta);
      expect(isSuccess(result)).toBe(true);
    });

    it('should reject type mismatch', () => {
      const delta = createCreateDelta('place', mockCharacter);
      const result = applyEntityDelta([], delta);
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.code).toBe('TYPE_MISMATCH');
      }
    });
  });

  describe('Helper Functions', () => {
    const mockCharacter: Character = {
      id: 'char-1',
      xmlId: 'john-doe',
      name: 'John Doe',
      sex: 'M',
    } as Character;

    const mockPlace: Place = {
      id: 'place-1',
      xmlId: 'london',
      name: 'London',
      type: 'city',
      coordinates: {
        lat: 51.5074,
        lng: -0.1278,
      },
    } as Place;

    describe('getEntityById', () => {
      it('should return entity if found', () => {
        const entities: Entity[] = [mockCharacter, mockPlace];
        const result = getEntityById(entities, 'char-1');
        expect(result).toEqual(mockCharacter);
      });

      it('should return undefined if not found', () => {
        const entities: Entity[] = [mockCharacter, mockPlace];
        const result = getEntityById(entities, 'char-999');
        expect(result).toBeUndefined();
      });
    });

    describe('getEntitiesByType', () => {
      it('should filter entities by type', () => {
        const entities: Entity[] = [mockCharacter, mockPlace];
        const characters = getEntitiesByType(entities, 'character');
        expect(characters).toHaveLength(1);
        expect(characters[0]).toEqual(mockCharacter);
      });

      it('should return empty array for unknown type', () => {
        const entities: Entity[] = [mockCharacter, mockPlace];
        const result = getEntitiesByType(entities, 'organization' as any);
        expect(result).toHaveLength(0);
      });
    });

    describe('validateEntity', () => {
      it('should pass valid entity', () => {
        const result = validateEntity(mockCharacter);
        expect(isSuccess(result)).toBe(true);
      });

      it('should fail if ID is missing', () => {
        const invalid = { ...mockCharacter, id: '' };
        const result = validateEntity(invalid);
        expect(isFailure(result)).toBe(true);
      });

      it('should fail if xmlId is missing', () => {
        const invalid = { ...mockCharacter, xmlId: '' };
        const result = validateEntity(invalid);
        expect(isFailure(result)).toBe(true);
      });

      it('should fail if name is missing', () => {
        const invalid = { ...mockCharacter, name: '' };
        const result = validateEntity(invalid);
        expect(isFailure(result)).toBe(true);
      });
    });

    describe('generateEntityId', () => {
      it('should generate unique IDs', () => {
        const id1 = generateEntityId('character');
        const id2 = generateEntityId('character');
        expect(id1).not.toBe(id2);
      });

      it('should include entity type prefix', () => {
        const id = generateEntityId('character');
        expect(id.startsWith('character-')).toBe(true);
      });
    });

    describe('generateXmlId', () => {
      it('should convert name to URL-safe ID', () => {
        const xmlId = generateXmlId('John Doe Jr.');
        expect(xmlId).toBe('john-doe-jr');
      });

      it('should handle special characters', () => {
        const xmlId = generateXmlId('Hello!!! World???');
        expect(xmlId).toBe('hello-world');
      });

      it('should handle multiple spaces', () => {
        const xmlId = generateXmlId('  Multiple   Spaces  ');
        expect(xmlId).toBe('multiple-spaces');
      });
    });
  });
});
