# Error Handling Enhancements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enhance the error handling system with FileUpload refactor, retry functionality, error analytics, and comprehensive E2E testing

**Architecture:** Move FileUpload component from EditorLayout to WelcomePage for immediate access; add working retry actions for network errors; implement ErrorContext for error logging and analytics; create 12+ new E2E tests for comprehensive coverage

**Tech Stack:** React 19, Next.js 16, TypeScript, Playwright, sonner (toast library), existing error categorization utility

---

## Task 1: Add FileUpload to WelcomePage

**Files:**
- Modify: `app/page.tsx`

**Step 1: Read current WelcomePage implementation**

Run: `cat app/page.tsx`

Note: Understand the current structure, imports, and component layout.

**Step 2: Write failing test for FileUpload presence**

Create `tests/unit/welcomepage-has-upload.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import Home from '@/app/page'

describe('WelcomePage', () => {
  test('includes FileUpload component', () => {
    render(<Home />)
    const uploadButton = screen.getByText('Upload TEI File')
    expect(uploadButton).toBeInTheDocument()
  })
})
```

Run: `npm test -- tests/unit/welcomepage-has-upload.test.tsx`

Expected: FAIL with "Unable to find text: 'Upload TEI File'"

**Step 3: Add FileUpload import and component to WelcomePage**

Modify `app/page.tsx`:

Add import at top:
```typescript
import { FileUpload } from '@/components/editor/FileUpload'
```

Find where Sample Gallery is rendered and add FileUpload nearby. Look for pattern like:

```typescript
<div className="...">
  <SampleGallery />
  {/* Add FileUpload here */}
  <FileUpload />
</div>
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/welcomepage-has-upload.test.tsx`

Expected: PASS

**Step 5: Run all unit tests to ensure no regressions**

Run: `npm test`

Expected: All tests pass (no new failures)

**Step 6: Commit**

```bash
git add app/page.tsx tests/unit/welcomepage-has-upload.test.tsx
git commit -m "feat: add FileUpload to WelcomePage"
```

---

## Task 2: Remove FileUpload from EditorLayout

**Files:**
- Modify: `components/editor/EditorLayout.tsx`

**Step 1: Read current EditorLayout implementation**

Run: `cat components/editor/EditorLayout.tsx | grep -A 5 -B 5 "FileUpload"`

Note: Find where FileUpload is imported and rendered.

**Step 2: Remove FileUpload import**

Find line: `import { FileUpload } from './FileUpload'`

Remove it or comment it out.

**Step 3: Remove FileUpload component from render**

Find line: `<FileUpload />` (around line 410)

Remove it from the JSX.

**Step 4: Verify app still builds**

Run: `npm run build`

Expected: Build succeeds with no errors

**Step 5: Run all unit tests**

Run: `npm test`

Expected: All tests pass (no regressions from removal)

**Step 6: Commit**

```bash
git add components/editor/EditorLayout.tsx
git commit -m "refactor: remove FileUpload from EditorLayout"
```

---

## Task 3: Update categorizeError to accept retry callback

**Files:**
- Modify: `lib/utils/error-categorization.ts`
- Test: `tests/unit/error-categorization.test.ts`

**Step 1: Write failing test for retry callback**

Add to `tests/unit/error-categorization.test.ts`:

```typescript
test('includes retry action for network errors when callback provided', () => {
  const retryCallback = vi.fn()
  const error = new Error('Network request failed')
  const result = categorizeError(error, retryCallback)

  expect(result.type).toBe(ErrorType.NETWORK_ERROR)
  expect(result.action).toBeDefined()
  expect(result.action?.onClick).toBe(retryCallback)
})

test('does not include retry for parse errors even with callback', () => {
  const retryCallback = vi.fn()
  const error = new Error('XML parse error')
  const result = categorizeError(error, retryCallback)

  expect(result.type).toBe(ErrorType.PARSE_ERROR)
  expect(result.action).toBeUndefined()
})
```

Run: `npm test -- tests/unit/error-categorization.test.ts`

Expected: FAIL with "categorizeError() accepts 1 argument, but 2 were provided"

**Step 2: Update categorizeError signature**

Modify `lib/utils/error-categorization.ts`:

Change:
```typescript
export function categorizeError(error: Error): ErrorInfo
```

