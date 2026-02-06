/**
 * @ts-nocheck
 */

import { render, screen } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import URLSyncProvider from '@/lib/navigation/URLSyncProvider';
import { useDocumentContext } from '@/lib/context/DocumentContext';

jest.mock('next/navigation');
jest.mock('@/lib/context/DocumentContext');

describe('URLSyncProvider', () => {
  const mockPush = jest.fn();
  const mockReplace = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as any).mockReturnValue({
      push: mockPush,
      replace: mockReplace,
    });
  });

  it('renders children without crashing', () => {
    (useDocumentContext as any).mockReturnValue({
      document: null,
      loadSample: jest.fn().mockResolvedValue(undefined),
      loadDocument: jest.fn().mockResolvedValue(undefined),
      loading: false,
      loadingSample: false,
      loadingProgress: 0,
      validationResults: null,
      isValidating: false,
      error: null,
      updateDocument: jest.fn(),
      setDocument: jest.fn(),
      clearDocument: jest.fn(),
    });

    const searchParams = new URLSearchParams('');

    render(
      <URLSyncProvider searchParams={searchParams}>
        <div>Child Content</div>
      </URLSyncProvider>
    );

    expect(screen.getByText('Child Content')).toBeInTheDocument();
  });

  it('does not crash when doc param is present', () => {
    const loadSample = jest.fn().mockResolvedValue(undefined);
    (useDocumentContext as any).mockReturnValue({
      document: null,
      loadSample,
      loadDocument: jest.fn().mockResolvedValue(undefined),
      loading: false,
      loadingSample: false,
      loadingProgress: 0,
      validationResults: null,
      isValidating: false,
      error: null,
      updateDocument: jest.fn(),
      setDocument: jest.fn(),
      clearDocument: jest.fn(),
    });

    const searchParams = new URLSearchParams('?doc=dialogism-1');

    render(
      <URLSyncProvider searchParams={searchParams}>
        <div>Child Content</div>
      </URLSyncProvider>
    );

    expect(screen.getByText('Child Content')).toBeInTheDocument();
  });

  it('renders children even when loadError is set', () => {
    (useDocumentContext as any).mockReturnValue({
      document: null,
      loadSample: jest.fn().mockRejectedValue(new Error('Load failed')),
      loadDocument: jest.fn().mockResolvedValue(undefined),
      loading: false,
      loadingSample: false,
      loadingProgress: 0,
      validationResults: null,
      isValidating: false,
      error: null,
      updateDocument: jest.fn(),
      setDocument: jest.fn(),
      clearDocument: jest.fn(),
    });

    const searchParams = new URLSearchParams('?doc=nonexistent');

    render(
      <URLSyncProvider searchParams={searchParams}>
        <div>Child Content</div>
      </URLSyncProvider>
    );

    expect(screen.getByText('Child Content')).toBeInTheDocument();
  });
});
