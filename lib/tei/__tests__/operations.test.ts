// @ts-nocheck
/**
 * Unit Tests for Immutable TEI Operations
 *
 * Tests verify:
 * 1. All operations return new values (no mutation)
 * 2. Immutability is preserved (readonly types)
 * 3. Event log is correctly maintained
 * 4. Undo/redo works correctly
 */

import {
  loadDocument,
  addSaidTag,
  removeTag,
  undoTo,
  redoFrom,
  serializeDocument,
  addCharacter,
  removeCharacter,
  addRelationship,
  removeRelationship,
} from '../operations';
import type { TEIDocument, PassageID, CharacterID } from '../types';

describe('Immutable TEI Operations', () => {
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
      <p>Another passage for testing purposes.</p>
    </body>
  </text>
  <standOff>
    <listPerson>
      <person xml:id="speaker1">
        <persName>John Doe</persName>
        <sex value="M"/>
      </person>
      <person xml:id="speaker2">
        <persName>Jane Smith</persName>
        <sex value="F"/>
      </person>
    </listPerson>
  </standOff>
</TEI>`;

  describe('loadDocument', () => {
    it('should create immutable document from XML', () => {
      const doc = loadDocument(sampleXML);

      expect(doc).toBeDefined();
      expect(doc.state).toBeDefined();
      expect(doc.events).toHaveLength(1);
      expect(doc.events[0].type).toBe('loaded');
      expect(doc.state.revision).toBe(0);
      expect(doc.state.passages).toHaveLength(2);
      expect(doc.state.characters).toHaveLength(2);
    });

    it('should extract metadata correctly', () => {
      const doc = loadDocument(sampleXML);

      expect(doc.state.metadata.title).toBe('Test Document');
      expect(doc.state.metadata.author).toBe('Test Author');
    });

    it('should extract passages with stable IDs', () => {
      const doc = loadDocument(sampleXML);

      const passage1 = doc.state.passages[0];
      const passage2 = doc.state.passages[1];

      expect(passage1.id).toMatch(/^passage-[a-f0-9]{12}$/);
      expect(passage2.id).toMatch(/^passage-[a-f0-9]{12}$/);
      expect(passage1.id).not.toBe(passage2.id);
      expect(passage1.index).toBe(0);
      expect(passage2.index).toBe(1);
    });

    it('should extract characters with IDs', () => {
      const doc = loadDocument(sampleXML);

      const char1 = doc.state.characters[0];
      const char2 = doc.state.characters[1];

      expect(char1.id).toBe('char-speaker1');
      expect(char1.name).toBe('John Doe');
      expect(char1.sex).toBe('M');

      expect(char2.id).toBe('char-speaker2');
      expect(char2.name).toBe('Jane Smith');
      expect(char2.sex).toBe('F');
    });
  });

  describe('addSaidTag', () => {
    it('should return new document without mutating original', () => {
      const doc = loadDocument(sampleXML);
      const originalRevision = doc.state.revision;
      const originalPassage = doc.state.passages[0];

      const passageId = doc.state.passages[0].id as PassageID;
      const speakerId = doc.state.characters[0].id as CharacterID;

      const newDoc = addSaidTag(doc, passageId, { start: 0, end: 10 }, speakerId);

      // Original document unchanged
      expect(doc.state.revision).toBe(originalRevision);
      expect(doc.state.passages[0].tags).toHaveLength(0);
      expect(doc.events).toHaveLength(1);

      // New document has changes
      expect(newDoc.state.revision).toBe(originalRevision + 1);
      expect(newDoc.state.passages[0].tags).toHaveLength(1);
      expect(newDoc.events).toHaveLength(2);

      // Original passage reference unchanged
      expect(doc.state.passages[0]).toBe(originalPassage);
    });

    it('should add said tag to correct passage', () => {
      const doc = loadDocument(sampleXML);
      const passageId = doc.state.passages[1].id as PassageID;
      const speakerId = doc.state.characters[0].id as CharacterID;

      const newDoc = addSaidTag(doc, passageId, { start: 5, end: 15 }, speakerId);

      const passage = newDoc.state.passages.find((p) => p.id === passageId);
      expect(passage?.tags).toHaveLength(1);
      expect(passage?.tags[0].type).toBe('said');
      expect(passage?.tags[0].range).toEqual({ start: 5, end: 15 });
    });

    it('should create dialogue entry', () => {
      const doc = loadDocument(sampleXML);
      const passageId = doc.state.passages[0].id as PassageID;
      const speakerId = doc.state.characters[0].id as CharacterID;

      const newDoc = addSaidTag(doc, passageId, { start: 0, end: 10 }, speakerId);

      expect(newDoc.state.dialogue).toHaveLength(1);
      expect(newDoc.state.dialogue[0].speaker).toBe(speakerId);
      expect(newDoc.state.dialogue[0].passageId).toBe(passageId);
    });

    it('should append saidTagAdded event to log', () => {
      const doc = loadDocument(sampleXML);
      const passageId = doc.state.passages[0].id as PassageID;
      const speakerId = doc.state.characters[0].id as CharacterID;

      const newDoc = addSaidTag(doc, passageId, { start: 0, end: 10 }, speakerId);

      const lastEvent = newDoc.events[newDoc.events.length - 1];
      expect(lastEvent.type).toBe('saidTagAdded');
      expect(lastEvent.revision).toBe(1);
      expect(lastEvent.passageId).toBe(passageId);
      expect(lastEvent.speaker).toBe(speakerId);
    });

    it('should throw error for invalid passage ID', () => {
      const doc = loadDocument(sampleXML);
      const speakerId = doc.state.characters[0].id as CharacterID;

      expect(() =>
        addSaidTag(doc, 'invalid-passage-id' as PassageID, { start: 0, end: 10 }, speakerId)
      ).toThrow('Passage not found');
    });
  });

  describe('removeTag', () => {
    it('should return new document without mutating original', () => {
      const doc = loadDocument(sampleXML);
      const passageId = doc.state.passages[0].id as PassageID;
      const speakerId = doc.state.characters[0].id as CharacterID;

      const docWithTag = addSaidTag(doc, passageId, { start: 0, end: 10 }, speakerId);
      const tagId = docWithTag.state.passages[0].tags[0].id;

      const docWithoutTag = removeTag(docWithTag, tagId);

      // Original with tag unchanged
      expect(docWithTag.state.passages[0].tags).toHaveLength(1);

      // New document has tag removed
      expect(docWithoutTag.state.passages[0].tags).toHaveLength(0);
      expect(docWithoutTag.state.dialogue).toHaveLength(0);
    });

    it('should remove tag from passage and dialogue', () => {
      const doc = loadDocument(sampleXML);
      const passageId = doc.state.passages[0].id as PassageID;
      const speakerId = doc.state.characters[0].id as CharacterID;

      const docWithTag = addSaidTag(doc, passageId, { start: 0, end: 10 }, speakerId);
      const tagId = docWithTag.state.passages[0].tags[0].id;

      const docWithoutTag = removeTag(docWithTag, tagId);

      expect(docWithoutTag.state.passages[0].tags).toHaveLength(0);
      expect(docWithoutTag.state.dialogue).toHaveLength(0);
    });

    it('should append tagRemoved event to log', () => {
      const doc = loadDocument(sampleXML);
      const passageId = doc.state.passages[0].id as PassageID;
      const speakerId = doc.state.characters[0].id as CharacterID;

      const docWithTag = addSaidTag(doc, passageId, { start: 0, end: 10 }, speakerId);
      const tagId = docWithTag.state.passages[0].tags[0].id;

      const docWithoutTag = removeTag(docWithTag, tagId);

      const lastEvent = docWithoutTag.events[docWithoutTag.events.length - 1];
      expect(lastEvent.type).toBe('tagRemoved');
      expect(lastEvent.id).toBe(tagId);
    });
  });

  describe('undoTo', () => {
    it('should restore document to previous revision', () => {
      const doc = loadDocument(sampleXML);
      const passageId = doc.state.passages[0].id as PassageID;
      const speakerId = doc.state.characters[0].id as CharacterID;

      const docWithTag = addSaidTag(doc, passageId, { start: 0, end: 10 }, speakerId);

      expect(docWithTag.state.revision).toBe(1);
      expect(docWithTag.state.passages[0].tags).toHaveLength(1);

      const undoneDoc = undoTo(docWithTag, 0);

      expect(undoneDoc.state.revision).toBe(0);
      expect(undoneDoc.state.passages[0].tags).toHaveLength(0);
    });

    it('should keep full event log while resetting state', () => {
      const doc = loadDocument(sampleXML);
      const passageId = doc.state.passages[0].id as PassageID;
      const speakerId = doc.state.characters[0].id as CharacterID;

      const docWithTag = addSaidTag(doc, passageId, { start: 0, end: 10 }, speakerId);

      expect(docWithTag.events).toHaveLength(2);

      const undoneDoc = undoTo(docWithTag, 0);

      // Full event log is kept for redo capability
      expect(undoneDoc.events).toHaveLength(2);
      expect(undoneDoc.state.revision).toBe(0);
      expect(undoneDoc.state.passages[0].tags).toHaveLength(0);
    });

    it('should handle multiple sequential operations', () => {
      const doc = loadDocument(sampleXML);
      const passageId = doc.state.passages[0].id as PassageID;
      const speakerId = doc.state.characters[0].id as CharacterID;

      const doc1 = addSaidTag(doc, passageId, { start: 0, end: 5 }, speakerId);
      const doc2 = addSaidTag(doc1, passageId, { start: 6, end: 11 }, speakerId);

      expect(doc2.state.revision).toBe(2);
      expect(doc2.state.passages[0].tags).toHaveLength(2);

      const undoneTo1 = undoTo(doc2, 1);

      expect(undoneTo1.state.revision).toBe(1);
      expect(undoneTo1.state.passages[0].tags).toHaveLength(1);

      const undoneTo0 = undoTo(doc2, 0);

      expect(undoneTo0.state.revision).toBe(0);
      expect(undoneTo0.state.passages[0].tags).toHaveLength(0);
    });
  });

  describe('redoFrom', () => {
    it('should replay events after revision', () => {
      const doc = loadDocument(sampleXML);
      const passageId = doc.state.passages[0].id as PassageID;
      const speakerId = doc.state.characters[0].id as CharacterID;

      const docWithTag = addSaidTag(doc, passageId, { start: 0, end: 10 }, speakerId);
      const undoneDoc = undoTo(docWithTag, 0);

      const redoneDoc = redoFrom(undoneDoc, 0);

      expect(redoneDoc.state.revision).toBe(1);
      expect(redoneDoc.state.passages[0].tags).toHaveLength(1);
    });
  });

  describe('serializeDocument', () => {
    it('should serialize document to XML', () => {
      const doc = loadDocument(sampleXML);
      const xml = serializeDocument(doc);

      expect(xml).toContain('<?xml version="1.0"');
      expect(xml).toContain('<TEI');
      expect(xml).toContain('<title>Test Document</title>');
    });

    it('should not mutate document when serializing', () => {
      const doc = loadDocument(sampleXML);
      const originalXML = doc.state.xml;

      serializeDocument(doc);

      expect(doc.state.xml).toBe(originalXML);
    });
  });

  describe('character operations', () => {
    it('should add character without mutating original', () => {
      const doc = loadDocument(sampleXML);
      const originalCount = doc.state.characters.length;

      const newCharacter = {
        id: 'char-new' as CharacterID,
        xmlId: 'new',
        name: 'New Character',
        sex: 'F' as const,
      };

      const newDoc = addCharacter(doc, newCharacter);

      expect(doc.state.characters).toHaveLength(originalCount);
      expect(newDoc.state.characters).toHaveLength(originalCount + 1);
      expect(newDoc.state.characters[originalCount].name).toBe('New Character');
    });

    it('should remove character', () => {
      const doc = loadDocument(sampleXML);
      const characterId = doc.state.characters[0].id;

      const newDoc = removeCharacter(doc, characterId);

      expect(doc.state.characters).toHaveLength(2);
      expect(newDoc.state.characters).toHaveLength(1);
      expect(newDoc.state.characters[0].id).not.toBe(characterId);
    });
  });

  describe('relationship operations', () => {
    it('should add relationship without mutating original', () => {
      const doc = loadDocument(sampleXML);
      const originalCount = doc.state.relationships.length;

      const newRelationship = {
        id: 'rel-1',
        from: 'char-speaker1' as CharacterID,
        to: 'char-speaker2' as CharacterID,
        type: 'friend',
      };

      const newDoc = addRelationship(doc, newRelationship);

      expect(doc.state.relationships).toHaveLength(originalCount);
      expect(newDoc.state.relationships).toHaveLength(originalCount + 1);
    });

    it('should remove relationship', () => {
      const doc = loadDocument(sampleXML);
      const relationship = {
        id: 'rel-1',
        from: 'char-speaker1' as CharacterID,
        to: 'char-speaker2' as CharacterID,
        type: 'friend',
      };

      const docWithRel = addRelationship(doc, relationship);

      const docWithoutRel = removeRelationship(docWithRel, 'rel-1');

      expect(docWithRel.state.relationships).toHaveLength(1);
      expect(docWithoutRel.state.relationships).toHaveLength(0);
    });
  });

  describe('immutability verification', () => {
    it('should create new arrays on update', () => {
      const doc = loadDocument(sampleXML);
      const passageId = doc.state.passages[0].id as PassageID;
      const speakerId = doc.state.characters[0].id as CharacterID;

      const newDoc = addSaidTag(doc, passageId, { start: 0, end: 10 }, speakerId);

      // Arrays should be different references
      expect(newDoc.state.passages).not.toBe(doc.state.passages);
      expect(newDoc.state.events).not.toBe(doc.events);
      expect(newDoc.events).not.toBe(doc.events);
    });

    it('should preserve original document after multiple operations', () => {
      const doc = loadDocument(sampleXML);
      const passageId = doc.state.passages[0].id as PassageID;
      const speakerId = doc.state.characters[0].id as CharacterID;

      const doc1 = addSaidTag(doc, passageId, { start: 0, end: 5 }, speakerId);
      const doc2 = addSaidTag(doc1, passageId, { start: 6, end: 11 }, speakerId);

      // Original doc unchanged
      expect(doc.state.revision).toBe(0);
      expect(doc.state.passages[0].tags).toHaveLength(0);

      // doc1 has 1 tag
      expect(doc1.state.revision).toBe(1);
      expect(doc1.state.passages[0].tags).toHaveLength(1);

      // doc2 has 2 tags
      expect(doc2.state.revision).toBe(2);
      expect(doc2.state.passages[0].tags).toHaveLength(2);
    });
  });
});
