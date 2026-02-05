/**
 * Predefined Workflow Definitions
 *
 * Defines reusable multi-step tagging workflows for common annotation patterns.
 * Each workflow consists of steps with prompts, tag types, and attributes.
 */

/**
 * Entity types that can be selected in workflows
 */
export type EntityType = 'character' | 'place' | 'organization';

/**
 * Workflow step definition
 *
 * Each step represents a single action in the workflow:
 * - Wrapping text in a tag
 * - Selecting an entity (character/place/org)
 * - Providing additional attributes
 */
export interface WorkflowStep {
  /** Unique step identifier */
  readonly id: string;
  /** Prompt shown to user for this step */
  readonly prompt: string;
  /** Tag name to apply (e.g., 'said', 'q', 'persName') */
  readonly tagName: string;
  /** Tag attributes (e.g., { who: '#char-123' }) */
  readonly attributes: Record<string, string>;
  /** Whether this step requires selecting an entity */
  readonly requiresEntity: boolean;
  /** Type of entity to select (if requiresEntity is true) */
  readonly entityType?: EntityType;
}

/**
 * Workflow definition
 *
 * A workflow guides users through a multi-step tagging process.
 * Common workflows include:
 * - Simple quotes: Just wrap in <q>
 * - Character introduction: Wrap name, add speech, select speaker
 * - Location entrance: Wrap place name, add description
 */
export interface Workflow {
  /** Unique workflow identifier */
  readonly id: string;
  /** Human-readable workflow name */
  readonly name: string;
  /** Description of what the workflow does */
  readonly description: string;
  /** Steps in the workflow (executed in order) */
  readonly steps: readonly WorkflowStep[];
}

/**
 * SimpleQuote Workflow
 *
 * The simplest workflow: just wrap selected text in a <q> tag.
 * Useful for quick quote annotation without speaker attribution.
 */
export const SimpleQuote: Workflow = {
  id: 'simple-quote',
  name: 'Simple Quote',
  description: 'Wrap selected text as a quote',
  steps: [
    {
      id: 'wrap-quote',
      prompt: 'Wrap the selected text as a quote',
      tagName: 'q',
      attributes: {},
      requiresEntity: false,
    },
  ],
} as const;

/**
 * CharacterIntroduction Workflow
 *
 * A three-step workflow for character introductions with dialogue:
 * 1. Wrap character name in <persName>
 * 2. Wrap their speech in <said>
 * 3. Select which character is speaking
 *
 * This workflow handles the common pattern of introducing a character
 * and immediately showing them speaking.
 */
export const CharacterIntroduction: Workflow = {
  id: 'character-introduction',
  name: 'Character Introduction',
  description: 'Annotate character name and speech with speaker attribution',
  steps: [
    {
      id: 'wrap-persname',
      prompt: 'Select the character name to tag',
      tagName: 'persName',
      attributes: {},
      requiresEntity: false,
    },
    {
      id: 'wrap-said',
      prompt: 'Select the dialogue to tag',
      tagName: 'said',
      attributes: {},
      requiresEntity: false,
    },
    {
      id: 'select-speaker',
      prompt: 'Select the speaker for this dialogue',
      tagName: 'said',
      attributes: {},
      requiresEntity: true,
      entityType: 'character',
    },
  ],
} as const;

/**
 * LocationEntrance Workflow
 *
 * A two-step workflow for location entrances:
 * 1. Wrap location name in <placeName>
 * 2. Add description quote (optional)
 *
 * This workflow handles the pattern of characters entering a location
 * with a brief description of the place.
 */
export const LocationEntrance: Workflow = {
  id: 'location-entrance',
  name: 'Location Entrance',
  description: 'Annotate location name and optional description',
  steps: [
    {
      id: 'wrap-placename',
      prompt: 'Select the location name to tag',
      tagName: 'placeName',
      attributes: {},
      requiresEntity: false,
    },
    {
      id: 'add-description',
      prompt: 'Select any description text (optional)',
      tagName: 'q',
      attributes: {},
      requiresEntity: false,
    },
  ],
} as const;

/**
 * Get all predefined workflows
 *
 * Returns a list of all available workflows for use in the UI.
 * The returned array is a copy to prevent mutation.
 *
 * @returns Array of all workflow definitions
 */
export function getAllWorkflows(): readonly Workflow[] {
  return [SimpleQuote, CharacterIntroduction, LocationEntrance];
}

/**
 * Get workflow by ID
 *
 * Finds a workflow definition by its unique identifier.
 * Returns undefined if the workflow is not found.
 *
 * @param id - Workflow identifier
 * @returns Workflow definition or undefined
 */
export function getWorkflowById(id: string): Workflow | undefined {
  return getAllWorkflows().find((workflow) => workflow.id === id);
}

/**
 * Type guard to check if a step requires entity selection
 *
 * @param step - Workflow step to check
 * @returns True if step requires entity selection
 */
export function requiresEntitySelection(step: WorkflowStep): step is WorkflowStep & {
  requiresEntity: true;
  entityType: EntityType;
} {
  return step.requiresEntity === true && step.entityType !== undefined;
}
