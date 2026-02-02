# Error Handling Enhancements Design Document

**Date:** 2025-02-01
**Author:** Claude (brainstorming skill)
**Status:** Design Complete, Ready for Implementation

## Overview

Enhances the existing error handling UI system with four key improvements:
1. Refactor FileUpload to be always available (move to WelcomePage)
2. Implement functional retry actions for recoverable errors
3. Add error analytics/logging system
4. Create comprehensive E2E test coverage

**Current State:**
- FileUpload component only accessible after document loads
- Retry buttons exist but are non-functional (placeholder only)
- No error analytics or logging
- E2E tests blocked by FileUpload accessibility issue

**Target State:**
- FileUpload immediately accessible from WelcomePage
- Working retry functionality for network errors
- Complete error history and statistics
- 12+ new E2E tests, 75%+ overall pass rate

---

## Problem Statement

### Issue 1: FileUpload Accessibility
**Problem:** FileUpload component is rendered inside EditorLayout, which only appears when a document is already loaded. This creates a circular dependency:
- Need a document to see the upload button
- Need the upload button to load a document

**Impact:**
- Poor UX (users must navigate through samples first)
- E2E tests cannot upload files from initial state
- Confusing first-time user experience

### Issue 2: Non-Functional Retry Actions
**Problem:** Error categorization includes a "Retry" action button, but it only logs to console:
```typescript
action: {
  label: 'Retry',
  onClick: () => {
    console.log('Retry action clicked')  // Does nothing
  }
}
```

**Impact:**
- Users see retry button but it doesn't work
- Network errors (recoverable) can't be retried
- Broken promise in UI

### Issue 3: No Error Analytics
**Problem:** No systematic error tracking or logging. When errors occur:
- Only shown in toast, then forgotten
- No way to see error patterns
- No debugging insights for developers
- No understanding of user pain points

**Impact:**
- Hard to debug production issues
- Can't identify most common errors
- No data to prioritize improvements

### Issue 4: Limited E2E Test Coverage
**Problem:** E2E tests for error handling are blocked because FileUpload isn't accessible from the initial page state.

**Impact:**
- Can't test upload from WelcomePage
- Can't test retry functionality properly
- Low confidence in error handling

---

## Architecture Design

### Component 1: FileUpload Refactor

**Approach:** Move FileUpload from EditorLayout to WelcomePage

**Rationale:**
- Minimal code changes (FileUpload already works independently)
- Solves E2E testing limitation
- Better UX (primary action available immediately)
- No breaking changes

**Alternatives Considered:**
1. **Global floating upload button** - More UI changes, header modifications
2. **Duplication in both pages** - Code duplication, maintenance burden
3. **Conditional rendering** - Adds complexity, not needed

**Data Flow:**
```
User lands on app → WelcomePage renders
    ↓
WelcomePage displays:
  - Sample Gallery
  - FileUpload (NEW)
    ↓
User uploads file → FileUpload calls loadDocument()
    ↓
DocumentContext updates → App transitions to EditorLayout
```

**File Changes:**
- `app/page.tsx` (WelcomePage) - Add `<FileUpload />`
- `components/editor/EditorLayout.tsx` - Remove `<FileUpload />` and import
- `tests/e2e/file-upload-from-welcome.spec.ts` - New E2E tests

---

### Component 2: Retry Functionality

**Approach:** Configurable retry callbacks with selective retry strategy

**Design Principles:**
- Retry only recoverable errors (network, fetch)
- No retry for unrecoverable errors (parse, validation)
- Caller provides retry callback function
- Simple, no queue or complex state

**API Changes:**

**Before:**
```typescript
export function categorizeError(error: Error): ErrorInfo
```

**After:**
```typescript
export function categorizeError(
  error: Error,
  retryCallback?: () => void
): ErrorInfo
```

**Retry Strategy:**
| Error Type | Retry Action | Rationale |
|------------|--------------|-----------|
| NETWORK_ERROR | ✅ Retry | Connection might be restored |
| PARSE_ERROR | ❌ No retry | File is invalid, will fail again |
| FILE_ERROR | ❌ No retry | User should pick different file |
| VALIDATION_ERROR | ❌ No retry | Structural issue, retry won't help |
| UNKNOWN_ERROR | ❌ No retry | Unsafe to retry unknown error |

**Implementation - FileUpload:**
```typescript
const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    loadDocument(text);
    toast.success('Document uploaded successfully');
  } catch (error) {
    const errorInfo = categorizeError(error as Error, () => {
      // Retry: re-trigger the same upload
      handleFileUpload(event);
    });
    toast.error(errorInfo.message, {
      description: errorInfo.description,
      action: errorInfo.action,
    });
  }
};
```