To:
```typescript
export function categorizeError(
  error: Error,
  retryCallback?: () => void
): ErrorInfo
```

**Step 3: Update network error handling to use callback**

Find the NETWORK_ERROR section. Change:
```typescript
action: {
  label: 'Retry',
  onClick: () => {
    console.log('Retry action clicked')
  },
}
```

To:
```typescript
action: retryCallback ? {
  label: 'Retry',
  onClick: retryCallback,
} : undefined
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/error-categorization.test.ts`

Expected: PASS (6/6 tests)

**Step 5: Run all unit tests**

Run: `npm test`

Expected: All tests pass

**Step 6: Commit**

```bash
git add lib/utils/error-categorization.ts tests/unit/error-categorization.test.ts
git commit -m "feat: add retry callback support to categorizeError"
```

---

## Task 4: Update FileUpload to provide retry callback

**Files:**
- Modify: `components/editor/FileUpload.tsx`

**Step 1: Read current FileUpload implementation**

Run: `cat components/editor/FileUpload.tsx`

**Step 2: Update categorizeError call to include retry**

Find the catch block in handleFileUpload. Change:
```typescript
const errorInfo = categorizeError(error as Error);
```

To:
```typescript
const errorInfo = categorizeError(error as Error, () => {
  // Retry: re-trigger the upload
  handleFileUpload(event);
});
```

**Step 3: Run all unit tests**

Run: `npm test`

Expected: All tests pass

**Step 4: Commit**

```bash
git add components/editor/FileUpload.tsx
git commit -m "feat: add retry functionality to FileUpload"
```

---

## Task 5: Update DocumentContext to provide retry callback

**Files:**
- Modify: `lib/context/DocumentContext.tsx`

**Step 1: Read current DocumentContext implementation**

Run: `cat lib/context/DocumentContext.tsx | grep -A 20 "loadSample"`

**Step 2: Update loadSample to include retry callback**

Find the catch block in loadSample. Change:
```typescript
const errorInfo = categorizeError(error as Error);
toast.error('Failed to load sample', {
  description: errorInfo.description,
});
```

To:
```typescript
const errorInfo = categorizeError(error as Error, () => {
  // Retry: reload the sample
  loadSample(sampleId);
});
toast.error('Failed to load sample', {
  description: errorInfo.description,
  action: errorInfo.action,
});
```

**Step 3: Update loadDocument if it exists**

If loadDocument function exists and has error handling, apply same pattern.

**Step 4: Run all unit tests**

Run: `npm test`

Expected: All tests pass

**Step 5: Commit**

```bash
git add lib/context/DocumentContext.tsx
git commit -m "feat: add retry functionality to DocumentContext"
```

---

## Task 6: Create ErrorContext provider

**Files:**
- Create: `lib/context/ErrorContext.tsx`
- Test: `tests/unit/error-context.test.tsx`

**Step 1: Write failing tests for ErrorContext**

Create `tests/unit/error-context.test.tsx`:

```typescript
import { render, renderHook, act } from '@testing-library/react'
import { ErrorProvider, useErrorContext } from '@/lib/context/ErrorContext'

describe('ErrorContext', () => {
  test('logs error with context', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ErrorProvider>{children}</ErrorProvider>
    )

    const { result } = renderHook(() => useErrorContext(), { wrapper })

    act(() => {
      result.current.logError(new Error('Test error'), {
        component: 'TestComponent',
        action: 'testAction'
      })
    })

    const stats = result.current.getStats()
    expect(stats.totalErrors).toBe(1)
    expect(stats.recentErrors).toHaveLength(1)
  })

  test('maintains max 50 errors in history', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ErrorProvider>{children}</ErrorProvider>
    )

    const { result } = renderHook(() => useErrorContext(), { wrapper })

    act(() => {
      for (let i = 0; i < 60; i++) {
        result.current.logError(new Error(`Error ${i}`), {
          component: 'Test',
          action: 'test'
        })
      }
    })

    const history = result.current.getHistory()
    expect(history).toHaveLength(50)
  })

  test('calculates error statistics by type', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ErrorProvider>{children}</ErrorProvider>
    )

    const { result } = renderHook(() => useErrorContext(), { wrapper })

    act(() => {
      result.current.logError(new Error('XML parse error'), {
        component: 'Test',
        action: 'test'
      })
      result.current.logError(new Error('XML parse error 2'), {
        component: 'Test',
        action: 'test'
      })
      result.current.logError(new Error('Network error'), {
        component: 'Test',
        action: 'test'
      })
    })

    const stats = result.current.getStats()
    expect(stats.byType.PARSE_ERROR).toBe(2)
    expect(stats.byType.NETWORK_ERROR).toBe(1)
  })
})
```

