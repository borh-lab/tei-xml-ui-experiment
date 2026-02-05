// @ts-nocheck
import { loadDocument } from '@/lib/tei';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

describe('Wright American Fiction Integration', () => {
  const fixturesDir = join(__dirname, '../fixtures');
  const wrightDir = join(fixturesDir, 'Wright-American-Fiction');

  describe('Real TEI file parsing', () => {
    test('should parse sample TEI file', () => {
      // Try Wright American Fiction directory first
      let samplesDir = wrightDir;
      let files: string[] = [];

      if (existsSync(samplesDir)) {
        files = readdirSync(samplesDir).filter((f) => f.endsWith('.xml'));
      }

      // Fall back to fixtures root if Wright directory doesn't exist or has no XML files
      if (files.length === 0) {
        samplesDir = fixturesDir;
        const allFiles = readdirSync(samplesDir);
        files = allFiles.filter((f) => f.endsWith('.xml') || f.endsWith('.tei'));
      }

      if (files.length === 0) {
        console.log('No sample TEI files found in fixtures directory');
        return;
      }

      // Test the first available file
      const sampleFile = files[0];
      const filePath = join(samplesDir, sampleFile);
      const content = readFileSync(filePath, 'utf-8');

      expect(() => {
        const doc = loadDocument(content);
        expect(doc.state.parsed).toBeDefined();

        // Verify basic structure - parsed document should have TEI root
        expect(doc.state.parsed.TEI).toBeDefined();
      }).not.toThrow();
    });

    test('should extract dialogue from sample TEI file', () => {
      const samplesDir = existsSync(wrightDir) ? wrightDir : join(__dirname, '../fixtures');
      const files = readdirSync(samplesDir).filter((f) => f.endsWith('.xml') || f.endsWith('.tei'));

      if (files.length === 0) {
        console.log('No sample TEI files found - skipping dialogue extraction test');
        return;
      }

      const sampleFile = files[0];
      const filePath = join(samplesDir, sampleFile);
      const content = readFileSync(filePath, 'utf-8');

      const doc = loadDocument(content);

      // Access dialogue from state
      const dialogue = doc.state.dialogue;

      // Log what we found
      console.log(`Found ${dialogue.length} dialogue elements`);

      // Document should be valid even if no dialogue found
      expect(doc.state.parsed).toBeDefined();
      expect(Array.isArray(dialogue)).toBe(true);
    });

    test('should handle TEI header information', () => {
      const samplesDir = existsSync(wrightDir) ? wrightDir : join(__dirname, '../fixtures');
      const files = readdirSync(samplesDir).filter((f) => f.endsWith('.xml') || f.endsWith('.tei'));

      if (files.length === 0) {
        console.log('No sample TEI files found - skipping header test');
        return;
      }

      const sampleFile = files[0];
      const filePath = join(samplesDir, sampleFile);
      const content = readFileSync(filePath, 'utf-8');

      const doc = loadDocument(content);

      // Verify metadata is extracted
      expect(doc.state.metadata).toBeDefined();
      expect(typeof doc.state.metadata.title).toBe('string');
      expect(typeof doc.state.metadata.author).toBe('string');

      // Log what we found
      console.log(`Title: ${doc.state.metadata.title}`);
      console.log(`Author: ${doc.state.metadata.author}`);
    });

    test('should extract passages from real TEI file', () => {
      const samplesDir = existsSync(wrightDir) ? wrightDir : join(__dirname, '../fixtures');
      const files = readdirSync(samplesDir).filter((f) => f.endsWith('.xml') || f.endsWith('.tei'));

      if (files.length === 0) {
        console.log('No sample TEI files found - skipping passages test');
        return;
      }

      const sampleFile = files[0];
      const filePath = join(samplesDir, sampleFile);
      const content = readFileSync(filePath, 'utf-8');

      const doc = loadDocument(content);

      // Verify passages are extracted
      expect(Array.isArray(doc.state.passages)).toBe(true);
      expect(doc.state.passages.length).toBeGreaterThan(0);

      // Each passage should have required properties
      doc.state.passages.forEach((passage) => {
        expect(passage.id).toBeDefined();
        expect(passage.content).toBeDefined();
        expect(typeof passage.content).toBe('string');
        expect(Array.isArray(passage.tags)).toBe(true);
      });

      console.log(`Found ${doc.state.passages.length} passages`);
    });
  });
});
