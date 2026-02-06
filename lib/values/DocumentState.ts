/**
 * DocumentState - Immutable state value for document operations
 *
 * Replaces scattered mutable state variables with a single immutable value.
 * State transitions are explicit (old state → new state) rather than mutations.
 */

import type { TEIDocument } from '@/lib/tei/types';
import type { ValidationResult } from '@/lib/validation/types';

/**
 * Document status
 */
export type DocumentStatus =
  | 'idle'      // No document loaded
  | 'loading'   // Operation in progress
  | 'success'   // Document loaded successfully
  | 'error';    // Operation failed

/**
 * Validation snapshot with temporal context
 *
 * Captures validation results with revision and timestamp
 * to detect stale results and enable proper caching.
 */
export interface ValidationSnapshot {
  readonly results: ValidationResult;
  readonly revision: number;       // Document revision when validated
  readonly validatedAt: Date;      // When validation was performed
}

/**
 * DocumentState - Single immutable state value
 *
 * Replaces 7 scattered state variables:
 * - document, loading, loadingSample, loadingProgress
 * - validationResults, isValidating, error
 *
 * All state in one place = one twist = simple.
 */
export interface DocumentState {
  readonly document: TEIDocument | null;
  readonly status: DocumentStatus;
  readonly validation: ValidationSnapshot | null;
  readonly error: Error | null;
  readonly currentDocId: string | null;
}

/**
 * Create initial state
 */
export const initialState = (): DocumentState => ({
  document: null,
  status: 'idle',
  validation: null,
  error: null,
  currentDocId: null,
});

/**
 * Helper: Check if state represents success
 */
export const isSuccess = (state: DocumentState): boolean =>
  state.status === 'success' && state.document !== null;

/**
 * Helper: Check if validation is stale (revision mismatch)
 */
export const isValidationStale = (
  state: DocumentState
): boolean => {
  if (!state.validation || !state.document) return false;
  return state.validation.revision !== state.document.state.revision;
};
