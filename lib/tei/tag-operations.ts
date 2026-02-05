/**
 * Tag Operations (Pure Functions)
 *
 * Functions for applying tags to text selections.
 * All operations return new document values (no mutation).
 */

import { TEIDocument, Tag } from './types';
import { addSaidTag, removeTag, addTag } from './operations';
import type { PassageID, TextRange, TagID, CharacterID } from './types';
import type { SelectionSnapshot, TagOptions, TagApplicationResult } from '@/lib/selection/types';

/**
 * Pure function: Apply tag to selection, returns new document
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
 * Apply tag and return detailed result
 */
export function applyTagToSelectionWithResult(
  doc: TEIDocument,
  selection: SelectionSnapshot,
  options: TagOptions
): TagApplicationResult {
  try {
    const newDoc = applyTagToSelection(doc, selection, options);

    // Find the newly created tag
    const passage = newDoc.state.passages.find((p) => p.id === selection.passageId);
    const newTag = passage?.tags.find(
      (t) => t.range.start === selection.range.start && t.range.end === selection.range.end
    );

    return {
      document: newDoc,
      tagId: newTag?.id || ('unknown' as TagID),
      success: true,
    };
  } catch (error) {
    return {
      document: doc,
      tagId: 'unknown' as TagID,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Pure function: Add generic tag (not said)
 */
export function addGenericTag(
  doc: TEIDocument,
  passageId: PassageID,
  range: TextRange,
  tagName: string,
  attributes?: Record<string, string>
): TEIDocument {
  return addTag(doc, passageId, range, tagName, attributes);
}

/**
 * Pure function: Remove tag from document
 */
export function removeTagFromSelection(
  doc: TEIDocument,
  tagId: TagID
): TEIDocument {
  return removeTag(doc, tagId);
}

/**
 * Pure function: Replace tag with different type
 */
export function replaceTag(
  doc: TEIDocument,
  oldTagId: TagID,
  newType: string,
  newAttributes?: Record<string, string>
): TEIDocument {
  // Find the old tag
  let oldTag: Tag | null = null;
  let passageId: PassageID | null = null;

  for (const passage of doc.state.passages) {
    const tag = passage.tags.find((t) => t.id === oldTagId);
    if (tag) {
      oldTag = tag;
      passageId = passage.id;
      break;
    }
  }

  if (!oldTag || !passageId) {
    return doc;
  }

  // Remove old tag, add new tag with same range
  let docWithoutTag = removeTag(doc, oldTagId);
  docWithoutTag = addGenericTag(
    docWithoutTag,
    passageId,
    oldTag.range,
    newType,
    newAttributes
  );

  return docWithoutTag;
}

/**
 * Check if a tag exists at the given selection
 */
export function tagExistsAtSelection(
  doc: TEIDocument,
  selection: SelectionSnapshot
): boolean {
  const passage = doc.state.passages.find((p) => p.id === selection.passageId);
  if (!passage) return false;

  return passage.tags.some(
    (tag) =>
      tag.range.start === selection.range.start && tag.range.end === selection.range.end
  );
}
