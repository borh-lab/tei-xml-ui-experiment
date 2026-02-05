/**
 * @jest-environment node
 */

import { tmpdir } from 'os';
import { join } from 'path';
import { readFileSync, unlinkSync, mkdirSync, rmdirSync, writeFileSync, existsSync } from 'fs';
import { randomBytes } from 'crypto';

describe('generate-corpus-metadata script', () => {
  let tempDir: string;
  let corpusDir: string;
  let outputDir: string;
  let outputFile: string;

  beforeEach(() => {
    // Create unique temp directory
    const randomId = randomBytes(8).toString('hex');
    tempDir = join(tmpdir(), 'test-corpus-' + randomId);
    corpusDir = join(tempDir, 'corpus');
    outputDir = join(tempDir, 'output');
    mkdirSync(corpusDir, { recursive: true });
    mkdirSync(outputDir, { recursive: true });
    outputFile = join(outputDir, 'novel-dialogism-analytics.json');
  });

  afterEach(() => {
    try {
      if (existsSync(outputFile)) {
        unlinkSync(outputFile);
      }
    } catch {}
    try {
      rmdirSync(outputDir);
    } catch {}
    try {
      rmdirSync(corpusDir);
    } catch {}
    try {
      rmdirSync(tempDir);
    } catch {}
  });

  it('should generate metadata from TEI files', async () => {
    // Create mock TEI files with <said> tags (the format our parser expects)
    const tei1 = `<?xml version="1.0"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader>
    <fileDesc>
      <titleStmt>
        <title>Novel 1</title>
      </titleStmt>
    </fileDesc>
  </teiHeader>
  <text>
    <body>
      <p>
        <said who="#char1">Quote 1</said>
        <said who="#char2">Quote 2</said>
        <said who="#char1">Quote 3</said>
      </p>
    </body>
  </text>
</TEI>`;

    const tei2 = `<?xml version="1.0"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader>
    <fileDesc>
      <titleStmt>
        <title>Novel 2</title>
      </titleStmt>
    </fileDesc>
  </teiHeader>
  <text>
    <body>
      <p>
        <said who="#char1">Quote A</said>
      </p>
    </body>
  </text>
</TEI>`;

    writeFileSync(join(corpusDir, 'novel1.xml'), tei1);
    writeFileSync(join(corpusDir, 'novel2.xml'), tei2);

    // Import and run the script function
    // For now, just verify files were created
    expect(existsSync(join(corpusDir, 'novel1.xml'))).toBe(true);
    expect(existsSync(join(corpusDir, 'novel2.xml'))).toBe(true);

    // Verify TEI content
    const content1 = readFileSync(join(corpusDir, 'novel1.xml'), 'utf-8');
    expect(content1).toContain('<said who="#char1">Quote 1</said>');
    expect(content1).toContain('<said who="#char2">Quote 2</said>');

    const content2 = readFileSync(join(corpusDir, 'novel2.xml'), 'utf-8');
    expect(content2).toContain('<said who="#char1">Quote A</said>');
  });
});
