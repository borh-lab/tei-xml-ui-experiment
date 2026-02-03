# E2E Fixes, Features & Performance Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve E2E test pass rate from 15% to 80-85% through three priority waves: quick test fixes, feature additions, and performance optimizations

**Architecture:** Three-layer approach - Wave 1 fixes test infrastructure issues, Wave 2 adds missing UI features and basic performance, Wave 3 completes complex features and advanced performance

**Tech Stack:** React 19, Next.js 16, Playwright, TypeScript, shadcn/ui components, existing error handling system

---

## WAVE 1: Quick Wins (Fix 100+ Tests)

### Task 1: Fix .passage selector issues

**Files:**
- Modify: All E2E test files containing `.passage` selector

**Step 1: Find all tests with .passage selector**

Run: `grep -r "\.passage" tests/e2e/`

Expected: List of test files using `.passage` selector

**Step 2: Replace .passage with [id^="passage-"]

Run: `find tests/e2e -name "*.spec.ts" -exec sed -i 's/\.passage/[id^="passage-"]/g' {} \;`

**Step 3: Run affected tests to verify**

Run: `npm run test:e2e -- tests/e2e/tei-dialogue-editor.spec.ts`

Expected: More tests passing than before

**Step 4: Commit**

```bash
git add tests/e2e/
git commit -m "fix: replace .passage selector with id selector"
```

---

### Task 2: Remove .first() calls causing timing issues

**Files:**
- Modify: All E2E test files containing `.first()`

**Step 1: Find all tests with .first() calls**

Run: `grep -r "\.first()" tests/e2e/`

Expected: List of files with `.first()` usage

**Step 2: Remove .first() from locators**

Pattern to find:
```typescript
page.locator('.selector').first()
page.getByRole('button').first()
```

Replace with:
```typescript
page.locator('.selector')
page.getByRole('button')
```

Run: `find tests/e2e -name "*.spec.ts" -exec sed -i 's/\.first()//g' {} \;`

**Step 3: Run tests to verify**

Run: `npm run test:e2e`

Expected: Fewer timeouts, more stable tests

**Step 4: Commit**

```bash
git add tests/e2e/
git commit -m "fix: remove .first() calls causing timing issues"
```

---

### Task 3: Replace arbitrary timeouts with condition-based waits

**Files:**
- Modify: E2E test files with `waitForTimeout` issues

**Step 1: Find tests with long waitForTimeout**

Run: `grep -r "waitForTimeout(5" tests/e2e/`

Expected: List of tests with 5+ second timeouts

**Step 2: Replace with waitForSelector or waitForFunction**

Pattern 1 - Element visibility:
```typescript
// BEFORE:
await page.waitForTimeout(5000)
const element = page.locator('.selector')
await expect(element).toBeVisible()

// AFTER:
await page.waitForSelector('.selector', { state: 'visible' })
const element = page.locator('.selector')
await expect(element).toBeVisible()
```

Pattern 2 - Element count:
```typescript
// BEFORE:
await page.waitForTimeout(3000)

// AFTER:
await page.waitForFunction(() => {
  return page.locator('[id^="passage-"]').count() > 0
})
```

**Step 3: Run tests to verify**

Run: `npm run test:e2e`

Expected: Tests complete faster, fewer timeouts

**Step 4: Commit**

```bash
git add tests/e2e/
git commit -m "fix: replace arbitrary waits with condition-based waits"
```

---

### Task 4: Create KeyboardShortcutsHelp component

**Files:**
- Create: `components/help/KeyboardShortcutsHelp.tsx`
- Test: `tests/unit/KeyboardShortcutsHelp.test.tsx`

**Step 1: Write failing test**

Create `tests/unit/KeyboardShortcutsHelp.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { KeyboardShortcutsHelp } from '@/components/help/KeyboardShortcutsHelp'

describe('KeyboardShortcutsHelp', () => {
  test('renders keyboard shortcuts dialog', () => {
    const { getByText } = render(<KeyboardShortcutsHelp open={true} />)
    expect(getByText('Keyboard Shortcuts')).toBeInTheDocument()
  })

  test('displays all keyboard shortcuts', () => {
    const { getByText } = render(<KeyboardShortcutsHelp open={true} />)
    expect(getByText('⌘K')).toBeInTheDocument()
    expect(getByText('Command palette')).toBeInTheDocument()
  })
})
```

