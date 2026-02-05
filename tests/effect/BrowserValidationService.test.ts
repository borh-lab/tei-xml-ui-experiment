/**
 * ValidationService Effect Protocol Tests
 *
 * Tests for the ValidationService Effect protocol implementation
 * with browser-compatible schema loading
 */

import { describe, it, expect } from '@jest/globals';
import { Effect } from 'effect';
import { ValidationService } from '@/lib/effect';
import { BrowserValidationService } from '@/lib/effect/services/ValidationService';

// Mock browser environment
const mockWindow = typeof window !== 'undefined' ? window : ({} as Window);

describe('ValidationService (Browser)', () => {
  describe('BrowserValidationService', () => {
    it('should have all required methods', () => {
      expect(BrowserValidationService.validateDocument).toBeDefined();
      expect(BrowserValidationService.validateTEIDocument).toBeDefined();
      expect(BrowserValidationService.preloadSchema).toBeDefined();
      expect(BrowserValidationService.getAllowedTags).toBeDefined();
      expect(BrowserValidationService.getTagAttributes).toBeDefined();
      expect(BrowserValidationService.clearCache).toBeDefined();
    });

    it('should return Effect programs from all methods', () => {
      const xml = '<TEI></TEI>';
      const schemaPath = '/public/schemas/tei-minimal.rng';

      // Test validateDocument
      const validateDoc = BrowserValidationService.validateDocument(xml, schemaPath);
      expect(validateDoc).toBeDefined();
      expect(typeof validateDoc.pipe).toBe('function');

      // Test preloadSchema
      const preload = BrowserValidationService.preloadSchema(schemaPath);
      expect(preload).toBeDefined();
      expect(typeof preload.pipe).toBe('function');

      // Test getAllowedTags
      const allowedTags = BrowserValidationService.getAllowedTags(schemaPath, []);
      expect(allowedTags).toBeDefined();
      expect(typeof allowedTags.pipe).toBe('function');

      // Test getTagAttributes
      const attributes = BrowserValidationService.getTagAttributes(schemaPath, 'said');
      expect(attributes).toBeDefined();
      expect(typeof attributes.pipe).toBe('function');

      // Test clearCache
      const clear = BrowserValidationService.clearCache();
      expect(clear).toBeDefined();
      expect(typeof clear.pipe).toBe('function');
    });

    it('should validateTEIDocument with business rules', () => {
      const document = {
        state: {
          xml: '<TEI></TEI>',
          characters: [{ id: 'char1', xmlId: 'char1', name: 'Test' }],
          dialogue: [],
          passages: [],
          parsed: {},
          revision: 0,
        },
        events: [],
      };

      const schemaPath = '/public/schemas/tei-minimal.rng';
      const validateTEI = BrowserValidationService.validateTEIDocument(document, schemaPath);

      expect(validateTEI).toBeDefined();
      expect(typeof validateTEI.pipe).toBe('function');
    });
  });

  describe('ValidationService Protocol', () => {
    it('should have the correct context tag', () => {
      expect(ValidationService).toBeDefined();
      expect(typeof ValidationService.key).toBe('string');
      expect(ValidationService.key).toBe('@app/ValidationService'); // @ts-ignore
    });
  });

  describe('Error Handling', () => {
    it('should handle empty XML gracefully', async () => {
      const emptyXML = '';
      const schemaPath = '/public/schemas/tei-minimal.rng';

      const program = BrowserValidationService.validateDocument(emptyXML, schemaPath);
      const result = await Effect.runPromise(Effect.either(program));

      // Should fail with a validation error
      if (result._tag === 'Left') {
        expect(result.left).toBeInstanceOf(Error);
        expect(result.left.message).toContain('Validation failed');
      } else {
        // If it succeeded, it should report validation errors
        expect(result.right.valid).toBe(false);
        expect(result.right.errors.length).toBeGreaterThan(0);
      }
    });

    it('should handle clearCache without errors', async () => {
      const program = BrowserValidationService.clearCache();
      const result = await Effect.runPromise(program);

      expect(result).toBeUndefined();
    });
  });
});
