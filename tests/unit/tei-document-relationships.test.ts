// @ts-nocheck
import { TEIDocument } from '@/lib/tei';

describe('TEIDocument - Relationships', () => {
  test('getRelationships returns empty array when none exist', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <text><body><p>Text</p></body></text>
</TEI>`;

    const doc = new TEIDocument(xml);
    const relationships = doc.getRelationships();

    expect(relationships).toEqual([]);
  });

  test('getRelationships parses existing <listRelation>', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <standOff>
    <listRelation>
      <relation name="romantic" active="#darcy" passive="#elizabeth"/>
    </listRelation>
  </standOff>
  <text><body><p>Text</p></body></text>
</TEI>`;

    const doc = new TEIDocument(xml);
    const relationships = doc.getRelationships();

    expect(relationships).toHaveLength(1);
    expect(relationships[0].type).toBe('romantic');
    expect(relationships[0].from).toBe('darcy');
    expect(relationships[0].to).toBe('elizabeth');
  });

  test('addRelation adds relationship to <listRelation>', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <standOff>
    <listPerson>
      <person xml:id="darcy"><persName>Darcy</persName></person>
      <person xml:id="elizabeth"><persName>Elizabeth</persName></person>
    </listPerson>
  </standOff>
  <text><body><p>Text</p></body></text>
</TEI>`;

    const doc = new TEIDocument(xml);
    doc.addRelation({
      id: 'rel1',
      from: 'darcy',
      to: 'elizabeth',
      type: 'romantic',
      subtype: 'courtship',
    });

    const relationships = doc.getRelationships();
    expect(relationships).toHaveLength(1);
    expect(relationships[0].type).toBe('romantic');
  });

  test('removeRelation removes relationship', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <standOff>
    <listRelation>
      <relation name="romantic" active="#darcy" passive="#elizabeth"/>
    </listRelation>
  </standOff>
  <text><body><p>Text</p></body></text>
</TEI>`;

    const doc = new TEIDocument(xml);
    doc.removeRelation('darcy', 'elizabeth', 'romantic');

    const relationships = doc.getRelationships();
    expect(relationships).toHaveLength(0);
  });
});
