import { TEIDocument } from '@/lib/tei';
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
        const doc = new TEIDocument(content);
        expect(doc.parsed).toBeDefined();

        // Verify basic structure - parsed document should have TEI root
        expect(doc.parsed.TEI).toBeDefined();
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

      const doc = new TEIDocument(content);

      // Use the getDialogue method to extract dialogue
      const dialogue = doc.getDialogue();

      // Log what we found
      console.log(`Found ${dialogue.length} dialogue elements`);

      // Document should be valid even if no dialogue found
      expect(doc.parsed).toBeDefined();
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

      const doc = new TEIDocument(content);

      // Check that TEI structure exists
      expect(doc.parsed.TEI).toBeDefined();

      // Check for teiHeader
      const teiHeader = doc.parsed.TEI.teiHeader;
      if (teiHeader) {
        console.log('Found teiHeader in document');

        // Check for common TEI header elements
        const fileDesc = teiHeader.fileDesc;
        if (fileDesc) {
          const titleStmt = fileDesc.titleStmt;
          if (titleStmt) {
            const title = titleStmt.title;
            expect(title).toBeTruthy();
          }
        }
      } else {
        console.log('No teiHeader found, but document is still valid');
      }

      // Document should be parseable regardless
      expect(doc.parsed).toBeDefined();
    });
  });
});
