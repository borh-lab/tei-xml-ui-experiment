/**
 * Tests for Workflow Protocol
 *
 * Tests workflow planning, execution, and validation.
 */

import { planWorkflow, type WorkflowPlan } from '@/lib/protocols/workflows';
import { SimpleQuote, CharacterIntroduction } from '@/lib/workflows/definitions';
import { Character, type PassageID, type TextRange } from '@/lib/tei/types';

describe('Workflow Protocol', () => {
  describe('planWorkflow', () => {
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

    test('should plan SimpleQuote workflow successfully', () => {
      const result = planWorkflow({
        workflow: SimpleQuote,
        passageId: mockPassageId,
        range: mockRange,
        characters: mockCharacters,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        const plan = result.value;

        expect(plan.workflowId).toBe('simple-quote');
        expect(plan.steps).toHaveLength(1);
        expect(plan.currentStepIndex).toBe(0);
        expect(plan.totalSteps).toBe(1);
        expect(plan.canProgress).toBe(true);
        expect(plan.canGoBack).toBe(false);
        expect(plan.isComplete).toBe(false);

        const step = plan.steps[0];
        expect(step.id).toBe('wrap-quote');
        expect(step.tagName).toBe('q');
        expect(step.requiresEntity).toBe(false);
      }
    });

    test('should plan CharacterIntroduction workflow successfully', () => {
      const result = planWorkflow({
        workflow: CharacterIntroduction,
        passageId: mockPassageId,
        range: mockRange,
        characters: mockCharacters,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        const plan = result.value;

        expect(plan.workflowId).toBe('character-introduction');
        expect(plan.steps).toHaveLength(3);
        expect(plan.totalSteps).toBe(3);
        expect(plan.currentStepIndex).toBe(0);

        // Check first step (wrap persName)
        const step1 = plan.steps[0];
        expect(step1.id).toBe('wrap-persname');
        expect(step1.requiresEntity).toBe(false);

        // Check second step (wrap said)
        const step2 = plan.steps[1];
        expect(step2.id).toBe('wrap-said');
        expect(step2.requiresEntity).toBe(false);

        // Check third step (select speaker)
        const step3 = plan.steps[2];
        expect(step3.id).toBe('select-speaker');
        expect(step3.requiresEntity).toBe(true);
        expect(step3.entityType).toBe('character');
        expect(step3.availableEntities).toHaveLength(2);
        expect(step3.availableEntities?.[0].id).toBe('char-1');
      }
    });

    test('should filter out archived characters from available entities', () => {
      const charactersWithArchived: Character[] = [
        ...mockCharacters,
        {
          id: 'char-3' as const,
          xmlId: 'char3',
          name: 'Archived Char',
          sex: 'M',
          age: 40,
          traits: ['archived'], // Marked as archived
        },
      ];

      const result = planWorkflow({
        workflow: CharacterIntroduction,
        passageId: mockPassageId,
        range: mockRange,
        characters: charactersWithArchived,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        const plan = result.value;
        const speakerStep = plan.steps[2];

        expect(speakerStep.availableEntities).toHaveLength(2);
        expect(speakerStep.availableEntities?.every((e) => !e.archived)).toBe(true);
      }
    });

    test('should return error for empty character list when required', () => {
      const result = planWorkflow({
        workflow: CharacterIntroduction,
        passageId: mockPassageId,
        range: mockRange,
        characters: [],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('NO_ENTITIES_AVAILABLE');
        expect(result.error.recoverable).toBe(true);
      }
    });

    test('should calculate nested selections correctly', () => {
      const result = planWorkflow({
        workflow: CharacterIntroduction,
        passageId: mockPassageId,
        range: mockRange,
        characters: mockCharacters,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        const plan = result.value;

        // First step creates nested context for second step
        expect(plan.steps[0].nestedSelection).toBeUndefined();
        expect(plan.steps[1].nestedSelection).toBeDefined();
        expect(plan.steps[2].nestedSelection).toBeDefined();
      }
    });

    test('should handle empty range gracefully', () => {
      const emptyRange: TextRange = { start: 0, end: 0 };

      const result = planWorkflow({
        workflow: SimpleQuote,
        passageId: mockPassageId,
        range: emptyRange,
        characters: mockCharacters,
      });

      expect(result.success).toBe(true);
    });

    test('should validate workflow structure', () => {
      // Create invalid workflow (no steps)
      const invalidWorkflow = {
        ...SimpleQuote,
        steps: [],
      };

      const result = planWorkflow({
        workflow: invalidWorkflow,
        passageId: mockPassageId,
        range: mockRange,
        characters: mockCharacters,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_WORKFLOW');
      }
    });
  });

  describe('WorkflowPlan navigation', () => {
    const mockPassageId = 'passage-123' as PassageID;
    const mockRange: TextRange = { start: 0, end: 10 };
    const mockCharacters: Character[] = [
      {
        id: 'char-1' as const,
        xmlId: 'char1',
        name: 'Alice',
        sex: 'F',
      },
    ];

    test('should track progress correctly', () => {
      const result = planWorkflow({
        workflow: CharacterIntroduction,
        passageId: mockPassageId,
        range: mockRange,
        characters: mockCharacters,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        const plan = result.value;

        // Initial state
        expect(plan.currentStepIndex).toBe(0);
        expect(plan.progress).toBe(0);

        // After completing first step (simulated)
        expect(plan.totalSteps).toBe(3);
      }
    });

    test('should know when workflow is complete', () => {
      const result = planWorkflow({
        workflow: SimpleQuote,
        passageId: mockPassageId,
        range: mockRange,
        characters: mockCharacters,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        const plan = result.value;

        // Single-step workflow starts incomplete
        expect(plan.isComplete).toBe(false);
        expect(plan.canProgress).toBe(true);
      }
    });
  });
});
