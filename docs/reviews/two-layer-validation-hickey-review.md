# Hickey-Style Review: Two-Layer Validation System

## Review Scope

Reviewing the architecture of the validation system:
- Smart Selection (lib/selection/SmartSelection.ts)
- Schema Validation (lib/effect/react/hooks.ts, lib/effect/protocols/Validation.ts)
- Integration via SelectionManager

---

## Dimension 1: Simplicity vs Ease (Unentangled vs Famamiliar)

### Smart Selection Layer

**What it does:**
```typescript
// Pure functions on immutable data
detectTagBoundaries(passage: Passage): TagBoundary[]
snapToTagBoundaries(passage: Passage, range: TextRange): SelectionAdjustment
```

**Analysis:** ✅ **Simple**

**Why:**
- No mutable state
- Pure functions: input → output (no side effects)
- Single responsibility: structural validation only
- Composable: can use `detectTagBoundaries` independently
- Clear boundary: operates on Passage value, doesn't mutate

**Example:**
```typescript
// ✅ Unentangled: Pure function, returns value
export function snapToTagBoundaries(passage: Passage, range: TextRange): SelectionAdjustment {
  const boundaries = detectTagBoundaries(passage);
  // ... pure computation on immutable data
  return {
    originalRange: range,
    adjustedRange: { start, end },
    reason: string,
  };
}
```

No hidden mutation. No "smart" caching that creates coupling. Just functions on values.

### Schema Validation Layer

**What it does:**
```typescript
// Effect-based validation service
const validateDocument = async (doc: TEIDocument): Promise<void> => {
  const xml = serializeDocument(doc);
  const result = await validationService.validateDocument(xml, schemaPath);
  updateState({ validationResults: result });
}
```

**Analysis:** ✅ **Simple**

**Why:**
- Effect: explicit dependencies, no implicit state
- Pure validation logic in ValidationService
- Clear protocol: validateDocument(xml, schemaPath) → ValidationResult
- No mutation of document during validation
- Separation of concerns: validation separate from state management

**However, there's ONE place where entanglement creeps in:**

```typescript
// ⚠️ Potential issue: Hooks mixing concerns
const useDocumentService = () => {
  const [document, setDocument] = useState<TEIDocument | null>(null);
  const [validationResults, setValidationResults] = useState<ValidationResult | null>(null);

  const addSaidTag = async (...args) => {
    const updated = await runEffectAsyncOrFail(program);
    updateState({ document: updated, loading: false });
    await validateDocument(updated); // ⚠️ Side effect after state update
  };
}
```

**Critique:** The `validateDocument` call is a side effect that happens after state update. This is **acceptable** (validation is naturally after edit), but it creates a temporal coupling: "every edit MUST validate."

**Alternative (more explicit time modeling):**
```typescript
// Make validation part of the event stream
type EditEvent =
  | { type: 'TagAdded', document: TEIDocument }
  | { type: 'ValidationCompleted', document: TEIDocument, results: ValidationResult }

// Validation is a separate process that reacts to events
// Not coupled to every edit operation
```

**But is this over-engineering?** For an editor, validation-after-edit is the right default. The current design is **simple enough**—the coupling is intentional and semantic.

**Verdict:** ✅ Good balance of simplicity and practicality.

---

## Dimension 2: Values Over Places (Immutability)

### Smart Selection

**Analysis:** ✅ **Value-oriented**

```typescript
// Everything is immutable values
interface TagBoundary {
  position: number;      // primitive
  type: 'open' | 'close'; // primitive
  tagName: string;        // primitive
  tagId?: string;         // primitive
}

interface SelectionAdjustment {
  originalRange: TextRange;  // value
  adjustedRange: TextRange;   // value
  reason: string;             // value
}
```

**No places to defend:**
- Passage is a value (from document state)
- TagBoundary is a value
- SelectionAdjustment is a value
- Functions return new values, don't mutate inputs

**Benefit:** Thread-safe, sharable, easy to test, no defensive copying needed.

### Schema Validation

**Analysis:** ✅ **Value-oriented** (mostly)

```typescript
// Document is immutable value
type TEIDocument = {
  state: {
    parsed: any;        // immutable parsed XML
    passages: Passage[]; // immutable passages
    tags: Tag[];         // immutable tags
    revision: number;    // immutable version
  }
  events: DocumentEvent[];
}

// Validation creates new state, doesn't mutate
updateState({ document: updated, validationResults: result });
```

