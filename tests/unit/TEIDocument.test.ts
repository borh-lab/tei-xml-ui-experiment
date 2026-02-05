// @ts-nocheck
import { loadDocument, serializeDocument, addSaidTag, addTag } from '@/lib/tei';

describe('TEIDocument', () => {
  test('should parse basic TEI structure', () => {
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
    expect(doc.state.parsed).toBeDefined();
    expect(doc.state.xml).toBe(tei);
  });

  test('should serialize back to XML', () => {
    const tei = `<TEI xmlns="http://www.tei-c.org/ns/1.0"><text><body><p>Test</p></body></text></TEI>`;
    const doc = loadDocument(tei);
    const serialized = serializeDocument(doc);
    expect(serialized).toContain('<TEI');
    expect(serialized).toContain('</TEI>');
  });
});

describe('Tag Operations', () => {
  it('should add said tag to passage state', () => {
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
    expect(passage.tags).toHaveLength(0);

    doc = addSaidTag(doc, passage.id, { start: 0, end: 5 }, 'speaker1');

    // Check tag was added to state
    const updatedPassage = doc.state.passages[0];
    expect(updatedPassage.tags).toHaveLength(1);
    expect(updatedPassage.tags[0].type).toBe('said');
    expect(updatedPassage.tags[0].range).toEqual({ start: 0, end: 5 });
  });

  it('should add dialogue to state', () => {
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
    doc = addSaidTag(doc, passage.id, { start: 0, end: 5 }, 'speaker1');

    expect(doc.state.dialogue).toHaveLength(1);
    expect(doc.state.dialogue[0].speaker).toBe('speaker1');
    expect(doc.state.dialogue[0].content).toBe('Hello');
  });

  it('should add generic tag to passage state', () => {
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

    doc = addTag(doc, passage.id, { start: 6, end: 11 }, 'q');

    const updatedPassage = doc.state.passages[0];
    expect(updatedPassage.tags).toHaveLength(1);
    expect(updatedPassage.tags[0].type).toBe('q');
    expect(updatedPassage.tags[0].range).toEqual({ start: 6, end: 11 });
  });

  it('should add multiple tags to same passage', () => {
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

    doc = addSaidTag(doc, passage.id, { start: 0, end: 5 }, 'speaker1');
    doc = addTag(doc, passage.id, { start: 6, end: 11 }, 'q');

    const updatedPassage = doc.state.passages[0];
    expect(updatedPassage.tags).toHaveLength(2);
  });

  it('should serialize tags to XML', () => {
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

    doc = addSaidTag(doc, passage.id, { start: 0, end: 5 }, 'speaker1');

    const serialized = serializeDocument(doc);

    // Verify tag appears in serialized XML
    expect(serialized).toContain('<said who="#speaker1">Hello</said>');
    expect(serialized).toContain('world');
  });

  it('should serialize multiple tags to XML', () => {
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

    doc = addSaidTag(doc, passage.id, { start: 0, end: 5 }, 'speaker1');
    doc = addTag(doc, passage.id, { start: 6, end: 11 }, 'q');

    const serialized = serializeDocument(doc);

    // Verify both tags appear in serialized XML
    expect(serialized).toContain('<said who="#speaker1">Hello</said>');
    expect(serialized).toContain('<q>world</q>');
  });

  it('should serialize persName tags with ref attribute', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <text>
    <body>
      <p>I met John yesterday</p>
    </body>
  </text>
</TEI>`;

    let doc = loadDocument(xml);
    const passage = doc.state.passages[0];

    doc = addTag(doc, passage.id, { start: 6, end: 10 }, 'persName', { ref: '#john' });

    const serialized = serializeDocument(doc);

    // Verify persName tag with ref attribute
    expect(serialized).toContain('<persName ref="#john">John</persName>');
  });
});
