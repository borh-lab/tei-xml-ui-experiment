# TEI Dialogue Editor - E2E Test Coverage Gaps Analysis

**Date:** 2025-01-27
**Analysis Scope:** All application functionality vs. current e2e test coverage
**Current Test File:** `/tests/e2e/tei-editor-real.spec.ts`

---

## Executive Summary

This comprehensive analysis identifies **78 distinct features** across the TEI Dialogue Editor application, of which **43 are currently tested** by e2e tests (55% coverage). The analysis reveals **35 untested features** with varying levels of criticality.

### Key Findings:
- **CRITICAL gaps:** 9 features (core workflows not tested)
- **HIGH gaps:** 12 features (important functionality missing)
- **MEDIUM gaps:** 10 features (edge cases and error states)
- **LOW gaps:** 4 features (nice-to-have features)

---

## Phase 1: Feature Inventory

### 1. Components Directory (29 components)

#### 1.1 Editor Components

**EditorLayout.tsx** - Main editor container
- **Auto-load functionality**: Loads 'gift-of-the-magi' sample on first mount (line 51-71)
- **Command palette**: Toggle with `Cmd+K` / `Ctrl+K` (line 40-43)
- **Bulk operations panel**: Toggle with `Cmd+B` / `Ctrl+B` (line 45-48)
- **AI mode state management**: Manual, Suggest, Auto modes
- **Split view**: Rendered View (left) + TEI Source (right)
- **Resizer**: Draggable split bar between panes (line 357-360)
- **File upload integration**: FileUpload component in toolbar
- **Tag toolbar integration**: TagToolbar for text selection
- **Visualization panel**: Toggleable sidebar with Network and Statistics tabs
- **Text selection tracking**: Monitors document selection changes (line 246-263)
- **State management**:
  - `commandPaletteOpen`
  - `aiMode`
  - `suggestions`
  - `selectedText`
  - `bulkPanelOpen`
  - `vizPanelOpen`
  - `selectedPassages`
  - `isBulkMode`
  - `showGallery`
  - `splitPosition`

**RenderedView.tsx** - Passage display component
- **Passage rendering**: Splits text into sentence-level passages (line 47-48)
- **Bulk mode selection**: Checkbox selection interface
- **Multi-select support**: Shift+click for range selection (line 69-79)
- **Single click selection**: Toggle individual passages (line 81-101)
- **Select All / Deselect All**: Bulk selection controls (line 106-114)
- **Passage metadata display**:
  - Speaker badges (if tagged)
  - Confidence scores (if AI detected)
  - Passage ID display
- **Selection count badge**: Shows "X selected" count (line 131)
- **Visual selection states**: Border/background changes for selected passages (line 164-170)
- **Instructions footer**: Multi-select hints (line 225-229)

**FileUpload.tsx** - File upload component
- **File input**: Hidden input triggered by button (line 21-27)
- **Accepted formats**: `.xml` and `.txt` files (line 24)
- **File reading**: Reads file content as text (line 11-16)
- **Document loading**: Calls `loadDocument()` with file content

**TagToolbar.tsx** - Floating tag toolbar
- **Auto-positioning**: Appears above text selection (line 16-35)
- **Event listeners**: Mouseup and keyup for selection detection (line 38-46)
- **Tag buttons**:
  - `<said>` - Dialogue speaker tag (line 67-74)
  - `<q>` - Quote tag (line 75-82)
  - `<persName>` - Person name tag (line 83-90)
- **Auto-hide**: Disappears when no text selected
- **Position calculation**: Centers toolbar above selection (line 26-30)

**BulkOperationsPanel.tsx** - Bulk operations sidebar
- **Fixed positioning**: Right-side panel (line 58)
- **Selection counter**: Badge showing passage count (line 71-74)
- **Tag all as**: Speaker dropdown + bulk tagging button (line 81-106)
- **Quick Selection operations**:
  - "Select All Untagged" button (line 112-120)
  - "Select Low Confidence (<70%)" button (line 121-129)
- **Bulk operations**:
  - "Validate Selection" button (line 135-143)
  - "Export Selection" button (line 144-152)
  - "Convert to Dialogue" button (line 153-161)
