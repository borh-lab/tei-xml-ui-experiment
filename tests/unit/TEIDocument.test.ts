import { TEIDocument } from '../../lib/tei/TEIDocument';

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