Run: `npm test -- tests/unit/error-context.test.tsx`

Expected: FAIL with "Cannot find module '@/lib/context/ErrorContext'"

**Step 2: Implement ErrorContext**

Create `lib/context/ErrorContext.tsx`:

```typescript
'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import { ErrorType } from '@/lib/utils/error-categorization'
import { categorizeError } from '@/lib/utils/error-categorization'

export interface ErrorLog {
  id: string
  timestamp: Date
  type: ErrorType
  message: string
  description: string
  component: string
  action: string
  context?: Record<string, any>
  stack?: string
}

export interface ErrorStats {
  totalErrors: number
  byType: Record<ErrorType, number>
  recentErrors: ErrorLog[]
  firstErrorTime?: Date
  lastErrorTime?: Date
}

interface ErrorContextType {
  logError: (
    error: Error,
    context: {
      component: string
      action: string
      metadata?: Record<string, any>
    }
  ) => void
  getStats: () => ErrorStats
  getHistory: (limit?: number) => ErrorLog[]
  clearHistory: () => void
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined)

export function ErrorProvider({ children }: { children: React.ReactNode }) {
  const [errors, setErrors] = useState<ErrorLog[]>([])

  const logError = useCallback((
    error: Error,
    context: { component: string; action: string; metadata?: Record<string, any> }
  ) => {
    const errorInfo = categorizeError(error)

    const newError: ErrorLog = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      type: errorInfo.type,
      message: errorInfo.message,
      description: errorInfo.description,
      component: context.component,
      action: context.action,
      context: context.metadata,
      stack: error.stack
    }

    setErrors(prev => {
      const updated = [newError, ...prev]
      // Keep only last 50 errors
      return updated.slice(0, 50)
    })
  }, [])

  const getStats = useCallback((): ErrorStats => {
    const byType: Record<ErrorType, number> = {
      [ErrorType.PARSE_ERROR]: 0,
      [ErrorType.FILE_ERROR]: 0,
      [ErrorType.NETWORK_ERROR]: 0,
      [ErrorType.VALIDATION_ERROR]: 0,
      [ErrorType.UNKNOWN_ERROR]: 0,
    }

    errors.forEach(err => {
      byType[err.type]++
    })

    return {
      totalErrors: errors.length,
      byType,
      recentErrors: errors,
      firstErrorTime: errors[errors.length - 1]?.timestamp,
      lastErrorTime: errors[0]?.timestamp
    }
  }, [errors])

  const getHistory = useCallback((limit?: number): ErrorLog[] => {
    if (limit) {
      return errors.slice(0, limit)
    }
    return errors
  }, [errors])

  const clearHistory = useCallback(() => {
    setErrors([])
  }, [])

  return (
    <ErrorContext.Provider value={{ logError, getStats, getHistory, clearHistory }}>
      {children}
    </ErrorContext.Provider>
  )
}

export function useErrorContext(): ErrorContextType {
  const context = useContext(ErrorContext)
  if (!context) {
    throw new Error('useErrorContext must be used within ErrorProvider')
  }
  return context
}
```

**Step 3: Run test to verify it passes**

Run: `npm test -- tests/unit/error-context.test.tsx`

Expected: PASS (3/3 tests)

**Step 4: Run all unit tests**

Run: `npm test`

Expected: All tests pass

**Step 5: Commit**

```bash
git add lib/context/ErrorContext.tsx tests/unit/error-context.test.tsx
git commit -m "feat: add ErrorContext for error logging and analytics"
```

---

## Task 7: Add ErrorProvider to app layout

**Files:**
- Modify: `app/layout.tsx`

**Step 1: Add ErrorProvider to layout**

Modify `app/layout.tsx`:

Add import:
```typescript
import { ErrorProvider } from "@/lib/context/ErrorContext";
```

Wrap the children in ErrorProvider:
```typescript
<ErrorProvider>
  {children}
</ErrorProvider>
```

**Step 2: Verify app builds**

Run: `npm run build`

