# Schema-Aware Smart Selection: Gaps, Pitfalls, and Extensions

## Current Implementation Scope

**What works:**
- ✅ Structural validation (no tag splitting, no overlapping tags)
- ✅ Schema constraints for 3 tags (`<said>`, `<persName>`, `<q>`)
- ✅ Required attribute validation (`@who`, `@ref`)
- ✅ IDREF validation (character references)
- ✅ Disallowed nesting detection
- ✅ Helpful error messages and suggestions

**What's covered:**
- Parinfer-like boundary snapping
- Real-time schema validation before tag application
- User-friendly error feedback

---

## Gaps and User-Facing Pitfalls

### 1. Limited Tag Coverage

**Gap:** Only 3 TEI tags have schema constraints defined.

**User impact:**
```typescript
// User tries to apply <stage> tag
handleApplyTag('stage', { type: 'entrance' })

// ✅ Works (no constraints defined)
// ❌ But <stage> has required @type attribute!
// Schema validation will pass, but XML will be invalid
```

**Pitfall:** Users can create invalid markup for tags without constraints.

**Severity:** High - users will encounter validation errors after tag application.

---

### 2. Hardcoded Schema Constraints

**Gap:** Schema constraints are manually defined in TypeScript, not derived from actual RelaxNG schema.

**User impact:**
```typescript
// If TEI schema changes, constraints must be manually updated
export const TEI_P5_CONSTRAINTS: Record<string, SchemaConstraint> = {
  said: {
    requiredAttributes: ['who'], // What if schema changes?
    // ...
  },
};
```

**Pitfall:** Schema drift - code constraints may not match actual TEI P5 schema.

**Severity:** Medium - requires maintenance when schema updates.

---

### 3. Limited Attribute Type Validation

**Gap:** Only validates IDREF types. Other attribute types not checked.

**User impact:**
```typescript
// @rend attribute expects specific values
<q rend="italics">Text</q> // ✅ Valid
<q rend="invalid-value">Text</q> // ❌ Should be rejected, but isn't

// @corresp must be valid IDREF
<persName ref="#char-1" corresp="#nonexistent">Name</persName> // ✅ Should fail
```

**Pitfall:** Invalid attribute values pass validation.

**Severity:** Medium - will be caught by schema validation, but not caught early.

---

### 4. No Content Model Validation

**Gap:** Doesn't validate what tags can contain (text-only, mixed content, specific child tags).

**User impact:**
```typescript
// <said> should only contain text and <q> tags
// But user can select text with <persName> and apply <said>
<persName ref="#char-1">John</persName> said hello
// ↓ User selects "John" and applies <said>
// ✅ Passes current validation
// ❌ But <said> cannot contain <persName> in TEI P5!
```

**Pitfall:** Invalid content structures pass validation.

**Severity:** High - creates structurally invalid TEI markup.

---

### 5. No Co-occurrence Constraints

**Gap:** Doesn't validate mutually exclusive or required attribute combinations.

**User impact:**
```typescript
// Some attributes are mutually exclusive
<persName ref="#char-1" key="john-smith">Name</persName>
// ❌ @ref and @key might be mutually exclusive (hypothetical)

// Some attributes require other attributes
<stage who="#char-1">Entrance</stage>
// ❌ @who might require @type (hypothetical)
```

**Pitfall:** Invalid attribute combinations pass validation.

**Severity:** Low-Medium - depends on actual TEI constraints.

---

### 6. IDREF Validation Limited to Characters

**Gap:** Only validates character IDREFs. Doesn't handle places, organizations, etc.

**User impact:**
```typescript
// <placeName> with @ref to place
<placeName ref="#london-1">London</placeName>
// ❌ Will fail validation (no places in document.state.characters)

// <orgName> with @ref to organization
<orgName ref="#org-1">Company</orgName>
// ❌ Will fail validation
```

**Pitfall:** Valid entity references fail validation.

**Severity:** High - blocks valid markup for non-character entities.

---

### 7. No Undo/Redo for Failed Applications

**Gap:** When validation fails, user gets error but no path forward.

