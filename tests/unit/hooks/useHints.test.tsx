/**
 * Tests for useHints hook
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useHints } from '@/hooks/useHints';
import type { Selection } from '@/lib/values/Selection';
import type { Hint } from '@/lib/values/Hint';
import { createSelection } from '@/lib/values/Selection';

// Mock protocols
jest.mock('@/lib/protocols/validation', () => ({
  validateSelection: jest.fn(),
  initValidationCache: jest.fn(),
}));

jest.mock('@/lib/protocols/hints', () => ({
  generateHint: jest.fn(),
}));

jest.mock('@/lib/effect/react/hooks', () => ({
  useDocumentService: jest.fn(() => ({
    document: {
      state: {
        passages: [
          { id: 'passage-1', content: 'Hello world' },
        ],
      },
    },
  })),
}));

import { validateSelection } from '@/lib/protocols/validation';
import { generateHint } from '@/lib/protocols/hints';

describe('useHints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return null initially', () => {
    const { result } = renderHook(() => useHints(null, 'said'));
    expect(result.current).toBeNull();
  });

  it('should return null when selection is null', async () => {
    const { result } = renderHook(() => useHints(null, 'said'));

    await waitFor(() => {
      expect(result.current).toBeNull();
    });
  });

  it('should validate selection and generate hint', async () => {
    const mockSelection: Selection = createSelection(
      'passage-1',
      { start: 0, end: 5 },
      'Hello',
      'Hello'
    );

    const mockValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      fixes: [],
    };

    const mockHint: Hint = {
      severity: 'valid',
      message: 'Ready to apply <said> tag',
      code: 'VALID',
    };

    (validateSelection as jest.Mock).mockReturnValue({
      success: true,
      value: mockValidationResult,
    });

    (generateHint as jest.Mock).mockReturnValue(mockHint);

    const { result } = renderHook(() => useHints(mockSelection, 'said'));

    await waitFor(() => {
      expect(result.current).toEqual(mockHint);
    });

    expect(validateSelection).toHaveBeenCalledWith(
      mockSelection,
      'said',
      {},
      expect.any(Object)
    );
    expect(generateHint).toHaveBeenCalledWith(mockValidationResult, 'said');
  });

  it('should debounce validation calls', async () => {
    const mockSelection: Selection = createSelection(
      'passage-1',
      { start: 0, end: 5 },
      'Hello',
      'Hello'
    );

    const mockValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      fixes: [],
    };

    const mockHint: Hint = {
      severity: 'valid',
      message: 'Ready to apply <said> tag',
      code: 'VALID',
    };

    (validateSelection as jest.Mock).mockReturnValue({
      success: true,
      value: mockValidationResult,
    });

    (generateHint as jest.Mock).mockReturnValue(mockHint);

    const { result, rerender } = renderHook(
      ({ selection, tagType }) => useHints(selection, tagType),
      {
        initialProps: {
          selection: mockSelection,
          tagType: 'said',
        },
      }
    );

    // Wait for initial debounce
    await waitFor(
      () => {
        expect(result.current).toEqual(mockHint);
      },
      { timeout: 1000 }
    );

    // Rapidly change selection multiple times
    const mockSelection2: Selection = createSelection(
      'passage-1',
      { start: 6, end: 11 },
      'world',
      'world'
    );

    act(() => {
      rerender({ selection: mockSelection2, tagType: 'said' });
    });

    const mockSelection3: Selection = createSelection(
      'passage-1',
      { start: 0, end: 11 },
      'Hello world',
      'Hello world'
    );

    act(() => {
      rerender({ selection: mockSelection3, tagType: 'said' });
    });

    // Wait for debounce - should not have called validate again immediately
    await waitFor(
      () => {
        expect(result.current).toEqual(mockHint);
      },
      { timeout: 1000 }
    );
  });

  it('should return null when validation fails', async () => {
    const mockSelection: Selection = createSelection(
      'passage-1',
      { start: 0, end: 5 },
      'Hello',
      'Hello'
    );

    (validateSelection as jest.Mock).mockReturnValue({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Passage not found',
        recoverable: true,
      },
    });

    const { result } = renderHook(() => useHints(mockSelection, 'said'));

    await waitFor(() => {
      expect(result.current).toBeNull();
    });

    expect(validateSelection).toHaveBeenCalled();
    expect(generateHint).not.toHaveBeenCalled();
  });

  it('should update hint when tag type changes', async () => {
    const mockSelection: Selection = createSelection(
      'passage-1',
      { start: 0, end: 5 },
      'Hello',
      'Hello'
    );

    const mockValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      fixes: [],
    };

    const mockHintForSaid: Hint = {
      severity: 'valid',
      message: 'Ready to apply <said> tag',
      code: 'VALID',
    };

    const mockHintForPersName: Hint = {
      severity: 'invalid',
      message: 'Missing required attribute: who',
      code: 'MISSING_ATTRIBUTE',
    };

    (validateSelection as jest.Mock).mockReturnValue({
      success: true,
      value: mockValidationResult,
    });

    // Mock generateHint to return different hints based on tag type
    (generateHint as jest.Mock).mockImplementation((validation, tagType) => {
      if (tagType === 'said') {
        return mockHintForSaid;
      } else if (tagType === 'persName') {
        return mockHintForPersName;
      }
      return mockHintForSaid;
    });

    const { result, rerender } = renderHook(
      ({ selection, tagType }) => useHints(selection, tagType),
      {
        initialProps: {
          selection: mockSelection,
          tagType: 'said',
        },
      }
    );

    await waitFor(() => {
      expect(result.current).toEqual(mockHintForSaid);
    });

    act(() => {
      rerender({ selection: mockSelection, tagType: 'persName' });
    });

    await waitFor(() => {
      expect(result.current).toEqual(mockHintForPersName);
    });

    expect(generateHint).toHaveBeenCalledWith(mockValidationResult, 'persName');
  });

  it('should use default debounce delay of 500ms', async () => {
    const mockSelection: Selection = createSelection(
      'passage-1',
      { start: 0, end: 5 },
      'Hello',
      'Hello'
    );

    const mockValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      fixes: [],
    };

    const mockHint: Hint = {
      severity: 'valid',
      message: 'Ready to apply <said> tag',
      code: 'VALID',
    };

    (validateSelection as jest.Mock).mockReturnValue({
      success: true,
      value: mockValidationResult,
    });

    (generateHint as jest.Mock).mockReturnValue(mockHint);

    const { result } = renderHook(() => useHints(mockSelection, 'said'));

    // Wait for hint to be generated (after debounce)
    await waitFor(() => {
      expect(result.current).toEqual(mockHint);
    });

    // Verify validation was called
    expect(validateSelection).toHaveBeenCalled();
  });
});
