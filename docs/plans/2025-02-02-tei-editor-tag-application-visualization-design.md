# TEI Editor Tag Application & Visualization Enhancements - Design Document

**Date:** 2025-02-02
**Status:** Design Approved
**Author:** Claude (with user requirements)

---

## Problem Statement

The current TEI editor has several limitations that hinder effective document markup and visualization:

1. **Tag buttons don't work:** Clicking `<said>`, `<q>`, and other tag buttons in the toolbar does nothing
2. **No well-formed XML generation:** Selection wrapping doesn't produce valid XML
3. **No schema validation:** RelaxNG schemas exist but aren't enforced during editing
4. **Limited character network:** Only shows sequential dialogue interactions, not configurable co-occurrence
5. **No tag editing capability:** Users cannot select and modify existing tags
6. **No structural editing:** Cannot add TEI structural tags like `<div>`, `<p>`, `<sp>`

---

## User Requirements

| Requirement                 | Description                                                              |
| --------------------------- | ------------------------------------------------------------------------ |
| **Tag Behavior**            | Wrap selected text in clicked tag (e.g., 'hello' → `<said>hello</said>`) |
| **Validation**              | Strict RelaxNG schema validation - block invalid edits                   |
| **Character Co-occurrence** | Configurable methods: paragraph-based, dialogue proximity, word distance |
| **Edge Visualization**      | Both undirected and directed edges visible simultaneously                |
| **Tag Selection**           | Multiple methods: click inside tag, breadcrumb tree, visual indicator    |
| **Editing Experience**      | Split view with raw XML and rendered preview                             |

---

## Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────────┐
│                       EditorLayout                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ TagToolbar   │  │TagBreadcrumb │  │ ValidationPanel  │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│  ┌──────────────────────┬────────────────────────────────┐  │
│  │   RenderedView       │   XMLCodeEditor (Monaco)       │  │
│  │   - Visual display   │   - Syntax highlighting        │  │
│  │   - Tag selection    │   - Line numbers               │  │
│  │   - Inline toolbar   │   - Error underlines           │  │
│  └──────────────────────┴────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              CharacterNetwork (Enhanced)                ││
│  │  - Configurable proximity methods                       ││
│  │  - Undirected + directed edges                          ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### New Components

| Component              | Purpose                                     |
| ---------------------- | ------------------------------------------- |
| `SelectionManager`     | Track DOM selections and map to XML offsets |
| `SchemaLoader`         | Load and parse TEI RelaxNG schemas          |
| `ValidationService`    | Validate XML against loaded schemas         |
| `ValidationPanel`      | Display real-time validation errors         |
| `TagBreadcrumb`        | Show tag hierarchy at cursor position       |
| `TagEditDialog`        | Form-based editor for tag attributes        |
| `ProximityAnalyzer`    | Calculate character co-occurrence           |
| `XMLCodeEditor`        | Monaco-based XML source editor              |
| `StructuralTagPalette` | Insert structural elements                  |

---

## Section 1: Tag Application System

### Current Issues

The `handleApplyTag` function in `EditorLayout.tsx:326` only handles `<said>` tags with `@who` attributes. The `addSaidTag` method uses a simplified range `{start: 0, end: selectedText.length}` that doesn't map to actual character positions.

### Solution: SelectionManager

**File:** `lib/selection/SelectionManager.ts`

```typescript
class SelectionManager {
  // Capture current selection with position tracking
  captureSelection(): SelectionRange | null;

  // Map DOM range to XML character offsets within a passage
  domToXmlOffset(range: Range, passageElement: HTMLElement): XmlOffset;

  // Restore selection after document update
  restoreSelection(range: XmlOffset): void;

  // Check if selection is within an existing tag
  getContainingTag(): TagInfo | null;
}
```

**Enhanced TEIDocument methods:**

```typescript
class TEIDocument {
  // Generic tag wrapper
  wrapTextInTag(
    passageIndex: number,
    start: number,
    end: number,
    tagName: string,
    attrs?: Record<string, string>
  ): void;

  // Remove a tag while preserving content
  unwrapTag(passageIndex: number, tagId: string): void;

  // Modify tag attributes
  updateTag(passageIndex: number, tagId: string, newAttrs: Record<string, string>): void;

  // Validate against RelaxNG schema
  validateAgainstSchema(): ValidationResult;
}
```

**Data Flow:**

```
User selects text → SelectionManager captures range
User clicks <q> → TagToolbar calls onApplyTag('q')
              → EditorLayout.handleApplyTag
              → document.wrapTextInTag(passageIndex, start, end, 'q')
              → updateDocument() triggers re-render
              → SelectionManager restores selection if needed
```

