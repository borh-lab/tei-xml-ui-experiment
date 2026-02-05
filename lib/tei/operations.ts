// @ts-nocheck
/**
 * TEI Document Operations (Pure Functions)
 *
 * All operations are pure functions that return new values.
 * No mutation of input parameters.
 *
 * Core principle: TEIDocument is an immutable value.
 * Updates create new values with shared structure for efficiency.
 */

import { XMLParser, XMLBuilder } from 'fast-xml-parser';

// Initialize counters for browser-compatible unique IDs
if (typeof globalThis.__tagCounter === 'undefined') {
  globalThis.__tagCounter = 1;
  globalThis.__passageCounter = 1;
}

import {
  TEIDocument,
  DocumentState,
  DocumentEvent,
  PassageID,
  TagID,
  CharacterID,
  TextRange,
  Passage,
  Tag,
  Character,
  Dialogue,
  Relationship,
  TEINode,
} from './types';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate content-based passage ID
 * Simple hash for stable IDs across sessions
 */
function generatePassageId(content: string, index: number): PassageID {
  // Simple string hash for browser compatibility
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Add index to handle same content at different positions
  hash = hash + index;

  // Convert to hex and pad to 12 characters
  const hexHash = Math.abs(hash).toString(16).padStart(12, '0').substring(0, 12);

  return `passage-${hexHash}` as PassageID;
}

/**
 * Extract metadata from parsed TEI document
 */
function extractMetadata(parsed: TEINode): DocumentState['metadata'] {
  const teiHeader = parsed.TEI?.teiHeader;
  const fileDesc = teiHeader?.fileDesc;
  const titleStmt = teiHeader?.fileDesc?.titleStmt;

  return {
    title: titleStmt?.title?.['#text'] || titleStmt?.title || 'Untitled',
    author: titleStmt?.author?.['#text'] || titleStmt?.author || 'Unknown',
    created: new Date(), // Could parse from teiHeader if present
  };
}

/**
 * Extract passages from parsed TEI document
 * Converts TEI <p> elements to Passage[] with stable IDs
 */
function extractPassages(parsed: TEINode): readonly Passage[] {
  const body = parsed.TEI?.text?.body;
  if (!body) return [];

  const paragraphs = body.p;
  if (!paragraphs) return [];

  // Handle single paragraph (not an array)
  const pArray = Array.isArray(paragraphs) ? paragraphs : [paragraphs];

  return pArray.map((p: TEINode, index: number) => {
    // Get full text content of passage
    const content = extractPassageText(p);

    // Generate stable ID from content
    const id = generatePassageId(content, index);

    // Extract existing tags from TEI markup
    const tags = extractTagsFromPassage(p);

    return {
      id,
      index,
      content,
      tags,
    };
  });
}

/**
 * Extract text content from a passage node
 */
function extractPassageText(passage: TEINode): string {
  if (typeof passage === 'string') {
    return passage;
  }

  let text = '';

  // Add #text if exists (text before first element)
  if (passage['#text']) {
    text += passage['#text'];
  }

  // Collect all elements in order
  const elementKeys: string[] = [];
  for (const key in passage) {
    if (!key.startsWith('#') && !key.startsWith('@_')) {
      elementKeys.push(key);
    }
  }

  // Process elements in order
  for (const key of elementKeys) {
    const element = passage[key];
    const elements = Array.isArray(element) ? element : [element];

    for (const el of elements) {
      if (typeof el === 'string') {
        text += el;
      } else if (el['#text']) {
        text += el['#text'];
      }
    }
  }

  // Add #text_2, #text_3, etc. if exists (text after elements)
  let i = 2;
  while (passage[`#text_${i}`]) {
    text += passage[`#text_${i}`];
    i++;
  }

  return text;
}

/**
 * Extract tags from a passage (said, q, persName, etc.)
 * This parses existing TEI markup into Tag[] format
 */