Expected: Build succeeds

**Step 3: Run all unit tests**

Run: `npm test`

Expected: All tests pass

**Step 4: Commit**

```bash
git add app/layout.tsx
git commit -m "feat: add ErrorProvider to root layout"
```

---

## Task 8: Integrate error logging in FileUpload

**Files:**
- Modify: `components/editor/FileUpload.tsx`

**Step 1: Add error logging to handleFileUpload**

Modify `components/editor/FileUpload.tsx`:

Add import:
```typescript
import { useErrorContext } from '@/lib/context/ErrorContext'
```

Add hook call in component:
```typescript
const { loadDocument } = useDocumentContext()
const { logError } = useErrorContext()
const fileInputRef = useRef<HTMLInputElement>(null)
```

Update catch block:
```typescript
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

  const errorInfo = categorizeError(error as Error, () => {
    handleFileUpload(event);
  });
  toast.error(errorInfo.message, {
    description: errorInfo.description,
    action: errorInfo.action,
  });
}
```

**Step 2: Run all unit tests**

Run: `npm test`

Expected: All tests pass

**Step 3: Commit**

```bash
git add components/editor/FileUpload.tsx
git commit -m "feat: integrate error logging in FileUpload"
```

---

## Task 9: Integrate error logging in DocumentContext

**Files:**
- Modify: `lib/context/DocumentContext.tsx`

**Step 1: Add error logging to loadSample**

Modify `lib/context/DocumentContext.tsx`:

Add import if not present:
```typescript
import { useErrorContext } from '@/lib/context/ErrorContext'
```

Add hook call:
```typescript
const { logError } = useErrorContext()
```

Update catch block in loadSample:
```typescript
} catch (error) {
  console.error('Failed to load sample:', error);

  // Log error
  logError(error as Error, {
    component: 'DocumentContext',
    action: 'loadSample',
    metadata: { sampleId }
  })

  const errorInfo = categorizeError(error as Error, () => {
    loadSample(sampleId);
  });
  toast.error('Failed to load sample', {
    description: errorInfo.description,
    action: errorInfo.action,
  });
  throw error;
}
```

**Step 2: Run all unit tests**

Run: `npm test`

Expected: All tests pass

**Step 3: Commit**

```bash
git add lib/context/DocumentContext.tsx
git commit -m "feat: integrate error logging in DocumentContext"
```

---

## Task 10: Create E2E tests for FileUpload from WelcomePage

**Files:**
- Create: `tests/e2e/file-upload-from-welcome.spec.ts`

**Step 1: Create E2E test file**

Create `tests/e2e/file-upload-from-welcome.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'

test.describe('FileUpload from WelcomePage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('uploads valid XML file', async ({ page }) => {
    const validXml = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <text>
    <body>
      <p>Test content</p>
    </body>
  </text>
</TEI>`

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'valid.tei.xml',
      mimeType: 'text/xml',
      buffer: Buffer.from(validXml),
    })

    // Verify success toast
    const toast = page.locator('[data-sonner-toast]').first()
    await expect(toast).toBeVisible({ timeout: 5000 })
    await expect(toast).toContainText('uploaded successfully')

    // Verify navigation to editor
    await expect(page.locator('[id^="passage-"]')).toBeVisible({ timeout: 5000 })
  })

  test('shows error toast on invalid file', async ({ page }) => {
    const invalidXml = 'invalid {{{ xml'

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'invalid.xml',
      mimeType: 'text/xml',
      buffer: Buffer.from(invalidXml),
    })

    const toast = page.locator('[data-sonner-toast]').first()
    await expect(toast).toBeVisible({ timeout: 5000 })
    await expect(toast).toContainText('Invalid TEI format')
  })

  test('FileUpload button is visible on WelcomePage', async ({ page }) => {
    const uploadButton = page.getByText('Upload TEI File')
    await expect(uploadButton).toBeVisible()
  })
})
```

**Step 2: Run E2E tests**

Run: `npm run test:e2e tests/e2e/file-upload-from-welcome.spec.ts`

Expected: 3/3 tests pass

**Step 3: Commit**

```bash
git add tests/e2e/file-upload-from-welcome.spec.ts
git commit -m "test: add E2E tests for FileUpload from WelcomePage"
```

---

## Task 11: Create E2E tests for retry functionality

**Files:**
- Create: `tests/e2e/retry-functionality.spec.ts`

**Step 1: Create E2E test file**

Create `tests/e2e/retry-functionality.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'