**User impact:**
```typescript
// User selects text and clicks <said> button
// ❌ "Missing required attributes: who"
// User: "Now what? How do I fix this?"

// Better UX:
// ❌ "Missing @who attribute. Select a speaker from the panel below."
// [Show character picker]
```

**Pitfall:** Users don't know how to fix validation errors.

**Severity:** High - poor user experience, users may get stuck.

---

### 8. Selection Restores After Document Updates

**Gap:** After applying a tag, the document revision changes, so selection cannot be restored.

**User impact:**
```typescript
// User selects "hello world"
// Applies <said> tag
// Document updated, revision incremented
// ❌ Selection is lost
// User must re-select text to apply another tag
```

**Pitfall:** Disruptive workflow for multi-tag operations.

**Severity:** Medium - already documented in code, but impacts UX.

---

### 9. No Performance Testing on Large Documents

**Gap:** Validation runs on every edit, but performance on large corpora unknown.

**User impact:**
```typescript
// Novel with 50,000 words and 5,000 tags
// Every tag application:
// 1. Detects tag boundaries (O(n) where n = number of tags)
// 2. Validates selection (O(n))
// 3. Validates against schema (O(n))
// Could be slow for large passages
```

**Pitfall:** Laggy UI on large documents.

**Severity:** Unknown - needs testing.

---

### 10. No Internationalization

**Gap:** Error messages and suggestions are English-only.

**User impact:**
```typescript
// French user applies <said> without @who
// Error: "Missing required attributes: who"
// ❌ User doesn't understand English
```

**Pitfall:** Non-English users have poor experience.

**Severity:** Low-Medium - depends on user base.

---

## Extension Opportunities

### 1. Schema-Driven Constraint Generation

**Idea:** Parse RelaxNG schema to extract constraints automatically.

```typescript
// Instead of hardcoded constraints:
export const TEI_P5_CONSTRAINTS = parseRelaxNGSchema('/tei-novel.rng');

// Benefits:
// - Always in sync with schema
// - Supports all tags, not just 3
// - Automatic updates when schema changes
```

**Implementation:**
- Use `libxmljs` or similar to parse RelaxNG
- Extract required attributes, types, nesting rules
- Generate constraint objects

**Priority:** High - solves gaps #1, #2

---

### 2. Comprehensive Attribute Validation

**Idea:** Validate all attribute types, not just IDREFs.

```typescript
interface AttributeTypeValidator {
  IDREF: (value: string, document: TEIDocument) => boolean;
  NCName: (value: string) => boolean; // XML NCName (no colons, must start with letter/underscore)
  string: (value: string) => boolean; // Any string
  enumerated: (value: string, allowedValues: string[]) => boolean;
  // ...
}

// For @rend attribute
rend: {
  type: 'enumerated',
  allowedValues: ['italics', 'bold', 'underline', 'etc'],
}
```

**Priority:** High - solves gap #3

---

### 3. Content Model Validation

**Idea:** Validate what content is allowed inside tags.

```typescript
interface ContentModel {
  textOnly: boolean;        // Only text, no child tags
  mixedContent: boolean;    // Text + specific child tags
  allowedChildren: string[] // Tags that can be nested
}

said: {
  contentModel: {
    mixedContent: true,
    allowedChildren: ['q'], // Can contain <q> tags
  },
}

// Validation:
// Check if selection contains only allowed child types
```

**Priority:** High - solves gap #4

---

### 4. Entity-Aware IDREF Validation

**Idea:** Validate IDREFs against all entity types, not just characters.

```typescript
interface EntityTypes {
  characters: Character[];
  places: Place[];
  organizations: Organization[];
  // ...
}

// @ref on <persName> → characters
// @ref on <placeName> → places
// @ref on <orgName> → organizations

ref: {
  type: 'IDREF',
  entityType: 'character', // Which entity type to validate against
}
```

**Priority:** High - solves gap #6

---

### 5. Auto-Fix and Quick Actions

**Idea:** Provide actionable fixes for validation errors.

