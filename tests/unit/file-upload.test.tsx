import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FileUpload } from '@/components/editor/FileUpload';
import { DocumentProvider } from '@/lib/context/DocumentContext';
import { ErrorProvider } from '@/lib/context/ErrorContext';
import { toast } from '@/components/ui/use-toast';

// Mock the toast function
jest.mock('@/components/ui/use-toast', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

describe('FileUpload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderWithProvider = () => {
    return render(
      <ErrorProvider>
        <DocumentProvider>
          <FileUpload />
        </DocumentProvider>
      </ErrorProvider>
    );
  };

  test('shows error toast on file read failure', async () => {
    const { container } = renderWithProvider();

    // Find the hidden file input
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeInTheDocument();

    const file = new File(['invalid content'], 'test.xml', { type: 'text/xml' });

    // Mock file.text() to reject
    const mockText = jest.fn().mockRejectedValue(new Error('Failed to read file'));
    Object.defineProperty(file, 'text', {
      value: mockText,
      writable: true,
    });

    // Simulate file selection
    await fireEvent.change(input, { target: { files: [file] } });

    // Wait for async error handling
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Failed to read file',
        expect.objectContaining({
          description: expect.any(String),
        })
      );
    });
  });

  test('shows success toast on successful upload', async () => {
    const { container } = renderWithProvider();

    // Find the hidden file input
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeInTheDocument();

    const file = new File(['<TEI>valid content</TEI>'], 'test.xml', { type: 'text/xml' });

    // Mock file.text() to resolve successfully
    const mockText = jest.fn().mockResolvedValue('<TEI>valid content</TEI>');
    Object.defineProperty(file, 'text', {
      value: mockText,
      writable: true,
    });

    // Simulate file selection
    await fireEvent.change(input, { target: { files: [file] } });

    // Wait for async operations
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Document uploaded successfully');
    });
  });
});