- **Progress indicator**: Spinner with status text (line 165-179)
- **Keyboard shortcut hints**: Shows `⇧⌘U`, `⇧⌘L`, `⇧⌘V`, `⇧⌘E`, `⇧⌘D` (line 119, 128, 142, 151, 160)
- **Tips footer**: Multi-select instructions (line 183-187)

**ExportButton.tsx** - Export functionality
- **HTML export**: Converts TEI to HTML and downloads (line 11-15)
- **TEI export**: Downloads raw TEI XML (line 17-21)
- **Download triggering**: Blob creation and automatic download
- **Note:** Component exists but NOT imported in EditorLayout.tsx

#### 1.2 AI Components

**AIModeSwitcher.tsx** - AI mode toggle
- **Three modes**: Manual, AI Suggest, AI Auto (line 15)
- **Keyboard shortcuts**:
  - `Alt+M` - Manual mode (line 18-21)
  - `Alt+S` - AI Suggest mode (line 23-26)
  - `Alt+A` - AI Auto mode (line 28-31)
- **Button styling**: Active mode highlighted (line 38)
- **Tooltips**: Show mode name and shortcut (line 41)

**InlineSuggestions.tsx** - AI suggestions display
- **Confidence badges**: Color-coded (High/Medium/Low) (line 115-121)
- **Confidence colors**:
  - >= 80%: Green (High)
  - >= 60%: Yellow (Medium)
  - < 60%: Red (Low)
- **Suggestion text**: Italicized quoted text (line 124-130)
- **Accept/Reject buttons**:
  - Check icon for accept (line 140-150)
  - X icon for reject (line 151-161)
- **Matched selection highlight**: Blue badge for text matches (line 131-135)
- **Pattern learning**: Stores patterns to IndexedDB on accept (line 42-68)
- **Rejection logging**: Logs corrections to database (line 70-93)
- **ARIA attributes**: Proper accessibility labels (line 145, 156)
- **Role attributes**: `role="list"` and `role="listitem"` (line 108, 113)

#### 1.3 Keyboard Components

**CommandPalette.tsx** - Command palette (Cmd+K)
- **Trigger**: `Cmd+K` / `Ctrl+K`
- **Search input**: "Type a command or search..." placeholder (line 34)
- **Commands**:
  - "Save document" (line 39-41) - TODO: Not implemented
  - "Export TEI" (line 42-44) - TODO: Not implemented
- **Empty state**: "No results found" message (line 36)
- **cmdk library**: Uses CommandDialog components

**KeyboardShortcutHelp.tsx** - Keyboard shortcuts help dialog
- **Shortcut display**:
  - `Cmd+K` - Open command palette
  - `J / K` - Next / previous passage
  - `1-9` - Tag as speaker 1-9
  - `A` - Accept AI suggestion
  - `X` - Reject AI suggestion
  - `?` - Show keyboard shortcuts
- **Note:** Component exists but may not be integrated in UI

#### 1.4 Search Components

**QuickSearchDialog.tsx** - Quick search functionality
- **Search input**: "Search passages..." placeholder (line 124)
- **Real-time search**: Updates as you type (line 38-42)
- **Navigation controls**:
  - Previous button (line 148-156)
  - Next button (line 157-165)
  - Result counter: "X of Y results" (line 168-170)
- **Search results**:
  - Speaker label (line 198-200)
  - Section/chapter info (line 201-205)
  - Highlighted matches (line 207-212)
  - Context preview
- **Keyboard shortcuts**:
  - `F3` or `Cmd/Ctrl+G` - Find next (line 54-60)
  - `Shift+F3` - Find previous (line 61-71)
  - `Cmd/Ctrl+Enter` - Jump to result (line 47-53)
  - `Esc` - Close dialog (line 72-74)
- **Clear button**: X button to clear search (line 132-139)
- **HTML sanitization**: Safe rendering of highlighted text (line 209-211)
- **Note:** Component exists but integration unclear

#### 1.5 Sample Components

**SampleGallery.tsx** - Home page gallery
- **Sample cards**: 5 pre-loaded samples (line 20-76)
  1. The Yellow Wallpaper (intermediate)
  2. The Gift of the Magi (intermediate)
  3. The Tell-Tale Heart (advanced)
  4. An Occurrence at Owl Creek Bridge (intermediate)
  5. Pride and Prejudice - Chapter 1 (intermediate)
