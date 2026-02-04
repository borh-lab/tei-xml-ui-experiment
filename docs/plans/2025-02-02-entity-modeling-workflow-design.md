# Entity Modeling and Workflow Functionality Design Document

**Date:** 2025-02-02
**Author:** Claude (brainstorming skill)
**Status:** Design Complete, Ready for Implementation

## Overview

Enhances the TEI Dialogue Editor with two critical capabilities:

1. **Functional Workflows** - Make tag application, AI suggestions, and dialogue detection actually modify TEI documents
2. **Comprehensive Entity Modeling** - Character relationships, attributes, NER integration, network visualization with real data

**Current State:**

- Tag application logs to console but doesn't modify TEI
- AI suggestion acceptance filters from array but doesn't persist changes
- Character detection returns empty array
- RenderedView extracts text but loses TEI structure
- No character relationships, limited attributes, no NER

**Target State:**

- All editing operations persist to TEI XML
- Full character inventory with CRUD operations
- Relationship modeling for social network analysis
- Automatic entity detection with confidence scoring
- Visual rendering of TEI tags with interactive editing

---

## Architecture Approach

**Chosen Strategy: Layered Enhancement**

Incrementally enhance `TEIDocument` class while maintaining backward compatibility.

**Alternatives Considered:**

1. **Complete Rewrite** - Too risky, 2-3 weeks, breaking changes
2. **Layered Enhancement** (CHOSEN) - Lower risk, incremental value, 1-2 weeks
3. **Minimal Fixes** - Fast but incomplete, no entity modeling

**Rationale:**

- Delivers value every 2-3 days
- Maintains existing functionality
- Can ship phases incrementally
- Lower risk than rewrite

---

## Part 1: Core TEI Manipulation Layer

### TEIDocument API Enhancements

**Current (Non-Functional):**

```typescript
class TEIDocument {
  serialize(): string;
  getDialogue(): any[];
  getDivisions(): any[];
  getCharacters() {
    return [];
  } // Empty!
}
```

**Enhanced API:**

```typescript
class TEIDocument {
  // Existing (working)
  serialize(): string;
  getDialogue(): any[];
  getDivisions(): any[];

  // NEW: Mutation methods
  addSaidTag(passageIndex: number, textRange: { start; end }, speakerId: string): void;
  updateSpeaker(passageIndex: number, dialogueIndex: number, speakerId: string): void;
  removeSaidTag(passageIndex: number, dialogueIndex: number): void;

  // NEW: Entity methods
  getCharacters(): Character[];
  addCharacter(character: Character): void;
  updateCharacter(id: string, updates: Partial<Character>): void;
  removeCharacter(id: string): void;

  // NEW: Relationship methods
  getRelationships(): Relationship[];
  addRelation(relation: Relationship): void;
  removeRelation(fromId: string, toId: string, type: string): void;

  // NEW: NER methods
  getNamedEntities(): NamedEntity[];
  addNERTag(
    span: { start; end },
    type: 'persName' | 'placeName' | 'orgName' | 'date',
    ref?: string
  ): void;
}
```

**Key Implementation Insight:**
The class must maintain the parsed XML as a mutable object graph, track references to nodes, and serialize on demand. Current implementation parses but loses structure references.

---

## Part 2: Entity Modeling Schema

### Character Entity Structure

```typescript
interface Character {
  xml:id: string;                    // e.g., "darcy", "elizabeth"
  persName: string;                  // Display name
  sex?: 'M' | 'F' | 'Other';
  age?: number;
  occupation?: string;
  role?: 'protagonist' | 'antagonist' | 'major' | 'minor' | 'mentioned';
  traits?: string[];                 // ["proud", "generous", "witty"]
  socialStatus?: string;             // "gentry", "working-class"
  maritalStatus?: string;            // "single", "married", "widowed"
  firstAppearance?: number;          // Passage index
  dialogueCount?: number;            // Auto-calculated
  relationships?: Relationship[];    // Derived from <listRelation>
}
```

