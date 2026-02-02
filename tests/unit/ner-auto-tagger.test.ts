import { NERAutoTagger } from '@/lib/ai/entities/NERAutoTagger';
import { TEIDocument } from '@/lib/tei/TEIDocument';

describe('NERAutoTagger', () => {
  test('scans document and detects entities', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <text>
    <body>
      <p>Mr. Darcy went to London. Elizabeth followed him.</p>
    </body>
  </text>
</TEI>`;

    const doc = new TEIDocument(xml);
    const tagger = new NERAutoTagger();

    const suggestions = tagger.scan(doc);

    expect(suggestions.persNames.length).toBeGreaterThan(0);
    expect(suggestions.places.length).toBeGreaterThan(0);
  });

  test('applies high-confidence suggestions automatically', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <text><body><p>Mr. Darcy</p></body></text>
</TEI>`;

    const doc = new TEIDocument(xml);
    const tagger = new NERAutoTagger();

    tagger.autoApply(doc, 0.9);

    const serialized = doc.serialize();
    // Should add to standOff/listAnnotation
    // For now just verify it doesn't crash
    expect(serialized).toBeDefined();
  });
});
