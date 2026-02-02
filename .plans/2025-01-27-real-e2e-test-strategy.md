# Real E2E Test Strategy for TEI Dialogue Editor

**Date:** 2025-01-27
**Author:** Comprehensive App Analysis
**Status:** Ready for Implementation

---

## Phase 1 Findings: Real Application Architecture

### 1. ACTUAL User Flows

#### First Load Experience
1. App loads with `DocumentProvider` wrapping `EditorLayout`
2. `EditorLayout` has `useEffect` that **auto-loads** `gift-of-the-magi` sample on first mount
3. Once loaded, the gallery is hidden (`setShowGallery(false)`)
4. User immediately sees the editor with:
   - Top toolbar with: Back to Gallery, AI Mode Switcher, Tag Toolbar, Bulk Operations, Visualizations buttons
   - Main split view: Rendered View (left) and TEI Source (right)
   - File Upload button at the very top

#### Document Loading
Users have THREE ways to load documents:

1. **Auto-load on first visit**: `gift-of-the-magi` loads automatically
2. **Sample Gallery**: Click "Load Sample" button on any sample card
   - Available samples:
     - `yellow-wallpaper`
     - `gift-of-the-magi`
     - `tell-tale-heart`
     - `owl-creek-bridge`
     - `pride-prejudice-ch1`
3. **File Upload**: Click "Upload TEI File" button
   - Triggers hidden file input: `type="file" accept=".xml,.txt"`
   - File is read as text and loaded via `loadDocument(text)`

#### Back to Gallery
- Click "← Back to Gallery" button
- Calls `clearDocument()` and `setShowGallery(true)`
- Returns to sample gallery view

#### Annotation Workflow

**Current Reality:**
- The app has a `TagToolbar` that appears when text is selected
- It shows floating buttons for `<said>`, `<q>`, `<persName>` tags
- However, the actual tagging is **NOT YET IMPLEMENTED** (see line 193: `// TODO: Implement actual TEI tagging in future task`)
- The `handleApplyTag` just logs to console

**What Users CAN Do:**
1. View passages in Rendered View (split into sentences)
2. Select passages in bulk mode
3. See passage IDs and metadata
4. View TEI source (read-only)
5. Use AI modes (suggest/auto) which detect quoted text

#### Bulk Operations
- Toggle with "Bulk Operations" button or `Cmd+B` / `Ctrl+B`
- Select passages by clicking them
- Shift+click for range selection
- Operations available:
  - Tag all as speaker (dropdown with Speaker 1, 2, 3, Narrator)
  - Select All Untagged
  - Select Low Confidence (<70%)
  - Validate Selection
  - Export Selection (JSON)
  - Convert to Dialogue

#### AI Features
Three modes accessed via `AIModeSwitcher`:
1. **Manual** (Alt+M): No AI detection
2. **AI Suggest** (Alt+S): Shows suggestions, user must accept/reject
3. **AI Auto** (Alt+A): Automatically applies detections

**Current AI Implementation:**
- Simple regex detection: `/"([^"]+)"/g` (finds quoted text)
- Random confidence 0.7-0.95
- Shows in `InlineSuggestions` panel above rendered view
- Accept/Reject buttons with ARIA labels

#### Visualizations
Toggle with "Visualizations" button
- Two tabs: "Network" and "Statistics"
- **Character Network**: ReactFlow graph showing speaker interactions
- **Dialogue Stats**: Shows total dialogue passages and chapters
- Only visible when document has dialogue data

#### Keyboard Shortcuts
- `Cmd+K` / `Ctrl+K`: Open command palette
- `Cmd+B` / `Ctrl+B`: Toggle bulk operations panel
- `Alt+M`: Switch to Manual mode
- `Alt+S`: Switch to AI Suggest mode
- `Alt+A`: Switch to AI Auto mode

#### Command Palette
- Opens with `Cmd+K`
- Currently minimal implementation
- Has "Save document" and "Export TEI" items (both TODO/not implemented)
- Uses `cmdk` library

---

## 2. REAL Selectors Map

### Button Selectors

