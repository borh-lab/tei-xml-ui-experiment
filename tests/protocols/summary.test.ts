/**
 * Tests for summarizeValidation protocol
 */

import { summarizeValidation } from '@/lib/protocols/summary';
import { loadDocument } from '@/lib/tei';
import { calculateHealthScore, getOverallStatus } from '@/lib/values/ValidationSummary';

describe('summarizeValidation', () => {
  test('should validate empty document', () => {
    const tei = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader>
    <fileDesc><titleStmt><title>Test</title></titleStmt></fileDesc>
  </teiHeader>
  <text>
    <body>
      <p>Hello world</p>
    </body>
  </text>
</TEI>`;

    const doc = loadDocument(tei);
    const result = summarizeValidation(doc);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.totalTags).toBe(0);
      expect(result.value.issues).toHaveLength(0);
      expect(result.value.byTagType).toEqual({});
      expect(result.value.bySeverity).toEqual({
        critical: 0,
        warning: 0,
        info: 0,
      });
    }
  });

  test('should validate said tags with @who attribute', () => {
    const tei = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader>
    <fileDesc>
      <titleStmt><title>Test</title></titleStmt>
    </fileDesc>
  </teiHeader>
  <text>
    <body>
      <p>
        <said who="#speaker1">Hello</said>
      </p>
    </body>
  </text>
</TEI>`;

    const doc = loadDocument(tei);
    const result = summarizeValidation(doc);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.totalTags).toBe(1);
      // Should have issues because speaker1 doesn't exist
      expect(result.value.issues.length).toBeGreaterThan(0);
    }
  });

  test('should detect missing @who on said tags', () => {
    const tei = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader>
    <fileDesc>
      <titleStmt><title>Test</title></titleStmt>
    </fileDesc>
  </teiHeader>
  <text>
    <body>
      <p>
        <said>Hello</said>
      </p>
    </body>
  </text>
</TEI>`;

    const doc = loadDocument(tei);
    const result = summarizeValidation(doc);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.totalTags).toBe(1);
      expect(result.value.issues).toHaveLength(1);
      expect(result.value.issues[0].code).toBe('MISSING_REQUIRED_ATTR');
      expect(result.value.issues[0].severity).toBe('critical');
    }
  });

  test('should aggregate by tag type', () => {
    const tei = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader>
    <fileDesc>
      <titleStmt><title>Test</title></titleStmt>
    </fileDesc>
  </teiHeader>
  <text>
    <body>
      <p>
        <said who="#speaker1">Hello</said>
        <said who="#speaker2">Hi</said>
        <q who="#speaker1">Quote</q>
        <persName ref="#char1">John</persName>
      </p>
    </body>
  </text>
</TEI>`;

    const doc = loadDocument(tei);
    const result = summarizeValidation(doc);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.totalTags).toBe(4);
      expect(result.value.byTagType).toHaveProperty('said');
      expect(result.value.byTagType).toHaveProperty('q');
      expect(result.value.byTagType).toHaveProperty('persName');
      expect(result.value.byTagType.said.total).toBe(2);
      expect(result.value.byTagType.q.total).toBe(1);
      expect(result.value.byTagType.persName.total).toBe(1);
    }
  });

  test('should aggregate by severity', () => {
    const tei = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader>
    <fileDesc>
      <titleStmt><title>Test</title></titleStmt>
    </fileDesc>
  </teiHeader>
  <text>
    <body>
      <p>
        <said>Hello</said>
        <q>Quote</q>
        <persName>John</persName>
      </p>
    </body>
  </text>
</TEI>`;

    const doc = loadDocument(tei);
    const result = summarizeValidation(doc);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.bySeverity).toHaveProperty('critical');
      expect(result.value.bySeverity).toHaveProperty('warning');
      expect(result.value.bySeverity).toHaveProperty('info');
      expect(result.value.bySeverity.critical).toBeGreaterThan(0);
    }
  });

  test('should handle multiple passages', () => {
    const tei = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader>
    <fileDesc>
      <titleStmt><title>Test</title></titleStmt>
    </fileDesc>
  </teiHeader>
  <text>
    <body>
      <p>
        <said>Hello</said>
      </p>
      <p>
        <said>World</said>
      </p>
    </body>
  </text>
</TEI>`;

    const doc = loadDocument(tei);
    const result = summarizeValidation(doc);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.totalTags).toBe(2);
      expect(result.value.issues).toHaveLength(2);
    }
  });

  test('should validate entity references', () => {
    const tei = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader>
    <fileDesc>
      <titleStmt><title>Test</title></titleStmt>
    </fileDesc>
  </teiHeader>
  <text>
    <body>
      <p>
        <said who="#nonexistent">Hello</said>
        <persName ref="#unknown">John</persName>
      </p>
    </body>
  </text>
</TEI>`;

    const doc = loadDocument(tei);
    const result = summarizeValidation(doc);

    expect(result.success).toBe(true);
    if (result.success) {
      // Should have warnings for invalid entity references
      const invalidRefIssues = result.value.issues.filter(
        (issue) => issue.code === 'INVALID_ENTITY_REF'
      );
      expect(invalidRefIssues.length).toBeGreaterThan(0);
    }
  });

  test('should calculate health score correctly', () => {
    const tei = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader>
    <fileDesc>
      <titleStmt><title>Test</title></titleStmt>
    </fileDesc>
  </teiHeader>
  <text>
    <body>
      <p>
        <said>Hello</said>
      </p>
    </body>
  </text>
</TEI>`;

    const doc = loadDocument(tei);
    const result = summarizeValidation(doc);

    expect(result.success).toBe(true);
    if (result.success) {
      const score = calculateHealthScore(result.value);
      expect(score).toBeLessThan(100); // Should have deductions for critical issues
      expect(score).toBeGreaterThanOrEqual(0);
    }
  });

  test('should determine overall status', () => {
    const tei = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader>
    <fileDesc>
      <titleStmt><title>Test</title></titleStmt>
    </fileDesc>
  </teiHeader>
  <text>
    <body>
      <p>Hello world</p>
    </body>
  </text>
</TEI>`;

    const doc = loadDocument(tei);
    const result = summarizeValidation(doc);

    expect(result.success).toBe(true);
    if (result.success) {
      const status = getOverallStatus(result.value);
      expect(['healthy', 'warning', 'critical']).toContain(status);
    }
  });

  test('should handle validation errors gracefully', () => {
    // Test with null/undefined document
    const result = summarizeValidation(null as any);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('INVALID_DOCUMENT');
    }
  });
});
