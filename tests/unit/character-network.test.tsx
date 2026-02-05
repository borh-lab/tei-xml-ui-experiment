// @ts-nocheck
import { loadDocument } from '@/lib/tei';

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

describe('CharacterNetwork data extraction', () => {
  test('should extract characters from dialogue', () => {
    const doc = loadDocument(mockXML);
    const dialogue = doc.state.dialogue;

    expect(dialogue).toHaveLength(3);
    expect(dialogue[0].speaker).toBe('jane');
    expect(dialogue[1].speaker).toBe('rochester');
    expect(dialogue[2].speaker).toBe('jane');
  });

  test('should build correct node count', () => {
    const doc = loadDocument(mockXML);
    const dialogue = doc.state.dialogue;
    const speakerMap = new Map<string, number>();

    dialogue.forEach((d) => {
      if (d.speaker) {
        const count = speakerMap.get(d.speaker) || 0;
        speakerMap.set(d.speaker, count + 1);
      }
    });

    expect(speakerMap.size).toBe(2);
    expect(speakerMap.get('jane')).toBe(2);
    expect(speakerMap.get('rochester')).toBe(1);
  });

  test('should calculate interaction weights', () => {
    const doc = loadDocument(mockXML);
    const dialogue = doc.state.dialogue;
    const interactions = new Map<string, number>();

    // Track interactions between speakers
    for (let i = 0; i < dialogue.length - 1; i++) {
      const current = dialogue[i];
      const next = dialogue[i + 1];

      if (current.speaker && next.speaker && current.speaker !== next.speaker) {
        const key = `${current.speaker}-${next.speaker}`;
        const count = interactions.get(key) || 0;
        interactions.set(key, count + 1);
      }
    }

    expect(interactions.size).toBe(2);
    expect(interactions.get('jane-rochester')).toBe(1);
    expect(interactions.get('rochester-jane')).toBe(1);
  });

  test('should handle dialogue with missing speaker info', () => {
    const xmlWithMissingSpeaker = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <text>
    <body>
      <p>
        <said>Hello</said>
        <said who="#jane">Hi</said>
      </p>
    </body>
  </text>
</TEI>`;

    const doc = loadDocument(xmlWithMissingSpeaker);
    const dialogue = doc.state.dialogue;

    expect(dialogue).toHaveLength(2);
    expect(dialogue[0].speaker).toBeNull();
    expect(dialogue[1].speaker).toBe('jane');
  });
});