```typescript
interface ValidationFix {
  type: 'addAttribute' | 'changeAttributeValue' | 'expandSelection';
  label: string;
  action: () => void;
}

// Example:
{
  valid: false,
  reason: 'Missing required attributes: who',
  fixes: [
    {
      label: 'Set speaker to "John"',
      action: () => applyTag({ who: '#char-1' }),
    },
    {
      label: 'Create new character',
      action: () => openCharacterCreator(),
    },
  ],
}
```

**Priority:** High - solves gap #7

---

### 6. Tag Suggestions Based on Context

**Idea:** Suggest appropriate tags based on selection and surrounding tags.

```typescript
// User selects "John said hello"
suggestions: [
  {
    tag: 'said',
    reason: 'This looks like dialogue',
    confidence: 0.85,
  },
  {
    tag: 'q',
    reason: 'Could be a quote',
    confidence: 0.60,
  },
]
```

**Priority:** Medium - nice-to-have, not critical

---

### 7. Multi-Tag Application

**Idea:** Apply multiple tags in one operation.

```typescript
// User selects "John said hello"
// Applies <said> with @who, <persName> with @ref in one action

// Current workflow:
// 1. Select "John"
// 2. Apply <persName> (selection lost)
// 3. Re-select "John said hello"
// 4. Apply <said>

// Improved workflow:
// 1. Select "John"
// 2. Apply <persName>
// 3. Expand selection to "John said hello"
// 4. Apply <said> (without losing <persName>)
```

**Priority:** Medium - improves workflow, solves gap #8

---

### 8. Performance Optimizations

**Idea:** Index tags for fast boundary detection, caching, incremental validation.

```typescript
// Build spatial index of tag boundaries
class TagBoundaryIndex {
  private index: IntervalTree<TagBoundary>;

  findOverlapping(range: TextRange): TagBoundary[] {
    return this.index.search(range.start, range.end);
  }
}

// Cache validation results
const validationCache = new LRUCache<string, SchemaValidationResult>();
```

**Priority:** Low - wait for performance issues to appear

---

### 9. Schema Learning Mode

**Idea:** Learn from user corrections to improve validation suggestions.

```typescript
// User selects "hello"
// Applies <said> → Error: Missing @who
// User selects "John" from character picker
// System learns: "hello" is likely spoken by "John"

// Next time user selects "hello":
// Suggest: <said who="#char-1"> with high confidence
```

**Priority:** Low - advanced feature, requires ML/user data

---

### 10. Configurable Validation Strictness

**Idea:** Allow users to choose validation level.

```typescript
enum ValidationLevel {
  Strict,    // All schema constraints enforced
  Moderate,  // Warnings for optional constraints
  Permissive, // Only critical constraints
}

// User settings:
{
  validationLevel: ValidationLevel.Moderate,
  allowExperimentalTags: true,
  ignoreNestingWarnings: false,
}
```

**Priority:** Low - nice for advanced users, not critical

---

## Recommended Next Steps

### Immediate (High Priority)

1. **Schema-driven constraints** - Parse RelaxNG to auto-generate constraints
2. **Content model validation** - Prevent invalid nesting
3. **Entity-aware IDREFs** - Support places, organizations, etc.
4. **Auto-fix UI** - Give users actionable fixes

### Short-term (Medium Priority)

5. **Comprehensive attribute validation** - All types, not just IDREFs
6. **Multi-tag application** - Better workflow for complex markup
7. **Performance testing** - Benchmark on large documents

### Long-term (Low Priority)

8. **Tag suggestions** - ML-based suggestions
9. **Configurable strictness** - Advanced user preferences
10. **Internationalization** - Multi-language support

---

## Conclusion

**Current implementation is solid for:**
- Dialogue-heavy TEI documents
- Limited tag set (`<said>`, `<persName>`, `<q>`)
- Character-centric markup

**Needs work for:**
- Full TEI P5 compliance
- All entity types (places, orgs, etc.)
- Complex content models
- Large-scale documents

**The foundation is there.** Extending to full schema coverage is a matter of:
1. Parsing RelaxNG schema (eliminate hardcoded constraints)
2. Adding content model validation
3. Expanding entity type support
4. Improving UX with auto-fixes

**Architecture is good** - extension points are clear, and the two-layer validation system (structural + schema) is sound.