Run: `npm test -- tests/unit/KeyboardShortcutsHelp.test.tsx`

Expected: FAIL with "Cannot find module '@/components/help/KeyboardShortcutsHelp'"

**Step 2: Implement KeyboardShortcutsHelp component**

Create `components/help/KeyboardShortcutsHelp.tsx`:

```typescript
'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { X } from 'lucide-react'

interface KeyboardShortcutsHelpProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const shortcuts = [
  { key: '⌘K', description: 'Command palette' },
  { key: '⌘S', description: 'Save document' },
  { key: '⌘O', description: 'Open file' },
  { key: 'Escape', description: 'Close dialog/palette' },
]

export function KeyboardShortcutsHelp({ open, onOpenChange }: KeyboardShortcutsHelpProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="ml-auto"
          >
            <X className="h-4 w-4" />
          </button>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {shortcuts.map((shortcut) => (
            <div key={shortcut.key} className="flex items-center gap-4">
              <kbd className="px-3 py-1.5 text-sm font-semibold rounded bg-muted">
                {shortcut.key}
              </kbd>
              <span className="text-sm text-muted-foreground">
                {shortcut.description}
              </span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

**Step 3: Run test to verify it passes**

Run: `npm test -- tests/unit/KeyboardShortcutsHelp.test.tsx`

Expected: PASS (2/2 tests)

**Step 4: Run all unit tests**

Run: `npm test`

Expected: All tests pass (no regressions)

**Step 5: Commit**

```bash
git add components/help/KeyboardShortcutsHelp.tsx tests/unit/KeyboardShortcutsHelp.test.tsx
git commit -m "feat: add keyboard shortcuts help dialog"
```

---

### Task 5: Integrate KeyboardShortcutsHelp into EditorLayout

**Files:**
- Modify: `components/editor/EditorLayout.tsx`

**Step 1: Add state for help dialog**

In EditorLayout component, add:
```typescript
const [helpOpen, setHelpOpen] = useState(false)
```

**Step 2: Add keyboard shortcut listener**

Add effect:
```typescript
useHotkeys('mod+/', (e) => {
  e.preventDefault()
  setHelpOpen(true)
})
```

**Step 3: Render KeyboardShortcutsHelp component**

In JSX, add:
```typescript
<KeyboardShortcutsHelp open={helpOpen} onOpenChange={setHelpOpen} />
```

**Step 4: Add help button**

Add button in header or toolbar:
```typescript
<Button
  variant="outline"
  size="sm"
  onClick={() => setHelpOpen(true)}
>
  Help (⌘+/)
</Button>
```

**Step 5: Run all unit tests**

Run: `npm test`

Expected: All tests pass

**Step 6: Commit**

```bash
git add components/editor/EditorLayout.tsx
git commit -m "feat: integrate keyboard shortcuts help dialog"
```

---

## WAVE 2: Features & Performance (Add 15-20 Tests)

### Task 6: Add touch-target CSS class for mobile buttons

**Files:**
- Modify: `app/globals.css`

**Step 1: Add touch-target class**

Add to `app/globals.css`:
```css
.touch-target {
  min-height: 44px;
  min-width: 44px;
}

@media (max-width: 768px) {
  .button-primary,
  .button-secondary {
    @apply .touch-target;
  }
}
```

**Step 2: Verify build succeeds**

Run: `npm run build`

Expected: Build succeeds

**Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat: add touch-target class for mobile buttons"
```

---

### Task 7: Update Button component with touch support

**Files:**
- Modify: `components/ui/button.tsx`

**Step 1: Add touch-target prop**

Modify Button component to accept optional `touch` prop:

```typescript
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  touch?: boolean
  // ... existing props
}
```

**Step 2: Apply touch-target class when touch=true**

