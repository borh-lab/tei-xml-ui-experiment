import {
  loadSample,
  loadSampleWithMetadata,
  getSamples,
  getSampleMetadata,
  sampleExists
} from '@/lib/samples/sampleLoader';
import { TEIDocument } from '@/lib/tei';

// Mock fetch for testing
global.fetch = jest.fn();

describe('Sample Loader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loadSample', () => {
    it('should load sample TEI content', async () => {
      const mockContent = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <text>
    <body>
      <p>"Hello," she said.</p>
    </body>
  </text>
</TEI>`;

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        text: async () => mockContent
      } as Response);

      const content = await loadSample('yellow-wallpaper');

      expect(content).toContain('<?xml');
      expect(content).toContain('<TEI');
      expect(global.fetch).toHaveBeenCalledWith('/samples/yellow-wallpaper.xml');
    });

    it('should throw error for failed fetch', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 404
      } as Response);

      await expect(loadSample('invalid-sample')).rejects.toThrow('Failed to load sample');
    });

    it('should throw error for invalid TEI document', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        text: async () => 'Invalid content'
      } as Response);

      await expect(loadSample('invalid-tei')).rejects.toThrow('Invalid TEI document');
    });
  });

  describe('loadSampleWithMetadata', () => {
    it('should load sample with metadata and parsed document', async () => {
      const mockContent = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader>
    <fileDesc>
      <titleStmt>
        <title>The Yellow Wallpaper</title>
        <author>Charlotte Perkins Gilman</author>
      </titleStmt>
    </fileDesc>
  </teiHeader>
  <text>
    <body>
      <p>"Hello," she said.</p>
    </body>
  </text>
</TEI>`;

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        text: async () => mockContent
      } as Response);

      const sample = await loadSampleWithMetadata('yellow-wallpaper');

      expect(sample.id).toBe('yellow-wallpaper');
      expect(sample.title).toBe('The Yellow Wallpaper');
      expect(sample.author).toBe('Charlotte Perkins Gilman');
      expect(sample.content).toContain('<?xml');
      expect(sample.document).toBeInstanceOf(TEIDocument);
    });
  });

  describe('getSamples', () => {
    it('should return all sample metadata', () => {
      const samples = getSamples();

      expect(samples).toHaveLength(5);
      expect(samples[0].id).toBe('yellow-wallpaper');
      expect(samples[0].title).toBe('The Yellow Wallpaper');
    });

    it('should include all required metadata fields', () => {
      const samples = getSamples();

      samples.forEach(sample => {
        expect(sample).toHaveProperty('id');
        expect(sample).toHaveProperty('title');
        expect(sample).toHaveProperty('author');
        expect(sample).toHaveProperty('year');
        expect(sample).toHaveProperty('wordCount');
        expect(sample).toHaveProperty('dialogueCount');
        expect(sample).toHaveProperty('characters');
        expect(sample).toHaveProperty('patterns');
        expect(sample).toHaveProperty('difficulty');
      });
    });

    it('should have valid difficulty levels', () => {
      const samples = getSamples();
      const validDifficulties = ['beginner', 'intermediate', 'advanced'];

      samples.forEach(sample => {
        expect(validDifficulties).toContain(sample.difficulty);
      });
    });
  });

  describe('getSampleMetadata', () => {
    it('should return metadata for existing sample', () => {
      const metadata = getSampleMetadata('yellow-wallpaper');

      expect(metadata).toBeDefined();
      expect(metadata?.id).toBe('yellow-wallpaper');
      expect(metadata?.title).toBe('The Yellow Wallpaper');
    });

    it('should return undefined for non-existing sample', () => {
      const metadata = getSampleMetadata('non-existent');
      expect(metadata).toBeUndefined();
    });
  });

  describe('sampleExists', () => {
    it('should return true for existing samples', () => {
      expect(sampleExists('yellow-wallpaper')).toBe(true);
      expect(sampleExists('gift-of-the-magi')).toBe(true);
      expect(sampleExists('tell-tale-heart')).toBe(true);
      expect(sampleExists('owl-creek-bridge')).toBe(true);
      expect(sampleExists('pride-prejudice-ch1')).toBe(true);
    });

    it('should return false for non-existing samples', () => {
      expect(sampleExists('non-existent')).toBe(false);
      expect(sampleExists('')).toBe(false);
    });
  });
});
