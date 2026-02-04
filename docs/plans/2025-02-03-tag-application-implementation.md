# Tag Application Plan: Immutable Selection & Tag Wrapping

> **Goal:** Implement tag application (said, q, persName) with stable IDs, improved selection tracking, and seamless integration with immutable document architecture.

**Architecture:** SelectionManager captures selections with passage-level tracking. Tag operations create new document values. Time is explicit through document revision tracking.

**Tech Stack:** TypeScript, React 19, existing TEI parser, Foundation types

**Dependencies:** Requires Foundation Plan (immutable TEIDocument)

---

## Executive Summary

This plan implements **tag application workflow** where users select text and apply TEI tags (said, q, persName, etc.). The key improvements over the original plan:

### Key Changes from Original Plan

**Before (position-based, fragile):**

```typescript
// ❌ Positional indices break when document changes
const passageIndex = parseInt(passageId.split('-')[1], 10);
doc.wrapTextInTag(passageIndex, start, end, 'said', { who: '#speaker1' });

// ❌ SelectionManager caches mutable state
private cachedSelection: SelectionRange | null = null;

// ❌ restoreSelection has hidden temporal dependency
restoreSelection(offsets): void {
  // ❌ No validation that document hasn't changed
}
```

**After (stable IDs, explicit time):**

```typescript
// ✅ Stable content-addressable IDs
const passageId: PassageID = 'passage-abc123';
addSaidTag(doc, passageId, range, 'speaker1');

// ✅ SelectionManager returns values, caches nothing
interface SelectionSnapshot {
  readonly passageId: PassageID;
  readonly range: TextRange;
  readonly documentRevision: number;
  readonly text: string;
}

// ✅ Time-aware selection validation
function restoreSelection(doc: TEIDocument, snapshot: SelectionSnapshot): boolean {
  if (doc.state.revision !== snapshot.documentRevision) {
    return false; // ✌ Document changed, can't restore
  }
  // ... restore selection
  return true;
}
```

---

## Core Data Structures

### 1. Selection Types

**Files:**

- Create: `lib/selection/types.ts`

**Type Definitions:**

```typescript
// lib/selection/types.ts

import type { PassageID, TagID, CharacterID } from '@/lib/tei/types';

// Selection as immutable value
export interface SelectionSnapshot {
  readonly passageId: PassageID;
  readonly range: TextRange;
  readonly documentRevision: number; // ✅ Validates document hasn't changed
  readonly text: string;
  readonly container: Node; // ✌ DOM node reference (for restoration)
}

export interface TextRange {
  readonly start: number; // Character offset within passage
  readonly end: number;
}

// Tag application options
export interface TagOptions {
  readonly type: 'said' | 'q' | 'persName' | 'placeName' | 'orgName';
  readonly attributes?: Readonly<Record<string, string>>;
}

// Result of tag application
export interface TagApplicationResult {
  readonly document: TEIDocument;
  readonly tagId: TagID;
  readonly success: boolean;
  readonly error?: string;
}
```

---

### 2. SelectionManager (Value-Oriented)

**Files:**

- Refactor: `lib/selection/SelectionManager.ts`

**Refactored Implementation:**

