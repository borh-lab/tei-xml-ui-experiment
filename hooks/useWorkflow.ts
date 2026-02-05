/**
 * useWorkflow Hook
 *
 * React hook for managing workflow state and execution.
 * Handles workflow planning, step navigation, and completion.
 */

import { useState, useCallback } from 'react';
import { useDocumentService } from '@/lib/effect/react/hooks';
import type {
  Workflow,
  WorkflowStep,
} from '@/lib/workflows/definitions';
import {
  planWorkflow,
  nextStep,
  previousStep,
  type WorkflowPlan,
  type PlannedStep,
} from '@/lib/protocols/workflows';
import type { PassageID, TextRange, CharacterID } from '@/lib/tei/types';
import type { Result } from '@/lib/protocols/Result';

/**
 * Step completion data
 *
 * Data provided when completing a workflow step.
 * For entity selection steps, includes the selected entity ID.
 */
export interface StepCompletionData {
  /** ID of selected entity (for entity selection steps) */
  selectedEntityId?: string;
  /** Additional attributes for the tag */
  attributes?: Record<string, string>;
}

/**
 * Options for starting a workflow
 */
export interface StartWorkflowOptions {
  /** Workflow definition to start */
  readonly workflow: Workflow;
  /** Passage ID where workflow will be applied */
  readonly passageId: PassageID;
  /** Text range for the workflow */
  readonly range: TextRange;
}

/**
 * Workflow state returned by useWorkflow hook
 */
export interface UseWorkflowResult {
  /** Currently active workflow ID (null if no active workflow) */
  activeWorkflow: string | null;
  /** Current workflow step (null if no active workflow) */
  currentStep: PlannedStep | null;
  /** Total number of steps in active workflow */
  totalSteps: number;
  /** Current progress (0-100) */
  progress: number;
  /** Whether user can go to previous step */
  canGoBack: boolean;
  /** Whether user can go to next step */
  canProgress: boolean;
  /** Whether workflow is complete */
  isComplete: boolean;
  /** Error from last operation (null if no error) */
  error: Error | null;
  /** Start a workflow */
  startWorkflow: (options: StartWorkflowOptions) => Promise<boolean>;
  /** Move to next step */
  nextStep: () => Promise<boolean>;
  /** Move to previous step */
  previousStep: () => Promise<boolean>;
  /** Complete current step */
  completeStep: (data: StepCompletionData) => Promise<boolean>;
  /** Cancel active workflow */
  cancelWorkflow: () => void;
}

/**
 * useWorkflow Hook
 *
 * Manages workflow state and execution for multi-step tagging processes.
 *
 * Features:
 * - Start workflows with validation
 * - Navigate between steps
 * - Complete steps with entity selection
 * - Apply tags when workflow completes
 * - Cancel workflows in progress
 * - Error handling and recovery
 *
 * @example
 * ```tsx
 * function WorkflowButton() {
 *   const { startWorkflow, currentStep, completeStep } = useWorkflow();
 *
 *   const handleStart = async () => {
 *     const started = await startWorkflow({
 *       workflow: CharacterIntroduction,
 *       passageId: 'passage-123',
 *       range: { start: 0, end: 10 },
 *     });
 *   };
 *
 *   const handleComplete = async () => {
 *     await completeStep({ selectedEntityId: 'char-1' });
 *   };
 *
 *   return <div>...</div>;
 * }
 * ```
 */
export function useWorkflow(): UseWorkflowResult {
  const { document, addTag } = useDocumentService();

  const [plan, setPlan] = useState<WorkflowPlan | null>(null);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Start a workflow
   *
   * Plans the workflow and sets it as active.
   * Returns false if workflow planning fails.
   */
  const startWorkflow = useCallback(
    async (options: StartWorkflowOptions): Promise<boolean> => {
      setError(null);

      // Get characters from document
      const characters = document?.state.characters ?? [];

      // Plan the workflow
      const result = planWorkflow({
        workflow: options.workflow,
        passageId: options.passageId,
        range: options.range,
        characters,
      });

      if (!result.success) {
        setError(
          new Error(result.error.message)
        );
        return false;
      }

      setPlan(result.value);
      return true;
    },
    [document]
  );

  /**
   * Move to next step
   *
   * Advances the workflow to the next step.
   * Returns false if already at final step.
   */
  const nextStepCallback = useCallback(async (): Promise<boolean> => {
    if (!plan) return false;

    const result = nextStep(plan);
    if (!result.success) {
      return false;
    }

    setPlan(result.value);
    return true;
  }, [plan]);

  /**
   * Move to previous step
   *
   * Goes back to the previous workflow step.
   * Returns false if already at first step.
   */
  const previousStepCallback = useCallback(async (): Promise<boolean> => {
    if (!plan) return false;

    const result = previousStep(plan);
    if (!result.success) {
      return false;
    }

    setPlan(result.value);
    return true;
  }, [plan]);

  /**
   * Complete current step
   *
   * For non-entity steps: Applies the tag immediately
   * For entity steps: Stores entity ID for tag application
   * For final step: Applies all tags and completes workflow
   */
  const completeStep = useCallback(
    async (data: StepCompletionData): Promise<boolean> => {
      if (!plan || !document) return false;

      const step = plan.steps[plan.currentStepIndex];

      try {
        // Prepare tag attributes
        const attributes: Record<string, string> = {
          ...step.attributes,
          ...data.attributes,
        };

        // Add entity reference if step requires entity selection
        if (step.requiresEntity && data.selectedEntityId) {
          // Find entity and add reference
          const entity = step.availableEntities?.find(
            (e) => e.id === data.selectedEntityId
          );

          if (entity) {
            // Add who attribute for said tags
            if (step.tagName === 'said') {
              attributes.who = `#${data.selectedEntityId}`;
            }
            // Add ref attribute for persName/placeName/orgName tags
            else if (
              step.tagName === 'persName' ||
              step.tagName === 'placeName' ||
              step.tagName === 'orgName'
            ) {
              attributes.ref = `#${data.selectedEntityId}`;
            }
          }
        }

        // Apply the tag
        await addTag(
          plan.passageId,
          plan.range,
          step.tagName,
          attributes
        );

        // Check if this is the final step
        if (plan.currentStepIndex >= plan.totalSteps - 1) {
          // Workflow complete - clear plan after state update
          // Create a completed plan for one tick before clearing
          const completedPlan: WorkflowPlan = {
            ...plan,
            isComplete: true,
            canProgress: false,
          };
          setPlan(completedPlan);

          // Clear plan on next tick
          setTimeout(() => {
            setPlan(null);
          }, 0);

          return true;
        }

        // Move to next step
        return await nextStepCallback();
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error(String(err));
        setError(error);
        return false;
      }
    },
    [plan, document, addTag, nextStepCallback]
  );

  /**
   * Cancel active workflow
   *
   * Clears the current workflow and resets state.
   */
  const cancelWorkflow = useCallback(() => {
    setPlan(null);
    setError(null);
  }, []);

  // Extract current state from plan
  const currentStep = plan
    ? plan.steps[plan.currentStepIndex]
    : null;

  return {
    activeWorkflow: plan?.workflowId ?? null,
    currentStep,
    totalSteps: plan?.totalSteps ?? 0,
    progress: plan?.progress ?? 0,
    canGoBack: plan?.canGoBack ?? false,
    canProgress: plan?.canProgress ?? false,
    isComplete: plan?.isComplete ?? false,
    error,
    startWorkflow,
    nextStep: nextStepCallback,
    previousStep: previousStepCallback,
    completeStep,
    cancelWorkflow,
  };
}
