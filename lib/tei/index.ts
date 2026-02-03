// TEI document handling utilities
// Immutable architecture with pure functions

// Export new immutable types and operations
export * from './types';
export * from './operations';

// Export old mutable TEIDocument for backwards compatibility during migration
// TODO: Remove this after migration is complete
export { TEIDocument as TEIDocumentOld } from './TEIDocument.old';
