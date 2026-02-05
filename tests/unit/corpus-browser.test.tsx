// @ts-nocheck
import { render, screen, waitFor } from '@testing-library/react';
import { CorpusBrowser } from '@/components/samples/CorpusBrowser';
import { DocumentProvider } from '@/lib/context/DocumentContext';
import { ErrorProvider } from '@/lib/context/ErrorContext';

// Mock fetch
global.fetch = jest.fn();

describe('CorpusBrowser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should display loading state initially', () => {
    (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

    render(
      <ErrorProvider>
        <DocumentProvider>
          <CorpusBrowser />
        </DocumentProvider>
      </ErrorProvider>
    );

    expect(screen.getByText('Loading corpus...')).toBeInTheDocument();
  });

  test('should display corpus browser card', () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(
      <ErrorProvider>
        <DocumentProvider>
          <CorpusBrowser />
        </DocumentProvider>
      </ErrorProvider>
    );

    expect(screen.getByText('Browse Wright American Fiction Corpus')).toBeInTheDocument();
    expect(screen.getByText('Access 3,000+ novels from 1851-1875')).toBeInTheDocument();
  });

  test('should filter novels based on search', async () => {
    const mockNovels = [
      { name: 'novel1.xml', download_url: 'https://example.com/novel1.xml' },
      { name: 'novel2.xml', download_url: 'https://example.com/novel2.xml' },
    ];

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockNovels,
    });

    render(
      <ErrorProvider>
        <DocumentProvider>
          <CorpusBrowser />
        </DocumentProvider>
      </ErrorProvider>
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search novels...')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search novels...');
    searchInput.value = 'novel1';
    searchInput.dispatchEvent(new Event('change', { bubbles: true }));

    await waitFor(() => {
      expect(screen.getByText('novel1')).toBeInTheDocument();
    });
  });

  test('should handle fetch errors gracefully', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    render(
      <ErrorProvider>
        <DocumentProvider>
          <CorpusBrowser />
        </DocumentProvider>
      </ErrorProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Failed to load corpus/)).toBeInTheDocument();
    });
  });

  test('should display no results message when search matches nothing', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(
      <ErrorProvider>
        <DocumentProvider>
          <CorpusBrowser />
        </DocumentProvider>
      </ErrorProvider>
    );

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Search novels...');
      searchInput.value = 'nonexistent';
      searchInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await waitFor(() => {
      expect(screen.getByText(/No novels found matching/)).toBeInTheDocument();
    });
  });
});