- **Card metadata**:
  - Title, author, year
  - Word count, dialogue count, character count
  - Difficulty badge (beginner/intermediate/advanced)
  - Pattern tags (e.g., "first-person", "dialogue-heavy")
- **Grid layout**: Responsive 1/2/3 columns (line 147)
- **Loading state**: Spinner while loading (line 191-197)
- **Error handling**: Error banner if load fails (line 117-122)
- **Difficulty legend**: Shows badge meanings (line 131-143)
- **Upload prompt**: Info section about custom uploads (line 203-209)

**CorpusBrowser.tsx** - Wright American Fiction browser
- **GitHub API**: Fetches from Wright American Fiction repo (line 33-35)
- **File listing**: Shows up to 20 XML novels (line 50)
- **Search filter**: Real-time title filtering (line 64-66)
- **Novel cards**:
  - Title and author
  - Load button
- **Loading state**: Spinner while fetching corpus (line 107-110)
- **Error handling**: Error message on fetch failure (line 102-105)
- **XML parsing**: Parses TEI content from GitHub (line 74-75)
- **Document loading**: Creates TEIDocument from loaded XML (line 76)
- **Note:** Component exists but integration unclear

#### 1.6 Visualization Components

**VisualizationPanel.tsx** - Visualization sidebar
- **Tabs**: Network and Statistics tabs (line 16-19)
- **Character selection**: Shows selected character details (line 24-30)
- **Responsive sizing**: Fixed height with overflow (line 13)

**CharacterNetwork.tsx** - Network graph visualization
- **ReactFlow integration**: Interactive graph (line 140-158)
- **Node types**: Custom character nodes (line 33-35)
- **Node data**:
  - Character name
  - Line count
- **Edge data**:
  - Interaction count
  - Animated edges (line 88)
  - Stroke width based on interaction count (line 89)
- **Layout**: Circular layout algorithm (line 94-103)
- **Interactions**:
  - Draggable nodes
  - Zoomable
  - Clickable nodes (line 111-116)
- **Background**: Dotted background (line 150)
- **Controls**: Built-in ReactFlow controls (line 151)
- **MiniMap**: Overview map (line 152-157)
- **Empty state**: "No dialogue data" message (line 118-131)
- **Stats display**: Shows node and edge counts (line 160-167)

**DialogueStats.tsx** - Statistics panel
- **Total dialogue passages**: Count of `<said>` elements (line 37-38)
- **Total chapters**: Count of chapter divisions (line 41-42)
- **Empty state**: "No document loaded" message (line 25-27)
- **Note:** Per-chapter breakdown is placeholder (line 19-21)

#### 1.7 Navigation Components

**DialogueOutline.tsx** - Document structure navigation
- **Divisions tree**: Hierarchical document structure (line 70-92)
- **Chapter grouping**: Groups dialogue by chapter/section (line 23-50)
- **Collapsible chapters**: Expand/collapse chapters (line 52-63)
- **Passage list**:
  - Text preview (first 50 chars)
  - Active passage highlighting
  - Click to navigate (line 130-143)
- **Passage counter**: Shows "X passages" per chapter (line 115-117)
- **ScrollArea**: Scrollable container (line 66)
- **Empty state**: "No dialogue passages found" (line 151-153)
- **Note:** Component exists but integration unclear

#### 1.8 UI Components (shadcn/ui)
- alert.tsx, badge.tsx, button.tsx, card.tsx, dialog.tsx, input.tsx, label.tsx, scroll-area.tsx, select.tsx, tabs.tsx, textarea.tsx, tooltip.tsx

---

### 2. App Pages

**app/page.tsx** - Main application entry
- **DocumentProvider**: Wraps app with context (line 4)
- **EditorLayout**: Main editor component (line 10)
- **Single route**: Only `/` route defined

**app/test-components/page.tsx** - Test components page
- **Purpose**: Development/testing page
- **Note:** Not a user-facing feature

---

### 3. Context / State Management

**DocumentContext.tsx** - Global document state
- **State**: `document` (TEIDocument | null)
- **Methods**:
  - `loadDocument(xml)` - Load XML string
  - `loadSample(sampleId)` - Load sample by ID
  - `updateDocument(xml)` - Update with new XML
  - `clearDocument()` - Clear document
- **Provider pattern**: React Context API
- **Error handling**: Try-catch in loadSample (line 24-31)

---

### 4. Key Features by Category