#### By Text Content (Most Reliable)
- "Upload TEI File"
- "← Back to Gallery"
- "Manual", "AI Suggest", "AI Auto" (AI mode buttons)
- "Bulk Operations" (with count in parentheses)
- "Visualizations"
- "Load Sample" (on sample cards)
- "Select All", "Deselect All" (in bulk mode)
- "Tag Selected Passages"
- "Select All Untagged"
- "Select Low Confidence"
- "Validate Selection"
- "Export Selection"
- "Convert to Dialogue"

#### By ARIA Labels (Where Available)
- AI mode buttons have `title` attributes with mode name and shortcut
- Inline suggestion buttons: `aria-label="Accept suggestion: {text}"` and `aria-label="Reject suggestion: {text}"`

#### By Role
- `role="list"` for AI suggestions container
- `role="listitem"` for individual suggestions

### Content Selectors

#### Heading Text
- "Welcome to TEI Dialogue Editor" (gallery view)
- "Rendered View" (editor view)
- "TEI Source" (editor view)
- "Character Network" (visualization)
- "Dialogue Statistics" (visualization)

#### Sample Cards
- Each card has title text: "The Yellow Wallpaper", "The Gift of the Magi", etc.
- Author text: "Charlotte Perkins Gilman", "O. Henry", etc.
- Difficulty badges: "Beginner", "Intermediate", "Advanced"

#### Passage Elements
- Passage content in paragraphs with text
- Passage IDs: "ID: passage-{index}"
- Speaker badges (when tagged)
- Confidence badges (when AI-detected)

### Form Elements
- File input: `input[type="file"]` (hidden, triggered by button)
- Speaker dropdown in bulk panel: `<select>` with options
- Checkboxes for passage selection in bulk mode: `input[type="checkbox"]`

### Tab Selectors
- Visualization tabs: button text "Network", "Statistics"
- Tabs are in `TabsList` component

---

## 3. Test Architecture

### File Structure
```
tests/e2e/
├── tei-editor-real.spec.ts  (Main test suite)
├── helpers/
│   ├── editor-helpers.ts    (Reusable editor interactions)
│   └── assertions.ts        (Custom assertions)
└── fixtures/
    └── test-documents.xml   (Test TEI documents)
```

### Test Organization
1. **Setup & Configuration**: Single `beforeEach` to navigate to app
2. **Gallery Tests**: Sample loading, card interactions
3. **Editor Tests**: Document viewing, navigation
4. **Bulk Operations Tests**: Selection, tagging, validation
5. **AI Mode Tests**: Mode switching, suggestion handling
6. **Visualization Tests**: Network, statistics
7. **File Upload Tests**: Custom file loading
8. **Keyboard Shortcut Tests**: All documented shortcuts
9. **Export Tests**: Selection export (note: full export not implemented)

### Page Object Model
Create helper classes for:
- `EditorPage`: Main editor interactions
- `GalleryPage`: Sample gallery interactions
- `BulkPanel`: Bulk operations panel
- `AISuggestions`: AI suggestion handling

---

## 4. Critical Paths (MUST Test vs Nice-to-Have)

### MUST Test (Critical User Journeys)
1. ✅ **App loads successfully** - Basic smoke test
2. ✅ **Auto-load default sample** - Verifies first-load experience
3. ✅ **Load different samples** - Core feature
4. ✅ **Back to Gallery navigation** - User workflow
5. ✅ **Bulk mode toggle** - Core feature
6. ✅ **Passage selection** - Core interaction
7. ✅ **AI mode switching** - Core feature
8. ✅ **Visualizations toggle** - Core feature
9. ✅ **Keyboard shortcuts** - Core UX
10. ✅ **File upload** - Important feature

### SHOULD Test (Important but Less Critical)
1. **Passage selection details** - Shift+click, Select All, Deselect All
2. **AI suggestions display** - Verify suggestions appear in non-manual mode
3. **Visualization tabs** - Network and Statistics views
4. **TEI source display** - Verify source is shown
5. **Sample card metadata** - Verify difficulty badges, counts

