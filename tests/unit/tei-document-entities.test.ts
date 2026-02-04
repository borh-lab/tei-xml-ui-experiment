import { TEIDocument } from '@/lib/tei';

describe('TEIDocument - addSaidTag', () => {
  test('adds <said> element with @who attribute to passage', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <text>
    <body>
      <p>Hello world</p>
    </body>
  </text>
</TEI>`;

    const doc = new TEIDocument(xml);
    doc.addSaidTag(0, { start: 0, end: 11 }, 'speaker1');

    const serialized = doc.serialize();
    expect(serialized).toContain('<said who="#speaker1">');
    expect(serialized).toContain('Hello world');
  });

  test('preserves existing content in passage', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <text>
    <body>
      <p>Before text After text</p>
    </body>
  </text>
</TEI>`;

    const doc = new TEIDocument(xml);
    // Select from index 7 to 11 (the word "text")
    doc.addSaidTag(0, { start: 7, end: 11 }, 'speaker1');

    const serialized = doc.serialize();
    expect(serialized).toContain('Before ');
    expect(serialized).toContain(' After text');
    expect(serialized).toContain('<said who="#speaker1">');
  });
});

describe('TEIDocument - updateSpeaker', () => {
  test('updates @who attribute on existing <said> element', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <text>
    <body>
      <p>
        <said who="#speaker1">Hello</said>
      </p>
    </body>
  </text>
</TEI>`;

    const doc = new TEIDocument(xml);
    doc.updateSpeaker(0, 0, 'speaker2');

    const serialized = doc.serialize();
    expect(serialized).toContain('who="#speaker2"');
    expect(serialized).not.toContain('who="#speaker1"');
  });

  test('handles multiple <said> elements in passage', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <text>
    <body>
      <p>
        <said who="#speaker1">First</said>
        <said who="#speaker1">Second</said>
      </p>
    </body>
  </text>
</TEI>`;

    const doc = new TEIDocument(xml);
    doc.updateSpeaker(0, 1, 'speaker2');

    const serialized = doc.serialize();
    expect(serialized).toContain('who="#speaker1">First');
    expect(serialized).toContain('who="#speaker2">Second');
  });
});

describe('TEIDocument - getCharacters', () => {
  test('parses characters from <listPerson><person> elements', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader>
    <fileDesc>
      <titleStmt>
        <title>Test</title>
      </titleStmt>
    </fileDesc>
  </teiHeader>
  <text>
    <body>
      <p>Text</p>
    </body>
  </text>
  <standOff>
    <listPerson>
      <person xml:id="darcy">
        <persName>Mr. Darcy</persName>
        <sex value="M"/>
        <age value="28"/>
      </person>
      <person xml:id="elizabeth">
        <persName>Elizabeth Bennet</persName>
        <sex value="F"/>
      </person>
    </listPerson>
  </standOff>
</TEI>`;

    const doc = new TEIDocument(xml);
    const characters = doc.getCharacters();

    expect(characters).toHaveLength(2);
    expect(characters[0]['xml:id']).toBe('darcy');
    expect(characters[0].persName).toBe('Mr. Darcy');
    expect(characters[0].sex).toBe('M');
    expect(characters[1]['xml:id']).toBe('elizabeth');
  });

  test('returns empty array when no characters exist', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <text><body><p>Text</p></body></text>
</TEI>`;

    const doc = new TEIDocument(xml);
    const characters = doc.getCharacters();

    expect(characters).toEqual([]);
  });
});

describe('TEIDocument - addCharacter', () => {
  test('adds new <person> element to <listPerson>', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <text><body><p>Text</p></body></text>
</TEI>`;

    const doc = new TEIDocument(xml);
    doc.addCharacter({
      'xml:id': 'bingley',
      persName: 'Mr. Bingley',
      sex: 'M',
      age: 24,
    });

    const characters = doc.getCharacters();
    expect(characters).toHaveLength(1);
    expect(characters[0]['xml:id']).toBe('bingley');
    expect(characters[0].persName).toBe('Mr. Bingley');
  });

  test('creates <standOff><listPerson> if not exists', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <text><body><p>Text</p></body></text>
</TEI>`;

    const doc = new TEIDocument(xml);
    doc.addCharacter({
      'xml:id': 'jane',
      persName: 'Jane Bennet',
      sex: 'F',
    });

    const serialized = doc.serialize();
    expect(serialized).toContain('<standOff>');
    expect(serialized).toContain('<listPerson>');
    expect(serialized).toContain('<person xml:id="jane">');
  });

  test('appends to existing <listPerson>', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <standOff>
    <listPerson>
      <person xml:id="darcy">
        <persName>Mr. Darcy</persName>
      </person>
    </listPerson>
  </standOff>
  <text><body><p>Text</p></body></text>
</TEI>`;

    const doc = new TEIDocument(xml);
    doc.addCharacter({
      'xml:id': 'elizabeth',
      persName: 'Elizabeth Bennet',
      sex: 'F',
    });

    const characters = doc.getCharacters();
    expect(characters).toHaveLength(2);
    expect(characters[0]['xml:id']).toBe('darcy');
    expect(characters[1]['xml:id']).toBe('elizabeth');
  });
});

describe('TEIDocument - addNERTag', () => {
  test('adds entity to <standOff><listAnnotation>', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <text><body><p>Mr. Darcy</p></body></text>
</TEI>`;

    const doc = new TEIDocument(xml);
    doc.addNERTag({ start: 4, end: 14 }, 'persName', 'darcy');

    const serialized = doc.serialize();
    expect(serialized).toContain('<listAnnotation>');
    expect(serialized).toContain('<persName ref="#darcy">');
  });

  test('handles multiple entities', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <text><body><p>Mr. Darcy and Elizabeth</p></body></text>
</TEI>`;

    const doc = new TEIDocument(xml);
    doc.addNERTag({ start: 4, end: 14 }, 'persName', 'darcy');
    doc.addNERTag({ start: 19, end: 28 }, 'persName', 'elizabeth');

    const entities = doc.getNamedEntities();
    expect(entities).toHaveLength(2);
  });
});
