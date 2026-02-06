# Service vs Domain: Architecture Guidelines

## Overview

This codebase uses a **hybrid architecture** that combines Effect-based services with pure function domain logic. This approach follows Effect framework guidance: use Effect for coordination and I/O, use pure functions for business logic transformations.

**Core Principle:** Effect for the "edges" (I/O, services), pure functions for the "core" (domain logic).

### Architecture Pattern

```
┌─────────────────────────────────────────────────────────┐
│                     React Components                     │
│                      (UI Layer)                          │
└──────────────┬───────────────────────┬──────────────────┘
               │                       │
               ├─ useDocumentService() ──┼──> Effect Layer
               │                       │    (I/O, State)
               │                       │
               └─ generateHint() ──────┼──> Pure Domain
               │                            (Logic)
               └─ applyEntityDelta() ───────┘
```

### Why This Approach?

1. **Effect excels at coordination** - concurrency, error handling, dependency injection
2. **Pure functions excel at logic** - transformations, calculations, algorithms
3. **Clear separation** - services manage I/O, domain manages business rules
4. **Performance** - no Effect runtime overhead for hot code paths
5. **Testability** - domain logic is trivially testable, services use mock layers

---

## When to Use Effect

Use Effect for **application-level coordination** - managing I/O, state, error recovery, and dependencies.

### 1. I/O Operations

**File system, network, database:**

```typescript
// ✅ CORRECT: Use Effect for file I/O
const loadDocument = (xml: string): Effect<TEIDocument, DocumentParseError> =>
  Effect.gen(function* () {
    try {
      const doc = loadDocumentOp(xml);  // Pure parsing logic
      yield* Ref.set(documentRef, doc); // Effect-managed state
      return doc;
    } catch (error) {
      return yield* Effect.fail(new DocumentParseError({ message, xml }));
    }
  });
```

**Why Effect?**
- Might fail (parse errors, file not found)
- Requires error handling
- Needs dependency injection (document reference)

### 2. State Management

**Application-level mutable state:**

```typescript
// ✅ CORRECT: Use Effect for app state
const makeDocumentService = Effect.gen(function* () {
  const documentRef = yield* Ref.make<TEIDocument | null>(null);

  return {
    load: (xml: string) => /* ... */,
    get: () => Ref.get(documentRef),
    update: (fn: (doc: TEIDocument) => TEIDocument) =>
      Ref.modify(documentRef, doc => [fn(doc), fn(doc)])
  };
});
```

**Why Effect?**
- Coordinated state access
- Thread safety (Ref is atomic)
- Composable state operations

### 3. Dependency Injection

**Services requiring dependencies:**

```typescript
// ✅ CORRECT: Use Effect Layer for services
const DocumentServiceLive = Layer.succeed(DocumentService, {
  loadDocument: (xml) => Effect.gen(function* () {
    const storage = yield* StorageService;  // Injected dependency
    const content = yield* storage.readFile(xml);
    return yield* loadDocument(content);
  })
});
```

**Why Effect?**
- Explicit dependencies
- Testable (swap with TestLayer)
- Type-safe error handling

### 4. External Services

**API calls, databases, external systems:**

```typescript
// ✅ CORRECT: Use Effect for external services
interface AIService {
  generateTags: (text: string) => Effect<Suggestion[], AIError>
}
```

**Why Effect?**
- Network latency
- Retry logic
- Error recovery
- Timeout handling

### 5. Concurrency Control

**Parallel/sequential execution:**

```typescript
// ✅ CORRECT: Use Effect for concurrency
const validateAll = (passages: Passage[]) =>
  Effect.all(
    passages.map(p => validatePassage(p)),
    { concurrency: 10 }  // Limit concurrent work
  );
```

**Why Effect?**
- Resource management
- Backpressure handling
- Error aggregation

---

## When to Use Pure Functions

Use pure functions for **domain logic** - data transformations, business rules, algorithms.

### 1. Data Transformations

**Converting one value to another:**

