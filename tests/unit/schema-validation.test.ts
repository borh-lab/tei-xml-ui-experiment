// @ts-nocheck
/**
 * @jest-environment node
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { validateWithSchemas } from '../../scripts/corpus-utils';
import { SchemaLoader } from '../../lib/schema/SchemaLoader';

describe('validateWithSchemas', () => {
  let schemaLoader: SchemaLoader;
  const fixturesDir = join(__dirname, '..', '__fixtures__');

  beforeAll(() => {
    schemaLoader = new SchemaLoader();
  });

  describe('progressive fallback', () => {
    it('should pass tei-all and stop there', async () => {
      const content = `
        <?xml version="1.0"?>
        <TEI xmlns="http://www.tei-c.org/ns/1.0">
          <text><p>Valid content</p></text>
        </TEI>
      `;

      const result = await validateWithSchemas(content, 'test.xml', schemaLoader);

      expect(result.teiAllPass).toBe(true);
      expect(result.teiNovelPass).toBe(false);
      expect(result.teiMinimalPass).toBe(false);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail tei-all but pass tei-novel', async () => {
      // Content that fails tei-all but passes tei-novel
      const content = `
        <?xml version="1.0"?>
        <TEI xmlns="http://www.tei-c.org/ns/1.0">
          <text><p>Content</p><custom-tag>Not in TEI</custom-tag></text>
        </TEI>
      `;

      const result = await validateWithSchemas(content, 'test.xml', schemaLoader);

      expect(result.teiAllPass).toBe(false);
      expect(result.teiNovelPass).toBe(true);
      expect(result.teiMinimalPass).toBe(false);
    });

    it('should only pass tei-minimal', async () => {
      // Content that only passes minimal schema
      const content = `
        <?xml version="1.0"?>
        <TEI xmlns="http://www.tei-c.org/ns/1.0">
          <text><said who="#speaker1">Quote</said></text>
        </TEI>
      `;

      const result = await validateWithSchemas(content, 'test.xml', schemaLoader);

      expect(result.teiAllPass).toBe(false);
      expect(result.teiNovelPass).toBe(false);
      expect(result.teiMinimalPass).toBe(true);
    });

    it('should fail all schemas', async () => {
      // Severely invalid TEI
      const content = `
        <?xml version="1.0"?>
        <TEI xmlns="http://www.tei-c.org/ns/1.0">
          <invalidRoot><p>Content</p></invalidRoot>
        </TEI>
      `;

      const result = await validateWithSchemas(content, 'test.xml', schemaLoader);

      expect(result.teiAllPass).toBe(false);
      expect(result.teiNovelPass).toBe(false);
      expect(result.teiMinimalPass).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('should collect errors from all attempts', async () => {
      const content = '<TEI xmlns="http://www.tei-c.org/ns/1.0"><invalidElement/></TEI>';

      const result = await validateWithSchemas(content, 'test.xml', schemaLoader);

      expect(result.teiAllPass).toBe(false);
      expect(result.teiNovelPass).toBe(false);
      expect(result.teiMinimalPass).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle timeout gracefully', async () => {
      // Mock timeout scenario
      jest.spyOn(schemaLoader, 'validate').mockRejectedValueOnce(
        new Error('Validation timeout')
      );

      const content = '<TEI xmlns="http://www.tei-c.org/ns/1.0"><text><p>OK</p></text></TEI>';

      const result = await validateWithSchemas(content, 'test.xml', schemaLoader);

      expect(result.teiAllPass).toBe(false);
      expect(result.teiNovelPass).toBe(false);
      expect(result.teiMinimalPass).toBe(false);
    });
  });
});
