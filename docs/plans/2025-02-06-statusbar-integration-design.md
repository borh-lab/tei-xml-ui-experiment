# StatusBar Integration Design

**Date:** 2025-02-06
**Status:** Ready for Implementation
**Priority:** High (Missing Feature)

## Overview

Integrate the existing StatusBar component into EditorLayout to display essential document status information (document name, unsaved changes, validation errors, save status) at the bottom of the editor window.

## Goals

1. **Integrate StatusBar** into EditorLayout as fixed footer
2. **Display essential information** only (document name, unsaved status, validation errors, save status)
3. **Toggle visibility** via keyboard shortcut (⌘/) and menu option
4. **Track save state** using value-oriented design (revision comparison, not dirty flags)

## Architecture

### Component Structure

```
EditorLayout (flex-col, h-screen)
├── EditorToolbar (fixed top, border-b)
├── Main Content Area (flex-1, overflow-hidden)
│   ├── EditorContent (WYSIWYG/XML/Split views)
│   └── EditorPanels (Validation, Visualization, Tag Queue)
└── StatusBar (fixed bottom, border-t) ← NEW
```

**Key Implementation Details:**
- StatusBar renders at bottom of main flex container
- Fixed position: doesn't scroll with content
- Minimal height: doesn't intrude on workspace
- Takes full width for status information

### Data Flow

```
DocumentContext (single source of truth)
├── document.state.revision (current)
├── lastSavedRevision (saved)
├── lastSavedAt (timestamp)
└── validationResults (errors, warnings)
         ↓
EditorLayout (computes derived state)
├── hasUnsavedChanges = (revision !== lastSavedRevision)
├── documentName = document?.id || 'Untitled'
└── statusBarProps = { ... }
         ↓
StatusBar (pure presentation component)
└── renders UI from props
```

## Design Principles (Hickey-Approved)

### Values over Places

**Good:** We track immutable values (revision numbers, timestamps) rather than mutating boolean flags.

```typescript
// ✅ Value-oriented: Compare revisions
const hasUnsavedChanges =
  document.state.revision !== (lastSavedRevision ?? -1)

// ❌ Place-oriented: Mutate dirty flag
// hasUnsavedChanges = true  // When does it become false?
```

**Why:** Values share safely. Places require coordination. By comparing revision values, we can compute unsaved state without synchronization bugs.

### Single Source of Truth

**Good:** DocumentContext owns all save state metadata.

```typescript
interface DocumentContextType {
  // Domain state
  document: TEIDocument | null
  validationResults: ValidationResult | null

  // Save metadata (NEW)
  lastSavedRevision: number | null
  lastSavedAt: Date | null
}
```

**Avoid:** Spread save state across editorState, useEditorUI, and local component state. This creates entanglement.

### Explicit Time Modeling

**Good:** Each save produces a new timestamp value. We can see the history.

```typescript
// Succession of save events
Save #1: revision=5, lastSavedAt=10:30 AM
Save #2: revision=8, lastSavedAt=10:35 AM
Save #3: revision=12, lastSavedAt=10:42 AM
```

**Why:** Time as value enables debugging ("when did I last save?") and audit trails.

### Composability

**Good:** StatusBar is self-contained with clear protocol boundary.

```typescript
export interface StatusBarProps {
  documentName?: string
  hasUnsavedChanges: boolean
  validationErrors?: number
  validationWarnings?: number
  isValidating: boolean
  lastSaved?: Date
}
```

**Why:** Can test StatusBar independently. Can swap implementations without changing consumers. Clear contract.

## Implementation Plan

### Phase 1: DocumentContext Extensions

**File:** `lib/context/DocumentContext.tsx`

1. Add save metadata to interface:
```typescript
export interface DocumentContextType {
  // ... existing fields
  /** Last successfully saved revision */
  lastSavedRevision: number | null;
  /** Timestamp of last save */
  lastSavedAt: Date | null;
}
```

2. Initialize in useDocumentService:
```typescript
const docService = useDocumentService();
// Add:
lastSavedRevision: docService.lastSavedRevision ?? null,
lastSavedAt: docService.lastSavedAt ?? null,
```

3. Update on successful save:
```typescript
// After updateDocument() succeeds
lastSavedRevision = document.state.revision;
lastSavedAt = new Date();
```

### Phase 2: EditorLayout Integration

**File:** `components/editor/EditorLayout.tsx`

1. Extract data from context:
```typescript
const { document, lastSavedRevision, lastSavedAt, validationResults, isValidating } = useDocumentContext();

// Compute unsaved changes
const hasUnsavedChanges = document && document.state.revision !== (lastSavedRevision ?? -1);
```

2. Add StatusBar to render:
```typescript
return (
  <div className="h-screen flex flex-col">
    <EditorToolbar ... />
    <div className="flex-1 flex overflow-hidden">
      <EditorContent ... />
      <EditorPanels ... />
    </div>
    <StatusBar
      documentName={document?.id || 'Untitled Document'}
      hasUnsavedChanges={hasUnsavedChanges}
      validationErrors={validationResults?.errors?.length || 0}
      validationWarnings={validationResults?.warnings?.length || 0}
      isValidating={isValidating}
      lastSaved={lastSavedAt}
    />
  </div>
);
```

