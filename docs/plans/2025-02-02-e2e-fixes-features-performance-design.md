# E2E Test Fixes, Missing Features & Performance - Design Document

**Date:** 2025-02-02
**Author:** Claude (brainstorming skill)
**Status:** Design Complete, Ready for Implementation

## Overview

Comprehensive enhancement plan to improve E2E test pass rate from current ~15% (38/252) to 80-85% (200+/252) through three priority waves: (1) quick test fixes, (2) feature additions and performance, (3) polish and complex features.

**Current State:**

- E2E pass rate: ~15% (38/252 passing)
- 212 failing tests (mostly selector issues, timeouts, missing features)
- Missing UI features: hamburger menu, touch optimization, keyboard shortcuts help, quick search
- Performance issues: slow sample loading, large file handling

**Target State:**

- E2E pass rate: 80-85% (200+/252 passing)
- 4 new features implemented
- Performance optimized
- Test stability improved

**Approach:** Parallel priority-based - tackle highest-impact items across all three areas simultaneously

---

## Problem Analysis

### E2E Test Failures (212 tests)

**Category 1: Selector Issues (50-80 tests)**

- Tests use outdated selectors: `.passage`, `.first()`, old class names
- DOM structure changed since tests were written
- Sample titles don't match sample IDs

**Category 2: Timeout Issues (30-50 tests)**

- Fixed timeouts too short for actual load times
- Tests wait arbitrary durations instead of condition-based waits
- Slow sample loading causes failures

**Category 3: Missing Features (20-30 tests)**

- Tests expect UI elements that don't exist:
  - Hamburger menu
  - Keyboard shortcuts help dialog
  - Touch-optimized buttons
  - Quick search (Cmd+F)

**Category 4: Test Flakiness (10-20 tests)**

- Race conditions between states
- Timing-dependent assertions
- Network issues in CI

### Missing UI Features

**1. Hamburger Menu for Mobile**

- Tests expect mobile navigation menu
- Current: No mobile menu exists
- Impact: +5-8 tests, better mobile UX

**2. Touch-Optimized Buttons**

- Tests expect minimum 44x44px touch targets (WCAG)
- Current: Buttons may be smaller
- Impact: +8-12 tests, accessibility

**3. Keyboard Shortcuts Help Dialog**

- Tests check for help dialog
- Current: No help dialog exists
- Impact: +10-15 tests, user enablement

**4. Quick Search (Cmd+F)**

- Tests expect search functionality
- Current: No search feature
- Impact: +5 tests, power user feature

### Performance Issues

**1. Slow Sample Loading**

- Large TEI files (100-500KB) parse synchronously
- UI blocks during parse
- No loading indication
- Impact: Test timeouts, poor UX

**2. Large File Handling**

- Files >100KB cause timeouts
- No chunking or streaming
- Memory issues
- Impact: 2-3 tests, user frustration

**3. No Progress Indication**

- Users don't know if app is working or frozen
- Tests abort too early
- Impact: Test failures, UX

---

## Architecture

### Three-Layer Approach

```
┌─────────────────────────────────────────────────────────┐
│                    Layer 1: Test Fixes                    │
│  Selector updates, timeout optimizations,                │
│  wait condition improvements                             │
│  Impact: +100-150 tests, 15% → 70-75% pass rate        │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                 Layer 2: Features & UX                   │
│  Touch button sizing, help dialog, sample optimization   │
│  Impact: +15-20 tests, better UX, less flakiness        │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                Layer 3: Performance & Polish              │
│  Hamburger menu, large file handling, final polish       │
│  Impact: +7-11 tests, reach 80-85% pass rate            │
└─────────────────────────────────────────────────────────┘
```

### Key Principle

Each layer is **independently deliverable**. No layer blocks another. Can ship Wave 1, get value, then continue with Waves 2-3.

---

## Implementation Strategy

### Wave 1: Quick Wins (4-5 hours)

**Priority:** HIGH
**Impact:** +100-150 tests
**Pass Rate:** 15% → 70-75%

#### 1.1 Fix Selector Issues

**Problem:** 50-80 tests fail due to outdated selectors

**Solution:** Global selector updates with verification

**Selector Mapping:**

```typescript
'.passage' → '[id^="passage-"]'           // Passage elements
'.first()' → remove                       // Timing issues
'SampleGallery' → '.card, [class*="Card"]' // Actual gallery selector
'sampleTitle' → use sample ID mapping     // Already have this
```

