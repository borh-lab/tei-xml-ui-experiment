// @ts-nocheck
import { loadDocument, serializeDocument } from '@/lib/tei';

describe('TEIDocument Serialization', () => {
  test('serialize should produce valid XML', () => {
    const tei = `<TEI xmlns="http://www.tei-c.org/ns/1.0"><text><body><p>Test</p></body></text></TEI>`;
    const doc = loadDocument(tei);

    const serialized = serializeDocument(doc);
    const parser = new DOMParser();
    const parsed = parser.parseFromString(serialized, 'application/xml');

    expect(parsed.getElementsByTagName('parsererror').length).toBe(0);
  });

  test('serialize should preserve namespace', () => {
    const tei = `<TEI xmlns="http://www.tei-c.org/ns/1.0"><text><body><p>Test</p></body></text></TEI>`;
    const doc = loadDocument(tei);

    const serialized = serializeDocument(doc);
    expect(serialized).toContain('xmlns="http://www.tei-c.org/ns/1.0"');
  });

  test('serialize should rebuild XML from parsed structure', () => {
    const tei = `<TEI xmlns="http://www.tei-c.org/ns/1.0"><text><body><p>Test</p></body></text></TEI>`;
    const doc = loadDocument(tei);

    const serialized = serializeDocument(doc);

    // Verify it's not just returning rawXML
    expect(serialized).not.toBe(tei);

    // Verify it's valid XML
    const parser = new DOMParser();
    const parsed = parser.parseFromString(serialized, 'application/xml');
    expect(parsed.getElementsByTagName('parsererror').length).toBe(0);

    // Verify namespace is preserved
    const teiElement = parsed.getElementsByTagName('TEI')[0];
    expect(teiElement.getAttribute('xmlns')).toBe('http://www.tei-c.org/ns/1.0');
  });
});
