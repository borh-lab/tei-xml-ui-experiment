import { createWorkflow, createWorkflowStep, createWorkflowPlan, getCurrentStep } from '@/lib/values/Workflow';

describe('Workflow value', () => {
  it('should create workflow', () => {
    const wf = createWorkflow('simple-quote', 'Simple Quote', [
      createWorkflowStep('Who said this?', 'said', true, { who: '' }),
    ]);
    expect(wf.id).toBe('simple-quote');
    expect(wf.name).toBe('Simple Quote');
    expect(wf.steps).toHaveLength(1);
  });

  it('should create workflow with description', () => {
    const wf = createWorkflow('test', 'Test', [createWorkflowStep('P', 'said')], 'Description');
    expect(wf.description).toBe('Description');
  });

  it('should reject workflow with no steps', () => {
    expect(() => createWorkflow('test', 'Test', [])).toThrow();
  });

  it('should create workflow step with all fields', () => {
    const step = createWorkflowStep('Who said this?', 'said', true, { who: '' });
    expect(step.prompt).toBe('Who said this?');
    expect(step.tagType).toBe('said');
    expect(step.required).toBe(true);
    expect(step.attributes).toEqual({ who: '' });
  });

  it('should create workflow step with defaults', () => {
    const step = createWorkflowStep('Prompt', 'said');
    expect(step.required).toBe(true);
    expect(step.attributes).toBeUndefined();
  });

  it('should create workflow plan', () => {
    const wf = createWorkflow('test', 'Test', [createWorkflowStep('Prompt', 'said')]);
    const plan = createWorkflowPlan(wf, 0);
    expect(plan.totalSteps).toBe(1);
    expect(plan.currentStep).toBe(0);
    expect(plan.canProceed).toBe(false);
    expect(plan.canGoBack).toBe(false);
  });

  it('should calculate canProceed correctly', () => {
    const wf = createWorkflow('test', 'Test', [
      createWorkflowStep('P1', 'said'),
      createWorkflowStep('P2', 'q'),
    ]);
    const plan1 = createWorkflowPlan(wf, 0);
    expect(plan1.canProceed).toBe(true);
    const plan2 = createWorkflowPlan(wf, 1);
    expect(plan2.canProceed).toBe(false);
  });

  it('should calculate canGoBack correctly', () => {
    const wf = createWorkflow('test', 'Test', [
      createWorkflowStep('P1', 'said'),
      createWorkflowStep('P2', 'q'),
    ]);
    const plan1 = createWorkflowPlan(wf, 0);
    expect(plan1.canGoBack).toBe(false);
    const plan2 = createWorkflowPlan(wf, 1);
    expect(plan2.canGoBack).toBe(true);
  });

  it('should get current step', () => {
    const wf = createWorkflow('test', 'Test', [
      createWorkflowStep('P1', 'said'),
      createWorkflowStep('P2', 'q'),
    ]);
    const plan = createWorkflowPlan(wf, 0);
    expect(getCurrentStep(plan).prompt).toBe('P1');
  });

  it('should get second step as current', () => {
    const wf = createWorkflow('test', 'Test', [
      createWorkflowStep('P1', 'said'),
      createWorkflowStep('P2', 'q'),
    ]);
    const plan = createWorkflowPlan(wf, 1);
    expect(getCurrentStep(plan).prompt).toBe('P2');
  });
});