**Automation:**

```bash
# Find problematic patterns
grep -r "\.first()" tests/e2e/
grep -r "\.passage" tests/e2e/
grep -r "getByRole('button').first()" tests/e2e/

# Global replace with verification
find tests/e2e -name "*.spec.ts" -exec sed -i 's/\.first()//g' {} \;
```

**Files:** All E2E test files

#### 1.2 Fix Timeout Issues

**Problem:** 30-50 tests timeout waiting for elements

**Solution:** Replace arbitrary waits with condition-based waits

**Pattern to Fix:**

```typescript
// BAD:
await page.waitForTimeout(5000);
await expect(element).toBeVisible();

// GOOD:
await page.waitForSelector('[id^="passage-"]', { state: 'visible' });
await expect(element).toBeVisible();

// GOOD:
await page.waitForFunction(() => {
  return page.locator('[id^="passage-"]').count() > 0;
});
```

**Files:** All E2E test files with timeout issues

#### 1.3 Fix Sample ID/Title Mapping

**Problem:** 20-30 tests reference samples by display title, not ID

**Solution:** Use existing sampleTitles mapping in test-helpers.ts

**Implementation:**

```typescript
// In test files, change:
await page.click('text="The Yellow Wallpaper"');

// To:
const samples = {
  'yellow-wallpaper': 'The Yellow Wallpaper',
  'pride-prejudice-ch1': 'Pride and Prejudice',
  // etc.
};
await page.click(`text="${samples['yellow-wallpaper']}"`);
```

**Files:** test-helpers.ts, affected test files

#### 1.4 Add Keyboard Shortcuts Help Dialog

**Problem:** Tests expect help dialog to exist

**Solution:** Create simple modal showing keyboard shortcuts

**Implementation:**

- Use existing Dialog component from shadcn/ui
- Trigger: Cmd+/ or button
- Content: List of shortcuts (Cmd+K, Cmd+S, etc.)
- Tests verify dialog existence and content

**Files:**

- Create: `components/help/KeyboardShortcutsHelp.tsx`
- Modify: `components/editor/EditorLayout.tsx` (add help button)

**Wave 1 Summary:**

- 4 tasks
- 4-5 hours
- +100-150 tests fixed
- +1 feature (help dialog)
- Pass rate: 70-75%

---

### Wave 2: Features & Performance (4-5 hours)

**Priority:** MEDIUM
**Impact:** +15-20 tests, better UX
**Pass Rate:** 70-75% → 75-80%

#### 2.1 Touch-Optimized Button Sizes

**Problem:** Tests expect WCAG-compliant touch targets (44x44px minimum)

**Solution:** Add touch-target CSS class to buttons

**Implementation:**

```css
/* In globals.css */
.touch-target {
  min-height: 44px;
  min-width: 44px;
}

/* Apply to Button component for mobile */
@media (max-width: 768px) {
  .touch-target {
    /* Ensure touch-friendly size */
  }
}
```

**Tests verify:**

- Buttons meet minimum size on mobile
- Touch interactions work correctly
- No desktop regressions

**Files:**

- `app/globals.css`
- `components/ui/button.tsx`

#### 2.2 Optimize Sample Loading

**Problem:** Samples load slowly, causing test timeouts

**Solution:** Add loading state and progress indicators

**Implementation:**

```typescript
// In DocumentContext
const [loadingSample, setLoadingSample] = useState(false);
const [loadingProgress, setLoadingProgress] = useState(0);

const loadSample = async (sampleId: string) => {
  setLoadingSample(true);
  setLoadingProgress(0);

  try {
    // Simulate progress for large files
    const content = await loadSampleContent(sampleId);
    setLoadingProgress(50);

    // Parse with progress (if file is large)
    setDocument(new TEIDocument(content));
    setLoadingProgress(100);
  } finally {
    setLoadingSample(false);
  }
};
```

**UI:**

- Show spinner during load
- Show progress bar for large files
- Disable actions during load

**Tests verify:**

- Loading indicator appears
- Progress updates correctly
- Sample loads successfully

**Files:**

- `lib/context/DocumentContext.tsx`
- `components/editor/EditorLayout.tsx` (show progress)

**Wave 2 Summary:**

- 2 tasks
- 4-5 hours
- +15-20 tests
- +1 feature (touch optimization)
- Better UX, more reliable tests

---

### Wave 3: Polish & Complete (7-9 hours)