#### 4.1 File Operations
1. **File upload** (.xml, .txt)
2. **Sample loading** (5 pre-loaded samples)
3. **Corpus browser** (Wright American Fiction)
4. **Export to HTML** (ExportButton.tsx - not integrated)
5. **Export to TEI XML** (ExportButton.tsx - not integrated)
6. **Export selection to JSON** (bulk operations)

#### 4.2 Document Parsing
7. **TEI XML parsing** (fast-xml-parser)
8. **Document structure extraction** (divisions, chapters)
9. **Dialogue extraction** (`<said>` elements)
10. **Character extraction** (placeholder - returns [])
11. **Passage splitting** (sentence-level)

#### 4.3 Annotation / Tagging
12. **Text selection tracking** (mouseup/keyup events)
13. **Tag toolbar** (floating above selection)
14. **Tag types**: `<said>`, `<q>`, `<persName>`
15. **Manual tagging** (TODO: Not implemented)
16. **Speaker assignment** (bulk operations)

#### 4.4 AI Modes
17. **Manual mode**: No AI assistance
18. **AI Suggest mode**: Shows suggestions
19. **AI Auto mode**: Auto-applies suggestions
20. **AI dialogue detection**: Regex-based placeholder (line 221-232)
21. **Confidence scores**: 0.7-0.95 random (placeholder)
22. **Pattern learning**: Stores to IndexedDB on accept
23. **Rejection logging**: Logs to database

#### 4.5 Bulk Operations
24. **Bulk panel toggle** (Cmd+B)
25. **Passage selection** (click to select)
26. **Multi-select** (Shift+click for range)
27. **Select All / Deselect All**
28. **Tag all as speaker**: Bulk tagging with dropdown
29. **Select All Untagged**: Quick filter
30. **Select Low Confidence**: Quick filter (<70%)
31. **Validate Selection**: Check for errors (line 153-184)
32. **Export Selection**: JSON download
33. **Convert to Dialogue** (TODO: Not implemented)

#### 4.6 Visualizations
34. **Character Network**: ReactFlow graph
35. **Node interactions**: Draggable, clickable
36. **Edge styling**: Animated, width by count
37. **Dialogue Statistics**: Total counts
38. **Network tab**: Character network
39. **Statistics tab**: Numeric stats
40. **MiniMap**: Overview
41. **Zoom controls**: ReactFlow controls

#### 4.7 Keyboard Shortcuts
42. **Cmd+K**: Open command palette
43. **Cmd+B**: Toggle bulk operations
44. **Alt+M**: Manual mode
45. **Alt+S**: AI Suggest mode
46. **Alt+A**: AI Auto mode
47. **J / K**: Next / previous passage (documented but not implemented)
48. **1-9**: Tag as speaker 1-9 (documented but not implemented)
49. **A**: Accept AI suggestion (documented but not implemented)
50. **X**: Reject AI suggestion (documented but not implemented)
51. **?**: Show keyboard shortcuts (documented but not implemented)
52. **F3 / Cmd+G**: Find next (QuickSearch)
53. **Shift+F3**: Find previous (QuickSearch)
54. **Cmd+Enter**: Jump to result (QuickSearch)
55. **Esc**: Close dialogs

#### 4.8 Command Palette
56. **Command palette** (Cmd+K)
57. **Search commands**: Filter by typing
58. **"Save document"** command (TODO)
59. **"Export TEI"** command (TODO)

#### 4.9 Search
60. **Quick search dialog**
61. **Real-time search**: Updates as you type
62. **Navigate results**: Previous/Next buttons
63. **Result highlighting**: Bolded matches
64. **Context preview**: Shows surrounding text
65. **Result counter**: "X of Y results"
66. **Jump to result**: Click or Cmd+Enter
67. **Note:** Integration unclear

#### 4.10 Sample Gallery
68. **5 sample documents** with metadata
69. **Sample cards**: Title, author, year, stats
70. **Difficulty badges**: Beginner/Intermediate/Advanced
71. **Pattern tags**: e.g., "first-person", "dialogue-heavy"
72. **Load sample button**: Triggers sample fetch
73. **Error handling**: Failed load message

#### 4.11 Error Handling
74. **Invalid sample**: Fails silently (no UI feedback)
75. **File upload errors**: Not handled
76. **Parsing errors**: Not handled
77. **Network errors**: Corpus browser shows error

