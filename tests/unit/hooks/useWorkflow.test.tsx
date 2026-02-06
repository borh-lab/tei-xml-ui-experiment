/**
 * Tests for useWorkflow Hook
 *
 * Tests workflow state management and execution.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useWorkflow } from '@/hooks/useWorkflow';
import { SimpleQuote, CharacterIntroduction } from '@/lib/workflows/definitions';
import { Character, type PassageID, type TextRange } from '@/lib/tei/types';

// Mock V2 document context
jest.mock('@/lib/context/DocumentContext', () => ({
  useDocumentContext: () => ({
    document: mockDocument,
    loading: false,
    loadingSample: false,
    loadingProgress: 0,
    validationResults: null,
    isValidating: false,
    lastSavedRevision: null,
    lastSavedAt: null,
    error: null,
    loadDocument: jest.fn(),
    loadSample: jest.fn(),
    updateDocument: jest.fn(),
    setDocument: jest.fn(),
    clearDocument: jest.fn(),
    addSaidTag: jest.fn(),
    addQTag: jest.fn(),
    addPersNameTag: jest.fn(),
    addTag: jest.fn(),
    removeTag: jest.fn(),
    addCharacter: jest.fn(),
    updateCharacter: jest.fn(),
    removeCharacter: jest.fn(),
    addRelationship: jest.fn(),
    removeRelationship: jest.fn(),
    undo: jest.fn(),
    redo: jest.fn(),
    getHistoryState: jest.fn(),
    timeTravel: jest.fn(),
    validate: jest.fn(),
  }),
}));

describe('useWorkflow Hook', () => {
  const mockPassageId = 'passage-123' as PassageID;
  const mockRange: TextRange = { start: 0, end: 10 };
  const mockCharacters: Character[] = [
    {
      id: 'char-1' as const,
      xmlId: 'char1',
      name: 'Alice',
      sex: 'F',
      age: 30,
    },
    {
      id: 'char-2' as const,
      xmlId: 'char2',
      name: 'Bob',
      sex: 'M',
      age: 35,
    },
  ];

  const mockDocumentService = {
    document: {
      state: {
        characters: mockCharacters,
      },
    },
    addTag: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useDocumentService as jest.Mock).mockReturnValue(mockDocumentService);
  });

  test('should initialize with idle state', () => {
    const { result } = renderHook(() => useWorkflow());

    expect(result.current.activeWorkflow).toBeNull();
    expect(result.current.currentStep).toBeNull();
    expect(result.current.progress).toBe(0);
    expect(result.current.canGoBack).toBe(false);
    expect(result.current.canProgress).toBe(false);
    expect(result.current.isComplete).toBe(false);
    expect(result.current.error).toBeNull();
  });

  test('should start SimpleQuote workflow successfully', async () => {
    const { result } = renderHook(() => useWorkflow());

    await act(async () => {
      const started = await result.current.startWorkflow({
        workflow: SimpleQuote,
        passageId: mockPassageId,
        range: mockRange,
      });

      expect(started).toBe(true);
    });

    expect(result.current.activeWorkflow).toBe('simple-quote');
    expect(result.current.currentStep).toBeDefined();
    expect(result.current.currentStep?.id).toBe('wrap-quote');
    expect(result.current.totalSteps).toBe(1);
    expect(result.current.progress).toBe(0);
    expect(result.current.canProgress).toBe(true);
    expect(result.current.canGoBack).toBe(false);
  });

  test('should start CharacterIntroduction workflow successfully', async () => {
    const { result } = renderHook(() => useWorkflow());

    await act(async () => {
      const started = await result.current.startWorkflow({
        workflow: CharacterIntroduction,
        passageId: mockPassageId,
        range: mockRange,
      });

      expect(started).toBe(true);
    });

    expect(result.current.activeWorkflow).toBe('character-introduction');
    expect(result.current.currentStep).toBeDefined();
    expect(result.current.currentStep?.id).toBe('wrap-persname');
    expect(result.current.totalSteps).toBe(3);
    expect(result.current.progress).toBe(0);
  });

  test('should move to next step', async () => {
    const { result } = renderHook(() => useWorkflow());

    await act(async () => {
      await result.current.startWorkflow({
        workflow: CharacterIntroduction,
        passageId: mockPassageId,
        range: mockRange,
      });
    });

    // Initially at step 0
    expect(result.current.currentStep?.id).toBe('wrap-persname');

    // Move to next step
    await act(async () => {
      const moved = await result.current.nextStep();
      expect(moved).toBe(true);
    });

    expect(result.current.currentStep?.id).toBe('wrap-said');
    expect(result.current.progress).toBeGreaterThan(0);
    expect(result.current.canGoBack).toBe(true);
  });

  test('should move to previous step', async () => {
    const { result } = renderHook(() => useWorkflow());

    await act(async () => {
      await result.current.startWorkflow({
        workflow: CharacterIntroduction,
        passageId: mockPassageId,
        range: mockRange,
      });
    });

    // Move to step 1
    await act(async () => {
      await result.current.nextStep();
    });

    expect(result.current.currentStep?.id).toBe('wrap-said');

    // Go back to step 0
    await act(async () => {
      const moved = await result.current.previousStep();
      expect(moved).toBe(true);
    });

    expect(result.current.currentStep?.id).toBe('wrap-persname');
    expect(result.current.canGoBack).toBe(false);
  });

  test('should not go back from first step', async () => {
    const { result } = renderHook(() => useWorkflow());

    await act(async () => {
      await result.current.startWorkflow({
        workflow: SimpleQuote,
        passageId: mockPassageId,
        range: mockRange,
      });
    });

    await act(async () => {
      const moved = await result.current.previousStep();
      expect(moved).toBe(false);
    });

    expect(result.current.currentStep?.id).toBe('wrap-quote');
  });

  test('should not progress beyond last step', async () => {
    const { result } = renderHook(() => useWorkflow());

    await act(async () => {
      await result.current.startWorkflow({
        workflow: SimpleQuote,
        passageId: mockPassageId,
        range: mockRange,
      });
    });

    // Already at last (only) step
    await act(async () => {
      const moved = await result.current.nextStep();
      expect(moved).toBe(false);
    });

    expect(result.current.currentStep?.id).toBe('wrap-quote');
  });

  test('should complete step and move to next', async () => {
    const { result } = renderHook(() => useWorkflow());

    await act(async () => {
      await result.current.startWorkflow({
        workflow: CharacterIntroduction,
        passageId: mockPassageId,
        range: mockRange,
      });
    });

    // Complete first step (wrap persName)
    await act(async () => {
      const completed = await result.current.completeStep({});
      expect(completed).toBe(true);
    });

    expect(result.current.currentStep?.id).toBe('wrap-said');
    expect(result.current.progress).toBeGreaterThan(0);
  });

  test('should complete workflow on final step', async () => {
    const { result } = renderHook(() => useWorkflow());

    await act(async () => {
      await result.current.startWorkflow({
        workflow: SimpleQuote,
        passageId: mockPassageId,
        range: mockRange,
      });
    });

    // Complete the only step
    await act(async () => {
      const completed = await result.current.completeStep({});
      expect(completed).toBe(true);
    });

    // Workflow should be cleared after completion
    await waitFor(() => {
      expect(result.current.activeWorkflow).toBeNull();
    });
    expect(mockDocumentService.addTag).toHaveBeenCalledWith(
      mockPassageId,
      mockRange,
      'q',
      {}
    );
  });

  test('should cancel workflow', async () => {
    const { result } = renderHook(() => useWorkflow());

    await act(async () => {
      await result.current.startWorkflow({
        workflow: CharacterIntroduction,
        passageId: mockPassageId,
        range: mockRange,
      });
    });

    expect(result.current.activeWorkflow).toBe('character-introduction');

    await act(async () => {
      result.current.cancelWorkflow();
    });

    expect(result.current.activeWorkflow).toBeNull();
    expect(result.current.currentStep).toBeNull();
    expect(result.current.progress).toBe(0);
  });

  test('should handle errors when starting workflow', async () => {
    const { result } = renderHook(() => useWorkflow());

    // Test with invalid workflow (no steps)
    const invalidWorkflow = {
      ...SimpleQuote,
      steps: [],
    };

    await act(async () => {
      const started = await result.current.startWorkflow({
        workflow: invalidWorkflow,
        passageId: mockPassageId,
        range: mockRange,
      });

      expect(started).toBe(false);
    });

    expect(result.current.error).not.toBeNull();
    expect(result.current.activeWorkflow).toBeNull();
  });

  test('should track entity selection in workflow', async () => {
    const { result } = renderHook(() => useWorkflow());

    await act(async () => {
      await result.current.startWorkflow({
        workflow: CharacterIntroduction,
        passageId: mockPassageId,
        range: mockRange,
      });
    });

    // Navigate to speaker selection step (step 2)
    await act(async () => {
      await result.current.nextStep();
    });

    await act(async () => {
      await result.current.nextStep();
    });

    expect(result.current.currentStep?.id).toBe('select-speaker');
    expect(result.current.currentStep?.requiresEntity).toBe(true);
    expect(result.current.currentStep?.availableEntities).toHaveLength(2);

    // Complete step with selected entity
    await act(async () => {
      const completed = await result.current.completeStep({
        selectedEntityId: 'char-1',
      });

      expect(completed).toBe(true);
    });

    // Should apply tag with who attribute
    // After completion, workflow should be cleared
    await waitFor(() => {
      expect(result.current.activeWorkflow).toBeNull();
    });
  });
});