```typescript
// ✅ CORRECT: Pure function for transformation
export function generateHint(validation: ValidationResult, tagType: string): Hint {
  const firstError = validation.errors[0];
  if (firstError) {
    return generateHintFromError(firstError, tagType, validation.fixes);
  }

  if (validation.warnings.length > 0) {
    return createWarningHint(validation.warnings[0].message, validation.warnings[0].type);
  }

  return createValidHint(`Ready to apply <${tagType}> tag`);
}
```

**Why Pure Function?**
- Input → Output (no side effects)
- No I/O
- Fast (no runtime overhead)
- Easy to test (no mocking)

### 2. Business Logic

**Domain rules and validation:**

```typescript
// ✅ CORRECT: Pure function for business logic
export function applyEntityDelta(
  entities: readonly Entity[],
  delta: EntityDelta
): Result<Entity[]> {
  // Validate entity type
  const typeValidation = validateEntityType(entity, delta.entityType);
  if (isFailure(typeValidation)) {
    return typeValidation;
  }

  // Apply operation
  switch (delta.operation) {
    case 'create':
      return handleCreate(entities, delta.entity);
    case 'update':
      return handleUpdate(entities, delta.entity);
    case 'delete':
      return handleDelete(entities, delta.entity);
  }
}
```

**Why Pure Function?**
- Business rules (domain knowledge)
- No I/O
- Deterministic (same input = same output)
- Composable (can chain operations)

### 3. Algorithms and Heuristics

**Calculations and analysis:**

```typescript
// ✅ CORRECT: Pure function for algorithm
export function calculateSuggestionScore(
  suggestion: Suggestion,
  context: ValidationContext
): number {
  const baseScore = suggestion.confidence ?? 0.5;
  const contextBoost = context.isPassageStart ? 0.2 : 0;
  const typeBonus = suggestion.tagType === 'said' ? 0.1 : 0;

  return Math.min(1.0, baseScore + contextBoost + typeBonus);
}
```

**Why Pure Function?**
- Pure computation
- No external dependencies
- Performance-critical
- Easy to reason about

### 4. Collection Operations

**Filtering, mapping, reducing:**

```typescript
// ✅ CORRECT: Pure function for collection operations
export function getEntitiesByType(
  entities: readonly Entity[],
  entityType: EntityType
): Entity[] {
  switch (entityType) {
    case 'character':
      return entities.filter(isCharacter);
    case 'place':
      return entities.filter(isPlace);
    case 'organization':
      return entities.filter(isOrganization);
  }
}
```

**Why Pure Function?**
- Standard array operations
- No Effect overhead needed
- Excellent performance
- Clear intent

---

## Pattern: Cache Injection

The cache injection pattern demonstrates how to combine Effect services with pure domain logic.

### Problem

Domain functions need caching, but we don't want global mutable state.

### Solution

**Define cache protocol (pure interface):**

```typescript
// lib/protocols/cache.ts
export interface ICache<K, V> {
  get(key: K): V | null;
  set(key: K, value: V): void;
  clear(): void;
}
```

**Create cache factory (no global state):**

```typescript
// ✅ CORRECT: Factory function, not global singleton
export function createLRUCache<K extends CacheKey, V>(
  config: Partial<CacheConfig> = {}
): PassageValidationCache {
  return new PassageValidationCache(config);
}
```

**Use in domain logic (pure function):**

```typescript
// ✅ CORRECT: Cache as explicit parameter
export function validatePassage(
  passage: Passage,
  cache: ICache<CacheKey, ValidationResult[]> | null = null
): ValidationResult[] {
  const key = { passageId: passage.id, revision: passage.revision };

  // Check cache if provided
  if (cache) {
    const cached = cache.get(key);
    if (cached) return cached;
  }

  // Perform validation (pure logic)
  const results = performValidation(passage);

  // Update cache if provided
  if (cache) {
    cache.set(key, results);
  }

  return results;
}
```

**Integrate with React (UI layer):**

