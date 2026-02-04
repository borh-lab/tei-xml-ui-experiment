/**
 * Pattern Manager
 *
 * Value-oriented pattern database for speaker attribution patterns.
 * All operations are pure functions that return new values.
 */

import type { PatternDatabase, SpeakerPattern } from './types';

// ============================================================================
// Default Patterns
// ============================================================================

/**
 * Default speaker patterns (built-in)
 *
 * These patterns match common dialogue attribution formats in English prose:
 * - Direct attribution: "Hello," she said.
 * - Inverted attribution: John replied, "..."
 * - Question format: "What?" asked Mary.
 */
const DEFAULT_PATTERNS: readonly SpeakerPattern[] = [
  {
    id: 'said-she',
    name: 'Narrator (she)',
    patterns: ['"([^"]+)",\\s*she\\s+said', 'she\\s+said(?:,\\s*"?[^"]*"?)?'],
    confidence: 0.9,
  },
  {
    id: 'said-he',
    name: 'Narrator (he)',
    patterns: ['"([^"]+)",\\s*he\\s+said', 'he\\s+said(?:,\\s*"?[^"]*"?)?'],
    confidence: 0.9,
  },
  {
    id: 'said-they',
    name: 'Narrator (they)',
    patterns: ['"([^"]+)",\\s*they\\s+said', 'they\\s+said(?:,\\s*"?[^"]*"?)?'],
    confidence: 0.85,
  },
  {
    id: 'inverted-said',
    name: 'Speaker after quotation',
    patterns: [
      '"([^"]+)",\\s*(said|replied|asked|answered|called|exclaimed|whispered|muttered)\\s+([A-Z][a-z]+)',
    ],
    confidence: 0.85,
  },
  {
    id: 'question-format',
    name: 'Question attribution',
    patterns: ['"([^"]+?)\\?"\\s*(?:asked|queried|questioned)\\s+([A-Z][a-z]+)'],
    confidence: 0.8,
  },
  {
    id: 'exclamation-format',
    name: 'Exclamation attribution',
    patterns: ['"([^"]+!)\\s*(?:cried|shouted|yelled|screamed)\\s+([A-Z][a-z]+)'],
    confidence: 0.8,
  },
] as const;

// ============================================================================
// Pattern Database Operations
// ============================================================================

/**
 * Pure function: Create pattern database
 *
 * Creates a new pattern database with default patterns plus any custom patterns.
 *
 * @param patterns - Optional custom patterns to add
 * @returns New pattern database
 */
export function createPatternDatabase(patterns: readonly SpeakerPattern[] = []): PatternDatabase {
  return {
    patterns: [...DEFAULT_PATTERNS, ...patterns],
    lastUpdated: new Date(),
  };
}

/**
 * Pure function: Add pattern to database
 *
 * @param db - Current pattern database
 * @param pattern - Pattern to add
 * @returns New pattern database with added pattern
 */
export function addPattern(db: PatternDatabase, pattern: SpeakerPattern): PatternDatabase {
  // Check for duplicate ID
  if (db.patterns.some((p) => p.id === pattern.id)) {
    throw new Error(`Pattern with id "${pattern.id}" already exists`);
  }

  return {
    patterns: [...db.patterns, pattern],
    lastUpdated: new Date(),
  };
}

/**
 * Pure function: Update pattern
 *
 * @param db - Current pattern database
 * @param patternId - ID of pattern to update
 * @param updates - Partial pattern updates
 * @returns New pattern database with updated pattern
 */
export function updatePattern(
  db: PatternDatabase,
  patternId: string,
  updates: Partial<Omit<SpeakerPattern, 'id'>>
): PatternDatabase {
  const pattern = db.patterns.find((p) => p.id === patternId);
  if (!pattern) {
    throw new Error(`Pattern not found: ${patternId}`);
  }

  return {
    patterns: db.patterns.map((p) => (p.id === patternId ? { ...p, ...updates } : p)),
    lastUpdated: new Date(),
  };
}

/**
 * Pure function: Remove pattern
 *
 * @param db - Current pattern database
 * @param patternId - ID of pattern to remove
 * @returns New pattern database without the pattern
 */
export function removePattern(db: PatternDatabase, patternId: string): PatternDatabase {
  return {
    patterns: db.patterns.filter((p) => p.id !== patternId),
    lastUpdated: new Date(),
  };
}

/**
 * Pure function: Get pattern by ID
 *
 * @param db - Pattern database
 * @param patternId - Pattern ID
 * @returns Pattern or null if not found
 */
export function getPattern(db: PatternDatabase, patternId: string): SpeakerPattern | null {
  return db.patterns.find((p) => p.id === patternId) || null;
}

/**
 * Pure function: Validate pattern
 *
 * Checks if all regex patterns in a speaker pattern are valid.
 *
 * @param pattern - Pattern to validate
 * @returns Object with valid flag and errors array
 */
export function validatePattern(pattern: SpeakerPattern): {
  valid: boolean;
  errors: readonly string[];
} {
  const errors: string[] = [];

  if (!pattern.id || pattern.id.trim().length === 0) {
    errors.push('Pattern ID is required');
  }

  if (!pattern.name || pattern.name.trim().length === 0) {
    errors.push('Pattern name is required');
  }

  if (!pattern.patterns || pattern.patterns.length === 0) {
    errors.push('At least one pattern is required');
  }

  // Validate each regex pattern
  pattern.patterns.forEach((regex, i) => {
    try {
      new RegExp(regex);
    } catch (e) {
      errors.push(`Invalid regex pattern at index ${i}: ${e}`);
    }
  });

  if (pattern.confidence < 0 || pattern.confidence > 1) {
    errors.push('Confidence must be between 0 and 1');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
