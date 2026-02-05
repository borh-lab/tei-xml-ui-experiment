# Hickey-Style Review: Validation Features Architecture Decision

**Reviewer:** Claude (via rich-hickey-review skill)
**Date:** 2025-02-06
**Subject:** Architecture Decision for Effect vs Pure Functions
**Document:** docs/analysis/architecture-decision-effect-vs-pure.md

## Executive Summary

**Rating:** ⭐⭐⭐⭐☆ (4/5) - Strong design with one critical flaw

**Verdict:** The **pure function protocols are excellent** (simple, composable, value-oriented), but the **architecture analysis misses the critical design flaw**: **global mutable state in the cache**. The recommendation (Option C: Domains-Based) is sound, but doesn't address the root complexity.

**Critical Issue:** The "simple" pure functions are wrapped around **global mutable state** (LRU caches), which **re-introduces the complexity** that pure functions were meant to eliminate.

---

## Dimension 1: Simplicity vs Ease (Unentangled vs Familiar)

### Analysis of Pure Function Protocols ✅

**The protocols themselves are SIMPLE (unentangled):**

```typescript
// lib/protocols/hints.ts - ONE twist: ValidationResult → Hint
export function generateHint(validation: ValidationResult, tagType: string): Hint {
  const firstError = validation.errors[0];
  if (firstError) {
    return generateHintFromError(firstError, tagType, validation.fixes);
  }
  // ... rest of logic
}
```

**Why this is SIMPLE:**
- **Single responsibility:** Converts validation to UI hint
- **No braiding:** Doesn't manage state, does I/O, or handle caching
- **Pure function:** Input → Output, no side effects
- **Composable:** Can be used anywhere, tested independently

**Contrast with "Easy" (familiar) alternative:**
```typescript
// ❌ EASY (familiar): Object-oriented class with mutation
class HintGenerator {
  private cache: Map<string, Hint> = new Map();  // Hidden complexity

  generate(validation: ValidationResult, tagType: string): Hint {
    // Braided: generation + caching + state management
    const cached = this.cache.get(validation.id);
    if (cached) return cached;

    const hint = this.createHint(validation, tagType);
    this.cache.set(validation.id, hint);  // Mutation!
    return hint;
  }
}
```

This would be "easy" (familiar OO pattern) but **complex** (braided concerns: generation + caching + state).

**Assessment:** ✅ **The pure function protocols are correctly designed.**

### Analysis of React Hooks Integration ⚠️

**The hooks mix concerns but keep them mostly separate:**

```typescript
// hooks/useEntities.ts
export function useEntities(): UseEntitiesResult {
  const [state, setState] = useState<EntityState>(() => ({
    entities: [],
    deltas: [],
  }));

  const applyDelta = useCallback(async (delta: EntityDelta) => {
    const result = applyEntityDelta(state.entities, delta); // ✅ Pure call
    setState(prevState => ({  // ⚠️ React state mutation
      entities: result.data!,
      deltas: [...prevState.deltas, delta],
    }));
  }, [state.entities, state.deltas.length]); // ⚠️ Dependency on state (entanglement)
}
```

**Why this is LESS SIMPLE:**
- **Braided dependencies:** `applyDelta` depends on `state.entities`, creating re-render loop
- **Hidden complexity:** React's dependency array system is a complex state machine
- **Not composable:** Can't use `applyEntityDelta` without React state

**Better approach (Value-Oriented):**
```typescript
// ✅ SIMPLER: Return new state, let React manage it
export function applyEntityDeltaToState(
  state: EntityState,
  delta: EntityDelta
): EntityState {
  const result = applyEntityDelta(state.entities, delta);
  if (!result.success) {
    return { ...state, error: new Error(result.error.message) };
  }
  return {
    entities: result.data!,
    deltas: [...state.deltas, delta],
  };
}

// In hook:
const [state, setState] = useState(initialState);
const nextState = applyEntityDeltaToState(state, delta); // Pure
setState(nextState); // React handles the complexity
```

