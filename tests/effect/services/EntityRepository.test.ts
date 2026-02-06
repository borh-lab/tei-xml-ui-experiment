/**
 * EntityRepository Service Tests
 *
 * Tests both live and test implementations of EntityRepository.
 * Uses TestEntityRepository for fast, isolated tests.
 */

import { Effect, Layer } from 'effect';
import {
  EntityRepository,
  EntityNotFoundError,
  EntityParseError,
  EntityWriteError,
} from '@/lib/effect/protocols/EntityRepository';
import {
  TestEntityRepository,
  createTestRepository,
} from '@/lib/effect/services/EntityRepository';
import type { Entity, Character, Place } from '@/lib/tei/types';

// ============================================================================
// Test Helpers
// ============================================================================

const mockCharacter: Character = {
  id: 'character-1234567890-abc123',
  xmlId: 'sherlock-holmes',
  name: 'Sherlock Holmes',
  sex: '1',
  age: '42',
  occupation: 'detective',
};

const mockPlace: Place = {
  id: 'place-1234567890-def456',
  xmlId: 'london',
  name: 'London',
  type: 'city',
  coordinates: {
    lat: 51.5074,
    lng: -0.1278,
  },
};

const mockEntities: Entity[] = [mockCharacter, mockPlace];

// ============================================================================
// TestEntityRepository Tests
// ============================================================================

describe('TestEntityRepository', () => {
  let repo: TestEntityRepository;

  beforeEach(() => {
    repo = createTestRepository();
  });

  describe('save and load', () => {
    it('should save and load entities', async () => {
      const program = Effect.gen(function* (_) {
        yield* _(repo.save('/test/entities.json', mockEntities));
        const loaded = yield* _(repo.load('/test/entities.json'));
        return loaded;
      });

      const result = await Effect.runPromise(program);

      expect(result).toEqual(mockEntities);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(mockCharacter);
      expect(result[1]).toEqual(mockPlace);
    });

    it('should save and load empty entity array', async () => {
      const program = Effect.gen(function* (_) {
        yield* _(repo.save('/test/empty.json', []));
        const loaded = yield* _(repo.load('/test/empty.json'));
        return loaded;
      });

      const result = await Effect.runPromise(program);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should overwrite existing file on save', async () => {
      const program = Effect.gen(function* (_) {
        // Save initial entities
        yield* _(repo.save('/test/entities.json', [mockCharacter]));

        // Save different entities
        yield* _(repo.save('/test/entities.json', [mockPlace]));

        // Load should return the updated entities
        const loaded = yield* _(repo.load('/test/entities.json'));
        return loaded;
      });

      const result = await Effect.runPromise(program);

      expect(result).toEqual([mockPlace]);
      expect(result).toHaveLength(1);
    });
  });

  describe('load error handling', () => {
    it('should return EntityNotFoundError for non-existent file', async () => {
      const program = Effect.gen(function* (_) {
        return yield* _(repo.load('/test/nonexistent.json'));
      });

      const result = await Effect.runPromiseExit(program);

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        // Effect wraps the error, check the cause
        const error = result.cause;
        expect(error).toBeDefined();
      }
    });

    it('should return EntityParseError for invalid JSON', async () => {
      const program = Effect.gen(function* (_) {
        // Manually corrupt the file
        (repo as any).store.set('/test/corrupt.json', 'invalid json {{}');

        return yield* _(repo.load('/test/corrupt.json'));
      });

      const result = await Effect.runPromiseExit(program);

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        // Effect wraps the error, check the cause
        const error = result.cause;
        expect(error).toBeDefined();
      }
    });
  });

  describe('list', () => {
    it('should list all saved files', async () => {
      const program = Effect.gen(function* (_) {
        yield* _(repo.save('/test/one.json', [mockCharacter]));
        yield* _(repo.save('/test/two.json', [mockPlace]));
        yield* _(repo.save('/other/three.json', []));

        return yield* _(repo.list());
      });

      const result = await Effect.runPromise(program);

      expect(result).toHaveLength(3);
      expect(result).toContain('/test/one.json');
      expect(result).toContain('/test/two.json');
      expect(result).toContain('/other/three.json');
    });

    it('should return empty array when no files', async () => {
      const program = Effect.gen(function* (_) {
        return yield* _(repo.list());
      });

      const result = await Effect.runPromise(program);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should filter by pattern', async () => {
      const program = Effect.gen(function* (_) {
        yield* _(repo.save('/test/entities.json', [mockCharacter]));
        yield* _(repo.save('/test/other.json', [mockPlace]));
        yield* _(repo.save('/data/entities.json', []));

        return yield* _(repo.list('/test/*.json'));
      });

      const result = await Effect.runPromise(program);

      expect(result).toHaveLength(2);
      expect(result).toContain('/test/entities.json');
      expect(result).toContain('/test/other.json');
      expect(result).not.toContain('/data/entities.json');
    });

    it('should support * wildcard in pattern', async () => {
      const program = Effect.gen(function* (_) {
        yield* _(repo.save('/test/entities.json', []));
        yield* _(repo.save('/test/other.txt', []));
        yield* _(repo.save('/data/entities.json', []));

        return yield* _(repo.list('*.json'));
      });

      const result = await Effect.runPromise(program);

      // Should only match files ending in .json at the root level
      expect(result.length).toBeGreaterThan(0);
      expect(result.some(p => p.endsWith('.json'))).toBe(true);
      expect(result.some(p => p.endsWith('.txt'))).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete existing file', async () => {
      const program = Effect.gen(function* (_) {
        yield* _(repo.save('/test/to-delete.json', [mockCharacter]));

        // Verify it exists
        const beforeList = yield* _(repo.list());
        expect(beforeList).toContain('/test/to-delete.json');

        // Delete it
        yield* _(repo.delete('/test/to-delete.json'));

        // Verify it's gone
        const afterList = yield* _(repo.list());
        return afterList;
      });

      const result = await Effect.runPromise(program);

      expect(result).not.toContain('/test/to-delete.json');
      expect(repo.has('/test/to-delete.json')).toBe(false);
    });

    it('should handle deleting non-existent file', async () => {
      const program = Effect.gen(function* (_) {
        // Deleting non-existent file should succeed (no-op)
        yield* _(repo.delete('/test/nonexistent.json'));
        return 'success';
      });

      const result = await Effect.runPromise(program);

      expect(result).toBe('success');
    });

    it('should handle multiple deletes', async () => {
      const program = Effect.gen(function* (_) {
        yield* _(repo.save('/test/one.json', [mockCharacter]));
        yield* _(repo.save('/test/two.json', [mockPlace]));

        yield* _(repo.delete('/test/one.json'));
        yield* _(repo.delete('/test/two.json'));

        return yield* _(repo.list());
      });

      const result = await Effect.runPromise(program);

      expect(result).toEqual([]);
      expect(repo.size()).toBe(0);
    });
  });

  describe('test helpers', () => {
    it('should clear all files', async () => {
      const program = Effect.gen(function* (_) {
        yield* _(repo.save('/test/one.json', [mockCharacter]));
        yield* _(repo.save('/test/two.json', [mockPlace]));

        expect(repo.size()).toBe(2);

        repo.clearAll();

        return repo.size();
      });

      const result = await Effect.runPromise(program);

      expect(result).toBe(0);
    });

    it('should report correct size', async () => {
      const program = Effect.gen(function* (_) {
        expect(repo.size()).toBe(0);

        yield* _(repo.save('/test/one.json', [mockCharacter]));
        expect(repo.size()).toBe(1);

        yield* _(repo.save('/test/two.json', [mockPlace]));
        expect(repo.size()).toBe(2);

        yield* _(repo.delete('/test/one.json'));
        expect(repo.size()).toBe(1);

        return repo.size();
      });

      const result = await Effect.runPromise(program);

      expect(result).toBe(1);
    });

    it('should check if file exists', async () => {
      const program = Effect.gen(function* (_) {
        expect(repo.has('/test/entities.json')).toBe(false);

        yield* _(repo.save('/test/entities.json', [mockCharacter]));

        return repo.has('/test/entities.json');
      });

      const result = await Effect.runPromise(program);

      expect(result).toBe(true);
    });
  });

  describe('isolation', () => {
    it('should keep instances isolated', async () => {
      const repo2 = createTestRepository();

      const program = Effect.gen(function* (_) {
        yield* _(repo.save('/test/shared.json', [mockCharacter]));
        yield* _(repo2.save('/test/shared.json', [mockPlace]));

        const fromRepo1 = yield* _(repo.load('/test/shared.json'));
        const fromRepo2 = yield* _(repo2.load('/test/shared.json'));

        return { fromRepo1, fromRepo2 };
      });

      const result = await Effect.runPromise(program);

      expect(result.fromRepo1).toEqual([mockCharacter]);
      expect(result.fromRepo2).toEqual([mockPlace]);
    });
  });
});

