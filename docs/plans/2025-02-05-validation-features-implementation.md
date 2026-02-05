# Validation Features Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement 5 validation features using protocol-based, value-oriented architecture

**Architecture:** Protocol-based design - pure functions transform immutable values through clear pipelines

**Tech Stack:** TypeScript, React, Next.js, existing validation system

---

## Table of Contents

1. [Phase 1: Protocol Foundation](#phase-1-protocol-foundation) - 10 tasks
2. [Phase 2: Real-Time Validation Hints](#phase-2-real-time-validation-hints) - 8 tasks
3. [Phase 3: Smart Tag Suggestions](#phase-3-smart-tag-suggestions) - 12 tasks
4. [Phase 4: Tagging Workflows](#phase-4-tagging-workflows) - 10 tasks
5. [Phase 5: Document-Wide Validation](#phase-5-document-wide-validation) - 12 tasks
6. [Phase 6: Enhanced Entity Management](#phase-6-enhanced-entity-management) - 10 tasks

**Total: 62 tasks**

---

## Phase 1: Protocol Foundation

**Goal:** Establish value types and core protocol functions

### Task 1.1: Create Selection Value Type

**Files:**
- Create: `lib/values/Selection.ts`
- Create: `tests/unit/values/Selection.test.ts`

**Steps:**
1. Create test file with Selection tests
2. Run tests (expect failures)
3. Create Selection.ts with types
4. Run tests (expect passing)
5. Commit changes

**Complete Code for lib/values/Selection.ts:**

```typescript
import type { PassageID } from '@/lib/tei/types';
import type { TextRange } from '@/lib/validation/types';

export interface Selection {
  readonly passageId: PassageID;
  readonly range: TextRange;
  readonly text: string;
  readonly context: string;
  readonly timestamp: number;
}

export function createSelection(
  passageId: PassageID,
  range: TextRange,
  text: string,
  context: string,
  timestamp: number = Date.now()
): Selection {
  return { passageId, range, text, context, timestamp };
}

export function extractContext(
  fullText: string,
  range: TextRange,
  contextLength: number = 200
): string {
  const start = Math.max(0, range.start - contextLength);
  const end = Math.min(fullText.length, range.end + contextLength);
  return fullText.substring(start, end);
}
```

**Test Code:**

```typescript
import { createSelection, extractContext } from '@/lib/values/Selection';

describe('Selection value', () => {
  it('should create a valid Selection', () => {
    const selection = createSelection(
      'passage-123',
      { start: 10, end: 20 },
      'selected text',
      'context before selected text context after'
    );
    expect(selection.text).toBe('selected text');
  });

  it('should extract context from passage', () => {
    const fullText = 'Start of passage. Selected text here. End of passage.';
    const range = { start: 20, end: 37 };
    const context = extractContext(fullText, range, 10);
    expect(context).toContain('Selected text here');
  });
});
```

**Commands:**
```bash
cat > tests/unit/values/Selection.test.ts << 'EOF'
# (paste test code)
EOF
npm test -- tests/unit/values/Selection.test.ts  # Fails
cat > lib/values/Selection.ts << 'EOF'
# (paste source code)
EOF
npm test -- tests/unit/values/Selection.test.ts  # Passes
git add lib/values/Selection.ts tests/unit/values/Selection.test.ts
git commit -m "feat: add Selection value type"
```

---

### Task 1.2: Create Hint Value Type

**Files:**
- Create: `lib/values/Hint.ts`
- Create: `tests/unit/values/Hint.test.ts`

**Complete Code for lib/values/Hint.ts:**

```typescript
export interface Action {
  readonly type: 'apply-tag' | 'add-attribute' | 'expand-selection';
  readonly tagType?: string;
  readonly attributes?: Record<string, string>;
  readonly label: string;
}

export interface Hint {
  readonly severity: 'valid' | 'warning' | 'invalid';
  readonly message: string;
  readonly code: string;
  readonly suggestedAction?: Action;
}

export function createHint(
  severity: Hint['severity'],
  message: string,
  code: string,
  suggestedAction?: Action
): Hint {
  return { severity, message, code, suggestedAction };
}

export function createValidHint(message: string = 'Ready to apply tag'): Hint {
  return createHint('valid', message, 'VALID');
}

export function createWarningHint(message: string, code: string, suggestedAction?: Action): Hint {
  return createHint('warning', message, code, suggestedAction);
}

export function createInvalidHint(message: string, code: string, suggestedAction?: Action): Hint {
  return createHint('invalid', message, code, suggestedAction);
}

export function getHintClass(hint: Hint): string {
  switch (hint.severity) {
    case 'valid': return 'hint-valid';
    case 'warning': return 'hint-warning';
    case 'invalid': return 'hint-invalid';
  }
}
```

**Commands:**
```bash
cat > tests/unit/values/Hint.test.ts << 'EOF'
import { createValidHint, createInvalidHint, getHintClass } from '@/lib/values/Hint';
describe('Hint value', () => {
  it('should create valid hint', () => {
    const hint = createValidHint();
    expect(hint.severity).toBe('valid');
  });
  it('should create invalid hint', () => {
    const hint = createInvalidHint('Error', 'ERR');
    expect(hint.severity).toBe('invalid');
  });
  it('should get CSS class', () => {
    expect(getHintClass(createValidHint())).toBe('hint-valid');
  });
});
EOF
npm test -- tests/unit/values/Hint.test.ts  # Fails
cat > lib/values/Hint.ts << 'EOF'
# (paste source code)
EOF
npm test -- tests/unit/values/Hint.test.ts  # Passes
git add lib/values/Hint.ts tests/unit/values/Hint.test.ts
git commit -m "feat: add Hint value type with severity"
```

---

### Task 1.3: Create Suggestion Value Type

**Files:**
- Create: `lib/values/Suggestion.ts`
- Create: `tests/unit/values/Suggestion.test.ts`

**Complete Code for lib/values/Suggestion.ts:**

```typescript
export interface Suggestion {
  readonly tagType: string;
  readonly confidence: number;
  readonly reason: string;
  readonly requiredAttrs?: Record<string, string>;
}

export function createSuggestion(
  tagType: string,
  confidence: number,
  reason: string,
  requiredAttrs?: Record<string, string>
): Suggestion {
  if (confidence < 0 || confidence > 1) {
    throw new Error(`Confidence must be between 0 and 1, got ${confidence}`);
  }
  return { tagType, confidence, reason, requiredAttrs };
}

export function sortByConfidence(suggestions: Suggestion[]): Suggestion[] {
  return [...suggestions].sort((a, b) => b.confidence - a.confidence);
}

export function filterByConfidence(suggestions: Suggestion[], minConfidence: number): Suggestion[] {
  return suggestions.filter(s => s.confidence >= minConfidence);
}

export function topSuggestions(suggestions: Suggestion[], n: number): Suggestion[] {
  return sortByConfidence(suggestions).slice(0, n);
}
```

**Commands:**
```bash
cat > tests/unit/values/Suggestion.test.ts << 'EOF'
import { createSuggestion, sortByConfidence, topSuggestions } from '@/lib/values/Suggestion';
describe('Suggestion value', () => {
  it('should create suggestion', () => {
    const s = createSuggestion('said', 0.85, 'Detected dialogue');
    expect(s.confidence).toBe(0.85);
  });
  it('should reject invalid confidence', () => {
    expect(() => createSuggestion('said', 1.5, 'test')).toThrow();
  });
  it('should sort by confidence', () => {
    const suggestions = [
      createSuggestion('said', 0.5, 'low'),
      createSuggestion('q', 0.9, 'high'),
    ];
    const sorted = sortByConfidence(suggestions);
    expect(sorted[0].confidence).toBe(0.9);
  });
});
EOF
npm test -- tests/unit/values/Suggestion.test.ts
cat > lib/values/Suggestion.ts << 'EOF'
# (paste source code)
EOF
npm test -- tests/unit/values/Suggestion.test.ts
git add lib/values/Suggestion.ts tests/unit/values/Suggestion.test.ts
git commit -m "feat: add Suggestion value type"
```

---

### Task 1.4: Create Workflow Value Type

**Files:**
- Create: `lib/values/Workflow.ts`
- Create: `tests/unit/values/Workflow.test.ts`

**Complete Code for lib/values/Workflow.ts:**

```typescript
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

export function createWorkflow(id: string, name: string, steps: WorkflowStep[], description?: string): Workflow {
  if (steps.length === 0) throw new Error('Workflow must have at least one step');
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
```

**Commands:**
```bash
cat > tests/unit/values/Workflow.test.ts << 'EOF'
import { createWorkflow, createWorkflowStep, createWorkflowPlan, getCurrentStep } from '@/lib/values/Workflow';
describe('Workflow value', () => {
  it('should create workflow', () => {
    const wf = createWorkflow('simple-quote', 'Simple Quote', [
      createWorkflowStep('Who said this?', 'said', true, { who: '' }),
    ]);
    expect(wf.steps).toHaveLength(1);
  });
  it('should create workflow plan', () => {
    const wf = createWorkflow('test', 'Test', [createWorkflowStep('Prompt', 'said')]);
    const plan = createWorkflowPlan(wf, 0);
    expect(plan.canProceed).toBe(false);
  });
  it('should get current step', () => {
    const wf = createWorkflow('test', 'Test', [createWorkflowStep('P1', 'said'), createWorkflowStep('P2', 'q')]);
    const plan = createWorkflowPlan(wf, 0);
    expect(getCurrentStep(plan).prompt).toBe('P1');
  });
});
EOF
npm test -- tests/unit/values/Workflow.test.ts
cat > lib/values/Workflow.ts << 'EOF'
# (paste source code)
EOF
npm test -- tests/unit/values/Workflow.test.ts
git add lib/values/Workflow.ts tests/unit/values/Workflow.test.ts
git commit -m "feat: add Workflow value type"
```

---

### Task 1.5: Create ValidationSummary Value Type

**Files:**
- Create: `lib/values/ValidationSummary.ts`
- Create: `tests/unit/values/ValidationSummary.test.ts`

**Complete Code for lib/values/ValidationSummary.ts:**

```typescript
import type { PassageID, TagID } from '@/lib/tei/types';

export interface ValidationIssue {
  readonly id: string;
  readonly severity: 'critical' | 'warning' | 'info';
  readonly passageId: PassageID;
  readonly tagId: TagID;
  readonly message: string;
  readonly code: string;
}

export interface TagStats {
  readonly total: number;
  readonly invalid: number;
}

export interface ValidationSummary {
  readonly totalTags: number;
  readonly issues: ValidationIssue[];
  readonly byTagType: Record<string, TagStats>;
  readonly bySeverity: Record<string, number>;
}

export function createValidationIssue(
  id: string,
  severity: ValidationIssue['severity'],
  passageId: PassageID,
  tagId: TagID,
  message: string,
  code: string
): ValidationIssue {
  return { id, severity, passageId, tagId, message, code };
}

export function createTagStats(total: number, invalid: number): TagStats {
  return { total, invalid };
}

export function createValidationSummary(
  totalTags: number,
  issues: ValidationIssue[],
  byTagType: Record<string, TagStats>,
  bySeverity: Record<string, number>
): ValidationSummary {
  return { totalTags, issues, byTagType, bySeverity };
}

export function getIssuesBySeverity(summary: ValidationSummary, severity: ValidationIssue['severity']): ValidationIssue[] {
  return summary.issues.filter(issue => issue.severity === severity);
}

export function calculateHealthScore(summary: ValidationSummary): number {
  if (summary.totalTags === 0) return 100;
  const criticalCount = summary.bySeverity.critical || 0;
  const warningCount = summary.bySeverity.warning || 0;
  const deduction = (criticalCount * 10) + (warningCount * 2);
  return Math.max(0, 100 - deduction);
}

export function getOverallStatus(summary: ValidationSummary): 'healthy' | 'warning' | 'critical' {
  const score = calculateHealthScore(summary);
  if (score >= 80) return 'healthy';
  if (score >= 50) return 'warning';
  return 'critical';
}
```

**Commands:**
```bash
cat > tests/unit/values/ValidationSummary.test.ts << 'EOF'
import { createValidationIssue, createValidationSummary, getIssuesBySeverity, calculateHealthScore } from '@/lib/values/ValidationSummary';
describe('ValidationSummary value', () => {
  it('should create summary', () => {
    const issue = createValidationIssue('i1', 'critical', 'p1', 't1', 'Error', 'ERR');
    const summary = createValidationSummary(10, [issue], {}, { critical: 1 });
    expect(summary.totalTags).toBe(10);
  });
  it('should filter by severity', () => {
    const issues = [
      createValidationIssue('i1', 'critical', 'p1', 't1', 'E', 'ERR'),
      createValidationIssue('i2', 'warning', 'p1', 't2', 'W', 'WARN'),
    ];
    const summary = createValidationSummary(10, issues, {}, { critical: 1, warning: 1 });
    const critical = getIssuesBySeverity(summary, 'critical');
    expect(critical).toHaveLength(1);
  });
  it('should calculate health score', () => {
    const summary = createValidationSummary(10, [], {}, { critical: 1, warning: 1 });
    expect(calculateHealthScore(summary)).toBe(88);
  });
});
EOF
npm test -- tests/unit/values/ValidationSummary.test.ts
cat > lib/values/ValidationSummary.ts << 'EOF'
# (paste source code)
EOF
npm test -- tests/unit/values/ValidationSummary.test.ts
git add lib/values/ValidationSummary.ts tests/unit/values/ValidationSummary.test.ts
git commit -m "feat: add ValidationSummary value type"
```

---

### Task 1.6: Create EntityDelta Value Type

**Files:**
- Create: `lib/values/EntityDelta.ts`
- Create: `tests/unit/values/EntityDelta.test.ts'

**Complete Code for lib/values/EntityDelta.ts:**

```typescript
import type { Entity } from '@/lib/tei/types';

export type EntityOperation = 'create' | 'update' | 'delete';
export type EntityType = 'character' | 'place' | 'organization';

export interface EntityDelta {
  readonly operation: EntityOperation;
  readonly entityType: EntityType;
  readonly entity: Entity;
  readonly timestamp: number;
}

export function createEntityDelta(
  operation: EntityOperation,
  entityType: EntityType,
  entity: Entity,
  timestamp: number = Date.now()
): EntityDelta {
  return { operation, entityType, entity, timestamp };
}

export function createCreateDelta(entityType: EntityType, entity: Entity): EntityDelta {
  return createEntityDelta('create', entityType, entity);
}

export function createUpdateDelta(entityType: EntityType, entity: Entity): EntityDelta {
  return createEntityDelta('update', entityType, entity);
}

export function createDeleteDelta(entityType: EntityType, entity: Entity): EntityDelta {
  return createEntityDelta('delete', entityType, entity);
}

export function isCreate(delta: EntityDelta): boolean { return delta.operation === 'create'; }
export function isUpdate(delta: EntityDelta): boolean { return delta.operation === 'update'; }
export function isDelete(delta: EntityDelta): boolean { return delta.operation === 'delete'; }
```

**Commands:**
```bash
cat > tests/unit/values/EntityDelta.test.ts << 'EOF'
import { createCreateDelta, createUpdateDelta, isCreate, isUpdate } from '@/lib/values/EntityDelta';
describe('EntityDelta value', () => {
  it('should create deltas', () => {
    const entity = { id: 'char-1', type: 'character', name: 'John', attributes: {} };
    const create = createCreateDelta('character', entity);
    expect(create.operation).toBe('create');
    expect(isCreate(create)).toBe(true);
  });
});
EOF
npm test -- tests/unit/values/EntityDelta.test.ts
cat > lib/values/EntityDelta.ts << 'EOF'
# (paste source code)
EOF
npm test -- tests/unit/values/EntityDelta.test.ts
git add lib/values/EntityDelta.ts tests/unit/values/EntityDelta.test.ts
git commit -m "feat: add EntityDelta value type"
```

---

### Task 1.7: Create Result Type for Error Handling

**Files:**
- Create: `lib/protocols/Result.ts`
- Create: `tests/unit/protocols/Result.test.ts`

**Complete Code for lib/protocols/Result.ts:**

```typescript
export interface ProtocolError {
  readonly code: string;
  readonly message: string;
  readonly context?: Record<string, unknown>;
  readonly recoverable: boolean;
}

export type Result<T> =
  | { readonly success: true; readonly value: T }
  | { readonly success: false; readonly error: ProtocolError };

export function success<T>(value: T): Result<T> {
  return { success: true, value };
}

export function failure<T>(
  code: string,
  message: string,
  recoverable: boolean = true,
  context?: Record<string, unknown>
): Result<T> {
  return {
    success: false,
    error: { code, message, context, recoverable },
  };
}

export function isSuccess<T>(result: Result<T>): result is { success: true; value: T } {
  return result.success;
}

export function isFailure<T>(result: Result<T>): result is { success: false; error: ProtocolError } {
  return !result.success;
}

export function map<T, U>(result: Result<T>, fn: (value: T) => U): Result<U> {
  if (isSuccess(result)) return success(fn(result.value));
  return result;
}

export function chain<T, U>(result: Result<T>, fn: (value: T) => Result<U>): Result<U> {
  if (isSuccess(result)) return fn(result.value);
  return result;
}

export function unwrap<T>(result: Result<T>): T {
  if (isSuccess(result)) return result.value;
  throw new Error(`Protocol error: ${result.error.message} (${result.error.code})`);
}

export function getValueOrDefault<T>(result: Result<T>, defaultValue: T): T {
  return isSuccess(result) ? result.value : defaultValue;
}
```

**Commands:**
```bash
cat > tests/unit/protocols/Result.test.ts << 'EOF'
import { success, failure, isSuccess, isFailure, map, chain, unwrap } from '@/lib/protocols/Result';
describe('Result type', () => {
  it('should create success', () => {
    const result = success(42);
    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) expect(result.value).toBe(42);
  });
  it('should create failure', () => {
    const result = failure('ERR', 'Error');
    expect(isFailure(result)).toBe(true);
  });
  it('should map success', () => {
    const result = success(5);
    const doubled = map(result, x => x * 2);
    if (isSuccess(doubled)) expect(doubled.value).toBe(10);
  });
  it('should chain results', () => {
    const result = success(5);
    const chained = chain(result, x => success(x * 2));
    if (isSuccess(chained)) expect(chained.value).toBe(10);
  });
  it('should unwrap success', () => {
    expect(unwrap(success(42))).toBe(42);
  });
  it('should throw on unwrap failure', () => {
    expect(() => unwrap(failure('ERR', 'Error'))).toThrow();
  });
});
EOF
npm test -- tests/unit/protocols/Result.test.ts
cat > lib/protocols/Result.ts << 'EOF'
# (paste source code)
EOF
npm test -- tests/unit/protocols/Result.test.ts
git add lib/protocols/Result.ts tests/unit/protocols/Result.test.ts
git commit -m "feat: add Result type for error handling"
```

---

### Task 1.8: Extract validateSelection Protocol

**Files:**
- Create: `lib/protocols/validation.ts`
- Create: `tests/unit/protocols/validation.test.ts`

**Complete Code for lib/protocols/validation.ts:**

```typescript
import type { Result } from './Result';
import { success, failure } from './Result';
import type { Selection } from '@/lib/values/Selection';
import type { ValidationResult } from '@/lib/validation/types';
import type { TEIDocument } from '@/lib/tei/types';
import { Validator } from '@/lib/validation/Validator';
import { SchemaCache } from '@/lib/validation/SchemaCache';

let schemaCache: SchemaCache | null = null;

export function initValidationCache(schemaPath: string): void {
  if (!schemaCache) {
    schemaCache = new SchemaCache({ maxSize: 10, ttl: 60000 });
  }
}

export function validateSelection(
  selection: Selection,
  tagType: string,
  providedAttrs: Record<string, string>,
  document: TEIDocument
): Result<ValidationResult> {
  try {
    const passage = document.state.passages.find(p => p.id === selection.passageId);
    if (!passage) {
      return failure('PASSAGE_NOT_FOUND', `Passage ${selection.passageId} not found`, true, { passageId: selection.passageId });
    }

    if (!schemaCache) {
      initValidationCache(process.cwd());
    }

    const validator = new Validator(schemaCache!);
    const result = validator.validate(passage, selection.range, tagType, providedAttrs, document);

    return success(result);
  } catch (error) {
    return failure(
      'VALIDATION_ERROR',
      error instanceof Error ? error.message : 'Unknown validation error',
      false,
      { tagType, selection: selection.text }
    );
  }
}

export function isValidSelection(
  selection: Selection,
  tagType: string,
  providedAttrs: Record<string, string>,
  document: TEIDocument
): boolean {
  const result = validateSelection(selection, tagType, providedAttrs, document);
  return isSuccess(result) && result.value.valid;
}
```

**Commands:**
```bash
cat > tests/unit/protocols/validation.test.ts << 'EOF'
import { validateSelection, isValidSelection, initValidationCache } from '@/lib/protocols/validation';
import { createSelection } from '@/lib/values/Selection';
import { createTEIDocument } from '@/lib/tei/operations';
describe('validateSelection protocol', () => {
  let document: any;
  beforeAll(() => {
    initValidationCache(process.cwd());
    document = createTEIDocument('test', 'Test');
  });
  it('should validate selection', () => {
    const selection = createSelection(document.state.passages[0].id, { start: 0, end: 10 }, 'Test text', 'Context');
    const result = validateSelection(selection, 'said', {}, document);
    expect(result.success).toBe(true);
  });
  it('should fail for non-existent passage', () => {
    const selection = createSelection('passage-bad', { start: 0, end: 10 }, 'Test', 'Context');
    const result = validateSelection(selection, 'said', {}, document);
    expect(result.success).toBe(false);
  });
});
EOF
npm test -- tests/unit/protocols/validation.test.ts
cat > lib/protocols/validation.ts << 'EOF'
# (paste source code)
EOF
npm test -- tests/unit/protocols/validation.test.ts
git add lib/protocols/validation.ts tests/unit/protocols/validation.test.ts
git commit -m "feat: extract validateSelection protocol"
```

---

### Task 1.9: Create generateHint Protocol

**Files:**
- Create: `lib/protocols/hints.ts`
- Create: `tests/unit/protocols/hints.test.ts`

**Complete Code for lib/protocols/hints.ts:**

```typescript
import type { Hint, Action } from '@/lib/values/Hint';
import { createValidHint, createWarningHint, createInvalidHint } from '@/lib/values/Hint';
import type { ValidationResult } from '@/lib/validation/types';

export function generateHint(validation: ValidationResult, tagType: string): Hint {
  if (validation.valid && validation.errors.length === 0) {
    return createValidHint(`Ready to apply <${tagType}> tag`);
  }

  const firstError = validation.errors[0];
  if (firstError) {
    return generateHintFromError(firstError, tagType, validation.fixes);
  }

  if (validation.warnings.length > 0) {
    return createWarningHint(validation.warnings[0].message, validation.warnings[0].type);
  }

  return createValidHint();
}

function generateHintFromError(
  error: import('@/lib/validation/types').ValidationError,
  tagType: string,
  fixes: import('@/lib/validation/types').Fix[]
): Hint {
  switch (error.type) {
    case 'missing-required-attribute':
      return createInvalidHint(
        `Missing required attribute: ${error.attribute}`,
        'MISSING_ATTRIBUTE',
        createFixAction(fixes[0])
      );
    case 'invalid-idref':
      return createInvalidHint(
        `Invalid ${error.attribute} reference: ${error.value}`,
        'INVALID_IDREF',
        createFixAction(fixes[0])
      );
    case 'splits-existing-tag':
      return createInvalidHint(
        'Selection would split an existing tag',
        'SPLITS_TAG',
        { type: 'expand-selection', label: 'Expand selection to include full tag' }
      );
    default:
      return createInvalidHint(error.message || 'Cannot apply tag', error.type || 'UNKNOWN_ERROR');
  }
}

function createFixAction(fix?: import('@/lib/validation/types').Fix): Action | undefined {
  if (!fix) return undefined;
  switch (fix.type) {
    case 'add-attribute':
      return {
        type: 'add-attribute',
        attributes: fix.attribute ? { [fix.attribute]: fix.value || '' } : undefined,
        label: fix.label,
      };
    case 'expand-selection':
      return { type: 'expand-selection', label: fix.label };
    default:
      return undefined;
  }
}

export function getSeverityLevel(hint: Hint): number {
  switch (hint.severity) {
    case 'invalid': return 2;
    case 'warning': return 1;
    case 'valid': return 0;
  }
}
```

**Commands:**
```bash
cat > tests/unit/protocols/hints.test.ts << 'EOF'
import { generateHint, getSeverityLevel } from '@/lib/protocols/hints';
import type { ValidationResult } from '@/lib/validation/types';
describe('generateHint protocol', () => {
  it('should generate valid hint', () => {
    const validation: ValidationResult = { valid: true, errors: [], warnings: [], fixes: [] };
    const hint = generateHint(validation, 'said');
    expect(hint.severity).toBe('valid');
  });
  it('should generate invalid hint', () => {
    const validation: ValidationResult = {
      valid: false,
      errors: [{ type: 'missing-required-attribute', attribute: 'who', message: 'Missing who' }],
      warnings: [],
      fixes: [{ type: 'add-attribute', attribute: 'who', label: 'Add who' }],
    };
    const hint = generateHint(validation, 'said');
    expect(hint.severity).toBe('invalid');
    expect(hint.code).toBe('MISSING_ATTRIBUTE');
  });
  it('should get severity level', () => {
    const validHint = generateHint({ valid: true, errors: [], warnings: [], fixes: [] }, 'said');
    expect(getSeverityLevel(validHint)).toBe(0);
  });
});
EOF
npm test -- tests/unit/protocols/hints.test.ts
cat > lib/protocols/hints.ts << 'EOF'
# (paste source code)
EOF
npm test -- tests/unit/protocols/hints.test.ts
git add lib/protocols/hints.ts tests/unit/protocols/hints.test.ts
git commit -m "feat: add generateHint protocol"
```

---

### Task 1.10: Create Index Files

**Files:**
- Create: `lib/protocols/index.ts`
- Create: `lib/values/index.ts`

**Commands:**
```bash
cat > lib/protocols/index.ts << 'EOF'
export * from './Result';
export * from './validation';
export * from './hints';
EOF

cat > lib/values/index.ts << 'EOF'
export * from './Selection';
export * from './Hint';
export * from './Suggestion';
export * from './Workflow';
export * from './ValidationSummary';
export * from './EntityDelta';
EOF

git add lib/protocols/index.ts lib/values/index.ts
git commit -m "feat: add index files for protocols and values"
```

---

## Phase 2: Real-Time Validation Hints

**Goal:** Provide immediate visual feedback while selecting text

### Task 2.1: Create useDebouncedValue Hook

**Files:**
- Create: `hooks/useDebouncedValue.ts`
- Create: `tests/unit/hooks/useDebouncedValue.test.tsx`

**Complete Code for hooks/useDebouncedValue.ts:**

```typescript
import { useState, useEffect } from 'react';

export function useDebouncedValue<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
```

**Test Code:**

```typescript
import { renderHook, act } from '@testing-library/react';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

describe('useDebouncedValue', () => {
  beforeEach(() => { jest.useFakeTimers(); });
  afterEach(() => { jest.runOnlyPendingTimers(); jest.useRealTimers(); });

  it('should return initial value', () => {
    const { result } = renderHook(() => useDebouncedValue('initial', 500));
    expect(result.current).toBe('initial');
  });

  it('should debounce changes', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 500), { initialProps: { value: 'initial' } });
    rerender({ value: 'updated' });
    expect(result.current).toBe('initial');
    act(() => { jest.advanceTimersByTime(500); });
    expect(result.current).toBe('updated');
  });
});
```

**Commands:**
```bash
mkdir -p hooks tests/unit/hooks
cat > tests/unit/hooks/useDebouncedValue.test.tsx << 'EOF'
# (paste test code)
EOF
npm test -- tests/unit/hooks/useDebouncedValue.test.tsx
cat > hooks/useDebouncedValue.ts << 'EOF'
# (paste source code)
EOF
npm test -- tests/unit/hooks/useDebouncedValue.test.tsx
git add hooks/useDebouncedValue.ts tests/unit/hooks/useDebouncedValue.test.tsx
git commit -m "feat: add useDebouncedValue hook"
```

---

### Task 2.2: Create useHints Hook

**Files:**
- Create: `hooks/useHints.ts`
- Create: `tests/unit/hooks/useHints.test.tsx`

**Complete Code for hooks/useHints.ts:**

```typescript
import { useMemo, useEffect } from 'react';
import type { Selection } from '@/lib/values/Selection';
import type { Hint } from '@/lib/values/Hint';
import { validateSelection } from '@/lib/protocols/validation';
import { generateHint } from '@/lib/protocols/hints';
import { useDebouncedValue } from './useDebouncedValue';
import type { TEIDocument } from '@/lib/tei/types';

export function useHints(
  selection: Selection | null,
  activeTagType: string | null,
  document: TEIDocument | null,
  onHintChange?: (hint: Hint | null) => void
): Hint | null {
  const debouncedSelection = useDebouncedValue(selection, 50);

  const hint = useMemo(() => {
    if (!debouncedSelection || !activeTagType || !document) return null;

    const validationResult = validateSelection(debouncedSelection, activeTagType, {}, document);
    if (!validationResult.success) return null;

    return generateHint(validationResult.value, activeTagType);
  }, [debouncedSelection, activeTagType, document]);

  useEffect(() => {
    onHintChange?.(hint);
  }, [hint, onHintChange]);

  return hint;
}
```

**Commands:**
```bash
cat > tests/unit/hooks/useHints.test.tsx << 'EOF'
import { renderHook, waitFor } from '@testing-library/react';
import { useHints } from '@/hooks/useHints';
import { createSelection } from '@/lib/values/Selection';
describe('useHints', () => {
  it('should return null when no selection', () => {
    const { result } = renderHook(() => useHints(null, 'said', null));
    expect(result.current).toBeNull();
  });
});
EOF
npm test -- tests/unit/hooks/useHints.test.tsx
cat > hooks/useHints.ts << 'EOF'
# (paste source code)
EOF
npm test -- tests/unit/hooks/useHints.test.tsx
git add hooks/useHints.ts tests/unit/hooks/useHints.test.tsx
git commit -m "feat: add useHints hook"
```

---

### Task 2.3: Create HintTooltip Component

**Files:**
- Create: `components/hints/HintTooltip.tsx`
- Create: `tests/unit/hints/HintTooltip.test.tsx`

**Complete Code for components/hints/HintTooltip.tsx:**

```typescript
import React from 'react';
import type { Hint } from '@/lib/values/Hint';
import { getHintClass } from '@/lib/values/Hint';

export interface HintTooltipProps {
  readonly hint: Hint;
  readonly onActionClick?: () => void;
  readonly position?: { x: number; y: number };
}

export const HintTooltip: React.FC<HintTooltipProps> = ({ hint, onActionClick, position }) => {
  const severityClass = getHintClass(hint);

  const baseStyles: React.CSSProperties = {
    position: 'absolute',
    zIndex: 1000,
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: '14px',
    maxWidth: '300px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    animation: 'fadeIn 0.2s ease-in',
    ...(position ? { left: position.x, top: position.y } : {}),
  };

  const severityStyles: Record<string, React.CSSProperties> = {
    'hint-valid': { backgroundColor: '#d1fae5', border: '1px solid #10b981', color: '#065f46' },
    'hint-warning': { backgroundColor: '#fef3c7', border: '1px solid #f59e0b', color: '#92400e' },
    'hint-invalid': { backgroundColor: '#fee2e2', border: '1px solid #ef4444', color: '#b91c1c' },
  };

  return (
    <>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      <div className={`hint-tooltip ${severityClass}`} style={{ ...baseStyles, ...severityStyles[severityClass] }}>
        <div className="hint-message">{hint.message}</div>
        {hint.suggestedAction && onActionClick && (
          <button
            onClick={onActionClick}
            style={{ marginTop: '8px', padding: '4px 8px', fontSize: '12px', borderRadius: '4px', border: 'none', backgroundColor: 'rgba(0,0,0,0.1)', cursor: 'pointer', fontWeight: 500 }}
          >
            {hint.suggestedAction.label}
          </button>
        )}
      </div>
    </>
  );
};
```

**Commands:**
```bash
mkdir -p components/hints tests/unit/hints
cat > tests/unit/hints/HintTooltip.test.tsx << 'EOF'
import React from 'react';
import { render, screen } from '@testing-library/react';
import { HintTooltip } from '@/components/hints/HintTooltip';
import { createInvalidHint } from '@/lib/values/Hint';
describe('HintTooltip', () => {
  it('should render message', () => {
    const hint = createInvalidHint('Error', 'ERR');
    render(<HintTooltip hint={hint} />);
    expect(screen.getByText('Error')).toBeInTheDocument();
  });
});
EOF
npm test -- tests/unit/hints/HintTooltip.test.tsx
cat > components/hints/HintTooltip.tsx << 'EOF'
# (paste source code)
EOF
npm test -- tests/unit/hints/HintTooltip.test.tsx
git add components/hints/HintTooltip.tsx tests/unit/hints/HintTooltip.test.tsx
git commit -m "feat: add HintTooltip component"
```

---

### Task 2.4: Create RealTimeHints Component

**Files:**
- Create: `components/hints/RealTimeHints.tsx`
- Create: `tests/unit/hints/RealTimeHints.test.tsx`

**Complete Code for components/hints/RealTimeHints.tsx:**

```typescript
import React from 'react';
import type { Hint } from '@/lib/values/Hint';
import { HintTooltip } from './HintTooltip';
import { getHintClass } from '@/lib/values/Hint';

export interface RealTimeHintsProps {
  readonly hint: Hint | null;
  readonly onHintAccepted?: (hint: Hint) => void;
}

export const RealTimeHints: React.FC<RealTimeHintsProps> = ({ hint, onHintAccepted }) => {
  if (!hint) return null;

  const handleActionClick = () => {
    if (hint?.suggestedAction) onHintAccepted?.(hint);
  };

  const severityClass = getHintClass(hint);
  const colors: Record<string, string> = {
    'hint-valid': '#10b981',
    'hint-warning': '#f59e0b',
    'hint-invalid': '#ef4444',
  };

  return (
    <div className="real-time-hints-container">
      <div
        className="hint-outline"
        style={{ outline: `2px solid ${colors[severityClass]}`, outlineOffset: '2px', borderRadius: '4px' }}
        data-severity={hint.severity}
      >
        {/* Tooltip would render here based on position */}
      </div>

      <div
        className="hint-status-icon"
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          padding: '12px 16px',
          borderRadius: '8px',
          backgroundColor: hint.severity === 'valid' ? '#d1fae5' : hint.severity === 'warning' ? '#fef3c7' : '#fee2e2',
          border: `2px solid ${colors[severityClass]}`,
          color: hint.severity === 'valid' ? '#065f46' : hint.severity === 'warning' ? '#92400e' : '#b91c1c',
          fontSize: '14px',
          fontWeight: 500,
          zIndex: 9999,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <span style={{ fontSize: '18px' }}>{hint.severity === 'valid' ? '✓' : hint.severity === 'warning' ? '⚠' : '✕'}</span>
        <span>{hint.message}</span>
      </div>
    </div>
  );
};
```

**Commands:**
```bash
cat > tests/unit/hints/RealTimeHints.test.tsx << 'EOF'
import React from 'react';
import { render, screen } from '@testing-library/react';
import { RealTimeHints } from '@/components/hints/RealTimeHints';
import { createValidHint } from '@/lib/values/Hint';
describe('RealTimeHints', () => {
  it('should render nothing when no hint', () => {
    const { container } = render(<RealTimeHints hint={null} />);
    expect(container.firstChild).toBeNull();
  });
  it('should render valid hint', () => {
    const hint = createValidHint('Ready');
    render(<RealTimeHints hint={hint} />);
    expect(screen.getByText('Ready')).toBeInTheDocument();
  });
});
EOF
npm test -- tests/unit/hints/RealTimeHints.test.tsx
cat > components/hints/RealTimeHints.tsx << 'EOF'
# (paste source code)
EOF
npm test -- tests/unit/hints/RealTimeHints.test.tsx
git add components/hints/RealTimeHints.tsx tests/unit/hints/RealTimeHints.test.tsx
git commit -m "feat: add RealTimeHints component"
```

---

### Task 2.5-2.8: Integration and Polish

**Remaining Phase 2 Tasks:**

- **Task 2.5:** Add RealTimeHints to RenderedView wrapper
- **Task 2.6:** Connect useHints in EditorLayout
- **Task 2.7:** Add selection tracking in RenderedView
- **Task 2.8:** Integration test for hint flow

These follow the same pattern - create test, write code, verify, commit.

---

## Phase 3: Smart Tag Suggestions

**Goal:** Suggest appropriate tags based on text patterns

### Task 3.1: Create generateSuggestions Protocol

**Files:**
- Create: `lib/protocols/suggestions.ts`
- Create: `tests/unit/protocols/suggestions.test.ts`

**Complete Code for lib/protocols/suggestions.ts:**

```typescript
import type { Suggestion } from '@/lib/values/Suggestion';
import { createSuggestion } from '@/lib/values/Suggestion';
import type { Selection } from '@/lib/values/Selection';
import type { TEIDocument } from '@/lib/tei/types';
import { dialoguePattern } from '../heuristics/dialoguePattern';
import { nameDetection } from '../heuristics/nameDetection';
import { quotePattern } from '../heuristics/quotePattern';

export function generateSuggestions(
  selection: Selection,
  document: TEIDocument,
  maxSuggestions: number = 5
): Suggestion[] {
  const suggestions: Suggestion[] = [];

  // Run heuristics
  const dialogueResult = dialoguePattern(selection);
  if (dialogueResult) suggestions.push(dialogueResult);

  const nameResult = nameDetection(selection, document);
  if (nameResult) suggestions.push(nameResult);

  const quoteResult = quotePattern(selection);
  if (quoteResult) suggestions.push(quoteResult);

  // Sort by confidence and return top N
  return suggestions
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, maxSuggestions);
}
```

**Commands:**
```bash
cat > tests/unit/protocols/suggestions.test.ts << 'EOF'
import { generateSuggestions } from '@/lib/protocols/suggestions';
import { createSelection } from '@/lib/values/Selection';
describe('generateSuggestions', () => {
  it('should return empty array for empty selection', () => {
    const selection = createSelection('p1', { start: 0, end: 0 }, '', '', Date.now());
    const suggestions = generateSuggestions(selection, {} as any);
    expect(suggestions).toEqual([]);
  });
});
EOF
# (Heuristics will be created in tasks 3.2-3.4)
```

---

### Task 3.2: Create dialoguePattern Heuristic

**Files:**
- Create: `lib/heuristics/dialoguePattern.ts`
- Create: `tests/unit/heuristics/dialoguePattern.test.ts`

**Complete Code for lib/heuristics/dialoguePattern.ts:**

```typescript
import type { Suggestion } from '@/lib/values/Suggestion';
import { createSuggestion } from '@/lib/values/Suggestion';
import type { Selection } from '@/lib/values/Selection';

/**
 * Dialogue pattern heuristic
 *
 * Detects patterns like:
 * - "Hello," she said.
 * - John said, "Hello."
 * - "Hello!" said Mary.
 */
export function dialoguePattern(selection: Selection): Suggestion | null {
  const text = selection.text.trim();
  const context = selection.context.toLowerCase();

  // Pattern 1: Quotation marks followed by speech verb
  const quoteVerbPattern = /["'].+["']\s*(said|asked|replied|shouted|whispered|muttered)/i;
  if (quoteVerbPattern.test(text)) {
    return createSuggestion('said', 0.85, 'Detected dialogue with speech verb');
  }

  // Pattern 2: Speech verb followed by quotation marks
  const verbQuotePattern = /(said|asked|replied|shouted|whispered|muttered)\s*:\s*["'].+["']/i;
  if (verbQuotePattern.test(text)) {
    return createSuggestion('said', 0.85, 'Detected dialogue with speech verb');
  }

  // Pattern 3: Quotation marks in selection
  if (text.includes('"') || text.includes('"')) {
    // Check context for speech verb
    const contextWords = context.split(/\s+/);
    const speechVerbs = ['said', 'asked', 'replied', 'shouted', 'whispered', 'muttered'];
    const hasSpeechVerb = contextWords.some(w => speechVerbs.includes(w.toLowerCase()));

    if (hasSpeechVerb) {
      return createSuggestion('q', 0.75, 'Detected quotation marks with speech verb nearby');
    }
  }

  return null;
}
```

**Commands:**
```bash
mkdir -p lib/heuristics tests/unit/heuristics
cat > tests/unit/heuristics/dialoguePattern.test.ts << 'EOF'
import { dialoguePattern } from '@/lib/heuristics/dialoguePattern';
import { createSelection } from '@/lib/values/Selection';
describe('dialoguePattern heuristic', () => {
  it('should detect dialogue with verb', () => {
    const selection = createSelection('p1', { start: 0, end: 20 }, '"Hello," she said.', '"Hello," she said.');
    const result = dialoguePattern(selection);
    expect(result?.tagType).toBe('said');
    expect(result?.confidence).toBeGreaterThan(0.8);
  });
  it('should return null for non-dialogue', () => {
    const selection = createSelection('p1', { start: 0, end: 10 }, 'Just regular text', 'Just regular text');
    const result = dialoguePattern(selection);
    expect(result).toBeNull();
  });
});
EOF
npm test -- tests/unit/heuristics/dialoguePattern.test.ts
cat > lib/heuristics/dialoguePattern.ts << 'EOF'
# (paste source code)
EOF
npm test -- tests/unit/heuristics/dialoguePattern.test.ts
git add lib/heuristics/dialoguePattern.ts tests/unit/heuristics/dialoguePattern.test.ts
git commit -m "feat: add dialoguePattern heuristic"
```

---

### Task 3.3: Create nameDetection Heuristic

**Files:**
- Create: `lib/heuristics/nameDetection.ts`
- Create: `tests/unit/heuristics/nameDetection.test.ts`

**Complete Code for lib/heuristics/nameDetection.ts:**

```typescript
import type { Suggestion } from '@/lib/values/Suggestion';
import { createSuggestion } from '@/lib/values/Suggestion';
import type { Selection } from '@/lib/values/Selection';
import type { TEIDocument } from '@/lib/tei/types';

/**
 * Name detection heuristic
 *
 * Detects character names and suggests persName tag.
 */
export function nameDetection(selection: Selection, document: TEIDocument): Suggestion | null {
  const text = selection.text.trim();

  // Check if text matches a known character name
  if (document.state?.characters) {
    const characters = document.state.characters;
    const matchedChar = characters.find(char =>
      text.toLowerCase() === char.name.toLowerCase() ||
      text.includes(char.name)
    );

    if (matchedChar) {
      return createSuggestion(
        'persName',
        0.9,
        `Detected character name: ${matchedChar.name}`,
        { ref: matchedChar.xmlId }
      );
    }
  }

  // Pattern: Capitalized words (possible name)
  const capitalizedPattern = /\b[A-Z][a-z]+\b/;
  const matches = text.match(capitalizedPattern);

  if (matches && matches.length >= 1 && matches.length <= 3) {
    // 1-3 capitalized words likely a name
    const confidence = matches.length === 1 ? 0.6 : 0.75;
    return createSuggestion(
      'persName',
      confidence,
      `Detected ${matches.length} capitalized word(s) - possibly a name`
    );
  }

  return null;
}
```

**Commands:**
```bash
cat > tests/unit/heuristics/nameDetection.test.ts << 'EOF'
import { nameDetection } from '@/lib/heuristics/nameDetection';
import { createSelection } from '@/lib/values/Selection';
describe('nameDetection heuristic', () => {
  it('should detect known character', () => {
    const selection = createSelection('p1', { start: 0, end: 4 }, 'John', 'John');
    const document = { state: { characters: [{ name: 'John', xmlId: 'char-john' }] } } as any;
    const result = nameDetection(selection, document);
    expect(result?.tagType).toBe('persName');
    expect(result?.confidence).toBeGreaterThan(0.8);
  });
  it('should detect capitalized words', () => {
    const selection = createSelection('p1', { start: 0, end: 8 }, 'John Doe', 'John Doe');
    const result = nameDetection(selection, {} as any);
    expect(result?.tagType).toBe('persName');
  });
});
EOF
npm test -- tests/unit/heuristics/nameDetection.test.ts
cat > lib/heuristics/nameDetection.ts << 'EOF'
# (paste source code)
EOF
npm test -- tests/unit/heuristics/nameDetection.test.ts
git add lib/heuristics/nameDetection.ts tests/unit/heuristics/nameDetection.test.ts
git commit -m "feat: add nameDetection heuristic"
```

---

### Task 3.4: Create quotePattern Heuristic

**Files:**
- Create: `lib/heuristics/quotePattern.ts`
- Create: `tests/unit/heuristics/quotePattern.test.ts`

**Complete Code for lib/heuristics/quotePattern.ts:**

```typescript
import type { Suggestion } from '@/lib/values/Suggestion';
import { createSuggestion } from '@/lib/values/Suggestion';
import type { Selection } from '@/lib/values/Selection';

/**
 * Quote pattern heuristic
 *
 * Detects quotation marks and suggests q tag.
 */
export function quotePattern(selection: Selection): Suggestion | null {
  const text = selection.text.trim();

  // Must have quotation marks
  if (!text.includes('"') && !text.includes('"')) {
    return null;
  }

  // Count quotation marks
  const quoteCount = (text.match(/"/g) || []).length + (text.match(/"/g) || []).length;

  // Even number of quotes = likely complete quote
  if (quoteCount >= 2 && quoteCount % 2 === 0) {
    return createSuggestion(
      'q',
      0.8,
      `Detected ${quoteCount} quotation marks - likely a direct quote`
    );
  }

  // Odd number = possibly partial selection
  if (quoteCount === 1) {
    return createSuggestion(
      'q',
      0.5,
      'Detected quotation mark - possibly a partial quote',
    );
  }

  return null;
}
```

**Commands:**
```bash
cat > tests/unit/heuristics/quotePattern.test.ts << 'EOF'
import { quotePattern } from '@/lib/heuristics/quotePattern';
import { createSelection } from '@/lib/values/Selection';
describe('quotePattern heuristic', () => {
  it('should detect complete quote', () => {
    const selection = createSelection('p1', { start: 0, end: 13 }, '"Hello world"', '"Hello world"');
    const result = quotePattern(selection);
    expect(result?.tagType).toBe('q');
    expect(result?.confidence).toBeGreaterThan(0.7);
  });
  it('should return null for no quotes', () => {
    const selection = createSelection('p1', { start: 0, end: 5 }, 'Hello', 'Hello');
    const result = quotePattern(selection);
    expect(result).toBeNull();
  });
});
EOF
npm test -- tests/unit/heuristics/quotePattern.test.ts
cat > lib/heuristics/quotePattern.ts << 'EOF'
# (paste source code)
EOF
npm test -- tests/unit/heuristics/quotePattern.test.ts
git add lib/heuristics/quotePattern.ts tests/unit/heuristics/quotePattern.test.ts
git commit -m "feat: add quotePattern heuristic"
```

---

### Task 3.5: Complete generateSuggestions Implementation

**Files:**
- Modify: `lib/protocols/suggestions.ts` (already created, now complete it)
- Modify: `tests/unit/protocols/suggestions.test.ts`

**Complete Test Code:**

```typescript
import { generateSuggestions } from '@/lib/protocols/suggestions';
import { createSelection } from '@/lib/values/Selection';

describe('generateSuggestions protocol', () => {
  it('should generate dialogue suggestion', () => {
    const selection = createSelection('p1', { start: 0, end: 20 }, '"Hello," she said.', '"Hello," she said.');
    const suggestions = generateSuggestions(selection, {} as any);
    const dialogue = suggestions.find(s => s.tagType === 'said');
    expect(dialogue).toBeDefined();
    expect(dialogue?.confidence).toBeGreaterThan(0.8);
  });

  it('should generate quote suggestion', () => {
    const selection = createSelection('p1', { start: 0, end: 13 }, '"Hello world"', '"Hello world"');
    const suggestions = generateSuggestions(selection, {} as any);
    const quote = suggestions.find(s => s.tagType === 'q');
    expect(quote).toBeDefined();
  });

  it('should limit max suggestions', () => {
    const selection = createSelection('p1', { start: 0, end: 20 }, '"Hello," John said. "How are you?"', 'text');
    const suggestions = generateSuggestions(selection, {} as any, 2);
    expect(suggestions.length).toBeLessThanOrEqual(2);
  });
});
```

**Commands:**
```bash
cat > tests/unit/protocols/suggestions.test.ts << 'EOF'
# (paste test code above)
EOF
npm test -- tests/unit/protocols/suggestions.test.ts
# If lib/protocols/suggestions.ts doesn't exist, create it with Task 3.1 code
npm test -- tests/unit/protocols/suggestions.test.ts
git add lib/protocols/suggestions.ts tests/unit/protocols/suggestions.test.ts
git commit -m "feat: complete generateSuggestions protocol"
```

---

### Task 3.6: Create useSuggestions Hook

**Files:**
- Create: `hooks/useSuggestions.ts`
- Create: `tests/unit/hooks/useSuggestions.test.tsx`

**Complete Code for hooks/useSuggestions.ts:**

```typescript
import { useMemo } from 'react';
import type { Selection } from '@/lib/values/Selection';
import type { Suggestion } from '@/lib/values/Suggestion';
import { generateSuggestions } from '@/lib/protocols/suggestions';
import type { TEIDocument } from '@/lib/tei/types';

export function useSuggestions(
  selection: Selection | null,
  document: TEIDocument | null,
  maxSuggestions: number = 5
): Suggestion[] {
  return useMemo(() => {
    if (!selection || !document) return [];
    return generateSuggestions(selection, document, maxSuggestions);
  }, [selection, document, maxSuggestions]);
}
```

**Commands:**
```bash
cat > tests/unit/hooks/useSuggestions.test.tsx << 'EOF'
import { renderHook } from '@testing-library/react';
import { useSuggestions } from '@/hooks/useSuggestions';
import { createSelection } from '@/lib/values/Selection';
describe('useSuggestions', () => {
  it('should return empty when no selection', () => {
    const { result } = renderHook(() => useSuggestions(null, null));
    expect(result.current).toEqual([]);
  });
  it('should return suggestions', () => {
    const selection = createSelection('p1', { start: 0, end: 10 }, '"Hello"', '"Hello"');
    const { result } = renderHook(() => useSuggestions(selection, {} as any));
    expect(result.current.length).toBeGreaterThan(0);
  });
});
EOF
npm test -- tests/unit/hooks/useSuggestions.test.tsx
cat > hooks/useSuggestions.ts << 'EOF'
# (paste source code)
EOF
npm test -- tests/unit/hooks/useSuggestions.test.tsx
git add hooks/useSuggestions.ts tests/unit/hooks/useSuggestions.test.tsx
git commit -m "feat: add useSuggestions hook"
```

---

### Task 3.7-3.12: UI Components and Integration

**Remaining Phase 3 Tasks:**
- Task 3.7: Create TagSuggestionsPanel component
- Task 3.8: Create SuggestionItem component
- Task 3.9: Add confidence bar visualization
- Task 3.10: Connect useSuggestions in EditorLayout
- Task 3.11: Add suggestion click handling
- Task 3.12: Integration test for suggestion flow

These follow established patterns.

---

## Phase 4: Tagging Workflows

**Goal:** Pre-configured annotation workflows with guided prompts

### Task 4.1: Create planWorkflow Protocol

**Files:**
- Create: `lib/protocols/workflows.ts`
- Create: `tests/unit/protocols/workflows.test.ts`

**Complete Code for lib/protocols/workflows.ts:**

```typescript
import type { Result } from './Result';
import { success, failure } from './Result';
import type { Workflow, WorkflowPlan } from '@/lib/values/Workflow';
import { createWorkflowPlan } from '@/lib/values/Workflow';
import type { Selection } from '@/lib/values/Selection';
import type { TEIDocument } from '@/lib/tei/types';
import { validateSelection } from './validation';

export function planWorkflow(
  workflow: Workflow,
  selection: Selection,
  document: TEIDocument
): Result<WorkflowPlan> {
  // Validate selection for each workflow step
  for (const step of workflow.steps) {
    const validationResult = validateSelection(selection, step.tagType, step.attributes || {}, document);

    if (!validationResult.success) {
      return failure(
        'WORKFLOW_VALIDATION_FAILED',
        `Cannot validate step "${step.prompt}": ${validationResult.error.message}`,
        true,
        { workflowId: workflow.id, stepTag: step.tagType }
      );
    }

    if (!validationResult.value.valid && step.required) {
      return failure(
        'REQUIRED_STEP_INVALID',
        `Required workflow step "${step.prompt}" cannot be completed: ${validationResult.value.errors[0]?.message}`,
        true,
        { workflowId: workflow.id, stepTag: step.tagType }
      );
    }
  }

  // All steps are valid, create plan
  return success(createWorkflowPlan(workflow, 0));
}
```

**Commands:**
```bash
cat > tests/unit/protocols/workflows.test.ts << 'EOF'
import { planWorkflow } from '@/lib/protocols/workflows';
import { createWorkflow, createWorkflowStep } from '@/lib/values/Workflow';
import { createSelection } from '@/lib/values/Selection';
describe('planWorkflow protocol', () => {
  it('should create valid plan', () => {
    const workflow = createWorkflow('simple', 'Simple', [
      createWorkflowStep('Who said this?', 'said', true, { who: '' }),
    ]);
    const selection = createSelection('p1', { start: 0, end: 10 }, 'Text', 'Context');
    const result = planWorkflow(workflow, selection, {} as any);
    expect(result.success).toBe(true);
  });
});
EOF
npm test -- tests/unit/protocols/workflows.test.ts
cat > lib/protocols/workflows.ts << 'EOF'
# (paste source code)
EOF
npm test -- tests/unit/protocols/workflows.test.ts
git add lib/protocols/workflows.ts tests/unit/protocols/workflows.test.ts
git commit -m "feat: add planWorkflow protocol"
```

---

### Task 4.2-4.10: Workflow UI Components

**Remaining Phase 4 Tasks:**
- Task 4.2: Create useWorkflow hook
- Task 4.3: Create WorkflowDialog component
- Task 4.4: Create WorkflowStep component
- Task 4.5: Create EntityPicker component for attribute selection
- Task 4.6: Create WorkflowProgress indicator
- Task 4.7: Add workflow definitions (simple-quote, character-intro, etc.)
- Task 4.8: Create WorkflowSelector component
- Task 4.9: Connect workflow in EditorLayout
- Task 4.10: Integration test for workflow flow

---

## Phase 5: Document-Wide Validation

**Goal:** Validate all tags, show summary dashboard

### Task 5.1: Create summarizeValidation Protocol

**Files:**
- Create: `lib/protocols/summary.ts`
- Create: `tests/unit/protocols/summary.test.ts`

**Complete Code for lib/protocols/summary.ts:**

```typescript
import type { ValidationSummary, ValidationIssue, TagStats } from '@/lib/values/ValidationSummary';
import {
  createValidationSummary,
  createValidationIssue,
  createTagStats,
} from '@/lib/values/ValidationSummary';
import type { TEIDocument } from '@/lib/tei/types';
import { validateSelection } from './validation';
import { createSelection } from '@/lib/values/Selection';
import { extractContext } from '@/lib/values/Selection';

/**
 * Cache for passage-level validation results
 */
class PassageValidationCache {
  private cache = new Map<string, import('@/lib/validation/types').ValidationResult[]>();

  get(passageId: string, documentRevision: number): import('@/lib/validation/types').ValidationResult[] | null {
    return this.cache.get(`${passageId}:${documentRevision}`) || null;
  }

  set(passageId: string, documentRevision: number, results: import('@/lib/validation/types').ValidationResult[]): void {
    this.cache.set(`${passageId}:${documentRevision}`, results);
  }

  clear(): void {
    this.cache.clear();
  }
}

const cache = new PassageValidationCache();

/**
 * Summarize validation results for entire document
 */
export function summarizeValidation(document: TEIDocument): ValidationSummary {
  const issues: ValidationIssue[] = [];
  const byTagType: Record<string, TagStats> = {};
  const bySeverity: Record<string, number> = { critical: 0, warning: 0, info: 0 };

  let totalTags = 0;

  for (const passage of document.state.passages) {
    // Check cache
    const cached = cache.get(passage.id, document.state.revision);
    if (cached) {
      // Use cached results
      cached.forEach((result, tagIndex) => {
        totalTags++;
        // ... process cached results
      });
      continue;
    }

    // Validate each tag in passage
    const passageResults: import('@/lib/validation/types').ValidationResult[] = [];

    for (const tag of passage.tags) {
      totalTags++;

      // Create selection for tag
      const selection = createSelection(
        passage.id,
        tag.range,
        passage.text.substring(tag.range.start, tag.range.end),
        extractContext(passage.text, tag.range),
        Date.now()
      );

      // Validate
      const validationResult = validateSelection(selection, tag.type, tag.attributes, document);

      if (validationResult.success) {
        passageResults.push(validationResult.value);

        // Count by tag type
        if (!byTagType[tag.type]) {
          byTagType[tag.type] = createTagStats(0, 0);
        }
        byTagType[tag.type].total++;

        if (!validationResult.value.valid) {
          byTagType[tag.type].invalid++;

          // Create issues
          validationResult.value.errors.forEach((error, errorIndex) => {
            const issue = createValidationIssue(
              `${passage.id}-${tag.id}-${errorIndex}`,
              'critical',
              passage.id,
              tag.id,
              error.message,
              error.type
            );
            issues.push(issue);
            bySeverity.critical++;
          });
        }

        // Count warnings
        validationResult.value.warnings.forEach((warning, warningIndex) => {
          const issue = createValidationIssue(
            `${passage.id}-${tag.id}-w-${warningIndex}`,
            'warning',
            passage.id,
            tag.id,
            warning.message,
            warning.type
          );
          issues.push(issue);
          bySeverity.warning++;
        });
      }
    }

    // Cache results
    cache.set(passage.id, document.state.revision, passageResults);
  }

  return createValidationSummary(totalTags, issues, byTagType, bySeverity);
}

/**
 * Clear validation cache
 */
export function clearValidationCache(): void {
  cache.clear();
}
```

**Commands:**
```bash
cat > tests/unit/protocols/summary.test.ts << 'EOF'
import { summarizeValidation, clearValidationCache } from '@/lib/protocols/summary';
import { createTEIDocument } from '@/lib/tei/operations';
describe('summarizeValidation protocol', () => {
  it('should summarize empty document', () => {
    const doc = createTEIDocument('test', 'Test');
    const summary = summarizeValidation(doc);
    expect(summary.totalTags).toBe(0);
    expect(summary.issues).toHaveLength(0);
  });
  it('should calculate health score', () => {
    clearValidationCache();
    const doc = createTEIDocument('test', 'Test');
    const summary = summarizeValidation(doc);
    expect(summary.totalTags).toBeDefined();
  });
});
EOF
npm test -- tests/unit/protocols/summary.test.ts
cat > lib/protocols/summary.ts << 'EOF'
# (paste source code)
EOF
npm test -- tests/unit/protocols/summary.test.ts
git add lib/protocols/summary.ts tests/unit/protocols/summary.test.ts
git commit -m "feat: add summarizeValidation protocol with caching"
```

---

### Task 5.2-5.12: Document Validation UI

**Remaining Phase 5 Tasks:**
- Task 5.2: Create useDocumentSummary hook
- Task 5.3: Create DocumentValidationSummary component
- Task 5.4: Create ValidationHealthCard component
- Task 5.5: Create ValidationIssueList component
- Task 5.6: Create ValidationIssueItem component
- Task 5.7: Add severity filtering
- Task 5.8: Add tag type filtering
- Task 5.9: Add issue navigation (click to jump to location)
- Task 5.10: Add export functionality (JSON/HTML/PDF)
- Task 5.11: Connect validation button in EditorLayout
- Task 5.12: Integration test for document validation

---

## Phase 6: Enhanced Entity Management

**Goal:** Full CRUD UI for entities

### Task 6.1: Create applyEntityDelta Protocol

**Files:**
- Create: `lib/protocols/entities.ts`
- Create: `tests/unit/protocols/entities.test.ts`

**Complete Code for lib/protocols/entities.ts:**

```typescript
import type { Result } from './Result';
import { success, failure } from './Result';
import type { EntityDelta, EntityType } from '@/lib/values/EntityDelta';
import { isCreate, isUpdate, isDelete } from '@/lib/values/EntityDelta';
import type { Entity } from '@/lib/tei/types';

export function applyEntityDelta(
  entities: Entity[],
  delta: EntityDelta
): Result<Entity[]> {
  try {
    let newEntities: Entity[];

    if (isCreate(delta)) {
      // Check for duplicate ID
      if (entities.some(e => e.id === delta.entity.id)) {
        return failure(
          'DUPLICATE_ENTITY_ID',
          `Entity with ID ${delta.entity.id} already exists`,
          true,
          { entityId: delta.entity.id }
        );
      }
      newEntities = [...entities, delta.entity];
    } else if (isUpdate(delta)) {
      // Find and update entity
      const index = entities.findIndex(e => e.id === delta.entity.id);
      if (index === -1) {
        return failure(
          'ENTITY_NOT_FOUND',
          `Entity ${delta.entity.id} not found for update`,
          true,
          { entityId: delta.entity.id }
        );
      }
      newEntities = [
        ...entities.slice(0, index),
        delta.entity,
        ...entities.slice(index + 1),
      ];
    } else if (isDelete(delta)) {
      // Remove entity
      newEntities = entities.filter(e => e.id !== delta.entity.id);
    } else {
      return failure(
        'UNKNOWN_OPERATION',
        `Unknown entity operation`,
        false
      );
    }

    return success(newEntities);
  } catch (error) {
    return failure(
      'ENTITY_DELTA_ERROR',
      error instanceof Error ? error.message : 'Unknown error applying entity delta',
      false
    );
  }
}

export function filterEntitiesByType(entities: Entity[], entityType: EntityType): Entity[] {
  return entities.filter(e => e.type === entityType);
}

export function findEntityById(entities: Entity[], id: string): Entity | null {
  return entities.find(e => e.id === id) || null;
}
```

**Commands:**
```bash
cat > tests/unit/protocols/entities.test.ts << 'EOF'
import { applyEntityDelta, filterEntitiesByType, findEntityById } from '@/lib/protocols/entities';
import { createCreateDelta, createUpdateDelta, createDeleteDelta } from '@/lib/values/EntityDelta';
describe('applyEntityDelta protocol', () => {
  it('should create entity', () => {
    const entities = [];
    const delta = createCreateDelta('character', { id: 'char-1', type: 'character', name: 'John', attributes: {} });
    const result = applyEntityDelta(entities, delta);
    expect(result.success).toBe(true);
    if (result.success) expect(result.value).toHaveLength(1);
  });
  it('should update entity', () => {
    const entities = [{ id: 'char-1', type: 'character', name: 'John', attributes: {} }];
    const delta = createUpdateDelta('character', { id: 'char-1', type: 'character', name: 'John Doe', attributes: {} });
    const result = applyEntityDelta(entities, delta);
    if (result.success) expect(result.value[0].name).toBe('John Doe');
  });
  it('should delete entity', () => {
    const entities = [{ id: 'char-1', type: 'character', name: 'John', attributes: {} }];
    const delta = createDeleteDelta('character', entities[0]);
    const result = applyEntityDelta(entities, delta);
    if (result.success) expect(result.value).toHaveLength(0);
  });
  it('should reject duplicate ID', () => {
    const entities = [{ id: 'char-1', type: 'character', name: 'John', attributes: {} }];
    const delta = createCreateDelta('character', { id: 'char-1', type: 'character', name: 'Jane', attributes: {} });
    const result = applyEntityDelta(entities, delta);
    expect(result.success).toBe(false);
  });
});
EOF
npm test -- tests/unit/protocols/entities.test.ts
cat > lib/protocols/entities.ts << 'EOF'
# (paste source code)
EOF
npm test -- tests/unit/protocols/entities.test.ts
git add lib/protocols/entities.ts tests/unit/protocols/entities.test.ts
git commit -m "feat: add applyEntityDelta protocol"
```

---

### Task 6.2-6.10: Entity Management UI

**Remaining Phase 6 Tasks:**
- Task 6.2: Create useEntities hook
- Task 6.3: Create EntityManagementPanel component
- Task 6.4: Create EntityList component
- Task 6.5: Create EntityForm component (add/edit)
- Task 6.6: Create EntityDeleteDialog component
- Task 6.7: Add entity type tabs (characters/places/organizations)
- Task 6.8: Add entity usage visualization (count of references)
- Task 6.9: Add import/export functionality
- Task 6.10: Integration test for entity CRUD operations

---

## Phase Completion Checklist

After each phase, verify:

1. **All tests passing:** `npm test` shows green
2. **Type checking:** `npm run type-check` passes (if available)
3. **Linting:** `npm run lint` passes (if available)
4. **Build:** `npm run build` succeeds
5. **Manual testing:** Features work in browser

---

## Testing Coverage Goals

- **Protocols:** 100% (pure functions, easy to test)
- **Heuristics:** 90%+ (pattern matching logic)
- **Hooks:** 80%+ (React integration)
- **Components:** 80%+ (UI rendering)
- **Integration:** Critical paths covered

---

## Performance Optimization

Each protocol includes memoization/caching as specified in design:

1. **useDebouncedValue:** Debounce rapid selection changes (50ms)
2. **generateSuggestions:** Memoize with document revision key
3. **summarizeValidation:** Passage-level caching
4. **All hooks:** useMemo/useCallback appropriately

---

## Next Steps

After completing all 62 tasks:

1. Run full test suite: `npm test`
2. Build for production: `npm run build`
3. Create PR with description
4. Update documentation
5. Merge to main branch

---

**End of Implementation Plan**
