import { Effect } from 'effect';
import { DocumentProtocolLive, type DocumentState } from '../DocumentV2';
import { initialState } from '@/lib/values/DocumentState';

// Sample XML document
const sampleXML = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader>
    <fileDesc>
      <titleStmt>
        <title>Test Document</title>
      </titleStmt>
    </fileDesc>
  </teiHeader>
  <text>
    <body>
      <p xml:id="p1">Hello <said who="char1">world</said></p>
    </body>
  </text>
</TEI>`;

describe('DocumentProtocol V2', () => {
  describe('loadDocument', () => {
    it('should load document and update state', async () => {
      const state = initialState();
      const program = DocumentProtocolLive.loadDocument(state, sampleXML);
      const result = await Effect.runPromise(program);

      expect(result.document).not.toBeNull();
      expect(result.status).toBe('success');
      expect(result.error).toBeNull();
    });

    it('should handle non-XML input gracefully', async () => {
      const state = initialState();
      // The parser is lenient and handles non-XML input gracefully
      const program = DocumentProtocolLive.loadDocument(state, 'not xml at all');
      const result = await Effect.runPromise(program);

      // Parser creates empty document structure
      expect(result.document).not.toBeNull();
      expect(result.status).toBe('success');
    });
  });

  describe('addSaidTag', () => {
    it('should add said tag and return new state', async () => {
      // First load a document
      let state = await Effect.runPromise(DocumentProtocolLive.loadDocument(initialState(), sampleXML));

      // Get the first passage ID
      const passageId = state.document!.state.passages[0].id;

      // Add said tag
      const program = DocumentProtocolLive.addSaidTag(
        state,
        passageId,
        { start: 0, end: 5 },
        'char-test' as any
      );
      state = await Effect.runPromise(program);

      expect(state.document).not.toBeNull();
      expect(state.validation).toBeNull(); // Validation cleared on change
      expect(state.document!.state.passages[0].tags.length).toBeGreaterThan(1);
    });

    it('should error when no document loaded', async () => {
      const state = initialState();
      const program = DocumentProtocolLive.addSaidTag(
        state,
        'p1' as any,
        { start: 0, end: 5 },
        'char1' as any
      );

      await expect(Effect.runPromise(program)).rejects.toThrow('No document loaded');
    });
  });

  describe('addQTag', () => {
    it('should add q tag and return new state', async () => {
      let state = await Effect.runPromise(DocumentProtocolLive.loadDocument(initialState(), sampleXML));
      const passageId = state.document!.state.passages[0].id;

      const program = DocumentProtocolLive.addQTag(
        state,
        passageId,
        { start: 0, end: 5 }
      );
      state = await Effect.runPromise(program);

      expect(state.document).not.toBeNull();
      expect(state.validation).toBeNull();
    });
  });

  describe('addPersNameTag', () => {
    it('should add persName tag and return new state', async () => {
      let state = await Effect.runPromise(DocumentProtocolLive.loadDocument(initialState(), sampleXML));
      const passageId = state.document!.state.passages[0].id;

      const program = DocumentProtocolLive.addPersNameTag(
        state,
        passageId,
        { start: 0, end: 5 },
        'test-ref'
      );
      state = await Effect.runPromise(program);

      expect(state.document).not.toBeNull();
      expect(state.validation).toBeNull();
    });
  });

  describe('removeTag', () => {
    it('should remove tag and return new state', async () => {
      let state = await Effect.runPromise(DocumentProtocolLive.loadDocument(initialState(), sampleXML));
      const passageId = state.document!.state.passages[0].id;

      // First add a tag
      state = await Effect.runPromise(DocumentProtocolLive.addSaidTag(
        state,
        passageId,
        { start: 0, end: 5 },
        'char-test' as any
      ));

      // Get the new tag ID from the document (last tag)
      const tags = state.document!.state.passages[0].tags;
      const tagId = tags[tags.length - 1].id;

      // Remove the tag
      const program = DocumentProtocolLive.removeTag(state, tagId);
      state = await Effect.runPromise(program);

      expect(state.document).not.toBeNull();
      expect(state.document!.state.passages[0].tags.find(t => t.id === tagId)).toBeUndefined();
    });

    it('should error when no document loaded', async () => {
      const state = initialState();
      const program = DocumentProtocolLive.removeTag(state, 'tag-123');

      await expect(Effect.runPromise(program)).rejects.toThrow('No document loaded');
    });
  });

  describe('addCharacter', () => {
    it('should add character and return new state', async () => {
      let state = await Effect.runPromise(DocumentProtocolLive.loadDocument(initialState(), sampleXML));

      const character = {
        id: 'char-test123' as any,
        xmlId: 'test123',
        name: 'Test Character',
        sex: 'M' as const,
      };

      const program = DocumentProtocolLive.addCharacter(state, character);
      state = await Effect.runPromise(program);

      expect(state.document).not.toBeNull();
      expect(state.document!.state.characters).toContainEqual(character);
    });
  });

  describe('updateCharacter', () => {
    it('should update character and return new state', async () => {
      let state = await Effect.runPromise(DocumentProtocolLive.loadDocument(initialState(), sampleXML));

      // First add a character
      const character = {
        id: 'char-test123' as any,
        xmlId: 'test123',
        name: 'Test Character',
        sex: 'M' as const,
      };
      state = await Effect.runPromise(DocumentProtocolLive.addCharacter(state, character));

      // Update the character
      const program = DocumentProtocolLive.updateCharacter(
        state,
        'char-test123' as any,
        { name: 'Updated Name' }
      );
      state = await Effect.runPromise(program);

      expect(state.document).not.toBeNull();
      expect(state.document!.state.characters.find(c => c.id === 'char-test123')?.name).toBe('Updated Name');
    });
  });

  describe('removeCharacter', () => {
    it('should remove character and return new state', async () => {
      let state = await Effect.runPromise(DocumentProtocolLive.loadDocument(initialState(), sampleXML));

      // First add a character
      const character = {
        id: 'char-test123' as any,
        xmlId: 'test123',
        name: 'Test Character',
        sex: 'M' as const,
      };
      state = await Effect.runPromise(DocumentProtocolLive.addCharacter(state, character));

      // Remove the character
      const program = DocumentProtocolLive.removeCharacter(state, 'char-test123' as any);
      state = await Effect.runPromise(program);

      expect(state.document).not.toBeNull();
      expect(state.document!.state.characters.find(c => c.id === 'char-test123')).toBeUndefined();
    });
  });

  describe('addRelationship', () => {
    it('should add relationship and return new state', async () => {
      let state = await Effect.runPromise(DocumentProtocolLive.loadDocument(initialState(), sampleXML));

      // First add two characters
      const char1 = {
        id: 'char-test1' as any,
        xmlId: 'test1',
        name: 'Character 1',
        sex: 'M' as const,
      };
      const char2 = {
        id: 'char-test2' as any,
        xmlId: 'test2',
        name: 'Character 2',
        sex: 'F' as const,
      };
      state = await Effect.runPromise(DocumentProtocolLive.addCharacter(state, char1));
      state = await Effect.runPromise(DocumentProtocolLive.addCharacter(state, char2));

      // Add relationship
      const relation = {
        from: 'char-test1' as any,
        to: 'char-test2' as any,
        type: 'family' as const,
        mutual: false,
      };
      const program = DocumentProtocolLive.addRelationship(state, relation);
      state = await Effect.runPromise(program);

      expect(state.document).not.toBeNull();
      expect(state.document!.state.relationships.length).toBeGreaterThan(0);
    });
  });

  describe('removeRelationship', () => {
    it('should remove relationship and return new state', async () => {
      let state = await Effect.runPromise(DocumentProtocolLive.loadDocument(initialState(), sampleXML));

      // First add two characters
      const char1 = {
        id: 'char-test1' as any,
        xmlId: 'test1',
        name: 'Character 1',
        sex: 'M' as const,
      };
      const char2 = {
        id: 'char-test2' as any,
        xmlId: 'test2',
        name: 'Character 2',
        sex: 'F' as const,
      };
      state = await Effect.runPromise(DocumentProtocolLive.addCharacter(state, char1));
      state = await Effect.runPromise(DocumentProtocolLive.addCharacter(state, char2));

      // Add relationship
      const relation = {
        from: 'char-test1' as any,
        to: 'char-test2' as any,
        type: 'family' as const,
        mutual: false,
      };
      state = await Effect.runPromise(DocumentProtocolLive.addRelationship(state, relation));

      // Get the relationship ID
      const relationId = state.document!.state.relationships[0].id;

      // Remove the relationship
      const program = DocumentProtocolLive.removeRelationship(state, relationId);
      state = await Effect.runPromise(program);

      expect(state.document).not.toBeNull();
      expect(state.document!.state.relationships.find(r => r.id === relationId)).toBeUndefined();
    });
  });

  describe('state immutability', () => {
    it('should not mutate original state', async () => {
      const originalState = initialState();
      const program = DocumentProtocolLive.loadDocument(originalState, sampleXML);
      const newState = await Effect.runPromise(program);

      // Original state unchanged
      expect(originalState.document).toBeNull();
      expect(originalState.status).toBe('idle');

      // New state has document
      expect(newState.document).not.toBeNull();
      expect(newState.status).toBe('success');
    });
  });
});