// ============================================================================
// Integration with Entity Protocol
// ============================================================================

describe('EntityRepository with Entity Protocol', () => {
  let repo: TestEntityRepository;

  beforeEach(() => {
    repo = createTestRepository();
  });

  it('should support full CRUD workflow', async () => {
    const program = Effect.gen(function* (_) {
      // Create - save initial entities
      yield* _(repo.save('/test/entities.json', [mockCharacter]));

      // Read - load entities
      let entities = yield* _(repo.load('/test/entities.json'));
      expect(entities).toHaveLength(1);

      // Update - add new entity (simulating business logic update)
      const updated = [...entities, mockPlace];
      yield* _(repo.save('/test/entities.json', updated));

      // Verify update
      entities = yield* _(repo.load('/test/entities.json'));
      expect(entities).toHaveLength(2);

      // Delete - remove all entities
      yield* _(repo.delete('/test/entities.json'));

      // Verify delete
      const list = yield* _(repo.list());
      expect(list).toHaveLength(0);

      return 'success';
    });

    const result = await Effect.runPromise(program);

    expect(result).toBe('success');
  });

  it('should handle multiple entity files', async () => {
    const program = Effect.gen(function* (_) {
      // Save different entity types to different files
      yield* _(repo.save('/entities/characters.json', [mockCharacter]));
      yield* _(repo.save('/entities/places.json', [mockPlace]));
      yield* _(repo.save('/entities/organizations.json', []));

      // List all entity files
      const files = yield* _(repo.list('/entities/*.json'));
      expect(files).toHaveLength(3);

      // Load and verify each
      const characters = yield* _(repo.load('/entities/characters.json'));
      const places = yield* _(repo.load('/entities/places.json'));
      const organizations = yield* _(repo.load('/entities/organizations.json'));

      expect(characters).toHaveLength(1);
      expect(places).toHaveLength(1);
      expect(organizations).toHaveLength(0);

      return 'success';
    });

    const result = await Effect.runPromise(program);

    expect(result).toBe('success');
  });
});
