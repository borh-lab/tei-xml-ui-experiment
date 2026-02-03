/**
 * Unit Tests for Migration Utilities
 */

import {
  migrateFromOldDocument,
  isOldDocument,
  isNewDocument,
  ensureImmutable,
  migrateOldDocuments,
  extractStateFromOldDocument,
} from '../migrate';
import { TEIDocument as TEIDocumentOld } from '../TEIDocument.old';
import { loadDocument } from '../operations';

const sampleXML = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader>
    <fileDesc>
      <titleStmt>
        <title>Test Document</title>
        <author>Test Author</author>
      </titleStmt>
    </fileDesc>
  </teiHeader>
  <text>
    <body>
      <p>This is a test passage with some content.</p>
    </body>
  </text>
  <standOff>
    <listPerson>
      <person xml:id="speaker1">
        <persName>John Doe</persName>
      </person>
    </listPerson>
  </standOff>
</TEI>`;

describe('Migration Utilities', () => {
  describe('migrateFromOldDocument', () => {
    it('should migrate old document to new immutable format', () => {
      const oldDoc = new TEIDocumentOld(sampleXML);
      const newDoc = migrateFromOldDocument(oldDoc);

      expect(newDoc).toBeDefined();
      expect(newDoc.state).toBeDefined();
      expect(newDoc.events).toHaveLength(1);
      expect(newDoc.state.metadata.title).toBe('Test Document');
      expect(newDoc.state.passages).toHaveLength(1);
    });

    it('should preserve mutations from old document', () => {
      const oldDoc = new TEIDocumentOld(sampleXML);

      // Make a mutation using old API
      oldDoc.addSaidTag(0, { start: 0, end: 10 }, 'speaker1');

      // Migrate to new format
      const newDoc = migrateFromOldDocument(oldDoc);

      // The mutation should be preserved in the XML
      expect(newDoc.state.xml).toContain('<said');
    });

    it('should create different instances for each migration', () => {
      const oldDoc = new TEIDocumentOld(sampleXML);

      const newDoc1 = migrateFromOldDocument(oldDoc);
      const newDoc2 = migrateFromOldDocument(oldDoc);

      // Should be different instances
      expect(newDoc1).not.toBe(newDoc2);

      // But have the same content
      expect(newDoc1.state.xml).toBe(newDoc2.state.xml);
    });
  });

  describe('isOldDocument', () => {
    it('should identify old document format', () => {
      const oldDoc = new TEIDocumentOld(sampleXML);

      expect(isOldDocument(oldDoc)).toBe(true);
      expect(isNewDocument(oldDoc)).toBe(false);
    });

    it('should return false for new document format', () => {
      const newDoc = loadDocument(sampleXML);

      expect(isOldDocument(newDoc)).toBe(false);
      expect(isNewDocument(newDoc)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isOldDocument(null)).toBe(false);
      expect(isNewDocument(null)).toBe(false);
    });

    it('should return false for plain objects', () => {
      const plainObj = { rawXML: 'test' };

      expect(isOldDocument(plainObj)).toBe(false);
      expect(isNewDocument(plainObj)).toBe(false);
    });
  });

  describe('isNewDocument', () => {
    it('should identify new document format', () => {
      const newDoc = loadDocument(sampleXML);

      expect(isNewDocument(newDoc)).toBe(true);
      expect(isOldDocument(newDoc)).toBe(false);
    });

    it('should return false for old document format', () => {
      const oldDoc = new TEIDocumentOld(sampleXML);

      expect(isNewDocument(oldDoc)).toBe(false);
      expect(isOldDocument(oldDoc)).toBe(true);
    });
  });

  describe('ensureImmutable', () => {
    it('should return new document as-is', () => {
      const newDoc = loadDocument(sampleXML);

      const result = ensureImmutable(newDoc);

      expect(result).toBe(newDoc);
    });

    it('should migrate old document to new format', () => {
      const oldDoc = new TEIDocumentOld(sampleXML);

      const result = ensureImmutable(oldDoc);

      expect(result).toBeDefined();
      expect(isNewDocument(result)).toBe(true);
      expect(isOldDocument(result)).toBe(false);
    });

    it('should return null for null input', () => {
      const result = ensureImmutable(null);

      expect(result).toBeNull();
    });

    it('should throw error for unknown format', () => {
      const invalidDoc = { foo: 'bar' };

      expect(() => ensureImmutable(invalidDoc as any)).toThrow('Unknown document format');
    });
  });

  describe('migrateOldDocuments', () => {
    it('should migrate array of old documents', () => {
      const oldDocs = [
        new TEIDocumentOld(sampleXML),
        new TEIDocumentOld(sampleXML),
      ];

      const newDocs = migrateOldDocuments(oldDocs);

      expect(newDocs).toHaveLength(2);
      newDocs.forEach(doc => {
        expect(isNewDocument(doc)).toBe(true);
      });
    });

    it('should preserve order of documents', () => {
      const xml1 = sampleXML.replace('Test Document', 'Document 1');
      const xml2 = sampleXML.replace('Test Document', 'Document 2');

      const oldDocs = [
        new TEIDocumentOld(xml1),
        new TEIDocumentOld(xml2),
      ];

      const newDocs = migrateOldDocuments(oldDocs);

      expect(newDocs[0].state.metadata.title).toBe('Document 1');
      expect(newDocs[1].state.metadata.title).toBe('Document 2');
    });
  });

  describe('extractStateFromOldDocument', () => {
    it('should extract state from old document', () => {
      const oldDoc = new TEIDocumentOld(sampleXML);

      const state = extractStateFromOldDocument(oldDoc);

      expect(state).toBeDefined();
      expect(state.metadata.title).toBe('Test Document');
      expect(state.passages).toHaveLength(1);
      expect(state.characters).toHaveLength(1);
    });

    it('should not include events in extracted state', () => {
      const oldDoc = new TEIDocumentOld(sampleXML);

      const state = extractStateFromOldDocument(oldDoc);

      // State should not have events property
      expect((state as any).events).toBeUndefined();
    });
  });
});
