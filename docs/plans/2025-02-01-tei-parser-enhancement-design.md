# TEI Parser Enhancement - Design Document

**Date:** 2025-02-01
**Status:** Design Phase
**Goal:** Fix parser to recognize `<s>` tags as dialogue passages (affects 20-30 tests)

## Problem Statement

**Current Issue:** The TEIDocument parser in `lib/tei/TEIDocument.ts` only recognizes `<said>` tags for dialogue extraction, but:

1. Test documents use `<s>` tags (standard TEI for speech/spoken text)
2. Real sample documents may also use `<s>` tags
3. The `getDialogue()` method returns empty array for `<s>` tags
4. This causes 20-30 tests to fail with "No passages found"

**Current Code (line 75):**

```typescript
if (key === 'said') {
  // Only looks for <said> tags
}
```

**Expected TEI Format:**

```xml
<p>
  <s who="#narrator">Test passage 1</s>
</p>
```

## Solution Approach

I recommend **Option 1** (see below) as the primary approach with Option 2 as a fallback.

### Option 1: Enhanced getDialogue() Method (RECOMMENDED)

**Changes Required:**

1. Modify `getDialogue()` in `lib/tei/TEIDocument.ts`
2. Add support for both `<said>` AND `<s>` tags
3. Extract speaker from `@who` attribute
4. Extract text content from tag body

**Pros:**

- ✅ Backward compatible (still supports `<said>`)
- ✅ Follows TEI standard (`<s>` is correct for speech)
- ✅ Fixes all affected tests immediately
- ✅ No breaking changes to existing functionality

**Cons:**

- ⚠️ None identified

**Implementation:**

```typescript
getDialogue(): any[] {
  const dialogue: any[] = [];

  function traverse(node: any) {
    if (!node || typeof node !== 'object') return;

    if (Array.isArray(node)) {
      node.forEach(item => traverse(item));
    } else {
      for (const key in node) {
        // Support both <said> (legacy) and <s> (TEI standard)
        if (key === 'said' || key === 's') {
          const items = Array.isArray(node[key]) ? node[key] : [node[key]];
          items.forEach((item: any) => {
            dialogue.push({
              who: item['@_who'],        // Speaker ID from @who attribute
              direct: item['@_direct'],  // Optional: speech type
              aloud: item['@_aloud'],   // Optional: spoken vs. narrated
              content: item['#text'] || item,  // Text content
              element: item,
              tag: key  // Track which tag type was found
            });
          });
        } else {
          traverse(node[key]);
        }
      }
    }
  }

  traverse(this.parsed);
  return dialogue;
}
```

**Testing Strategy:**

1. Create unit test for `<s>` tag parsing
2. Create unit test for `<said>` tag parsing (backward compatibility)
3. Run e2e tests to verify 20-30 tests now pass
4. Test with real sample documents

### Option 2: Tag Normalization (ALTERNATIVE)

**Approach:** Transform `<s>` tags to `<said>` tags during parsing

**Pros:**

- ✅ Keeps existing logic intact
- ✅ Single point of transformation

**Cons:**

- ❌ Modifies parsed structure
- ❌ More complex implementation
- ❌ May break export round-trip

**Not recommended** unless Option 1 reveals issues.

## Data Flow

```
TEI Document (XML)
    ↓
TEIDocument.parse()
    ↓
getDialogue() [ENHANCED]
    ↓
Array of dialogue objects:
{
  who: "#speaker",
  content: "Dialogue text",
  tag: "s" or "said"
}
    ↓
Editor displays passages
    ↓
Tests verify passages exist ✅
```

## Error Handling

**Graceful Degradation:**

1. If neither `<said>` nor `<s>` found → return empty array (current behavior)
2. If `@who` attribute missing → use "unknown" speaker
3. If text content missing → use empty string
4. Log warnings for malformed XML (optional)

**No Breaking Changes:**

- Existing documents with `<said>` continue to work
- Empty dialogue arrays handled the same as before
- Export functionality unchanged

## Testing Plan

### Phase 1: Unit Tests (TDD)

```typescript
describe('TEIDocument.getDialogue', () => {
  test('extracts <s> tags with @who attribute', () => {
    const xml = `<TEI><body><p><s who="#speaker">Text</s></p></body></TEI>`;
    const doc = new TEIDocument(xml);
    const dialogue = doc.getDialogue();
    expect(dialogue).toHaveLength(1);
    expect(dialogue[0].who).toBe('#speaker');
    expect(dialogue[0].content).toBe('Text');
  });

  test('extracts <said> tags (backward compatibility)', () => {
    const xml = `<TEI><body><said who="#speaker">Text</said></body></TEI>`;
    const doc = new TEIDocument(xml);
    const dialogue = doc.getDialogue();
    expect(dialogue).toHaveLength(1);
  });

  test('handles missing @who gracefully', () => {
    const xml = `<TEI><body><s>Text without speaker</s></body></TEI>`;
    const doc = new TEIDocument(xml);
    const dialogue = doc.getDialogue();
    expect(dialogue).toHaveLength(1);
    expect(dialogue[0].who).toBeUndefined();
  });
});
```

### Phase 2: Integration Tests

1. Run error-scenarios e2e tests (expected: +4 tests pass)
2. Run document-upload e2e tests (expected: +15-20 tests pass)
3. Run export-validation e2e tests (expected: +5-8 tests pass)

### Phase 3: Regression Tests

1. Verify existing `<said>` documents still work
2. Verify export functionality unchanged
3. Verify real sample documents load correctly

## Success Criteria

✅ `<s>` tags are recognized as dialogue
✅ `@who` attribute extracted correctly
✅ Text content extracted correctly
✅ Backward compatible with `<said>` tags
✅ 20-30 previously failing tests now pass
✅ No existing functionality broken

## Implementation Order

1. **Write failing unit test** for `<s>` tag (TDD red)
2. **Implement enhanced `getDialogue()`**
3. **Verify unit test passes** (TDD green)
4. **Run e2e test suite** to verify improvement
5. **Check for regressions** in existing functionality

**Estimated Time:** 30-45 minutes total

---

**Does this design look right so far?** Should I proceed with implementation, or would you like to adjust the approach?