### Relationship Structure

```typescript
interface Relationship {
  id: string; // Unique relation ID
  from: string; // Character xml:id
  to: string; // Character xml:id
  type: 'family' | 'romantic' | 'social' | 'professional' | 'antagonistic';
  subtype?: string; // "spouse", "sibling", "parent-child"
  mutual?: boolean; // Default true
  strength?: number; // 0-1, calculated from dialogue frequency
}
```

### Named Entity Structure (NER)

```typescript
interface NamedEntity {
  id: string;
  type: 'persName' | 'placeName' | 'orgName' | 'date' | 'time';
  text: string; // The actual text span
  ref?: string; // Reference to character ID (if person)
  passageIndex: number;
  span: { start: number; end: number };
  confidence?: number; // For AI-detected entities
}
```

### TEI XML Mapping (TEI P5 Compliant)

```xml
<standOff>
  <listPerson>
    <person xml:id="darcy">
      <persName>Mr. Darcy</persName>
      <sex value="M"/>
      <age value="28"/>
      <occupation>landowner</occupation>
      <role type="antagonist"/> <!-- Initial role, can evolve -->
      <trait type="personality">proud</trait>
      <trait type="personality">generous</trait>
      <socecStatus>gentry</socecStatus>
    </person>
  </listPerson>

  <listRelation>
    <relation name="romantic" subtype="courtship"
              mutual="true" active="#darcy" passive="#elizabeth"/>
    <relation name="family" subtype="sibling"
              active="#jane" passive="#elizabeth"/>
  </listRelation>

  <listAnnotation>
    <annotation span="from p0[12] to p0[18]">
      <persName ref="#darcy">Mr. Darcy</persName>
    </annotation>
  </listAnnotation>
</standOff>
```

**TEI P5 Elements Used:**

- `<person>` with standard attributes (`@xml:id`, `<sex>`, `<age>`, `<occupation>`)
- `<listPerson>` container for character inventory
- `<listRelation>` with `<relation>` elements for character networks
- `<listAnnotation>` for stand-off entity references
- `<socecStatus>` for social standing (TEI P5 standard)
- `<trait>` for character attributes (TEI P5 standard)

---

## Part 3: UI Components

### 1. EntityEditorPanel (New Slide-out Sidebar)

**Features:**

- Tabbed interface: Characters | Relationships | NER Tags
- Character list with CRUD operations
- Form for adding/editing character metadata
- Real-time validation against TEI schema
- Search/filter characters

**File:** `components/editor/EntityEditorPanel.tsx`

### 2. RelationshipEditor (New Component)

**Features:**

- Visual relationship picker (from character → to character)
- Relationship type dropdown (family/romantic/social/professional/antagonistic)
- Subtype selection (spouse, sibling, parent-child, courtship, etc.)
- Bidirectional relationship toggle
- Network visualization preview

**File:** `components/editor/RelationshipEditor.tsx`

### 3. InlineTaggingMenu (New Contextual Popup)

**Features:**

- Appears on text selection
- Quick tag buttons: `<said>` speaker1-9, `<persName>`, `<placeName>`, `<orgName>`
- Speaker assignment dropdown (populated from `<listPerson>`)
- Confidence slider for AI suggestions
- Apply/Cancel buttons

**File:** `components/editor/InlineTaggingMenu.tsx`

### 4. Enhanced RenderedView (Modify Existing)

**Changes:**

- Render TEI tags as styled spans (not just text extraction)
- Click on entity to open editor panel with that entity selected
- Hover shows entity tooltip (character, relationship, metadata)
- Highlight entities by type (different colors for speakers/places/orgs)

**File:** `components/editor/RenderedView.tsx` (modify existing)

### 5. NERAutoTagger (New Background Process)

**Features:**