function extractTagsFromPassage(passage: TEINode): readonly Tag[] {
  const tags: Tag[] = [];

  // Helper to find text position for a tag
  // Note: This is a simplified version - full implementation would need
  // to track character positions while building the passage text
  const findTagPosition = (passageText: string, tagContent: string): TextRange => {
    const start = passageText.indexOf(tagContent);
    if (start === -1) {
      return { start: 0, end: tagContent.length };
    }
    return { start, end: start + tagContent.length };
  };

  // Extract <said> tags
  if (passage.said) {
    const saidElements = Array.isArray(passage.said) ? passage.said : [passage.said];

    saidElements.forEach((said: TEINode, idx: number) => {
      const content = said['#text'] || '';
      const passageText = extractPassageText(passage);
      const range = findTagPosition(passageText, content);

      tags.push({
        id: `tag-${`tag-${globalThis.__tagCounter++ || 1}`}` as TagID,
        type: 'said',
        range,
        attributes: {
          who: said['@_who'] || said['@_speaker'] || '',
          ...(said['@_direct'] && { direct: said['@_direct'] }),
          ...(said['@_aloud'] && { aloud: said['@_aloud'] }),
        },
      });
    });
  }

  // Extract <q> tags
  if (passage.q) {
    const qElements = Array.isArray(passage.q) ? passage.q : [passage.q];

    qElements.forEach((q: TEINode) => {
      const content = q['#text'] || '';
      const passageText = extractPassageText(passage);
      const range = findTagPosition(passageText, content);

      tags.push({
        id: `tag-${`tag-${globalThis.__tagCounter++ || 1}`}` as TagID,
        type: 'q',
        range,
        attributes: {},
      });
    });
  }

  // Extract <persName> tags
  if (passage.persName) {
    const persNameElements = Array.isArray(passage.persName) ? passage.persName : [passage.persName];

    persNameElements.forEach((persName: TEINode) => {
      const content = persName['#text'] || '';
      const passageText = extractPassageText(passage);
      const range = findTagPosition(passageText, content);

      tags.push({
        id: `tag-${`tag-${globalThis.__tagCounter++ || 1}`}` as TagID,
        type: 'persName',
        range,
        attributes: {
          ...(persName['@_ref'] && { ref: persName['@_ref'] }),
        },
      });
    });
  }

  // Similar extraction for placeName, orgName...

  return tags;
}

/**
 * Extract characters from parsed TEI document
 */
function extractCharacters(parsed: TEINode): readonly Character[] {
  const standOff = parsed.TEI?.standOff;
  if (!standOff) return [];

  const listPerson = standOff.listPerson;
  if (!listPerson) return [];

  const persons = listPerson.person;
  if (!persons) return [];

  const personArray = Array.isArray(persons) ? persons : [persons];

  return personArray.map((person: TEINode) => {
    const xmlId = person['@_xml:id'] || person['xml:id'] || `char-${`tag-${globalThis.__tagCounter++ || 1}`}`;

    return {
      id: `char-${xmlId}` as CharacterID,
      xmlId,
      name: person.persName?.['#text'] || person.persName || 'Unknown',
      sex: person.sex?.['@_value'],
      age: person.age?.['@_value'] ? parseInt(person.age['@_value']) : undefined,
    };
  });
}

/**
 * Extract relationships from parsed TEI document
 */
function extractRelationships(parsed: TEINode): readonly Relationship[] {
  const standOff = parsed.TEI?.standOff;
  if (!standOff) return [];

  const listRelation = standOff.listRelation;
  if (!listRelation) return [];

  const relations = listRelation.relation;
  if (!relations) return [];

  const relationArray = Array.isArray(relations) ? relations : [relations];

  return relationArray.map((rel: TEINode) => {
    const active = rel['@_active']?.replace('#', '') || '';
    const passive = rel['@_passive']?.replace('#', '') || '';
    const name = rel['@_name'] || 'unknown';

    return {
      id: rel['@_xml:id'] || `${name}-${active}-${passive}`,
      from: active,
      to: passive,
      type: name,
      subtype: rel['@_subtype'],
      mutual: rel['@_mutual'] !== 'false',
    };
  });
}