---

## Section 2: Schema Validation

### RelaxNG Integration

**Dependencies:**

- `relaxng-validator-js` - Schema validation library

**SchemaLoader** (`lib/schema/SchemaLoader.ts`)

```typescript
class SchemaLoader {
  // Load TEI schema from /TEI/P5/ directory
  async loadSchema(schemaPath: string): Promise<RelaxNGSchema>;

  // Get allowed tags at current context
  getAllowedTags(context: XmlPath): TagDefinition[];

  // Get required/optional attributes for a tag
  getTagAttributes(tagName: string): AttributeDefinition[];

  // Validate XML document
  validate(xmlContent: string): ValidationResult;
}
```

**ValidationPanel** Component

- Real-time error/warning display
- Click error to highlight problematic node
- Suggested fixes for common errors
- Schema-compliant attribute suggestions

**Strict Validation Flow:**

1. Before any edit → Validate proposed change against schema
2. If invalid → Block change + show explanation + suggest corrections
3. If valid → Apply change + re-validate entire document
4. Always maintain document in valid state

---

## Section 3: Tag Selection & Editing

### Tag Breadcrumb

**File:** `components/editor/TagBreadcrumb.tsx`

Shows hierarchy at cursor position:

```
TEI > text > body > p > said[@who="#speaker1"]
```

- Click any level to select that tag
- Shows attributes for selected tag
- Breadcrumbs update as cursor moves

### Visual Tag Indicators

Rendered tags display with:

- Subtle colored borders indicating tag type
- Hover effect with tag name
- Click to select, double-click to edit
- Selected tag shows edit controls

### Tag Edit Dialog

**Features:**

- Form-based editor for tag attributes
- Schema-enforced options (dropdowns for enumerated values)
- Live validation feedback
- Preview of changes before applying
- Cancel/Apply/Reset buttons

---

## Section 4: Character Network - Configurable Co-occurrence

### Proximity Methods

**1. Paragraph-based (default)**

- Characters in same `<p>` element are connected
- Edge weight = number of shared paragraphs

**2. Dialogue Proximity**

- Characters speaking within N turns of each other
- Configurable N (default: 3)
- Edge weight = interaction frequency

**3. Word Distance**

- Characters mentioned within X words of each other
- Scans both `<said>` dialogue and narration
- Configurable word count (default: 100)

**4. Combined Mode**

- Enable multiple methods simultaneously
- Different edge styles per method (solid/dashed/dotted)

### Edge Directionality

| Edge Type  | Visual                            | Purpose                                |
| ---------- | --------------------------------- | -------------------------------------- |
| Undirected | Solid gray, thickness = strength  | Co-occurrence regardless of order      |
| Directed   | Animated colored arrows           | Dialogue flow (who speaks before whom) |
| Both       | Both types visible simultaneously | Complete relationship picture          |

### Configuration Panel

```tsx
<NetworkControls>
  <Select label="Proximity Method" options={['paragraph', 'dialogue', 'word']} />
  <Slider label="Max Distance" min={1} max={100} value={3} />
  <Toggle label="Show Direction" checked={true} />
  <Slider label="Edge Threshold" min={1} max={50} value={1} />
</NetworkControls>
```

### Implementation

**ProximityAnalyzer** class with strategy pattern:

```typescript
class ProximityAnalyzer {
  constructor(private document: TEIDocument) {}

  // Each strategy returns nodes and edges in ReactFlow format
  paragraphBased(): GraphResult;
  dialogueProximity(turns: number): GraphResult;
  wordDistance(words: number): GraphResult;

  // Merge results from multiple strategies
  combine(results: GraphResult[]): GraphResult;
}
```

---

