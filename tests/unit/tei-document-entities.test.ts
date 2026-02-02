import { TEIDocument } from '@/lib/tei/TEIDocument';

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
    doc.addSaidTag(0, {start: 0, end: 11}, 'speaker1');

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
    doc.addSaidTag(0, {start: 7, end: 11}, 'speaker1');

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