In Button component, add className logic:
```typescript
const button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, touch, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(
          touch && 'touch-target',
          // ... existing classes
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
```

**Step 3: Run all unit tests**

Run: `npm test`

Expected: All tests pass

**Step 4: Commit**

```bash
git add components/ui/button.tsx
git commit -m "feat: add touch prop to Button component"
```

---

### Task 8: Add loading state to DocumentContext

**Files:**
- Modify: `lib/context/DocumentContext.tsx`

**Step 1: Add loading state**

Add to DocumentContext provider:
```typescript
const [loadingSample, setLoadingSample] = useState(false)
const [loadingProgress, setLoadingProgress] = useState(0)
```

**Step 2: Update loadSample to set loading state**

Modify loadSample function:
```typescript
const loadSample = async (sampleId: string) => {
  setLoadingSample(true)
  setLoadingProgress(0)

  try {
    const content = await loadSampleContent(sampleId)
    setLoadingProgress(50)
    setDocument(new TEIDocument(content))
    setLoadingProgress(100)
  } catch (error) {
    // ... existing error handling
  } finally {
    setLoadingSample(false)
  }
}
```

**Step 3: Export loading state from context**

Update return value:
```typescript
return (
  <DocumentContext.Provider value={{
    document,
    loadDocument,
    loadSample,
    loadingSample,
    loadingProgress,
    // ... other exports
  }}>
    {children}
  </DocumentContext.Provider>
)
```

**Step 4: Run all unit tests**

Run: `npm test`

Expected: All tests pass

**Step 5: Commit**

```bash
git add lib/context/DocumentContext.tsx
git commit -m "feat: add loading state to DocumentContext"
```

---

### Task 9: Display loading indicator in EditorLayout

**Files:**
- Modify: `components/editor/EditorLayout.tsx`

**Step 1: Consume loading state**

In EditorLayout:
```typescript
const { document, loadingSample, loadingProgress } = useDocumentContext()
```

**Step 2: Add Progress component when loading**

In JSX, add:
```typescript
{loadingSample && (
  <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50">
    <div className="bg-card p-6 rounded-lg shadow-lg max-w-md w-full">
      <h3 className="text-lg font-semibold mb-4">Loading Sample...</h3>
      <Progress value={loadingProgress} className="w-full" />
      <p className="text-sm text-muted-foreground mt-2">{loadingProgress}%</p>
    </div>
  </div>
)}
```

**Step 3: Run all unit tests**

Run: `npm test`

Expected: All tests pass

**Step 4: Commit**

```bash
git add components/editor/EditorLayout.tsx
git commit -m "feat: add loading indicator for sample loading"
```

---

## WAVE 3: Polish & Complete (Final 7-11 Tests)

### Task 10: Create MobileNavigation component

**Files:**
- Create: `components/navigation/MobileNavigation.tsx`
- Test: `tests/unit/MobileNavigation.test.tsx`

**Step 1: Write failing test**

Create `tests/unit/MobileNavigation.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { MobileNavigation } from '@/components/navigation/MobileNavigation'

describe('MobileNavigation', () => {
  test('renders hamburger icon on mobile', () => {
    const { getByLabelText } = render(<MobileNavigation />)
    expect(getByLabelText('Menu')).toBeInTheDocument()
  })

  test('hamburger is hidden on desktop', () => {
    // Mock window.innerWidth to be > 768
    const { queryByLabelText } = render(<MobileNavigation />)
    expect(queryByLabelText('Menu')).not.toBeInTheDocument()
  })
})
```

Run: `npm test -- tests/unit/MobileNavigation.test.tsx`

Expected: FAIL with module not found

**Step 2: Implement MobileNavigation component**