**However, React state is a "place":**

```typescript
const [document, setDocument] = useState<TEIDocument | null>(null);
```

**Critique:** This is **acceptable**—React's model is that state is a place that components observe. But the **TEIDocument value itself is immutable**, so mutations are localized to the React boundary.

**Improvement opportunity:** The event log (`document.events`) is **awesome**—it provides an audit trail. This is values-over-places in action: history is preserved, not erased by mutation.

**Verdict:** ✅ Strong value-orientation, with controlled places at boundaries.

---

## Dimension 3: Design for Composition

### Analysis of Composability

**Question:** Can smart selection and schema validation be used independently?

**Smart Selection:**
```typescript
// ✅ Composable: Use detectTagBoundaries alone
const boundaries = detectTagBoundaries(passage);

// ✅ Composable: Use snapToTagBoundaries alone
const adjustment = snapToTagBoundaries(passage, range);

// ✅ Composable: Combine in new ways
const smartTagValidator = compose(
  validateSelection,
  snapToTagBoundaries,
  detectTagBoundaries
);
```

**Schema Validation:**
```typescript
// ✅ Composable: ValidationService is independent
const validationService = yield* _(ValidationService);
const result = yield* _(validationService.validateDocument(xml, schemaPath));

// ✅ Composable: Can swap schema loaders
const schemaLoader = new SchemaLoader(); // Independent
const validation = new ValidationService({ schemaLoader });
```

**Integration:**
```typescript
// ⚠️ Question: Are the two layers composable?
// Current: Tight coupling in hooks.ts
const addSaidTag = async (...) => {
  const updated = await runEffectAsyncOrFail(program);
  updateState({ document: updated });
  await validateDocument(updated); // Coupling: every edit validates
};
```

**Critique:** There's a fixed pipeline: Edit → Validate. This is **intentional** (an editor must validate), but it's **not composable**—you can't easily swap out validation or skip it.

**Alternative (more composable):**
```typescript
// Define protocol: Edit operation returns validation effect
type EditResult = {
  document: TEIDocument;
  validation?: Effect<ValidationResult>;
};

// Validation is optional, can be composed differently
const result = await addSaidTag(...);
if (shouldValidate) {
  const validation = await result.validation();
  updateState(validation);
}
```

**But is this over-engineering?** For an editor, the fixed pipeline is **the right abstraction**. Not everything needs to be composable.

**Verdict:** ✅ Components are internally composable, even if the pipeline is fixed.

---

## Dimension 4: Time and State Modeling

### Analysis: Explicit Time Modeling

**Current design:**

```typescript
// ✅ Event sourcing: History is preserved
type TEIDocument = {
  state: {
    revision: number;  // Increments with each edit
  }
  events: DocumentEvent[];  // Complete history
};

// ✅ Undo/redo as first-class operations
undo(targetRevision?: number): Promise<void>;
redo(fromRevision?: number): Promise<void>;
timeTravel(targetRevision: number): Promise<void>;
```

**This is EXCELLENT:** The document is an **event-sourced value**, not a mutable place. Every state transition is explicit.

**However, validation creates a separate time stream:**

```typescript
// ⚠️ Two separate time-based processes
// 1. Document edits (event-sourced, explicit)
// 2. Validation results (React state, separate)

const [validationResults, setValidationResults] = useState<ValidationResult | null>(null);
```

**Critique:** Validation results are **not event-sourced**. They're React state that gets overwritten. You can't undo to a previous validation state (though you can undo the document edit, which re-triggers validation).

**Is this a problem?** No. Validation is a **derived computation** from the document, not independent state. When you undo a document edit, validation re-runs on the old document state. This is **correct**.

**Verdict:** ✅ Strong explicit time modeling for documents. Validation is correctly derived, not independent.

---

## Dimension 5: Protocols and Data Formats

### Analysis: Are boundaries first-class?

**Smart Selection Protocol:**
```typescript
// ✅ Clear protocol: Selection → Adjustment
interface SelectionAdjustment {
  originalRange: TextRange;
  adjustedRange: TextRange;
  reason: string;
  snappedTo?: {
    start?: TagBoundary;
    end?: TagBoundary;
  };
}

// Function signature is the protocol
function smartSelectionAdjust(
  passage: Passage,
  range: TextRange,
  tagType?: string
): SelectionAdjustment
```

**Analysis:** ✅ **Protocol-first**

**Why:**
- Input/output types are explicit
- Can swap implementations (different snapping strategies)
- Can test without UI
- Clear contract