- Runs when document loads
- Detects: personal names, locations, dates
- Creates suggested annotations with confidence scores
- Shows "X suggestions pending" badge
- Bulk accept/reject interface

**File:** `lib/ai/entities/NERAutoTagger.ts`

### Data Flow Example

```
User selects text → InlineTaggingMenu appears
    ↓
User chooses "Tag as <said> with speaker #darcy"
    ↓
EntityEditorPanel calls TEIDocument.addSaidTag()
    ↓
TEIDocument modifies parsed object graph
    ↓
RenderedView re-renders with new <said> tag styled
    ↓
TEI Source panel updates with serialize()
    ↓
Character network recalculates (Darcy's dialogue count +1)
```

---

## Part 4: AI/NER Integration

### EntityDetector Implementation

**File:** `lib/ai/entities/EntityDetector.ts` (NEW)

```typescript
class EntityDetector {
  // Named Entity Recognition using pattern matching

  detectPersonalNames(text: string): EntitySpan[] {
    // Pattern: Capitalized words not at sentence start
    // Context clues: titles (Mr., Mrs., Dr., Lady)
    // Excludes: common words at sentence boundaries
    const namePattern = /\b(Mr|Mrs|Miss|Dr|Lady|Sir)\s+[A-Z][a-z]+/g;
    // Returns: {start, end, text, confidence, type: 'persName'}
  }

  detectPlaces(text: string): EntitySpan[] {
    // Pattern: Location indicators (in, at, from) + capitalized
    // Gazetteer matching against known locations
    const placePattern = /\b(in|at|from|near)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g;
  }

  detectDialogueSpeakers(text: string, currentSpeakers: Character[]): DialogueSpan[] {
    // Quote extraction: "..." with surrounding context
    // Speaker attribution patterns:
    //   - "said John" → speaker = john
    //   - John said, "..." → speaker = john
    //   - "..." he said → speaker = previous paragraph speaker
    // Returns suggested <said> tags with @who attributes
  }
}
```

### Integration Flow

```
Document loads → EntityDetector.scan()
    ↓
Detects: "Mr. Darcy", "Pemberley", "Netherfield Park"
    ↓
Creates pending annotations (not applied yet)
    ↓
Shows badge: "15 entities detected (pending)"
    ↓
User opens NER panel → sees categorized suggestions
    ↓
User clicks "Apply All" or individually accepts/rejects
    ↓
TEIDocument.addNERTag() called for each accepted entity
    ↓
Entities added to <standOff><listAnnotation>
```

### Confidence Scoring

- **0.9-1.0: High Confidence** - Apply automatically
  - Exact matches to character names in `<listPerson>`
  - Standard patterns: "Mr. [KnownName]"

- **0.7-0.9: Medium Confidence** - Show suggestions
  - Capitalized names in dialogue context
  - Known locations

- **0.5-0.7: Low Confidence** - Manual review required
  - Ambiguous capitalizations
  - Potential false positives

### Learning from Corrections

**File:** `lib/db/PatternDB.ts` (enhance existing)

```typescript
interface PatternDB {
  logCorrection(
    entityType: 'persName' | 'placeName' | 'said',
    correctedValue: string,
    context: string,
    userCorrection: string,
    confidence: number
  ): void;

  // When user changes "Mr. Darcy" → "Mr. Darcy (Pemberley)"
  // System learns: Darcy + Pemberley = same entity

  getSuggestions(context: string): Suggestion[];
  // Uses past corrections to improve future detections
}
```

### AI Modes Behavior

- **Manual**: No auto-detection, user tags everything
- **Suggest**: Detects and shows suggestions, user approves
- **Auto**: High-confidence (0.9+) tags applied automatically, medium shown for review

---

## Part 5: Testing Strategy

### Unit Tests (TEIDocument mutations)

**File:** `tests/unit/tei-document-entities.test.ts` (NEW)

