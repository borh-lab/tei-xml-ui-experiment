import { TEIDocument } from '@/lib/tei';

const sampleXML = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <text>
    <body>
      <p>Hello world</p>
    </body>
  </text>
</TEI>`;

describe('Entity Tagging Workflow', () => {
  test('addSaidTag updates document and serializes correctly', () => {
    const doc = new TEIDocument(sampleXML);

    // Verify addSaidTag method exists
    expect(doc.addSaidTag).toBeDefined();
    expect(typeof doc.addSaidTag).toBe('function');

    // Call the mutation
    doc.addSaidTag(0, { start: 0, end: 11 }, 'speaker1');

    // Verify document was updated
    const serialized = doc.serialize();
    expect(serialized).toContain('<said who="#speaker1">');
    expect(serialized).toContain('Hello world');
  });

  test('addCharacter and getCharacters integration', () => {
    const doc = new TEIDocument(sampleXML);

    // Add a character
    doc.addCharacter({
      'xml:id': 'test',
      persName: 'Test Character',
      sex: 'M',
    });

    // Verify getCharacters works
    const characters = doc.getCharacters();
    expect(characters).toHaveLength(1);
    expect(characters[0].persName).toBe('Test Character');

    // Verify it serializes
    const serialized = doc.serialize();
    expect(serialized).toContain('<person xml:id="test">');
    expect(serialized).toContain('Test Character');
  });
});
