// lib/navigation/__tests__/urlUtils.test.ts
import { parseDocId, buildDocUrl, buildCorpusUrl } from '../urlUtils';
import { ReadonlyURLSearchParams } from 'next/navigation';

describe('urlUtils', () => {
  describe('parseDocId', () => {
    it('returns doc ID from URL params', () => {
      const params = new ReadonlyURLSearchParams('?doc=sample-dialogism-1');
      expect(parseDocId(params)).toBe('sample-dialogism-1');
    });

    it('returns null when doc param is missing', () => {
      const params = new ReadonlyURLSearchParams('?foo=bar');
      expect(parseDocId(params)).toBeNull();
    });

    it('returns null when doc param is empty', () => {
      const params = new ReadonlyURLSearchParams('?doc=');
      expect(parseDocId(params)).toBeNull();
    });

    it('handles URL-encoded values', () => {
      const params = new ReadonlyURLSearchParams('?doc=corpus-wright%2Fbeyond-the-glass');
      expect(parseDocId(params)).toBe('corpus-wright/beyond-the-glass');
    });

    it('returns null for empty search params', () => {
      const params = new ReadonlyURLSearchParams('');
      expect(parseDocId(params)).toBeNull();
    });
  });

  describe('buildDocUrl', () => {
    it('builds URL for editor with doc param', () => {
      expect(buildDocUrl('sample-dialogism-1')).toBe('/?doc=sample-dialogism-1');
    });

    it('builds URL for corpus doc', () => {
      expect(buildDocUrl('corpus-wright/glass')).toBe('/?doc=corpus-wright%2Fglass');
    });

    it('builds URL for uploaded doc', () => {
      expect(buildDocUrl('uploaded-abc123')).toBe('/?doc=uploaded-abc123');
    });
  });

  describe('buildCorpusUrl', () => {
    it('builds corpus URL with optional doc param', () => {
      expect(buildCorpusUrl('sample-dialogism-1')).toBe('/corpus?doc=sample-dialogism-1');
    });

    it('builds corpus URL without doc param', () => {
      expect(buildCorpusUrl(null)).toBe('/corpus');
    });
  });
});
