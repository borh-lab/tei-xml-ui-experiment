/**
 * Tests for WorkflowStep Component
 *
 * Tests individual workflow step display with entity picker.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { WorkflowStep } from '@/components/workflows/WorkflowStep';
import type { PlannedStep } from '@/lib/protocols/workflows';

const mockStep: PlannedStep = {
  id: 'select-speaker',
  prompt: 'Select the speaker for this dialogue',
  tagName: 'said',
  attributes: {},
  requiresEntity: true,
  entityType: 'character',
  availableEntities: [
    {
      id: 'char-1',
      name: 'Alice',
      type: 'character',
      archived: false,
      usageCount: 5,
    },
    {
      id: 'char-2',
      name: 'Bob',
      type: 'character',
      archived: false,
      usageCount: 3,
    },
  ],
};

describe('WorkflowStep Component', () => {
  test('should render step prompt', () => {
    render(
      <WorkflowStep
        step={mockStep}
        stepNumber={1}
        totalSteps={3}
        onComplete={() => {}}
        onBack={() => {}}
      />
    );

    expect(screen.getByText('Select the speaker for this dialogue')).toBeInTheDocument();
  });

  test('should show step number', () => {
    render(
      <WorkflowStep
        step={mockStep}
        stepNumber={2}
        totalSteps={3}
        onComplete={() => {}}
        onBack={() => {}}
      />
    );

    expect(screen.getByText(/Step 2 of 3/)).toBeInTheDocument();
  });

  test('should show entity picker when step requires entity', () => {
    render(
      <WorkflowStep
        step={mockStep}
        stepNumber={1}
        totalSteps={1}
        onComplete={() => {}}
        onBack={() => {}}
      />
    );

    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  test('should not show entity picker when step does not require entity', () => {
    const simpleStep: PlannedStep = {
      id: 'wrap-quote',
      prompt: 'Wrap as quote',
      tagName: 'q',
      attributes: {},
      requiresEntity: false,
    };

    render(
      <WorkflowStep
        step={simpleStep}
        stepNumber={1}
        totalSteps={1}
        onComplete={() => {}}
        onBack={() => {}}
      />
    );

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  test('should show back button when not on first step', () => {
    render(
      <WorkflowStep
        step={mockStep}
        stepNumber={2}
        totalSteps={3}
        onComplete={() => {}}
        onBack={() => {}}
      />
    );

    expect(screen.getByText('Back')).toBeInTheDocument();
  });

  test('should not show back button on first step', () => {
    render(
      <WorkflowStep
        step={mockStep}
        stepNumber={1}
        totalSteps={3}
        onComplete={() => {}}
        onBack={() => {}}
      />
    );

    expect(screen.queryByText('Back')).not.toBeInTheDocument();
  });

  test('should call onComplete with entity when Next clicked', () => {
    const onComplete = jest.fn();

    render(
      <WorkflowStep
        step={mockStep}
        stepNumber={1}
        totalSteps={3}
        onComplete={onComplete}
        onBack={() => {}}
      />
    );

    // Select entity
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(screen.getByText('Alice'));

    // Click next
    fireEvent.click(screen.getByText('Next'));

    expect(onComplete).toHaveBeenCalledWith({
      selectedEntityId: 'char-1',
    });
  });

  test('should call onComplete without entity for non-entity steps', () => {
    const simpleStep: PlannedStep = {
      id: 'wrap-quote',
      prompt: 'Wrap as quote',
      tagName: 'q',
      attributes: {},
      requiresEntity: false,
    };

    const onComplete = jest.fn();

    render(
      <WorkflowStep
        step={simpleStep}
        stepNumber={1}
        totalSteps={1}
        onComplete={onComplete}
        onBack={() => {}}
      />
    );

    fireEvent.click(screen.getByText('Complete'));

    expect(onComplete).toHaveBeenCalledWith({});
  });

  test('should call onBack when Back clicked', () => {
    const onBack = jest.fn();

    render(
      <WorkflowStep
        step={mockStep}
        stepNumber={2}
        totalSteps={3}
        onComplete={() => {}}
        onBack={onBack}
      />
    );

    fireEvent.click(screen.getByText('Back'));

    expect(onBack).toHaveBeenCalled();
  });

  test('should disable Next button when entity required but not selected', () => {
    const onComplete = jest.fn();

    render(
      <WorkflowStep
        step={mockStep}
        stepNumber={1}
        totalSteps={3}
        onComplete={onComplete}
        onBack={() => {}}
      />
    );

    const nextButton = screen.getByText('Next');
    expect(nextButton).toBeDisabled();
  });
});
