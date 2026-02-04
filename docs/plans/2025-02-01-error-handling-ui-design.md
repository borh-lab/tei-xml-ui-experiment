# Error Handling UI System - Design Document

**Date:** 2025-02-01
**Author:** Claude (brainstorming skill)
**Status:** Design Complete, Ready for Implementation

## Problem Statement

The TEI Dialogue Editor currently has no user-facing error feedback system. When errors occur (invalid files, parse failures, network issues), they are only logged to the console. Users receive no indication that something went wrong, leading to confusion and poor UX.

**Current State:**

- No toast/notification system exists
- Errors only logged to console (`console.error`)
- No user-facing error feedback
- Alert component exists but only for persistent inline alerts
- 8-12 e2e tests fail due to missing error UI

**Target State:**

- Clear, immediate error feedback via toast notifications
- Categorized error messages (parse, file, network, validation)
- Actionable error descriptions
- Auto-dismissing notifications
- Comprehensive error logging for debugging
- +12-15 e2e tests passing

## Architecture Approach

### Recommended Option: Toast System using Sonner

**Rationale:**

- Transient errors (file upload, parse errors) need auto-dismissing notifications
- Sonner is the modern standard for React toast systems
- Integrates seamlessly with shadcn/ui (already in use)
- Minimal code: `<Toaster />` provider + `toast()` calls
- Supports multiple toast types (error, warning, info, success)
- Built-in animations and accessibility
- Strong community adoption and maintenance

**Dependencies:**

```json
{
  "sonner": "^1.5.0"
}
```

### Alternatives Considered

**Option 2: Inline Alerts with existing Alert component**

- Pros: No new dependencies, familiar API
- Cons: Requires manual state management, no auto-dismiss, clutters UI

**Option 3: Hybrid approach**

- Pros: Maximum flexibility
- Cons: Inconsistent UX, higher complexity, harder to maintain

## Component Structure

```
app/
  layout.tsx              # Add <Toaster /> provider
lib/
  hooks/
    use-toast.ts          # Toast hook wrapper
  context/
    ErrorContext.tsx      # Centralized error handling (Phase 3)
components/
  ui/
    toaster.tsx           # Toast UI component (sonner wrapper)
    use-toast.ts          # Toast hook exports
```

## Error Categories

```typescript
enum ErrorType {
  PARSE_ERROR = 'parse_error',
  FILE_ERROR = 'file_error',
  NETWORK_ERROR = 'network_error',
  VALIDATION_ERROR = 'validation_error',
  UNKNOWN_ERROR = 'unknown_error',
}

interface ErrorInfo {
  type: ErrorType;
  message: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}
```

## API Design

### Basic Usage

```typescript
import { toast } from '@/components/ui/use-toast';

// Simple error
toast.error('Failed to load document');

// Success
toast.success('Document uploaded successfully');

// Warning
toast.warning('Large file may take longer to process');

// Info
toast.info('Loading document...');
```

### Detailed Error with Action

```typescript
toast.error('Parse Error', {
  description: 'Invalid XML format on line 42. Missing closing tag.</p>',
  action: {
    label: 'View Details',
    onClick: () => showErrorDialog(error),
  },
});
```

### Advanced Configuration

```typescript
toast.error('Error message', {
  description: 'Additional details',
  duration: 10000, // Custom duration (default: 5000)
  action: {
    label: 'Retry',
    onClick: () => retryOperation(),
  },
  // sonner-specific options
  position: 'top-right',
  dismissible: true,
});
```

## Data Flow

```
User Action (e.g., upload file)
    ↓
Component Event Handler (FileUpload.tsx)
    ↓
try {
  loadDocument(fileContent)
    ↓
  TEIDocument.parse()
    ↓
  DocumentContext.setDocument()
} catch (error) {
    ↓
  ErrorCategorization (determine error type)
    ↓
  toast.error() → Toaster UI → User sees notification
}
```

### Error Context Flow (Phase 3 Enhancement)