**Schema Validation Protocol:**
```typescript
// ✅ Clear protocol: XML + Schema → Result
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: FixSuggestion[];
}

// ValidationService protocol
interface ValidationService {
  validateDocument(xml: string, schemaPath: string): Effect<ValidationResult>;
}
```

**Analysis:** ✅ **Protocol-first**

**Why:**
- Schema path is explicit (not guessed)
- Result type is well-defined
- Can swap validation libraries (salve-annos → something else)
- Effect wrapper makes dependencies explicit

**Verdict:** ✅ Strong protocol boundaries throughout.

---

## Dimension 6: Constraints as Instruments

### Analysis: Do constraints make the system learnable?

**Smart Selection Constraints:**
```typescript
// ✅ Coherent tool: Doesn't try to be "universal"
// Only handles: TEI XML tag boundaries
// Specific to: Passage-level selections
```

**Schema Validation Constraints:**
```typescript
// ✅ Coherent tool: Validates against specific schema
const schemaPath = '/public/schemas/tei-novel.rng';

// Not: "Accept any XML, validate against everything"
```

**Critique:** The system has **explicit constraints**:
1. Only TEI P5 schemas (not P4, not custom formats)
2. Only RelaxNG validation (not XSD, not DTD)
3. Only passage-level smart selection (not cross-passage)

**Benefits:**
- Learnable: Users understand what's supported
- Debuggable: Clear error messages
- Testable: Fixed scope, not infinite combinations

**Verdict:** ✅ Strong constraint discipline.

---

## Overall Verdict

### Strengths

1. **Value-oriented design:** Immutable data, pure functions, event-sourced documents
2. **Explicit time modeling:** Event log, revision tracking, undo/redo
3. **Clear protocols:** Well-defined interfaces, composable components
4. **Pragmatic simplicity:** Fixed pipeline where appropriate (edit → validate)
5. **Constraint discipline:** TEI P5 only, RelaxNG only, passage-level scope

### Weaknesses

1. **Two-layer coupling:** Smart selection and schema validation are **separated but not integrated**
   - Smart selection doesn't know about schema constraints
   - Schema validation doesn't guide smart selection
   - Example: `<said>` needs `@who` attribute, but smart selection allows creating it without `@who`

2. **Derived state not explicit:** Validation results are React state, not derived from document
   - Could be: `validationResults = useMemo(() => validate(document), [document])`
   - But: Validation is async, so this doesn't work cleanly
   - Current approach is **acceptable** given constraints

3. **Fixed pipeline not configurable:**
   - Can't easily skip validation for batch operations
   - Can't validate against multiple schemas simultaneously
   - But: These are **future concerns**, not current needs

### Design Quality

| Dimension | Rating | Notes |
|-----------|-------|-------|
| Simplicity | ⭐⭐⭐⭐⭐ | Pure functions, no entanglement |
| Values over Places | ⭐⭐⭐⭐⭐ | Immutable data, event sourcing |
| Composition | ⭐⭐⭐⭐ | Components composable, pipeline fixed but appropriate |
| Time Modeling | ⭐⭐⭐⭐⭐ | Event-sourced, explicit history |
| Protocols | ⭐⭐⭐⭐⭐ | Clear boundaries, well-defined interfaces |
| Constraints | ⭐⭐⭐⭐⭐ | TEI P5 only, RelaxNG only, coherent scope |

**Overall: ⭐⭐⭐⭐⭐ (5/5) - Excellent design**

### Recommendations

#### 1. Make Smart Selection Schema-Aware (Priority: Medium)

**Current gap:** Smart selection doesn't know about schema constraints.

```typescript
// Current: Smart selection allows this
validateSelection(passage, { start: 3, end: 8 }, 'said') // ✅ Valid structure

// But schema will reject this
<said>John</said> // Missing @who attribute

// Enhancement: Schema-aware validation
function validateWithSchema(passage, range, tagType, schema) {
  // 1. Structural validation (current)
  if (!validateSelection(passage, range, tagType).valid) return false;

  // 2. Schema constraint validation (new)
  const requiredAttrs = schema.getRequiredAttributes(tagType);
  if (requiredAttrs.length > 0) {
    return {
      valid: false,
      reason: `Tag <${tagType}> requires attributes: ${requiredAttrs.join(', ')}`,
      suggest: () => showAttributeDialog(requiredAttrs),
    };
  }

  return { valid: true };
}
```