```typescript
// lib/selection/SelectionManager.ts

import { SelectionSnapshot, TextRange } from './types';
import type { PassageID } from '@/lib/tei/types';

export class SelectionManager {
  /**
   * ✅ Pure function: Capture selection as value (no cached state)
   */
  captureSelection(): SelectionSnapshot | null {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return null;
    }

    const range = selection.getRangeAt(0);
    const text = range.toString();

    if (!text || text.trim().length === 0) {
      return null;
    }

    // Find passage container
    const passageElement = this.findPassageElement(range.commonAncestorContainer);
    if (!passageElement) {
      return null;
    }

    const passageId = passageElement.getAttribute('data-passage-id') as PassageID;
    const offsets = this.calculateOffsets(passageElement, range);

    return {
      passageId,
      range: offsets,
      documentRevision: this.getDocumentRevision(passageElement),
      text,
      container: range.commonAncestorContainer,
    };
  }

  /**
   * ✅ Pure function: Restore selection with validation
   * Returns true if successful, false if document changed
   */
  restoreSelection(doc: TEIDocument, snapshot: SelectionSnapshot): boolean {
    // ✌ Validate document hasn't changed
    if (doc.state.revision !== snapshot.documentRevision) {
      return false;
    }

    const passageElement = document.querySelector(`[data-passage-id="${snapshot.passageId}"]`);
    if (!passageElement) {
      return false;
    }

    return this.setSelectionInNode(passageElement, snapshot.range);
  }

  /**
   * ✅ Pure function: Get containing tag for current selection
   */
  getContainingTag(doc: TEIDocument, selection: SelectionSnapshot): TagInfo | null {
    const passage = doc.state.passages.find((p) => p.id === selection.passageId);
    if (!passage) return null;

    // Find tag that contains the selection range
    const containingTag = passage.tags.find(
      (tag) => selection.range.start >= tag.range.start && selection.range.end <= tag.range.end
    );

    return containingTag || null;
  }

  /**
   * ✌ Pure function: Check if selection is within a tag
   */
  isSelectionInTag(doc: TEIDocument, selection: SelectionSnapshot): boolean {
    return this.getContainingTag(doc, selection) !== null;
  }

  // Helper methods (private)

  private findPassageElement(node: Node): HTMLElement | null {
    let current: Node | null = node;
    while (current) {
      if (current instanceof HTMLElement) {
        const passageId = current.getAttribute('data-passage-id');
        if (passageId) return current;
      }
      current = current.parentNode;
    }
    return null;
  }

  private calculateOffsets(passageElement: HTMLElement, range: Range): TextRange {
    const rangeClone = range.cloneRange();
    const textRange = document.createRange();
    textRange.selectNodeContents(passageElement);
    textRange.setEnd(rangeClone.startContainer, rangeClone.startOffset);
    const start = textRange.toString().length;

    textRange.setEnd(rangeClone.endContainer, rangeClone.endOffset);
    const end = textRange.toString().length;

    return { start, end };
  }

  private getDocumentRevision(passageElement: HTMLElement): number {
    // Get revision from data attribute (set by renderer)
    const rev = passageElement.getAttribute('data-document-revision');
    return rev ? parseInt(rev, 10) : 0;
  }

  private setSelectionInNode(element: HTMLElement, range: TextRange): boolean {
    const selection = window.getSelection();
    if (!selection) return false;

    try {
      const textContent = element.textContent || '';
      const start = Math.max(0, Math.min(range.start, textContent.length));
      const end = Math.max(start, Math.min(range.end, textContent.length));

      const newRange = document.createRange();
      const nodes = this.findTextNodes(element);

      let currentOffset = 0;
      let startNode: Node | null = null;
      let startOffset = 0;
      let endNode: Node | null = null;
      let endOffset = 0;

      for (const node of nodes) {
        const length = node.textContent?.length || 0;

        if (!startNode && currentOffset + length >= start) {
          startNode = node;
          startOffset = start - currentOffset;
        }

        if (!endNode && currentOffset + length >= end) {
          endNode = node;
          endOffset = end - currentOffset;
          break; // Found end node
        }

        currentOffset += length;
      }

      if (startNode && endNode) {
        newRange.setStart(startNode, startOffset);
        newRange.setEnd(endNode, endOffset);
        selection.removeAllRanges();
        selection.addRange(newRange);
        return true;
      }

      return false;
    } catch (e) {
      console.error('Failed to restore selection:', e);
      return false;
    }
  }

  private findTextNodes(node: Node): Node[] {
    const textNodes: Node[] = [];

    function traverse(n: Node) {
      if (n.nodeType === Node.TEXT_NODE) {
        textNodes.push(n);
      } else {
        for (const child of Array.from(n.childNodes || [])) {
          traverse(child);
        }
      }
    }

    traverse(node);
    return textNodes;
  }
}

// Tag info for detected tags
export interface TagInfo {
  readonly id: TagID;
  readonly type: string;
  readonly attributes: Readonly<Record<string, string>>;
}
```

---

### 3. Tag Operations (Pure Functions)

**Files:**

- Create: `lib/tei/tag-operations.ts`

**Implementation:**

