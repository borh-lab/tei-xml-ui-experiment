# Effect Migration Progress & Next Steps

**Document Version:** 2.0
**Date:** 2025-02-05
**Status:** Phase 1 Complete, Phase 2 In Progress
**Previous Document:** EFFECT-MIGRATION-STRATEGY.md

---

## Executive Summary

The Effect migration is approximately **30% complete**. Phase 1 (Foundation) is fully complete, and Phase 2 (Core Protocols) is partially complete. The next critical step is implementing the **React Bridge Layer** to make Effect services usable in React components.

**Current Blocker:** Effect services exist but are not accessible from React components because the bridge hooks/providers are incomplete.

**Recommended Next Action:** Complete the React Bridge Layer (2-3 days), then proceed with incremental component migration.

---

## Current State Assessment

### ✅ Phase 1: Foundation Setup (COMPLETE)

**Status:** 100% Complete

| Task | Status | Notes |
|------|--------|-------|
| Install Effect dependencies | ✅ Done | `effect`, `@effect/platform`, `@effect/schema` installed |
| Create parallel directory structure | ✅ Done | `lib/effect/` with protocols, services, layers |
| Setup Effect testing utilities | ✅ Done | Test helpers in `lib/effect/utils/test-helpers.ts` |
| Create feature flag system | ✅ Done | Comprehensive system in `lib/effect/utils/featureFlags.ts` |
| Install Effect Language Service | ✅ Done | Plugin added to tsconfig.json, TypeScript patched |
| Verify existing tests pass | ✅ Done | 88 test suites passing (758 tests) |

**Feature Flags Available:**
- `useEffectDocument` - Use Effect DocumentService
- `useEffectStorage` - Use Effect StorageService
- `useEffectValidation` - Use Effect ValidationService
- `useEffectAI` - Use Effect AIService
- `useEffectEditor` - Use Effect EditorLayout
- `useEffectExport` - Use Effect ExportButton
- `useEffectTagToolbar` - Use Effect TagToolbar
- `useEffectRenderedView` - Use Effect RenderedView

---

### ⚠️ Phase 2: Core Protocols (60% Complete)

**Status:** Protocols defined, implementations exist, **React bridge incomplete**

#### ✅ Completed Protocols

**1. DocumentService** (`lib/effect/protocols/Document.ts`, `lib/effect/services/DocumentService.ts`)

- Protocol: ✅ Complete with all operations
- Implementation: ✅ Complete with event sourcing
- Event Types: ✅ Defined (11 event types)
- Undo/Redo: ✅ Implemented via event replay
- History Management: ✅ `getHistoryState()`, `timeTravel()`
- Test Implementation: ✅ `TestDocumentService` exists
- Layer: ✅ `DocumentServiceLive` exported

**Capabilities:**
```typescript
interface DocumentService {
  loadDocument(xml: string): Effect<TEIDocument, DocumentParseError>
  getDocument(): Effect<TEIDocument, DocumentNotFoundError>
  addSaidTag(passageId, range, speaker): Effect<TEIDocument, InvalidOperationError>
  addQTag(passageId, range): Effect<TEIDocument, InvalidOperationError>
  addPersNameTag(passageId, range, ref): Effect<TEIDocument, InvalidOperationError>
  removeTag(tagId): Effect<TEIDocument, InvalidOperationError>
  addCharacter(character): Effect<TEIDocument, InvalidOperationError>
  updateCharacter(id, updates): Effect<TEIDocument, InvalidOperationError>
  removeCharacter(id): Effect<TEIDocument, InvalidOperationError>
  addRelationship(relation): Effect<TEIDocument, InvalidOperationError>
  removeRelationship(id): Effect<TEIDocument, InvalidOperationError>
  undo(targetRevision?): Effect<TEIDocument, InvalidOperationError>
  redo(fromRevision?): Effect<TEIDocument, InvalidOperationError>
  getHistoryState(): Effect<HistoryState, never>
  timeTravel(targetRevision): Effect<TEIDocument, InvalidOperationError>
}
```

**2. StorageService** (`lib/effect/protocols/Storage.ts`, `lib/effect/services/StorageService.ts`)

- Protocol: ✅ Complete with comprehensive error types
- Browser Implementation: ✅ Complete
- Test Implementation: ✅ Complete (in-memory)
- Layer: ✅ `BrowserStorageLive`, `TestStorageLive` exported

**Capabilities:**
```typescript
interface StorageService {
  get<T>(key: string): Effect<T, StorageKeyNotFoundError>
  set<T>(key, value, metadata?): Effect<void, StorageError>
  has(key: string): Effect<boolean, never>
  remove(key: string): Effect<void, StorageError>
  list(prefix?: string): Effect<string[], StorageError>
  clear(): Effect<void, StorageError>
}
```

