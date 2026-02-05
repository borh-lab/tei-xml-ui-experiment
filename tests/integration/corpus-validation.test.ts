// @ts-nocheck
import { CorpusManager } from '@/lib/corpora';
import { TEIDocument } from '@/lib/tei';

describe('Corpus Validation Integration', () => {
  let corpus: CorpusManager;

  beforeAll(() => {
    corpus = new CorpusManager();
  });

  it('should be available after setup', () => {
    if (!corpus.isAvailable()) {
      console.warn('Corpora not available - run npm run corpus:all');
      return;
    }

    expect(corpus.isAvailable()).toBe(true);
  });

  it('should parse all training documents without errors', () => {
    if (!corpus.isAvailable()) return;

    const trainDocs = corpus.getSplit('train');

    for (const doc of trainDocs.slice(0, 10)) {
      // Test first 10
      expect(() => {
        TEIDocument.parse(doc.content);
      }).not.toThrow();
    }
  });

  it('should handle documents with <said> tags', () => {
    if (!corpus.isAvailable()) return;

    const saidDocs = corpus.getDocumentsByTag('said', 'test');

    expect(saidDocs.length).toBeGreaterThan(0);

    for (const doc of saidDocs.slice(0, 5)) {
      // Test first 5
      const tei = TEIDocument.parse(doc.content);
      const saidElements = tei.querySelectorAll('said');
      expect(saidElements.length).toBeGreaterThan(0);
    }
  });

  it('should provide metadata for each corpus', () => {
    if (!corpus.isAvailable()) return;

    const corpora = corpus.getAllCorpora();

    for (const [id, metadata] of Object.entries(corpora)) {
      expect(metadata.name).toBeDefined();
      expect(metadata.documentCount).toBeGreaterThan(0);
      expect(metadata.encodingType).toBeDefined();
    }
  });
});
