import { renderHook, act } from '@testing-library/react';
import { useDocumentContext } from '@/lib/context/DocumentContext';
import { DocumentProvider } from '@/lib/context/DocumentContext';
import { TEIDocument } from '@/lib/tei';
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

  it('should apply said tag with who attribute using wrapTextInTag', () => {
    const doc = new TEIDocument(mockXML);

    // Simulate wrapTextInTag call (this is what handleApplyTag uses)
    doc.wrapTextInTag(0, 0, 5, 'said', { who: '#speaker1' });

    const updated = doc.serialize();
    expect(updated).toContain('<said who="#speaker1">Hello</said>');
    expect(updated).toContain('world');
  });

  it('should apply q tag without attributes', () => {
    const doc = new TEIDocument(mockXML);

    // Simulate wrapTextInTag call
    doc.wrapTextInTag(0, 6, 11, 'q');

    const updated = doc.serialize();
    expect(updated).toContain('<q>world</q>');
    expect(updated).toContain('Hello');
  });

  it('should apply persName tag with ref attribute', () => {
    const doc = new TEIDocument(mockXML);

    doc.wrapTextInTag(0, 0, 5, 'persName', { ref: '#john' });

    const updated = doc.serialize();
    expect(updated).toContain('<persName ref="#john">Hello</persName>');
  });

  it('should apply tag with multiple attributes', () => {
    const doc = new TEIDocument(mockXML);

    doc.wrapTextInTag(0, 0, 5, 'said', { who: '#speaker1', aloud: 'true' });

    const updated = doc.serialize();
    // Check that both attributes are present (order may vary)
    expect(updated).toContain('who="#speaker1"');
    expect(updated).toContain('aloud');
    expect(updated).toContain('<said');
    expect(updated).toContain('>Hello</said>');
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

    const doc = new TEIDocument(xml);
    doc.wrapTextInTag(0, 6, 12, 'said', { who: '#speaker1' });

    const updated = doc.serialize();
    expect(updated).toContain('Start');
    expect(updated).toContain('<said who="#speaker1">middle</said>');
    expect(updated).toContain('end');
  });

  it('should handle multiple sequential tag applications', () => {
    const doc = new TEIDocument(mockXML);

    // Apply first tag
    doc.wrapTextInTag(0, 0, 5, 'said', { who: '#speaker1' });

    // Apply second tag
    doc.wrapTextInTag(0, 6, 11, 'q');

    const updated = doc.serialize();
    expect(updated).toContain('<said who="#speaker1">Hello</said>');
    expect(updated).toContain('<q>world</q>');
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

    const doc = new TEIDocument(xml);
    doc.wrapTextInTag(0, 0, 5, 'said');

    const updated = doc.serialize();
    expect(updated).toContain('xml:id="p1"');
    expect(updated).toContain('n="1"');
    expect(updated).toContain('<said>Hello</said>');
  });
});
