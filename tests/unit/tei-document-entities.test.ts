// @ts-nocheck
import { loadDocument, addSaidTag } from '@/lib/tei';

describe('TEIDocument - addSaidTag', () => {
  test('adds said tag to passage state', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <text>
    <body>
      <p>Hello world</p>
    </body>
  </text>
</TEI>`;

    let doc = loadDocument(xml);
    const passage = doc.state.passages[0];
    doc = addSaidTag(doc, passage.id, { start: 0, end: 11 }, 'speaker1');

    const updatedPassage = doc.state.passages[0];
    expect(updatedPassage.tags).toHaveLength(1);
    expect(updatedPassage.tags[0].type).toBe('said');
    expect(updatedPassage.tags[0].attributes).toEqual({ who: '#speaker1' });
  });

  test('adds dialogue to state.dialogue array', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <text>
    <body>
      <p>Hello world</p>
    </body>
  </text>
</TEI>`;

    let doc = loadDocument(xml);
    expect(doc.state.dialogue).toHaveLength(0);

    const passage = doc.state.passages[0];
    doc = addSaidTag(doc, passage.id, { start: 0, end: 5 }, 'jane');

    expect(doc.state.dialogue).toHaveLength(1);
    expect(doc.state.dialogue[0].speaker).toBe('jane');
    expect(doc.state.dialogue[0].content).toBe('Hello');
  });

  test('preserves existing content when adding tag', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <text>
    <body>
      <p>Before text After text</p>
    </body>
  </text>
</TEI>`;

    let doc = loadDocument(xml);
    const passage = doc.state.passages[0];
    expect(passage.content).toBe('Before text After text');

    // Select from index 7 to 11 (the word "text")
    doc = addSaidTag(doc, passage.id, { start: 7, end: 11 }, 'speaker1');

    // Content should be unchanged
    const updatedPassage = doc.state.passages[0];
    expect(updatedPassage.content).toBe('Before text After text');
  });
});