```
Error occurs → ErrorContext.logError(error, context)
    ↓
- Categorize error
- Log to console (with structured data)
- Show toast to user
- (Future) Send to analytics/error tracking
```

## Error Handling Strategy

### 1. Immediate User Feedback

- Show toast within 100ms of error detection
- Include error type icon (error, warning, info)
- Clear, human-readable message
- Actionable description when possible
- Auto-dismiss after configurable duration (default: 5s)

### 2. Error Categorization Logic

```typescript
function categorizeError(error: Error): ErrorInfo {
  const message = error.message.toLowerCase();

  if (message.includes('xml') || message.includes('parse')) {
    return {
      type: ErrorType.PARSE_ERROR,
      message: 'Invalid TEI format',
      description: 'Unable to parse the XML document. Please check the file format.',
    };
  }

  if (message.includes('network') || message.includes('fetch')) {
    return {
      type: ErrorType.NETWORK_ERROR,
      message: 'Connection failed',
      description: 'Please check your internet connection and try again.',
      action: {
        label: 'Retry',
        onClick: () => retryLastAction(),
      },
    };
  }

  if (message.includes('file') || message.includes('read')) {
    return {
      type: ErrorType.FILE_ERROR,
      message: 'Failed to read file',
      description: 'The file could not be read. Please check it is a valid TEI XML file.',
    };
  }

  // Default fallback
  return {
    type: ErrorType.UNKNOWN_ERROR,
    message: 'An error occurred',
    description: error.message || 'Please try again.',
  };
}
```

### 3. Error Message Catalog

| Error Type       | Message             | Description                                    | Action    |
| ---------------- | ------------------- | ---------------------------------------------- | --------- |
| PARSE_ERROR      | Invalid TEI format  | Unable to parse document. Check XML structure. | None      |
| FILE_ERROR       | Failed to read file | File could not be read. Check file format.     | None      |
| NETWORK_ERROR    | Connection failed   | Check internet connection.                     | Retry     |
| VALIDATION_ERROR | Invalid document    | Missing required TEI tags.                     | View Docs |
| UNKNOWN_ERROR    | An error occurred   | Please try again.                              | Retry     |

## Implementation Phases

### Phase 1: Core Toast System (Priority: HIGH)

**Tasks:**

1. Install sonner dependency
2. Add `<Toaster />` to `app/layout.tsx`
3. Create `components/ui/toaster.tsx` (sonner wrapper)
4. Create `components/ui/use-toast.ts` (hook)
5. Write basic unit tests for toast
6. Test toast appears on manual trigger

**Success Criteria:**

- ✅ Toast appears on `toast.error()`
- ✅ Toast auto-dismisses after 5 seconds
- ✅ Multiple toasts stack correctly
- ✅ Toast is accessible (ARIA attributes)

### Phase 2: Error Integration (Priority: HIGH)

**Tasks:**

1. Update `FileUpload.tsx` error handling
   - Wrap `file.text()` in try-catch
   - Wrap `loadDocument()` in try-catch
   - Show toast on errors
2. Update `DocumentContext.tsx` error handling
   - Wrap `loadSample()` catch block
   - Wrap `loadDocument()` catch block
   - Show toast on errors
3. Add error categorization logic
4. Test all error paths

**Code Changes - FileUpload.tsx:**

```typescript
const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    loadDocument(text);
    toast.success('Document uploaded successfully');
  } catch (error) {
    const errorInfo = categorizeError(error as Error);
    toast.error(errorInfo.message, {
      description: errorInfo.description,
    });
  }
};
```

**Code Changes - DocumentContext.tsx:**

```typescript
const loadSample = async (sampleId: string) => {
  try {
    const content = await loadSampleContent(sampleId);
    setDocument(new TEIDocument(content));
  } catch (error) {
    console.error('Failed to load sample:', error);
    const errorInfo = categorizeError(error as Error);
    toast.error(errorInfo.message, {
      description: errorInfo.description,
    });
    throw error;
  }
};
```

**Success Criteria:**