/**
 * Extract text content from a tag
 */
function extractContent(passage: Passage, tag: Tag): string {
  return passage.content.substring(tag.range.start, tag.range.end);
}

// ============================================================================
// Core Operations
// ============================================================================

/**
 * Load a TEI document from XML string
 * Creates initial document state with loaded event
 */
export function loadDocument(xml: string): TEIDocument {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
  });

  const parsed = parser.parse(xml);

  const state: DocumentState = {
    xml,
    parsed,
    revision: 0,
    metadata: extractMetadata(parsed),
    passages: extractPassages(parsed),
    dialogue: [], // Will be populated from <said> tags
    characters: extractCharacters(parsed),
    relationships: extractRelationships(parsed),
  };

  const event: DocumentEvent = {
    type: 'loaded',
    xml,
    timestamp: Date.now(),
    revision: 0,
  };

  return { state, events: [event] };
}

/**
 * Add a <said> tag to a passage
 * Returns new document with updated state and event log
 */
export function addSaidTag(
  doc: TEIDocument,
  passageId: PassageID,
  range: TextRange,
  speaker: CharacterID
): TEIDocument {
  const passage = doc.state.passages.find((p) => p.id === passageId);
  if (!passage) {
    throw new Error(`Passage not found: ${passageId}`);
  }

  const tagId = `tag-${globalThis.__tagCounter++}` as TagID;
  const newTag: Tag = {
    id: tagId,
    type: 'said',
    range,
    attributes: { who: `#${speaker}` },
  };

  const newPassage: Passage = {
    ...passage,
    tags: [...passage.tags, newTag],
  };

  const updatedPassages = doc.state.passages.map((p) =>
    p.id === passageId ? newPassage : p
  );

  const newDialogue: Dialogue = {
    id: tagId,
    passageId,
    range,
    speaker,
    content: passage.content.substring(range.start, range.end),
  };

  const state: DocumentState = {
    ...doc.state,
    passages: updatedPassages,
    dialogue: [...doc.state.dialogue, newDialogue],
    revision: doc.state.revision + 1,
  };

  const event: DocumentEvent = {
    type: 'saidTagAdded',
    id: tagId,
    passageId,
    range,
    speaker,
    timestamp: Date.now(),
    revision: state.revision,
  };

  return { state, events: [...doc.events, event] };
}

/**
 * Remove a tag from document
 * Returns new document with tag removed from passages and dialogue
 */
export function removeTag(doc: TEIDocument, tagId: TagID): TEIDocument {
  const state = doc.state;

  const updatedPassages = state.passages.map((passage) => ({
    ...passage,
    tags: passage.tags.filter((t) => t.id !== tagId),
  }));

  const updatedDialogue = state.dialogue.filter((d) => d.id !== tagId);

  return {
    state: {
      ...state,
      passages: updatedPassages,
      dialogue: updatedDialogue,
      revision: state.revision + 1,
    },
    events: [
      ...doc.events,
      {
        type: 'tagRemoved',
        id: tagId,
        timestamp: Date.now(),
        revision: state.revision + 1,
      },
    ],
  };
}

/**
 * Add a generic tag to a passage
 * Returns new document with added tag
 */
