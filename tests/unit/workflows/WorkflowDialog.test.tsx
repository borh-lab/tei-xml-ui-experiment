/**
 * Tests for WorkflowDialog Component
 *
 * Tests multi-step dialog container.
 */

import { render, screen } from '@testing-library/react';
import { WorkflowDialog } from '@/components/workflows/WorkflowDialog';
import { SimpleQuote, CharacterIntroduction } from '@/lib/workflows/definitions';
import type { PassageID, TextRange } from '@/lib/tei/types';

// Mock useWorkflow hook
jest.mock('@/hooks/useWorkflow', () => ({
  useWorkflow: () => ({
    activeWorkflow: null,
    currentStep: null,
    totalSteps: 0,
    progress: 0,
    canGoBack: false,
    startWorkflow: jest.fn(),
    nextStep: jest.fn(),
    previousStep: jest.fn(),
    completeStep: jest.fn(),
    cancelWorkflow: jest.fn(),
    error: null,
  }),
}));

const mockPassageId = 'passage-123' as PassageID;
const mockRange: TextRange = { start: 0, end: 10 };

describe('WorkflowDialog Component', () => {
  test('should render dialog when open', () => {
    render(
      <WorkflowDialog
        open={true}
        onClose={() => {}}
        workflow={SimpleQuote}
        passageId={mockPassageId}
        range={mockRange}
      />
    );

    expect(screen.getByText('Simple Quote')).toBeInTheDocument();
  });

  test('should not render dialog when closed', () => {
    render(
      <WorkflowDialog
        open={false}
        onClose={() => {}}
        workflow={SimpleQuote}
        passageId={mockPassageId}
        range={mockRange}
      />
    );

    expect(screen.queryByText('Simple Quote')).not.toBeInTheDocument();
  });

  test('should show workflow description', () => {
    render(
      <WorkflowDialog
        open={true}
        onClose={() => {}}
        workflow={CharacterIntroduction}
        passageId={mockPassageId}
        range={mockRange}
      />
    );

    expect(screen.getByText('Annotate character name and speech with speaker attribution')).toBeInTheDocument();
  });

  test('should show workflow name', () => {
    render(
      <WorkflowDialog
        open={true}
        onClose={() => {}}
        workflow={CharacterIntroduction}
        passageId={mockPassageId}
        range={mockRange}
      />
    );

    expect(screen.getByText('Character Introduction')).toBeInTheDocument();
  });
});