**Implementation - DocumentContext:**
```typescript
const loadSample = async (sampleId: string) => {
  try {
    const content = await loadSampleContent(sampleId);
    setDocument(new TEIDocument(content));
  } catch (error) {
    console.error('Failed to load sample:', error);
    const errorInfo = categorizeError(error as Error, () => {
      // Retry: reload the sample
      loadSample(sampleId);
    });
    toast.error('Failed to load sample', {
      description: errorInfo.description,
      action: errorInfo.action,
    });
    throw error;
  }
};
```

**Rate Limiting (Optional Enhancement):**
- Prevent retry spam (debounce 1 second between retries)
- Track retry attempts (max 3 retries per error)
- Show retry count in toast: "Retry (2/3)"

---

### Component 3: Error Analytics & Logging

**Approach:** Lightweight ErrorContext with local logging

**Design Principles:**
- Privacy-first (errors stored locally, no external services)
- Non-blocking (doesn't affect error handling performance)
- Queryable (components can access error history)
- Debugging aid (detailed error context)

**Data Structures:**

```typescript
interface ErrorLog {
  id: string              // Unique identifier
  timestamp: Date         // When error occurred
  type: ErrorType         // Categorized error type
  message: string         // User-facing message
  description: string     // Detailed description
  component: string       // Where error occurred (e.g., "FileUpload")
  action: string          // What user was doing (e.g., "upload")
  context?: Record<string, any>  // Additional context
  stack?: string          // Error stack trace
}

interface ErrorStats {
  totalErrors: number
  byType: Record<ErrorType, number>
  recentErrors: ErrorLog[]  // Last 50 errors
  firstErrorTime?: Date
  lastErrorTime?: Date
}
```

**ErrorContext API:**

```typescript
interface ErrorContextType {
  // Log an error with context
  logError: (
    error: Error,
    context: {
      component: string
      action: string
      metadata?: Record<string, any>
    }
  ) => void

  // Get error statistics
  getStats: () => ErrorStats

  // Get error history
  getHistory: (limit?: number) => ErrorLog[]

  // Clear error history
  clearHistory: () => void

  // Export errors (for debugging/support)
  exportErrors: () => string
}

// Hook
export const useErrorContext = (): ErrorContextType
```

**Usage Example:**

```typescript
// In FileUpload.tsx
const { logError } = useErrorContext()

try {
  const text = await file.text();
  loadDocument(text);
} catch (error) {
  // Log error with context
  logError(error as Error, {
    component: 'FileUpload',
    action: 'upload',
    metadata: {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    }
  })

  // Show toast
  const errorInfo = categorizeError(error as Error);
  toast.error(errorInfo.message, {
    description: errorInfo.description,
  });
}
```

**Storage:**
- In-memory array (last 50 errors)
- Optional: Persist to localStorage for session
- Optional: Send to external service (Sentry, etc.) in production

**Integration Points:**
- `FileUpload.tsx` - Log file upload/read errors
- `DocumentContext.tsx` - Log sample load/parse errors
- Future: Any component can log errors

**Benefits:**
- Developers can see error patterns in console
- Users can export error log for support
- Data-driven improvements (know which errors are common)
- Debugging production issues

---

### Component 4: Enhanced E2E Testing

**Current State:** 5 E2E tests created but limited by FileUpload accessibility

**After Refactor:** 12+ new E2E tests possible

**New Test Files:**

**1. tests/e2e/file-upload-from-welcome.spec.ts** (4 tests)
```typescript
test.describe('FileUpload from WelcomePage', () => {
  test('uploads valid XML file')
  test('shows error toast on invalid file')
  test('navigates to editor after successful upload')
  test('maintains document state after upload')
})
```

**2. tests/e2e/retry-functionality.spec.ts** (3 tests)
```typescript
test.describe('Retry Functionality', () => {
  test('shows retry button on network errors')
  test('retries failed operation when clicked')
  test('does not show retry on parse errors')
})
```

**3. tests/e2e/error-analytics.spec.ts** (5 tests)
```typescript
test.describe('Error Analytics', () => {
  test('logs errors to ErrorContext')
  test('tracks error frequency by type')
  test('maintains error history (last 50)')
  test('provides error statistics')
  test('exports error log')
})
```

**Updated: tests/e2e/error-handling-ui.spec.ts**
- Remove workarounds for FileUpload limitation
- Simplify tests (can now upload immediately)

**Total New E2E Tests:** 12 tests

---

## Implementation Phases

### Phase 1: FileUpload Refactor (Priority: HIGH)

**Effort:** 1-2 hours
**Dependencies:** None
**Value:** Unblocks E2E testing, improves UX

**Tasks:**
1. Add FileUpload to WelcomePage (`app/page.tsx`)
2. Test uploads work from WelcomePage
3. Remove FileUpload from EditorLayout
4. Update E2E tests to use WelcomePage
5. Verify no regressions

**Files Changed:**
- `app/page.tsx` - Add `<FileUpload />`
- `components/editor/EditorLayout.tsx` - Remove `<FileUpload />`
- `tests/e2e/file-upload-from-welcome.spec.ts` - New file, 4 tests

**Success Criteria:**
- ✅ FileUpload visible on WelcomePage
- ✅ Can upload without loading sample first
- ✅ E2E tests can upload immediately
- ✅ No existing tests broken
- ✅ App transitions to editor after upload

---

### Phase 2: Retry Functionality (Priority: HIGH)

**Effort:** 1 hour
**Dependencies:** None
**Value:** Better UX for recoverable errors

**Tasks:**
1. Update `categorizeError()` signature to accept `retryCallback`
2. Modify FileUpload to provide retry callback
3. Modify DocumentContext to provide retry callback
4. Update error categorization to only add retry for network errors
5. Write E2E tests for retry functionality

**Files Changed:**
- `lib/utils/error-categorization.ts` - Add retryCallback parameter
- `components/editor/FileUpload.tsx` - Provide retry callback
- `lib/context/DocumentContext.tsx` - Provide retry callback
- `tests/e2e/retry-functionality.spec.ts` - New file, 3 tests

**Success Criteria:**
- ✅ Retry button appears on network errors
- ✅ Retry button replays failed operation
- ✅ No retry button on parse/file/validation errors
- ✅ E2E tests verify retry behavior
- ✅ No performance impact

---

### Phase 3: Error Logging System (Priority: MEDIUM)

**Effort:** 2-3 hours
**Dependencies:** None
**Value:** Debugging insights, error tracking

**Tasks:**
1. Create ErrorContext provider
2. Create error logger utility
3. Integrate error logging in FileUpload
4. Integrate error logging in DocumentContext
5. Write unit tests for ErrorContext
6. Write E2E tests for error analytics

**Files Created:**
- `lib/context/ErrorContext.tsx` - Error context provider
- `lib/utils/error-logger.ts` - Logging utility
- `tests/unit/error-context.test.tsx` - Unit tests

**Files Modified:**
- `app/layout.tsx` - Add ErrorContext provider
- `components/editor/FileUpload.tsx` - Log errors
- `lib/context/DocumentContext.tsx` - Log errors
- `tests/e2e/error-analytics.spec.ts` - New file, 5 tests

**Success Criteria:**
- ✅ All errors logged with context
- ✅ Error history maintained (last 50)
- ✅ Error statistics calculated correctly
- ✅ Errors queryable via useErrorContext hook
- ✅ No performance impact (<5ms per error)
- ✅ Unit tests pass (100% coverage)
- ✅ E2E tests verify logging

---

### Phase 4: Enhanced E2E Testing (Priority: MEDIUM)

**Effort:** 2 hours
**Dependencies:** Phase 1 (FileUpload refactor)
**Value:** Comprehensive coverage, confidence

**Tasks:**
1. Create file-upload-from-welcome.spec.ts
2. Create retry-functionality.spec.ts
3. Create error-analytics.spec.ts
4. Update error-handling-ui.spec.ts (remove workarounds)
5. Run full E2E test suite
6. Verify >75% pass rate

**Files Created:**
- `tests/e2e/file-upload-from-welcome.spec.ts` - 4 tests
- `tests/e2e/retry-functionality.spec.ts` - 3 tests
- `tests/e2e/error-analytics.spec.ts` - 5 tests

**Files Updated:**
- `tests/e2e/error-handling-ui.spec.ts` - Simplify tests

**Success Criteria:**
- ✅ 12+ new E2E tests passing
- ✅ Upload tests work from WelcomePage
- ✅ Retry tests verify functionality
- ✅ Error analytics tests verify logging
- ✅ Overall E2E pass rate >75%
- ✅ No flaky tests

---

## Testing Strategy

### Unit Tests

**ErrorContext:**
```typescript
describe('ErrorContext', () => {
  test('logs error with context')
  test('maintains error history (max 50)')
  test('calculates error statistics')
  test('clears error history')
  test('exports errors as JSON')
})
```

**categorizeError with retry:**
```typescript
describe('categorizeError with retry', () => {
  test('includes retry action for network errors')
  test('excludes retry for parse errors')
  test('excludes retry for file errors')
  test('executes retry callback when action clicked')
})
```

### Integration Tests

**FileUpload + ErrorContext:**
```typescript
test('FileUpload logs errors to ErrorContext', async () => {
  // Trigger error
  // Verify logged in ErrorContext
  // Verify toast shown
})
```

### E2E Tests

See Component 4 section for detailed test scenarios.

---

## Success Criteria

### Phase 1: FileUpload Refactor
- ✅ FileUpload accessible from WelcomePage
- ✅ Upload works without loading sample first
- ✅ E2E tests can upload from initial state
- ✅ No regressions (all existing tests pass)
- ✅ Smooth transition to editor after upload

### Phase 2: Retry Functionality
- ✅ Retry button appears on network errors only
- ✅ Retry button successfully replays failed operation
- ✅ No retry on unrecoverable errors (parse, file, validation)
- ✅ E2E tests verify retry behavior end-to-end
- ✅ No performance degradation

### Phase 3: Error Logging
- ✅ 100% of errors logged with full context
- ✅ Error history maintained (last 50 errors)
- ✅ Statistics calculated accurately
- ✅ ErrorContext API works correctly
- ✅ <5ms overhead per error logged
- ✅ Unit tests achieve 100% coverage
- ✅ E2E tests verify logging functionality

### Phase 4: Enhanced Testing
- ✅ 12+ new E2E tests passing
- ✅ Upload flow tested from WelcomePage
- ✅ Retry functionality fully tested
- ✅ Error analytics verified
- ✅ Overall E2E pass rate exceeds 75%
- ✅ No flaky or unreliable tests

### Overall Success Metrics
- ✅ Test suite improves from 65% to 75%+ pass rate
- ✅ User experience significantly improved
- ✅ Developer debugging enhanced
- ✅ Zero breaking changes to existing functionality
- ✅ All phases completed within 6-8 hours

---

## Risk Mitigation

### Risk 1: Breaking Existing Tests
**Mitigation:**
- Run full test suite after each phase
- Fix regressions immediately
- Maintain backward compatibility

### Risk 2: Performance Impact from Error Logging
**Mitigation:**
- Keep ErrorContext lightweight (in-memory only)
- Profile error logging overhead
- Add rate limiting if needed

### Risk 3: Retry Logic Creates Infinite Loops
**Mitigation:**
- Only retry on specific error types (network)
- Add retry limit (max 3 retries)
- Add debounce between retries (1 second)

### Risk 4: E2E Tests Become Flaky
**Mitigation:**
- Use proper waits and assertions
- Avoid arbitrary timeouts where possible
- Test in isolation (each test cleans up after itself)

---

## Future Enhancements (Out of Scope)

1. **External Error Tracking** - Send errors to Sentry, LogRocket, etc.
2. **Error Recovery Suggestions** - Provide specific guidance for each error type
3. **User Feedback Integration** - Let users report errors with context
4. **Error Dashboard** - Visual dashboard for error analytics
5. **Automatic Error Reporting** - Prompt users to send error logs

---

## Dependencies

**Required:**
- Existing error handling system (Tasks 1-8 completed)
- sonner library (already installed)
- Existing components (FileUpload, DocumentContext, WelcomePage)

**Optional:**
- External error tracking service (Phase 3+)
- Performance monitoring (Phase 3+)

---

## Timeline

**Total Estimated Time:** 6-8 hours

| Phase | Time | Priority | Dependencies |
|-------|------|----------|--------------|
| Phase 1: FileUpload Refactor | 1-2 hours | HIGH | None |
| Phase 2: Retry Functionality | 1 hour | HIGH | None |
| Phase 3: Error Logging | 2-3 hours | MEDIUM | None |
| Phase 4: Enhanced Testing | 2 hours | MEDIUM | Phase 1 |

**Recommended Order:**
1. Phase 1 (unblocks testing)
2. Phase 2 (improves UX immediately)
3. Phase 3 (adds debugging capability)
4. Phase 4 (validates all work)

---

## Conclusion

This design enhances the error handling system with four strategic improvements that:
- **Solve immediate limitations** (FileUpload accessibility)
- **Improve user experience** (functional retry actions)
- **Add developer value** (error analytics and logging)
- **Increase confidence** (comprehensive E2E testing)

All changes are backward compatible, follow YAGNI principles, and can be implemented incrementally with clear success criteria.

**Next Steps:**
1. Create detailed implementation plan using `superpowers:writing-plans`
2. Implement using `superpowers:subagent-driven-development`
3. Verify improvements with `superpowers:verification-before-completion`

---

**Design Status:** ✅ Complete
**Ready for:** Implementation planning
**Estimated Impact:** +10-15% test pass rate (65% → 75%+)
**User Value:** Significantly improved error UX
**Developer Value:** Enhanced debugging capabilities
