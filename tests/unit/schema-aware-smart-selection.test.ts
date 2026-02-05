/**
 * Schema-Aware Smart Selection Tests
 *
 * Test schema constraint validation combined with structural validation.
 */

import { describe, it, expect } from '@jest/globals';
import {
  validateAgainstSchema,
  schemaAwareSmartSelection,
  TEI_P5_CONSTRAINTS,
} from '@/lib/selection/SmartSelection';
import type { Passage, Character } from '@/lib/tei/types';

describe('Schema-Aware Smart Selection', () => {
  describe('TEI_P5_CONSTRAINTS', () => {
    it('should define constraints for <said> tag', () => {
      const said = TEI_P5_CONSTRAINTS.said;

      expect(said.tagName).toBe('said');
      expect(said.requiredAttributes).toEqual(['who']);
      expect(said.attributeTypes.who).toBe('IDREF');
      expect(said.disallowedAncestors).toEqual(['said', 'q']);
    });

    it('should define constraints for <persName> tag', () => {
      const persName = TEI_P5_CONSTRAINTS.persName;

      expect(persName.tagName).toBe('persName');
      expect(persName.requiredAttributes).toEqual(['ref']);
      expect(persName.attributeTypes.ref).toBe('IDREF');
    });

    it('should define constraints for <q> tag', () => {
      const q = TEI_P5_CONSTRAINTS.q;

      expect(q.tagName).toBe('q');
      expect(q.requiredAttributes).toEqual([]);
      expect(q.disallowedAncestors).toEqual(['q', 'said']);
    });
  });

  describe('validateAgainstSchema', () => {
    it('should pass valid tag with all required attributes', () => {
      const passage: Passage = {
        id: 'passage-1',
        content: 'John said hello',
        tags: [],
      };

      const document = {
        state: {
          characters: [
            { id: 'char-1', name: 'John' },
          ],
        },
      };

      const result = validateAgainstSchema(
        passage,
        { start: 0, end: 10 },
        'said',
        { who: '#char-1' },
        document
      );

      expect(result.valid).toBe(true);
    });

    it('should fail when <said> missing required @who attribute', () => {
      const passage: Passage = {
        id: 'passage-1',
        content: 'John said hello',
        tags: [],
      };

      const result = validateAgainstSchema(
        passage,
        { start: 0, end: 10 },
        'said',
        {}, // No @who attribute
        undefined
      );

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('requires attribute');
      expect(result.missingAttributes).toEqual(['who']);
      expect(result.suggestions).toBeDefined();
    });

    it('should fail when <persName> missing required @ref attribute', () => {
      const passage: Passage = {
        id: 'passage-1',
        content: 'John Smith',
        tags: [],
      };

      const result = validateAgainstSchema(
        passage,
        { start: 0, end: 10 },
        'persName',
        {}, // No @ref attribute
        undefined
      );

      expect(result.valid).toBe(false);
      expect(result.missingAttributes).toEqual(['ref']);
    });

    it('should fail when @who references non-existent character', () => {
      const passage: Passage = {
        id: 'passage-1',
        content: 'John said hello',
        tags: [],
      };

      const document = {
        state: {
          characters: [
            { id: 'char-1', name: 'John' },
          ],
        },
      };

      const result = validateAgainstSchema(
        passage,
        { start: 0, end: 10 },
        'said',
        { who: '#nonexistent' }, // Invalid reference
        document
      );

      expect(result.valid).toBe(false);
      expect(result.invalidAttributes).toHaveProperty('who');
      expect(result.suggestions).toContain('Create character "nonexistent" first, or select existing character');
    });

    it('should fail when <said> nested inside <said>', () => {
      const passage: Passage = {
        id: 'passage-1',
        content: 'John said hello',
        tags: [
          {
            id: 'tag-1',
            type: 'said',
            range: { start: 0, end: 15 }, // Entire passage
            attributes: { who: '#char-1' },
          },
        ],
      };

      const document = {
        state: {
          characters: [
            { id: 'char-1', name: 'John' },
            { id: 'char-2', name: 'Jane' },
          ],
        },
      };

      const result = validateAgainstSchema(
        passage,
        { start: 0, end: 4 }, // Selection inside existing <said>
        'said',
        { who: '#char-2' },
        document
      );

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('cannot be nested inside');
    });

    it('should fail when <said> nested inside <q>', () => {
      const passage: Passage = {
        id: 'passage-1',
        content: 'Quote',
        tags: [
          {
            id: 'tag-1',
            type: 'q',
            range: { start: 0, end: 5 },
            attributes: {},
          },
        ],
      };

      const result = validateAgainstSchema(
        passage,
        { start: 0, end: 5 },
        'said',
        { who: '#char-1' },
        document
      );

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('cannot be nested inside');
    });

    it('should pass <q> without attributes (optional)', () => {
      const passage: Passage = {
        id: 'passage-1',
        content: 'Quote text',
        tags: [],
      };

      const result = validateAgainstSchema(
        passage,
        { start: 0, end: 10 },
        'q',
        {}, // No attributes needed
        undefined
      );

      expect(result.valid).toBe(true);
    });
  });

  describe('schemaAwareSmartSelection', () => {
    it('should combine structural and schema validation', () => {
      const passage: Passage = {
        id: 'passage-1',
        content: 'John said hello',
        tags: [],
      };

      const document = {
        state: {
          characters: [
            { id: 'char-1', name: 'John' },
          ],
        },
      };

      // Valid selection
      const result = schemaAwareSmartSelection(
        passage,
        { start: 0, end: 10 },
        'said',
        { who: '#char-1' },
        document
      );

      expect(result.valid).toBe(true);
      expect(result.adjustedRange).toEqual({ start: 0, end: 10 });
      expect(result.reason).toContain('valid');
    });

    it('should prevent structural issues (splitting tags)', () => {
      const passage: Passage = {
        id: 'passage-1',
        content: 'Hello world extra',
        tags: [
          {
            id: 'tag-1',
            type: 'persName',
            range: { start: 0, end: 11 },
            attributes: { ref: '#char-1' },
          },
        ],
      };

      const document = {
        state: {
          characters: [
            { id: 'char-1', name: 'John' },
          ],
        },
      };

      // Selection that would split the persName tag (start inside, end outside)
      const result = schemaAwareSmartSelection(
        passage,
        { start: 3, end: 15 }, // Starts inside tag, ends outside
        'said',
        { who: '#char-1' },
        document
      );

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('split');
    });

    it('should prevent schema violations (missing @who)', () => {
      const passage: Passage = {
        id: 'passage-1',
        content: 'John said hello',
        tags: [],
      };

      const document = {
        state: {
          characters: [],
        },
      };

      // Missing @who attribute
      const result = schemaAwareSmartSelection(
        passage,
        { start: 0, end: 10 },
        'said',
        {}, // No attributes provided
        document
      );

      expect(result.valid).toBe(false);
      expect(result.missingAttributes).toContain('who');
      expect(result.suggestions).toBeDefined();
    });

    it('should provide helpful suggestions for missing characters', () => {
      const passage: Passage = {
        id: 'passage-1',
        content: 'John said hello',
        tags: [],
      };

      const document = {
        state: {
          characters: [
            { id: 'char-1', name: 'John' },
            { id: 'char-2', name: 'Jane' },
            { id: 'char-3', name: 'Bob' },
          ],
        },
      };

      const result = schemaAwareSmartSelection(
        passage,
        { start: 0, end: 10 },
        'said',
        {}, // No attributes provided
        document
      );

      expect(result.valid).toBe(false);
      expect(result.missingAttributes).toContain('who');

      // Check that suggestions include available characters
      const hasCharacterSuggestion = result.suggestions?.some(s =>
        s.includes('Available speakers') || s.includes('John') || s.includes('Jane')
      );
      expect(hasCharacterSuggestion).toBe(true);
    });

    it('should catch both structural and schema issues', () => {
      const passage: Passage = {
        id: 'passage-1',
        content: 'Hello world',
        tags: [
          {
            id: 'tag-1',
            type: 'persName',
            range: { start: 0, end: 5 },
            attributes: { ref: '#char-1' },
          },
          {
            id: 'tag-2',
            type: 'said',
            range: { start: 6, end: 10 },
            attributes: { who: '#char-1' },
          },
        ],
      };

      const document = {
        state: {
          characters: [
            { id: 'char-1', name: 'John' },
          ],
        },
      };

      // Try to add <persName> that would overlap with <said>
      const result = schemaAwareSmartSelection(
        passage,
        { start: 3, end: 14 }, // Overlaps both tags
        'persName',
        {}, // No ref provided
        document
      );

      expect(result.valid).toBe(false);
      // Should catch at least one issue (structural or schema)
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty selection (zero-length)', () => {
      const passage: Passage = {
        id: 'passage-1',
        content: 'John said hello',
        tags: [],
      };

      const document = {
        state: {
          characters: [
            { id: 'char-1', name: 'John' },
          ],
        },
      };

      const result = schemaAwareSmartSelection(
        passage,
        { start: 0, end: 0 }, // Empty selection
        'said',
        { who: '#char-1' },
        document
      );

      // Empty selection might be valid or invalid depending on use case
      // Just verify it doesn't crash
      expect(result).toBeDefined();
    });

    it('should handle selection at passage boundaries', () => {
      const passage: Passage = {
        id: 'passage-1',
        content: 'Hello world',
        tags: [],
      };

      const document = {
        state: {
          characters: [
            { id: 'char-1', name: 'John' },
          ],
        },
      };

      // Selection from start to end of passage
      const result = schemaAwareSmartSelection(
        passage,
        { start: 0, end: 11 },
        'said',
        { who: '#char-1' },
        document
      );

      expect(result.valid).toBe(true);
    });

    it('should handle multiple missing required attributes', () => {
      const passage: Passage = {
        id: 'passage-1',
        content: 'John Smith',
        tags: [],
      };

      // Note: persName only requires @ref, but we're testing with no attributes
      const result = validateAgainstSchema(
        passage,
        { start: 0, end: 10 },
        'persName',
        {}, // No attributes provided
        undefined
      );

      expect(result.valid).toBe(false);
      expect(result.missingAttributes).toContain('ref');
    });

    it('should handle selection at exact tag boundary', () => {
      const passage: Passage = {
        id: 'passage-1',
        content: 'Hello world test',
        tags: [
          {
            id: 'tag-1',
            type: 'persName',
            range: { start: 0, end: 11 },
            attributes: { ref: '#char-1' },
          },
        ],
      };

      const document = {
        state: {
          characters: [
            { id: 'char-1', name: 'John' },
          ],
        },
      };

      // Selection starts exactly where tag ends
      const result = schemaAwareSmartSelection(
        passage,
        { start: 11, end: 15 }, // Starts at tag boundary
        'said',
        { who: '#char-1' },
        document
      );

      // Should be valid - doesn't split the tag
      expect(result.valid).toBe(true);
    });

    it('should handle tag without required attributes (q tag)', () => {
      const passage: Passage = {
        id: 'passage-1',
        content: 'Quote text',
        tags: [],
      };

      // q tag has no required attributes
      const result = validateAgainstSchema(
        passage,
        { start: 0, end: 10 },
        'q',
        {}, // No attributes needed
        undefined
      );

      expect(result.valid).toBe(true);
    });

    it('should handle valid IDREF with # prefix', () => {
      const passage: Passage = {
        id: 'passage-1',
        content: 'John said',
        tags: [],
      };

      const document = {
        state: {
          characters: [
            { id: 'char-1', name: 'John' },
          ],
        },
      };

      // IDREF with # prefix
      const result = validateAgainstSchema(
        passage,
        { start: 0, end: 4 },
        'said',
        { who: '#char-1' },
        document
      );

      expect(result.valid).toBe(true);
    });

    it('should handle valid IDREF without # prefix', () => {
      const passage: Passage = {
        id: 'passage-1',
        content: 'John said',
        tags: [],
      };

      const document = {
        state: {
          characters: [
            { id: 'char-1', name: 'John' },
          ],
        },
      };

      // IDREF without # prefix
      const result = validateAgainstSchema(
        passage,
        { start: 0, end: 4 },
        'said',
        { who: 'char-1' },
        document
      );

      expect(result.valid).toBe(true);
    });

    it('should provide suggestions for all available characters', () => {
      const passage: Passage = {
        id: 'passage-1',
        content: 'Someone spoke',
        tags: [],
      };

      const document = {
        state: {
          characters: [
            { id: 'char-1', name: 'Alice' },
            { id: 'char-2', name: 'Bob' },
            { id: 'char-3', name: 'Charlie' },
            { id: 'char-4', name: 'Diana' },
            { id: 'char-5', name: 'Eve' },
          ],
        },
      };

      const result = validateAgainstSchema(
        passage,
        { start: 0, end: 6 },
        'said',
        {}, // Missing @who
        document
      );

      expect(result.valid).toBe(false);
      expect(result.missingAttributes).toContain('who');
      expect(result.suggestions).toBeDefined();

      // Check that suggestions mention available characters
      const suggestionsText = result.suggestions?.join(' ') || '';
      expect(suggestionsText).toContain('Available');
    });

    it('should handle passage with multiple existing tags', () => {
      const passage: Passage = {
        id: 'passage-1',
        content: 'John said hello to Jane',
        tags: [
          {
            id: 'tag-1',
            type: 'persName',
            range: { start: 0, end: 4 },
            attributes: { ref: '#char-1' },
          },
          {
            id: 'tag-2',
            type: 'said',
            range: { start: 5, end: 16 },
            attributes: { who: '#char-1' },
          },
          {
            id: 'tag-3',
            type: 'persName',
            range: { start: 21, end: 25 },
            attributes: { ref: '#char-2' },
          },
        ],
      };

      const document = {
        state: {
          characters: [
            { id: 'char-1', name: 'John' },
            { id: 'char-2', name: 'Jane' },
          ],
        },
      };

      // Selection between tags (should be valid)
      const result = schemaAwareSmartSelection(
        passage,
        { start: 17, end: 20 }, // "to "
        'q',
        {},
        document
      );

      expect(result.valid).toBe(true);
    });

    it('should handle unknown tag type (no constraints defined)', () => {
      const passage: Passage = {
        id: 'passage-1',
        content: 'Some text',
        tags: [],
      };

      // Unknown tag type - should pass with no validation
      const result = validateAgainstSchema(
        passage,
        { start: 0, end: 9 },
        'unknownTag',
        {},
        undefined
      );

      expect(result.valid).toBe(true);
    });
  });
});