Create `components/navigation/MobileNavigation.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Menu } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function MobileNavigation() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const navigate = (path: string) => {
    router.push(path)
    setOpen(false)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="md:hidden">
        <button className="p-2" aria-label="Menu">
          <Menu className="h-6 w-6" />
        </button>
      </SheetTrigger>
      <SheetContent side="right">
        <nav className="flex flex-col gap-4 p-6">
          <button
            onClick={() => navigate('/')}
            className="text-left text-lg font-medium hover:underline"
          >
            Home
          </button>
          <button
            onClick={() => navigate('/#samples')}
            className="text-left text-lg font-medium hover:underline"
          >
            Samples
          </button>
          <button
            onClick={() => navigate('/#help')}
            className="text-left text-lg font-medium hover:underline"
          >
            Help
          </button>
        </nav>
      </SheetContent>
    </Sheet>
  )
}
```

**Step 3: Run test to verify it passes**

Run: `npm test -- tests/unit/MobileNavigation.test.tsx`

Expected: PASS

**Step 4: Commit**

```bash
git add components/navigation/MobileNavigation.tsx tests/unit/MobileNavigation.test.tsx
git commit -m "feat: add mobile navigation component"
```

---

### Task 11: Integrate MobileNavigation into layout

**Files:**
- Modify: `components/editor/EditorLayout.tsx`

**Step 1: Add MobileNavigation to EditorLayout**

Import and render:
```typescript
import { MobileNavigation } from '@/components/navigation/MobileNavigation'

// In JSX, add:
<MobileNavigation />
```

**Step 2: Ensure it only shows on mobile**

The Sheet component with `md:hidden` on trigger should handle this automatically.

**Step 3: Run all unit tests**

Run: `npm test`

Expected: All tests pass

**Step 4: Commit**

```bash
git add components/editor/EditorLayout.tsx
git commit -m "feat: integrate mobile navigation into editor"
```

---

### Task 12: Add file size check to FileUpload

**Files:**
- Modify: `components/editor/FileUpload.tsx`

**Step 1: Add file size warning logic**

In handleFileUpload, add:
```typescript
const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  // Check file size
  const fileSize = file.size
  if (fileSize > 100 * 1024) { // 100KB
    const sizeMB = (fileSize / (1024 * 1024)).toFixed(2)
    toast.warning(`Large file (${sizeMB}MB) - may take longer to process`)
  }

  if (fileSize > 5 * 1024 * 1024) { // 5MB
    toast.error('File too large (max 5MB)', {
      description: 'Please upload a smaller file'
    })
    return
  }

  try {
    const text = await file.text()
    loadDocument(text)
    toast.success('Document uploaded successfully')
  } catch (error) {
    // ... existing error handling
  }
}
```

**Step 2: Run all unit tests**

Run: `npm test`

Expected: All tests pass

**Step 3: Commit**

```bash
git add components/editor/FileUpload.tsx
git commit -m "feat: add file size warnings to FileUpload"
```

---

### Task 13: Add large file E2E test

**Files:**
- Create: `tests/e2e/large-file-handling.spec.ts`

**Step 1: Create E2E test**

Create `tests/e2e/large-file-handling.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'

test.describe('Large File Handling', () => {
  test('shows warning for files over 100KB', async ({ page }) => {
    await page.goto('/')

    // Create a large XML file (150KB)
    const largeXml = '<?xml version="1.0" encoding="UTF-8"?>\n' + '<TEI>' + '<text>' + '<p>'.repeat(10000) + '</p>' + '</text>' + '</TEI>'

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'large.tei.xml',
      mimeType: 'text/xml',
      buffer: Buffer.from(largeXml),
    })

    // Should show warning toast but still process
    const toast = page.locator('[data-sonner-toast]').first()
    await expect(toast).toContainText('may take longer')
  })

  test('rejects files over 5MB', async ({ page }) => {
    await page.goto('/')

    // Create a very large XML file (6MB)
    const hugeXml = '<?xml version="1.0"?>\n' + '<TEI>' + '<p>'.repeat(400000) + '</TEI>'

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'huge.tei.xml',
      mimeType: 'text/xml',
      buffer: Buffer.from(hugeXml),
    })

    // Should show error toast and not process
    const toast = page.locator('[data-sonner-toast]').first()
    await expect(toast).toContainText('too large')
  })
})
```

**Step 2: Run E2E test**

Run: `npm run test:e2e tests/e2e/large-file-handling.spec.ts`

Expected: 2/2 tests pass

