import { initialState, isSuccess, isValidationStale, type DocumentState } from '../DocumentState';
import type { TEIDocument } from '@/lib/tei/types';

describe('DocumentState', () => {
  describe('initialState', () => {
    it('should create empty initial state', () => {
      const state = initialState();
      expect(state.document).toBeNull();
      expect(state.status).toBe('idle');
      expect(state.validation).toBeNull();
      expect(state.error).toBeNull();
    });
  });

  describe('isSuccess', () => {
    it('should return false for idle state', () => {
      const state: DocumentState = initialState();
      expect(isSuccess(state)).toBe(false);
    });

    it('should return false for loading state', () => {
      const state: DocumentState = { ...initialState(), status: 'loading' };
      expect(isSuccess(state)).toBe(false);
    });

    it('should return true for success state with document', () => {
      const mockDoc = { state: { revision: 1 } } as TEIDocument;
      const state: DocumentState = {
        document: mockDoc,
        status: 'success',
        validation: null,
        error: null,
      };
      expect(isSuccess(state)).toBe(true);
    });

    it('should return false for success state without document', () => {
      const state: DocumentState = {
        document: null,
        status: 'success',
        validation: null,
        error: null,
      };
      expect(isSuccess(state)).toBe(false);
    });
  });

  describe('isValidationStale', () => {
    it('should return false when no validation', () => {
      const state: DocumentState = initialState();
      expect(isValidationStale(state)).toBe(false);
    });

    it('should return false when no document', () => {
      const state: DocumentState = {
        ...initialState(),
        validation: {
          results: { valid: true, errors: [], warnings: [] },
          revision: 5,
          validatedAt: new Date(),
        },
      };
      expect(isValidationStale(state)).toBe(false);
    });

    it('should return false when validation revision matches', () => {
      const mockDoc = { state: { revision: 5 } } as TEIDocument;
      const state: DocumentState = {
        document: mockDoc,
        status: 'success',
        validation: {
          results: { valid: true, errors: [], warnings: [] },
          revision: 5,
          validatedAt: new Date(),
        },
        error: null,
      };
      expect(isValidationStale(state)).toBe(false);
    });

    it('should return true when validation revision differs', () => {
      const mockDoc = { state: { revision: 6 } } as TEIDocument;
      const state: DocumentState = {
        document: mockDoc,
        status: 'success',
        validation: {
          results: { valid: true, errors: [], warnings: [] },
          revision: 5, // Stale!
          validatedAt: new Date(),
        },
        error: null,
      };
      expect(isValidationStale(state)).toBe(true);
    });
  });
});
