# Architecture Decision: Effect vs Pure Functions for Validation Features

**Date:** 2025-02-06
**Status:** Draft - Awaiting Decision
**Context:** Post-implementation analysis of validation features integration

## Problem Statement

The validation features (hints, suggestions, workflows, entities, summary) were implemented as **standalone protocols** with **pure functions**, while existing services use **Effect framework**. This creates a hybrid architecture with two different paradigms.

**Current Code:**
```typescript
// Effect-based (existing)
const { document } = useDocumentService(); // ✅ Effect layer
await updateDocument(xml); // ✅ Effect-managed

// Pure functions (new features)
const hint = useHints(selection, tagType); // ❌ Direct protocol call
const suggestions = useSuggestions(selection); // ❌ Direct protocol call
const summary = useDocumentSummary(document); // ❌ Direct protocol call
```

## Effect Framework Guidance (from llms-small.txt)

### Key Quote: When to Use Effect

> "Effect is an app-level library to tame concurrency, error handling, and much more!
> You'd use Effect to **coordinate your thunks of code**, and you can build your
> thunks of code in the best performing manner as you see fit while still controlling
> execution through Effect."
>
> "Where generators and iterables are unacceptably slow is in transforming collections
> of data, for that try to use plain arrays as much as possible."

### Key Principle: Separation of Concerns

- **Effect** = App-level coordination (concurrency, error handling, dependency injection)
- **Pure functions** = Business logic thunks (transformations, calculations, heuristics)

### Recommended Core Functions (Effect docs)

Developers only need 10-20 functions to be productive:
- `Effect.succeed`, `Effect.fail`, `Effect.sync`
- `Effect.gen`, `Effect.runPromise`
- `Effect.catchTag`, `Effect.catchAll`
- `Effect.acquireRelease`, `Effect.provide`
- `Effect.andThen`, `Effect.map`, `Effect.tap`
- **Context**, **Layer**, **Option**, **Either**

## Current Implementation Analysis

### Pure Function Protocols (New Features)

| Protocol | Purpose | I/O? | Side Effects? | Current Approach |
|----------|---------|------|---------------|-----------------|
| `hints.ts` | Validation → UI hints | ❌ No | ❌ No | ✅ Pure function |
| `suggestions.ts` | Text → tag suggestions | ❌ No | ❌ No | ✅ Pure function |
| `workflows.ts` | Plan multi-step tagging | ❌ No | ❌ No | ✅ Pure function |
| `entities.ts` | Entity CRUD operations | ❌ No | ❌ No | ✅ Pure function |
| `summary.ts` | Aggregate validation | ❌ No | ❌ No | ✅ Pure function |
| `cache.ts` | LRU cache wrapper | ❌ No | ✅ Yes (mutation) | ⚠️ Global state |

**Assessment:** These are **correctly implemented as pure functions** - they transform data without I/O or side effects.

### React Hooks (Integration Layer)

| Hook | Purpose | Uses Effect? | State Management |
|------|---------|--------------|------------------|
| `useSelection.ts` | Track text selection | ❌ No | React useState |
| `useHints.ts` | Generate hints | ✅ Yes (document) | React useState |
| `useSuggestions.ts` | Generate suggestions | ❌ No | React useMemo |
| `useWorkflow.ts` | Manage workflow state | ❌ No | React useState |
| `useEntities.ts` | Manage entity CRUD | ❌ No | React useState |
| `useDocumentSummary.ts` | Aggregate validation | ❌ No | React useState |

**Issue:** Hooks mix React state management with pure function calls, bypassing Effect's runtime.

## Architecture Options

### Option A: Fully Commit to Effect (Consistent)

Convert all protocols to Effect services:

```typescript
// lib/effect/services/HintsService.ts
export interface HintsService {
  readonly generateFor: (
    selection: Selection,
    tagType: string
  ) => Effect<Hint, never, DocumentService>
}

export const HintsServiceLive = Layer.succeed(HintsService, {
  generateFor: (selection, tagType) =>
    Effect.gen(function* () {
      const document = yield* DocumentService
      const result = validateSelection(selection, tagType, {}, document)
      return generateHint(result.value, tagType)
    })
})
```

**Integration:**
```typescript
// hooks/useHints.ts
export function useHints(
  selection: Selection | null,
  tagType: string
): Hint | null {
  const [hint, setHint] = useState<Hint | null>(null)

  useEffect(() => {
    if (!selection) {
      setHint(null)
      return
    }

    // Run through Effect runtime
    const program = Effect.gen(function* () {
      const hints = yield* HintsService
      return yield* hints.generateFor(selection, tagType)
    })

    const result = Effect.runSync(program.provide(MainLayer))
    setHint(result)
  }, [selection, tagType])

  return hint
}
```

