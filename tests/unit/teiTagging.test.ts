import { getParagraphText, applyTagToParagraph } from '../../lib/utils/teiTagging';

describe('TEI Tagging Utilities', () => {
  describe('getParagraphText', () => {
    it('should extract text from a simple string paragraph', () => {
      const para = 'This is a simple paragraph';
      expect(getParagraphText(para)).toBe('This is a simple paragraph');
    });

    it('should extract text from an object paragraph with #text', () => {
      const para = {
        '#text': 'This is an object paragraph',
        '@id': 'p1',
      };
      expect(getParagraphText(para)).toBe('This is an object paragraph');
    });

    it('should extract text from an object paragraph with nested elements', () => {
      const para = {
        p: ['Before ', { '#text': 'middle', '@tag': 'tagged' }, ' after'],
      };
      expect(getParagraphText(para)).toBe('Before middle after');
    });
  });

  describe('applyTagToParagraph', () => {
    it('should apply a said tag to a simple string paragraph', () => {
      const para = 'Hello world this is a test';
      const selectedText = 'world this';
      const tag = 'said';

      const result = applyTagToParagraph(para, selectedText, tag);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(3);
      expect(result[0]).toBe('Hello ');
      expect(result[1]['#said']).toBe(selectedText);
      expect(result[1]['@_rend']).toBe('plain');
      expect(result[2]).toBe(' is a test');
    });

    it('should apply a tag with custom attributes', () => {
      const para = 'Hello world this is a test';
      const selectedText = 'world';
      const tag = 'persName';
      const attrs = { ref: '#john' };

      const result = applyTagToParagraph(para, selectedText, tag, attrs);

      expect(Array.isArray(result)).toBe(true);
      expect(result[1]['#persName']).toBe(selectedText);
      expect(result[1]['@_ref']).toBe('#john');
    });

    it('should handle text at the beginning of paragraph', () => {
      const para = 'Hello world this is a test';
      const selectedText = 'Hello';
      const tag = 'said';

      const result = applyTagToParagraph(para, selectedText, tag);

      expect(Array.isArray(result)).toBe(true);
      expect(result[0]['#said']).toBe(selectedText);
      expect(result[1]).toBe(' world this is a test');
    });

    it('should handle text at the end of paragraph', () => {
      const para = 'Hello world this is a test';
      const selectedText = 'test';
      const tag = 'said';

      const result = applyTagToParagraph(para, selectedText, tag);

      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toBe('Hello world this is a ');
      expect(result[1]['#said']).toBe(selectedText);
    });

    it('should return original paragraph if text not found', () => {
      const para = 'Hello world this is a test';
      const selectedText = 'not found';
      const tag = 'said';

      const result = applyTagToParagraph(para, selectedText, tag);

      expect(result).toBe(para);
    });

    it('should handle object paragraphs with #text property', () => {
      const para = {
        '#text': 'Hello world this is a test',
        '@id': 'p1',
      };
      const selectedText = 'world';
      const tag = 'said';

      const result = applyTagToParagraph(para, selectedText, tag);

      expect(typeof result).toBe('object');
      expect(result['#text']).toBeDefined();
      expect(Array.isArray(result['#text'])).toBe(true);
      expect(result['@id']).toBe('p1');
      expect(result['#text'][1]['#said']).toBe(selectedText);
    });

    it('should handle mixed content paragraphs', () => {
      const para = {
        p: ['Hello ', { '#text': 'world', '@_tag': 'existing' }, ' this is a test'],
      };
      const selectedText = 'world';
      const tag = 'said';

      const result = applyTagToParagraph(para, selectedText, tag);

      expect(typeof result).toBe('object');
      expect(result['p']).toBeDefined();
      expect(Array.isArray(result['p'])).toBe(true);
      // The tagged element should be in the array
      const saidElement = result['p'].find((item: any) => item && item['#said']);
      expect(saidElement).toBeDefined();
      expect(saidElement['#said']).toBe(selectedText);
    });
  });
});
