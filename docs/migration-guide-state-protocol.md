# State Protocol Migration Guide

This guide shows how to migrate components from V1 (Ref-based state) to V2 (state protocol architecture).

## Why Migrate?

**V1 Problems:**
- Braided state (7 mutable variables) = brittle tests
- Hidden Ref = hard to inspect state
- Complex integration tests (5+ service mocks)

**V2 Benefits:**
- Single state value = robust tests
- Explicit state = easy to inspect
- Simple tests (inject state, no mocks)

## Migration Pattern

### Before (V1)

```tsx
import { useDocumentService } from '@/lib/effect/react/hooks';

export function MyComponent() {
  const {
    document,
    loading,
    error,
    validationResults,
    addSaidTag
  } = useDocumentService();

  // 4 state variables, tightly coupled
  const handleAddTag = async () => {
    await addSaidTag(passageId, range, speaker);
    // What's the new state? Hard to predict!
  };
}
```

### After (V2)

```tsx
import { useDocumentV2 } from '@/hooks/useDocumentV2';

export function MyComponentV2() {
  const { state, operations } = useDocumentV2();

  // Single state value, clear transitions
  const handleAddTag = async () => {
    await operations.addSaidTag(passageId, range, speaker);
    // New state is result: state → operations.addSaidTag() → newState
  };
}
```

## Step-by-Step Migration

### 1. Replace Hook Import

```diff
- import { useDocumentService } from '@/lib/effect/react/hooks';
+ import { useDocumentV2 } from '@/hooks/useDocumentV2';
```

### 2. Replace Hook Call

```diff
- const { document, loading, error, validationResults, addSaidTag } = useDocumentService();
+ const { state, operations } = useDocumentV2();
```

### 3. Update State Access

```diff
- if (loading) return <Spinner />;
- if (error) return <Error message={error.message} />;
- if (!document) return <Empty />;
+ if (state.status === 'loading') return <Spinner />;
+ if (state.error) return <Error message={state.error.message} />;
+ if (!state.document) return <Empty />;
```

### 4. Update Operation Calls

```diff
- await addSaidTag(passageId, range, speaker);
+ await operations.addSaidTag(passageId, range, speaker);
```

### 5. Update Validation Access

```diff
- if (validationResults?.errors.length > 0) {
+ if (state.validation?.results.errors.length > 0) {
```

## Testing Migration

### Before (Brittle)

```tsx
// Must mock 5+ services
jest.mock('@/lib/effect/protocols/Document');
jest.mock('@/lib/effect/protocols/Validation');
jest.mock('@/lib/effect/protocols/Storage');
// ... 50 lines of mocks
```

### After (Simple)

```tsx
// Just inject state
const state = {
  ...initialState(),
  document: mockDocument,
};

render(<MyComponentV2 initialState={state} />);
```

## Checklist

- [ ] Replace `useDocumentService` with `useDocumentV2`
- [ ] Replace `document` with `state.document`
- [ ] Replace `loading` with `state.status === 'loading'`
- [ ] Replace `error` with `state.error`
- [ ] Replace `validationResults` with `state.validation?.results`
- [ ] Replace operation calls with `operations.*`
- [ ] Update tests to inject state instead of mocking services
- [ ] Run tests to verify behavior unchanged
- [ ] Delete V1 component (after all migrated)

## Examples

See `components/document/DocumentViewV2.tsx` for a complete migration example.

## Questions?

Refer to `docs/plans/2025-02-06-state-protocol-redesign.md` for design rationale.
