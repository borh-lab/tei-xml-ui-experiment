import { TEIDocument } from '@/lib/tei/TEIDocument';

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
    doc.addSaidTag(0, {start: 0, end: 11}, 'speaker1');

    // Verify document was updated
    const serialized = doc.serialize();
    expect(serialized).toContain('<said who="#speaker1">');
    expect(serialized).toContain('Hello world');
  });
});