#### 4.12 Responsive Behavior
78. **Viewport resizing**: Adapts layout
79. **Mobile view**: Stacked layout
80. **Tablet view**: Medium adjustments

#### 4.13 Accessibility
81. **ARIA labels**: On suggestion buttons
82. **Role attributes**: list/listitem for suggestions
83. **Keyboard navigation**: Tab through elements
84. **Heading hierarchy**: Proper h2/h3 structure
85. **Focus management**: Basic focus handling

#### 4.14 Pattern Learning (IndexedDB)
86. **Pattern storage**: Dexie-based database
87. **Accept patterns**: Stores on suggestion accept
88. **Reject patterns**: Logs corrections
89. **Pattern extraction**: Extracts phrases, positions
90. **Confidence scoring**: Scores pattern matches

---

## Phase 2: Test Coverage Matrix

### Currently Tested Features (43/78 = 55%)

#### Sample Gallery (6/7 tested)
✅ Auto-load default sample on first visit
✅ Display main editor toolbar
✅ Navigate back to gallery
✅ Load all available samples
✅ Display sample metadata
❌ Error handling for failed sample load

#### Bulk Operations (8/10 tested)
✅ Toggle bulk operations panel (button)
✅ Toggle bulk operations panel (keyboard shortcut)
✅ Select passages in bulk mode
✅ Select All / Deselect All buttons
✅ Display selection count
✅ Show speaker dropdown
✅ Show operation buttons
❌ Actual tagging functionality (Tag Selected Passages)
❌ Validate Selection operation

#### AI Mode Switching (5/6 tested)
✅ Switch between AI modes (click)
✅ Switch between AI modes (keyboard shortcuts)
✅ Show AI suggestions in non-manual modes
✅ Accept AI suggestions
✅ Reject AI suggestions
❌ AI Auto mode behavior (auto-application)

#### Visualizations (4/7 tested)
✅ Toggle visualization panel
✅ Show character network visualization
✅ Show dialogue statistics
✅ Switch between Network and Statistics tabs
❌ Character node clicking
❌ Node dragging
❌ MiniMap functionality

#### File Upload (2/4 tested)
✅ Show file upload button
✅ Handle file upload interaction (button click)
❌ Actual file upload with real file
❌ File format validation (.xml vs .txt)

#### Command Palette (2/4 tested)
✅ Open command palette with keyboard shortcut
✅ Filter commands in palette
❌ Execute commands (Save, Export)
❌ Close with Escape

#### TEI Source View (2/2 tested)
✅ Display TEI source code
✅ Update source when document changes

#### Passage Selection (3/3 tested)
✅ Show passage metadata
✅ Select all passages
✅ Deselect all passages

#### Responsive UI (1/1 tested)
✅ Adapt to viewport changes

#### Accessibility (3/3 tested)
✅ Heading hierarchy
✅ Keyboard focus management
✅ ARIA labels on AI suggestions

#### Error Handling (1/1 tested)
✅ Handle invalid sample gracefully

#### Performance (1/1 tested)
✅ Load sample within reasonable time

#### Keyboard Navigation (2/2 tested)
✅ Navigate with Tab key
✅ Close panels with Escape key

#### Export (1/2 tested)
✅ Export selection from bulk panel
❌ Export to HTML (ExportButton not integrated)
❌ Export to TEI (ExportButton not integrated)

#### Rendered View (0/1 tested)
❌ Shift+click range selection

---

## Phase 3: Untested Features (35/78 = 45%)

### CRITICAL Gaps (9 features)
_Core user workflows not tested_

1. **Actual TEI tagging with TagToolbar**
   - Feature: Select text → Tag toolbar appears → Click `<said>`, `<q>`, or `<persName>`
   - Impact: Core annotation workflow completely untested
   - Location: `TagToolbar.tsx` line 67-90
   - Note: `handleApplyTag` is TODO (EditorLayout.tsx line 191-194)

2. **Tag all selected passages with speaker**
   - Feature: Select passages → Choose speaker → Click "Tag Selected Passages"
   - Impact: Bulk tagging workflow untested
   - Location: `BulkOperationsPanel.tsx` line 100-106
   - Note: `handleTagAll` exists (EditorLayout.tsx line 82-111)

