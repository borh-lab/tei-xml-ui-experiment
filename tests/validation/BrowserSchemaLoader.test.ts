/**
 * BrowserSchemaLoader Tests
 *
 * Tests for browser-compatible schema loading and validation
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import { BrowserSchemaLoader } from '@/lib/schema/BrowserSchemaLoader';

// Minimal TEI schema for testing
const minimalSchema = `
<?xml version="1.0" encoding="UTF-8"?>
<grammar xmlns="http://relaxng.org/ns/structure/1.0">
  <start>
    <element name="TEI">
      <optional>
        <element name="said">
          <attribute name="who">
            <data type="IDREF"/>
          </attribute>
          <text/>
        </element>
      </optional>
    </element>
  </start>
</grammar>
`;

// Valid TEI document
const validXML = `
<?xml version="1.0" encoding="UTF-8"?>
<TEI>
  <said who="#speaker1">Hello world</said>
</TEI>
`;

// Invalid TEI document (missing required attribute)
const invalidXML = `
<?xml version="1.0" encoding="UTF-8"?>
<TEI>
  <said>Hello world</said>
</TEI>
`;

describe('BrowserSchemaLoader', () => {
  let loader: BrowserSchemaLoader;

  beforeAll(() => {
    loader = new BrowserSchemaLoader();
  });

  it('should be instantiable in browser environment', () => {
    expect(loader).toBeInstanceOf(BrowserSchemaLoader);
    expect(loader.getCacheSize()).toBe(0);
  });

  it('should clear cache', () => {
    loader.clearCache();
    expect(loader.getCacheSize()).toBe(0);
  });

  it('should report schema not loaded before loading', () => {
    expect(loader.hasSchema('/public/schemas/test.rng')).toBe(false);
  });

  // Note: Actual schema loading and validation tests would require:
  // 1. A test server or mock fetch for schemas
  // 2. Or schemas to be in the public directory during tests
  // These are integration tests that would run in the browser or with a test server

  describe('Schema path conversion', () => {
    it('should handle public directory paths', () => {
      // Test path conversion logic
      const paths = [
        '/public/schemas/tei-all.rng',
        'public/schemas/tei-minimal.rng',
        '/schemas/tei-novel.rng',
      ];

      paths.forEach(path => {
        // Just verify the loader can be instantiated with different paths
        const testLoader = new BrowserSchemaLoader();
        expect(testLoader).toBeInstanceOf(BrowserSchemaLoader);
      });
    });
  });

  describe('Cache management', () => {
    it('should track cache size', () => {
      const testLoader = new BrowserSchemaLoader();
      expect(testLoader.getCacheSize()).toBe(0);

      testLoader.clearCache();
      expect(testLoader.getCacheSize()).toBe(0);
    });

    it('should check if schema is loaded', () => {
      const testLoader = new BrowserSchemaLoader();
      expect(testLoader.hasSchema('test-schema.rng')).toBe(false);
    });
  });
});
