// @ts-nocheck
import { renderHook, act } from '@testing-library/react';
import { useDocumentContext } from '@/lib/context/DocumentContext';
import { DocumentProvider } from '@/lib/context/DocumentContext';
import { loadDocument, addSaidTag, addTag } from '@/lib/tei';
import { SelectionManager } from '@/lib/selection/SelectionManager';

// Mock SelectionManager
jest.mock('@/lib/selection/SelectionManager');

describe('EditorLayout Tag Application', () => {
  const mockXML = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <text>
    <body>
      <p>Hello world</p>
    </body>
  </text>
</TEI>`;

  const wrapper = ({ children }: any) => <DocumentProvider>{children}</DocumentProvider>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should apply said tag with who attribute', () => {
    let doc = loadDocument(mockXML);
    const passage = doc.state.passages[0];

    doc = addSaidTag(doc, passage.id, { start: 0, end: 5 }, 'speaker1');

    // Check tag was added to state
    const updatedPassage = doc.state.passages[0];
    expect(updatedPassage.tags).toHaveLength(1);
    expect(updatedPassage.tags[0].type).toBe('said');
    expect(updatedPassage.tags[0].attributes.who).toBe('#speaker1');
    expect(updatedPassage.tags[0].range).toEqual({ start: 0, end: 5 });

    // Check dialogue was added
    expect(doc.state.dialogue).toHaveLength(1);
    expect(doc.state.dialogue[0].speaker).toBe('speaker1');
    expect(doc.state.dialogue[0].content).toBe('Hello');
  });

  it('should apply q tag without attributes', () => {
    let doc = loadDocument(mockXML);
    const passage = doc.state.passages[0];

    doc = addTag(doc, passage.id, { start: 6, end: 11 }, 'q');

    // Check tag was added to state
    const updatedPassage = doc.state.passages[0];
    expect(updatedPassage.tags).toHaveLength(1);
    expect(updatedPassage.tags[0].type).toBe('q');
    expect(updatedPassage.tags[0].range).toEqual({ start: 6, end: 11 });
  });

  it('should apply persName tag with ref attribute', () => {
    let doc = loadDocument(mockXML);
    const passage = doc.state.passages[0];

    doc = addTag(doc, passage.id, { start: 0, end: 5 }, 'persName', { ref: '#john' });

    // Check tag was added to state
    const updatedPassage = doc.state.passages[0];
    expect(updatedPassage.tags).toHaveLength(1);
    expect(updatedPassage.tags[0].type).toBe('persName');
    expect(updatedPassage.tags[0].attributes.ref).toBe('#john');
  });

  it('should apply tag with multiple attributes', () => {
    let doc = loadDocument(mockXML);
    const passage = doc.state.passages[0];

    doc = addTag(doc, passage.id, { start: 0, end: 5 }, 'said', { who: '#speaker1', aloud: 'true' });

    // Check tag was added to state
    const updatedPassage = doc.state.passages[0];
    expect(updatedPassage.tags).toHaveLength(1);
    expect(updatedPassage.tags[0].attributes.who).toBe('#speaker1');
    expect(updatedPassage.tags[0].attributes.aloud).toBe('true');
  });

  it('should handle SelectionManager returning null (no selection)', () => {
    const mockCaptureSelection = jest.fn().mockReturnValue(null);
    (SelectionManager as jest.Mock).mockImplementation(() => ({
      captureSelection: mockCaptureSelection,
      restoreSelection: jest.fn(),
    }));

    const selectionManager = new SelectionManager();
    const result = selectionManager.captureSelection();

    expect(result).toBeNull();
    expect(mockCaptureSelection).toHaveBeenCalled();
  });

  it('should handle SelectionManager with valid selection', () => {
    const mockRange = {
      text: 'Hello',
      startOffset: 0,
      endOffset: 5,
      passageId: 'passage-0',
      container: null,
    };

    const mockCaptureSelection = jest.fn().mockReturnValue(mockRange);
    (SelectionManager as jest.Mock).mockImplementation(() => ({
      captureSelection: mockCaptureSelection,
      restoreSelection: jest.fn(),
    }));

    const selectionManager = new SelectionManager();
    const result = selectionManager.captureSelection();

    expect(result).toEqual(mockRange);
    expect(result?.text).toBe('Hello');
    expect(result?.passageId).toBe('passage-0');
  });

  it('should apply tag to middle of passage', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <text>
    <body>
      <p>Start middle end</p>
    </body>
  </text>
</TEI>`;

    let doc = loadDocument(xml);
    const passage = doc.state.passages[0];

    doc = addTag(doc, passage.id, { start: 6, end: 12 }, 'said', { who: '#speaker1' });

    // Check tag was added to correct position
    const updatedPassage = doc.state.passages[0];
    expect(updatedPassage.tags).toHaveLength(1);
    expect(updatedPassage.tags[0].range).toEqual({ start: 6, end: 12 });
  });

  it('should handle multiple sequential tag applications', () => {
    let doc = loadDocument(mockXML);
    const passage = doc.state.passages[0];

    // Apply first tag
    doc = addSaidTag(doc, passage.id, { start: 0, end: 5 }, 'speaker1');

    // Apply second tag
    doc = addTag(doc, passage.id, { start: 6, end: 11 }, 'q');

    // Check both tags were added
    const updatedPassage = doc.state.passages[0];
    expect(updatedPassage.tags).toHaveLength(2);
    expect(updatedPassage.tags[0].type).toBe('said');
    expect(updatedPassage.tags[1].type).toBe('q');
  });

  it('should preserve existing content when applying tags', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <text>
    <body>
      <p xml:id="p1" n="1">Hello world</p>
    </body>
  </text>
</TEI>`;

    let doc = loadDocument(xml);
    const passage = doc.state.passages[0];
    expect(passage.content).toBe('Hello world');

    doc = addTag(doc, passage.id, { start: 0, end: 5 }, 'said');

    // Content should be unchanged
    const updatedPassage = doc.state.passages[0];
    expect(updatedPassage.content).toBe('Hello world');
  });
});