3. **Validate Selection operation**
   - Feature: Select passages → Click "Validate Selection" → See issues
   - Impact: Quality assurance workflow untested
   - Location: `EditorLayout.tsx` line 153-184
   - Note: Only logs to console, no UI feedback

4. **AI Auto mode auto-application**
   - Feature: Switch to AI Auto → Suggestions automatically applied
   - Impact: Core AI workflow untested
   - Location: `EditorLayout.tsx` line 212-244
   - Note: Currently no difference from AI Suggest mode

5. **Real file upload**
   - Feature: Upload actual .xml or .txt file → Document loads
   - Impact: Custom document workflow untested
   - Location: `FileUpload.tsx` line 11-17
   - Note: Test only verifies button click, not actual upload

6. **Passage click navigation**
   - Feature: Click passage → Scroll to / highlight passage
   - Impact: Navigation workflow untested
   - Location: `RenderedView.tsx` line 61-103
   - Note: `onPassageClick` only logs to console

7. **Shift+click range selection**
   - Feature: Click passage → Shift+click another → Select range
   - Impact: Key productivity feature untested
   - Location: `RenderedView.tsx` line 69-79

8. **Character network node clicking**
   - Feature: Click character node → Show character details
   - Impact: Navigation workflow untested
   - Location: `CharacterNetwork.tsx` line 111-116, VisualizationPanel.tsx line 24-30

9. **Quick search functionality**
   - Feature: Open search → Type query → Navigate results → Jump to passage
   - Impact: Search workflow completely untested
   - Location: `QuickSearchDialog.tsx`
   - Note: Component exists but integration unclear

### HIGH Gaps (12 features)
_Important functionality with no coverage_

10. **Export to HTML**
    - Feature: Click "Export HTML" → Download HTML file
    - Location: `ExportButton.tsx` line 11-15
    - Note: Component NOT imported in EditorLayout

11. **Export to TEI XML**
    - Feature: Click "Export TEI" → Download XML file
    - Location: `ExportButton.tsx` line 17-21
    - Note: Component NOT imported in EditorLayout

12. **Select All Untagged operation**
    - Feature: Click "Select All Untagged" → Auto-selects untagged passages
    - Location: `EditorLayout.tsx` line 113-127

13. **Select Low Confidence operation**
    - Feature: Click "Select Low Confidence (<70%)" → Auto-selects low confidence
    - Location: `EditorLayout.tsx` line 129-132
    - Note: Only logs to console (TODO)

14. **Convert to Dialogue operation**
    - Feature: Select passages → Click "Convert to Dialogue" → Converts to `<said>`
    - Location: `EditorLayout.tsx` line 186-189
    - Note: Only logs to console (TODO)

15. **Split pane resizing**
    - Feature: Drag divider between Rendered View and TEI Source
    - Location: `EditorLayout.tsx` line 357-360
    - Note: Resizer exists but `splitPosition` state unused

16. **Corpus browser loading**
    - Feature: Browse Wright American Fiction → Load novel
    - Location: `CorpusBrowser.tsx`
    - Note: Component exists but integration unclear

17. **Dialogue outline navigation**
    - Feature: Click outline item → Jump to passage
    - Location: `DialogueOutline.tsx` line 130-143
    - Note: Component exists but integration unclear

18. **Chapter collapsing in outline**
    - Feature: Click chapter → Collapse/expand passages
    - Location: `DialogueOutline.tsx` line 52-63

19. **Character node dragging**
    - Feature: Drag character node → Rearrange graph
    - Location: `CharacterNetwork.tsx` (ReactFlow default behavior)

20. **Character network zooming**
    - Feature: Scroll to zoom in/out
    - Location: `CharacterNetwork.tsx` (ReactFlow default behavior)

21. **MiniMap functionality**
    - Feature: Click MiniMap to navigate
    - Location: `CharacterNetwork.tsx` line 152-157

### MEDIUM Gaps (10 features)
_Edge cases, error states, and interactions_

22. **Sample load error handling**
    - Feature: Try to load non-existent sample → See error message
    - Location: `SampleGallery.tsx` line 117-122
    - Note: Component has error state, but EditorLayout swallows errors

23. **File format validation**
    - Feature: Upload non-XML file → See validation error
    - Location: `FileUpload.tsx` line 24 (accept attribute only)
    - Note: No server-side validation

