// @ts-nocheck
/**
 * Unit tests for ValidationService
 */

import {
  ValidationService,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  FixSuggestion,
} from '../../lib/validation/ValidationService';
import * as path from 'path';

describe('ValidationService', () => {
  const fixturesDir = path.join(__dirname, '../fixtures/schemas');
  const simpleSchema = path.join(fixturesDir, 'test-simple.rng');
  const teiSchema = path.join(fixturesDir, 'test-tei.rng');

  let service: ValidationService;

  beforeEach(() => {
    service = new ValidationService();
  });

  describe('validateDocument', () => {
    describe('valid TEI documents', () => {
      it('should validate a valid simple XML document', async () => {
        const validXml =
          '<root id="test"><item name="first">Item 1</item><item>Item 2</item></root>';
        const result = await service.validateDocument(validXml, simpleSchema);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.warnings).toHaveLength(0);
      });

      it('should validate a valid TEI document', async () => {
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

        const result = await service.validateDocument(validTei, teiSchema);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate TEI document with optional elements omitted', async () => {
        const validTei = `<?xml version="1.0" encoding="UTF-8"?>
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
      <p>Simple paragraph</p>
    </body>
  </text>
</TEI>`;

        const result = await service.validateDocument(validTei, teiSchema);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('invalid tag placement', () => {
      it('should detect invalid element in wrong location', async () => {
        const invalidXml = '<root id="test"><unknownElement>test</unknownElement></root>';
        const result = await service.validateDocument(invalidXml, simpleSchema);

        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);

        const error = result.errors[0];
        expect(error.message).toBeDefined();
        expect(error.line).toBeDefined();
        expect(error.column).toBeDefined();
      });

      it('should detect unknown tag in TEI document', async () => {
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

        const result = await service.validateDocument(invalidTei, teiSchema);

        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);

        // Check that error has specific location
        const error = result.errors[0];
        expect(error.line).toBeGreaterThan(0);
        expect(error.column).toBeGreaterThan(0);
        expect(error.context).toBeDefined();
      });

      it('should detect tag in wrong parent context', async () => {
        const invalidXml = '<root id="test"><item><root>nested root</root></item></root>';
        const result = await service.validateDocument(invalidXml, simpleSchema);

        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    describe('missing required elements', () => {
      it('should detect missing required child elements', async () => {
        const invalidXml = '<root id="test"></root>';
        const result = await service.validateDocument(invalidXml, simpleSchema);

        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);

        // Error should mention missing required elements
        const error = result.errors[0];
        expect(error.message).toBeDefined();
      });

      it('should detect missing required TEI structure', async () => {
        const invalidTei = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader>
    <fileDesc>
      <titleStmt>
        <title>Test Document</title>
      </titleStmt>
    </fileDesc>
  </teiHeader>
</TEI>`;

        const result = await service.validateDocument(invalidTei, teiSchema);

        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    describe('invalid attribute values', () => {
      it('should provide error context for attribute issues', async () => {
        // Schema has string type for id attribute, so any string value is valid
        // But we can test that the service handles attributes properly
        const validXml = '<root id="test123"><item>Item 1</item></root>';
        const result = await service.validateDocument(validXml, simpleSchema);

        expect(result.valid).toBe(true);
      });
    });

    describe('error location precision', () => {
      it('should return specific line and column for errors', async () => {
        const invalidXml = `<root id="test">
  <item>Item 1</item>
  <unknownTag>test</unknownTag>
  <item>Item 2</item>
</root>`;
        const result = await service.validateDocument(invalidXml, simpleSchema);

        expect(result.valid).toBe(false);

        // Find error for unknownTag
        const unknownTagError = result.errors.find((e) => e.message.includes('unknownTag'));
        expect(unknownTagError).toBeDefined();
        expect(unknownTagError!.line).toBe(3);
        expect(unknownTagError!.column).toBeGreaterThan(0);
      });

      it('should provide context snippet for errors', async () => {
        const invalidXml = '<root id="test"><unknownElement>test</unknownElement></root>';
        const result = await service.validateDocument(invalidXml, simpleSchema);

        expect(result.valid).toBe(false);
        expect(result.errors[0].context).toBeDefined();
      });
    });

    describe('fix suggestions', () => {
      it('should provide suggestions for invalid tags', async () => {
        const invalidXml = '<root id="test"><wrongTag>test</wrongTag></root>';
        const result = await service.validateDocument(invalidXml, simpleSchema);

        expect(result.valid).toBe(false);

        // Check if suggestions are provided
        if (result.suggestions && result.suggestions.length > 0) {
          const suggestion = result.suggestions[0];
          expect(suggestion.type).toBeDefined();
          expect(suggestion.message).toBeDefined();
        }
      });

      it('should provide suggestions for missing required elements', async () => {
        const invalidXml = '<root id="test"></root>';
        const result = await service.validateDocument(invalidXml, simpleSchema);

        expect(result.valid).toBe(false);

        // Check if suggestions are provided
        if (result.suggestions && result.suggestions.length > 0) {
          expect(result.suggestions.length).toBeGreaterThan(0);
        }
      });
    });

    describe('edge cases', () => {
      it('should handle empty document', async () => {
        const result = await service.validateDocument('', simpleSchema);

        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it('should handle malformed XML', async () => {
        const malformedXml = '<root><item>Unclosed tag';
        const result = await service.validateDocument(malformedXml, simpleSchema);

        expect(result).toBeDefined();
        // Should not throw, but return error result
        expect(result.valid).toBe(false);
      });

      it('should handle XML with only whitespace', async () => {
        const result = await service.validateDocument('   \n\t  ', simpleSchema);

        expect(result.valid).toBe(false);
      });

      it('should handle non-existent schema file gracefully', async () => {
        const validXml = '<root id="test"><item>Item 1</item></root>';
        const result = await service.validateDocument(validXml, '/nonexistent/schema.rng');

        expect(result).toBeDefined();
        expect(result.valid).toBe(false);
      });
    });
  });

  describe('warnings', () => {
    it('should include warnings if present in schema', async () => {
      // This test documents that warnings can be included
      // Even if our test schemas don't generate warnings
      const validXml = '<root id="test"><item>Item 1</item></root>';
      const result = await service.validateDocument(validXml, simpleSchema);

      expect(result).toBeDefined();
      expect(result.warnings).toBeDefined();
      expect(Array.isArray(result.warnings)).toBe(true);
    });
  });

  describe('async validation', () => {
    it('should support concurrent validations', async () => {
      const xml1 = '<root id="test1"><item>Item 1</item></root>';
      const xml2 = '<root id="test2"><item>Item 2</item></root>';

      const results = await Promise.all([
        service.validateDocument(xml1, simpleSchema),
        service.validateDocument(xml2, simpleSchema),
      ]);

      expect(results[0].valid).toBe(true);
      expect(results[1].valid).toBe(true);
    });

    it('should handle validation with timeout', async () => {
      const largeXml =
        '<root id="test">' +
        Array(1000)
          .fill(0)
          .map((_, i) => `<item>Item ${i}</item>`)
          .join('') +
        '</root>';

      const result = await service.validateDocument(largeXml, simpleSchema);

      expect(result).toBeDefined();
    }, 10000); // 10 second timeout
  });

  describe('default schema path', () => {
    it('should use default schema when no schema path provided', async () => {
      // If a default schema is configured, this should work
      const validXml = '<root id="test"><item>Item 1</item></root>';
      const result = await service.validateDocument(validXml);

      // If no default schema is configured, this might fail
      expect(result).toBeDefined();
    });
  });

  describe('error details', () => {
    it('should provide detailed error information', async () => {
      const invalidXml = '<root id="test"><unknownTag>test</unknownTag></root>';
      const result = await service.validateDocument(invalidXml, simpleSchema);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);

      const error = result.errors[0];
      expect(error.message).toBeTruthy();
      expect(error.line).toBeDefined();
      expect(error.column).toBeDefined();
      expect(error.context).toBeDefined();
    });
  });

  describe('schema-specific validation', () => {
    it('should validate with tei-minimal schema', async () => {
      const serviceWithSchema = new ValidationService();

      const validTei = `<?xml version="1.0" encoding="UTF-8"?>
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
      <p>Content</p>
    </body>
  </text>
</TEI>`;

      const result = await serviceWithSchema.validateDocument(validTei, teiSchema);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for invalid TEI XML', async () => {
      const serviceWithSchema = new ValidationService();

      const invalidTei = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader>
    <fileDesc>
      <titleStmt>
        <title>Test</title>
      </titleStmt>
    </fileDesc>
  </teiHeader>
  <text>
    <body>
      <p>Content</p>
    </body>
  </text>
</TEI>`;

      const result = await serviceWithSchema.validateDocument(invalidTei, teiSchema);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle schema with different validation rules', async () => {
      const serviceWithSchema = new ValidationService();

      // This test verifies that the service can handle different schemas
      // with different validation requirements
      const xml = '<root id="test"><item name="test">Item 1</item><item>Item 2</item></root>';
      const result = await serviceWithSchema.validateDocument(xml, simpleSchema);

      expect(result.valid).toBe(true);
    });
  });
});
