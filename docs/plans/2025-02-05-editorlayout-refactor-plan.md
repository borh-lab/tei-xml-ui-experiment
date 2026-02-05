# EditorLayout Refactoring Plan

**Date:** 2025-02-05
**Component:** `components/editor/EditorLayout.tsx`
**Current Size:** 1,195 lines
**Target Size:** <200 lines per file

---

## Problem Statement

The `EditorLayout.tsx` component is a monolithic 1,195-line file that handles too many responsibilities:

1. **Document State Management** - Loading, updates, validation
2. **UI State** - 20+ useState hooks for panels, modals, selections
3. **AI Integration** - Suggestions, mode switching, dialogue detection
4. **Bulk Operations** - Multi-passage selection and operations
5. **Tag Operations** - Adding, editing, removing TEI tags
6. **View Management** - WYSIWYG/XML/Split view switching
7. **Keyboard Shortcuts** - Command palette, hotkeys
8. **Entity Management** - Character/relationship editing
9. **Validation** - Schema validation display and results
10. **Toast Notifications** - Success/error messages
11. **Scroll Management** - Syncing between WYSIWYG and XML views
12. **Selection Management** - Text selection, passage navigation
13. **Mobile Navigation** - Responsive UI controls

This violates the Single Responsibility Principle and creates:
- **Hard to test** - Too many interconnected states
- **Hard to maintain** - Changes ripple through 1,195 lines
- **Performance issues** - 15+ useEffect hooks creating complex re-render logic
- **Type safety issues** - Requires `@ts-nocheck` at the top

---

## Refactoring Strategy

### Phase 1: Extract Custom Hooks (Foundation)
**Goal:** Separate state management logic from UI rendering

Create focused hooks in `components/editor/hooks/`:

1. **`useEditorState.ts`** (~150 lines)
   - Document operations (load, update, validate)
   - Passage navigation (current passage, next/previous)
   - Returns: `{ document, loadDocument, updateDocument, ... }`

2. **`useEditorUI.ts`** (~120 lines)
   - Panel state (commandPalette, bulk, viz, validation)
   - Modal state (entity panel, edit dialog, keyboard help)
   - Toast notifications
   - Returns: `{ panelStates, showModal, hideModal, showToast }`

3. **`useAISuggestions.ts`** (~100 lines)
   - AI mode management
   - Suggestions state and filtering
   - Accept/reject handlers
   - Returns: `{ aiMode, suggestions, filteredSuggestions, acceptSuggestion, rejectSuggestion }`

4. **`useTagSelection.ts`** (~100 lines)
   - Selected text state
   - Tag selection and editing
   - Tag breadcrumb navigation
   - Returns: `{ selectedText, selectText, selectedTag, editTag, deleteTag }`

5. **`useViewMode.ts`** (~80 lines)
   - View mode switching (WYSIWYG/XML/Split)
   - Code content state and sync
   - Scroll management
   - Returns: `{ viewMode, codeContent, toggleViewMode }`

6. **`useBulkOperations.ts`** (~80 lines)
   - Bulk mode state
   - Passage selection management
   - Highlighted passage tracking
   - Returns: `{ isBulkMode, selectedPassages, togglePassage, clearSelection }`

7. **`useKeyboardShortcuts.ts`** (~60 lines)
   - Global keyboard shortcuts
   - Command palette
   - Shortcut help modal
   - Returns: `{ shortcuts, openCommandPalette, openShortcutHelp }`

### Phase 2: Extract Sub-Components
**Goal:** Break down the massive render function into focused components

Create focused components in `components/editor/`:

1. **`EditorToast.tsx`** (~40 lines)
   - Toast notification display
   - Auto-dismiss logic
   - Success/error/warning variants

2. **`EditorToolbar.tsx`** (~80 lines)
   - Top toolbar with primary actions
   - Export button, AI mode switcher
   - Tag toolbar integration
   - Command palette button

3. **`EditorModals.tsx`** (~100 lines)
   - All modal dialogs combined
   - Entity editor panel
   - Tag edit dialog
   - Keyboard shortcut help
   - Command palette

4. **`EditorPanels.tsx`** (~120 lines)
   - Side panels (bulk operations, visualization, validation)
   - Collapsible panel state
   - Panel toggle buttons

5. **`EditorContent.tsx`** (~200 lines)
   - Main content area (WYSIWYG and XML views)
   - Split view layout
   - View mode switcher

6. **`EditorBulkControls.tsx`** (~60 lines)
   - Bulk operation controls
   - Select all/deselect/clear
   - Selection count display

### Phase 3: Simplify Main Component
**Goal:** Reduce EditorLayout.tsx to <200 lines

The refactored `EditorLayout.tsx` should:

```typescript
export function EditorLayout() {
  // Use all custom hooks
  const editorState = useEditorState();
  const uiState = useEditorUI();
  const aiState = useAISuggestions();
  const selectionState = useTagSelection();
  const viewMode = useViewMode();
  const bulkState = useBulkOperations();
  const keyboard = useKeyboardShortcuts();

  // Simple composition
  return (
    <div className="editor-layout">
      <EditorToolbar {...editorState} {...uiState} {...keyboard} />
      <EditorContent {...viewMode} {...selectionState} />
      <EditorModals {...uiState} {...selectionState} />
      <EditorPanels {...uiState} {...bulkState} />
      <EditorToast {...uiState.toast} />
    </div>
  );
}
```