### NICE TO Test (Edge Cases)
1. **Error handling** - Invalid file upload, failed sample load
2. **Accessibility** - ARIA labels, keyboard navigation
3. **Responsive design** - Different viewport sizes
4. **Performance** - Large document handling

### CANNOT Test Yet (Not Implemented)
1. **Actual TEI tagging** - `handleApplyTag` is TODO
2. **Command palette actions** - Save/Export are TODO
3. **ExportButton component** - Not rendered in current layout (not imported)
4. **Tag toolbar functionality** - Only shows, doesn't apply tags
5. **Real AI dialogue detection** - Currently just regex on quotes

---

## 5. Known Limitations & Gotchas

### App Limitations
1. **ExportButton Not in Layout**: Component exists but isn't imported/used in EditorLayout
2. **Tagging Not Working**: `handleApplyTag` just logs to console
3. **Mock AI Detection**: Only finds text in quotes with random confidence
4. **Command Palette Incomplete**: Items don't do anything yet
5. **No Real Save/Export**: Only selection export to JSON works

### Testing Challenges
1. **No data-testid Attributes**: Must rely on text content and ARIA labels
2. **Tailwind Classes**: Unstable for selectors (generated classes)
3. **Auto-load on Mount**: Tests must account for automatic sample loading
4. **Async Sample Loading**: Uses `fetch()` - need to wait for network idle
5. **Panel State**: Bulk/Visualization panels are conditionally rendered

### Selector Stability
- ✅ **STABLE**: Button text, headings, ARIA labels
- ❌ **UNSTABLE**: Tailwind classes (e.g., `bg-primary/10`, `hover:bg-muted/50`)
- ⚠️ **CONDITIONAL**: Passage IDs change based on document
- ⚠️ **DYNAMIC**: Bulk Operations button shows count: "Bulk Operations (3)"

### Timing Considerations
- Sample loading: `fetch('/samples/{id}.xml')` - wait for network idle
- AI detection: Runs in `useEffect` - may need small wait after mode switch
- Panel animations: CSS transitions - may need brief wait
- File upload: Immediate but document parsing takes time

---

## 6. Test Implementation Strategy

### Selector Priority Order
1. **Text content** (getByText, getByRole with text)
2. **ARIA labels** (getByLabelText)
3. **Role selectors** (getByRole with name)
4. **CSS selectors** (last resort, only for stable classes like `btn`)

### Wait Strategies
1. **Network idle**: After sample loading
2. **Element visible**: For panels and modals
3. **Text visible**: For content updates
4. **Timeout fallback**: Only for unavoidable cases (documented)

### Test Data
- Use real sample files from `/public/samples/`
- Create minimal TEI fixture for edge cases
- Test file upload with both valid and invalid files

### Assertion Strategy
1. **Visible text**: Most reliable for content
2. **Element presence**: For UI components
3. **Element state**: Disabled/enabled, visible/hidden
4. **Counts**: Number of passages, selected items
5. **Attributes**: ARIA labels, classes (when stable)

---

## 7. Success Criteria

### Test Coverage Goals
- 10-15 realistic tests covering critical paths
- All tests passing consistently
- No flaky tests due to timing issues
- Clear test names describing user actions
- Good error messages when tests fail

### Maintainability Goals
- Helper functions for common actions
- Clear comments explaining selector choices
- Page Object pattern for major components
- Easy to extend for new features

### Documentation Goals
- Each test explains WHAT it tests and WHY
- Comments on selector stability
- Notes on app limitations discovered
- Suggestions for future test additions

---

## 8. Next Steps

1. ✅ **Phase 1 Complete**: App exploration finished
2. ✅ **Phase 2 Complete**: This strategy document created
3. **Phase 3**: Implement test suite in `tests/e2e/tei-editor-real.spec.ts`
4. **Phase 4**: Fix any app bugs discovered during testing

---

**Notes for Future Maintenance:**
- When adding new features, add corresponding tests
- Update this document when UI changes significantly
- Add data-testid attributes for better testability
- Consider implementing the TODO features (tagging, export) to enable more comprehensive testing
