import { TEIDocument } from '@/lib/tei';

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

    const doc = new TEIDocument(tei);
    expect(doc.parsed).toBeDefined();
    expect(doc.rawXML).toBe(tei);
  });

  test('should serialize back to XML', () => {
    const tei = `<TEI xmlns="http://www.tei-c.org/ns/1.0"><text><body><p>Test</p></body></text></TEI>`;
    const doc = new TEIDocument(tei);
    const serialized = doc.serialize();
    expect(serialized).toContain('<TEI');
    expect(serialized).toContain('</TEI>');
  });
});

describe('wrapTextInTag', () => {
  it('should wrap plain text in a said tag', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <text>
    <body>
      <p>Hello world</p>
    </body>
  </text>
</TEI>`;

    const doc = new TEIDocument(xml);
    doc.wrapTextInTag(0, 0, 5, 'said', { 'who': '#speaker1' });

    const updated = doc.serialize();
    expect(updated).toContain('<said who="#speaker1">Hello</said>');
    expect(updated).toContain('world');
  });

  it('should wrap text in a q tag', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <text>
    <body>
      <p>Hello world</p>
    </body>
  </text>
</TEI>`;

    const doc = new TEIDocument(xml);
    doc.wrapTextInTag(0, 6, 11, 'q');

    const updated = doc.serialize();
    expect(updated).toContain('<q>world</q>');
    expect(updated).toContain('Hello');
  });

  it('should wrap text in persName tag', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <text>
    <body>
      <p>I met John yesterday</p>
    </body>
  </text>
</TEI>`;

    const doc = new TEIDocument(xml);
    doc.wrapTextInTag(0, 6, 10, 'persName', { 'ref': '#john' });

    const updated = doc.serialize();
    expect(updated).toContain('<persName ref="#john">John</persName>');
  });

  it('should handle wrapping text in middle of passage', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <text>
    <body>
      <p>Start middle end</p>
    </body>
  </text>
</TEI>`;

    const doc = new TEIDocument(xml);
    doc.wrapTextInTag(0, 6, 12, 'said');

    const updated = doc.serialize();
    expect(updated).toContain('Start');
    expect(updated).toContain('<said>middle</said>');
    expect(updated).toContain('end');
  });

  it('should handle multiple tags in same passage', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <text>
    <body>
      <p>Hello world</p>
    </body>
  </text>
</TEI>`;

    const doc = new TEIDocument(xml);
    doc.wrapTextInTag(0, 0, 5, 'said', { 'who': '#speaker1' });
    doc.wrapTextInTag(0, 6, 11, 'q');

    const updated = doc.serialize();
    expect(updated).toContain('<said who="#speaker1">Hello</said>');
    expect(updated).toContain('<q>world</q>');
  });

  it('should handle passage with existing mixed content', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <text>
    <body>
      <p>Text before said tag <said who="#s1">existing quote</said> text after</p>
    </body>
  </text>
</TEI>`;

    const doc = new TEIDocument(xml);
    // Wrap the first part before the existing said tag
    doc.wrapTextInTag(0, 0, 4, 'q');

    const updated = doc.serialize();
    // Should wrap "Text" in a q tag
    expect(updated).toContain('<q>Text</q>');
    // Should preserve the existing said tag
    expect(updated).toContain('<said who="#s1">existing quote</said>');
  });

  it('should preserve passage attributes when wrapping', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <text>
    <body>
      <p xml:id="p1" n="1">Hello</p>
    </body>
  </text>
</TEI>`;

    const doc = new TEIDocument(xml);
    doc.wrapTextInTag(0, 0, 5, 'said');
    const updated = doc.serialize();
    expect(updated).toContain('xml:id="p1"');
    expect(updated).toContain('n="1"');
    expect(updated).toContain('<said>Hello</said>');
  });
});
