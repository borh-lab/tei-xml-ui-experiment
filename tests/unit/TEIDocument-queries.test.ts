// @ts-nocheck
import { loadDocument } from '@/lib/tei';

describe('TEIDocument Query Methods', () => {
  test('state.dialogue should extract said elements', () => {
    const tei = `<TEI xmlns="http://www.tei-c.org/ns/1.0">
      <text><body>
        <p><said who="#jane">Hello</said></p>
        <p><said who="#rochester">Hi</said></p>
      </body></text>
    </TEI>`;

    const doc = loadDocument(tei);
    const dialogue = doc.state.dialogue;
    expect(dialogue).toHaveLength(2);
    expect(dialogue[0].speaker).toBe('jane');
    expect(dialogue[0].content).toBe('Hello');
    expect(dialogue[1].speaker).toBe('rochester');
    expect(dialogue[1].content).toBe('Hi');
  });

  test('state.dialogue should handle empty dialogue', () => {
    const tei = `<TEI xmlns="http://www.tei-c.org/ns/1.0">
      <text><body>
        <p>No dialogue here</p>
      </body></text>
    </TEI>`;

    const doc = loadDocument(tei);
    const dialogue = doc.state.dialogue;
    expect(dialogue).toHaveLength(0);
  });

  test('state.passages should extract passages', () => {
    const tei = `<TEI xmlns="http://www.tei-c.org/ns/1.0">
      <text><body>
        <p>First paragraph</p>
        <p>Second paragraph</p>
      </body></text>
    </TEI>`;

    const doc = loadDocument(tei);
    const passages = doc.state.passages;
    expect(passages).toHaveLength(2);
    expect(passages[0].content).toBe('First paragraph');
    expect(passages[1].content).toBe('Second paragraph');
  });

  test('state.passages should handle empty passages', () => {
    const tei = `<TEI xmlns="http://www.tei-c.org/ns/1.0">
      <text><body>
      </body></text>
    </TEI>`;

    const doc = loadDocument(tei);
    const passages = doc.state.passages;
    expect(passages).toHaveLength(0);
  });
});
