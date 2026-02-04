# Error Handling UI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a toast notification system for user-facing error feedback using the sonner library

**Architecture:** Install sonner library, add Toaster provider to app layout, create toast hook wrapper, integrate error handling in FileUpload and DocumentContext components with categorized error messages

**Tech Stack:** React 19, Next.js 16, sonner (toast library), TypeScript, shadcn/ui (existing)

---

## Task 1: Install sonner dependency

**Files:**

- Modify: `package.json` (via npm install)

**Step 1: Install sonner package**

Run: `npm install sonner`

Expected output:

```
added 1 package, and audited 351 packages in 3s
```

**Step 2: Verify installation**

Run: `grep sonner package.json`

Expected: `"sonner": "^1.5.0"` (or similar version)

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: install sonner for toast notifications"
```

---

## Task 2: Create Toaster UI component

**Files:**

- Create: `components/ui/toaster.tsx`
- Create: `components/ui/use-toast.ts`

**Step 1: Write the failing test**

Create `tests/unit/toaster.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { Toaster } from '@/components/ui/toaster'

describe('Toaster', () => {
  test('renders without crashing', () => {
    render(<Toaster />)
    // Toaster renders a div with role="region" and aria-label for notifications
    const region = screen.getByRole('region', { name: /notifications/i })
    expect(region).toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/toaster.test.tsx`

Expected: FAIL with "Cannot find module '@/components/ui/toaster'"

**Step 3: Create Toaster component**

Create `components/ui/toaster.tsx`:

```typescript
'use client'

import { Toaster as SonnerToaster } from 'sonner'

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      expand={false}
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: 'toast',
          description: 'toast-description',
          actionButton: 'toast-action-button',
          cancelButton: 'toast-cancel-button',
          closeButton: 'toast-close-button',
        },
      }}
    />
  )
}
```

**Step 4: Create use-toast hook**

Create `components/ui/use-toast.ts`:

```typescript
import { toast as sonnerToast } from 'sonner';

type ToastProps = {
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
};

export const toast = {
  error: (message: string, props?: ToastProps) => {
    return sonnerToast.error(message, {
      description: props?.description,
      action: props?.action,
    });
  },

  success: (message: string, props?: ToastProps) => {
    return sonnerToast.success(message, {
      description: props?.description,
      action: props?.action,
    });
  },

  warning: (message: string, props?: ToastProps) => {
    return sonnerToast.warning(message, {
      description: props?.description,
      action: props?.action,
    });
  },

  info: (message: string, props?: ToastProps) => {
    return sonnerToast.info(message, {
      description: props?.description,
      action: props?.action,
    });
  },

  dismiss: () => {
    sonnerToast.dismiss();
  },
};
```

**Step 5: Run test to verify it passes**

Run: `npm test -- tests/unit/toaster.test.tsx`

Expected: PASS

**Step 6: Commit**

```bash
git add components/ui/toaster.tsx components/ui/use-toast.ts tests/unit/toaster.test.tsx
git commit -m "feat: add Toaster component and toast hook"
```

---

## Task 3: Add Toaster to app layout

**Files:**

- Modify: `app/layout.tsx`

**Step 1: Write test for Toaster presence**

Create `tests/unit/layout.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import RootLayout from '@/app/layout'