export function addTag(
  doc: TEIDocument,
  passageId: PassageID,
  range: TextRange,
  tagName: string,
  attributes?: Record<string, string>
): TEIDocument {
  const passage = doc.state.passages.find((p) => p.id === passageId);
  if (!passage) {
    throw new Error(`Passage not found: ${passageId}`);
  }

  const tagId = `tag-${`tag-${globalThis.__tagCounter++ || 1}`}` as TagID;
  const newTag: Tag = {
    id: tagId,
    type: tagName as Tag['type'], // Cast to Tag type union
    range,
    attributes: attributes || {},
  };

  const newPassage: Passage = {
    ...passage,
    tags: [...passage.tags, newTag],
  };

  const updatedPassages = doc.state.passages.map((p) =>
    p.id === passageId ? newPassage : p
  );

  const state: DocumentState = {
    ...doc.state,
    passages: updatedPassages,
    revision: doc.state.revision + 1,
  };

  // For non-said tags, we don't add to dialogue
  const event: DocumentEvent = {
    type: 'tagAdded', // We'd need to add this event type to DocumentEvent
    id: tagId,
    passageId,
    range,
    timestamp: Date.now(),
    revision: state.revision,
  } as any; // eslint-disable-line @typescript-eslint/no-explicit-any -- tagAdded event type not yet in DocumentEvent union

  return { state, events: [...doc.events, event] };
}

/**
 * Undo to specific revision
 * Rebuilds state by replaying events up to target revision
 * Keeps full event log for redo capability
 */
export function undoTo(doc: TEIDocument, targetRevision: number): TEIDocument {
  // Filter events to only those up to target revision for rebuild
  const eventsToReplay = doc.events.filter((e) => e.revision <= targetRevision);
  const state = rebuildState(eventsToReplay);
  // Keep full event log for redo capability
  return { state, events: doc.events };
}

/**
 * Redo from revision
 * Replays all events up to the next revision after fromRevision
 * Keeps full event log
 */
export function redoFrom(doc: TEIDocument, fromRevision: number): TEIDocument {
  // Find next revision to replay to
  const futureRevisions = doc.events
    .filter((e) => e.revision > fromRevision)
    .map((e) => e.revision)
    .sort((a, b) => a - b);

  if (futureRevisions.length === 0) {
    // Nothing to redo
    return doc;
  }

  const targetRevision = futureRevisions[0];
  const eventsToReplay = doc.events.filter((e) => e.revision <= targetRevision);
  const state = rebuildState(eventsToReplay);

  return { state, events: doc.events };
}

/**
 * Serialize document to XML
 * Uses existing XMLBuilder to convert state back to XML
 * Handles both new immutable documents (doc.state.parsed) and old TEIDocument class (doc.parsed)
 */
export function serializeDocument(doc: TEIDocument | { state?: { parsed?: TEINode }; parsed?: TEINode; serialize?: () => string }): string {
  // For old TEIDocument class, use its serialize method if available
  if (typeof doc.serialize === 'function') {
    return doc.serialize();
  }

  // For new immutable document model, access via state.parsed
  const parsed = doc.state?.parsed || doc.parsed;
  if (!parsed) {
    throw new Error('Cannot serialize document: no parsed data found');
  }

  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    format: true,
  });
  return builder.build(parsed);
}

// ============================================================================
// State Rebuilding
// ============================================================================

/**
 * Rebuild document state from events
 * Applies events in order to reconstruct current state
 */
function rebuildState(events: readonly DocumentEvent[]): DocumentState {
  let state: DocumentState | null = null;

  for (const event of events) {
    switch (event.type) {
      case 'loaded':
        state = loadDocumentInternal(event.xml);
        break;

      case 'saidTagAdded':
        state = applySaidTagAdded(state!, event);
        break;

      case 'tagRemoved':
        state = applyTagRemoved(state!, event);
        break;

      case 'characterAdded':
        state = applyCharacterAdded(state!, event);
        break;

      case 'characterRemoved':
        state = applyCharacterRemoved(state!, event);
        break;

      case 'relationAdded':
        state = applyRelationAdded(state!, event);
        break;

      case 'relationRemoved':
        state = applyRelationRemoved(state!, event);
        break;
    }
  }

  return state!;
}

/**
 * Load document internally (for rebuildState)
 */
