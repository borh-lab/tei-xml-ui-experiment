import { render, screen, fireEvent } from '@testing-library/react';
import { DocumentViewV2 } from '../DocumentViewV2';
import { initialState } from '@/lib/values/DocumentState';
import type { TEIDocument } from '@/lib/tei/types';

describe('DocumentViewV2', () => {
  it('should render with initial state', () => {
    render(<DocumentViewV2 />);

    expect(screen.getByText('Document')).toBeInTheDocument();
    expect(screen.getByText('Entities')).toBeInTheDocument();
    expect(screen.getByText('Validation')).toBeInTheDocument();
  });

  it('should accept injected state for testing', () => {
    const customState = {
      ...initialState(),
      document: {
        state: {
          revision: 1,
          metadata: { title: 'Test Doc', author: 'Test Author', created: new Date() },
          characters: [
            { id: 'char1', name: 'Jane Doe', sex: 'F' as const } as any,
          ],
          relationships: [],
          passages: [],
          dialogue: [],
          places: [],
          organizations: [],
        },
      } as TEIDocument,
    };

    render(<DocumentViewV2 initialState={customState} />);

    // Should display injected document info
    expect(screen.getByText('Test Doc')).toBeInTheDocument();
  });

  it('should switch tabs', () => {
    render(<DocumentViewV2 />);

    const documentTab = screen.getByText('Document');
    const entitiesTab = screen.getByText('Entities');

    expect(documentTab).toHaveClass('active');

    fireEvent.click(entitiesTab);
    expect(entitiesTab).toHaveClass('active');
    expect(documentTab).not.toHaveClass('active');
  });

  it('should show loading state when loading', () => {
    const loadingState = {
      ...initialState(),
      status: 'loading' as const,
    };

    render(<DocumentViewV2 initialState={loadingState} />);

    // Buttons should be disabled during loading
    expect(screen.getByText('Document')).toBeDisabled();
    expect(screen.getByText('Entities')).toBeDisabled();
  });

  it('should show error message on error', () => {
    const errorState = {
      ...initialState(),
      error: new Error('Test error'),
    };

    render(<DocumentViewV2 initialState={errorState} />);

    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  it('should display validation results', () => {
    const validationState = {
      ...initialState(),
      validation: {
        results: {
          valid: false,
          errors: [{ message: 'Test error', line: 1, column: 1 }],
          warnings: [],
        },
        revision: 1,
        validatedAt: new Date('2024-01-01'),
      },
    };

    render(<DocumentViewV2 initialState={validationState} />);

    fireEvent.click(screen.getByText('Validation'));
    expect(screen.getByText(/Errors: 1/)).toBeInTheDocument();
  });
});