describe('RootLayout', () => {
  test('includes Toaster for notifications', () => {
    const { container } = render(
      <RootLayout>
        <div>Test content</div>
      </RootLayout>
    )
    // Should render the Toaster component
    const region = screen.getByRole('region', { name: /notifications/i })
    expect(region).toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/layout.test.tsx`

Expected: FAIL with "Unable to find role="region"" or similar

**Step 3: Add Toaster to layout**

Modify `app/layout.tsx`:

```typescript
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/layout.test.tsx`

Expected: PASS

**Step 5: Run all unit tests to ensure no regressions**

Run: `npm test`

Expected: All tests pass (474/474 or more)

**Step 6: Commit**

```bash
git add app/layout.tsx tests/unit/layout.test.tsx
git commit -m "feat: add Toaster to root layout for global notifications"
```

---

## Task 4: Create error categorization utility

**Files:**

- Create: `lib/utils/error-categorization.ts`
- Test: `tests/unit/error-categorization.test.ts`

**Step 1: Write failing tests**

Create `tests/unit/error-categorization.test.ts`:

```typescript
import { categorizeError, ErrorType } from '@/lib/utils/error-categorization';

describe('categorizeError', () => {
  test('categorizes XML parse errors', () => {
    const error = new Error('XML parse error: unexpected close tag');
    const result = categorizeError(error);

    expect(result.type).toBe(ErrorType.PARSE_ERROR);
    expect(result.message).toBe('Invalid TEI format');
    expect(result.description).toBeDefined();
  });

  test('categorizes network errors', () => {
    const error = new Error('Network request failed');
    const result = categorizeError(error);

    expect(result.type).toBe(ErrorType.NETWORK_ERROR);
    expect(result.message).toBe('Connection failed');
    expect(result.action).toBeDefined();
  });

  test('categorizes file read errors', () => {
    const error = new Error('Failed to read file');
    const result = categorizeError(error);

    expect(result.type).toBe(ErrorType.FILE_ERROR);
    expect(result.message).toBe('Failed to read file');
  });

  test('returns unknown error for unrecognized types', () => {
    const error = new Error('Something unexpected happened');
    const result = categorizeError(error);

    expect(result.type).toBe(ErrorType.UNKNOWN_ERROR);
    expect(result.message).toBe('An error occurred');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/error-categorization.test.ts`

Expected: FAIL with "Cannot find module '@/lib/utils/error-categorization'"

**Step 3: Implement error categorization**

Create `lib/utils/error-categorization.ts`:

```typescript
export enum ErrorType {
  PARSE_ERROR = 'parse_error',
  FILE_ERROR = 'file_error',
  NETWORK_ERROR = 'network_error',
  VALIDATION_ERROR = 'validation_error',
  UNKNOWN_ERROR = 'unknown_error',
}

export interface ErrorInfo {
  type: ErrorType;
  message: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function categorizeError(error: Error): ErrorInfo {
  const message = error.message.toLowerCase();

  // Parse errors
  if (
    message.includes('xml') ||
    message.includes('parse') ||
    message.includes('unexpected token')
  ) {
    return {
      type: ErrorType.PARSE_ERROR,
      message: 'Invalid TEI format',
      description: 'Unable to parse the XML document. Please check the file format and try again.',
    };
  }

  // Network errors
  if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
    return {
      type: ErrorType.NETWORK_ERROR,
      message: 'Connection failed',
      description: 'Please check your internet connection and try again.',
      action: {
        label: 'Retry',
        onClick: () => {
          // Retry logic will be implemented by caller
          console.log('Retry action clicked');
        },
      },
    };
  }

  // File errors
  if (message.includes('file') || message.includes('read') || message.includes('encoding')) {
    return {
      type: ErrorType.FILE_ERROR,
      message: 'Failed to read file',
      description: 'The file could not be read. Please check it is a valid TEI XML file.',
    };
  }

  // Validation errors
  if (
    message.includes('validation') ||
    message.includes('required') ||
    message.includes('missing')
  ) {
    return {
      type: ErrorType.VALIDATION_ERROR,
      message: 'Invalid document',
      description: 'The document is missing required tags or structure.',
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

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/error-categorization.test.ts`

Expected: PASS (4/4 tests)

**Step 5: Run all unit tests**

Run: `npm test`

Expected: All tests pass (no regressions)

**Step 6: Commit**

```bash
git add lib/utils/error-categorization.ts tests/unit/error-categorization.test.ts
git commit -m "feat: add error categorization utility"
```

---

## Task 5: Add error handling to FileUpload component

**Files:**

- Modify: `components/editor/FileUpload.tsx`

**Step 1: Read current implementation**

Run: `cat components/editor/FileUpload.tsx`

Note: This is for understanding the current code structure.

**Step 2: Write test for error handling**

Create `tests/unit/file-upload.test.tsx`:

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { FileUpload } from '@/components/editor/FileUpload'
import { toast } from '@/components/ui/use-toast'

// Mock the toast function
vi.mock('@/components/ui/use-toast', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

describe('FileUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('shows error toast on file read failure', async () => {
    // Create a mock file that will fail to read
    const mockLoadDocument = vi.fn()

    render(<FileUpload loadDocument={mockLoadDocument} />)

    const input = screen.getByRole('file-input') || screen.getByLabelText(/upload/i)
    const file = new File(['invalid content'], 'test.xml', { type: 'text/xml' })

    // Mock file.text() to reject
    Object.defineProperty(file, 'text', {
      value: vi.fn().mockRejectedValue(new Error('Failed to read file')),
    })

    await fireEvent.change(input, { target: { files: [file] } })

    // Wait for async error handling
    await new Promise(resolve => setTimeout(resolve, 100))

    expect(toast.error).toHaveBeenCalledWith(
      'Failed to read file',
      expect.objectContaining({
        description: expect.any(String),
      })
    )
  })

  test('shows success toast on successful upload', async () => {
    const mockLoadDocument = vi.fn()

    render(<FileUpload loadDocument={mockLoadDocument} />)

    const input = screen.getByRole('file-input') || screen.getByLabelText(/upload/i)
    const file = new File(['<TEI>valid content</TEI>'], 'test.xml', { type: 'text/xml' })

    await fireEvent.change(input, { target: { files: [file] } })

    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 100))

    expect(toast.success).toHaveBeenCalledWith('Document uploaded successfully')
  })
})
```

**Step 3: Run test to verify it fails**

Run: `npm test -- tests/unit/file-upload.test.tsx`

Expected: FAIL (toast.error not called because error handling not implemented)

**Step 4: Implement error handling in FileUpload**

Modify `components/editor/FileUpload.tsx`:

Find the `handleFileUpload` function and wrap it with try-catch:

```typescript
import { toast } from '@/components/ui/use-toast';
import { categorizeError } from '@/lib/utils/error-categorization';

// In the component:
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
      action: errorInfo.action,
    });
  }
};
```

**Step 5: Run test to verify it passes**

Run: `npm test -- tests/unit/file-upload.test.tsx`

Expected: PASS (2/2 tests)

**Step 6: Run all unit tests**

Run: `npm test`

Expected: All tests pass (no regressions)

**Step 7: Commit**

```bash
git add components/editor/FileUpload.tsx tests/unit/file-upload.test.tsx
git commit -m "feat: add error handling to FileUpload with toast notifications"
```

---

## Task 6: Add error handling to DocumentContext

**Files:**

- Modify: `lib/context/DocumentContext.tsx`

**Step 1: Read current implementation**

Run: `cat lib/context/DocumentContext.tsx`

Note: Understand the current loadSample and loadDocument implementations.

**Step 2: Write test for error handling**

Create `tests/unit/document-context-error.test.tsx`:

```typescript
import { renderHook, act } from '@testing-library/react'
import { DocumentProvider, useDocument } from '@/lib/context/DocumentContext'
import { toast } from '@/components/ui/use-toast'

// Mock dependencies
vi.mock('@/lib/samples/sampleLoader', () => ({
  loadSampleContent: vi.fn(),
}))

vi.mock('@/components/ui/use-toast', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

import { loadSampleContent } from '@/lib/samples/sampleLoader'

describe('DocumentContext error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('shows error toast when sample loading fails', async () => {
    const errorMessage = 'Failed to fetch sample'
    vi.mocked(loadSampleContent).mockRejectedValue(new Error(errorMessage))

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DocumentProvider>{children}</DocumentProvider>
    )

    const { result } = renderHook(() => useDocument(), { wrapper })

    await act(async () => {
      try {
        await result.current.loadSample('test-sample')
      } catch (error) {
        // Expected to throw
      }
    })

    expect(toast.error).toHaveBeenCalledWith(
      'Failed to load sample',
      expect.objectContaining({
        description: expect.any(String),
      })
    )
  })

  test('shows error toast when document parsing fails', async () => {
    vi.mocked(loadSampleContent).mockResolvedValue('invalid xml {{{')

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DocumentProvider>{children}</DocumentProvider>
    )

    const { result } = renderHook(() => useDocument(), { wrapper })

    await act(async () => {
      try {
        await result.current.loadSample('test-sample')
      } catch (error) {
        // Expected to throw
      }
    })

    expect(toast.error).toHaveBeenCalled()
  })
})
```

**Step 3: Run test to verify it fails**

Run: `npm test -- tests/unit/document-context-error.test.tsx`

Expected: FAIL (toast.error not called)

**Step 4: Implement error handling in DocumentContext**

Modify `lib/context/DocumentContext.tsx`:

Add imports:

```typescript
import { toast } from '@/components/ui/use-toast';
import { categorizeError } from '@/lib/utils/error-categorization';
```

Modify the `loadSample` function:

```typescript
const loadSample = async (sampleId: string) => {
  try {
    const content = await loadSampleContent(sampleId);
    setDocument(new TEIDocument(content));
  } catch (error) {
    console.error('Failed to load sample:', error);
    const errorInfo = categorizeError(error as Error);
    toast.error('Failed to load sample', {
      description: errorInfo.description,
    });
    throw error;
  }
};
```

Modify the `loadDocument` function (if it exists):

```typescript
const loadDocument = async (content: string) => {
  try {
    setDocument(new TEIDocument(content));
  } catch (error) {
    console.error('Failed to load document:', error);
    const errorInfo = categorizeError(error as Error);
    toast.error(errorInfo.message, {
      description: errorInfo.description,
      action: errorInfo.action,
    });
    throw error;
  }
};
```

**Step 5: Run test to verify it passes**

Run: `npm test -- tests/unit/document-context-error.test.tsx`

Expected: PASS

**Step 6: Run all unit tests**

Run: `npm test`

Expected: All tests pass (no regressions)

**Step 7: Commit**

```bash
git add lib/context/DocumentContext.tsx tests/unit/document-context-error.test.tsx
git commit -m "feat: add error handling to DocumentContext with toast notifications"
```

---

## Task 7: Write E2E tests for error handling UI

**Files:**

- Create: `tests/e2e/error-handling-ui.spec.ts`

**Step 1: Create E2E test file**

Create `tests/e2e/error-handling-ui.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Error Handling UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('shows toast notification on invalid file upload', async ({ page }) => {
    // Create invalid XML content
    const invalidXml = 'invalid {{{ xml';

    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'invalid.xml',
      mimeType: 'text/xml',
      buffer: Buffer.from(invalidXml),
    });

    // Wait for toast to appear
    const toast = page.locator('[data-sonner-toast]').first();
    await expect(toast).toBeVisible({ timeout: 5000 });

    // Verify error message
    await expect(toast).toContainText('Invalid TEI format', { timeout: 3000 });
  });

  test('toast auto-dismisses after 5 seconds', async ({ page }) => {
    const invalidXml = 'invalid {{{ xml';

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'invalid.xml',
      mimeType: 'text/xml',
      buffer: Buffer.from(invalidXml),
    });

    const toast = page.locator('[data-sonner-toast]').first();
    await expect(toast).toBeVisible();

    // Wait for auto-dismiss (5 seconds + buffer)
    await page.waitForTimeout(6000);
    await expect(toast).not.toBeVisible();
  });

  test('shows success toast on valid document upload', async ({ page }) => {
    const validXml = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <text>
    <body>
      <p>Test content</p>
    </body>
  </text>
</TEI>`;

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'valid.tei.xml',
      mimeType: 'text/xml',
      buffer: Buffer.from(validXml),
    });

    // Wait for success toast
    const toast = page.locator('[data-sonner-toast]').first();
    await expect(toast).toBeVisible({ timeout: 5000 });
    await expect(toast).toContainText('uploaded successfully');
  });

  test('dismissible toasts can be closed manually', async ({ page }) => {
    const invalidXml = 'invalid {{{ xml';

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'invalid.xml',
      mimeType: 'text/xml',
      buffer: Buffer.from(invalidXml),
    });

    const toast = page.locator('[data-sonner-toast]').first();
    await expect(toast).toBeVisible();

    // Click close button
    const closeButton = toast.locator('button[aria-label="close"]');
    await closeButton.click();

    // Toast should disappear immediately
    await expect(toast).not.toBeVisible();
  });

  test('multiple toasts stack correctly', async ({ page }) => {
    // Trigger multiple errors
    const fileInput = page.locator('input[type="file"]');

    for (let i = 0; i < 3; i++) {
      await fileInput.setInputFiles({
        name: `invalid${i}.xml`,
        mimeType: 'text/xml',
        buffer: Buffer.from('invalid {{{ xml'),
      });

      // Wait a bit between uploads
      await page.waitForTimeout(500);
    }

    // Should see multiple toasts
    const toasts = page.locator('[data-sonner-toast]');
    await expect(toasts).toHaveCount(3);
  });
});
```

**Step 2: Run E2E tests**

Run: `npm run test:e2e tests/e2e/error-handling-ui.spec.ts`

Expected: All tests pass (5/5)

**Step 3: Commit**

```bash
git add tests/e2e/error-handling-ui.spec.ts
git commit -m "test: add E2E tests for error handling UI"
```

---

## Task 8: Run full test suite and verify improvements

**Files:**

- No file changes (verification only)

**Step 1: Run all unit tests**

Run: `npm test`

Expected: All unit tests pass (479+/479+)

**Step 2: Run all E2E tests**

Run: `npm run test:e2e`

Expected: Significant improvement in test pass rate

**Step 3: Compare results**

Check:

- Error Scenarios suite: Should improve from 23/38 to ~31/38
- Document Upload suite: Should improve from 6/31 to ~11/31
- Overall: Should improve from 152/234 to ~164-167/234

**Step 4: Document results**

Create a summary file with before/after test results.

**Step 5: Commit implementation plan completion**

```bash
git add docs/plans/2025-02-01-error-handling-ui-implementation.md
git commit -m "docs: complete error handling UI implementation plan"
```

---

## Success Criteria

After completing all tasks:

✅ **Unit Tests:**

- Toaster component renders correctly
- Error categorization works for all error types
- FileUpload shows error toasts
- DocumentContext shows error toasts
- All 479+ unit tests pass

✅ **E2E Tests:**

- Toast appears on invalid file upload
- Toast auto-dismisses after 5 seconds
- Success toast appears on valid upload
- Toasts can be manually dismissed
- Multiple toasts stack correctly

✅ **Test Suite Improvements:**

- Error Scenarios: +8 tests (23→31)
- Document Upload: +5 tests (6→11)
- Overall: +12-15 tests (152→164-167)
- Pass rate: 65% → 70-71%

✅ **Code Quality:**

- No regressions in existing tests
- Clean git history with frequent commits
- All changes follow TDD process
- Error messages are clear and actionable

---

## Testing Commands Reference

```bash
# Run specific unit test
npm test -- tests/unit/toaster.test.tsx

# Run specific E2E test
npm run test:e2e tests/e2e/error-handling-ui.spec.ts

# Run all unit tests
npm test

# Run all E2E tests
npm run test:e2e

# Run E2E tests in UI mode
npm run test:e2e:ui

# Run E2E tests in debug mode
npm run test:e2e:debug
```

---

## Dependencies

**Required:**

- sonner (npm package)
- Existing: React 19, Next.js 16, TypeScript
- Existing: shadcn/ui components

**Files Created:**

- `components/ui/toaster.tsx`
- `components/ui/use-toast.ts`
- `lib/utils/error-categorization.ts`
- `tests/unit/toaster.test.tsx`
- `tests/unit/layout.test.tsx`
- `tests/unit/error-categorization.test.ts`
- `tests/unit/file-upload.test.tsx`
- `tests/unit/document-context-error.test.tsx`
- `tests/e2e/error-handling-ui.spec.ts`

**Files Modified:**

- `package.json` (sonner dependency)
- `app/layout.tsx` (add Toaster)
- `components/editor/FileUpload.tsx` (error handling)
- `lib/context/DocumentContext.tsx` (error handling)

---

## Time Estimates

- Task 1: 5 minutes (install dependency)
- Task 2: 15 minutes (create Toaster component)
- Task 3: 10 minutes (add to layout)
- Task 4: 20 minutes (error categorization)
- Task 5: 20 minutes (FileUpload error handling)
- Task 6: 20 minutes (DocumentContext error handling)
- Task 7: 25 minutes (E2E tests)
- Task 8: 10 minutes (verification)

**Total Estimated Time:** ~2 hours

---

## Notes for Implementation

1. **TDD Discipline:** Follow RED → GREEN → REFACTOR cycle strictly
2. **Frequent Commits:** Commit after each task (8 total commits)
3. **No Regressions:** Run full test suite after each task
4. **Error Messages:** Keep them user-friendly and actionable
5. **Toast Duration:** Default 5 seconds is appropriate for errors
6. **Accessibility:** sonner provides ARIA attributes automatically
7. **Mobile Testing:** Toast positioning works on mobile viewports

---

**Plan Status:** ✅ Complete
**Ready for:** Implementation via superpowers:executing-plans or superpowers:subagent-driven-development
**Estimated Test Impact:** +12-15 tests passing
**Target Pass Rate:** 70-71% (up from 65%)
