/**
 * WorkflowDialog Component
 *
 * Multi-step dialog container with progress indicator.
 * Manages workflow state and handles completion/cancellation.
 */

'use client';

import React, { useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { WorkflowStep } from './WorkflowStep';
import { useWorkflow } from '@/hooks/useWorkflow';
import type { Workflow } from '@/lib/workflows/definitions';
import type { PassageID, TextRange } from '@/lib/tei/types';
import { cn } from '@/lib/utils';

/**
 * Props for WorkflowDialog component
 */
export interface WorkflowDialogProps {
  /** Whether dialog is open */
  readonly open: boolean;
  /** Callback when dialog is closed */
  readonly onClose: () => void;
  /** Workflow to execute */
  readonly workflow: Workflow;
  /** Passage ID for tag application */
  readonly passageId: PassageID;
  /** Text range for workflow */
  readonly range: TextRange;
}

/**
 * WorkflowDialog Component
 *
 * Multi-step dialog that:
 * - Shows workflow progress
 * - Displays current step
 * - Handles step navigation
 * - Applies tags on completion
 * - Allows cancellation
 */
export function WorkflowDialog({
  open,
  onClose,
  workflow,
  passageId,
  range,
}: WorkflowDialogProps) {
  const {
    activeWorkflow,
    currentStep,
    totalSteps,
    progress,
    canGoBack,
    startWorkflow,
    nextStep,
    previousStep,
    completeStep,
    cancelWorkflow,
    error,
  } = useWorkflow();

  // Start workflow when dialog opens
  useEffect(() => {
    if (open && !activeWorkflow) {
      startWorkflow({
        workflow,
        passageId,
        range,
      });
    }

    // Cleanup on unmount or close
    return () => {
      if (activeWorkflow) {
        cancelWorkflow();
      }
    };
  }, [open]);

  // Handle completion - close dialog
  useEffect(() => {
    if (activeWorkflow === null && open) {
      // Workflow completed
      onClose();
    }
  }, [activeWorkflow, open, onClose]);

  // Handle step completion
  const handleStepComplete = useCallback(
    async (data: { selectedEntityId?: string }) => {
      const completed = await completeStep(data);
      if (!completed && error) {
        console.error('Step completion failed:', error);
      }
    },
    [completeStep, error]
  );

  // Handle back navigation
  const handleBack = useCallback(async () => {
    await previousStep();
  }, [previousStep]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    cancelWorkflow();
    onClose();
  }, [cancelWorkflow, onClose]);

  // Don't render if not open
  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{workflow.name}</DialogTitle>
          <DialogDescription>{workflow.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Progress bar */}
          {totalSteps > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error.message}
            </div>
          )}

          {/* Current step */}
          {currentStep ? (
            <WorkflowStep
              step={currentStep}
              stepNumber={(progress / 100) * totalSteps + 1}
              totalSteps={totalSteps}
              onComplete={handleStepComplete}
              onBack={canGoBack ? handleBack : () => {}}
            />
          ) : (
            <div className="flex justify-center p-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}

          {/* Cancel button */}
          <div className="flex justify-start pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCancel}
            >
              Cancel Workflow
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