**Priority:** LOW-MEDIUM
**Impact:** +7-11 tests, final polish
**Pass Rate:** 75-80% → 80-85%

#### 3.1 Hamburger Menu for Mobile

**Problem:** Tests expect mobile navigation menu

**Solution:** Create mobile navigation with hamburger icon

**Implementation:**

- Use shadcn/ui Sheet component
- Show on mobile (<768px)
- Menu items: Home, Samples, Help
- Slide-in from right or bottom

**Components:**

- Create: `components/navigation/MobileNavigation.tsx`
- Modify: `components/editor/EditorLayout.tsx`

**Tests verify:**

- Hamburger appears on mobile
- Menu opens/closes
- Navigation works

**Files:**

- Create: `components/navigation/MobileNavigation.tsx`
- Modify: `app/layout.tsx` or `components/editor/EditorLayout.tsx`

#### 3.2 Large File Handling Optimization

**Problem:** Files >100KB cause timeouts and memory issues

**Solution:** Web Worker-based parsing with progress

**Implementation:**

```typescript
// Create: lib/workers/xml-parser.worker.ts
self.importScripts('/lib/tei-parser.js');

self.onmessage = (e) => {
  const { xml } = e.data;
  const chunkSize = 1024 * 1024; // 1MB chunks

  // Parse with progress callbacks
  const result = parseInChunks(xml, chunkSize, (progress) => {
    self.postMessage({ type: 'progress', progress });
  });

  self.postMessage({ type: 'complete', result });
};
```

**Main Thread:**

```typescript
const parseLargeFile = (xml: string) => {
  const worker = new Worker('/workers/xml-parser.worker.js');

  worker.onmessage = (e) => {
    if (e.data.type === 'progress') {
      setProgress(e.data.progress);
    } else if (e.data.type === 'complete') {
      setDocument(e.data.result);
      worker.terminate();
    }
  };

  worker.postMessage({ xml });
};
```

**Safety:**

- File size warnings for >100KB
- Maximum size limit: 5MB
- Graceful error handling

**Tests verify:**

- Large files load without timeout
- Progress indicator works
- Memory is managed
- Errors handled gracefully

**Files:**

- Create: `lib/workers/xml-parser.worker.ts`
- Modify: `lib/tei/TEIDocument.tsx` (worker integration)
- Modify: `components/editor/FileUpload.tsx` (size check)

**Wave 3 Summary:**

- 2 tasks
- 7-9 hours
- +7-11 tests
- +2 features (hamburger menu, large file handling)
- Pass rate: 80-85%

---

## Testing Strategy

### Per-Wave Verification

**Wave 1 Verification:**

- Run E2E tests: `npm run test:e2e`
- Expected: 100+ previously failing tests now pass
- Check: Pass rate 70-75%
- Check: No regressions in passing tests

**Wave 2 Verification:**

- Run E2E tests: `npm run test:e2e`
- Run performance benchmarks (sample load time)
- Check: Touch targets meet WCAG
- Check: Progress indicators work
- Expected: Pass rate 75-80%

**Wave 3 Verification:**

- Run full E2E test suite
- Run accessibility audit (Lighthouse)
- Test large file handling (>100KB, >500KB)
- Test mobile navigation
- Expected: Pass rate 80-85%

### Final Success Criteria

✅ **E2E Pass Rate:** 80-85% (200+/252 tests)
✅ **All Features Implemented:** Help dialog, touch buttons, hamburger menu, large file handling
✅ **Performance:** Sample loading optimized, large files handled
✅ **Test Stability:** Reduced flakiness, reliable CI
✅ **Accessibility:** WCAG-compliant touch targets, mobile navigation
✅ **User Experience:** Clear feedback, fast loads, good error messages

---

## Risk Mitigation

### Risk 1: Selector Fixes Break Passing Tests

**Likelihood:** Medium
**Impact:** Medium
**Mitigation:**

- Run full E2E suite after each batch of fixes
- Commit changes in small batches (5-10 files at a time)
- Use git bisect to find breaking changes if needed
- Rollback strategy: `git revert HEAD~1`

### Risk 2: Web Worker Complexity

**Likelihood:** High
**Impact:** Low (can defer)
**Mitigation:**

- Start with synchronous optimization (show progress, no worker)
- Implement worker only if synchronous approach insufficient
- Document complexity if deferred
- Fallback: Keep current approach, increase timeouts only