- ✅ Invalid file upload shows error toast
- ✅ Parse errors show categorized toast
- ✅ Network errors show retry action
- ✅ All console errors have UI feedback

### Phase 3: Enhanced Error Context (Priority: MEDIUM)

**Tasks:**

1. Create `ErrorContext.tsx`
2. Add error logging function
3. Add error history tracking (last 10 errors)
4. Add "View Details" functionality
5. Create error details dialog component
6. Test error context integration

**ErrorContext API:**

```typescript
const { logError, getErrorHistory, clearHistory } = useErrorContext();

// Usage
logError(error, {
  component: 'FileUpload',
  action: 'upload',
  fileId: file.name,
});
```

**Success Criteria:**

- ✅ All errors logged with context
- ✅ Error history accessible
- ✅ Error details dialog shows full stack
- ✅ Clear history function works

### Phase 4: Test Coverage (Priority: HIGH)

**Unit Tests:**

```typescript
// components/ui/use-toast.test.ts
describe('toast', () => {
  test('shows error toast');
  test('shows success toast');
  test('shows warning toast');
  test('shows info toast');
  test('auto-dismisses after timeout');
  test('displays custom action button');
  test('multiple toasts stack correctly');
});

// lib/utils/error-categorization.test.ts
describe('categorizeError', () => {
  test('categorizes XML parse errors');
  test('categorizes network errors');
  test('categorizes file read errors');
  test('returns unknown for unrecognized errors');
});
```

**E2E Tests:**

```typescript
// tests/e2e/error-handling-ui.spec.ts
test.describe('Error Handling UI', () => {
  test('shows toast on invalid file upload', async ({ page }) => {
    await page.goto('/');
    await uploadFile('invalid.xml');
    await expect(page.locator('[data-sonner-toast]')).toBeVisible();
    await expect(page.locator('text=Invalid TEI format')).toBeVisible();
  });

  test('toast auto-dismisses after 5 seconds', async ({ page }) => {
    await page.goto('/');
    await triggerError();
    const toast = page.locator('[data-sonner-toast]');
    await expect(toast).toBeVisible();
    await page.waitForTimeout(6000);
    await expect(toast).toBeHidden();
  });

  test('shows success toast on valid upload', async ({ page }) => {
    await page.goto('/');
    await uploadFile('valid.tei.xml');
    await expect(page.locator('text=uploaded successfully')).toBeVisible();
  });

  test('retry action works on network errors', async ({ page }) => {
    await page.goto('/');
    await triggerNetworkError();
    await page.click('text=Retry');
    // Verify retry happened
  });
});
```

**Success Criteria:**

- ✅ Unit tests cover all error categorization
- ✅ Unit tests cover toast hook
- ✅ E2E tests verify toast visibility
- ✅ E2E tests verify auto-dismiss
- ✅ E2E tests verify retry actions
- ✅ No regressions in existing tests

## Integration Points

### FileUpload.tsx

**Current:**

```typescript
const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  const text = await file.text();
  loadDocument(text);
};
```

**After:**

```typescript
import { toast } from '@/components/ui/use-toast';

const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    loadDocument(text);
    toast.success('Document uploaded successfully');
  } catch (error) {
    toast.error('Failed to upload file', {
      description: (error as Error).message,
    });
  }
};
```

### DocumentContext.tsx

**Current:**

```typescript
const loadSample = async (sampleId: string) => {
  try {
    const content = await loadSampleContent(sampleId);
    setDocument(new TEIDocument(content));
  } catch (error) {
    console.error('Failed to load sample:', error);
    throw error;
  }
};
```

**After:**

```typescript
import { toast } from '@/components/ui/use-toast';

const loadSample = async (sampleId: string) => {
  try {
    const content = await loadSampleContent(sampleId);
    setDocument(new TEIDocument(content));
  } catch (error) {
    console.error('Failed to load sample:', error);
    toast.error('Failed to load sample', {
      description: 'Could not load the sample document. Please try again.',
    });
    throw error;
  }
};
```