**Error Types:**
- `StorageError` (base)
- `StorageKeyNotFoundError`
- `StorageQuotaExceededError` (with quota info)

#### ⚠️ Partially Complete Protocols

**3. ValidationService** (`lib/effect/protocols/Validation.ts`)

- Protocol: ✅ Defined
- Implementation: ⚠️ **BLOCKED** - Uses server-only SchemaLoader
- Note: Commented out in `lib/effect/index.ts` and `Main.ts`
- Blocker: Needs server action wrapper for Next.js app router

**Recommendation:** Defer until after React bridge is complete, or create client-side validation.

**4. AIService** (`lib/effect/protocols/AI.ts`)

- Protocol: ✅ Defined
- Implementation: ⚠️ **BLOCKED** - Provider implementation needs fixes
- Note: Commented out in `lib/effect/index.ts` and `Main.ts`
- Blocker: Ax provider integration issues

**Recommendation:** Defer until after React bridge is complete.

#### ❌ Missing: React Bridge Layer

**Critical Gap:** Effect services exist but are inaccessible to React components.

**Current State:**
```typescript
// lib/effect/react/hooks.ts - All throw errors!
export function useDocumentService() {
  throw new Error('useDocumentService is not yet fully implemented');
}
```

```tsx
// lib/effect/providers/DocumentProvider.tsx - All methods throw errors!
const loadDocument = useCallback(async (_xml: string) => {
  throw new Error('EffectDocumentProvider is not yet fully implemented');
}, []);
```

**Impact:** Cannot migrate components until bridge is complete.

---

### ❌ Phase 3: Component Migration (0% Complete)

**Status:** Not started - blocked by React bridge

**Created but Non-Functional:**
- `components/editor/ExportButton.effect.tsx` - Calls `useDocumentService()` which throws
- `components/editor/TagBreadcrumb.effect.tsx` - Likely same issue

**No Components Actually Using Effect Services Yet.**

---

### ❌ Phase 4: Full Effect Migration (0% Complete)

**Status:** Not started - requires Phases 2-3 completion

---

## Immediate Next Steps (Priority Order)

### 🚨 Step 1: Implement React Bridge Layer (CRITICAL - 2-3 days)

**Why:** Without this, no component can use Effect services.

**Tasks:**

1. **Create Effect Runtime for React** (4 hours)
   ```typescript
   // lib/effect/react/runtime.ts
   import { Runtime, Layer } from 'effect';
   import { MainLayer } from '@/lib/effect/layers/Main';

   export const effectRuntime = Runtime.defaultRuntime.pipe(
     Runtime.provideLayers(MainLayer)
   );
   ```

2. **Implement `useDocumentService` Hook** (4 hours)
   ```typescript
   // lib/effect/react/hooks.ts
   import { useState, useEffect, useCallback } from 'react';
   import { Effect, Runtime } from 'effect';
   import { DocumentService } from '@/lib/effect/protocols/Document';
   import type { TEIDocument } from '@/lib/tei/types';
   import { effectRuntime } from './runtime';

   export function useDocumentService() {
     const [document, setDocument] = useState<TEIDocument | null>(null);
     const [loading, setLoading] = useState(false);
     const [error, setError] = useState<Error | null>(null);

     const loadDocument = useCallback(async (xml: string) => {
       setLoading(true);
       setError(null);

       try {
         const program = Effect.gen(function* (_) {
           const service = yield* _(DocumentService);
           return yield* _(service.loadDocument(xml));
         });

         const doc = await Effect.runPromise(
           program,
           effectRuntime
         );
         setDocument(doc);
       } catch (err) {
         setError(err as Error);
       } finally {
         setLoading(false);
       }
     }, []);

     const addSaidTag = useCallback(async (
       passageId: string,
       range: { start: number; end: number },
       speaker: string
     ) => {
       const program = Effect.gen(function* (_) {
         const service = yield* _(DocumentService);
         return yield* _(service.addSaidTag(passageId, range, speaker));
       });

       const updated = await Effect.runPromise(program, effectRuntime);
       setDocument(updated);
     }, []);

     // ... implement other operations similarly

     return {
       document,
       loading,
       error,
       loadDocument,
       addSaidTag,
       // ... other methods
     };
   }
   ```

3. **Implement `useStorageService` Hook** (2 hours)
   - Similar pattern to `useDocumentService`
   - Wrap all StorageService operations

4. **Update `EffectDocumentProvider`** (2 hours)
   - Remove all `throw new Error()` stubs
   - Use implemented hooks internally
   - Provide proper context