**Pros:**
- ✅ Consistent architecture across codebase
- ✅ Dependency injection (easier testing)
- ✅ Type-safe error handling
- ✅ Observability (logging, metrics)
- ✅ Layer-based testing (TestLayer)
- ✅ No global mutable state

**Cons:**
- ❌ Significant refactoring (~40 hours)
- ❌ More boilerplate (Layer definitions, Service interfaces)
- ❌ Learning curve for team
- ❌ Runtime overhead (though Effect docs say this is minimal for app-level)
- ❌ May violate "build thunks in best performing manner" principle

**Estimated Effort:** 40 hours

---

### Option B: Pragmatic Hybrid (Keep Status Quo)

Use Effect for **I/O and coordination**, pure functions for **business logic**:

```typescript
// lib/protocols/hints.ts - Keep as pure function
export function generateHint(
  validationResult: ValidationResult,
  tagType: string
): Hint {
  // Pure transformation - no Effect needed
}

// hooks/useHints.ts - Use Effect for document access
export function useHints(
  selection: Selection | null,
  tagType: string
): Hint | null {
  const { document } = useDocumentService() // ✅ Effect for I/O
  const [hint, setHint] = useState<Hint | null>(null)

  useEffect(() => {
    if (!selection || !document) {
      setHint(null)
      return
    }

    // Pure function call (no Effect)
    const validationResult = validateSelection(
      selection, tagType, {}, document
    )
    const newHint = generateHint(validationResult.value, tagType)
    setHint(newHint)
  }, [selection, tagType, document])

  return hint
}
```

**Guidelines:**
```typescript
// ✅ Use Effect for:
- Database/API calls (DocumentService, StorageService)
- External I/O (file system, network)
- State management (app-level state)
- Dependency injection (services, layers)
- Concurrency control (parallel/sequential execution)
- Error handling with recovery (retry, fallback)

// ✅ Use Pure Functions for:
- Data transformations (ValidationResult → Hint)
- Calculations (heuristics, algorithms)
- Business logic (workflow planning, entity validation)
- Simple operations (no I/O, no side effects)
- Performance-critical code (collections, data processing)
- React state updates (setState)
```

**Pros:**
- ✅ Follows Effect documentation guidance ("build thunks in best performing manner")
- ✅ Less boilerplate (pure functions are simpler)
- ✅ Better performance for transformations (no runtime overhead)
- ✅ Easier to understand (pure functions are intuitive)
- ✅ Minimal refactoring needed
- ✅ Already works well

**Cons:**
- ❌ Inconsistent patterns (mix of Effect and non-Effect)
- ❌ Harder to test protocols in isolation (no dependency injection)
- ❌ Global mutable state (LRU caches)
- ❌ No observability for pure function calls
- ❌ Can't intercept/monitor protocol calls

**Estimated Effort:** 4 hours (document guidelines, add logging)

---

### Option C: Domains-Based Separation

Use Effect for **service layer**, pure functions for **domain logic**:

```typescript
// Services (Effect-based, I/O operations)
interface DocumentService {
  readonly load: (path: string) => Effect<TEIDocument, FileSystemError>
  readonly save: (doc: TEIDocument) => Effect<void, FileSystemError>
}

interface EntityRepository {
  readonly load: () => Effect<Entity[], FileSystemError>
  readonly save: (entities: Entity[]) => Effect<void, FileSystemError>
}

// Domain Logic (Pure functions, no I/O)
namespace HintsDomain {
  export function generateHint(
    validation: ValidationResult,
    tagType: string
  ): Hint {
    // Pure function - no Effect
  }
}

// React Hook (Glue layer)
function useHints(selection: Selection, tagType: string): Hint | null {
  const { document } = useDocumentService() // Effect
  const hint = useMemo(() => {
    if (!selection) return null
    const validation = validateSelection(selection, tagType, {}, document)
    return HintsDomain.generateHint(validation.value, tagType)
  }, [selection, tagType, document])
  return hint
}
```

**Architecture Principle:**
> **Effect for the "edges" (I/O, services), pure functions for the "core" (domain logic)**

**Pros:**
- ✅ Clear separation of concerns
- ✅ Best of both worlds (Effect for I/O, purity for logic)
- ✅ Aligns with Effect documentation guidance
- ✅ Domain logic is framework-agnostic (portable)
- ✅ Minimal refactoring needed

**Cons:**
- ❌ Still two paradigms in codebase
- ❌ Need clear guidelines/documentation
- ❌ Risk of mixing (developers need to know when to use which)

