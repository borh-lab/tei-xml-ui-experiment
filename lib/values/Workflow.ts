export interface WorkflowStep {
  readonly prompt: string;
  readonly tagType: string;
  readonly attributes?: Record<string, string>;
  readonly required: boolean;
}

export interface Workflow {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly steps: WorkflowStep[];
}

export interface WorkflowPlan {
  readonly workflow: Workflow;
  readonly currentStep: number;
  readonly totalSteps: number;
  readonly canProceed: boolean;
  readonly canGoBack: boolean;
}

export function createWorkflow(
  id: string,
  name: string,
  steps: WorkflowStep[],
  description?: string
): Workflow {
  if (steps.length === 0) {
    throw new Error('Workflow must have at least one step');
  }
  return { id, name, description, steps };
}

export function createWorkflowStep(
  prompt: string,
  tagType: string,
  required: boolean = true,
  attributes?: Record<string, string>
): WorkflowStep {
  return { prompt, tagType, required, attributes };
}

export function createWorkflowPlan(workflow: Workflow, currentStep: number = 0): WorkflowPlan {
  return {
    workflow,
    currentStep,
    totalSteps: workflow.steps.length,
    canProceed: currentStep < workflow.steps.length - 1,
    canGoBack: currentStep > 0,
  };
}

export function getCurrentStep(plan: WorkflowPlan): WorkflowStep {
  return plan.workflow.steps[plan.currentStep];
}
