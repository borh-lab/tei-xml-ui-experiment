/**
 * WorkflowStep Component
 *
 * Displays a single workflow step with prompt, entity picker, and navigation.
 */

'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { EntityPicker } from './EntityPicker';
import type { PlannedStep, AvailableEntity } from '@/lib/protocols/workflows';
import { cn } from '@/lib/utils';

/**
 * Props for WorkflowStep component
 */
export interface WorkflowStepProps {
  /** The step to display */
  readonly step: PlannedStep;
  /** Step number (1-based) */
  readonly stepNumber: number;
  /** Total number of steps in workflow */
  readonly totalSteps: number;
  /** Callback when step is completed */
  readonly onComplete: (data: { selectedEntityId?: string }) => void;
  /** Callback when back button is clicked */
  readonly onBack: () => void;
}

/**
 * WorkflowStep Component
 *
 * Displays a single workflow step with:
 * - Step prompt
 * - Entity picker (if step requires entity selection)
 * - Navigation buttons (Back/Next)
 * - Progress indicator
 */
export function WorkflowStep({
  step,
  stepNumber,
  totalSteps,
  onComplete,
  onBack,
}: WorkflowStepProps) {
  const [selectedEntity, setSelectedEntity] = useState<AvailableEntity | undefined>();

  // Handle entity selection
  const handleEntitySelect = useCallback(
    (entity: AvailableEntity) => {
      setSelectedEntity(entity);
    },
    []
  );

  // Handle complete step
  const handleComplete = useCallback(() => {
    if (step.requiresEntity && !selectedEntity) {
      return; // Don't complete if entity required but not selected
    }

    onComplete({
      selectedEntityId: selectedEntity?.id,
    });
  }, [step, selectedEntity, onComplete]);

  // Check if Next button should be disabled
  const isNextDisabled =
    step.requiresEntity && !selectedEntity;

  return (
    <div className="flex flex-col gap-4 p-6">
      {/* Step header */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">{step.prompt}</h3>
        <p className="text-sm text-muted-foreground">
          Step {stepNumber} of {totalSteps}
        </p>
      </div>

      {/* Entity picker (if required) */}
      {step.requiresEntity && step.availableEntities && (
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Select {step.entityType === 'character' ? 'Character' : 'Entity'}
          </label>
          <EntityPicker
            entities={step.availableEntities}
            onSelect={handleEntitySelect}
            value={selectedEntity}
            placeholder={`Select a ${step.entityType}`}
            showUsageCount={true}
          />
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex justify-end gap-2 pt-4">
        {stepNumber > 1 && (
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
          >
            Back
          </Button>
        )}

        <Button
          type="button"
          onClick={handleComplete}
          disabled={isNextDisabled}
        >
          {stepNumber >= totalSteps ? 'Complete' : 'Next'}
        </Button>
      </div>
    </div>
  );
}