### Risk 3: Mobile Navigation Affects Desktop

**Likelihood:** Low
**Impact:** Low
**Mitigation:**

- Only show on mobile breakpoints (`md:hidden` class)
- Test on both mobile and desktop viewports
- Keep desktop navigation unchanged

### Risk 4: Tests Still Flaky After Fixes

**Likelihood:** Medium
**Impact:** Medium
**Mitigation:**

- Use Playwright's `test.retry()` for flaky tests
- Increase global timeout where needed
- Mark truly flaky tests with `test.skip()` with documentation
- Investigate root causes for persistent flakiness

### Risk 5: Time Estimates Exceeded

**Likelihood:** Medium
**Impact:** Low (flexible scope)
**Mitigation:**

- Wave 1-2 deliver 80% of value in 9-10 hours
- Wave 3 is polish - can defer if needed
- Re-prioritize based on actual progress
- Focus on highest-impact items first

---

## Success Metrics & Timeline

### Wave 1: Quick Wins

**Duration:** 4-5 hours
**Test Improvement:** +100-150 tests
**Pass Rate:** 15% → 70-75%
**Features Added:** 1 (help dialog)
**Files Modified:** ~20 E2E test files

### Wave 2: Features & Performance

**Duration:** 4-5 hours
**Test Improvement:** +15-20 tests
**Pass Rate:** 70-75% → 75-80%
**Features Added:** 1 (touch optimization)
**Performance:** Better UX, less flakiness
**Files Created:** 2-3 components, modified 5-6

### Wave 3: Polish & Complete

**Duration:** 7-9 hours
**Test Improvement:** +7-11 tests
**Pass Rate:** 75-80% → 80-85%
**Features Added:** 2 (hamburger menu, large file handling)
**Performance:** Handles edge cases
**Files Created:** 5-6 components, modified 3-4

### Overall

**Total Duration:** 15-19 hours
**Total Test Improvement:** +122-181 tests
**Final Pass Rate:** 80-85% (200+/252 tests)
**Features Added:** 4
**Performance:** Significantly improved

### Comparison to Goals

**Original Goal:** 90% pass rate (211/234)
**Realistic Target:** 80-85% (200+/252)
**Gap:** Remaining ~10% requires deeper architectural changes

---

## Feature Specifications

### 1. Keyboard Shortcuts Help Dialog

**Purpose:** Show users available keyboard shortcuts

**Trigger:**

- Cmd+/ (or Ctrl+/)
- Help button in editor

**Content:**

```typescript
const shortcuts = [
  { key: '⌘K', description: 'Command palette' },
  { key: '⌘S', description: 'Save document' },
  { key: '⌘O', description: 'Open file' },
  { key: '⌘F', description: 'Find in document' },
  { key: 'Escape', description: 'Close dialog/palette' },
];
```

**UI:**

- Modal dialog centered on screen
- Table with Key and Description columns
- Close button (Escape key also works)
- Available in both editor and welcome page

### 2. Touch-Optimized Buttons

**WCAG 2.1 Guidelines:**

- Minimum touch target: 44x44 pixels
- Spacing: 8px between targets
- Contrast: 3:1 minimum

**Implementation:**

```css
.button-touch {
  min-height: 44px;
  min-width: 44px;
  padding: 12px 20px;
}

@media (max-width: 768px) {
  .button-primary,
  .button-secondary {
    @apply .button-touch;
  }
}
```

**Affected Buttons:**

- Upload TEI File
- Export
- Save
- Load Sample buttons
- Primary action buttons

### 3. Hamburger Menu (Mobile)

**Breakpoint:** <768px (mobile)

**Menu Items:**

- Home (navigate to welcome page)
- Samples (view sample gallery)
- Help (show shortcuts)

**Interaction:**

- Tap hamburger → Sheet slides in from right
- Tap item → Navigate + sheet closes
- Tap outside → Sheet closes
- Swipe gesture → Sheet closes

**Icon:** Menu icon (hamburger) from lucide-react

### 4. Large File Handling

**Size Warnings:**

- 100KB: Show "Large file, may take longer..."
- 500KB: Show "Very large file, may take significantly longer..."
- 1MB: Show warning + confirm before upload

**Progress Indication:**

- For files >50KB: Show progress bar
- Updates every 10% or every 100ms
- Shows percentage and "Processing..." message

**Web Worker Flow:**

