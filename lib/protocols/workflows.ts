/**
 * Workflow Protocol
 *
 * Plans and executes multi-step tagging workflows.
 * Validates attributes, calculates nested selections, and manages workflow state.
 */

import type { Character, TextRange, PassageID } from '@/lib/tei/types';
import type { Workflow, WorkflowStep, EntityType } from '@/lib/workflows/definitions';
import type { Result } from '@/lib/protocols/Result';
import { success, failure } from '@/lib/protocols/Result';

/**
 * Available entity for selection in a workflow step
 */
export interface AvailableEntity {
  /** Entity ID */
  readonly id: string;
  /** Entity display name */
  readonly name: string;
  /** Entity type (character/place/organization) */
  readonly type: EntityType;
  /** Whether entity is archived/hidden */
  readonly archived: boolean;
  /** Usage count (how many times referenced) */
  readonly usageCount: number;
}

/**
 * Planned workflow step with execution context
 *
 * Extends WorkflowStep with runtime information needed to execute the step.
 */
export interface PlannedStep {
  /** Step identifier */
  readonly id: string;
  /** Prompt shown to user */
  readonly prompt: string;
  /** Tag name to apply */
  readonly tagName: string;
  /** Tag attributes */
  readonly attributes: Record<string, string>;
  /** Whether this step requires entity selection */
  readonly requiresEntity: boolean;
  /** Type of entity to select (if required) */
  readonly entityType?: EntityType;
  /** Available entities for selection (if requiresEntity) */
  readonly availableEntities?: readonly AvailableEntity[];
  /** Nested selection range (if this step nests inside previous) */
  readonly nestedSelection?: TextRange;
}

/**
 * Workflow execution plan
 *
 * Contains all information needed to execute a workflow:
 * - Current step index
 * - Total steps
 * - Progress percentage
 * - Available entities for each step
 * - Navigation state
 */
export interface WorkflowPlan {
  /** Workflow identifier */
  readonly workflowId: string;
  /** All workflow steps with execution context */
  readonly steps: readonly PlannedStep[];
  /** Current step index (0-based) */
  readonly currentStepIndex: number;
  /** Total number of steps */
  readonly totalSteps: number;
  /** Progress percentage (0-100) */
  readonly progress: number;
  /** Whether user can move to next step */
  readonly canProgress: boolean;
  /** Whether user can go back to previous step */
  readonly canGoBack: boolean;
  /** Whether workflow is complete */
  readonly isComplete: boolean;
}

/**
 * Options for planning a workflow
 */
export interface PlanWorkflowOptions {
  /** Workflow definition to plan */
  readonly workflow: Workflow;
  /** Passage ID where workflow will be applied */
  readonly passageId: PassageID;
  /** Text range for the workflow */
  readonly range: TextRange;
  /** Available characters in document */
  readonly characters: readonly Character[];
}

/**
 * Check if character is archived
 *
 * Characters marked with 'archived' trait are hidden from selection.
 *
 * @param character - Character to check
 * @returns True if character is archived
 */
function isCharacterArchived(character: Character): boolean {
  return character.traits?.includes('archived') ?? false;
}

/**
 * Convert character to available entity
 *
 * @param character - Character to convert
 * @returns Available entity for selection
 */
function characterToAvailableEntity(character: Character): AvailableEntity {
  return {
    id: character.id,
    name: character.name,
    type: 'character',
    archived: isCharacterArchived(character),
    usageCount: 0, // TODO: Calculate from document state
  };
}

/**
 * Calculate nested selection range for a step
 *
 * Some steps need to nest inside previous step's range.
 * For example, a <said> tag containing a <q> tag.
 *
 * @param stepIndex - Current step index
 * @param baseRange - Original text range
 * @returns Nested selection range or undefined
 */
function calculateNestedSelection(
  stepIndex: number,
  baseRange: TextRange
): TextRange | undefined {
  // For now, return the base range for all steps
  // In the future, this could calculate actual nested ranges
  // based on the previous step's tag structure
  if (stepIndex === 0) {
    return undefined;
  }
  return baseRange;
}

/**
 * Plan workflow execution
 *
 * Validates the workflow, prepares all steps, and returns a plan
 * that can be executed step-by-step.
 *
 * Process:
 * 1. Validate workflow structure (must have at least one step)
 * 2. For each step:
 *    - Calculate nested selection if needed
 *    - Prepare available entities if step requires entity selection
 *    - Filter out archived entities
 * 3. Calculate progress and navigation state
 * 4. Return workflow plan
 *
 * Error cases:
 * - INVALID_WORKFLOW: Workflow has no steps
 * - NO_ENTITIES_AVAILABLE: Step requires entities but none available
 *
 * @param options - Workflow planning options
 * @returns Result with workflow plan or error
 */