```typescript
// lib/tei/tag-operations.ts

import { TEIDocument } from './types';
import { addSaidTag, removeTag } from './operations';
import type { PassageID, TextRange, TagID, CharacterID } from './types';

/**
 * ✅ Pure function: Apply tag to selection, returns new document
 */
export function applyTagToSelection(
  doc: TEIDocument,
  selection: SelectionSnapshot,
  options: TagOptions
): TEIDocument {
  const { type, attributes } = options;

  switch (type) {
    case 'said':
      // Extract speaker from attributes
      const speakerRef = attributes?.who || attributes?.speaker;
      const speakerId = speakerRef?.replace('#', '') as CharacterID;
      return addSaidTag(doc, selection.passageId, selection.range, speakerId);

    case 'q':
      return addGenericTag(doc, selection.passageId, selection.range, 'q', attributes);

    case 'persName':
      return addGenericTag(doc, selection.passageId, selection.range, 'persName', attributes);

    case 'placeName':
      return addGenericTag(doc, selection.passageId, selection.range, 'placeName', attributes);

    case 'orgName':
      return addGenericTag(doc, selection.passageId, selection.range, 'orgName', attributes);

    default:
      throw new Error(`Unknown tag type: ${type}`);
  }
}

/**
 * ✅ Pure function: Add generic tag (not said)
 */
function addGenericTag(
  doc: TEIDocument,
  passageId: PassageID,
  range: TextRange,
  tagName: string,
  attributes?: Record<string, string>
): TEIDocument {
  // Implementation similar to addSaidTag, but for generic tags
  // ... (details similar to Foundation plan)
  return doc; // Placeholder
}

/**
 * ✅ Pure function: Remove tag from document
 */
export function removeTag(doc: TEIDocument, tagId: TagID): TEIDocument {
  return removeTag(doc, tagId);
}

/**
 * ✅ Pure function: Replace tag with different type
 */
export function replaceTag(
  doc: TEIDocument,
  oldTagId: TagID,
  newType: string,
  newAttributes?: Record<string, string>
): TEIDocument {
  // Remove old tag, add new tag with same range
  const oldTag = findTag(doc, oldTagId);
  if (!oldTag) return doc;

  let docWithoutTag = removeTag(doc, oldTagId);
  docWithoutTag = addGenericTag(
    docWithoutTag,
    oldTag.passageId,
    oldTag.range,
    newType,
    newAttributes
  );

  return docWithoutTag;
}

// Helper: Find tag by ID
function findTag(doc: TEIDocument, tagId: TagID): Tag | null {
  for (const passage of doc.state.passages) {
    const tag = passage.tags.find((t) => t.id === tagId);
    if (tag) return tag;
  }
  return null;
}

interface Tag {
  id: TagID;
  passageId: PassageID;
  range: TextRange;
  type: string;
  attributes: Record<string, string>;
}
```

---

## React Integration

### 4. TagToolbar Component

**Files:**

- Create: `components/editor/TagToolbar.tsx`
- Test: `components/editor/__tests__/TagToolbar.test.tsx`

**Implementation:**

```typescript
// components/editor/TagToolbar.tsx
'use client';

import { useState, useEffect } from 'react';
import { useDocumentContext } from '@/lib/context/DocumentContext';
import { SelectionManager } from '@/lib/selection/SelectionManager';
import { applyTagToSelection } from '@/lib/tei/tag-operations';
import { Button } from '@/components/ui/button';

interface TagToolbarProps {
  position: { x: number; y: number };
  visible: boolean;
  onClose: () => void;
}

export function TagToolbar({ position, visible, onClose }: TagToolbarProps) {
  const { doc, dispatch } = useDocumentContext();
  const [selectionManager] = useState(() => new SelectionManager());
  const [currentSelection, setCurrentSelection] = useState<SelectionSnapshot | null>(null);

  // Capture selection when toolbar opens
  useEffect(() => {
    if (visible) {
      const selection = selectionManager.captureSelection();
      setCurrentSelection(selection);
    }
  }, [visible, selectionManager]);

  if (!visible || !currentSelection) {
    return null;
  }

  const handleApplyTag = (type: string, attributes?: Record<string, string>) => {
    if (!doc) return;

    try {
      const newDoc = applyTagToSelection(doc, currentSelection, { type, attributes });
      dispatch({ type: 'SET_DOCUMENT', document: newDoc }); // Assuming reducer action

      // Clear selection after successful tag
      window.getSelection()?.removeAllRanges();
      onClose();
    } catch (error) {
      console.error('Failed to apply tag:', error);
    }
  };

  const toolbarStyle: React.CSSProperties = {
    position: 'fixed',
    left: `${position.x}px`,
    top: `${position.y}px`,
    transform: 'translateX(-50%)',
    zIndex: 50
  };

  return (
    <div style={toolbarStyle} className="bg-background border rounded-lg shadow-lg p-2 flex gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={() => handleApplyTag('said', { who: '#speaker1' })}
        title="Apply said tag (speaker1)"
      >
        &lt;said&gt;
      </Button>

      <Button
        size="sm"
        variant="outline"
        onClick={() => handleApplyTag('q')}
        title="Apply q tag"
      >
        &lt;q&gt;
      </Button>

      <Button
        size="sm"
        variant="outline"
        onClick={() => handleApplyTag('persName')}
        title="Apply persName tag"
      >
        &lt;persName&gt;
      </Button>

      <Button
        size="sm"
        variant="ghost"
        onClick={onClose}
      >
        ✕
      </Button>
    </div>
  );
}
```

---

### 5. RenderedView with Stable Passage IDs

**Files:**

- Modify: `components/editor/RenderedView.tsx`

**Key Changes:**