```typescript
describe('TEIDocument Entity Manipulation', () => {
  test('addSaidTag adds <said> element with @who', () => {
    const doc = new TEIDocument(sampleTEI);
    doc.addSaidTag(0, {start: 10, end: 25}, 'darcy');

    const xml = doc.serialize();
    expect(xml).toContain('<said who="#darcy">');
  });

  test('addCharacter creates <person> in <listPerson>', () => {
    const doc = new TEIDocument(emptyTEI);
    doc.addCharacter({
      xml:id: 'elizabeth',
      persName: 'Elizabeth Bennet',
      sex: 'F'
    });

    const chars = doc.getCharacters();
    expect(chars).toHaveLength(1);
    expect(chars[0].persName).toBe('Elizabeth Bennet');
  });

  test('updateCharacter modifies existing <person>', () => {
    const doc = new TEIDocument(charactersTEI);
    doc.updateCharacter('darcy', { age: 29 });

    const darcy = doc.getCharacters().find(c => c['xml:id'] === 'darcy');
    expect(darcy.age).toBe(29);
  });
});
```

### Integration Tests (Entity workflows)

**File:** `tests/integration/entity-workflow.test.tsx` (NEW)

```typescript
describe('Entity Tagging Workflow', () => {
  test('selecting text and applying <said> tag updates TEI', () => {
    render(<EditorLayout />);

    // Select dialogue text
    const passage = screen.getByTestId('passage-0');
    userEvent.click(passage, { selection: 'I do.' });

    // Apply tag
    const tagButton = screen.getByRole('button', { name: /tag as speaker1/i });
    userEvent.click(tagButton);

    // Verify TEI updated
    const sourcePanel = screen.getByText('TEI Source');
    expect(sourcePanel).toContain('<said who="#speaker1">I do.</said>');
  });

  test('adding character in EntityEditor updates listPerson', () => {
    render(<EditorLayout />);

    // Open entity editor
    userEvent.click(screen.getByRole('button', { name: /entities/i }));

    // Fill form
    userEvent.type(screen.getByLabelText(/name/i), 'Charlotte Lucas');
    userEvent.selectOptions(screen.getByLabelText(/role/i), 'major');

    // Submit
    userEvent.click(screen.getByRole('button', { name: /add character/i }));

    // Verify in TEI source
    expect(screen.getByText('TEI Source')).toContain('<persName>Charlotte Lucas</persName>');
  });
});
```

### E2E Tests (Complete user journeys)

**File:** `tests/e2e/entity-modeling.spec.ts` (NEW)

```typescript
test.describe('Entity Modeling End-to-End', () => {
  test('complete character workflow: detect, tag, visualize', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Upload File');
    await page.setInputFiles('input[type="file"]', 'pride-prejudice.xml');

    // Wait for AI detection
    await expect(page.locator('text=entities detected')).toBeVisible();

    // Open NER panel
    await page.click('button:has-text("Entities")');
    await page.click('text=persName');

    // Accept first suggestion
    await page.click('.entity-suggestion:first-child >> text=Accept');

    // Verify in source view
    const sourceTab = page.locator('text=TEI Source');
    await expect(sourceTab).toContainText('<persName>');

    // Check network visualization updated
    await page.click('text=Visualizations');
    await expect(page.locator('.network-node')).toHaveCount(4);
  });
});
```

### AI/NER Testing Strategy

**Avoid Flaky Tests with Golden Files and Deterministic Mocks**

**File:** `tests/unit/entity-detector.test.ts` (NEW)

```typescript
describe('EntityDetector', () => {
  test('detects personal names', () => {
    const input = 'Mr. Darcy looked at Elizabeth';
    const result = detector.detectPersonalNames(input);

    expect(result).toEqual([
      { start: 0, end: 9, text: 'Mr. Darcy', type: 'persName', confidence: 0.95 },
      { start: 20, end: 28, text: 'Elizabeth', type: 'persName', confidence: 0.85 },
    ]);
  });

  test('uses pattern database for corrections', () => {
    // Load golden file with known corrections
    const corrections = loadGoldenFile('ner-corrections.json');
    corrections.forEach((c) => db.logCorrection(c));

    const text = 'Miss Bingley';
    const result = detector.detectPersonalNames(text);

    expect(result[0].confidence).toBeGreaterThan(0.9); // Learned from corrections
  });
});
```

