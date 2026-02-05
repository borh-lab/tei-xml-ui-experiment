// @ts-nocheck
/**
 * AI Provider Interfaces
 *
 * Defines the contract for AI-powered features in the TEI Dialogue Editor.
 * Different AI providers (OpenAI, Anthropic, etc.) can implement this interface.
 */

/**
 * Represents a span of text detected as dialogue
 */
export interface DialogueSpan {
  start: number;
  end: number;
  text: string;
  confidence: number;
  speaker?: string;
}

/**
 * Represents a character in the document
 */
export interface Character {
  xmlId: string;
  name: string;
  description?: string;
}

/**
 * Represents a validation issue in the document
 */
export interface Issue {
  type: string;
  message: string;
  location?: { line: number; column: number };
}

/**
 * AI Provider Interface
 *
 * Implementations of this interface provide AI-powered features for:
 * - Detecting dialogue passages in plain text
 * - Attributing speakers to dialogue
 * - Validating document consistency
 */
export interface AIProvider {
  /**
   * Detect dialogue passages in the given text
   * @param text - The text to analyze for dialogue
   * @returns Array of dialogue spans with confidence scores
   */
  detectDialogue(text: string): Promise<DialogueSpan[]>;

  /**
   * Attribute a speaker to a dialogue passage
   * @param context - The dialogue passage to analyze
   * @param characters - Array of available characters in the document
   * @returns The xmlId of the attributed character
   */
  attributeSpeaker(context: string, characters: Character[]): Promise<string>;

  /**
   * Validate document for consistency issues
   * @param document - The TEI document to validate
   * @returns Array of validation issues
   */
  validateConsistency(document: unknown): Promise<Issue[]>;
}