**Assessment:** ⚠️ **Hooks are "easy" (React standard) but not "simple" (entangled with React's state machine).**

---

## Dimension 2: Values Over Places (Immutability)

### Pure Function Protocols ✅

**Excellent use of immutable values:**

```typescript
// lib/protocols/entities.ts - All values, no mutation
export function applyEntityDelta(
  entities: readonly Entity[],  // ✅ Immutable input
  delta: EntityDelta
): Result<Entity[]> {  // ✅ Immutable output (new array)
  // ...
  return success([...entities, entity]);  // ✅ New array, no mutation
}
```

**Why this is VALUES:**
- **Safe to share:** Can call `applyEntityDelta(entities, delta)` without defending entities
- **No surprises:** Input never changes, output is new value
- **Composable:** Can chain calls: `applyDelta(applyDelta(entities, d1), d2)`

**Contrast with PLACE-oriented alternative:**
```typescript
// ❌ PLACE: Mutable class
class EntityManager {
  private entities: Entity[] = [];

  create(entity: Entity): void {
    this.entities.push(entity);  // Mutates! Callers must defend
  }
}
```

**Assessment:** ✅ **Protocols are value-oriented. Excellent.**

### Global Mutable Cache (CRITICAL FLAW) ❌

```typescript
// lib/protocols/cache.ts - Lines 199-218
let globalCache: PassageValidationCache | null = null;

export function getGlobalCache(config?: Partial<CacheConfig>): PassageValidationCache {
  if (!globalCache) {
    globalCache = new PassageValidationCache(config);
  }
  return globalCache;  // Returns mutable place
}
```

**Why this is PLACES not VALUES:**
- **Mutation inside:** `cache.set()` mutates internal Map (line 110)
- **Global singleton:** All callers share one mutable instance
- **Hidden coordination:** Multiple callers must coordinate access
- **Test isolation hard:** Tests must call `resetGlobalCache()` to avoid state leakage

**This is the COMPLEXITY that pure functions were meant to eliminate.**

**Hickey principle:** "Values can be shared safely. Places require coordination."

**Current design requires coordination:**
```typescript
// Test setup required:
import { resetGlobalCache } from '@/lib/protocols/cache';

beforeEach(() => {
  resetGlobalCache();  // Must manually coordinate
});
```

**BETTER approach (Value-Oriented):**
```typescript
// ✅ Accept cache as parameter, don't manage global state
export function summarizeValidation(
  document: TEIDocument,
  cache: PassageValidationCache | null = null  // ✅ Injected
): Result<ValidationSummary> {
  // Use cache if provided, but don't own it
}

// Let Effect/React manage the cache lifecycle:
const cache = useMemo(() => new PassageValidationCache(), []);
const summary = summarizeValidation(document, cache);  // Pure
```

**Assessment:** ❌ **Global cache mutation undermines the value-oriented design. This is a critical flaw.**

---

## Dimension 3: Design for Composition (Decomposition)

### Protocols are Composable ✅

```typescript
// Can combine operations freely:
const validated = applyEntityDelta(entities, createDelta);
const updated = applyEntityDelta(validated.entities, updateDelta);
const deleted = applyEntityDelta(updated.entities, deleteDelta);
```

**Why this COMPOSES:**
- **Separable concerns:** Each operation is independent
- **No hidden coupling:** No global state between calls
- **Predictable:** Input → Output, no surprises

**Assessment:** ✅ **Excellent composability.**

### Cache Entanglement ❌

**LRU cache is entangled with protocols:**

```typescript
// lib/protocols/suggestions.ts - Lines 63-66
const suggestionCache = new LRUCache<string, Suggestion[]>({
  max: 100,
  ttl: 5000,
});

export function generateSuggestions(selection: Selection, options): Suggestion[] {
  const cacheKey = createCacheKey(selection, opts);
  const cached = suggestionCache.get(cacheKey);  // ⚠️ Hidden dependency
  if (cached) return cached;

  const result = runAllHeuristics(selection);
  suggestionCache.set(cacheKey, result);  // ⚠️ Hidden side effect
  return result;
}
```

**Why this is NOT COMPOSABLE:**
- **Hidden dependency:** Can't swap cache implementation without changing protocol
- **Global state:** Multiple callers share one cache, can't isolate
- **Side effect:** Function pretends to be pure but mutates global state
- **Testing:** Must clear cache between tests (brittle)

**Hickey principle:** "Caching is cross-cutting, not business logic. Extract it as a protocol boundary."

**BETTER design (Composable):**
```typescript
// ✅ Protocol-first: Cache is injectable
export interface Cache<K, V> {
  get(key: K): V | null;
  set(key: K, value: V): void;
}

export function generateSuggestions(
  selection: Selection,
  options: GenerateSuggestionsOptions,
  cache: Cache<string, Suggestion[]> | null = null  // ✅ Injected
): Suggestion[] {
  if (cache) {
    const cached = cache.get(key);
    if (cached) return cached;
  }

  const result = runAllHeuristics(selection);
  if (cache) cache.set(key, result);
  return result;
}

// Usage:
const lruCache = new LRUCache();
const result = generateSuggestions(selection, {}, lruCache);  // Explicit

// Or use Effect's Cache service:
const result = yield* SuggestionsService.generate(selection);
```

**Assessment:** ❌ **Caching is entangled with protocols, violating composability.**

---

## Dimension 4: Time and State Modeling

### Entity Delta History (Good!) ✅

```typescript
// hooks/useEntities.ts - Lines 29-32, 112-113
interface EntityState {
  readonly entities: readonly Entity[];
  readonly deltas: readonly EntityDelta[];  // ✅ History preserved
}

const deltaPositionRef = useRef(state.deltas.length);  // Undo position
```

**Why this models time WELL:**
- **History preserved:** `deltas` array records all operations
- **Can undo/redo:** Position ref allows navigation through history
- **Derived state:** Current entities are derived from applying deltas

**This is EVENT SOURCING-lite** - excellent for debugging and audit trails.

**Assessment:** ✅ **Excellent time modeling through delta history.**

### React State Mutation (Hidden Time) ⚠️

```typescript
// hooks/useEntities.ts
const applyDelta = useCallback(async (delta: EntityDelta) => {
  setLoading(true);  // ⚠️ State change 1
  setError(null);    // ⚠️ State change 2

  const result = applyEntityDelta(state.entities, delta);

  setState(prevState => ({  // ⚠️ State change 3 - mutation
    entities: result.data!,
    deltas: [...prevState.deltas, delta],
  }));

  deltaPositionRef.current = state.deltas.length + 1;  // ⚠️ State change 4
  setLoading(false);  // ⚠️ State change 5
}, [state.entities, state.deltas.length]);  // ⚠️ Closure over state
```

**Why this HIDES time:**
- **Five state mutations** in one function - which is the "real" state?
- **Closure over state:** Dependency array creates hidden time dependency
- **Re-render loop:** Changing state triggers re-render, which may trigger more state changes

**Hickey principle:** "Mutation erases the past."

**BETTER approach (Explicit time):**
```typescript
// ✅ ONE state transition, explicit history
type EntityStateEvent =
  | { type: 'apply-delta'; delta: EntityDelta }
  | { type: 'undo' }
  | { type: 'redo' }

function reduceEntityState(
  state: EntityState,
  event: EntityStateEvent
): EntityState {
  switch (event.type) {
    case 'apply-delta': {
      const result = applyEntityDelta(state.entities, event.delta);
      if (!result.success) {
        return { ...state, error: new Error(result.error.message) };
      }
      return {
        entities: result.data!,
        deltas: [...state.deltas, event.delta],  // ✅ New state, not mutation
      };
    }
    case 'undo': { /* ... */ }
  }
}
```

**Assessment:** ⚠️ **React state management hides time succession behind multiple mutations. Delta history is good, but React integration obscures it.**

---

## Dimension 5: Protocols and Data Formats

### Protocol Design is Good ✅

**The protocols define clear wire formats:**

```typescript
// lib/values/EntityDelta.ts
export type EntityDelta =
  | { readonly operation: 'create'; readonly entityType: EntityType; readonly entity: Entity }
  | { readonly operation: 'update'; readonly entityType: EntityType; readonly entity: Entity }
  | { readonly operation: 'delete'; readonly entityType: EntityType; readonly entity: Entity };
```

**Why this is a GOOD PROTOCOL:**
- **Explicit data format:** Clear what an EntityDelta is
- **No implementation entanglement:** Protocol doesn't dictate storage
- **Composable:** Can serialize, transmit, replay deltas
- **Type-safe:** Discriminated union prevents invalid states

**Assessment:** ✅ **Excellent protocol design. First-class data formats.**

### Implementation Boundaries Are Blurry ⚠️

**Protocol code mixes levels:**

```typescript
// lib/protocols/suggestions.ts
// Lines 63-66: Cache implementation IN protocol file
const suggestionCache = new LRUCache<string, Suggestion[]>({
  max: 100,
  ttl: 5000,
});

export function generateSuggestions(...) { ... }
```

**Why this blurs boundaries:**
- **Protocol file contains implementation:** Cache is a cross-cutting concern
- **No interface:** Can't swap cache strategy without changing protocol
- **Global state:** Protocol owns the cache, not the caller

**Hickey principle:** "Design the protocol first, then implement it."

**BETTER design:**
```typescript
// ✅ Protocol defines interface:
export interface ISuggestionsService {
  generate(selection: Selection, options?: GenerateOptions): Effect<Suggestion[]>;
}

// ✅ Implementation includes cache:
export const SuggestionsServiceLive = Layer.effect(ISuggestionsService, () =>
  Effect.gen(function* () {
    const cache = yield* CacheService;  // ✅ Injected dependency
    return yield* generateWithCache(selection, options, cache);
  })
);
```

**Assessment:** ⚠️ **Protocols mix data format with implementation. Cache should be injected, not embedded.**

---

## Dimension 6: Constraints as Instruments

### Result Type is Good Constraint ✅

```typescript
// lib/protocols/Result.ts
export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: ProtocolError };
```

**Why this CONSTRAINTS well:**
- **No ambiguity:** Success or failure, not both
- **Forces error handling:** Must check `success` before accessing `data`
- **Type-safe:** Compiler prevents accessing `data` when `success: false`

**Contrast with loose constraint:**
```typescript
// ❌ Overly permissive
function applyDelta(entities: Entity[], delta: EntityDelta): Entity[] {
  // Returns [] if fails? Throws? Undefined?
  // Caller must read source to know.
}
```

**Assessment:** ✅ **Result<T> is an excellent constraint - makes failure explicit.**

### Cache is Under-Constrained ❌

```typescript
// lib/protocols/cache.ts - Lines 63-66, 201-211
let globalCache: PassageValidationCache | null = null;

export function getGlobalCache(config?: Partial<CacheConfig>): PassageValidationCache {
  if (!globalCache) {
    globalCache = new PassageValidationCache(config);
  }
  return globalCache;
}
```

**Why this is UNDER-CONSTRAINED:**
- **Any config accepted:** `Partial<CacheConfig>` means anything goes
- **No validation:** Can change config on every call, breaking invariants
- **Global mutation:** All callers share one instance, no isolation

**Hickey principle:** "Is this a coherent tool or a choose-anything framework?"

**Current design:** "Choose-anything" - accepts any config, creates global singleton on first call.

**BETTER design (Constrained):**
```typescript
// ✅ Single instance, explicit creation
export class PassageValidationCache {
  static readonly DEFAULT = new PassageValidationCache();

  constructor(config: CacheConfig) {  // ✅ Requires full config, not partial
    // ...
  }
}

// Usage:
const cache = new PassageValidationCache({ maxSize: 100, ttl: 300000 });
// OR use default:
const cache = PassageValidationCache.DEFAULT;
```

**Assessment:** ❌ **Cache is under-constrained. Global singleton + partial config = hidden coordination problem.**

---

## Red Flags (from skill)

1. **"Team knows this pattern"** → The document says "useEffect is standard React"
   - **Reality:** Standard doesn't mean simple. React's state machine is complex.
   - **Hickey question:** Does useState reduce entanglement, or just defer it?

2. **"YAGNI - don't over-engineer"** → The document suggests "keep status quo" to avoid over-engineering
   - **Reality:** Global mutable state IS engineering - it's just bad engineering
   - **Hickey question:** Does the global cache simplify the design, or kick the can down the road?

3. **"Performance requires coupling"** → Cache is embedded for performance
   - **Reality:** Premature optimization. Cache protocol should be injectable
   - **Hickey question:** Profile first. Is the cache even necessary? Can we inject it later?

4. **Mutation is "fine if documented"** → Cache mutation is "documented" but still mutation
   - **Reality:** Documentation doesn't reduce actual coupling
   - **Hickey principle:** "Values share safely; places don't."

---

## Critical Flaws

### 1. Global Mutable State (Critical) ❌

```typescript
// lib/protocols/cache.ts:201-211
let globalCache: PassageValidationCache | null = null;
export function getGlobalCache(config?: Partial<CacheConfig>): PassageValidationCache {
  if (!globalCache) {
    globalCache = new PassageValidationCache(config);
  }
  return globalCache;
}
```

**Problem:** Global singleton with mutable Map inside. All callers share one place.

**Impact:**
- **Test isolation:** Tests must call `resetGlobalCache()`
- **Concurrency:** No coordination if multiple callers access
- **Surprise:** Function looks pure (`generateHints(selection)`) but has side effect (cache mutation)

**Fix:** Make cache explicit, not global:
```typescript
// Remove global singleton
export function createCache(config: CacheConfig): PassageValidationCache {
  return new PassageValidationCache(config);
}

// Inject into protocols
export function generateSuggestions(
  selection: Selection,
  cache: Cache<string, Suggestion[]> | null = null
): Suggestion[] {
  // Use cache if provided
}
```

### 2. Cache Entanglement (High Priority) ❌

**LRU cache is embedded in 3 protocol files:**
- `lib/protocols/suggestions.ts` (line 63)
- `lib/protocols/summary.ts` (similar)
- `lib/protocols/cache.ts` (module-level)

**Problem:** Cross-cutting concern (caching) is entangled with business logic.

**Impact:**
- **Can't swap cache strategy:** Must modify protocol files
- **Can't disable caching for tests:** Must hack with `resetGlobalCache()`
- **Hidden complexity:** Protocol functions look pure but aren't

**Fix:** Dependency injection:
```typescript
export interface ICache<K, V> {
  get(key: K): V | null;
  set(key: K, value: V): void;
}

export function generateSuggestions(
  selection: Selection,
  cache: ICache<string, Suggestion[]> | null = null
): Suggestion[] {
  if (!cache) return runAllHeuristics(selection);

  const key = createKey(selection);
  const cached = cache.get(key);
  if (cached) return cached;

  const result = runAllHeuristics(selection);
  cache.set(key, result);
  return result;
}
```

---

## What's Working Well (Don't Break These)

### 1. Value-Oriented Protocols ⭐⭐⭐⭐⭐

The pure function protocols are excellent:
- **Immutable data structures** (Selection, Hint, Suggestion, EntityDelta, ValidationSummary)
- **Pure transformations** (no mutation, predictable)
- **Composable** (can chain operations)
- **Testable** (no dependencies to mock)

**DON'T break this.** It's the strength of the design.

### 2. Result Type for Error Handling ⭐⭐⭐⭐⭐

```typescript
export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: ProtocolError };
```

**Excellent constraint:**
- **Explicit failure handling**
- **Type-safe**
- **No exceptions needed**
- **Composable**

**DON'T break this.** Use Result<T> throughout.

### 3. Entity Delta History ⭐⭐⭐⭐

```typescript
interface EntityState {
  readonly entities: readonly Entity[];
  readonly deltas: readonly EntityDelta[];  // ✅ History
}
```

**Excellent time modeling:**
- **Undo/redo support** built-in
- **Audit trail** of all changes
- **Event sourcing** without the overhead

**DON'T break this.** Keep the delta history.

---

## Recommendations (Priority Order)

### Critical (Must Fix)

1. **Remove global mutable cache**
   - Delete `globalCache` singleton
   - Make cache explicit parameter
   - Let React/Effect manage cache lifecycle

2. **Inject cache dependency**
   - Define `ICache<K, V>` interface
   - Pass cache to protocols as parameter
   - Allow swapping cache strategies

### Important (Should Fix)

3. **Simplify React hooks**
   - Extract state transitions from `useEntities` to pure reducer
   - Let React handle the complexity, not the business logic
   - One `setState` per event, not five

4. **Document cache protocol**
   - Define cache interface first
   - Document cache semantics (TTL, eviction)
   - Make it first-class, not embedded

### Nice to Have

5. **Add Effect services for I/O**
   - Keep pure functions for domain logic
   - Add Effect wrappers only for file I/O, network calls
   - This is the "Option C" approach from the document

6. **Add observability**
   - Log cache hits/misses
   - Track protocol execution time
   - Monitor delta history size

---

## Decision Assessment

### Option A: Full Effect (40h) - NOT RECOMMENDED

**Why:** Would add boilerplate without fixing the critical flaw (global cache).

**Better:** Fix the cache first, then consider Effect for I/O.

### Option B: Status Quo (4h) - REJECTED

**Why:** Documentation doesn't fix the fundamental problem (global mutable state).

**This is "ship fast, fix later"** - the approach that Hickey warns against.

### Option C: Domains-Based (10h) - RECOMMENDED with Modifications ✅

**Why:** Separates services (Effect) from domain (pure functions), aligns with Effect documentation guidance.

**BUT:** Must address global cache flaw to be truly simple.

**Modified Option C:**
1. **Remove global cache** (critical) - 2h
2. **Make cache injectable** (important) - 2h
3. **Document service/domain split** (nice to have) - 2h
4. **Add Effect services for I/O only** (nice to have) - 4h

**Total: 10 hours** (same as original estimate, but fixes the critical flaw)

---

## Conclusion

### Strengths (What to Keep)

- ✅ **Pure function protocols** - Simple, composable, value-oriented
- ✅ **Result<T> type** - Excellent constraint for error handling
- ✅ **Entity delta history** - Explicit time modeling, supports undo/redo
- ✅ **Immutable data structures** - Safe sharing, no surprises
- ✅ **Protocol design** - First-class data formats (EntityDelta, Selection, etc.)

### Critical Flaw (Must Fix)

- ❌ **Global mutable cache** - Undermines value-oriented design
- ❌ **Cache entanglement** - Cross-cutting concern embedded in protocols
- ❌ **React state complexity** - Hidden time succession behind mutations

### Final Rating: ⭐⭐⭐⭐☆ (4/5)

**What works:** The pure function protocols are excellent examples of simple, composable design.

**What fails:** The global cache reintroduces the complexity (places, mutation, hidden coordination) that pure functions were meant to eliminate.

**The architecture decision document correctly identifies that the protocols are "business logic thunks" (per Effect docs), but misses the critical flaw that these thunks are wrapped around global mutable state.**

**Recommendation:** Proceed with modified Option C - fix the cache, keep the pure functions, add Effect only for I/O.

---

**End of Hickey-Style Review**

*Review follows Rich Hickey's principles: Simplicity (unentangled), Values Over Places, Composability, Time Modeling, Protocols First, Constraints as Instruments.*