1. File selected → Check size
2. If >50KB → Show warning, proceed
3. Send to worker → Parse in background
4. Worker posts progress → Update UI
5. Worker completes → Show document
6. Worker error → Show error toast

**Fallback:**

- If worker fails, try synchronous parse
- If that fails, show error toast
- Log error to ErrorContext

---

## Data Flows

### E2E Test Fix Flow

```
Identify Failing Test → Run Test → Check Error
    ↓
Categorize Failure:
  - Selector issue? → Update selector
  - Timeout? → Add condition-based wait
  - Missing feature? → Defer to appropriate wave
    ↓
Apply Fix → Re-run Test → Verify Pass
    ↓
Commit Changes → Run Full Suite → Check Regressions
```

### Mobile Navigation Flow

```
User on Mobile (<768px) → Hamburger Icon Visible
    ↓
User Taps Hamburger → MobileNavigation State Open
    ↓
Sheet Slides In → Menu Items Displayed:
  - Home
  - Samples
  - Help
    ↓
User Taps Item → Action Executed
    ↓
Navigate to Page OR Open Dialog → Sheet Closes
    ↓
New Page Loads → Hamburger Reappears (if mobile)
```

### Large File Upload Flow

```
User Selects File → FileUpload Checks Size
    ↓
If >100KB → Show Warning Toast
    ↓
User Confirms → Send to Web Worker
    ↓
Worker Parses XML → Posts Progress Updates
    ↓
Main Thread Updates Progress Bar
    ↓
Parse Complete → Document Updated → Progress Hidden
    ↓
Show Success Toast → User Can Edit
```

---

## Dependencies

**Required (Already Exists):**

- Error handling system (completed in previous tasks)
- shadcn/ui components (Dialog, Sheet, Button, Progress)
- Playwright E2E testing framework
- React 19, Next.js 16
- TypeScript

**New Dependencies (Wave 3 only):**

- None planned (use existing components)
- Web Workers are browser API (no external deps)

---

## Files Created/Modified

### Wave 1

**Modified:** ~20 E2E test files
**Created:** `components/help/KeyboardShortcutsHelp.tsx`

### Wave 2

**Created:** None (modifications only)
**Modified:**

- `app/globals.css`
- `components/ui/button.tsx`
- `lib/context/DocumentContext.tsx`
- `components/editor/EditorLayout.tsx`

### Wave 3

**Created:**

- `components/navigation/MobileNavigation.tsx`
- `lib/workers/xml-parser.worker.ts`

**Modified:**

- `app/layout.tsx` or `components/editor/EditorLayout.tsx`
- `lib/tei/TEIDocument.tsx`
- `components/editor/FileUpload.tsx`

**Total:**

- 4 new components
- 1 new worker
- ~25 modified files
- ~20 test files updated

---

## Timeline & Milestones

**Week 1:**

- Day 1-2: Wave 1 implementation (4-5 hours)
- Day 3: Wave 1 verification and adjustments

**Week 2:**

- Day 1-2: Wave 2 implementation (4-5 hours)
- Day 3: Wave 2 verification

**Week 3:**

- Day 1-3: Wave 3 implementation (7-9 hours)
- Day 4: Final verification and polish

**Milestones:**

1. ✅ Wave 1 complete: Pass rate 70-75%
2. ✅ Wave 2 complete: Pass rate 75-80%
3. ✅ Wave 3 complete: Pass rate 80-85%

---

## Conclusion

This comprehensive enhancement plan takes a **parallel priority-based approach** to maximize impact:

**Three Waves:**

1. **Quick Wins** (4-5 hours) - Fix 100+ tests, add help dialog
2. **Features & Performance** (4-5 hours) - Add features, optimize UX
3. **Polish** (7-9 hours) - Complete complex features

**Expected Outcome:**

- **80-85% E2E pass rate** (200+/252 tests)
- **4 new features** (help dialog, touch buttons, hamburger menu, large file handling)
- **Significantly better UX** (loading states, progress indicators, mobile-friendly)
- **More reliable tests** (fewer timeouts, better waits)

**Next Steps:**

1. Create detailed implementation plan using `superpowers:writing-plans`
2. Execute using `superpowers:subagent-driven-development`
3. Verify improvements with `superpowers:verification-before-completion`

---

**Design Status:** ✅ Complete
**Ready for:** Implementation planning
**Estimated Impact:** 80-85% E2E pass rate
**User Value:** Significantly improved UX
**Developer Value:** Better test coverage, more maintainable