**Benefit:** Catch errors **before** applying tags, provide immediate guidance.

**Trade-off:** Smart selection becomes schema-dependent (less pure). But for a TEI editor, this is **appropriate constraint**.

#### 2. Make Validation Results Derived (Priority: Low)

**Current:** Validation results are React state set by side effect.

```typescript
const [validationResults, setValidationResults] = useState<ValidationResult | null>(null);

const addSaidTag = async (...) => {
  const updated = await runEffectAsyncOrFail(program);
  updateState({ document: updated });
  await validateDocument(updated); // Side effect
};
```

**Alternative:** Derive validation from document (conceptually):

```typescript
// Ideally:
const validationResults = computeValidation(document);

// But: Validation is async and expensive
// Current approach is **pragmatic**: Update on edits, not on every render
```

**Verdict:** Current approach is **fine**. Don't change.

#### 3. Extract Validation Pipeline as Protocol (Priority: Low)

**Current:** Validation is hard-coded in hooks.ts.

```typescript
const addSaidTag = async (...) => {
  const updated = await runEffectAsyncOrFail(program);
  updateState({ document: updated });
  await validateDocument(updated); // Hard-coded side effect
};
```

**Alternative:** Make validation an explicit pipeline:

```typescript
// Define protocol
interface EditPipeline {
  edit(doc: TEIDocument): TEIDocument;
  validate(doc: TEIDocument): Promise<ValidationResult>;
}

// Implement
const pipeline: EditPipeline = {
  async edit(doc) {
    return await applyTag(doc, tag, range);
  },
  async validate(doc) {
    return await validateDocument(doc);
  },
};

// Use
const result = await pipeline.edit(document);
const validation = await pipeline.validate(result);
```

**Benefit:** More explicit, easier to test, easier to swap steps.

**Trade-off:** More code, more abstraction. Is it worth it? **Maybe not**—current design is clear enough.

---

## Comparison: Before vs After

### Before (No Validation):
```
User applies tag → XML created → Export → Oops, invalid
```

### After (Two-Layer):
```
User selects text
  ↓
Smart Selection: Adjust boundaries (if needed)
  ↓
Tag applied → Document updated
  ↓
Schema Validation: Check against TEI P5
  ↓
Results shown (errors + warnings)
```

**Hickey Principles Applied:**
- ✅ **Values:** Document is event-sourced, immutable
- ✅ **Protocols:** Clear interfaces for validation
- ✅ **Time:** Event log preserves history
- ✅ **Constraints:** TEI P5 only, RelaxNG only
- ✅ **Composition:** Components usable independently

---

## Final Assessment

**This is good design.** The two-layer system is:
- **Simple:** Clear responsibilities, no hidden complexity
- **Value-oriented:** Immutable data, event sourcing
- **Composable:** Components can be used independently
- **Explicit:** Event log, clear protocols
- **Constrained:** TEI P5 only, coherent scope

**The main gap:** Smart selection and schema validation are **separated but not integrated**.

**Should we integrate them?** Maybe. Consider:
- Does it reduce entanglement? (Maybe, by catching errors earlier)
- Does it make the system simpler? (Arguably, by having one validation layer instead of two)
- Does it improve composability? (Yes, schema-aware smart selection)

**Recommendation:** Leave as-is for now, but consider schema-aware smart selection if users struggle with validation errors.

---

## Rationalization Check

| Potential Rationalization | Reality |
|-------------------------|----------|
| "Two layers is complex" | Two layers with clear responsibilities = simple |
| "Just validate after, skip smart selection" | Smart selection prevents structural errors before they happen |
| "Smart selection should know about schema" | Maybe, but mixing concerns creates entanglement |
| "Effects are overkill here" | Effects make dependencies explicit, which is simple |
| "Event sourcing is over-engineering" | Event log enables undo/redo, audit trails, debugging |

---

## Summary

**Design Quality:** ⭐⭐⭐⭐⭐ (5/5)

This is **good design** that follows Hickey principles:
- ✅ Values over places (immutable documents, event sourcing)
- ✅ Explicit time modeling (event log, revisions)
- ✅ Clear protocols (ValidationService, SelectionManager)
- ✅ Design for composition (independent components)
- ✅ Constraints as instruments (TEI P5 only, not "everything for everyone")

**Main improvement opportunity:** Schema-aware smart selection (catch attribute errors before applying tags).

**But:** Current separation is **valid**—each layer has a clear responsibility. Don't merge prematurely.
