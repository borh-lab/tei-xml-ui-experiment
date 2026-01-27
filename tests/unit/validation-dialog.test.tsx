import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ValidationResultsDialog, ValidationIssue } from '@/components/editor/ValidationResultsDialog';

describe('ValidationResultsDialog', () => {
  it('should render success state when no issues', () => {
    const issues: ValidationIssue[] = [];

    render(
      <ValidationResultsDialog
        open={true}
        onOpenChange={jest.fn()}
        issues={issues}
        passageCount={5}
      />
    );

    expect(screen.getByText('Validation Complete')).toBeInTheDocument();
    expect(screen.getByText(/All 5 selected passages passed validation/)).toBeInTheDocument();
  });

  it('should render error issues', () => {
    const issues: ValidationIssue[] = [
      {
        type: 'error',
        message: 'Untagged speaker',
        location: { index: 0, dialogueIndex: 0 },
        suggestion: 'Use the "Tag All" operation to assign a speaker'
      }
    ];

    render(
      <ValidationResultsDialog
        open={true}
        onOpenChange={jest.fn()}
        issues={issues}
        passageCount={3}
      />
    );

    expect(screen.getByText('Validation Found Issues')).toBeInTheDocument();
    expect(screen.getByText('Untagged speaker')).toBeInTheDocument();
    expect(screen.getByText((content, element) => {
      // Custom text matcher to handle text split by HTML elements
      return content.includes('Use the') && content.includes('Tag All') && content.includes('operation');
    })).toBeInTheDocument();
  });

  it('should render warning issues', () => {
    const issues: ValidationIssue[] = [
      {
        type: 'warning',
        message: 'Low confidence annotation: 65%',
        location: { index: 2 },
        suggestion: 'Review this passage manually'
      }
    ];

    render(
      <ValidationResultsDialog
        open={true}
        onOpenChange={jest.fn()}
        issues={issues}
        passageCount={3}
      />
    );

    expect(screen.getByText('Low confidence annotation: 65%')).toBeInTheDocument();
    expect(screen.getByText('Review this passage manually')).toBeInTheDocument();
  });

  it('should render info issues', () => {
    const issues: ValidationIssue[] = [
      {
        type: 'info',
        message: 'Very short dialogue: "OK"',
        location: { index: 1, dialogueIndex: 0 },
        suggestion: 'Verify this is intentional dialogue'
      }
    ];

    render(
      <ValidationResultsDialog
        open={true}
        onOpenChange={jest.fn()}
        issues={issues}
        passageCount={2}
      />
    );

    expect(screen.getByText('Very short dialogue: "OK"')).toBeInTheDocument();
  });

  it('should display correct issue counts in description', () => {
    const issues: ValidationIssue[] = [
      { type: 'error', message: 'Error 1', location: { index: 0 } },
      { type: 'error', message: 'Error 2', location: { index: 1 } },
      { type: 'warning', message: 'Warning 1', location: { index: 2 } },
      { type: 'info', message: 'Info 1', location: { index: 3 } }
    ];

    render(
      <ValidationResultsDialog
        open={true}
        onOpenChange={jest.fn()}
        issues={issues}
        passageCount={5}
      />
    );

    expect(screen.getByText(/Found 2 errors, 1 warning, and 1 info message/)).toBeInTheDocument();
  });

  it('should call onOpenChange when close button is clicked with no issues', () => {
    const handleClose = jest.fn();
    const issues: ValidationIssue[] = [];

    render(
      <ValidationResultsDialog
        open={true}
        onOpenChange={handleClose}
        issues={issues}
        passageCount={1}
      />
    );

    // Get all buttons and click the one in the footer (the Close button)
    const closeButtons = screen.getAllByRole('button', { name: 'Close' });
    fireEvent.click(closeButtons[closeButtons.length - 1]); // Click the last Close button (footer button)

    expect(handleClose).toHaveBeenCalledWith(false);
  });

  it('should call onOpenChange when acknowledge button is clicked with issues', () => {
    const handleClose = jest.fn();
    const issues: ValidationIssue[] = [
      {
        type: 'error',
        message: 'Test error',
        location: { index: 0 }
      }
    ];

    render(
      <ValidationResultsDialog
        open={true}
        onOpenChange={handleClose}
        issues={issues}
        passageCount={1}
      />
    );

    // Use text query since there's only one Acknowledge button
    const acknowledgeButton = screen.getByText('Acknowledge');
    fireEvent.click(acknowledgeButton);

    expect(handleClose).toHaveBeenCalledWith(false);
  });

  it('should display location badges for issues with dialogue index', () => {
    const issues: ValidationIssue[] = [
      {
        type: 'error',
        message: 'Untagged speaker',
        location: { index: 5, dialogueIndex: 2 },
        suggestion: 'Tag this dialogue'
      }
    ];

    render(
      <ValidationResultsDialog
        open={true}
        onOpenChange={jest.fn()}
        issues={issues}
        passageCount={10}
      />
    );

    expect(screen.getByText('Para #6 · Dialogue 3')).toBeInTheDocument();
  });

  it('should display location badges for issues without dialogue index', () => {
    const issues: ValidationIssue[] = [
      {
        type: 'info',
        message: 'No dialogue tags found',
        location: { index: 3 },
        suggestion: 'Add dialogue tags if needed'
      }
    ];

    render(
      <ValidationResultsDialog
        open={true}
        onOpenChange={jest.fn()}
        issues={issues}
        passageCount={5}
      />
    );

    expect(screen.getByText('Para #4')).toBeInTheDocument();
  });
});