**Golden Files:**

- `tests/fixtures/entity-detections/golden-ners.json`
- `tests/fixtures/entity-detections/speaker-attributions.json`
- `tests/fixtures/entity-detections/relationship-extraction.json`

---

## Part 6: Implementation Phases

### Phase 1: Core TEI Mutations (2-3 days)

**Tasks:**

- Fix `TEIDocument.addSaidTag()` to actually modify parsed object
- Implement `updateSpeaker()` and `removeSaidTag()`
- Wire up `handleApplyTag()` in EditorLayout to call mutations
- Add unit tests for TEI mutations

**Value Delivered:**
Tag application becomes functional (currently broken)

**Files Changed:**

- `lib/tei/TEIDocument.ts` - Add mutation methods
- `components/editor/EditorLayout.tsx` - Wire handleApplyTag
- `tests/unit/tei-document-entities.test.ts` - New tests

**Success Criteria:**

- ✅ Selecting text and clicking tag button updates TEI source
- ✅ `<said>` element appears with correct `@who` attribute
- ✅ Unit tests pass for all mutation methods

---

### Phase 2: Character CRUD (2-3 days)

**Tasks:**

- Implement `getCharacters()` to parse `<listPerson><person>`
- Add `addCharacter()`, `updateCharacter()`, `removeCharacter()`
- Create EntityEditorPanel component with character form
- Integrate with RenderedView (click entity to edit)
- Add tests for character operations

**Value Delivered:**
Users can manage character inventory

**Files Created:**

- `components/editor/EntityEditorPanel.tsx` - New component
- `components/editor/CharacterForm.tsx` - Form component

**Files Modified:**

- `lib/tei/TEIDocument.ts` - Character methods
- `components/editor/RenderedView.tsx` - Click to edit
- `components/editor/EditorLayout.tsx` - Add entity panel toggle

**Success Criteria:**

- ✅ Can add character with metadata
- ✅ Can edit character attributes
- ✅ Can delete character
- ✅ Changes persist to TEI XML
- ✅ Character list displays in entity panel

---

### Phase 3: Relationship Modeling (2 days)

**Tasks:**

- Implement `addRelation()`, `getRelationships()` in TEIDocument
- Create RelationshipEditor component
- Update CharacterNetwork to use real relationship data
- Add tests for relationship operations

**Value Delivered:**
Social network analysis becomes possible

**Files Created:**

- `components/editor/RelationshipEditor.tsx` - New component
- `lib/tei/RelationshipUtils.ts` - Helper functions

**Files Modified:**

- `lib/tei/TEIDocument.ts` - Relationship methods
- `components/visualization/CharacterNetwork.tsx` - Use real data
- `components/editor/EntityEditorPanel.tsx` - Add relationships tab

**Success Criteria:**

- ✅ Can define relationship between two characters
- ✅ Can specify relationship type and subtype
- ✅ Network visualization displays relationships
- ✅ Can delete relationships
- ✅ Relationships persist to `<listRelation>`

---

### Phase 4: NER/AI Detection (2-3 days)

**Tasks:**

- Implement EntityDetector with pattern matching
- Create InlineTaggingMenu component
- Add NERAutoTagger background process
- Create suggestion review interface
- Add tests with golden files

**Value Delivered:**
Massive time savings - auto-detect entities instead of manual tagging

**Files Created:**