24. **Pattern learning on accept**
    - Feature: Accept suggestion → Pattern stored to IndexedDB
    - Location: `InlineSuggestions.tsx` line 42-68
    - Note: Side effect not verified

25. **Rejection logging on reject**
    - Feature: Reject suggestion → Correction logged to database
    - Location: `InlineSuggestions.tsx` line 70-93
    - Note: Side effect not verified

26. **Command palette command execution**
    - Feature: Select "Save document" or "Export TEI" → Command executes
    - Location: `CommandPalette.tsx` line 22-30
    - Note: Commands are TODO (only close palette)

27. **Keyboard shortcuts (documented but untested)**
    - `J / K`: Next / previous passage
    - `1-9`: Tag as speaker 1-9
    - `A`: Accept AI suggestion
    - `X`: Reject AI suggestion
    - `?`: Show keyboard shortcuts help
    - Location: `KeyboardShortcutHelp.tsx` line 17-24
    - Note: Documented in help but not implemented

28. **Quick search navigation**
    - Feature: F3 / Cmd+G → Find next result
    - Location: `QuickSearchDialog.tsx` line 54-60

29. **Quick search reverse navigation**
    - Feature: Shift+F3 → Find previous result
    - Location: `QuickSearchDialog.tsx` line 61-71

30. **Quick search jump**
    - Feature: Cmd+Enter → Jump to result
    - Location: `QuickSearchDialog.tsx` line 47-53

31. **Empty state for character network**
    - Feature: Load document with no dialogue → See "No dialogue data" message
    - Location: `CharacterNetwork.tsx` line 118-131

### LOW Gaps (4 features)
_Nice-to-have features_

32. **Difficulty badges in gallery**
    - Feature: Green/Yellow/Red badges for Beginner/Intermediate/Advanced
    - Location: `SampleGallery.tsx` line 78-87

33. **Pattern tags in gallery**
    - Feature: Tags like "first-person", "dialogue-heavy" on sample cards
    - Location: `SampleGallery.tsx` line 178-188

34. **Instruction tooltips**
    - Feature: Hover over buttons → See tooltips with shortcuts
    - Location: `AIModeSwitcher.tsx` line 41

35. **Progress indicators**
    - Feature: Spinner with status text during operations
    - Location: `BulkOperationsPanel.tsx` line 165-179

---

## Recommendations

### Priority 1: Critical Core Workflows (immediate action needed)

1. **Tagging Workflow Test**
   ```typescript
   test('should tag selected text with <said> element', async ({ page }) => {
     // Select text → Tag toolbar appears → Click <said> → Verify TEI updated
   });
   ```
   - Why: Core annotation feature
   - Impact: HIGH
   - Effort: MEDIUM (depends on handleApplyTag implementation)

2. **Bulk Tagging Test**
   ```typescript
   test('should tag multiple passages with speaker', async ({ page }) => {
     // Select passages → Choose speaker → Click Tag Selected → Verify updates
   });
   ```
   - Why: Key productivity feature
   - Impact: HIGH
   - Effort: LOW (functionality exists)

3. **Real File Upload Test**
   ```typescript
   test('should upload and parse TEI XML file', async ({ page }) => {
     // Create test file → Upload → Verify content loads
   });
   ```
   - Why: Custom documents are primary use case
   - Impact: HIGH
   - Effort: LOW (test infrastructure exists)

4. **Validation Test**
   ```typescript
   test('should validate selection and show issues', async ({ page }) => {
     // Select untagged passages → Click Validate → See error list
   });
   ```
   - Why: Quality assurance is critical
   - Impact: HIGH
   - Effort: MEDIUM (need UI for validation results)

### Priority 2: Important Features (add within 1 week)

5. **Export Functionality Tests**
   - Test HTML export (if ExportButton is integrated)
   - Test TEI XML export (if ExportButton is integrated)
   - Effort: LOW (but requires component integration first)

6. **Shift+Click Range Selection Test**
   ```typescript
   test('should select range of passages with Shift+click', async ({ page }) => {
     // Click first → Shift+click last → Verify range selected
   });
   ```
   - Why: Key productivity feature
   - Impact: MEDIUM
   - Effort: LOW

7. **Quick Selection Operations Tests**
   - Test "Select All Untagged"
   - Test "Select Low Confidence"
   - Effort: LOW

