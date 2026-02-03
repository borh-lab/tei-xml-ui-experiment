/**
 * Migration Utilities for TEIDocument
 *
 * Provides utilities to migrate from the old mutable TEIDocument class
 * to the new immutable value-based architecture.
 *
 * This is a transitional module to support gradual migration.
 * TODO: Remove after all code has been migrated to immutable operations.
 */

import { TEIDocument as TEIDocumentOld } from './TEIDocument.old';
import { TEIDocument, loadDocument } from './operations';
import type { DocumentState } from './types';

/**
 * Migrate old mutable TEIDocument to new immutable format
 *
 * @param oldDoc - Old mutable TEIDocument instance
 * @returns New immutable TEIDocument
 *
 * This converts an old mutable TEIDocument class instance to the new
 * immutable value-based format. It preserves all the data including
 * raw XML, parsed structure, and any modifications.
 */
export function migrateFromOldDocument(oldDoc: TEIDocumentOld): TEIDocument {
  // Use the serialize method from the old class to get the current XML state
  // This ensures any mutations are preserved
  const xml = oldDoc.serialize();

  // Load it using the new immutable loadDocument function
  // This will create a fresh immutable document with proper event log
  return loadDocument(xml);
}

/**
 * Check if a document is in the old mutable format
 *
 * @param doc - Document to check
 * @returns true if the document is an old TEIDocument class instance
 */
export function isOldDocument(doc: any): doc is TEIDocumentOld {
  return doc !== null && doc !== undefined && typeof doc.serialize === 'function' && doc.rawXML !== undefined;
}

/**
 * Check if a document is in the new immutable format
 *
 * @param doc - Document to check
 * @returns true if the document is a new immutable TEIDocument value
 */
export function isNewDocument(doc: any): doc is TEIDocument {
  return doc !== null && doc !== undefined && doc.state !== undefined && doc.events !== undefined;
}

/**
 * Auto-migrate a document from old to new format if needed
 *
 * @param doc - Document (either old or new format)
 * @returns Immutable TEIDocument (migrated if necessary)
 *
 * This utility is useful for code that may receive either format
 * and needs to ensure it's working with the new immutable format.
 */
export function ensureImmutable(doc: TEIDocumentOld | TEIDocument | null): TEIDocument | null {
  if (doc === null) {
    return null;
  }

  if (isNewDocument(doc)) {
    return doc;
  }

  if (isOldDocument(doc)) {
    return migrateFromOldDocument(doc);
  }

  throw new Error('Unknown document format');
}

/**
 * Migrate multiple old documents
 *
 * @param oldDocs - Array of old mutable TEIDocument instances
 * @returns Array of new immutable TEIDocument values
 */
export function migrateOldDocuments(oldDocs: TEIDocumentOld[]): TEIDocument[] {
  return oldDocs.map(migrateFromOldDocument);
}

/**
 * Extract state from old document without full migration
 *
 * @param oldDoc - Old mutable TEIDocument instance
 * @returns Document state extracted from old document
 *
 * This is useful for read-only access to old document data
 * without creating a full immutable document.
 */
export function extractStateFromOldDocument(oldDoc: TEIDocumentOld): DocumentState {
  const xml = oldDoc.serialize();
  const newDoc = loadDocument(xml);
  return newDoc.state;
}