- `lib/ai/entities/EntityDetector.ts` - Detection engine
- `components/editor/InlineTaggingMenu.tsx` - Tagging UI
- `lib/ai/entities/NERAutoTagger.ts` - Auto-tagging process
- `components/editor/SuggestionReview.tsx` - Review interface

**Files Modified:**

- `components/editor/EditorLayout.tsx` - Integrate tagging menu
- `lib/db/PatternDB.ts` - Add correction learning
- `components/editor/EntityEditorPanel.tsx` - NER tab

**Success Criteria:**

- ✅ Entities detected on document load
- ✅ Suggestions shown with confidence scores
- ✅ Can accept/reject individually or in bulk
- ✅ High-confidence entities auto-applied
- ✅ Corrections improve future detections

---

### Phase 5: Enhanced Rendering (1-2 days)

**Tasks:**

- Fix RenderedView to render <said> tags as styled spans
- Add hover tooltips for entities
- Highlight by entity type
- Add click-to-edit functionality
- Test rendering interactions

**Value Delivered:**
Visual feedback makes editing intuitive

**Files Modified:**

- `components/editor/RenderedView.tsx` - Render tags, tooltips, clicks
- `components/editor/EntityTooltip.tsx` - New tooltip component

**Success Criteria:**

- ✅ <said> tags rendered as styled spans
- ✅ Hover shows entity tooltip
- ✅ Different colors for different entity types
- ✅ Clicking entity opens editor panel
- ✅ Selection and tagging workflow works

---

### Phase 6: Polish & E2E Tests (1-2 days)

**Tasks:**

- Complete test coverage for all mutations
- Add E2E tests for complete workflows
- Performance optimization for large documents
- Documentation updates
- Fix any remaining bugs

**Value Delivered:**
Confidence in system reliability

**Files Created:**

- `tests/e2e/entity-modeling.spec.ts` - E2E tests
- `docs/entity-modeling-guide.md` - User documentation

**Files Modified:**

- All test files - Complete coverage
- README.md - Update feature list

**Success Criteria:**

- ✅ 100% unit test coverage for new code
- ✅ E2E tests cover all major workflows
- ✅ Performance acceptable on 100+ passage documents
- ✅ Documentation complete
- ✅ All tests passing

---

## Total Effort

**Estimated Time:** 10-15 days

**Phase Breakdown:**

- Phase 1: 2-3 days (Core mutations)
- Phase 2: 2-3 days (Character CRUD)
- Phase 3: 2 days (Relationships)
- Phase 4: 2-3 days (NER/AI)
- Phase 5: 1-2 days (Enhanced rendering)
- Phase 6: 1-2 days (Polish & tests)

**Dependencies:**

- Phase 1 → Phase 2 (need working mutations before character management)
- Phase 2 → Phase 3 (need characters before relationships)
- Phase 2 → Phase 5 (need entities before enhanced rendering)
- Phases 2, 3, 4 can be partially parallel after Phase 1

---

## Technical Decisions

### TEI P5 Compliance

