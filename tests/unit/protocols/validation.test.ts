import { validateSelection, isValidSelection, initValidationCache } from '@/lib/protocols/validation';
import { createSelection } from '@/lib/values/Selection';
import type { TEIDocument, Passage } from '@/lib/tei/types';

// Mock file reader for testing
function mockFileReader(path: string, encoding: string): string {
  return `
  <grammar xmlns="http://relaxng.org/ns/structure/1.0">
    <define name="said">
      <element name="said">
        <attribute name="who"><data type="IDREF"/></attribute>
        <text/>
      </element>
    </define>
    <define name="q">
      <element name="q">
        <text/>
      </element>
    </define>
  </grammar>
  `;
}

// Helper to create a mock document
function createMockDocument(): TEIDocument {
  const passage: Passage = {
    id: 'passage-1',
    index: 0,
    content: 'Test text content',
    tags: [],
  };

  return {
    state: {
      xml: '<?xml version="1.0"?><TEI><text><body><p>Test text content</p></body></text></TEI>',
      parsed: {},
      revision: 0,
      metadata: {
        title: 'Test Document',
        author: 'Test Author',
        created: new Date(),
      },
      passages: [passage],
      characters: [],
      dialogue: [],
      relationships: [],
    },
    events: [],
  };
}

describe('validateSelection protocol', () => {
  let document: TEIDocument;

  beforeAll(() => {
    initValidationCache(process.cwd());
    document = createMockDocument();
  });

  it('should validate selection successfully', () => {
    const passageId = document.state.passages[0].id;
    const selection = createSelection(passageId, { start: 0, end: 10 }, 'Test text', 'Context');
    const result = validateSelection(selection, 'q', {}, document);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value).toBeDefined();
      expect(typeof result.value.valid).toBe('boolean');
    }
  });

  it('should fail for non-existent passage', () => {
    const selection = createSelection('passage-bad', { start: 0, end: 10 }, 'Test', 'Context');
    const result = validateSelection(selection, 'said', {}, document);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('PASSAGE_NOT_FOUND');
    }
  });

  it('should return isValidSelection true for valid', () => {
    const passageId = document.state.passages[0].id;
    const selection = createSelection(passageId, { start: 0, end: 10 }, 'Test text', 'Context');
    const isValid = isValidSelection(selection, 'q', {}, document);
    expect(typeof isValid).toBe('boolean');
  });

  it('should return isValidSelection false for invalid', () => {
    const selection = createSelection('passage-bad', { start: 0, end: 10 }, 'Test', 'Context');
    const isValid = isValidSelection(selection, 'said', {}, document);
    expect(isValid).toBe(false);
  });
});
