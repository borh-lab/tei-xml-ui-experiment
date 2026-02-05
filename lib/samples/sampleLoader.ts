import { loadDocument } from '@/lib/tei/operations';
import type { TEIDocument } from '@/lib/tei/types';

export interface SampleMetadata {
  id: string;
  title: string;
  author: string;
  year: number;
  wordCount: number;
  dialogueCount: number;
  characters: number;
  patterns: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface Sample extends SampleMetadata {
  content: string;
  document: TEIDocument;
}

/**
 * Load a sample TEI document by ID
 * @param sampleId - The unique identifier for the sample (e.g., 'yellow-wallpaper')
 * @returns Promise containing the TEI XML content
 * @throws Error if the sample cannot be loaded
 */
export async function loadSample(sampleId: string): Promise<string> {
  try {
    const response = await fetch(`/samples/${sampleId}.xml`);

    if (!response.ok) {
      throw new Error(`Failed to load sample: ${sampleId} (Status: ${response.status})`);
    }

    const content = await response.text();

    // Validate that it's a TEI document
    if (!content.includes('<?xml') || !content.includes('<TEI')) {
      throw new Error(`Invalid TEI document: ${sampleId}`);
    }

    return content;
  } catch (error) {
    console.error(`Error loading sample ${sampleId}:`, error);
    throw error;
  }
}

/**
 * Load a sample document and parse it into a TEIDocument object
 * @param sampleId - The unique identifier for the sample
 * @returns Promise containing Sample object with metadata and parsed document
 */
export async function loadSampleWithMetadata(sampleId: string): Promise<Sample> {
  const metadata = getSampleMetadata(sampleId);

  if (!metadata) {
    throw new Error(`Sample not found: ${sampleId}`);
  }

  const content = await loadSample(sampleId);
  const document = loadDocument(content);

  return {
    ...metadata,
    content,
    document,
  };
}

/**
 * Get metadata for all available samples
 * @returns Array of sample metadata
 */
export function getSamples(): SampleMetadata[] {
  return [
    {
      id: 'yellow-wallpaper',
      title: 'The Yellow Wallpaper',
      author: 'Charlotte Perkins Gilman',
      year: 1892,
      wordCount: 6000,
      dialogueCount: 15,
      characters: 3,
      patterns: ['first-person', 'indirect-speech', 'internal-monologue'],
      difficulty: 'intermediate',
    },
    {
      id: 'gift-of-the-magi',
      title: 'The Gift of the Magi',
      author: 'O. Henry',
      year: 1905,
      wordCount: 3000,
      dialogueCount: 12,
      characters: 4,
      patterns: ['third-person', 'direct-speech', 'dialogue-heavy'],
      difficulty: 'intermediate',
    },
    {
      id: 'tell-tale-heart',
      title: 'The Tell-Tale Heart',
      author: 'Edgar Allan Poe',
      year: 1843,
      wordCount: 2000,
      dialogueCount: 8,
      characters: 3,
      patterns: ['first-person', 'unreliable-narrator', 'internal-monologue'],
      difficulty: 'advanced',
    },
    {
      id: 'owl-creek-bridge',
      title: 'An Occurrence at Owl Creek Bridge',
      author: 'Ambrose Bierce',
      year: 1890,
      wordCount: 3000,
      dialogueCount: 10,
      characters: 5,
      patterns: ['third-person', 'direct-speech', 'narrative-shift'],
      difficulty: 'intermediate',
    },
    {
      id: 'pride-prejudice-ch1',
      title: 'Pride and Prejudice - Chapter 1',
      author: 'Jane Austen',
      year: 1813,
      wordCount: 5000,
      dialogueCount: 20,
      characters: 3,
      patterns: ['third-person', 'direct-speech', 'dialogue-heavy', 'wit'],
      difficulty: 'intermediate',
    },
  ];
}

/**
 * Get metadata for a specific sample
 * @param sampleId - The unique identifier for the sample
 * @returns Sample metadata or undefined if not found
 */
export function getSampleMetadata(sampleId: string): SampleMetadata | undefined {
  return getSamples().find((sample) => sample.id === sampleId);
}

/**
 * Validate if a sample exists
 * @param sampleId - The unique identifier for the sample
 * @returns true if the sample exists, false otherwise
 */
export function sampleExists(sampleId: string): boolean {
  return getSamples().some((sample) => sample.id === sampleId);
}
