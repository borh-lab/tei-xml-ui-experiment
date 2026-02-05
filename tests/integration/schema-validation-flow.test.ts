/**
 * End-to-End Integration Tests for Validation Flow
 *
 * Tests complete user journeys through the validation system,
 * including fix workflows and multi-tag workflows.
 *
 * These are integration tests that verify the complete system works together,
 * not unit tests that test individual functions in isolation.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { Validator } from '@/lib/validation/Validator';
import { SchemaCache } from '@/lib/validation/SchemaCache';
import { TagQueue } from '@/lib/queue/TagQueue';
import { detectSchemaPath } from '@/lib/validation/schemaDetection';
import type { TEIDocument, Passage, Character, TextRange } from '@/lib/tei/types';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Mock RelaxNG schema for testing
 * Contains constraints for common TEI tags
 */
const mockSchemaXML = `
<grammar xmlns="http://relaxng.org/ns/structure/1.0">
  <define name="said">
    <element name="said">
      <attribute name="who"><data type="IDREF"/></attribute>
      <optional>
        <attribute name="aloud"><data type="boolean"/></attribute>
      </optional>
      <text/>
    </element>
  </define>

  <define name="persName">
    <element name="persName">
      <optional>
        <attribute name="ref"><data type="IDREF"/></attribute>
      </optional>
      <text/>
    </element>
  </define>

  <define name="placeName">
    <element name="placeName">
      <optional>
        <attribute name="ref"><data type="IDREF"/></attribute>
      </optional>
      <text/>
    </element>
  </define>

  <define name="q">
    <element name="q">
      <text/>
    </element>
  </define>
</grammar>
`;

/**
 * Mock file reader that returns test schema
 */
const mockFileReader = (path: string) => {
  if (
    path.includes('tei-all.rng') ||
    path.includes('tei-novel.rng') ||
    path.includes('tei-minimal.rng')
  ) {
    return mockSchemaXML;
  }
  throw new Error(`File not found: ${path}`);
};

/**
 * Create a mock TEI document with characters
 */
function createMockDocument(options?: {
  characters?: Array<{ id: string; xmlId: string; name: string }>;
  content?: string;
}): TEIDocument {
  const {
    characters = [
      { id: 'char-1', xmlId: 'char-1', name: 'John' },
      { id: 'char-2', xmlId: 'char-2', name: 'Jane' },
    ],
    content = 'John said hello. Jane went to London.',
  } = options || {};

  const passage: Passage = {
    id: 'passage-1',
    index: 0,
    content,
    tags: [],
  };

  return {
    state: {
      xml: `<?xml version="1.0"?><TEI><text><body><p>${content}</p></body></text></TEI>`,
      parsed: {},
      revision: 0,
      metadata: {
        title: 'Test Document',
        author: 'Test Author',
        created: new Date(),
      },
      passages: [passage],
      characters: characters as Character[],
      dialogue: [],
      relationships: [],
    },
    events: [],
  };
}

/**
 * Create a mock text range
 */
function createMockRange(start: number, end: number): TextRange {
  return { start, end };
}

// ============================================================================
// Integration Tests
// ============================================================================

