# Validation Features Design - Protocol-Based Architecture

**Date:** 2025-02-05
**Status:** Design Approved
**Architecture:** Protocol-Based, Value-Oriented, Decomplected

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Principles](#architecture-principles)
3. [Core Values](#core-values)
4. [Protocol Functions](#protocol-functions)
5. [UI Components](#ui-components)
6. [State Management](#state-management)
7. [Error Handling](#error-handling)
8. [File Organization](#file-organization)
9. [Data Flow](#data-flow)
10. [Testing Strategy](#testing-strategy)
11. [Migration Path](#migration-path)
12. [Performance Considerations](#performance-considerations)
13. [Features Summary](#features-summary)

---

## Overview

This document describes the architecture for five new validation features built on a **protocol-based, value-oriented design** following Rich Hickey's principles of simplicity, composability, and explicit time modeling.

### Features to Implement

1. **Real-Time Validation Hints** - Visual feedback while selecting text (green/yellow/red outlines)
2. **Smart Tag Suggestions** - Suggest appropriate tags based on text patterns
3. **Tagging Workflows** - Pre-configured annotation workflows with guided prompts
4. **Document-Wide Validation** - Validate all tags, show summary dashboard
5. **Enhanced Entity Management** - Full CRUD UI for entities

### Architecture Philosophy

Instead of organizing by "features" or "layers," we organize around **protocols** (pure transformations) and **values** (immutable data).

```
Values → Protocols → Values → Protocols → Values
```

Each feature is just:
- A value type (e.g., `Hint`, `Suggestion`, `Workflow`)
- A protocol function (e.g., `generateHint`, `generateSuggestions`)
- A UI component (renders value, emits action)

No "feature modules," no "workflow managers," just protocols and values.

---

## Architecture Principles

### 1. Simplicity (Unentangled)

Each protocol has one responsibility. No braiding between concerns.

```typescript
// GOOD: Single responsibility
function generateHint(validation: ValidationResult, tagType: string): Hint

// BAD: Braided concerns
function validateAndHintAndSuggest(selection: Selection): ComplexResult
```

### 2. Values Over Places

All state is immutable values. No mutation.

```typescript
// GOOD: Return new value
function applyEntityDelta(entities: Entity[], delta: EntityDelta): Entity[]

// BAD: Mutate in place
function applyEntityDelta(entities: Entity[], delta: EntityDelta): void
```

### 3. Design for Composition

Protocols compose naturally.

```typescript
// Compose protocols in new ways
const hint = generateHint(
  validateSelection(selection, 'said', {}, document),
  'said'
)

const suggestions = generateSuggestions(selection, document)
const plan = planWorkflow(workflow, selection, document)
```

### 4. Explicit Time Modeling

State succession is visible through value transformations.

```
Selection →[validate]→ ValidationResult →[hint]→ Hint →[user action]→ NewState
```

### 5. Protocols First-Class

Protocol interfaces are explicit type signatures.

```typescript
type ValidateProtocol = (
  selection: Selection,
  tagType: string,
  attrs: Record<string, string>,
  document: TEIDocument
) => ValidationResult
```

---

## Core Values

### Selection Value

```typescript
type Selection = {
  passageId: string
  range: TextRange
  text: string
  context: string           // Surrounding text for context
  timestamp: number         // For cache invalidation
}
```

### ValidationResult Value (Exists)

```typescript
type ValidationResult = {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  fixes: Fix[]
}
```

### Hint Value (New)

```typescript
type Hint = {
  severity: 'valid' | 'warning' | 'invalid'
  message: string
  code: string              // e.g., 'MISSING_ATTRIBUTE', 'SPLITS_TAG'
  suggestedAction?: Action  // Quick fix
}

type Action = {
  type: 'apply-tag' | 'add-attribute' | 'expand-selection'
  tagType?: string
  attributes?: Record<string, string>
  label: string
}
```

### Suggestion Value (New)

```typescript
type Suggestion = {
  tagType: string           // e.g., 'said', 'persName'
  confidence: number        // 0-1
  reason: string            // e.g., 'Detected dialogue pattern'
  requiredAttrs?: Record<string, string>  // Pre-filled attributes
}
```

### Workflow Value (New)

```typescript
type Workflow = {
  id: string
  name: string              // e.g., 'Simple Quote', 'Character Introduction'
  steps: WorkflowStep[]
}

type WorkflowStep = {
  prompt: string            // e.g., 'Who said this?'
  tagType: string
  attributes?: Record<string, string>
  required: boolean
}
```

### ValidationSummary Value (New)

```typescript
type ValidationSummary = {
  totalTags: number
  issues: ValidationIssue[]
  byTagType: Record<string, { total: number, invalid: number }>
  bySeverity: Record<string, number>
}

type ValidationIssue = {
  id: string
  severity: 'critical' | 'warning' | 'info'
  passageId: string
  tagId: string
  message: string
  code: string
}
```

### EntityDelta Value (New)

```typescript
type EntityDelta = {
  operation: 'create' | 'update' | 'delete'
  entityType: 'character' | 'place' | 'organization'
  entity: Entity
  timestamp: number
}
```

---

## Protocol Functions

### Protocol 1: Selection Validation

```typescript
function validateSelection(
  selection: Selection,
  tagType: string,
  providedAttrs: Record<string, string>,
  document: TEIDocument
): Result<ValidationResult>
```

Validates a selection for a given tag type. Returns validation result with fixes.

### Protocol 2: Hint Generation

```typescript
function generateHint(
  validation: ValidationResult,
  tagType: string
): Hint
```

Converts validation result into user-friendly hint with severity and quick actions.

### Protocol 3: Suggestion Generation

```typescript
function generateSuggestions(
  selection: Selection,
  document: TEIDocument,
  maxSuggestions: number = 5
): Suggestion[]
```

Analyzes selection to suggest appropriate tags using heuristics.

### Protocol 4: Workflow Planning

```typescript
function planWorkflow(
  workflow: Workflow,
  selection: Selection,
  document: TEIDocument
): Result<WorkflowPlan>
```

Creates action plan from workflow + selection. Resolves attributes, validates steps.

### Protocol 5: Document Validation Summary

```typescript
function summarizeValidation(
  document: TEIDocument
): ValidationSummary
```

Aggregates validation results across entire document. Caches passage-level results.

### Protocol 6: Entity Delta Application

```typescript
function applyEntityDelta(
  entities: Entity[],
  delta: EntityDelta
): Result<Entity[]>
```

Applies entity change (create/update/delete) to entity collection.

---

## UI Components

### RealTimeHints Component

```typescript
interface RealTimeHintsProps {
  selection: Selection | null
  activeTagType: string | null
  onHintAccepted?: (action: Action) => void
}
```

- Observes selection changes
- Renders colored outline (green/yellow/red)
- Shows tooltip with hint message
- Emits onHintAccepted if user clicks quick fix

### TagSuggestionsPanel Component

```typescript
interface TagSuggestionsPanelProps {
  selection: Selection | null
  suggestions: Suggestion[]
  onSuggestionClick: (suggestion: Suggestion) => void
}
```

- Displays list of suggested tags
- Shows confidence score (progress bar)
- Shows reason for suggestion
- Click to apply tag immediately or start workflow

### WorkflowDialog Component

```typescript
interface WorkflowDialogProps {
  workflow: Workflow
  plan: WorkflowPlan
  currentStep: number
  onStepComplete: (stepData: StepData) => void
  onCancel: () => void
}
```

- Multi-step dialog
- Shows current step prompt
- Renders entity picker for attributes
- Progress indicator
- Back/Next navigation

### DocumentValidationSummary Component

```typescript
interface DocumentValidationSummaryProps {
  summary: ValidationSummary
  onIssueClick: (issue: ValidationIssue) => void
  onExport: (format: 'json' | 'html' | 'pdf') => void
}
```

- Dashboard showing validation health
- Issue breakdown by severity/type
- Filterable issue list
- Navigation to issue location
- Export button

### EntityManagementPanel Component

```typescript
interface EntityManagementPanelProps {
  entities: Entity[]
  deltas: EntityDelta[]
  onDelta: (delta: EntityDelta) => void
}
```

- Entity list/table view
- Create/Edit/Delete forms
- Entity usage visualization
- Import/Export buttons

---

## State Management

### Global State Schema

```typescript
type EditorState = {
  // Current values (ephemeral)
  selection: Selection | null
  activeTagType: string | null
  activeWorkflow: Workflow | null
  workflowStep: number

  // Derived values (computed via protocols)
  currentHint: Hint | null
  currentSuggestions: Suggestion[]
  documentSummary: ValidationSummary | null

  // Collections (persistent)
  entities: {
    characters: Entity[]
    places: Entity[]
    organizations: Entity[]
  }

  // Configuration
  workflows: Workflow[]
  entityHistory: EntityDelta[]
}
```

### State Management Hook

```typescript
function useEditorState(): EditorState & {
  setSelection: (selection: Selection | null) => void
  setActiveTagType: (tagType: string | null) => void
  applyTag: (tagType: string, attrs: Record<string, string>) => Promise<void>
  executeWorkflow: (workflow: Workflow) => Promise<void>
  applyEntityDelta: (delta: EntityDelta) => void
}
```

- Derives values when dependencies change (useEffect)
- Pure state updates (setState creates new state)
- No business logic in hook (all in protocols)

---

## Error Handling

### Error Values

```typescript
type Result<T> =
  | { success: true; value: T }
  | { success: false; error: ProtocolError }

type ProtocolError = {
  code: string
  message: string
  context?: Record<string, unknown>
  recoverable: boolean
}
```

### Error Handling Principles

1. **Errors are values** - Part of Result type, not exceptions
2. **Local only** - Console logging + localStorage (max 100 entries)
3. **Recoverable vs unrecoverable** - Distinguished in error type
4. **User-friendly messages** - Explain what went wrong and how to fix

---

## File Organization

```
lib/
├── protocols/                   # Protocol functions (pure)
│   ├── validation.ts
│   ├── hints.ts
│   ├── suggestions.ts
│   ├── workflows.ts
│   ├── summary.ts
│   └── entities.ts
│
├── values/                      # Value types
│   ├── Selection.ts
│   ├── Hint.ts
│   ├── Suggestion.ts
│   ├── Workflow.ts
│   └── ValidationSummary.ts
│
├── heuristics/                  # Suggestion logic
│   ├── dialoguePattern.ts
│   ├── nameDetection.ts
│   └── quotePattern.ts
│
└── validation/                  # Existing (keep as-is)
    └── ...

components/
├── hints/                       # Real-time hints UI
├── suggestions/                 # Tag suggestions UI
├── workflows/                   # Workflow execution UI
├── doc-validation/              # Document validation UI
├── entities/                    # Entity management UI
└── editor/                      # Existing (keep as-is)

hooks/
├── useEditorState.ts            # Enhanced with protocols
├── useSelection.ts
├── useHints.ts
├── useSuggestions.ts
└── useWorkflow.ts
```

---

## Data Flow

### Real-Time Hint Flow

```
User selects text
    ↓
[RenderedView] captures selection → Selection value
    ↓
[useEditorState] updates state.selection
    ↓
[useHints] hook detects change
    ↓
Calls: validateSelection(selection, activeTagType, {}, document)
    ↓
Calls: generateHint(validationResult, activeTagType)
    ↓
[RealTimeHints] receives hint prop
    ↓
Renders: Colored outline + Tooltip
    ↓
User clicks button → Action emitted → State updates
```

### Suggestion Flow

```
User selects text
    ↓
[useSuggestions] hook detects change
    ↓
Calls: generateSuggestions(selection, document)
    ↓
Internal: dialoguePattern.heuristic(selection)
    ↓
[TagSuggestionsPanel] receives suggestions prop
    ↓
Renders: List of suggestions with confidence
    ↓
User clicks suggestion → setActiveTagType() → Triggers hint flow
```

### Workflow Flow

```
User selects text + clicks workflow
    ↓
[useEditorState] calls: planWorkflow(workflow, selection, document)
    ↓
[WorkflowDialog] receives plan prop
    ↓
Renders: Step 1 prompt + Entity picker
    ↓
User selects entity + clicks Next
    ↓
applyTag() called → Document updated
    ↓
Dialog advances to Step 2
    ↓
All steps complete → Dialog closes
```

### Document Validation Flow

```
User clicks "Validate Document"
    ↓
[useEditorState] calls: summarizeValidation(document)
    ↓
Internal: Iterate passages → validate each tag → aggregate
    ↓
[DocumentValidationSummary] receives summary prop
    ↓
Renders: Dashboard with issue counts, filterable list
    ↓
User clicks issue → Navigate to location
```

---

## Testing Strategy

### Protocol Unit Tests

Each protocol tested in isolation with input/output assertions.

```typescript
describe('generateHint protocol', () => {
  it('should generate valid hint for successful validation', () => {
    const validation: ValidationResult = { valid: true, ... }
    const hint = generateHint(validation, 'said')
    expect(hint.severity).toBe('valid')
  })
})
```

### Heuristic Tests

Suggestion heuristics tested with sample inputs.

```typescript
describe('dialoguePattern heuristic', () => {
  it('should detect dialogue with attribution', () => {
    const selection = { text: 'John said hello', ... }
    const suggestion = dialoguePattern(selection)
    expect(suggestion.tagType).toBe('said')
    expect(suggestion.confidence).toBeGreaterThan(0.7)
  })
})
```

### Component Tests

Components tested with protocol mocks.

```typescript
describe('RealTimeHints component', () => {
  it('should render valid hint with green outline', () => {
    const hint: Hint = { severity: 'valid', ... }
    const { getByTestId } = render(<RealTimeHints hint={hint} />)
    expect(getByTestId('hint-outline')).toHaveClass('outline-green')
  })
})
```

### Test Coverage Goals

- Protocols: 100% (pure functions)
- Heuristics: 90%+
- Components: 80%+
- Integration: Critical paths only

---

## Migration Path

### Phase 1: Extract Protocols (No user-facing changes)

- Extract `validateSelection` as pure function from `Validator.validate()`
- Keep `Validator` class as wrapper for backward compatibility
- All existing tests still pass

### Phase 2: Add Protocol-Based Features (New features only)

- Implement Features 1-5 using protocols
- These are NEW features, don't break existing code
- Enable via feature flags

### Phase 3: Migrate Existing Features (Gradual)

- Migrate entity management to use protocols
- Add feature flags to toggle old/new
- Test thoroughly before enabling

### Phase 4: Remove Legacy Code

- Remove `Validator` class wrapper
- Remove legacy validation code
- Update all imports

### Backward Compatibility

- All existing tests pass during migration
- All existing UI works
- New features opt-in via feature flags
- Easy rollback (disable flag)

---

## Performance Considerations

### Optimization 1: Protocol Memoization

Expensive protocols wrapped with memoization.

```typescript
export const generateSuggestions = memoize(
  (selection: Selection, document: TEIDocument): Suggestion[] => {
    // ... heuristic computations
  },
  {
    key: (selection, document) => `${selection.text}:${document.state.revision}`,
    maxSize: 100,
    ttl: 5000
  }
)
```

**Result:** 10-100x speedup for repeated selections.

### Optimization 2: Incremental Validation

Document validation caches passage-level results.

```typescript
class PassageValidationCache {
  private cache = new Map<string, ValidationResult[]>()

  validatePassage(passageId: string, passage: Passage): ValidationResult[] {
    const key = `${passageId}:${documentRevision}`
    if (this.cache.has(key)) return this.cache.get(key)!

    const results = passage.tags.map(tag => validateSelection(...))
    this.cache.set(key, results)
    return results
  }
}
```

**Result:** O(1) for unchanged passages.

### Optimization 3: Debounced Hint Computation

Real-time hints debounced (50ms delay) to avoid excessive recomputation.

```typescript
export function useHints(selection: Selection | null, activeTagType: string | null) {
  const debouncedSelection = useDebouncedValue(selection, 50)

  const hint = useMemo(() => {
    if (!debouncedSelection || !activeTagType) return null
    return generateHint(validateSelection(debouncedSelection, ...), activeTagType)
  }, [debouncedSelection, activeTagType])

  return hint
}
```

**Result:** User sees hints after brief pause, not on every keystroke.

### Performance Targets

| Operation | Target |
|-----------|--------|
| Real-time hint | < 50ms |
| Tag suggestions | < 100ms |
| Document validation (1000 tags) | < 1s |
| Entity delta | < 10ms |
| Workflow planning | < 50ms |

---

## Features Summary

### Feature 1: Real-Time Validation Hints

**User Value:** Immediate feedback while selecting text

**Implementation:**
- Protocol: `generateHint(validateSelection(...), tagType)`
- Component: `RealTimeHints` (renders colored outline + tooltip)
- Hook: `useHints` (debounced computation)

### Feature 2: Smart Tag Suggestions

**User Value:** Suggested tags based on text patterns

**Implementation:**
- Protocol: `generateSuggestions(selection, document)` using heuristics
- Component: `TagSuggestionsPanel` (list with confidence scores)
- Hook: `useSuggestions` (memoized)

### Feature 3: Tagging Workflows

**User Value:** Pre-configured annotation workflows with guided prompts

**Implementation:**
- Protocol: `planWorkflow(workflow, selection, document)`
- Component: `WorkflowDialog` (multi-step guided interface)
- Hook: `useWorkflow` (orchestrates steps)

### Feature 4: Document-Wide Validation

**User Value:** Validate all tags, see summary dashboard

**Implementation:**
- Protocol: `summarizeValidation(document)` with caching
- Component: `DocumentValidationSummary` (dashboard + issue list)
- Hook: `useDocumentSummary` (computed on document change)

### Feature 5: Enhanced Entity Management

**User Value:** Full CRUD UI for entities

**Implementation:**
- Protocol: `applyEntityDelta(entities, delta)`
- Component: `EntityManagementPanel` (CRUD interface)
- Hook: `useEntities` (manages entity collection)

---

## Conclusion

This architecture delivers five high-value features while maintaining:

- **Simplicity:** Each protocol is pure, one responsibility
- **Composability:** Protocols compose in unanticipated ways
- **Performance:** Memoization, caching, debouncing
- **Testability:** Pure functions test easily
- **Maintainability:** Clear boundaries, no hidden state

All organized around **protocols** and **values** - no "feature modules," no "workflow managers," just clean transformations.

**Ready for implementation.**
