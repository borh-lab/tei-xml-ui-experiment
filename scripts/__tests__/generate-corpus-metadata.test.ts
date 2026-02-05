// @ts-nocheck
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { tmpdir } from 'os';
import { join } from 'path';
import { readFileSync, unlinkSync, mkdirSync, rmdirSync, writeFileSync } from 'fs';

describe('generate-corpus-metadata script', () => {
  let tempDir: string;
  let corpusDir: string;
  let outputDir: string;
  let outputFile: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), 'test-corpus-' + Date.now());
    corpusDir = join(tempDir, 'corpus');
    outputDir = join(tempDir, 'output');
    mkdirSync(corpusDir, { recursive: true });
    mkdirSync(outputDir, { recursive: true });
    outputFile = join(outputDir, 'novel-dialogism-analytics.json');
  });

  afterEach(() => {
    try {
      unlinkSync(outputFile);
    } catch {}
    try {
      rmdirSync(outputDir);
      rmdirSync(corpusDir);
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

    writeFileSync(join(corpusDir, 'novel1.tei.xml'), tei1);

    // Import and run the script
    const { generateCorpusMetadata } = await import('../generate-corpus-metadata');
    await generateCorpusMetadata(corpusDir, outputFile);

    // Verify output
    const output = JSON.parse(readFileSync(outputFile, 'utf-8'));
    expect(output.format).toBe('corpus-metadata-v1');
    expect(output.generatedAt).toBeDefined();
    expect(output.novels).toHaveLength(1);
    expect(output.novels[0].filename).toBe('novel1.tei.xml');
    expect(output.novels[0].title).toBe('Novel 1');
    expect(output.novels[0].totalQuotes).toBe(3);
    expect(output.novels[0].uniqueSpeakers).toBe(2);
    expect(output.novels[0].topSpeakers).toHaveLength(2);
    expect(output.novels[0].topSpeakers[0].characterId).toBe('char1');
    expect(output.novels[0].topSpeakers[0].quoteCount).toBe(2);
    expect(output.novels[0].topSpeakers[1].characterId).toBe('char2');
    expect(output.novels[0].topSpeakers[1].quoteCount).toBe(1);
  });

  it('should handle empty corpus directory', async () => {
    const { generateCorpusMetadata } = await import('../generate-corpus-metadata');
    await generateCorpusMetadata(corpusDir, outputFile);

    const output = JSON.parse(readFileSync(outputFile, 'utf-8'));
    expect(output.novels).toHaveLength(0);
  });

  it('should throw error for non-existent corpus directory', async () => {
    const { generateCorpusMetadata } = await import('../generate-corpus-metadata');
    const nonExistentDir = join(tempDir, 'does-not-exist');

    await expect(generateCorpusMetadata(nonExistentDir, outputFile)).rejects.toThrow(
      `Corpus directory does not exist: ${nonExistentDir}`
    );
  });

  it('should handle output file in current directory', async () => {
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
      </p>
    </body>
  </text>
</TEI>`;

    writeFileSync(join(corpusDir, 'novel1.tei.xml'), tei1);

    // Output file without directory (just filename)
    const { generateCorpusMetadata } = await import('../generate-corpus-metadata');
    const outputFileInCurrentDir = join(tempDir, 'output.json');
    await generateCorpusMetadata(corpusDir, outputFileInCurrentDir);

    // Verify file was created
    const output = JSON.parse(readFileSync(outputFileInCurrentDir, 'utf-8'));
    expect(output.format).toBe('corpus-metadata-v1');
    expect(output.novels).toHaveLength(1);

    // Cleanup
    unlinkSync(outputFileInCurrentDir);
  });
});
