// @ts-nocheck
// @ts-nocheck
import { CorpusDataSource, DocumentId, type CorpusId } from '../protocols/CorpusDataSource';

describe('CorpusDataSource Protocol', () => {
  it('should define DocumentId class', () => {
    const docId = new DocumentId({
      corpus: 'wright-american-fiction',
      path: 'novels/test.xml'
    });

    expect(docId.corpus).toBe('wright-american-fiction');
    expect(docId.path).toBe('novels/test.xml');
    expect(docId).toBeInstanceOf(DocumentId);
  });

  it('should have CorpusDataSource context tag', () => {
    expect(CorpusDataSource.key).toBe('@app/CorpusDataSource');
  });
});