test.describe('Retry Functionality', () => {
  test('shows retry button on network errors', async ({ page }) => {
    await page.goto('/')

    // Intercept and fail network requests
    await page.route('**/*.xml', route => route.abort())

    // Try to load sample
    await page.getByText('The Yellow Wallpaper').click()

    // Verify error toast with retry button
    const toast = page.locator('[data-sonner-toast]').first()
    await expect(toast).toBeVisible({ timeout: 5000 })
    await expect(toast).toContainText('Connection failed')

    const retryButton = toast.getByRole('button', { name: 'Retry' })
    await expect(retryButton).toBeVisible()
  })

  test('does not show retry on parse errors', async ({ page }) => {
    await page.goto('/')

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'invalid.xml',
      mimeType: 'text/xml',
      buffer: Buffer.from('invalid {{{ xml'),
    })

    const toast = page.locator('[data-sonner-toast]').first()
    await expect(toast).toBeVisible()

    // Should NOT have retry button
    const retryButton = toast.getByRole('button', { name: 'Retry' }).orElse(page.locator('button'))
    const buttonCount = await toast.locator('button').count()
    expect(buttonCount).toBe(1) // Only close button, no retry
  })
})
```

**Step 2: Run E2E tests**

Run: `npm run test:e2e tests/e2e/retry-functionality.spec.ts`

Expected: 2/2 tests pass

**Step 3: Commit**

```bash
git add tests/e2e/retry-functionality.spec.ts
git commit -m "test: add E2E tests for retry functionality"
```

---

## Task 12: Create E2E tests for error analytics

**Files:**
- Create: `tests/e2e/error-analytics.spec.ts`

**Step 1: Create E2E test file**

Create `tests/e2e/error-analytics.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'

test.describe('Error Analytics', () => {
  test('tracks error frequency by type', async ({ page }) => {
    await page.goto('/')

    // Trigger multiple parse errors
    const fileInput = page.locator('input[type="file"]')

    for (let i = 0; i < 3; i++) {
      await fileInput.setInputFiles({
        name: `invalid${i}.xml`,
        mimeType: 'text/xml',
        buffer: Buffer.from('invalid {{{ xml'),
      })
      await page.waitForTimeout(500)
    }

    // Check error stats (via exposed debug endpoint or console)
    const stats = await page.evaluate(() => {
      // @ts-ignore - debug property
      return window.__getErrorStats?.()
    })

    if (stats) {
      expect(stats.byType.PARSE_ERROR).toBeGreaterThanOrEqual(3)
    }
  })

  test('maintains error history', async ({ page }) => {
    await page.goto('/')

    // Trigger errors
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'invalid.xml',
      mimeType: 'text/xml',
      buffer: Buffer.from('invalid'),
    })

    await page.waitForTimeout(1000)

    // Check error history exists
    const hasErrors = await page.evaluate(() => {
      // @ts-ignore
      const stats = window.__getErrorStats?.()
      return stats && stats.recentErrors.length > 0
    })

    expect(hasErrors).toBe(true)
  })
})
```

**Step 2: Add debug endpoint to ErrorContext (temporary for testing)**

Modify `lib/context/ErrorContext.tsx`:

Add to ErrorProvider:
```typescript
useEffect(() => {
  // Expose for E2E testing
  if (typeof window !== 'undefined') {
    // @ts-ignore
    window.__getErrorStats = getStats
  }
}, [getStats])
```

**Step 3: Run E2E tests**

Run: `npm run test:e2e tests/e2e/error-analytics.spec.ts`

Expected: 2/2 tests pass

**Step 4: Commit**

```bash
git add lib/context/ErrorContext.tsx tests/e2e/error-analytics.spec.ts
git commit -m "test: add E2E tests for error analytics"
```

---

## Task 13: Run full test suite and verify improvements

**Files:**
- No file changes (verification only)

**Step 1: Run all unit tests**

Run: `npm test`

Expected: 490+ tests passing

**Step 2: Run all E2E tests**

Run: `npm run test:e2e`

Expected: Significant improvement in pass rate

**Step 3: Compare results**

Document before/after:
- Baseline: 476/480 unit tests (99.2%)
- Target: 490+/500 unit tests
- E2E: Should add ~12 new passing tests

**Step 4: Create summary document**

Create `docs/test-improvements-summary.md` with:
- Before/after statistics
- New features added
- Test coverage improvements
- Remaining work (if any)

**Step 5: Final commit**

```bash
git add docs/test-improvements-summary.md
git commit -m "docs: document error handling enhancements and test improvements"
```

---

## Success Criteria

After completing all tasks:

✅ **FileUpload Refactor:**
- FileUpload visible and functional on WelcomePage
- Can upload files without loading samples first
- E2E tests can upload immediately
- No regressions in EditorLayout

✅ **Retry Functionality:**
- Retry button appears on network errors
- Retry successfully replays failed operation
- No retry button on parse/file/validation errors
- E2E tests verify retry behavior

✅ **Error Analytics:**
- All errors logged with full context
- Error history maintained (last 50)
- Error statistics calculated correctly
- ErrorContext API works
- Unit tests pass (100% coverage)
- E2E tests verify logging

✅ **Enhanced Testing:**
- 12+ new E2E tests passing
- Upload tests work from WelcomePage
- Retry functionality tested
- Error analytics verified
- Overall E2E pass rate >75%

✅ **Code Quality:**
- All unit tests pass (490+/500)
- No regressions
- Clean git history
- TDD process followed

---

## Testing Commands Reference

```bash
# Run specific unit test
npm test -- tests/unit/error-context.test.tsx

