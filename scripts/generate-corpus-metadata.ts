// @ts-nocheck
#!/usr/bin/env bun
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { loadDocument } from '../lib/tei/operations';
import type { CorpusMetadata } from '../lib/analytics/types';

/**
 * Generate corpus metadata from all TEI files in a directory.
 * @param corpusDir - Directory containing TEI files
 * @param outputFile - Output file path for metadata JSON
 */
export async function generateCorpusMetadata(
  corpusDir: string,
  outputFile: string
): Promise<void> {
  // Validate corpus directory exists
  if (!existsSync(corpusDir)) {
    throw new Error(`Corpus directory does not exist: ${corpusDir}`);
  }

  const files = readdirSync(corpusDir)
    .filter(f => f.endsWith('.tei.xml'))
    .sort();

  const novels = [];

  for (const file of files) {
    const filePath = join(corpusDir, file);
    const content = readFileSync(filePath, 'utf-8');

    try {
      const doc = loadDocument(content);

      if (!doc || !doc.state || !doc.state.dialogue) {
        console.warn(`Skipping ${file}: Could not parse or no dialogue found`);
        continue;
      }

      const dialogue = doc.state.dialogue;
      const speakers = new Set<string>();

      // Count quotes per speaker (dialogue with non-null speaker)
      const counts = new Map<string, number>();
      let totalQuotes = 0;

      for (const d of dialogue) {
        if (d.speaker) {
          speakers.add(d.speaker);
          counts.set(d.speaker, (counts.get(d.speaker) || 0) + 1);
          totalQuotes++;
        }
      }

      // Calculate top speakers
      const topSpeakers = Array.from(counts.entries())
        .map(([id, count]) => ({
          characterId: id,
          characterName: id,
          quoteCount: count,
          percent: totalQuotes > 0 ? (count / totalQuotes) * 100 : 0
        }))
        .sort((a, b) => b.quoteCount - a.quoteCount)
        .slice(0, 10);

      novels.push({
        filename: file,
        title: doc.state.metadata?.title || file.replace('.tei.xml', ''),
        totalQuotes,
        uniqueSpeakers: speakers.size,
        topSpeakers
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`Skipping ${file}: ${errorMessage}`);
      continue;
    }
  }

  const metadata: CorpusMetadata = {
    format: 'corpus-metadata-v1',
    generatedAt: new Date().toISOString(),
    novels
  };

  // Ensure output directory exists (handles files in current directory)
  const outputDir = dirname(outputFile);
  if (outputDir && outputDir !== '.') {
    mkdirSync(outputDir, { recursive: true });
  }

  writeFileSync(outputFile, JSON.stringify(metadata, null, 2));
  console.log(`Generated metadata for ${novels.length} novels → ${outputFile}`);
}

// CLI interface
if (import.meta.main) {
  const corpusDir = process.argv[2] || 'corpora/novel-dialogism/';
  const outputFile = process.argv[3] || 'public/metadata/novel-dialogism-analytics.json';

  generateCorpusMetadata(corpusDir, outputFile).catch(err => {
    console.error('Error generating metadata:', err);
    process.exit(1);
  });
}