5. **Add Error Boundaries** (2 hours)
   - Wrap Effect providers in error boundaries
   - Graceful fallback to React versions

**Success Criteria:**
- [ ] `useDocumentService()` returns working object
- [ ] `useStorageService()` returns working object
- [ ] `EffectDocumentProvider` provides valid context
- [ ] `ExportButton.effect.tsx` works without errors
- [ ] All TypeScript errors resolved

---

### Step 2: Fix Layer Dependencies (1 day)

**Issue:** MainLayer has warnings about layer merge dependencies.

**Current Warning:**
```
warning TS37: This layer provides CorpusDataSource which is required by another layer
in the same Layer.mergeAll call.
```

**Fix:**
```typescript
// lib/effect/layers/Main.ts
// BEFORE:
export const MainLayer = Layer.mergeAll(
  DocumentServiceLive,
  StorageServiceLive
);

// AFTER - Use Layer.provideMerge for dependencies:
export const MainLayer = DocumentServiceLive.pipe(
  Layer.provideMerge(StorageServiceLive)
);
```

---

### Step 3: Component Migration Incremental (Weeks 2-4)

After bridge is complete, migrate components in order of complexity:

**Week 2: Leaf Components**
1. Fix `ExportButton.effect.tsx` (already created, just needs to work)
2. Fix `TagBreadcrumb.effect.tsx` (already created)
3. Create `FileUpload.effect.tsx`
4. Test with feature flags

**Week 3: Simple Panel Components**
1. `EntityEditorPanel.effect.tsx`
2. `ValidationResultsDialog.effect.tsx`
3. Test with feature flags

**Week 4: Complex Components**
1. `TagToolbar.effect.tsx`
2. `RenderedView.effect.tsx`
3. `EditorLayout.effect.tsx` (THE BIG ONE - break into sub-components first)

**Pattern for Each Component:**
```tsx
// component.effect.tsx
import { useDocumentService } from '@/lib/effect/react/hooks';
import { isFeatureEnabled } from '@/lib/effect/utils/featureFlags';

export function EffectComponentName() {
  const { document, addTag } = useDocumentService();
  // Use Effect services
}

// component.tsx (unified export)
import { isFeatureEnabled } from '@/lib/effect/utils/featureFlags';
import { EffectComponentName } from './component.effect';
import { ReactComponentName } from './component.react';

export function ComponentName() {
  if (isFeatureEnabled('useEffectComponentName')) {
    return <EffectComponentName />;
  }
  return <ReactComponentName />;
}
```

---

### Step 4: Handle Blocked Protocols (Week 5)

**ValidationService:**
- Option A: Create client-side validation using RelaxNG schemas
- Option B: Create Next.js server action wrapper
- Option C: Defer until later, keep React validation

**AIService:**
- Fix Ax provider integration
- Test with OpenAI endpoint
- Ensure streaming works

---

### Step 5: Testing & Validation (Ongoing)

**Unit Tests:**
- [ ] Test each hook implementation
- [ ] Test error handling
- [ ] Test loading states

**Integration Tests:**
- [ ] Test React + Effect bridge
- [ ] Test feature flag switching
- [ ] Test runtime error recovery

**E2E Tests:**
- [ ] Run full E2E suite
- [ ] Verify no visual regressions
- [ ] Test performance

---

## Revised Timeline

### Immediate (This Week)
- **Mon-Tue:** Implement React bridge layer
- **Wed:** Fix layer dependencies, add error boundaries
- **Thu-Fri:** Test bridge, fix ExportButton/TagBreadcrumb

### Week 2
- Migrate leaf components (ExportButton, TagBreadcrumb, FileUpload)
- Add comprehensive tests

### Week 3
- Migrate panel components
- Begin breaking down EditorLayout

### Week 4
- Migrate complex components
- Complete EditorLayout migration

### Week 5
- Handle blocked protocols (Validation, AI)
- Full integration testing

### Week 6+
- Remove React Context (optional)
- Performance optimization
- Documentation updates

---

## Key Decisions Needed

### 1. ValidationService Approach

**Question:** How should we handle ValidationService which requires server-side SchemaLoader?

**Options:**
- A) Create Next.js server actions wrapper
- B) Implement client-side validation with RelaxNG
- C) Keep React validation for now, defer Effect migration

**Recommendation:** C for now, revisit in Week 5.

### 2. Component Migration Strategy

**Question:** Should we create parallel `.effect.tsx` files or migrate in-place?

**Current Approach:** Parallel files (`Component.effect.tsx`)

**Pros:**
- Easy to switch via feature flags
- Can compare implementations
- Safe rollback