function loadDocumentInternal(xml: string): DocumentState {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
  });

  const parsed = parser.parse(xml);

  return {
    xml,
    parsed,
    revision: 0,
    metadata: extractMetadata(parsed),
    passages: extractPassages(parsed),
    dialogue: [],
    characters: extractCharacters(parsed),
    relationships: extractRelationships(parsed),
  };
}

/**
 * Apply saidTagAdded event to state
 */
function applySaidTagAdded(
  state: DocumentState,
  event: Extract<DocumentEvent, { type: 'saidTagAdded' }>
): DocumentState {
  const passage = state.passages.find((p) => p.id === event.passageId);
  if (!passage) return state;

  const newTag: Tag = {
    id: event.id,
    type: 'said',
    range: event.range,
    attributes: { who: `#${event.speaker}` },
  };

  const newPassage: Passage = {
    ...passage,
    tags: [...passage.tags, newTag],
  };

  const updatedPassages = state.passages.map((p) =>
    p.id === event.passageId ? newPassage : p
  );

  const newDialogue: Dialogue = {
    id: event.id,
    passageId: event.passageId,
    range: event.range,
    speaker: event.speaker,
    content: passage.content.substring(event.range.start, event.range.end),
  };

  return {
    ...state,
    passages: updatedPassages,
    dialogue: [...state.dialogue, newDialogue],
    revision: event.revision,
  };
}

/**
 * Apply tagRemoved event to state
 */
function applyTagRemoved(
  state: DocumentState,
  event: Extract<DocumentEvent, { type: 'tagRemoved' }>
): DocumentState {
  const updatedPassages = state.passages.map((passage) => ({
    ...passage,
    tags: passage.tags.filter((t) => t.id !== event.id),
  }));

  const updatedDialogue = state.dialogue.filter((d) => d.id !== event.id);

  return {
    ...state,
    passages: updatedPassages,
    dialogue: updatedDialogue,
    revision: event.revision,
  };
}

/**
 * Apply characterAdded event to state
 */
function applyCharacterAdded(
  state: DocumentState,
  event: Extract<DocumentEvent, { type: 'characterAdded' }>
): DocumentState {
  return {
    ...state,
    characters: [...state.characters, event.character],
    revision: event.revision,
  };
}

/**
 * Apply characterRemoved event to state
 */
function applyCharacterRemoved(
  state: DocumentState,
  event: Extract<DocumentEvent, { type: 'characterRemoved' }>
): DocumentState {
  return {
    ...state,
    characters: state.characters.filter((c) => c.id !== event.id),
    revision: event.revision,
  };
}

/**
 * Apply relationAdded event to state
 */
function applyRelationAdded(
  state: DocumentState,
  event: Extract<DocumentEvent, { type: 'relationAdded' }>
): DocumentState {
  return {
    ...state,
    relationships: [...state.relationships, event.relation],
    revision: event.revision,
  };
}

/**
 * Apply relationRemoved event to state
 */
function applyRelationRemoved(
  state: DocumentState,
  event: Extract<DocumentEvent, { type: 'relationRemoved' }>
): DocumentState {
  return {
    ...state,
    relationships: state.relationships.filter((r) => r.id !== event.id),
    revision: event.revision,
  };
}

// ============================================================================
// ============================================================================
// Entity Operations (re-exported from entity-operations.ts)
// ============================================================================

// Re-export entity operations from entity-operations module
// These provide complete CRUD operations with validation
export {
  addCharacter,
  updateCharacter,
  removeCharacter,
  addRelation as addRelationship,
  removeRelation as removeRelationship,
} from './entity-operations';

/**
 * Add a persName tag to a passage at the specified range
 * This is a convenience wrapper around addTag for the persName tag type
 */
export function addPersNameTag(
  doc: TEIDocument,
  passageId: PassageID,
  range: TextRange
): TEIDocument {
  return addTag(doc, passageId, range, 'persName');
}
