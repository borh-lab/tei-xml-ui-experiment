import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ValidationPanel } from '@/components/validation/ValidationPanel';
import type { ValidationResult, ValidationError, FixSuggestion } from '@/lib/validation';

describe('ValidationPanel', () => {
  const mockOnFixClick = jest.fn();
  const mockOnErrorClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when visible is false', () => {
    it('should not render anything', () => {
      const validationResults: ValidationResult = {
        valid: true,
        errors: [],
        warnings: []
      };

      render(
        <ValidationPanel
          validationResults={validationResults}
          visible={false}
        />
      );

      expect(screen.queryByText('Validation Results')).not.toBeInTheDocument();
    });
  });

  describe('with empty validation results', () => {
    it('should render empty state when validationResults is null', () => {
      render(
        <ValidationPanel
          validationResults={null}
          onFixClick={mockOnFixClick}
          onErrorClick={mockOnErrorClick}
        />
      );

      expect(screen.getByText('No validation results')).toBeInTheDocument();
    });

    it('should render success state when valid with no issues', () => {
      const validationResults: ValidationResult = {
        valid: true,
        errors: [],
        warnings: []
      };

      render(
        <ValidationPanel
          validationResults={validationResults}
          onFixClick={mockOnFixClick}
          onErrorClick={mockOnErrorClick}
        />
      );

      expect(screen.getByText('Validation Results')).toBeInTheDocument();
      expect(screen.getByText('Document is valid')).toBeInTheDocument();
      expect(screen.getByText('0 errors, 0 warnings')).toBeInTheDocument();
    });
  });

  describe('rendering validation errors', () => {
    it('should display error count and severity', () => {
      const validationResults: ValidationResult = {
        valid: false,
        errors: [
          { message: 'Error 1', line: 1, column: 5, severity: 'error' },
          { message: 'Error 2', line: 2, column: 10, severity: 'error' },
          { message: 'Error 3', line: 3, column: 15, severity: 'error' }
        ],
        warnings: []
      };

      render(
        <ValidationPanel
          validationResults={validationResults}
          onFixClick={mockOnFixClick}
          onErrorClick={mockOnErrorClick}
        />
      );

      expect(screen.getByText('3 errors, 0 warnings')).toBeInTheDocument();
      expect(screen.getByText('Error 1')).toBeInTheDocument();
      expect(screen.getByText('Error 2')).toBeInTheDocument();
      expect(screen.getByText('Error 3')).toBeInTheDocument();
    });

    it('should display error with line and column information', () => {
      const validationResults: ValidationResult = {
        valid: false,
        errors: [
          { message: 'Missing required element', line: 10, column: 5, severity: 'error' }
        ],
        warnings: []
      };

      render(
        <ValidationPanel
          validationResults={validationResults}
          onFixClick={mockOnFixClick}
          onErrorClick={mockOnErrorClick}
        />
      );

      expect(screen.getByText('Line 10, Col 5')).toBeInTheDocument();
      expect(screen.getByText('Missing required element')).toBeInTheDocument();
    });

    it('should display error with context', () => {
      const validationResults: ValidationResult = {
        valid: false,
        errors: [
          {
            message: 'Unknown element',
            line: 5,
            column: 3,
            context: '<unknownElement>Content</unknownElement>',
            severity: 'error'
          }
        ],
        warnings: []
      };

      render(
        <ValidationPanel
          validationResults={validationResults}
          onFixClick={mockOnFixClick}
          onErrorClick={mockOnErrorClick}
        />
      );

      expect(screen.getByText('<unknownElement>Content</unknownElement>')).toBeInTheDocument();
    });

    it('should call onErrorClick when error item is clicked', async () => {
      const user = userEvent.setup();
      const validationResults: ValidationResult = {
        valid: false,
        errors: [
          { message: 'Test error', line: 1, column: 1, severity: 'error' }
        ],
        warnings: []
      };

      render(
        <ValidationPanel
          validationResults={validationResults}
          onFixClick={mockOnFixClick}
          onErrorClick={mockOnErrorClick}
        />
      );

      const errorItem = screen.getByText('Test error').closest('div');
      if (errorItem) {
        await user.click(errorItem);
      }

      expect(mockOnErrorClick).toHaveBeenCalledTimes(1);
      expect(mockOnErrorClick).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Test error' })
      );
    });
  });

  describe('rendering validation warnings', () => {
    it('should display warning count and severity', () => {
      const validationResults: ValidationResult = {
        valid: true,
        errors: [],
        warnings: [
          { message: 'Warning 1', line: 1, column: 5, code: 'WARN001' },
          { message: 'Warning 2', line: 2, column: 10, code: 'WARN002' }
        ]
      };

      render(
        <ValidationPanel
          validationResults={validationResults}
          onFixClick={mockOnFixClick}
          onErrorClick={mockOnErrorClick}
        />
      );

      expect(screen.getByText('0 errors, 2 warnings')).toBeInTheDocument();
      expect(screen.getByText('Warning 1')).toBeInTheDocument();
      expect(screen.getByText('Warning 2')).toBeInTheDocument();
    });

    it('should display warning with location information', () => {
      const validationResults: ValidationResult = {
        valid: true,
        errors: [],
        warnings: [
          { message: 'Deprecated attribute', line: 15, column: 8, code: 'DEPRECATED' }
        ]
      };

      render(
        <ValidationPanel
          validationResults={validationResults}
          onFixClick={mockOnFixClick}
          onErrorClick={mockOnErrorClick}
        />
      );

      expect(screen.getByText('Line 15, Col 8')).toBeInTheDocument();
      expect(screen.getByText('Deprecated attribute')).toBeInTheDocument();
    });
  });

  describe('filtering by severity', () => {
    it('should filter to show only errors', async () => {
      const user = userEvent.setup();
      const validationResults: ValidationResult = {
        valid: false,
        errors: [
          { message: 'Error 1', line: 1, column: 1, severity: 'error' }
        ],
        warnings: [
          { message: 'Warning 1', line: 2, column: 1, code: 'WARN001' }
        ]
      };

      render(
        <ValidationPanel
          validationResults={validationResults}
          onFixClick={mockOnFixClick}
          onErrorClick={mockOnErrorClick}
        />
      );

      // Both error and warning should be visible initially
      expect(screen.getByText('Error 1')).toBeInTheDocument();
      expect(screen.getByText('Warning 1')).toBeInTheDocument();

      // Click Errors filter
      await user.click(screen.getByRole('button', { name: /errors/i }));

      // Only error should be visible
      expect(screen.getByText('Error 1')).toBeInTheDocument();
      expect(screen.queryByText('Warning 1')).not.toBeInTheDocument();
    });

    it('should filter to show only warnings', async () => {
      const user = userEvent.setup();
      const validationResults: ValidationResult = {
        valid: false,
        errors: [
          { message: 'Error 1', line: 1, column: 1, severity: 'error' }
        ],
        warnings: [
          { message: 'Warning 1', line: 2, column: 1, code: 'WARN001' }
        ]
      };

      render(
        <ValidationPanel
          validationResults={validationResults}
          onFixClick={mockOnFixClick}
          onErrorClick={mockOnErrorClick}
        />
      );

      // Click Warnings filter
      await user.click(screen.getByRole('button', { name: /warnings/i }));

      // Only warning should be visible
      expect(screen.queryByText('Error 1')).not.toBeInTheDocument();
      expect(screen.getByText('Warning 1')).toBeInTheDocument();
    });

    it('should show all when filter is reset', async () => {
      const user = userEvent.setup();
      const validationResults: ValidationResult = {
        valid: false,
        errors: [
          { message: 'Error 1', line: 1, column: 1, severity: 'error' }
        ],
        warnings: [
          { message: 'Warning 1', line: 2, column: 1, code: 'WARN001' }
        ]
      };

      render(
        <ValidationPanel
          validationResults={validationResults}
          onFixClick={mockOnFixClick}
          onErrorClick={mockOnErrorClick}
        />
      );

      // Click Errors filter
      await user.click(screen.getByRole('button', { name: /errors/i }));

      // Click All filter
      await user.click(screen.getByRole('button', { name: /all/i }));

      // Both should be visible again
      expect(screen.getByText('Error 1')).toBeInTheDocument();
      expect(screen.getByText('Warning 1')).toBeInTheDocument();
    });
  });

  describe('quick-fix suggestions', () => {
    it('should display fix suggestions when available', () => {
      const validationResults: ValidationResult = {
        valid: false,
        errors: [
          { message: 'Unknown element', line: 1, column: 1, severity: 'error' }
        ],
        warnings: [],
        suggestions: [
          {
            type: 'rename-element',
            message: 'Check if this element name is correct or remove it',
            line: 1,
            column: 1,
            suggestion: 'Verify the element name matches the schema'
          }
        ]
      };

      render(
        <ValidationPanel
          validationResults={validationResults}
          onFixClick={mockOnFixClick}
          onErrorClick={mockOnErrorClick}
        />
      );

      expect(screen.getByText('Check if this element name is correct or remove it')).toBeInTheDocument();
      expect(screen.getByText('Verify the element name matches the schema')).toBeInTheDocument();
    });

    it('should call onFixClick when fix suggestion button is clicked', async () => {
      const user = userEvent.setup();
      const suggestion: FixSuggestion = {
        type: 'add-element',
        message: 'Add the required missing elements',
        line: 1,
        column: 1,
        suggestion: 'Review the schema to see which elements are required'
      };

      const validationResults: ValidationResult = {
        valid: false,
        errors: [
          { message: 'Missing required element', line: 1, column: 1, severity: 'error' }
        ],
        warnings: [],
        suggestions: [suggestion]
      };

      render(
        <ValidationPanel
          validationResults={validationResults}
          onFixClick={mockOnFixClick}
          onErrorClick={mockOnErrorClick}
        />
      );

      const fixButton = screen.getByRole('button', { name: /apply fix/i });
      await user.click(fixButton);

      expect(mockOnFixClick).toHaveBeenCalledTimes(1);
      expect(mockOnFixClick).toHaveBeenCalledWith(suggestion);
    });

    it('should not display fix suggestions section when none available', () => {
      const validationResults: ValidationResult = {
        valid: false,
        errors: [
          { message: 'Error without suggestion', line: 1, column: 1, severity: 'error' }
        ],
        warnings: [],
        suggestions: []
      };

      render(
        <ValidationPanel
          validationResults={validationResults}
          onFixClick={mockOnFixClick}
          onErrorClick={mockOnErrorClick}
        />
      );

      expect(screen.queryByText('Suggested Fixes')).not.toBeInTheDocument();
    });
  });

  describe('error severity badges', () => {
    it('should display error badge for errors', () => {
      const validationResults: ValidationResult = {
        valid: false,
        errors: [
          { message: 'Critical error', line: 1, column: 1, severity: 'error' }
        ],
        warnings: []
      };

      render(
        <ValidationPanel
          validationResults={validationResults}
          onFixClick={mockOnFixClick}
          onErrorClick={mockOnErrorClick}
        />
      );

      expect(screen.getByText('Error')).toBeInTheDocument();
    });

    it('should display warning badge for warnings', () => {
      const validationResults: ValidationResult = {
        valid: true,
        errors: [],
        warnings: [
          { message: 'Minor warning', line: 1, column: 1, code: 'WARN001' }
        ]
      };

      render(
        <ValidationPanel
          validationResults={validationResults}
          onFixClick={mockOnFixClick}
          onErrorClick={mockOnErrorClick}
        />
      );

      expect(screen.getByText('Warning')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should be accessible with proper ARIA labels', () => {
      const validationResults: ValidationResult = {
        valid: false,
        errors: [
          { message: 'Test error', line: 1, column: 1, severity: 'error' }
        ],
        warnings: []
      };

      render(
        <ValidationPanel
          validationResults={validationResults}
          onFixClick={mockOnFixClick}
          onErrorClick={mockOnErrorClick}
        />
      );

      const panel = screen.getByRole('region', { name: /validation results/i });
      expect(panel).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should handle errors without line/column information', () => {
      const validationResults: ValidationResult = {
        valid: false,
        errors: [
          { message: 'General error without location', severity: 'error' }
        ],
        warnings: []
      };

      render(
        <ValidationPanel
          validationResults={validationResults}
          onFixClick={mockOnFixClick}
          onErrorClick={mockOnErrorClick}
        />
      );

      expect(screen.getByText('General error without location')).toBeInTheDocument();
      expect(screen.queryByText(/Line \d+/)).not.toBeInTheDocument();
    });

    it('should handle large number of errors with scroll', () => {
      const errors: ValidationError[] = Array.from({ length: 50 }, (_, i) => ({
        message: `Error ${i + 1}`,
        line: i + 1,
        column: 1,
        severity: 'error' as const
      }));

      const validationResults: ValidationResult = {
        valid: false,
        errors,
        warnings: []
      };

      render(
        <ValidationPanel
          validationResults={validationResults}
          onFixClick={mockOnFixClick}
          onErrorClick={mockOnErrorClick}
        />
      );

      expect(screen.getByText('50 errors, 0 warnings')).toBeInTheDocument();
      expect(screen.getByText('Error 1')).toBeInTheDocument();
      expect(screen.getByText('Error 50')).toBeInTheDocument();
    });
  });
});
