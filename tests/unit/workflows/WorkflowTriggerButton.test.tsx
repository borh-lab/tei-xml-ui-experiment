/**
 * Tests for WorkflowTriggerButton Component
 *
 * Tests button to start workflow with workflow selection dropdown.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { WorkflowTriggerButton } from '@/components/workflows/WorkflowTriggerButton';
import { SimpleQuote, CharacterIntroduction } from '@/lib/workflows/definitions';

describe('WorkflowTriggerButton Component', () => {
  test('should render button with default label', () => {
    render(
      <WorkflowTriggerButton onWorkflowSelect={() => {}} />
    );

    expect(screen.getByText('Start Workflow')).toBeInTheDocument();
  });

  test('should render button with custom label', () => {
    render(
      <WorkflowTriggerButton
        onWorkflowSelect={() => {}}
        label="Run Workflow"
      />
    );

    expect(screen.getByText('Run Workflow')).toBeInTheDocument();
  });

  test('should show workflows when clicked', () => {
    render(
      <WorkflowTriggerButton onWorkflowSelect={() => {}} />
    );

    const button = screen.getByText('Start Workflow');
    fireEvent.click(button);

    expect(screen.getByText('Simple Quote')).toBeInTheDocument();
    expect(screen.getByText('Character Introduction')).toBeInTheDocument();
    expect(screen.getByText('Location Entrance')).toBeInTheDocument();
  });

  test('should call onWorkflowSelect when workflow is clicked', () => {
    const onSelect = jest.fn();

    render(
      <WorkflowTriggerButton onWorkflowSelect={onSelect} />
    );

    // Open dropdown
    fireEvent.click(screen.getByText('Start Workflow'));

    // Click workflow
    fireEvent.click(screen.getByText('Simple Quote'));

    expect(onSelect).toHaveBeenCalledWith(SimpleQuote);
  });

  test('should be disabled when specified', () => {
    render(
      <WorkflowTriggerButton
        onWorkflowSelect={() => {}}
        disabled={true}
      />
    );

    const button = screen.getByText('Start Workflow');
    expect(button).toBeDisabled();
  });

  test('should show workflow descriptions', () => {
    render(
      <WorkflowTriggerButton onWorkflowSelect={() => {}} />
    );

    fireEvent.click(screen.getByText('Start Workflow'));

    expect(screen.getByText('Wrap selected text as a quote')).toBeInTheDocument();
    expect(screen.getByText('Annotate character name and speech with speaker attribution')).toBeInTheDocument();
  });

  test('should close dropdown after selection', () => {
    render(
      <WorkflowTriggerButton onWorkflowSelect={() => {}} />
    );

    // Open dropdown
    fireEvent.click(screen.getByText('Start Workflow'));
    expect(screen.getByText('Simple Quote')).toBeInTheDocument();

    // Select workflow
    fireEvent.click(screen.getByText('Simple Quote'));

    // Dropdown should close
    expect(screen.queryByText('Simple Quote')).not.toBeInTheDocument();
  });
});