```typescript
// ✅ CORRECT: React manages cache lifecycle
export function useValidationPassage(passage: Passage | null) {
  const cache = useMemo(() => createLRUCache({ maxSize: 100, ttl: 300000 }), []);

  const results = useMemo(() => {
    if (!passage) return [];
    return validatePassage(passage, cache);  // Inject cache
  }, [passage, cache]);

  return results;
}
```

**Integrate with Effect (service layer):**

```typescript
// ✅ CORRECT: Effect manages cache lifecycle
const ValidationServiceLive = Layer.effect(ValidationService, Effect.gen(function* () {
  const cache = yield* Ref.make(createLRUCache());

  return {
    validatePassage: (passage: Passage) => Effect.gen(function* () {
      const cacheInstance = yield* Ref.get(cache);
      return validatePassage(passage, cacheInstance);  // Inject cache
    })
  };
}));
```

### Benefits

1. **No global state** - Cache lifecycle managed by caller
2. **Testable** - Inject mock cache in tests
3. **Flexible** - Swap cache strategies (LRU, TTL, in-memory, Redis)
4. **Explicit** - Cache dependency is visible in function signature
5. **Composable** - Works with React hooks, Effect services, or plain code

### Anti-Pattern to Avoid

```typescript
// ❌ WRONG: Global singleton cache
let globalCache: PassageValidationCache | null = null;

export function getGlobalCache(): PassageValidationCache {
  if (!globalCache) {
    globalCache = new PassageValidationCache();
  }
  return globalCache;  // Mutable place shared by all callers
}

// ❌ WRONG: Hidden cache dependency
export function validatePassage(passage: Passage): ValidationResult[] {
  const cache = getGlobalCache();  // Hidden global state!

  const key = { passageId: passage.id, revision: passage.revision };
  const cached = cache.get(key);
  if (cached) return cached;

  const results = performValidation(passage);
  cache.set(key, results);  // Side effect!
  return results;
}
```

