/**
 * Integration Tests for Real-Time Hints
 *
 * Tests the complete flow: selection → validation → hint → display
 */

import React from 'react';
import { render, screen, act, waitFor, renderHook } from '@testing-library/react';
import { RealTimeHints } from '@/components/hints/RealTimeHints';
import { useSelection } from '@/hooks/useSelection';
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
          { id: 'passage-1', content: 'Hello world this is a test passage' },
        ],
      },
    },
  })),
}));

import { validateSelection } from '@/lib/protocols/validation';
import { generateHint } from '@/lib/protocols/hints';

describe('Real-Time Hints Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock window.getSelection
    const mockRange = {
      getClientRects: () => [
        { left: 100, top: 100, right: 200, bottom: 120, width: 100, height: 20 },
      ],
    };

    const mockSelection = {
      rangeCount: 1,
      getRangeAt: () => mockRange,
    };

    window.getSelection = jest.fn(() => mockSelection as any);
  });

  describe('Selection → Hint → Display Flow', () => {
    it('should display hint when user selects text', async () => {
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
        isSuccess: true,
        value: mockValidationResult,
      });

      (generateHint as jest.Mock).mockReturnValue(mockHint);

      const onHintAccepted = jest.fn();

      const { container } = render(
        <RealTimeHints
          selection={mockSelection}
          activeTagType="said"
          hint={mockHint}
          onHintAccepted={onHintAccepted}
        />
      );

      // Wait for debouncing and rendering
      await waitFor(() => {
        expect(container.querySelector('.realtime-hints-outline')).toBeInTheDocument();
      });

      // Check outline color
      const outline = container.querySelector('.realtime-hints-outline');
      expect(outline).toHaveClass('outline-green');

      // Check tooltip is displayed
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
      expect(screen.getByText('Ready to apply <said> tag')).toBeInTheDocument();
    });

    it('should update hint when selection changes', async () => {
      const mockSelection1: Selection = createSelection(
        'passage-1',
        { start: 0, end: 5 },
        'Hello',
        'Hello'
      );

      const mockHint1: Hint = {
        severity: 'valid',
        message: 'Ready to apply <said> tag',
        code: 'VALID',
      };

      const mockSelection2: Selection = createSelection(
        'passage-1',
        { start: 6, end: 11 },
        'world',
        'world'
      );

      const mockHint2: Hint = {
        severity: 'invalid',
        message: 'Missing required attribute: who',
        code: 'MISSING_ATTRIBUTE',
      };

      const onHintAccepted = jest.fn();

      const { container, rerender } = render(
        <RealTimeHints
          selection={mockSelection1}
          activeTagType="said"
          hint={mockHint1}
          onHintAccepted={onHintAccepted}
        />
      );

      // Wait for initial render
      await waitFor(() => {
        expect(container.querySelector('.outline-green')).toBeInTheDocument();
      });

      // Change selection and hint
      rerender(
        <RealTimeHints
          selection={mockSelection2}
          activeTagType="said"
          hint={mockHint2}
          onHintAccepted={onHintAccepted}
        />
      );

      // Wait for update
      await waitFor(() => {
        expect(container.querySelector('.outline-red')).toBeInTheDocument();
      });

      expect(screen.getByText('Missing required attribute: who')).toBeInTheDocument();
    });

    it('should hide hints when selection is cleared', async () => {
      const mockSelection: Selection = createSelection(
        'passage-1',
        { start: 0, end: 5 },
        'Hello',
        'Hello'
      );

      const mockHint: Hint = {
        severity: 'valid',
        message: 'Ready to apply tag',
        code: 'VALID',
      };

      const onHintAccepted = jest.fn();

      const { container, rerender } = render(
        <RealTimeHints
          selection={mockSelection}
          activeTagType="said"
          hint={mockHint}
          onHintAccepted={onHintAccepted}
        />
      );

      // Wait for initial render
      await waitFor(() => {
        expect(container.querySelector('.realtime-hints-outline')).toBeInTheDocument();
      });

      // Clear selection and hint
      rerender(
        <RealTimeHints
          selection={null}
          activeTagType="said"
          hint={null}
          onHintAccepted={onHintAccepted}
        />
      );

      // Check hints are hidden
      await waitFor(() => {
        expect(container.querySelector('.realtime-hints-outline')).not.toBeInTheDocument();
      });

      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
  });

  describe('Debouncing Behavior', () => {
    it('should debounce validation calls during rapid selection changes', async () => {
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
        message: 'Ready to apply tag',
        code: 'VALID',
      };

      (validateSelection as jest.Mock).mockReturnValue({
        isSuccess: true,
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

      // Wait for initial debouncing
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

      // Wait for debounce - should stabilize on last hint
      await waitFor(
        () => {
          expect(result.current).toEqual(mockHint);
        },
        { timeout: 1000 }
      );

      // Should have called validation (debounced)
      expect(validateSelection).toHaveBeenCalled();
    });
  });

  describe('Outline Colors Match Validation', () => {
    it('should show green outline for valid hints', async () => {
      const mockSelection: Selection = createSelection(
        'passage-1',
        { start: 0, end: 5 },
        'Hello',
        'Hello'
      );

      const mockHint: Hint = {
        severity: 'valid',
        message: 'Ready to apply tag',
        code: 'VALID',
      };

      const { container } = render(
        <RealTimeHints
          selection={mockSelection}
          activeTagType="said"
          hint={mockHint}
          onHintAccepted={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(container.querySelector('.outline-green')).toBeInTheDocument();
      });
    });

    it('should show yellow outline for warning hints', async () => {
      const mockSelection: Selection = createSelection(
        'passage-1',
        { start: 0, end: 5 },
        'Hello',
        'Hello'
      );

      const mockHint: Hint = {
        severity: 'warning',
        message: 'Consider adding speaker',
        code: 'MISSING_OPTIONAL',
      };

      const { container } = render(
        <RealTimeHints
          selection={mockSelection}
          activeTagType="said"
          hint={mockHint}
          onHintAccepted={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(container.querySelector('.outline-yellow')).toBeInTheDocument();
      });
    });

    it('should show red outline for invalid hints', async () => {
      const mockSelection: Selection = createSelection(
        'passage-1',
        { start: 0, end: 5 },
        'Hello',
        'Hello'
      );

      const mockHint: Hint = {
        severity: 'invalid',
        message: 'Missing required attribute',
        code: 'MISSING_ATTRIBUTE',
      };

      const { container } = render(
        <RealTimeHints
          selection={mockSelection}
          activeTagType="said"
          hint={mockHint}
          onHintAccepted={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(container.querySelector('.outline-red')).toBeInTheDocument();
      });
    });
  });

  describe('Hint Action Handling', () => {
    it('should call onHintAccepted when action button is clicked', async () => {
      const mockSelection: Selection = createSelection(
        'passage-1',
        { start: 0, end: 5 },
        'Hello',
        'Hello'
      );

      const mockHint: Hint = {
        severity: 'invalid',
        message: 'Missing required attribute: who',
        code: 'MISSING_ATTRIBUTE',
        suggestedAction: {
          type: 'add-attribute',
          label: 'Add who attribute',
          attributes: { who: 'speaker-1' },
        },
      };

      const onHintAccepted = jest.fn();

      render(
        <RealTimeHints
          selection={mockSelection}
          activeTagType="said"
          hint={mockHint}
          onHintAccepted={onHintAccepted}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Add who attribute')).toBeInTheDocument();
      });

      const actionButton = screen.getByText('Add who attribute');
      act(() => {
        actionButton.click();
      });

      expect(onHintAccepted).toHaveBeenCalledWith(mockHint.suggestedAction);
    });
  });
});