```typescript
// components/editor/RenderedView.tsx

// ✅ Add data-document-revision to passages for validation
const passages = doc.state.passages.map((passage, index) => ({
  id: passage.id,
  content: renderPassageContent(passage),
  revision: doc.state.revision,
  index
}));

// Render passage with stable ID and revision tracking
<div
  data-passage-id={passage.id}
  data-document-revision={passage.revision}
  className="passage"
  onClick={() => handlePassageClick(passage.id)}
>
  <p
    dangerouslySetInnerHTML={{ __html: passage.content }}
  />
</div>
```

---

## Implementation Tasks

### Task 1: Create Selection Types

- Create `lib/selection/types.ts` with SelectionSnapshot, TagOptions, etc.
- Define stable ID types (PassageID, TagID, CharacterID)
- Add JSDoc comments

### Task 2: Refactor SelectionManager

- Rename existing to `SelectionManager.old.ts`
- Create new `SelectionManager.ts` with pure functions
- Remove mutable `cachedSelection` field
- Add document revision validation to `restoreSelection`

### Task 3: Create Tag Operations Module

- Create `lib/tei/tag-operations.ts`
- Implement `applyTagToSelection` (pure function)
- Implement `replaceTag`, `removeTag`
- Add helper functions

### Task 4: Update TEI Operations (Foundation Plan Integration)

- Extend `lib/tei/operations.ts` with generic tag support
- Add `addGenericTag` function (handles q, persName, placeName, orgName)
- Update `addSaidTag` to use PassageID instead of index

### Task 5: Create TagToolbar Component

- Create `components/editor/TagToolbar.tsx`
- Integrate with DocumentContext (dispatch actions)
- Add keyboard shortcuts (1-9 for speaker1-9)
- Position toolbar above selection

### Task 6: Update RenderedView with Stable IDs

- Modify `components/editor/RenderedView.tsx` to use stable passage IDs
- Add `data-document-revision` attribute for validation
- Update passage rendering to show tags as styled spans

### Task 7: Create Tag Editor Component

- Create `components/editor/TagEditor.tsx`
- Allow editing tag attributes (e.g., change speaker)
- Show tag information when tag is clicked
- Support tag deletion

### Task 8: Keyboard Shortcuts Integration

- Integrate with existing keyboard shortcuts system
- Add shortcuts: 1-9 for speaker tags, Ctrl+Q for q tag, Ctrl+P for persName
- Show shortcut hints in UI

### Task 9: Unit Tests

- Test SelectionManager captures/restores correctly
- Test `applyTagToSelection` returns new document (no mutation)
- Test tag operations with various scenarios
- Test toolbar button actions

### Task 10: Integration Tests

- Test tag application workflow end-to-end
- Test keyboard shortcuts apply correct tags
- Test tag editor updates document
- Test undo/redo with tag operations

### Task 11: E2E Tests

- Test user selects text and applies tag
- Test tag appears in document with correct attributes
- Test keyboard shortcuts work
- Test undo/redo with tag operations

---

## Success Criteria

✅ **Stable IDs:**

- Passages use content-addressable IDs (not positional indices)
- Tags have stable IDs that don't change when document is modified
- Selection references remain valid across document updates

✅ **Time-Aware Selection:**

- SelectionManager validates document hasn't changed before restoring
- Selection includes document revision for validation
- Failed restore returns gracefully (no error)

✅ **Immutable Operations:**

- All tag operations return new document values
- No mutation of input document
- Unit tests verify immutability

✅ **User Experience:**

- Tag toolbar appears above text selection
- Keyboard shortcuts work for common tags
- Can edit tag attributes after application
- Undo/redo works with tag operations

---

## Dependencies

**Requires:**

- Foundation Plan (immutable TEIDocument types)
- Existing: React 19, shadcn/ui components
- Existing: keyboard shortcuts system

**No changes to:**

- XML parsing/serialization (keep existing)
- TEI data structures (keep parsed format)
- Rendering pipeline (extend to show tags)

---

## Time Estimates

- Task 1 (Types): 1 hour
- Task 2 (SelectionManager): 2 hours
- Task 3 (Tag Operations): 2 hours
- Task 4 (TEI Operations): 2 hours
- Task 5 (TagToolbar): 2 hours
- Task 6 (RenderedView): 1 hour
- Task 7 (Tag Editor): 2 hours
- Task 8 (Keyboard Shortcuts): 2 hours
- Task 9-11 (Tests): 4 hours

**Total:** ~18 hours (2-3 days)

---

**Plan Status:** ✅ Ready for implementation
**Complexity:** Medium (builds on Foundation Plan)
**Risk:** Low (isolated changes, clear scope)