### Phase 3: Toggle Functionality

**File:** `components/editor/hooks/useEditorUI.ts` (or equivalent)

1. Add to panelStates:
```typescript
const [statusBarOpen, setStatusBarOpen] = useState(() => {
  const saved = localStorage.getItem('tei-editor-status-bar-visible');
  return saved !== 'false'; // Default: true
});
```

2. Add toggle function:
```typescript
const toggleStatusBar = useCallback(() => {
  setStatusBarOpen(prev => {
    const newValue = !prev;
    localStorage.setItem('tei-editor-status-bar-visible', String(newValue));
    return newValue;
  });
}, []);
```

3. Add to EditorLayout render:
```typescript
{statusBarOpen && <StatusBar ... />}
```

### Phase 4: Keyboard Shortcut

**File:** `components/editor/hooks/useKeyboardShortcuts.ts`

1. Add ⌘/ (Cmd+Slash) handler:
```typescript
onToggleStatusBar: () => {
  editorUI.toggleStatusBar();
  editorUI.showToast('Status Bar ' + (editorUI.panelStates.statusBarOpen ? 'shown' : 'hidden'), 'info');
}
```

2. Wire through EditorLayout:
```typescript
useKeyboardShortcuts({
  // ... existing shortcuts
  onToggleStatusBar: editorUI.toggleStatusBar,
});
```

### Phase 5: Toolbar Menu Option

**File:** `components/editor/EditorToolbar.tsx`

1. Add toggle button:
```typescript
<Button
  variant={statusBarOpen ? 'default' : 'outline'}
  size="sm"
  onClick={onToggleStatusBar}
  title="Toggle status bar visibility (⌘/)"
>
  Status Bar
</Button>
```

2. Wire through props:
```typescript
<EditorToolbar
  statusBarOpen={editorUI.panelStates.statusBarOpen}
  onToggleStatusBar={editorUI.toggleStatusBar}
  // ... other props
/>
```

## Testing Strategy

### Unit Tests

1. **DocumentContext extensions:**
   - `lastSavedRevision` updates on successful save
   - `lastSavedAt` updates on successful save
   - Values persist across context updates

2. **StatusBar component:**
   - Renders document name correctly
   - Shows "Unsaved" badge when `hasUnsavedChanges=true`
   - Displays validation error count
   - Formats timestamp correctly ("Saved 5m ago")

3. **EditorLayout integration:**
   - Computes `hasUnsavedChanges` correctly from revisions
   - Passes correct props to StatusBar
   - Toggles visibility on shortcut

### Integration Tests

1. **Save workflow:**
   - Edit document → `hasUnsavedChanges=true`
   - Save document → `hasUnsavedChanges=false`, `lastSavedAt` updated
   - Edit again → `hasUnsavedChanges=true` with new revision

2. **Toggle workflow:**
   - ⌘/ hides StatusBar
   - ⌘/ shows StatusBar
   - Persists across page reloads (localStorage)

3. **Validation workflow:**
   - Valid doc: Shows "Valid" with checkmark
   - Invalid doc: Shows "X errors" with alert icon
   - Validating: Shows "Validating..." spinner

### E2E Tests

1. **Full user flow:**
   - Load document → StatusBar shows "Untitled", "Not saved"
   - Edit text → StatusBar shows "Unsaved changes"
   - Apply tag → StatusBar shows "Unsaved changes"
   - Fix errors → StatusBar shows "Valid"
   - Save → StatusBar shows "Saved just now"

## Migration Path

**Breaking Changes:** None

**New Dependencies:** None (StatusBar component already exists)

**Backward Compatibility:** All existing code works. StatusBar is additive.

**Rollback:** If issues arise, remove StatusBar rendering from EditorLayout and revert DocumentContext changes.

## Success Criteria

1. ✅ StatusBar displays at bottom of EditorLayout
2. ✅ Shows document name, unsaved status, validation errors, save status
3. ✅ Toggles via ⌘/ keyboard shortcut
4. ✅ Toggles via toolbar button
5. ✅ Persists visibility preference to localStorage
6. ✅ Accurately tracks unsaved changes (revision comparison)
7. ✅ Updates timestamp on save
8. ✅ No performance regression (rendering is fast)

## Future Enhancements

**Nice-to-have (post-MVP):**
1. Collapsible toolbar sections (group related buttons)
2. Responsive design adjustments (collapse buttons on small screens)
3. Click validation errors to navigate to issues
4. Show entity count when entities panel is closed
5. Customizable status bar items (user chooses what to show)

## References

- StatusBar component: `components/editor/StatusBar.tsx`
- DocumentContext: `lib/context/DocumentContext.tsx`
- EditorLayout: `components/editor/EditorLayout.tsx`
- Keyboard shortcuts: `components/editor/hooks/useKeyboardShortcuts.ts`
- Rich Hickey review: Principles of simplicity, values over places, explicit time modeling
