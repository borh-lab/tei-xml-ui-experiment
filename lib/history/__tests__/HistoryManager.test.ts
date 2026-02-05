/**
 * Unit Tests for History Utilities
 */

import { getHistoryState, undo, redo, goToRevision } from '../HistoryManager';
import { loadDocument, addSaidTag, undoTo } from '@/lib/tei/operations';
import type { PassageID, CharacterID } from '@/lib/tei/types';

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

describe('History Utilities', () => {
  describe('getHistoryState', () => {
    it('should return disabled state for null document', () => {
      const state = getHistoryState(null);

      expect(state.canUndo).toBe(false);
      expect(state.canRedo).toBe(false);
      expect(state.currentRevision).toBe(0);
      expect(state.totalRevisions).toBe(0);
    });

    it('should return correct state for new document', () => {
      const doc = loadDocument(sampleXML);

      const state = getHistoryState(doc);

      expect(state.canUndo).toBe(false);
      expect(state.canRedo).toBe(false); // Only loaded event
      expect(state.currentRevision).toBe(0);
      expect(state.totalRevisions).toBe(1);
    });

    it('should return correct state after adding tag', () => {
      const doc = loadDocument(sampleXML);
      const passageId = doc.state.passages[0].id as PassageID;
      const speakerId = doc.state.characters[0].id as CharacterID;

      const docWithTag = addSaidTag(doc, passageId, { start: 0, end: 10 }, speakerId);

      const state = getHistoryState(docWithTag);

      expect(state.canUndo).toBe(true);
      expect(state.canRedo).toBe(false);
      expect(state.currentRevision).toBe(1);
      expect(state.totalRevisions).toBe(2);
    });

    it('should return correct state after undo', () => {
      const doc = loadDocument(sampleXML);
      const passageId = doc.state.passages[0].id as PassageID;
      const speakerId = doc.state.characters[0].id as CharacterID;

      const docWithTag = addSaidTag(doc, passageId, { start: 0, end: 10 }, speakerId);
      const undoneDoc = undoTo(docWithTag, 0);

      const state = getHistoryState(undoneDoc);

      expect(state.canUndo).toBe(false);
      expect(state.canRedo).toBe(true);
      expect(state.currentRevision).toBe(0);
      expect(state.totalRevisions).toBe(2);
    });
  });

  describe('undo', () => {
    it('should undo to previous revision', () => {
      const doc = loadDocument(sampleXML);
      const passageId = doc.state.passages[0].id as PassageID;
      const speakerId = doc.state.characters[0].id as CharacterID;

      const docWithTag = addSaidTag(doc, passageId, { start: 0, end: 10 }, speakerId);

      expect(docWithTag.state.revision).toBe(1);
      expect(docWithTag.state.passages[0].tags).toHaveLength(1);

      const undoneDoc = undo(docWithTag);

      expect(undoneDoc.state.revision).toBe(0);
      expect(undoneDoc.state.passages[0].tags).toHaveLength(0);
    });

    it('should return same document when cannot undo', () => {
      const doc = loadDocument(sampleXML);

      const result = undo(doc);

      expect(result).toBe(doc);
    });

    it('should handle multiple sequential operations', () => {
      const doc = loadDocument(sampleXML);
      const passageId = doc.state.passages[0].id as PassageID;
      const speakerId = doc.state.characters[0].id as CharacterID;

      const doc1 = addSaidTag(doc, passageId, { start: 0, end: 5 }, speakerId);
      const doc2 = addSaidTag(doc1, passageId, { start: 6, end: 11 }, speakerId);

      expect(doc2.state.revision).toBe(2);

      const docAt1 = undo(doc2);
      expect(docAt1.state.revision).toBe(1);
      expect(docAt1.state.passages[0].tags).toHaveLength(1);

      const docAt0 = undo(docAt1);
      expect(docAt0.state.revision).toBe(0);
      expect(docAt0.state.passages[0].tags).toHaveLength(0);
    });
  });

  describe('redo', () => {
    it('should redo to next revision', () => {
      const doc = loadDocument(sampleXML);
      const passageId = doc.state.passages[0].id as PassageID;
      const speakerId = doc.state.characters[0].id as CharacterID;

      const docWithTag = addSaidTag(doc, passageId, { start: 0, end: 10 }, speakerId);
      const undoneDoc = undo(docWithTag);

      expect(undoneDoc.state.revision).toBe(0);

      const redoneDoc = redo(undoneDoc);

      expect(redoneDoc.state.revision).toBe(1);
      expect(redoneDoc.state.passages[0].tags).toHaveLength(1);
    });

    it('should return same document when cannot redo', () => {
      const doc = loadDocument(sampleXML);

      const result = redo(doc);

      expect(result).toBe(doc);
    });
  });

  describe('goToRevision', () => {
    it('should go to specific revision', () => {
      const doc = loadDocument(sampleXML);
      const passageId = doc.state.passages[0].id as PassageID;
      const speakerId = doc.state.characters[0].id as CharacterID;

      const doc1 = addSaidTag(doc, passageId, { start: 0, end: 5 }, speakerId);
      const doc2 = addSaidTag(doc1, passageId, { start: 6, end: 11 }, speakerId);

      expect(doc2.state.revision).toBe(2);

      const docAtRevision1 = goToRevision(doc2, 1);

      expect(docAtRevision1.state.revision).toBe(1);
      expect(docAtRevision1.state.passages[0].tags).toHaveLength(1);
    });

    it('should return same document for invalid revision', () => {
      const doc = loadDocument(sampleXML);

      const result = goToRevision(doc, -1);

      expect(result).toBe(doc);
    });

    it('should return same document for out of bounds revision', () => {
      const doc = loadDocument(sampleXML);

      const result = goToRevision(doc, 999);

      expect(result).toBe(doc);
    });
  });
});