**Step 3: Commit**

```bash
git add tests/e2e/large-file-handling.spec.ts
git commit -m "test: add E2E tests for large file handling"
```

---

### Task 14: Run full test suite and document results

**Files:**
- Create: `docs/e2e-improvements-summary.md`

**Step 1: Run all E2E tests**

Run: `npm run test:e2e`

Document:
- Total tests: ___
- Passing: ___
- Failing: ___
- Pass rate: ___%

**Step 2: Run all unit tests**

Run: `npm test`

Document:
- Total tests: ___
- Passing: ___
- Failing: ___

**Step 3: Create summary document**

Create `docs/e2e-improvements-summary.md` with:
- Before/after statistics
- Wave 1 improvements
- Wave 2 improvements
- Wave 3 improvements
- New features added
- Remaining work (if any)

**Step 4: Final commit**

```bash
git add docs/e2e-improvements-summary.md
git commit -m "docs: document E2E test improvements and feature additions"
```

---

## Success Criteria

After completing all waves:

✅ **Wave 1: Quick Wins**
- 100+ E2E tests fixed
- Pass rate: 15% → 70-75%
- Help dialog implemented
- All tests more stable (fewer timeouts)

✅ **Wave 2: Features & Performance**
- 15-20 E2E tests added/fixed
- Pass rate: 70-75% → 75-80%
- Touch-optimized buttons
- Loading indicators
- Better UX

✅ **Wave 3: Polish**
- 7-11 E2E tests added/fixed
- Pass rate: 75-80% → 80-85%
- Mobile navigation implemented
- Large file handling
- Production-ready

✅ **Overall Achievement**
- **Final Pass Rate:** 80-85% (200+/252 tests)
- **Features Added:** 4
- **Performance:** Significantly improved
- **UX:** Much better

---

## Testing Commands

```bash
# Run specific E2E test
npm run test:e2e tests/e2e/tei-dialogue-editor.spec.ts

# Run all E2E tests
npm run test:e2e

# Run specific unit test
npm test -- tests/unit/KeyboardShortcutsHelp.test.tsx

# Run all unit tests
npm test

# Run E2E tests in UI mode
npm run test:e2e:ui
```

---

## Dependencies

**Required:**
- Existing error handling system
- shadcn/ui components (Dialog, Sheet, Button, Progress)
- Playwright E2E testing
- React 19, Next.js 16, TypeScript

**New Dependencies:**
- None (all use existing components)

---

## Files Created/Modified

**Created:**
- `components/help/KeyboardShortcutsHelp.tsx`
- `components/navigation/MobileNavigation.tsx`
- `tests/unit/KeyboardShortcutsHelp.test.tsx`
- `tests/unit/MobileNavigation.test.tsx`
- `tests/e2e/large-file-handling.spec.ts`

**Modified:**
- `app/globals.css` (touch-target class)
- `components/ui/button.tsx` (touch prop)
- `lib/context/DocumentContext.tsx` (loading state)
- `components/editor/EditorLayout.tsx` (help, mobile nav, loading indicator)
- `components/editor/FileUpload.tsx` (file size checks)
- Multiple E2E test files (selector fixes, timeout removal)
- `docs/e2e-improvements-summary.md`

**Total:**
- 5 new components
- 5 modified components
- ~20 E2E test files updated

---

## Time Estimates

**Wave 1:** 4-5 hours (Tasks 1-5)
**Wave 2:** 4-5 hours (Tasks 6-9)
**Wave 3:** 7-9 hours (Tasks 10-14)

**Total:** 15-19 hours

---

## Notes

- **TDD Discipline:** Follow RED → GREEN → REFACTOR for all new components
- **Frequent Commits:** Commit after each task (14 total commits)
- **Verification:** Run full test suite after each wave
- **Incremental:** Each wave delivers value independently

---

**Plan Status:** ✅ Complete
**Ready for:** Implementation via superpowers:subagent-driven-development
**Estimated Impact:** 80-85% E2E pass rate
**User Value:** 4 new features, significantly improved UX
**Developer Value:** Better test coverage, more maintainable
