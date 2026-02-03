/**
 * Sample Manager
 *
 * Provides sample TEI documents for learning and testing.
 * Samples are loaded as TEI XML strings.
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Sample metadata
 */
export interface Sample {
  readonly id: string;
  readonly title: string;
  readonly author: string;
  readonly year: number;
  readonly wordCount: number;
  readonly dialogueCount: number;
  readonly characters: number; // Number of characters in the story
  readonly difficulty: 'beginner' | 'intermediate' | 'advanced';
  readonly tags: readonly string[];
  readonly description?: string;
}

/**
 * Sample loading result
 */
export interface SampleLoadResult {
  readonly sample: Sample;
  readonly content: string;
}

// ============================================================================
// Sample Database
// ============================================================================

/**
 * Available samples
 *
 * Each sample represents a literary work with TEI markup for dialogue and characters.
 */
export const SAMPLES: readonly Sample[] = [
  {
    id: 'yellow-wallpaper',
    title: 'The Yellow Wallpaper',
    author: 'Charlotte Perkins Gilman',
    year: 1892,
    wordCount: 6000,
    dialogueCount: 15,
    characters: 3,
    difficulty: 'intermediate',
    tags: ['short-story', 'first-person', 'indirect-speech', 'internal-monologue'],
    description:
      'A semiautobiographical short story about a woman descending into psychosis while confined to her bedroom.',
  },
  {
    id: 'gift-of-the-magi',
    title: 'The Gift of the Magi',
    author: 'O. Henry',
    year: 1905,
    wordCount: 4500,
    dialogueCount: 25,
    characters: 4,
    difficulty: 'beginner',
    tags: ['short-story', 'third-person', 'direct-speech', 'dialogue-heavy', 'irony'],
    description:
      'A classic short story about a young couple who sacrifice their most prized possessions to buy Christmas gifts for each other.',
  },
  {
    id: 'tell-tale-heart',
    title: 'The Tell-Tale Heart',
    author: 'Edgar Allan Poe',
    year: 1843,
    wordCount: 2000,
    dialogueCount: 8,
    characters: 3,
    difficulty: 'advanced',
    tags: ['short-story', 'first-person', 'unreliable-narrator', 'internal-monologue'],
    description:
      'A psychological thriller about an unreliable narrator who insists on their sanity while describing a murder.',
  },
  {
    id: 'owl-creek-bridge',
    title: 'An Occurrence at Owl Creek Bridge',
    author: 'Ambrose Bierce',
    year: 1890,
    wordCount: 3000,
    dialogueCount: 10,
    characters: 5,
    difficulty: 'intermediate',
    tags: ['short-story', 'third-person', 'direct-speech', 'narrative-shift'],
    description:
      'A short story about a man who escapes execution by hanging, only to reveal a surprising twist ending.',
  },
  {
    id: 'pride-prejudice-ch1',
    title: 'Pride and Prejudice - Chapter 1',
    author: 'Jane Austen',
    year: 1813,
    wordCount: 5000,
    dialogueCount: 20,
    characters: 3,
    difficulty: 'intermediate',
    tags: ['novel', 'third-person', 'direct-speech', 'dialogue-heavy', 'wit'],
    description:
      'The opening chapter of Jane Austen\'s classic novel, featuring the famous opening line and witty banter between Mr. and Mrs. Bennet.',
  },
] as const;

// ============================================================================
// Sample Loading
// ============================================================================

/**
 * Load sample by ID
 *
 * In production, this would load from public/samples/{id}.xml.
 * For now, returns a placeholder TEI document structure.
 *
 * @param sampleId - Sample ID to load
 * @returns Sample content as TEI XML string
 * @throws Error if sample not found
 */
export async function loadSample(sampleId: string): Promise<string> {
  const sample = SAMPLES.find((s) => s.id === sampleId);
  if (!sample) {
    throw new Error(`Sample not found: ${sampleId}`);
  }

  // Try to fetch from public/samples/{id}.xml
  try {
    const response = await fetch(`/samples/${sampleId}.xml`);
    if (response.ok) {
      return await response.text();
    }
  } catch (e) {
    // Fetch failed, fall back to placeholder
    console.warn(`Failed to load sample from /samples/${sampleId}.xml:`, e);
  }

  // Return placeholder TEI document
  return createPlaceholderTEI(sample);
}

/**
 * Create a placeholder TEI document for a sample
 *
 * This is used when the actual sample file is not available.
 */
function createPlaceholderTEI(sample: Sample): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader>
    <fileDesc>
      <titleStmt>
        <title>${sample.title}</title>
        <author>${sample.author}</author>
      </titleStmt>
      <publicationStmt>
        <p>${sample.year}</p>
      </publicationStmt>
      <sourceDesc>
        <p>Sample TEI document for educational purposes</p>
      </sourceDesc>
    </fileDesc>
  </teiHeader>
  <text>
    <body>
      <p>
        This is a placeholder for "${sample.title}" by ${sample.author} (${sample.year}).
        <!-- In production, this would contain the actual text with TEI markup -->
      </p>
    </body>
  </text>
</TEI>`;
}

// ============================================================================
// Sample Queries
// ============================================================================

/**
 * Get sample by ID
 *
 * @param sampleId - Sample ID
 * @returns Sample or null if not found
 */
export function getSample(sampleId: string): Sample | null {
  return SAMPLES.find((s) => s.id === sampleId) || null;
}

/**
 * Get all samples
 *
 * @returns All available samples
 */
export function getAllSamples(): readonly Sample[] {
  return SAMPLES;
}

/**
 * Get samples by difficulty
 *
 * @param difficulty - Difficulty level
 * @returns Samples matching the difficulty level
 */
export function getSamplesByDifficulty(
  difficulty: Sample['difficulty']
): readonly Sample[] {
  return SAMPLES.filter((s) => s.difficulty === difficulty);
}

/**
 * Get samples by tag
 *
 * @param tag - Tag to filter by
 * @returns Samples with the specified tag
 */
export function getSamplesByTag(tag: string): readonly Sample[] {
  return SAMPLES.filter((s) => s.tags.includes(tag));
}

/**
 * Search samples by query
 *
 * @param query - Search query (matches title, author, description)
 * @returns Samples matching the query
 */
export function searchSamples(query: string): readonly Sample[] {
  const lowerQuery = query.toLowerCase();
  return SAMPLES.filter(
    (s) =>
      s.title.toLowerCase().includes(lowerQuery) ||
      s.author.toLowerCase().includes(lowerQuery) ||
      s.description?.toLowerCase().includes(lowerQuery) ||
      s.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
  );
}