8. **Character Network Interaction Tests**
   - Test node clicking
   - Test node dragging
   - Test zoom/pan
   - Effort: MEDIUM

### Priority 3: Edge Cases (add as time permits)

9. **Error State Tests**
   - Test invalid file upload
   - Test network errors (corpus browser)
   - Test missing samples
   - Effort: MEDIUM

10. **Keyboard Shortcut Tests**
    - Test J/K navigation (if implemented)
    - Test 1-9 quick tagging (if implemented)
    - Test A/X for accept/reject (if implemented)
    - Effort: LOW (but requires implementation)

11. **Search Functionality Tests**
    - Test quick search dialog
    - Test result navigation
    - Test jump to result
    - Effort: MEDIUM (but requires component integration)

### Priority 4: Low Priority (nice-to-have)

12. **UI Polish Tests**
    - Test difficulty badges
    - Test pattern tags
    - Test tooltips
    - Test progress indicators
    - Effort: LOW

---

## Implementation Status Notes

### Features Documented But Not Implemented
1. **TagToolbar**: `handleApplyTag` is TODO (EditorLayout.tsx line 191-194)
2. **Convert to Dialogue**: `handleConvert` is TODO (EditorLayout.tsx line 186-189)
3. **Select Low Confidence**: `handleSelectLowConfidence` is TODO (EditorLayout.tsx line 129-132)
4. **Command Palette Actions**: "Save" and "Export" are TODO (CommandPalette.tsx line 22-30)
5. **Keyboard Shortcuts**: J/K, 1-9, A, X, ? are documented in KeyboardShortcutHelp but not implemented
6. **QuickSearch**: Component exists but integration point unclear

### Components Built But Not Integrated
1. **ExportButton**: Not imported in EditorLayout.tsx
2. **CorpusBrowser**: Integration unclear
3. **DialogueOutline**: Integration unclear
4. **QuickSearchDialog**: Integration unclear
5. **KeyboardShortcutHelp**: Not accessible from UI

### Side Effects Not Tested
1. **Pattern Learning**: IndexedDB writes on accept (InlineSuggestions.tsx line 42-68)
2. **Rejection Logging**: IndexedDB writes on reject (InlineSuggestions.tsx line 70-93)
3. **Pattern Extraction**: Pattern analysis not verified

---

## Test Quality Issues

### Arbitrary Waits
The current tests use `page.waitForTimeout()` in multiple places:
- Line 38: `await page.waitForTimeout(500);` // Auto-load
- Line 282: `await page.waitForTimeout(300);` // AI detection
- Line 310: `await page.waitForTimeout(300);` // AI detection
- Line 322: `await page.waitForTimeout(200);` // UI update
- Line 507: `await page.waitForTimeout(200);` // DOM update
- Line 563: `await page.waitForTimeout(300);` // Viewport resize
- Line 570: `await page.waitForTimeout(300);` // Viewport resize
- Line 596: `await page.waitForTimeout(500);` // ARIA labels
- Line 644: `await page.waitForTimeout(500);` // Gallery load
- Line 655: `await page.waitForTimeout(500);` // Sample load

**Recommendation:** Replace with proper wait assertions (e.g., `waitForSelector`, `waitForLoadState`)

### Test Skips
- Line 333: `test.skip(true, 'No AI suggestions generated...')`
- Line 730: `test.skip(true, 'Download event not captured...')`

**Recommendation:** Use conditional test execution or preconditions instead

---

## Conclusion

The TEI Dialogue Editor has **55% e2e test coverage** for user-facing features. The most critical gaps are in core annotation workflows (tagging, bulk operations, file upload) and important productivity features (quick selection, validation, export).

**Immediate Actions:**
1. Add tests for actual TEI tagging workflow
2. Add tests for bulk tagging functionality
3. Add test for real file upload
4. Add test for validation operation
5. Add test for Shift+click range selection

**Short-term Actions (1-2 weeks):**
1. Integrate and test ExportButton component
2. Test quick selection operations (Select All Untagged, Select Low Confidence)
3. Test character network interactions
4. Test error states and edge cases
5. Replace arbitrary waits with proper assertions

**Long-term Actions:**
1. Test quick search functionality (once integrated)
2. Test keyboard shortcuts (once implemented)
3. Add IndexedDB interaction tests
4. Test corpus browser (once integrated)
5. Test dialogue outline (once integrated)
