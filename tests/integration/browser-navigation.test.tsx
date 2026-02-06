/**
 * Integration Tests for Browser Navigation
 *
 * Tests the complete flow for URL synchronization and browser history navigation.
 * Focus on smoke tests for critical paths.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { useRouter, useSearchParams } from 'next/navigation';
import URLSyncProvider from '@/lib/navigation/URLSyncProvider';
import { useNavigation } from '@/lib/navigation/URLSyncProvider';
import { useDocumentContext } from '@/lib/context/DocumentContext';

// Mock Next.js navigation
jest.mock('next/navigation');

// Mock DocumentContext
jest.mock('@/lib/context/DocumentContext');

describe('Browser Navigation Integration', () => {
  const mockPush = jest.fn().mockResolvedValue(undefined);
  const mockReplace = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock useRouter
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      replace: mockReplace,
    });

    // Mock useSearchParams
    (useSearchParams as jest.Mock).mockReturnValue(
      new URLSearchParams()
    );
  });

  describe('Smoke Tests - Basic Rendering', () => {
    it('renders URLSyncProvider without crashing', () => {
      (useDocumentContext as jest.Mock).mockReturnValue({
        document: null,
        loadSample: jest.fn().mockResolvedValue(undefined),
        loadDocument: jest.fn().mockResolvedValue(undefined),
        currentDocId: null,
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

      const searchParams = new URLSearchParams();

      render(
        <URLSyncProvider searchParams={searchParams}>
          <div>Child Component</div>
        </URLSyncProvider>
      );

      expect(screen.getByText('Child Component')).toBeInTheDocument();
    });

    it('provides navigation context to children', () => {
      (useDocumentContext as jest.Mock).mockReturnValue({
        document: null,
        loadSample: jest.fn().mockResolvedValue(undefined),
        loadDocument: jest.fn().mockResolvedValue(undefined),
        currentDocId: null,
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

      const searchParams = new URLSearchParams();

      function TestComponent() {
        const navigation = useNavigation();
        return (
          <div>
            <div>Load Error: {navigation.loadError?.message || 'None'}</div>
          </div>
        );
      }

      render(
        <URLSyncProvider searchParams={searchParams}>
          <TestComponent />
        </URLSyncProvider>
      );

      expect(screen.getByText('Load Error: None')).toBeInTheDocument();
    });
  });

  describe('URL Sync on Mount', () => {
    it('attempts to load document when doc param is present', async () => {
      const loadSample = jest.fn().mockResolvedValue(undefined);

      (useDocumentContext as jest.Mock).mockReturnValue({
        document: null,
        loadSample,
        loadDocument: jest.fn().mockResolvedValue(undefined),
        currentDocId: null,
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

      const searchParams = new URLSearchParams('doc=sample-dialogism-1');

      render(
        <URLSyncProvider searchParams={searchParams}>
          <div>Child Component</div>
        </URLSyncProvider>
      );

      // Wait for async load
      await waitFor(() => {
        expect(loadSample).toHaveBeenCalledWith('dialogism-1');
      });
    });

    it('does not load document when doc param is absent', () => {
      const loadSample = jest.fn().mockResolvedValue(undefined);

      (useDocumentContext as jest.Mock).mockReturnValue({
        document: null,
        loadSample,
        loadDocument: jest.fn().mockResolvedValue(undefined),
        currentDocId: null,
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
          <div>Child Component</div>
        </URLSyncProvider>
      );

      expect(loadSample).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('exposes load error through navigation context', async () => {
      const mockError = new Error('Invalid document ID format: invalid-doc');

      (useDocumentContext as jest.Mock).mockReturnValue({
        document: null,
        loadSample: jest.fn().mockRejectedValue(mockError),
        loadDocument: jest.fn().mockResolvedValue(undefined),
        currentDocId: null,
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

      const searchParams = new URLSearchParams('doc=invalid-doc');

      function TestComponent() {
        const navigation = useNavigation();
        return (
          <div>
            <div data-testid="error-message">
              {navigation.loadError?.message || 'No Error'}
            </div>
          </div>
        );
      }

      render(
        <URLSyncProvider searchParams={searchParams}>
          <TestComponent />
        </URLSyncProvider>
      );

      // Wait for error to be set
      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent('Invalid document ID format: invalid-doc');
      });
    });

    it('shows error for invalid document ID format', async () => {
      const mockError = new Error('Invalid document ID format: unknown-format-doc');

      (useDocumentContext as jest.Mock).mockReturnValue({
        document: null,
        loadSample: jest.fn().mockRejectedValue(mockError),
        loadDocument: jest.fn().mockResolvedValue(undefined),
        currentDocId: null,
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

      const searchParams = new URLSearchParams('doc=unknown-format-doc');

      function TestComponent() {
        const navigation = useNavigation();
        return (
          <div>
            <div data-testid="error-message">
              {navigation.loadError?.message || 'No Error'}
            </div>
          </div>
        );
      }

      render(
        <URLSyncProvider searchParams={searchParams}>
          <TestComponent />
        </URLSyncProvider>
      );

      // Wait for error to be set
      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent('Invalid document ID format');
      });
    });
  });

  describe('URL Updates on Document Load', () => {
    it('updates URL when document loads via gallery', async () => {
      (useDocumentContext as jest.Mock).mockReturnValue({
        document: { state: { metadata: { title: 'Test' } } },
        loadSample: jest.fn().mockResolvedValue(undefined),
        loadDocument: jest.fn().mockResolvedValue(undefined),
        currentDocId: 'sample-dialogism-1',
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

      const searchParams = new URLSearchParams();

      render(
        <URLSyncProvider searchParams={searchParams}>
          <div>Child Component</div>
        </URLSyncProvider>
      );

      // Wait for URL update
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/?doc=sample-dialogism-1');
      });
    });
  });

  describe('Browser History Integration', () => {
    it('adds popstate event listener on mount', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');

      (useDocumentContext as jest.Mock).mockReturnValue({
        document: null,
        loadSample: jest.fn().mockResolvedValue(undefined),
        loadDocument: jest.fn().mockResolvedValue(undefined),
        currentDocId: null,
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

      const searchParams = new URLSearchParams();

      const { unmount } = render(
        <URLSyncProvider searchParams={searchParams}>
          <div>Child Component</div>
        </URLSyncProvider>
      );

      expect(addEventListenerSpy).toHaveBeenCalledWith('popstate', expect.any(Function));

      // Cleanup
      addEventListenerSpy.mockRestore();
    });

    it('removes popstate event listener on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

      (useDocumentContext as jest.Mock).mockReturnValue({
        document: null,
        loadSample: jest.fn().mockResolvedValue(undefined),
        loadDocument: jest.fn().mockResolvedValue(undefined),
        currentDocId: null,
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

      const searchParams = new URLSearchParams();

      const { unmount } = render(
        <URLSyncProvider searchParams={searchParams}>
          <div>Child Component</div>
        </URLSyncProvider>
      );

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('popstate', expect.any(Function));

      // Cleanup
      removeEventListenerSpy.mockRestore();
    });
  });
});