## Estimated Test Impact

### Tests Expected to Pass After Implementation

**Error Scenarios Suite (38 tests):**

- Currently: 23/38 passing (60.5%)
- Expected: 31/38 passing (81.6%)
- **Improvement: +8 tests**

**Reason:** Tests that check for error state will now find toast elements in the DOM, providing the expected error feedback.

**Document Upload Suite (31 tests):**

- Currently: 6/31 passing (19.4%)
- Expected: 11/31 passing (35.5%)
- **Improvement: +5 tests**

**Reason:** File upload error scenarios now show visible toasts instead of silent failures.

**Total Expected Improvement: +12-15 tests**

### Current Progress

- **Starting:** 72/234 (30.8%)
- **After previous fixes:** 143/234 (61.1%)
- **After TEI parser fix:** 152/234 (65.0%)
- **After error handling UI:** 164-167/234 (70.1-71.4%)
- **Target:** 211/234 (90.0%)
- **Remaining:** 44-47 tests

## Success Criteria

### Functional Requirements

- ✅ All error paths show user-facing toasts
- ✅ Toasts auto-dismiss appropriately
- ✅ Error messages are clear and actionable
- ✅ No console errors without UI feedback
- ✅ Toast notifications are accessible (keyboard navigation, ARIA)
- ✅ Multiple toasts stack correctly
- ✅ Success/error/warning/info variants work

### Quality Requirements

- ✅ Unit tests pass (100% coverage of error handling)
- ✅ E2E tests verify toast visibility for error scenarios
- ✅ No regressions in existing functionality (473/473 unit tests still pass)
- ✅ Performance: toast rendering does not block main thread
- ✅ Accessibility: WCAG 2.1 AA compliant

### Integration Requirements

- ✅ Works with existing DocumentContext
- ✅ Works with FileUpload component
- ✅ Integrates with TEIDocument errors
- ✅ Supports future error tracking enhancements

## Risk Mitigation

### Risk: Sonner Dependency Issues

**Mitigation:** Sonner is stable, widely adopted, minimal dependencies. Alternative: implement custom toast system using existing Alert component.

### Risk: Breaking Changes in Future Sonner Versions

**Mitigation:** Wrap sonner in our own `use-toast.ts` hook. Internal implementation changes won't affect app code.

### Risk: Toast Spam (Many Errors at Once)

**Mitigation:** Sonner automatically stacks toasts. Can add rate limiting if needed (max 3 toasts in 10 seconds).

### Risk: Performance Impact

**Mitigation:** Toasts are lightweight React components. Only render when shown. Auto-dismiss cleans up DOM.

## Future Enhancements

### Post-MVP Features

1. **Error Analytics Dashboard**
   - Track most common errors
   - Monitor error rates over time
   - Identify problematic user flows

2. **Error Recovery Actions**
   - One-click retry for network failures
   - Auto-fix for common XML issues
   - Suggest fixes based on error type

3. **User Guidance**
   - Link to documentation for parse errors
   - Show example of valid TEI format
   - Interactive tutorials for first-time users

4. **Keyboard Shortcuts**
   - Cmd+K to dismiss all toasts
   - Cmd+Shift+K to view error history
   - Cmd+Option+K to clear error history

## Conclusion

This design provides a comprehensive, user-friendly error handling system using the industry-standard sonner toast library. The implementation is phased to deliver value early (Phase 1-2) while allowing for future enhancements (Phase 3+).

**Expected Outcome:**

- +12-15 e2e tests passing
- Improved user experience with clear error feedback
- Better debugging with centralized error logging
- Foundation for advanced error tracking

**Next Steps:**

1. Get user approval for design
2. Create implementation plan using `superpowers:writing-plans`
3. Implement using `superpowers:test-driven-development`
4. Verify test improvements
5. Document results

---

**Design Status:** ✅ Complete
**Ready for:** Implementation planning
**Estimated Implementation Time:** 2-3 hours (all phases)
**Estimated Test Impact:** +12-15 tests passing
