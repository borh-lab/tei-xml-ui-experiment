// @ts-nocheck
import { loadDocument, addSaidTag, addCharacter } from '@/lib/tei';

const sampleXML = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <text>
    <body>
      <p>Hello world</p>
    </body>
  </text>
</TEI>`;

describe('Entity Tagging Workflow', () => {
  test('addSaidTag updates document state', () => {
    let doc = loadDocument(sampleXML);
    const passage = doc.state.passages[0];

    // Call the mutation function
    doc = addSaidTag(doc, passage.id, { start: 0, end: 11 }, 'speaker1');

    // Verify document was updated
    expect(doc.state.passages[0].tags).toHaveLength(1);
    expect(doc.state.passages[0].tags[0].type).toBe('said');
    expect(doc.state.passages[0].tags[0].attributes.who).toBe('#speaker1');

    // Verify dialogue was added
    expect(doc.state.dialogue).toHaveLength(1);
    expect(doc.state.dialogue[0].speaker).toBe('speaker1');
    expect(doc.state.dialogue[0].content).toBe('Hello world');
  });

  test('addCharacter integrates with document', () => {
    let doc = loadDocument(sampleXML);

    // Add a character
    const character = {
      id: 'char-test' as const,
      xmlId: 'test',
      name: 'Test Character',
      sex: 'M' as const,
    };

    doc = addCharacter(doc, character);

    // Verify character was added
    expect(doc.state.characters).toHaveLength(1);
    expect(doc.state.characters[0].xmlId).toBe('test');
    expect(doc.state.characters[0].name).toBe('Test Character');

    // Verify event was logged
    const lastEvent = doc.events[doc.events.length - 1];
    expect(lastEvent.type).toBe('characterAdded');
  });

  test('document revisions increment with each operation', () => {
    let doc = loadDocument(sampleXML);
    const initialRevision = doc.state.revision;

    const passage = doc.state.passages[0];

    // First operation
    doc = addSaidTag(doc, passage.id, { start: 0, end: 5 }, 'speaker1');
    expect(doc.state.revision).toBe(initialRevision + 1);

    // Second operation
    doc = addCharacter(doc, {
      id: 'char-test' as const,
      xmlId: 'test',
      name: 'Test',
    });
    expect(doc.state.revision).toBe(initialRevision + 2);
  });

  test('events are logged for document changes', () => {
    let doc = loadDocument(sampleXML);
    const passage = doc.state.passages[0];

    // Initial document should have loaded event
    expect(doc.events).toBeDefined();
    expect(doc.events.length).toBeGreaterThan(0);
    expect(doc.events[0].type).toBe('loaded');

    // Add a tag
    doc = addSaidTag(doc, passage.id, { start: 0, end: 5 }, 'speaker1');
    expect(doc.state.passages[0].tags).toHaveLength(1);

    // Should have more events now
    expect(doc.events.length).toBeGreaterThan(1);
  });
});
