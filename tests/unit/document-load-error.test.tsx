import { render, screen } from '@testing-library/react';
import DocumentLoadError from '@/components/navigation/DocumentLoadError';

describe('DocumentLoadError', () => {
  it('displays error message for not found', () => {
    const error = new Error('Document nonexistent not found');
    render(<DocumentLoadError error={error} />);

    expect(screen.getByText('Failed to load document')).toBeInTheDocument();
    expect(screen.getByText(/nonexistent/)).toBeInTheDocument();
  });

  it('displays retry action', () => {
    const error = new Error('Failed to load');
    const onRetry = jest.fn();
    render(<DocumentLoadError error={error} onRetry={onRetry} />);

    const tryAgainButton = screen.getByRole('button', { name: /try again/i });
    expect(tryAgainButton).toBeInTheDocument();
  });

  it('provides link back to gallery when no retry', () => {
    const error = new Error('Failed to load');
    render(<DocumentLoadError error={error} />);

    const backLink = screen.getByRole('link', { name: /back to gallery/i });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute('href', '/');
  });
});
