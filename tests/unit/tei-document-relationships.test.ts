// @ts-nocheck
import {
  loadDocument,
  serializeDocument,
  addRelationship,
  removeRelationship,
  addCharacter,
} from '@/lib/tei';

describe('TEIDocument - Relationships', () => {
  test('state.relationships returns empty array when none exist', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <text><body><p>Text</p></body></text>
</TEI>`;

    const doc = loadDocument(xml);
    const relationships = doc.state.relationships;

    expect(relationships).toEqual([]);
  });

  test('state.relationships parses existing <listRelation>', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <standOff>
    <listRelation>
      <relation name="romantic" active="#darcy" passive="#elizabeth"/>
    </listRelation>
  </standOff>
  <text><body><p>Text</p></body></text>
</TEI>`;

    const doc = loadDocument(xml);
    const relationships = doc.state.relationships;

    expect(relationships).toHaveLength(1);
    expect(relationships[0].type).toBe('romantic');
    expect(relationships[0].from).toBe('darcy');
    expect(relationships[0].to).toBe('elizabeth');
  });

  test('addRelationship adds relationship', () => {
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

    let doc = loadDocument(xml);
    const darcy = doc.state.characters.find(c => c.xmlId === 'darcy')!;
    const elizabeth = doc.state.characters.find(c => c.xmlId === 'elizabeth')!;

    doc = addRelationship(doc, {
      from: darcy.id,
      to: elizabeth.id,
      type: 'romantic',
      subtype: 'courtship',
      mutual: false,
    });

    const relationships = doc.state.relationships;
    expect(relationships).toHaveLength(1);
    expect(relationships[0].type).toBe('romantic');
    expect(relationships[0].from).toBe(darcy.id);
    expect(relationships[0].to).toBe(elizabeth.id);
  });

  test('removeRelationship removes relationship by ID', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <standOff>
    <listRelation>
      <relation name="romantic" active="#darcy" passive="#elizabeth"/>
    </listRelation>
  </standOff>
  <text><body><p>Text</p></body></text>
</TEI>`;

    let doc = loadDocument(xml);
    const relationId = doc.state.relationships[0].id;
    doc = removeRelationship(doc, relationId);

    const relationships = doc.state.relationships;
    expect(relationships).toHaveLength(0);
  });

  test('mutual relationships create reciprocal entries', () => {
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

    let doc = loadDocument(xml);
    const darcy = doc.state.characters.find(c => c.xmlId === 'darcy')!;
    const elizabeth = doc.state.characters.find(c => c.xmlId === 'elizabeth')!;

    doc = addRelationship(doc, {
      from: darcy.id,
      to: elizabeth.id,
      type: 'romantic',
      mutual: true,
    });

    const relationships = doc.state.relationships;
    expect(relationships).toHaveLength(2);
    // Both should be marked mutual
    expect(relationships.every(r => r.mutual)).toBe(true);
  });
});
