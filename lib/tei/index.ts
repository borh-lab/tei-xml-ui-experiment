// TEI document handling utilities
// Immutable architecture with pure functions

// Export new immutable types and operations
export * from './types';
export * from './operations';

// Export migration utilities
export * from './migrate';

// Export old mutable TEIDocument for backwards compatibility during migration
// TODO: Remove this after migration is complete
export { TEIDocument as TEIDocumentOld } from './TEIDocument.old';

// Re-export as TEIDocument for backwards compatibility
// Existing tests and components still use this
export { TEIDocument } from './TEIDocument.old';