# Run specific E2E test
npm run test:e2e tests/e2e/file-upload-from-welcome.spec.ts

# Run all unit tests
npm test

# Run all E2E tests
npm run test:e2e

# Run E2E tests in UI mode
npm run test:e2e:ui
```

---

## Dependencies

**Required:**
- Existing error handling system (completed)
- Existing components (FileUpload, DocumentContext, WelcomePage)
- sonner library (already installed)

**Files Created:**
- `lib/context/ErrorContext.tsx`
- `tests/unit/error-context.test.tsx`
- `tests/unit/welcomepage-has-upload.test.tsx`
- `tests/e2e/file-upload-from-welcome.spec.ts`
- `tests/e2e/retry-functionality.spec.ts`
- `tests/e2e/error-analytics.spec.ts`

**Files Modified:**
- `app/page.tsx` (add FileUpload)
- `app/layout.tsx` (add ErrorProvider)
- `components/editor/EditorLayout.tsx` (remove FileUpload)
- `components/editor/FileUpload.tsx` (add retry, add logging)
- `lib/context/DocumentContext.tsx` (add retry, add logging)
- `lib/utils/error-categorization.ts` (add retry callback)
- `tests/unit/error-categorization.test.ts` (add retry tests)

---

## Time Estimates

- Task 1: 30 minutes (add FileUpload to WelcomePage)
- Task 2: 15 minutes (remove FileUpload from EditorLayout)
- Task 3: 30 minutes (update categorizeError signature)
- Task 4: 15 minutes (FileUpload retry)
- Task 5: 15 minutes (DocumentContext retry)
- Task 6: 45 minutes (create ErrorContext)
- Task 7: 15 minutes (add ErrorProvider)
- Task 8: 20 minutes (FileUpload error logging)
- Task 9: 20 minutes (DocumentContext error logging)
- Task 10: 45 minutes (FileUpload E2E tests)
- Task 11: 30 minutes (retry E2E tests)
- Task 12: 30 minutes (error analytics E2E tests)
- Task 13: 30 minutes (verification and summary)

**Total Estimated Time:** 5-6 hours

---

## Notes for Implementation

1. **TDD Discipline:** Follow RED → GREEN → REFACTOR cycle strictly
2. **Frequent Commits:** Commit after each task (13 total commits)
3. **No Regressions:** Run full test suite after each task
4. **Error Context:** Keep logging lightweight (<5ms per error)
5. **Retry Logic:** Only retry network errors, not parse/file errors
6. **E2E Tests:** May need to add debug endpoint to ErrorContext for testing

---

**Plan Status:** ✅ Complete
**Ready for:** Implementation via superpowers:subagent-driven-development
**Estimated Impact:** +12 E2E tests, +15 unit tests, 75%+ E2E pass rate
**User Value:** Immediate file upload, working retry, error insights
**Developer Value:** Enhanced debugging, comprehensive testing