**Estimated Effort:** 8 hours (documentation, refactoring protocols)

---

## Recommendations

### Short-Term (Immediate)

1. **Document the hybrid approach** with clear guidelines
2. **Add logging to protocols** for observability
3. **Replace global LRU cache** with React state or Effect cache
4. **Fix failing tests** (entity ID format)

**Estimated Effort:** 4-6 hours

### Medium-Term (Next Sprint)

5. **Extract domain logic from services** (pure functions for business logic)
6. **Add Effect services for I/O** (EntityRepository, ValidationRepository)
7. **Layer-based testing** for Effect services
8. **Performance monitoring** (protocol benchmarks)

**Estimated Effort:** 16-20 hours

### Long-Term (Strategic)

**Choose ONE paradigm** based on team needs:

#### If team prefers consistency → **Option A (Full Effect)**
- Refactor all protocols to Effect services
- Invest in training (10-20 core functions)
- Long-term maintainability wins

#### If team prefers pragmatism → **Option C (Domains-Based)**
- Keep pure functions for domain logic
- Use Effect for service layer (I/O, coordination)
- Document guidelines clearly
- Lower learning curve, faster development

#### Avoid → **Option B (Unprincipled Hybrid)**
- Current approach lacks clear guidelines
- Risk of confusion over time
- Only acceptable if transitioning to Option A or C

---

## Decision Matrix

| Criterion | Option A (Full Effect) | Option C (Domains-Based) | Option B (Status Quo) |
|-----------|----------------------|--------------------------|---------------------|
| **Consistency** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |
| **Performance** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Testability** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Learning Curve** | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Boilerplate** | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Maintainability** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |
| **Refactoring Effort** | ⭐ (40h) | ⭐⭐⭐ (8h) | ⭐⭐⭐⭐⭐ (4h) |
| **Team Buy-In** | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |

**Recommendation:** **Option C (Domains-Based Separation)**

- Aligns with Effect documentation ("coordinate thunks, build thunks best way")
- Clear separation of concerns (services vs domain logic)
- Pragmatic balance of consistency and flexibility
- Manageable refactoring effort

---

## Implementation Plan (Option C)

### Phase 1: Document Guidelines (2 hours)
```markdown
# Architecture Guidelines

## When to Use Effect
- Database/API calls
- File I/O operations
- External service integration
- Complex error handling with recovery
- Concurrency control (parallel/sequential)
- Dependency injection

## When to Use Pure Functions
- Data transformations
- Business logic calculations
- Heuristics and algorithms
- React state updates
- Performance-critical code

## Pattern
```
┌─────────────────────┐
│   React Component    │
│   (UI Layer)         │
└──────────┬───────────┘
           │
           ├─ useDocumentService() ──> Effect Layer
           │
           └─ generateHint() ───────> Pure Function Domain
```
```

### Phase 2: Refactor Protocols (4 hours)
```typescript
// Rename and organize
lib/
  domain/
    hints.ts          # Pure functions
    suggestions.ts    # Pure functions
    workflows.ts      # Pure functions
    entities.ts       # Pure functions
    validation.ts     # Pure functions
  effect/
    services/
      HintsService.ts      # Effect wrappers (if needed)
      EntityRepository.ts  # Effect for I/O
```

### Phase 3: Add Observability (2 hours)
```typescript
// domain/hints.ts
export function generateHint(
  validation: ValidationResult,
  tagType: string
): Hint {
  const hint = { /* ... */ }

  // Optional: Add logging hook
  if (process.env.NODE_ENV === 'development') {
    console.log('[HintsDomain]', { severity: hint.severity, code: hint.code })
  }

  return hint
}
```

### Phase 4: Update Tests (2 hours)
- Unit tests: Test pure functions directly (no Effect)
- Integration tests: Use TestLayer for Effect services
- Add protocol tests for domain logic

**Total Estimated Effort:** 10 hours

---

## Conclusion

The validation features are **architecturally sound** but exist in a **hybrid codebase**. Based on Effect framework documentation, **Option C (Domains-Based Separation)** provides the best balance:

1. **Follows Effect guidance** - Use Effect for coordination, pure functions for thunks
2. **Clear separation** - Services (Effect) vs Domain (pure functions)
3. **Minimal refactoring** - Reorganize existing code rather than rewrite
4. **Pragmatic** - Performance where it matters, consistency where it counts
5. **Future-proof** - Can evolve to Option A if needed

**Next Steps:**
1. Document the domains-based approach
2. Reorganize protocols into domain/ folder
3. Add Effect services only for I/O operations
4. Update testing guidelines
5. Monitor and adjust based on team feedback

---

**End of Architecture Decision**
