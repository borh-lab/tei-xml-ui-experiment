import { createSelection, extractContext } from '@/lib/values/Selection';

describe('Selection value', () => {
  it('should create a valid Selection', () => {
    const selection = createSelection(
      'passage-123',
      { start: 10, end: 20 },
      'selected text',
      'context before selected text context after'
    );
    expect(selection.text).toBe('selected text');
  });

  it('should extract context from passage', () => {
    const fullText = 'Start of passage. Selected text here. End of passage.';
    const range = { start: 20, end: 37 };
    const context = extractContext(fullText, range, 10);
    expect(context).toContain('Selected text here');
  });
});
