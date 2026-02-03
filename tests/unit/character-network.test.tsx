import { TEIDocument } from '@/lib/tei';

const mockXML = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <text>
    <body>
      <p>
        <said who="#jane">Hello</said>
        <said who="#rochester">Hi there</said>
        <said who="#jane">How are you?</said>
      </p>
    </body>
  </text>
</TEI>`;

describe('CharacterNetwork', () => {
  test('should extract characters from dialogue', () => {
    const teiDocument = new TEIDocument(mockXML);
    const dialogue = teiDocument.getDialogue();

    expect(dialogue).toHaveLength(3);
    expect(dialogue[0].who).toBe('#jane');
    expect(dialogue[1].who).toBe('#rochester');
  });

  test('should build correct node count', () => {
    const teiDocument = new TEIDocument(mockXML);
    const dialogue = teiDocument.getDialogue();
    const speakerMap = new Map<string, number>();

    dialogue.forEach((d) => {
      if (d.who) {
        const count = speakerMap.get(d.who) || 0;
        speakerMap.set(d.who, count + 1);
      }
    });

    expect(speakerMap.size).toBe(2);
    expect(speakerMap.get('#jane')).toBe(2);
    expect(speakerMap.get('#rochester')).toBe(1);
  });

  test('should calculate interaction weights', () => {
    const teiDocument = new TEIDocument(mockXML);
    const dialogue = teiDocument.getDialogue();
    const interactions = new Map<string, number>();

    // Track interactions between speakers
    for (let i = 0; i < dialogue.length - 1; i++) {
      const current = dialogue[i];
      const next = dialogue[i + 1];

      if (current.who && next.who && current.who !== next.who) {
        const key = `${current.who}-${next.who}`;
        const count = interactions.get(key) || 0;
        interactions.set(key, count + 1);
      }
    }

    expect(interactions.size).toBe(2);
    expect(interactions.get('#jane-#rochester')).toBe(1);
    expect(interactions.get('#rochester-#jane')).toBe(1);
  });
});