export function planWorkflow(
  options: PlanWorkflowOptions
): Result<WorkflowPlan> {
  const { workflow, passageId, range, characters } = options;

  // Validate workflow structure
  if (workflow.steps.length === 0) {
    return failure(
      'INVALID_WORKFLOW',
      'Workflow must have at least one step',
      false,
      { workflowId: workflow.id }
    );
  }

  // Prepare planned steps
  const plannedSteps: PlannedStep[] = workflow.steps.map((step, index) => {
    const nestedSelection = calculateNestedSelection(index, range);

    // Prepare available entities if step requires entity selection
    let availableEntities: readonly AvailableEntity[] | undefined;
    if (step.requiresEntity && step.entityType === 'character') {
      // Filter and convert characters
      availableEntities = characters
        .filter((ch) => !isCharacterArchived(ch))
        .map(characterToAvailableEntity);

      // Check if entities are available
      if (availableEntities.length === 0) {
        return failure(
          'NO_ENTITIES_AVAILABLE',
          `No ${step.entityType}s available for selection`,
          true,
          { stepId: step.id, entityType: step.entityType }
        );
      }
    }

    return {
      id: step.id,
      prompt: step.prompt,
      tagName: step.tagName,
      attributes: step.attributes,
      requiresEntity: step.requiresEntity,
      entityType: step.entityType,
      availableEntities,
      nestedSelection,
    };
  });

  // Check if any step failed to plan
  const failedStep = plannedSteps.find((step) => !('id' in step));
  if (failedStep) {
    return failedStep as Result<WorkflowPlan>;
  }

  // Calculate navigation state
  const currentStepIndex = 0;
  const totalSteps = workflow.steps.length;
  const progress = 0;
  const canProgress = totalSteps > 0;
  const canGoBack = false;
  const isComplete = false;

  return success({
    workflowId: workflow.id,
    steps: plannedSteps as PlannedStep[],
    currentStepIndex,
    totalSteps,
    progress,
    canProgress,
    canGoBack,
    isComplete,
  });
}

/**
 * Move to next step in workflow plan
 *
 * Returns a new plan with incremented step index.
 * Returns error if already at last step.
 *
 * @param plan - Current workflow plan
 * @returns Result with updated plan or error
 */
export function nextStep(plan: WorkflowPlan): Result<WorkflowPlan> {
  if (plan.currentStepIndex >= plan.totalSteps - 1) {
    return failure(
      'AT_FINAL_STEP',
      'Already at final step',
      true,
      { workflowId: plan.workflowId }
    );
  }

  const nextIndex = plan.currentStepIndex + 1;
  const progress = Math.round((nextIndex / plan.totalSteps) * 100);

  return success({
    ...plan,
    currentStepIndex: nextIndex,
    progress,
    canGoBack: nextIndex > 0,
    canProgress: nextIndex < plan.totalSteps - 1,
    isComplete: nextIndex >= plan.totalSteps - 1,
  });
}

/**
 * Move to previous step in workflow plan
 *
 * Returns a new plan with decremented step index.
 * Returns error if already at first step.
 *
 * @param plan - Current workflow plan
 * @returns Result with updated plan or error
 */
export function previousStep(plan: WorkflowPlan): Result<WorkflowPlan> {
  if (plan.currentStepIndex <= 0) {
    return failure(
      'AT_FIRST_STEP',
      'Already at first step',
      true,
      { workflowId: plan.workflowId }
    );
  }

  const prevIndex = plan.currentStepIndex - 1;
  const progress = Math.round((prevIndex / plan.totalSteps) * 100);

  return success({
    ...plan,
    currentStepIndex: prevIndex,
    progress,
    canGoBack: prevIndex > 0,
    canProgress: true,
    isComplete: false,
  });
}

/**
 * Get current step from workflow plan
 *
 * @param plan - Workflow plan
 * @returns Current planned step or undefined if plan is empty
 */
export function getCurrentStep(plan: WorkflowPlan): PlannedStep | undefined {
  return plan.steps[plan.currentStepIndex];
}

/**
 * Check if workflow plan is valid
 *
 * @param plan - Workflow plan to check
 * @returns True if plan has at least one step
 */
export function isValidPlan(plan: WorkflowPlan): boolean {
  return plan.steps.length > 0 && plan.totalSteps > 0;
}