## Section 5: Split View - Code/Preview Structural Editing

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  [WYSIWYG]  |  [XML Source]  |  [Split]  ← Mode Toggle      │
├────────────────────────────┬────────────────────────────────┤
│                             │                                │
│  Rendered View              │  XML Code Editor               │
│  - Visual text display      │  - Syntax highlighted           │
│  - Click tags to select     │  - Line numbers                 │
│  - Drag structural blocks   │  - Error underlines             │
│  - Inline toolbar           │  - Auto-indent                  │
│                             │  - Schema tooltips              │
└────────────────────────────┴────────────────────────────────┘
```

### Code Editor Integration

**Library:** `@monaco-editor/react`

Features:

- XML syntax highlighting
- Schema-aware autocomplete
- Line numbers
- Error squiggles from validation
- Auto-indentation
- Foldable code blocks

### Sync Mechanism

```
User edits code → Parse XML → Validate → Update preview
User edits preview → Serialize XML → Update code editor
```

- Debounced updates (300ms) to avoid excessive re-parsing
- Conflict resolution with user notification
- Scroll sync between views

### Structural Tag Operations

**1. Tag Palette**

```
[<div>]  [<p>]  [<sp>]  [<lg>]  [<head>]
```

- Drag to position or click to insert at cursor
- Schema validates insertion is allowed

**2. Tree View Panel** (optional toggle)

- Collapsible XML structure tree
- Drag nodes to reorder
- Right-click for actions: wrap/unwrap/delete

**3. Visual Block Editing** (in rendered view)

- Structural tags as bordered containers
- Hover controls: [Wrap] [Delete] [Split]
- Drag borders to resize/move content

---

## Implementation Plan

### Phase 1: Fix Tag Application (Quick Wins)

**Tasks:**

1. Create `SelectionManager` for accurate range tracking
2. Add `wrapTextInTag()` method to `TEIDocument`
3. Fix `handleApplyTag` to support all tag types
4. Test: Select text, click tags, verify XML well-formedness

**Files:**

- `lib/selection/SelectionManager.ts` (new)
- `lib/tei/TEIDocument.ts` (modify)
- `components/editor/EditorLayout.tsx` (modify)
- `components/editor/TagToolbar.tsx` (modify)

### Phase 2: Schema Validation

**Tasks:**

1. Add `relaxng-validator-js` dependency
2. Create `SchemaLoader` to parse TEI schemas
3. Add `validateAgainstSchema()` to `TEIDocument`
4. Create `ValidationPanel` component
5. Integrate validation into `updateDocument` flow

**Files:**

- `package.json` (add dependency)
- `lib/schema/SchemaLoader.ts` (new)
- `lib/validation/ValidationService.ts` (new)
- `components/validation/ValidationPanel.tsx` (new)
- `lib/tei/TEIDocument.ts` (modify)

### Phase 3: Tag Selection/Editing

**Tasks:**

1. Create `TagBreadcrumb` component
2. Add visual indicators to rendered tags
3. Create `TagEditDialog` with schema-driven forms
4. Implement tag selection click handlers

**Files:**

- `components/editor/TagBreadcrumb.tsx` (new)
- `components/editor/TagEditDialog.tsx` (new)
- `components/editor/RenderedView.tsx` (modify)

### Phase 4: Character Network Enhancements

**Tasks:**

1. Create `ProximityAnalyzer` with strategy pattern
2. Add configuration panel to `CharacterNetwork`
3. Implement edge directionality options
4. Add filtering/thresholding controls

**Files:**

- `lib/visualization/ProximityAnalyzer.ts` (new)
- `components/visualization/CharacterNetwork.tsx` (modify)

### Phase 5: Split View Editing

**Tasks:**

1. Integrate Monaco Editor
2. Create bidirectional sync between code and preview
3. Add structural tag palette
4. Implement tree view panel (optional)

**Files:**

- `package.json` (add `@monaco-editor/react`)
- `components/editor/XMLCodeEditor.tsx` (new)
- `components/editor/StructuralTagPalette.tsx` (new)
- `components/editor/EditorLayout.tsx` (modify)

---

## Testing Strategy

### Unit Tests

- `SelectionManager` range tracking and offset calculation
- `ProximityAnalyzer` each strategy
- Schema validation error detection
- `TEIDocument` tag manipulation methods

### Integration Tests

- Tag application workflow
- Tag editing with schema validation
- Split view synchronization
- Network graph configuration changes

### E2E Tests

- Select text → apply tag → verify XML structure
- Attempt invalid edit → verify blocked with error message
- Edit in code view → verify preview updates
- Change network settings → verify graph updates

### Visual Regression Tests

- Network graph rendering with different configurations
- Tag styling in rendered view
- Validation panel error display

---

## Key Dependencies

| Dependency             | Purpose                          | Version |
| ---------------------- | -------------------------------- | ------- |
| `relaxng-validator-js` | RelaxNG schema validation        | latest  |
| `@monaco-editor/react` | XML code editor                  | latest  |
| `reactflow`            | Network visualization (existing) | current |
| `fast-xml-parser`      | XML parsing (existing)           | current |

---

## Success Criteria

1. ✅ Tag buttons work for all tag types (said, q, persName, etc.)
2. ✅ Generated XML is well-formed and valid per TEI schema
3. ✅ Invalid edits are blocked with clear explanations
4. ✅ Character network supports multiple proximity methods
5. ✅ Users can select and edit existing tags
6. ✅ Split view provides real-time code/preview sync
7. ✅ All changes maintain schema validity