All TEI structures follow [TEI P5 Guidelines](https://tei-c.org/release/doc/tei-p5-doc/en/html/ND.html):

- `<person>` elements with standard attributes
- `<listPerson>` for character inventory
- `<listRelation>` for social networks
- `<listAnnotation>` for stand-off references
- `<socecStatus>` for social status
- `<trait>` for character attributes

### Mutation Strategy

**Choice:** Modify parsed object graph, then serialize

**Rationale:**

- Simpler than direct XML manipulation
- Maintains referential integrity
- Can validate before serializing
- Easier to test

**Alternative Rejected:** Direct string manipulation with regex

- Too error-prone
- Breaks XML structure easily
- Can't validate until parse

### AI Detection Approach

**Choice:** Pattern matching + confidence scoring + learning

**Rationale:**

- No external dependencies (spaCy, etc.)
- Deterministic (testable)
- Improves with use
- Transparent to users

**Alternative Rejected:** Heavy ML models

- Overkill for this use case
- Hard to test
- Slower
- Black box

---

## Success Criteria

### Phase 1: Core Mutations

- ✅ Tag application updates TEI
- ✅ Speaker attribution works
- ✅ Tag removal works
- ✅ Unit tests pass

### Phase 2: Character CRUD

- ✅ Can add/edit/delete characters
- ✅ Character metadata persists
- ✅ Entity panel functional
- ✅ Click-to-edit works

### Phase 3: Relationships

- ✅ Can define relationships
- ✅ Network visualizes correctly
- ✅ Relationships persist
- ✅ Bidirectional relationships work

### Phase 4: NER/AI

- ✅ Auto-detection works
- ✅ Confidence scoring accurate
- ✅ Suggestions reviewable
- ✅ Learning from corrections

### Phase 5: Enhanced Rendering

- ✅ Tags render visibly
- ✅ Tooltips informative
- ✅ Click-to-edit smooth
- ✅ Performance acceptable

### Phase 6: Polish

- ✅ Test coverage >90%
- ✅ E2E tests pass
- ✅ Documentation complete
- ✅ No regressions

### Overall Success Metrics

- ✅ All workflows functional (no more console-only operations)
- ✅ Entity modeling enables novel analysis
- ✅ User can complete character workflow end-to-end
- ✅ AI detection saves time vs manual tagging
- ✅ Network visualization provides insights
- ✅ Zero breaking changes to existing features

---

## Risk Mitigation

### Risk 1: Breaking Existing Functionality

**Mitigation:**

- Comprehensive test suite before changes
- Run E2E tests after each phase
- Maintain backward compatibility
- Feature flags for new features

### Risk 2: Performance Degradation

**Mitigation:**

- Profile entity operations
- Lazy load large entity lists
- Debounce AI detection
- Virtualize long lists

### Risk 3: AI Detection False Positives

**Mitigation:**

- Conservative confidence thresholds
- Human in the loop (review required)
- Easy correction workflow
- Learn from mistakes

### Risk 4: TEI Schema Violations

**Mitigation:**

- Validate against TEI RNG schema
- Unit tests check structure
- Preview mode before save
- Rollback capability

---

## Future Enhancements (Out of Scope)

1. **External NER Integration** - spaCy, Stanford NER, Hugging Face models
2. **Relationship Extraction** - Auto-detect relationships from co-occurrence
3. **Character Arcs** - Track character development over narrative
4. **Sentiment Analysis** - Per-character sentiment tracking
5. **Export Options** - JSON, CSV, Gephi for network analysis
6. **Collaborative Editing** - Multiple users, conflict resolution
7. **Version History** - Track changes to entity model
8. **Advanced Visualization** - Temporal networks, geospatial plots

---

## Dependencies

**Required:**

- Existing TEIDocument class
- Existing editor UI components
- Existing PatternDB for learning
- fast-xml-parser (already installed)
- TEI P5 schema (already in repo)

**Optional:**

- External NER APIs (Phase 4+)
- External visualization libraries (Phase 6+)

---

## References

- [TEI P5 Guidelines - Names, Dates, People, and Places](https://tei-c.org/release/doc/tei-p5-doc/en/html/ND.html)
- [TEI person element reference](https://www.tei-c.org/release/doc/tei-p5-doc/en/html/ref-person.html)
- [TEI standOff element documentation](https://tei-c.org/release/doc/tei-p5-doc/en/html/ref-standOff.html)
- [Computational Drama Analysis (2024)](https://hal.science/archives/hal-04639236/document)
- [FETE: Fast Encoding of Theater in TEI](https://github.com/methal-project/FETE)
- [tei-publisher-ner API](https://github.com/eeditiones/tei-publisher-ner)

---

**Design Status:** ✅ Complete
**Ready for:** Implementation planning
**Estimated Impact:** Full functional workflows + comprehensive entity modeling
**User Value:** Transform from broken UI to production-ready TEI editing tool
