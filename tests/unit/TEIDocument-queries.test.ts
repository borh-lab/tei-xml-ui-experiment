import { TEIDocument } from '../../lib/tei/TEIDocument';

describe('TEIDocument Query Methods', () => {
  test('getDivisions should extract div structure', () => {
    const tei = `<TEI xmlns="http://www.tei-c.org/ns/1.0">
      <text><body>
        <div type="volume" n="1">
          <div type="chapter" n="1"><p>Text</p></div>
        </div>
      </body></text>
    </TEI>`;

    const doc = new TEIDocument(tei);
    const divisions = doc.getDivisions();
    expect(divisions).toHaveLength(2);
    expect(divisions[0].type).toBe('volume');
    expect(divisions[0].n).toBe('1');
    expect(divisions[0].depth).toBe(0);
    expect(divisions[1].type).toBe('chapter');
    expect(divisions[1].n).toBe('1');
    expect(divisions[1].depth).toBe(1);
  });

  test('getDialogue should extract said elements', () => {
    const tei = `<TEI xmlns="http://www.tei-c.org/ns/1.0">
      <text><body>
        <p><said who="#jane">Hello</said></p>
        <p><said who="#rochester">Hi</said></p>
      </body></text>
    </TEI>`;

    const doc = new TEIDocument(tei);
    const dialogue = doc.getDialogue();
    expect(dialogue).toHaveLength(2);
    expect(dialogue[0].who).toBe('#jane');
    expect(dialogue[0].content).toBe('Hello');
    expect(dialogue[1].who).toBe('#rochester');
    expect(dialogue[1].content).toBe('Hi');
  });

  test('getDialogue should extract said with direct and aloud attributes', () => {
    const tei = `<TEI xmlns="http://www.tei-c.org/ns/1.0">
      <text><body>
        <p><said who="#jane" direct="true" aloud="true">Hello</said></p>
      </body></text>
    </TEI>`;

    const doc = new TEIDocument(tei);
    const dialogue = doc.getDialogue();
    expect(dialogue).toHaveLength(1);
    expect(dialogue[0].who).toBe('#jane');
    expect(dialogue[0].direct).toBe('true');
    expect(dialogue[0].aloud).toBe('true');
    expect(dialogue[0].content).toBe('Hello');
  });

  test('getDivisions should handle nested divs at different depths', () => {
    const tei = `<TEI xmlns="http://www.tei-c.org/ns/1.0">
      <text><body>
        <div type="volume" n="1">
          <div type="chapter" n="1">
            <div type="section" n="1"><p>Text</p></div>
          </div>
        </div>
      </body></text>
    </TEI>`;

    const doc = new TEIDocument(tei);
    const divisions = doc.getDivisions();
    expect(divisions).toHaveLength(3);
    expect(divisions[0].depth).toBe(0);
    expect(divisions[1].depth).toBe(1);
    expect(divisions[2].depth).toBe(2);
  });

  test('getDialogue should handle empty dialogue', () => {
    const tei = `<TEI xmlns="http://www.tei-c.org/ns/1.0">
      <text><body>
        <p>No dialogue here</p>
      </body></text>
    </TEI>`;

    const doc = new TEIDocument(tei);
    const dialogue = doc.getDialogue();
    expect(dialogue).toHaveLength(0);
  });

  test('getDivisions should handle empty divisions', () => {
    const tei = `<TEI xmlns="http://www.tei-c.org/ns/1.0">
      <text><body>
        <p>No divisions here</p>
      </body></text>
    </TEI>`;

    const doc = new TEIDocument(tei);
    const divisions = doc.getDivisions();
    expect(divisions).toHaveLength(0);
  });
});
