/**
 * @jest-environment jsdom
 */

import { render, screen, waitFor } from '@testing-library/react';
import { DocumentProviderV2, useDocumentContext } from '@/lib/context/DocumentContext';
import { initialState } from '@/lib/values/DocumentState';
import type { DocumentState } from '@/lib/values/DocumentState';

// Test component to access context
function TestComponent() {
  const { document, loading } = useDocumentContext();

  return (
    <div>
      <div data-testid="status">{loading ? 'loading' : 'idle'}</div>
      <div data-testid="has-document">{document ? 'yes' : 'no'}</div>
    </div>
  );
}

describe('DocumentProviderV2', () => {
  it('should render children', () => {
    render(
      <DocumentProviderV2>
        <div data-testid="child">Child Component</div>
      </DocumentProviderV2>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText('Child Component')).toBeInTheDocument();
  });

  it('should provide V2 state structure', () => {
    render(
      <DocumentProviderV2>
        <TestComponent />
      </DocumentProviderV2>
    );

    expect(screen.getByTestId('status')).toHaveTextContent('idle');
    expect(screen.getByTestId('has-document')).toHaveTextContent('no');
  });

  it('should accept injected initial state', () => {
    // Create a custom state with loading status
    const customState: DocumentState = {
      document: null,
      status: 'loading',
      validation: null,
      error: null,
    };

    render(
      <DocumentProviderV2 initialState={customState}>
        <TestComponent />
      </DocumentProviderV2>
    );

    expect(screen.getByTestId('status')).toHaveTextContent('loading');
  });

  it('should provide context with document and loading state', () => {
    render(
      <DocumentProviderV2>
        <TestComponent />
      </DocumentProviderV2>
    );

    // If component renders without error, context is properly provided
    expect(screen.getByTestId('status')).toBeInTheDocument();
    expect(screen.getByTestId('has-document')).toBeInTheDocument();
  });

  it('should provide operations through context', () => {
    function TestComponentWithOps() {
      const { loadDocument, addSaidTag, removeTag } = useDocumentContext();

      return (
        <div>
          <div data-testid="has-loadDocument">{typeof loadDocument}</div>
          <div data-testid="has-addSaidTag">{typeof addSaidTag}</div>
          <div data-testid="has-removeTag">{typeof removeTag}</div>
        </div>
      );
    }

    render(
      <DocumentProviderV2>
        <TestComponentWithOps />
      </DocumentProviderV2>
    );

    expect(screen.getByTestId('has-loadDocument')).toHaveTextContent('function');
    expect(screen.getByTestId('has-addSaidTag')).toHaveTextContent('function');
    expect(screen.getByTestId('has-removeTag')).toHaveTextContent('function');
  });
});