**Why This is Wrong:**
- Global mutable state (shared place)
- Hidden dependency (function looks pure but isn't)
- Hard to test (must call `resetGlobalCache()`)
- Surprising behavior (cache mutations are invisible)

---

## Good vs Bad Patterns

### Pattern 1: Data Transformation

**✅ GOOD: Pure function**

```typescript
export function generateHint(validation: ValidationResult, tagType: string): Hint {
  const firstError = validation.errors[0];
  if (firstError) {
    return createInvalidHint(firstError.message, firstError.type);
  }
  return createValidHint(`Ready to apply <${tagType}> tag`);
}

// Usage
const hint = generateHint(validation, 'said');  // Simple, clear
```

**❌ BAD: Unnecessary Effect wrapper**

```typescript
export function generateHint(
  validation: ValidationResult,
  tagType: string
): Effect<Hint, never> {  // Effect for no reason!
  return Effect.succeed(
    validation.errors[0]
      ? createInvalidHint(validation.errors[0].message, validation.errors[0].type)
      : createValidHint(`Ready to apply <${tagType}> tag`)
  );
}

// Usage
const hint = yield* generateHint(validation, 'said');  // Verbose, slower
```

**Why BAD?**
- No I/O, no errors - Effect is unnecessary overhead
- Adds boilerplate (`yield*`, `Effect.succeed`)
- Slower (Effect runtime cost)
- Harder to understand

---

### Pattern 2: Entity Operations

**✅ GOOD: Pure function with Result type**

```typescript
export function applyEntityDelta(
  entities: readonly Entity[],
  delta: EntityDelta
): Result<Entity[]> {
  const idExists = entities.some(e => e.id === delta.entity.id);
  if (idExists) {
    return failure('DUPLICATE_ID', `Entity "${delta.entity.id}" already exists`, true);
  }

  return success([...entities, delta.entity]);
}

// Usage
const result = applyEntityDelta(entities, delta);
if (result.success) {
  console.log('Added:', result.data);
} else {
  console.error('Error:', result.error.message);
}
```

**❌ BAD: Throwing exceptions**

```typescript
export function applyEntityDelta(entities: Entity[], delta: EntityDelta): Entity[] {
  const idExists = entities.some(e => e.id === delta.entity.id);
  if (idExists) {
    throw new Error(`Entity "${delta.entity.id}" already exists`);  // Exception!
  }

  return [...entities, delta.entity];
}

// Usage
try {
  const updated = applyEntityDelta(entities, delta);
} catch (error) {  // Must wrap in try/catch
  console.error('Error:', error);
}
```

**Why BAD?**
- Exceptions break control flow
- Not composable
- Harder to reason about
- Violates "make failure explicit" principle

---

### Pattern 3: React Integration

**✅ GOOD: React state + pure functions**

```typescript
export function useEntities() {
  const [entities, setEntities] = useState<Entity[]>([]);

  const applyDelta = useCallback((delta: EntityDelta) => {
    const result = applyEntityDelta(entities, delta);  // Pure call
    if (result.success) {
      setEntities(result.data);  // React handles state
    }
  }, [entities]);

  return { entities, applyDelta };
}
```

**❌ BAD: Business logic in hook**

```typescript
export function useEntities() {
  const [entities, setEntities] = useState<Entity[]>([]);

  const applyDelta = useCallback((delta: EntityDelta) => {
    // Business logic mixed with React state management!
    const idExists = entities.some(e => e.id === delta.entity.id);
    if (idExists) {
      setError({ message: `Entity "${delta.entity.id}" already exists` });
      return;
    }

    setEntities([...entities, delta.entity]);
  }, [entities]);
}
```

**Why BAD?**
- Business logic entangled with React
- Can't test without React
- Can't reuse logic outside hook
- Violates separation of concerns

---

### Pattern 4: Cache Dependency

**✅ GOOD: Explicit cache parameter**

```typescript
export function validatePassage(
  passage: Passage,
  cache: ICache<CacheKey, ValidationResult[]> | null = null
): ValidationResult[] {
  if (cache) {
    const cached = cache.get(makeKey(passage));
    if (cached) return cached;
  }

  const results = performValidation(passage);
  if (cache) cache.set(makeKey(passage), results);

  return results;
}
```

**❌ BAD: Hidden global cache**

```typescript
let globalCache: PassageValidationCache | null = null;

export function validatePassage(passage: Passage): ValidationResult[] {
  const cache = getGlobalCache();  // Hidden dependency!
  const cached = cache.get(makeKey(passage));
  if (cached) return cached;

  const results = performValidation(passage);
  cache.set(makeKey(passage), results);  // Side effect!
  return results;
}
```

**Why BAD?**
- Hidden global state
- Surprising side effects
- Hard to test (must reset cache)
- Can't control cache lifecycle

---

### Pattern 5: Service Dependencies

**✅ GOOD: Effect services for I/O**

```typescript
const DocumentServiceLive = Layer.succeed(DocumentService, {
  loadDocument: (path: string) => Effect.gen(function* () {
    const storage = yield* StorageService;  // Injected dependency
    const content = yield* storage.readFile(path);  // I/O operation
    return yield* loadDocument(content);
  })
});
```

**❌ BAD: Pure functions with side effects**

```typescript
let documentCache: TEIDocument | null = null;

export function loadDocument(path: string): TEIDocument {
  if (documentCache?.path === path) {
    return documentCache;  // Hidden cache!
  }

  const xml = fs.readFileSync(path, 'utf-8');  // Side effect!
  const doc = parseDocument(xml);

  documentCache = doc;  // Global mutation!
  return doc;
}
```

**Why BAD?**
- File I/O in "pure" function
- Global mutable cache
- Not composable
- Can't test without file system

---

## Decision Matrix

Quick reference for choosing between Effect and pure functions.

| Scenario | Use Effect | Use Pure Functions |
|----------|------------|-------------------|
| **File I/O** | ✅ Yes (fs, network) | ❌ No |
| **Database/API** | ✅ Yes (external service) | ❌ No |
| **State management** | ✅ Yes (coordinated state) | ❌ No (use immutable values) |
| **Error handling** | ✅ Yes (retry, recovery) | ⚠️ Use Result<T> for domain errors |
| **Dependency injection** | ✅ Yes (services) | ❌ No (pass as parameter) |
| **Concurrency** | ✅ Yes (parallel/sequential) | ❌ No |
| **Data transformation** | ❌ No | ✅ Yes (input → output) |
| **Business logic** | ❌ No | ✅ Yes (domain rules) |
| **Algorithms** | ❌ No | ✅ Yes (calculations) |
| **Collection operations** | ❌ No | ✅ Yes (map, filter, reduce) |
| **React state updates** | ❌ No | ✅ Yes (setState) |
| **Cache injection** | ⚠️ Both | ✅ Yes (cache as parameter) |
| **Validation** | ⚠️ Both | ✅ Yes (pure logic) |

**Key Rules:**

1. **I/O = Effect** - If it touches the outside world (files, network, databases)
2. **Coordination = Effect** - If you need to manage concurrency, retries, or dependencies
3. **Transformation = Pure** - If it's input → output with no side effects
4. **Domain Logic = Pure** - Business rules, validation, algorithms
5. **Inject dependencies** - Pass caches/services as parameters, don't use globals

---

## Testing Guidelines

### Testing Pure Functions

Pure functions are trivially testable - no mocks, no setup, no runtime.

```typescript
describe('generateHint', () => {
  it('should return error hint for validation errors', () => {
    const validation: ValidationResult = {
      errors: [{ type: 'missing-required-attribute', attribute: 'who', message: 'Missing who' }],
      warnings: [],
      fixes: []
    };

    const hint = generateHint(validation, 'said');

    expect(hint.severity).toBe('invalid');
    expect(hint.message).toContain('Missing required attribute');
  });
});
```

### Testing Effect Services

Effect services use Layer for dependency injection.

```typescript
describe('DocumentService', () => {
  it('should load document from storage', () => {
    const TestStorage = Layer.succeed(StorageService, {
      readFile: (path) => Effect.succeed('<tei>...</tei>')
    });

    const program = Effect.gen(function* () {
      const doc = yield* DocumentService.loadDocument('/path/to/doc.xml');
      return doc.content;
    }).pipe(
      Effect.provide(DocumentServiceLive),
      Effect.provide(TestStorage)
    );

    const result = runSync(program);
    expect(result).toBe('<tei>...</tei>');
  });
});
```

### Testing with Cache Injection

Inject mock cache for deterministic tests.

```typescript
describe('validatePassage with cache', () => {
  it('should use cached results', () => {
    const mockCache: ICache<CacheKey, ValidationResult[]> = {
      get: jest.fn().mockReturnValue([cachedResult]),
      set: jest.fn(),
      clear: jest.fn()
    };

    const results = validatePassage(passage, mockCache);

    expect(mockCache.get).toHaveBeenCalledWith({ passageId: 'p1', revision: 1 });
    expect(results).toEqual([cachedResult]);
  });
});
```

---

## Related Documents

- [Architecture Decision: Effect vs Pure Functions](../analysis/architecture-decision-effect-vs-pure.md) - Full analysis of hybrid architecture options
- [Hickey Review: Validation Features](../analysis/hickey-review-validation-architecture.md) - Design principles and simplicity analysis
- [Effect Framework Documentation](https://effect.website/) - Official Effect docs (focus on "10-20 core functions" section)

---

## Summary

**Effect Services = Edges**
- I/O operations (file system, network, database)
- Coordinated state management
- Dependency injection
- Concurrency control
- Error recovery

**Pure Domain = Core**
- Data transformations
- Business logic
- Algorithms and heuristics
- Collection operations
- Validation rules

**Key Principle:** Use the simplest tool for the job. Effect for coordination, pure functions for logic. Don't add Effect overhead to simple transformations. Don't hide I/O in "pure" functions.

The cache injection pattern (`cache` as optional parameter) exemplifies this approach: pure domain logic with explicit, injectable dependencies.
