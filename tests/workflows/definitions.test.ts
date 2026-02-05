/**
 * Tests for Workflow Definitions
 *
 * Tests predefined workflow configurations for multi-step tagging.
 */

import {
  SimpleQuote,
  CharacterIntroduction,
  LocationEntrance,
  getAllWorkflows,
  getWorkflowById,
} from '@/lib/workflows/definitions';

describe('Workflow Definitions', () => {
  describe('SimpleQuote Workflow', () => {
    test('should have correct metadata', () => {
      expect(SimpleQuote.id).toBe('simple-quote');
      expect(SimpleQuote.name).toBe('Simple Quote');
      expect(SimpleQuote.description).toBeDefined();
    });

    test('should have wrap quote step', () => {
      expect(SimpleQuote.steps).toHaveLength(1);

      const step = SimpleQuote.steps[0];
      expect(step.id).toBe('wrap-quote');
      expect(step.prompt).toContain('quote');
      expect(step.tagName).toBe('q');
      expect(step.attributes).toEqual({});
    });

    test('should not require entity selection', () => {
      const step = SimpleQuote.steps[0];
      expect(step.requiresEntity).toBe(false);
    });
  });

  describe('CharacterIntroduction Workflow', () => {
    test('should have correct metadata', () => {
      expect(CharacterIntroduction.id).toBe('character-introduction');
      expect(CharacterIntroduction.name).toBe('Character Introduction');
      expect(CharacterIntroduction.description).toBeDefined();
    });

    test('should have three steps: wrap, said, select speaker', () => {
      expect(CharacterIntroduction.steps).toHaveLength(3);

      const [wrapStep, saidStep, speakerStep] = CharacterIntroduction.steps;

      // Step 1: Wrap in persName
      expect(wrapStep.id).toBe('wrap-persname');
      expect(wrapStep.tagName).toBe('persName');
      expect(wrapStep.requiresEntity).toBe(false);

      // Step 2: Wrap in said
      expect(saidStep.id).toBe('wrap-said');
      expect(saidStep.tagName).toBe('said');
      expect(saidStep.requiresEntity).toBe(false);

      // Step 3: Select speaker
      expect(speakerStep.id).toBe('select-speaker');
      expect(speakerStep.prompt).toContain('speaker');
      expect(speakerStep.requiresEntity).toBe(true);
      expect(speakerStep.entityType).toBe('character');
    });
  });

  describe('LocationEntrance Workflow', () => {
    test('should have correct metadata', () => {
      expect(LocationEntrance.id).toBe('location-entrance');
      expect(LocationEntrance.name).toBe('Location Entrance');
      expect(LocationEntrance.description).toBeDefined();
    });

    test('should have two steps: wrap placeName, add description', () => {
      expect(LocationEntrance.steps).toHaveLength(2);

      const [wrapStep, descStep] = LocationEntrance.steps;

      // Step 1: Wrap in placeName
      expect(wrapStep.id).toBe('wrap-placename');
      expect(wrapStep.tagName).toBe('placeName');
      expect(wrapStep.requiresEntity).toBe(false);

      // Step 2: Add description tag
      expect(descStep.id).toBe('add-description');
      expect(descStep.tagName).toBe('q');
      expect(descStep.prompt).toContain('description');
      expect(descStep.requiresEntity).toBe(false);
    });
  });

  describe('getAllWorkflows', () => {
    test('should return all predefined workflows', () => {
      const workflows = getAllWorkflows();

      expect(workflows).toHaveLength(3);
      expect(workflows.map((w) => w.id)).toEqual([
        'simple-quote',
        'character-introduction',
        'location-entrance',
      ]);
    });

    test('should return immutable array', () => {
      const workflows1 = getAllWorkflows();
      const workflows2 = getAllWorkflows();

      expect(workflows1).not.toBe(workflows2);
    });
  });

  describe('getWorkflowById', () => {
    test('should return workflow by id', () => {
      const workflow = getWorkflowById('simple-quote');

      expect(workflow).toBeDefined();
      expect(workflow?.id).toBe('simple-quote');
    });

    test('should return undefined for unknown id', () => {
      const workflow = getWorkflowById('unknown-workflow');

      expect(workflow).toBeUndefined();
    });

    test('should find all workflow ids', () => {
      const ids = ['simple-quote', 'character-introduction', 'location-entrance'];

      ids.forEach((id) => {
        const workflow = getWorkflowById(id);
        expect(workflow).toBeDefined();
        expect(workflow?.id).toBe(id);
      });
    });
  });
});