**Target:** <150 lines for the main component

---

## File Structure

```
components/editor/
├── EditorLayout.tsx (main orchestrator, ~150 lines)
├── hooks/
│   ├── useEditorState.ts (document operations)
│   ├── useEditorUI.ts (panel/modal state)
│   ├── useAISuggestions.ts (AI integration)
│   ├── useTagSelection.ts (tag operations)
│   ├── useViewMode.ts (view switching)
│   ├── useBulkOperations.ts (bulk mode)
│   └── useKeyboardShortcuts.ts (hotkeys)
├── EditorToolbar.tsx (top toolbar)
├── EditorContent.tsx (main content area)
├── EditorModals.tsx (all dialogs)
├── EditorPanels.tsx (side panels)
├── EditorToast.tsx (notifications)
└── EditorBulkControls.tsx (bulk controls)
```

---

## Implementation Steps

### Step 1: Create Hooks (No Breaking Changes)
1. Create `components/editor/hooks/` directory
2. Extract hooks one by one
3. Keep original EditorLayout.tsx working
4. Test each hook independently

**Time Estimate:** 2-3 hours

### Step 2: Create Sub-Components (No Breaking Changes)
1. Create each component in parallel
2. Add props interfaces
3. Copy relevant code from EditorLayout
4. Test each component independently

**Time Estimate:** 2-3 hours

### Step 3: Refactor Main Component (Breaking Changes)
1. Update EditorLayout.tsx to use new hooks and components
2. Remove old code incrementally
3. Test after each extraction
4. Update any affected tests

**Time Estimate:** 1-2 hours

**Total Time Estimate:** 5-8 hours

---

## Success Criteria

### Functional
- ✅ All existing features work identically
- ✅ All tests pass (89/89 suites)
- ✅ No visual regressions
- ✅ Performance improved or maintained

### Code Quality
- ✅ EditorLayout.tsx < 200 lines
- ✅ Each extracted file < 200 lines
- ✅ No `@ts-nocheck` in new files
- ✅ Proper TypeScript types throughout
- ✅ Each hook/component independently testable

### Maintainability
- ✅ Single responsibility per file
- ✅ Clear naming and organization
- ✅ Easy to locate functionality
- ✅ Minimal coupling between components

---

## Testing Strategy

### Unit Tests for Hooks
```typescript
// hooks/useEditorState.test.ts
describe('useEditorState', () => {
  it('should load document', async () => {
    const { result } = renderHook(() => useEditorState());
    await act(() => result.current.loadDocument(xml));
    expect(result.current.document).toBeDefined();
  });

  it('should update document', async () => {
    const { result } = renderHook(() => useEditorState());
    await act(() => result.current.updateDocument(xml));
    expect(result.current.document).not.toBeNull();
  });
});
```

### Integration Tests
```typescript
// EditorLayout.integration.test.tsx
describe('EditorLayout Integration', () => {
  it('should handle tag operations end-to-end', async () => {
    render(<EditorLayout />);
    // ... test complete flow
  });
});
```

---

## Migration Path (Safe Rollback)

### Option A: Incremental (Recommended)
1. Create new hooks alongside existing code
2. Slowly migrate usage one function at a time
3. Keep old code until fully migrated
4. Remove old code only when all tests pass

### Option B: Parallel (Faster but Riskier)
1. Create new structure in separate files
2. Implement all new hooks/components
3. Replace EditorLayout.tsx in one go
4. Rollback: `git revert <commit>` if issues

---

## Benefits

### For Developers
- **Easier Testing** - Test hooks and components in isolation
- **Faster Development** - Find functionality quickly
- **Fewer Bugs** - Smaller, focused code units
- **Better IDE Support** - Navigation is simpler

### For Performance
- **Fewer Re-renders** - Better hook dependency management
- **Code Splitting** - Easier to lazy-load features
- **Memoization** - Easier to optimize specific components

### For Maintainability
- **Clear Separation** - UI vs. logic is obvious
- **Easy to Modify** - Change one piece without touching others
- **Team Collaboration** - Less merge conflicts
- **Onboarding** - New developers understand structure faster

---

## Risks & Mitigations

### Risk 1: Breaking Changes
**Mitigation:** Incremental migration with comprehensive testing at each step

### Risk 2: State Management Bugs
**Mitigation:** Preserve exact state initialization logic, test thoroughly

### Risk 3: Performance Regression
**Mapping:** Run performance benchmarks before and after, optimize hotspots

### Risk 4: Test Failures
**Mitigation:** Keep old component working during hook extraction, update tests last

---

## Next Steps

### Immediate (When Ready)
1. Review and approve this plan
2. Create `components/editor/hooks/` directory
3. Start with Phase 1: Extract first hook (useEditorState)
4. Validate approach before proceeding

### After First Phase
5. Complete remaining hooks
6. Begin sub-component extraction
7. Final refactoring of main component

### During Implementation
- Run tests after every file change
- Commit frequently with atomic changes
- Update documentation as we go

---

## Definition of Done

- [ ] All 7 hooks created and tested
- [ ] All 6 sub-components created and tested
- [ ] EditorLayout.tsx refactored to <200 lines
- [ ] All 89 test suites passing
- [ ] No visual regressions
- [ ] Documentation updated
- [ ] Code review approved

---

**Estimated Effort:** 5-8 hours
**Risk Level:** Medium (incremental approach mitigates risk)
**Impact:** High - Significantly improves codebase maintainability
