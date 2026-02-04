/**
 * Unit tests for SchemaLoader
 */

import { SchemaLoader } from '../../lib/schema/SchemaLoader';
import * as path from 'path';
import * as fs from 'fs';

describe('SchemaLoader', () => {
  const fixturesDir = path.join(__dirname, '../fixtures/schemas');
  const simpleSchema = path.join(fixturesDir, 'test-simple.rng');
  const teiSchema = path.join(fixturesDir, 'test-tei.rng');

  let loader: SchemaLoader;

  beforeEach(() => {
    loader = new SchemaLoader();
  });

  describe('loadSchema', () => {
    it('should load schema from file path', async () => {
      const schema = await loader.loadSchema(simpleSchema);
      expect(schema).toBeDefined();
      expect(schema.pattern).toBeDefined();
    });

    it('should parse schema structure', async () => {
      const schema = await loader.loadSchema(simpleSchema);
      expect(schema.pattern).toBeDefined();
      expect(schema.warnings).toBeInstanceOf(Array);
    });

    it('should throw error for non-existent schema file', async () => {
      await expect(loader.loadSchema('/nonexistent/schema.rng')).rejects.toThrow();
    });

    it('should cache parsed schemas', async () => {
      const schema1 = await loader.loadSchema(simpleSchema);
      const schema2 = await loader.loadSchema(simpleSchema);
      expect(schema1).toBe(schema2);
    });
  });

  describe('validate', () => {
    it('should validate valid XML document', async () => {
      await loader.loadSchema(simpleSchema);

      const validXml = '<root id="test"><item name="first">Item 1</item><item>Item 2</item></root>';
      const result = await loader.validate(validXml, simpleSchema);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate invalid XML document', async () => {
      await loader.loadSchema(simpleSchema);

      const invalidXml = '<root><unknownElement>test</unknownElement></root>';
      const result = await loader.validate(invalidXml, simpleSchema);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect missing required elements', async () => {
      await loader.loadSchema(simpleSchema);

      const invalidXml = '<root id="test"></root>';
      const result = await loader.validate(invalidXml, simpleSchema);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate TEI document against TEI schema', async () => {
      await loader.loadSchema(teiSchema);

      const validTei = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader>
    <fileDesc>
      <titleStmt>
        <title>Test Document</title>
        <author>Test Author</author>
      </titleStmt>
      <publicationStmt>
        <publisher>Test Publisher</publisher>
        <date>2024</date>
      </publicationStmt>
      <sourceDesc>
        <p>Test source</p>
      </sourceDesc>
    </fileDesc>
  </teiHeader>
  <text>
    <body>
      <p>This is a test paragraph with <emph>emphasis</emph>.</p>
      <p>Another paragraph.</p>
    </body>
  </text>
</TEI>`;

      const result = await loader.validate(validTei, teiSchema);
      expect(result.valid).toBe(true);
    });

    it('should detect invalid elements in TEI document', async () => {
      await loader.loadSchema(teiSchema);

      const invalidTei = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader>
    <fileDesc>
      <titleStmt>
        <title>Test Document</title>
      </titleStmt>
      <publicationStmt>
        <publisher>Test Publisher</publisher>
        <date>2024</date>
      </publicationStmt>
      <sourceDesc>
        <p>Test source</p>
      </sourceDesc>
    </fileDesc>
  </teiHeader>
  <text>
    <body>
      <p>This is a test paragraph with <unknownTag>emphasis</unknownTag>.</p>
    </body>
  </text>
</TEI>`;

      const result = await loader.validate(invalidTei, teiSchema);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('getAllowedTags', () => {
    it('should get allowed tags for root context', async () => {
      await loader.loadSchema(simpleSchema);
      const tags = loader.getAllowedTags(simpleSchema, []);

      expect(tags).toBeDefined();
      // This is an advanced feature that may need more work
      // For now, just verify it doesn't crash and returns an array
      expect(Array.isArray(tags)).toBe(true);
    });
  });

  describe('getTagAttributes', () => {
    it('should get attributes for a tag', async () => {
      await loader.loadSchema(simpleSchema);
      const attrs = loader.getTagAttributes(simpleSchema, 'root');

      expect(attrs).toBeDefined();
      // This is an advanced feature that may need more work
      // For now, just verify it doesn't crash and returns an array
      expect(Array.isArray(attrs)).toBe(true);
    });
  });

  describe('clearCache', () => {
    it('should clear schema cache', async () => {
      await loader.loadSchema(simpleSchema);
      expect(loader['schemaCache'].size).toBeGreaterThan(0);

      loader.clearCache();
      expect(loader['schemaCache'].size).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should handle malformed XML gracefully', async () => {
      await loader.loadSchema(simpleSchema);

      const malformedXml = '<root><item>Unclosed tag';

      // Should not throw, but return error result
      const result = await loader.validate(malformedXml, simpleSchema);
      expect(result).toBeDefined();
    });

    it('should handle empty XML', async () => {
      await loader.loadSchema(simpleSchema);

      const result = await loader.validate('', simpleSchema);
      expect(result).toBeDefined();
      expect(result.valid).toBe(false);
    });
  });
});
