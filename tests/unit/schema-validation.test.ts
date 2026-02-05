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

  beforeEach(() => {
    // Create a fresh SchemaLoader instance for each test
    schemaLoader = new SchemaLoader();
  });

  afterEach(() => {
    // Clear schema cache between tests
    if (schemaLoader) {
      schemaLoader.clearCache();
    }
  });

  describe('progressive fallback', () => {
    it('should pass tei-all and stop there', async () => {
      // Valid TEI document with proper structure
      const content = `<?xml version="1.0"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader>
    <fileDesc>
      <titleStmt>
        <title>Test Document</title>
      </titleStmt>
      <publicationStmt>
        <publisher>Test</publisher>
      </publicationStmt>
      <sourceDesc>
        <p>Test</p>
      </sourceDesc>
    </fileDesc>
  </teiHeader>
  <text>
    <body>
      <p>Valid content</p>
    </body>
  </text>
</TEI>`;

      const result = await validateWithSchemas(content, 'test.xml', schemaLoader);

      expect(result.teiAllPass).toBe(true);
      expect(result.teiNovelPass).toBe(false);
      expect(result.teiMinimalPass).toBe(false);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail tei-all but pass tei-novel', async () => {
      // Content that fails tei-all but passes tei-novel (tei-novel is permissive)
      const content = `<?xml version="1.0"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <text><p>Content</p><custom-tag>Not in TEI</custom-tag></text>
</TEI>`;

      const result = await validateWithSchemas(content, 'test.xml', schemaLoader);

      expect(result.teiAllPass).toBe(false);
      expect(result.teiNovelPass).toBe(true);
      expect(result.teiMinimalPass).toBe(false);
    });

    it('should pass tei-novel and tei-minimal (both permissive)', async () => {
      // Content that passes both tei-novel and tei-minimal (both use <anyName/>)
      const content = `<?xml version="1.0"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <text><said who="#speaker1">Quote</said></text>
</TEI>`;

      const result = await validateWithSchemas(content, 'test.xml', schemaLoader);

      // Since tei-novel passes, it returns early (progressive fallback)
      expect(result.teiAllPass).toBe(false);
      expect(result.teiNovelPass).toBe(true);
      expect(result.teiMinimalPass).toBe(false); // Never reached due to early return
    });

    it('should fail tei-all but pass permissive schemas', async () => {
      // Content with invalid structure - fails tei-all but passes permissive schemas
      const content = `<?xml version="1.0"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <invalidRoot><p>Content</p></invalidRoot>
</TEI>`;

      const result = await validateWithSchemas(content, 'test.xml', schemaLoader);

      // tei-all is strict and will fail
      expect(result.teiAllPass).toBe(false);
      // tei-novel is permissive (<anyName/>) and will pass
      expect(result.teiNovelPass).toBe(true);
      // tei-minimal never reached due to early return
      expect(result.teiMinimalPass).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should collect errors from all attempts', async () => {
      // Content with wrong namespace - will fail all schemas
      // Even permissive schemas (tei-novel, tei-minimal) expect TEI namespace
      const content = `<?xml version="1.0"?>
<TEI xmlns="http://wrong-namespace.org/ns/1.0">
  <text><p>Content</p></text>
</TEI>`;

      const result = await validateWithSchemas(content, 'test.xml', schemaLoader);

      expect(result.teiAllPass).toBe(false);
      expect(result.teiNovelPass).toBe(false);
      expect(result.teiMinimalPass).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle timeout gracefully', async () => {
      // Mock timeout scenario - schemaLoader.validate rejects for all schemas
      const mockValidate = jest.spyOn(schemaLoader, 'validate')
        .mockRejectedValueOnce(new Error('Validation timeout'))
        .mockRejectedValueOnce(new Error('Validation timeout'))
        .mockRejectedValueOnce(new Error('Validation timeout'));

      try {
        const content = `<?xml version="1.0"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <text><p>OK</p></text>
</TEI>`;

        const result = await validateWithSchemas(content, 'test.xml', schemaLoader);

        expect(result.teiAllPass).toBe(false);
        expect(result.teiNovelPass).toBe(false);
        expect(result.teiMinimalPass).toBe(false);
        expect(result.errors.length).toBe(0); // Errors are caught and logged, not returned
      } finally {
        // Ensure mock is always restored
        mockValidate.mockRestore();
      }
    });
  });
});