**Cons:**
- Code duplication
- Maintenance burden

**Recommendation:** Keep parallel files until all components migrated, then delete React versions.

### 3. EditorLayout Complexity

**Question:** EditorLayout has 22 useState hooks - how to handle?

**Options:**
- A) Migrate all at once (high risk)
- B) Break into smaller components first, then migrate
- C) Extract state to services, then migrate UI

**Recommendation:** B - Break into smaller components first (week 3), then migrate (week 4).

---

## Risk Assessment

### High Risks

1. **React Bridge Complexity** (HIGH)
   - **Risk:** Bridge implementation more complex than anticipated
   - **Mitigation:** Start with simple hooks, add complexity gradually
   - **Contingency:** Keep React Context as fallback

2. **EditorLayout Migration** (HIGH)
   - **Risk:** 22 useState hooks will be difficult to migrate
   - **Mitigation:** Refactor into smaller components first
   - **Contingency:** Keep React version, migrate only new features

### Medium Risks

3. **Performance Regression** (MEDIUM)
   - **Risk:** Effect runtime overhead
   - **Mitigation:** Benchmark before/after, optimize hot paths
   - **Contingency:** Selective rollback of slow features

4. **Type Errors** (MEDIUM)
   - **Risk:** Current typecheck shows 103 useState instances
   - **Mitigation:** Incremental migration, continuous typecheck
   - **Contingency:** Use `@ts-expect-error` with tracking

### Low Risks

5. **Feature Flag Confusion** (LOW)
   - **Risk:** Developers forget which implementation is active
   - **Mitigation:** Clear console logging in dev mode
   - **Contingency:** Documentation updates

---

## Success Metrics

### Phase 2 Completion Criteria
- [ ] React bridge layer implemented
- [ ] `useDocumentService()` working
- [ ] `useStorageService()` working
- [ ] At least 3 components migrated and tested
- [ ] Feature flags allow switching between React/Effect
- [ ] All tests passing

### Phase 3 Completion Criteria
- [ ] All leaf components migrated
- [ ] All panel components migrated
- [ ] EditorLayout simplified and migrated
- [ ] No visual changes to app
- [ ] E2E tests passing

### Phase 4 Completion Criteria (Optional)
- [ ] React Context removed
- [ ] No useState in business logic
- [ ] Pure Effect architecture (except React view layer)
- [ ] Performance within 10% of baseline

---

## Developer Guidelines

### Adding New Components

**1. Create Effect Version:**
```tsx
// components/features/NewFeature.effect.tsx
import { useDocumentService } from '@/lib/effect/react/hooks';

export function EffectNewFeature() {
  const { document } = useDocumentService();
  // Implementation
}
```

**2. Create Feature Flag:**
```typescript
// lib/effect/utils/featureFlags.ts
export const FeatureFlags = {
  // ...
  useEffectNewFeature: false,
} as const;
```

**3. Create Unified Export:**
```tsx
// components/features/NewFeature.tsx
import { isFeatureEnabled } from '@/lib/effect/utils/featureFlags';
import { EffectNewFeature } from './NewFeature.effect';
import { ReactNewFeature } from './NewFeature.react';

export function NewFeature() {
  if (isFeatureEnabled('useEffectNewFeature')) {
    return <EffectNewFeature />;
  }
  return <ReactNewFeature />;
}
```

**4. Add Tests:**
```typescript
// components/features/__tests__/NewFeature.test.tsx
describe('NewFeature', () => {
  it('should work with React implementation', () => {
    // Test React version
  });

  it('should work with Effect implementation', () => {
    // Enable feature flag
    localStorage.setItem('feature-useEffectNewFeature', 'true');
    // Test Effect version
  });
});
```

---

## Open Questions

1. **Should we enable Effect components by default or keep them opt-in?**
   - Current: All flags default to `false`
   - Consider: Enable gradually as components mature

2. **How to handle state shared between components?**
   - Example: Panel open/close state
   - Option: Create PanelStateService

3. **Should we migrate hooks or components first?**
   - Current approach: Both together
   - Alternative: Migrate hooks first, then components use them

---

## Conclusion

The Effect migration is well-positioned with **Phase 1 complete** and **Phase 2 protocols implemented**. The critical next step is implementing the **React Bridge Layer** to make Effect services accessible to React components.

**Estimated time to unblock current work:** 2-3 days
**Estimated time to complete Phase 3:** 3-4 weeks
**Total time to full migration:** 6-8 weeks

**Recommended Action:** Begin React bridge implementation immediately.

---

**Next Review Date:** After React bridge completion
**Owner:** Development Team
**Status:** Active - Ready for Bridge Implementation