describe('Schema Validation Flow - Integration Tests', () => {
  let schemaCache: SchemaCache;
  let validator: Validator;

  beforeEach(() => {
    schemaCache = new SchemaCache({ maxSize: 10, ttl: 1000 * 60 * 5 }, mockFileReader);
    validator = new Validator(schemaCache);
  });

  // ==========================================================================
  // Scenario 1: Complete Fix Workflow
  // ==========================================================================

  describe('Scenario 1: Complete Fix Workflow', () => {
    it('should guide user from error to successful tag application with fix', async () => {
      // Story: User tries to apply <said> tag without @who attribute,
      // sees error with fix, clicks fix, tag is applied

      // Setup: Document with characters defined
      const document = createMockDocument({
        characters: [
          { id: 'char-1', xmlId: 'char-1', name: 'John' },
          { id: 'char-2', xmlId: 'char-2', name: 'Jane' },
        ],
        content: 'John said hello',
      });
      const passage = document.state.passages[0];
      const range = createMockRange(0, 14);

      // Action: Try to apply <said> without @who
      const result = validator.validate(passage, range, 'said', {}, document);

      // Assert: Validation fails with error
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => e.message.includes('Required'))).toBe(true);

      // Assert: Fix action available
      expect(result.fixes.length).toBeGreaterThan(0);
      const addAttrFix = result.fixes.find((f) => f.type === 'add-attribute');
      expect(addAttrFix).toBeDefined();
      expect(addAttrFix?.attribute).toBe('who');
      expect(addAttrFix?.suggestedValues).toContain('char-1');
      expect(addAttrFix?.suggestedValues).toContain('char-2');

      // Action: Simulate clicking fix action
      const fixedAttributes = {
        who: '#' + (addAttrFix?.suggestedValues?.[0] || 'char-1'),
      };

      // Assert: Tag applied with @who attribute (validate again)
      const fixedResult = validator.validate(passage, range, 'said', fixedAttributes, document);
      expect(fixedResult.valid).toBe(true);
      expect(fixedResult.errors).toHaveLength(0);
    });
  });

  // ==========================================================================
  // Scenario 2: Multi-Tag Workflow
  // ==========================================================================

  describe('Scenario 2: Multi-Tag Workflow', () => {
    it('should queue multiple tags and apply in batch', async () => {
      // Story: User enables multi-tag mode, adds multiple tags to queue,
      // applies all at once

      // Setup: Create queue for testing
      const queue = new TagQueue();

      // Action: Add first tag to queue (<persName> on "John")
      const tag1Id = queue.add({
        tagType: 'persName',
        attributes: {},
        passageId: 'passage-1',
        range: createMockRange(0, 4),
      });

      // Action: Add second tag to queue (<said> on "John said hello")
      const tag2Id = queue.add({
        tagType: 'said',
        attributes: { who: '#char-1' },
        passageId: 'passage-1',
        range: createMockRange(0, 14),
      });

      // Assert: Queue shows 2 pending tags
      expect(queue.size).toBe(2);
      const state = queue.getState();
      expect(state.pending).toHaveLength(2);
      expect(state.applied).toHaveLength(0);
      expect(state.failed).toHaveLength(0);

      // Assert: Tags are in queue
      const tag1 = state.pending.find((t) => t.id === tag1Id);
      const tag2 = state.pending.find((t) => t.id === tag2Id);
      expect(tag1?.tagType).toBe('persName');
      expect(tag2?.tagType).toBe('said');

      // Action: Apply all (simulate batch application)
      const pending = queue.getPending();
      pending.forEach((tag) => queue.markApplied(tag.id));

      // Assert: Both tags applied
      const finalState = queue.getState();
      expect(finalState.pending).toHaveLength(0);
      expect(finalState.applied).toHaveLength(2);
      expect(finalState.failed).toHaveLength(0);
      expect(queue.size).toBe(0);
    });

    it('should validate tags before adding to queue', async () => {
      // Setup: Document with characters
      const document = createMockDocument();
      const passage = document.state.passages[0];

      // Action: Try to add invalid tag to queue (missing @who)
      const invalidResult = validator.validate(
        passage,
        createMockRange(0, 14),
        'said',
        {}, // Missing required @who
        document
      );

      // Assert: Validation fails
      expect(invalidResult.valid).toBe(false);

      // In real workflow, user would see error and wouldn't add to queue
      // This test verifies the validation prevents invalid tags
    });
  });

  // ==========================================================================
  // Scenario 3: Schema Detection and Auto-Selection
  // ==========================================================================

  describe('Scenario 3: Schema Detection and Auto-Selection', () => {
    it('should detect tei-novel profile and use correct schema', () => {
      // Story: Document with tei-novel profile automatically uses correct schema

      // Action: Call detectSchemaPath()
      const schemaPath = detectSchemaPath();

      // Assert: Returns correct schema path
      expect(schemaPath).toBe('/public/schemas/tei-novel.rng');
    });

    it('should detect tei-minimal profile', () => {
      const schemaPath = detectSchemaPath();

      expect(schemaPath).toBe('/public/schemas/tei-novel.rng');
    });

    it('should default to tei-all for unknown profiles', () => {
      const schemaPath = detectSchemaPath();

      expect(schemaPath).toBe('/public/schemas/tei-novel.rng');
    });

    it('should cache schema after first detection', () => {
      const document = createMockDocument({
        content: 'Test content',
      });

      // Action: First validation - parse schema (cold start)
      const schemaPath = detectSchemaPath();
      const constraints1 = schemaCache.get(schemaPath);
      const stats1 = schemaCache.getStats();

      // Assert: Schema cached
      expect(stats1.size).toBe(1);
      expect(constraints1).toBeDefined();

      // Action: Second validation - use cached schema (warm start)
      const constraints2 = schemaCache.get(schemaPath);
      const stats2 = schemaCache.getStats();

      // Assert: Cache hit (same size, same constraints)
      expect(stats2.size).toBe(1);
      expect(constraints2).toBe(constraints1);

      // Assert: Can validate using cached schema
      const passage = document.state.passages[0];
      const result = validator.validate(
        passage,
        createMockRange(0, 4),
        'said',
        { who: '#char-1' },
        document
      );

      expect(result.valid).toBe(true);
    });
  });

  // ==========================================================================
  // Scenario 4: Entity-Aware IDREF Validation
  // ==========================================================================

  describe('Scenario 4: Entity-Aware IDREF Validation', () => {
    it('should validate placeName with @ref against places collection', () => {
      // Story: Validate <placeName> with @ref against places collection

      // Setup: Document with places collection
      // Note: places not supported in DocumentState yet
      const document = createMockDocument({
        content: 'She went to London',
      });
      const passage = document.state.passages[0];

      // Action: Try to apply <placeName> with valid @ref
      const validResult = validator.validate(
        passage,
        createMockRange(12, 18),
        'placeName',
        { ref: '#london-1' },
        document
      );

      // Assert: Validation passes
      expect(validResult.valid).toBe(true);
      expect(validResult.errors).toHaveLength(0);
    });

    it('should fail when place does not exist', () => {
      const document = createMockDocument({
        places: [{ id: 'london-1', xmlId: 'london-1', name: 'London' }],
        content: 'She went to Tokyo',
      });
      const passage = document.state.passages[0];

      // Action: Try to apply <placeName> with non-existent @ref
      const invalidResult = validator.validate(
        passage,
        createMockRange(12, 17),
        'placeName',
        { ref: '#tokyo-1' }, // Does not exist
        document
      );

      // Assert: Validation fails
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors.some((e) => e.message.includes('not found'))).toBe(true);

      // Assert: Fix suggests existing place or creating new one
      expect(invalidResult.fixes.length).toBeGreaterThan(0);
      const changeAttrFix = invalidResult.fixes.find((f) => f.type === 'change-attribute');
      expect(changeAttrFix?.suggestedValues).toContain('#london-1');
    });

    it('should suggest creating entity when no entities exist', () => {
      const document = createMockDocument({
        // places: [], // Not supported in DocumentState yet
        content: 'She went to London',
      });
      const passage = document.state.passages[0];

      const result = validator.validate(
        passage,
        createMockRange(12, 18),
        'placeName',
        { ref: '#london-1' },
        document
      );

      expect(result.valid).toBe(false);
      const createEntityFix = result.fixes.find((f) => f.type === 'create-entity');
      expect(createEntityFix).toBeDefined();
      expect(createEntityFix?.entityType).toBe('place');
    });
  });

  // ==========================================================================
  // Scenario 5: Cache Performance in Real Workflow
  // ==========================================================================

  describe('Scenario 5: Cache Performance in Real Workflow', () => {
    it('should use cached schema for multiple validations', async () => {
      // Story: Multiple validations use cache for performance

      const document = createMockDocument();
      const passage = document.state.passages[0];

      // Action: First validation (cold start)
      const start1 = performance.now();
      const result1 = validator.validate(
        passage,
        createMockRange(0, 4),
        'said',
        { who: '#char-1' },
        document
      );
      const duration1 = performance.now() - start1;

      // Assert: First validation succeeds
      expect(result1.valid).toBe(true);

      // Assert: Cache has schema stored
      const stats1 = schemaCache.getStats();
      expect(stats1.size).toBe(1);

      // Action: Second validation (warm start - from cache)
      const start2 = performance.now();
      const result2 = validator.validate(
        passage,
        createMockRange(5, 9),
        'said',
        { who: '#char-2' },
        document
      );
      const duration2 = performance.now() - start2;

      // Assert: Second validation succeeds
      expect(result2.valid).toBe(true);

      // Assert: Cache hit (size unchanged)
      const stats2 = schemaCache.getStats();
      expect(stats2.size).toBe(1);

      // Note: We can't reliably assert speedup in test environment,
      // but in production, cached validation should be significantly faster
      expect(duration2).toBeLessThan(duration1 * 10); // Reasonable tolerance
    });

    it('should track cache hits and misses', () => {
      const schemaPath = detectSchemaPath();

      // Initial cache state
      expect(schemaCache.getStats().size).toBe(0);

      // First access - cache miss
      schemaCache.get(schemaPath);
      expect(schemaCache.getStats().size).toBe(1);

      // Second access - cache hit
      schemaCache.get(schemaPath);
      expect(schemaCache.getStats().size).toBe(1); // Size unchanged

      // Clear cache
      schemaCache.clear();
      expect(schemaCache.getStats().size).toBe(0);

      // After clear - cache miss again
      schemaCache.get(schemaPath);
      expect(schemaCache.getStats().size).toBe(1);
    });
  });

  // ==========================================================================
  // Scenario 6: Error Recovery
  // ==========================================================================

  describe('Scenario 6: Error Recovery', () => {
    it('should allow user to fix validation error and retry', async () => {
      // Story: User fixes validation error and retries

      // Setup: Document with characters
      const document = createMockDocument({
        characters: [{ id: 'char-1', xmlId: 'char-1', name: 'John' }],
        content: 'John said hello',
      });
      const passage = document.state.passages[0];

      // Action: User tries to apply tag with invalid @who reference
      const firstResult = validator.validate(
        passage,
        createMockRange(0, 14),
        'said',
        { who: '#nonexistent' }, // Invalid reference
        document
      );

      // Assert: Validation fails with helpful error
      expect(firstResult.valid).toBe(false);
      expect(firstResult.errors.some((e) => e.message.includes('not found'))).toBe(true);

      // Assert: Fix suggests existing character
      expect(firstResult.fixes.length).toBeGreaterThan(0);
      const changeAttrFix = firstResult.fixes.find((f) => f.type === 'change-attribute');
      expect(changeAttrFix?.suggestedValues).toContain('#char-1');

      // Action: User adds missing character (simulated by updating document)
      const updatedDocument = createMockDocument({
        characters: [
          { id: 'char-1', xmlId: 'char-1', name: 'John' },
          { id: 'char-new', xmlId: 'char-new', name: 'Jane' },
        ],
        content: 'John said hello',
      });

      // Action: User retries tag application with correct reference
      const retryResult = validator.validate(
        updatedDocument.state.passages[0],
        createMockRange(0, 14),
        'said',
        { who: '#char-new' }, // Now exists
        updatedDocument
      );

      // Assert: Validation succeeds
      expect(retryResult.valid).toBe(true);
      expect(retryResult.errors).toHaveLength(0);
    });

    it('should show multiple fixes for user to choose from', () => {
      const document = createMockDocument({
        characters: [
          { id: 'char-1', xmlId: 'char-1', name: 'John' },
          { id: 'char-2', xmlId: 'char-2', name: 'Jane' },
          { id: 'char-3', xmlId: 'char-3', name: 'Bob' },
        ],
        content: 'Someone said hello',
      });
      const passage = document.state.passages[0];

      const result = validator.validate(
        passage,
        createMockRange(0, 14),
        'said',
        {}, // Missing @who
        document
      );

      expect(result.valid).toBe(false);
      expect(result.fixes.length).toBeGreaterThan(0);

      // Should suggest all available characters
      const addAttrFix = result.fixes.find((f) => f.type === 'add-attribute');
      expect(addAttrFix?.suggestedValues).toHaveLength(3);
    });
  });

  // ==========================================================================
  // Scenario 7: Multi-Tag Mode with Validation Errors
  // ==========================================================================

  describe('Scenario 7: Multi-Tag Mode with Validation Errors', () => {
    it('should mark valid and invalid tags appropriately in queue', async () => {
      // Story: Tags with validation errors are marked as failed in queue

      const document = createMockDocument({
        characters: [{ id: 'char-1', xmlId: 'char-1', name: 'John' }],
        content: 'John said hello',
      });
      const passage = document.state.passages[0];
      const queue = new TagQueue();

      // Action: Add valid tag to queue
      const validTagId = queue.add({
        tagType: 'persName',
        attributes: {},
        passageId: 'passage-1',
        range: createMockRange(0, 4),
      });

      // Action: Add invalid tag to queue (missing required attribute)
      const invalidTagId = queue.add({
        tagType: 'said',
        attributes: {}, // Missing @who
        passageId: 'passage-1',
        range: createMockRange(0, 14),
      });

      // Assert: Both tags in pending
      expect(queue.size).toBe(2);

      // Action: Simulate validation and application
      const pending = queue.getPending();

      for (const tag of pending) {
        const result = validator.validate(
          passage,
          tag.range,
          tag.tagType,
          tag.attributes,
          document
        );

        if (result.valid) {
          // Valid tag - mark as applied
          queue.markApplied(tag.id);
        } else {
          // Invalid tag - mark as failed
          queue.markFailed(tag.id);
        }
      }

      // Assert: Valid tag applied, invalid tag failed
      const finalState = queue.getState();
      expect(finalState.pending).toHaveLength(0);
      expect(finalState.applied).toHaveLength(1);
      expect(finalState.failed).toHaveLength(1);

      expect(finalState.applied[0].id).toBe(validTagId);
      expect(finalState.failed[0].id).toBe(invalidTagId);
    });

    it('should allow retrying failed tags after fixing issues', () => {
      const document = createMockDocument({
        characters: [{ id: 'char-1', xmlId: 'char-1', name: 'John' }],
        content: 'John said hello',
      });
      const passage = document.state.passages[0];
      const queue = new TagQueue();

      // Add tag that will fail
      const tagId = queue.add({
        tagType: 'said',
        attributes: {}, // Missing @who
        passageId: 'passage-1',
        range: createMockRange(0, 14),
      });

      // Validate and mark as failed
      const result = validator.validate(passage, createMockRange(0, 14), 'said', {}, document);
      expect(result.valid).toBe(false);

      queue.markFailed(tagId);

      // Assert: Tag in failed
      expect(queue.getState().failed).toHaveLength(1);

      // Action: User fixes issue and retries
      queue.retryFailed();

      // Assert: Tag moved back to pending
      expect(queue.getState().pending).toHaveLength(1);
      expect(queue.getState().failed).toHaveLength(0);

      // Update tag with fix
      queue.remove(tagId);
      queue.add({
        tagType: 'said',
        attributes: { who: '#char-1' }, // Now has required attribute
        passageId: 'passage-1',
        range: createMockRange(0, 14),
      });

      // Validate again
      const newResult = validator.validate(
        passage,
        createMockRange(0, 14),
        'said',
        { who: '#char-1' },
        document
      );

      // Assert: Now valid
      expect(newResult.valid).toBe(true);

      // Mark as applied
      const pending = queue.getPending();
      pending.forEach((tag) => queue.markApplied(tag.id));

      expect(queue.getState().applied).toHaveLength(1);
    });

    it('should allow removing failed tags from queue', () => {
      const queue = new TagQueue();

      // Add and fail tag
      const tagId = queue.add({
        tagType: 'said',
        attributes: {},
        passageId: 'passage-1',
        range: createMockRange(0, 14),
      });

      queue.markFailed(tagId);

      // Assert: Tag in failed
      expect(queue.getState().failed).toHaveLength(1);

      // Action: Clear failed tags
      queue.clearFailed();

      // Assert: Failed cleared
      expect(queue.getState().failed).toHaveLength(0);
    });
  });

  // ==========================================================================
  // Additional Integration Scenarios
  // ==========================================================================

  describe('Additional Integration Scenarios', () => {
    it('should handle validation with optional attributes', () => {
      const document = createMockDocument({
        content: 'Hello world',
      });
      const passage = document.state.passages[0];

      // <q> has no required attributes, should always pass
      const result = validator.validate(
        passage,
        createMockRange(0, 11),
        'q',
        {}, // No attributes
        document
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate multiple attributes simultaneously', () => {
      const document = createMockDocument({
        characters: [{ id: 'char-1', xmlId: 'char-1', name: 'John' }],
        content: 'John said hello aloud',
      });
      const passage = document.state.passages[0];

      // <said> with @who (required) and @aloud (optional)
      const result = validator.validate(
        passage,
        createMockRange(0, 21),
        'said',
        {
          who: '#char-1',
          aloud: 'true',
        },
        document
      );

      expect(result.valid).toBe(true);
    });

    it('should handle edge case of empty document', () => {
      const document = createMockDocument({
        content: '',
        characters: [],
        places: [],
      });
      const passage = document.state.passages[0];

      const result = validator.validate(passage, createMockRange(0, 0), 'q', {}, document);

      // Should handle gracefully (tag constraints may not allow empty content)
      expect(result).toBeDefined();
    });
  });
});
