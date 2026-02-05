// @ts-nocheck
import { categorizeError, ErrorType } from '@/lib/utils/error-categorization';

describe('categorizeError', () => {
  test('categorizes XML parse errors', () => {
    const error = new Error('XML parse error: unexpected close tag');
    const result = categorizeError(error);

    expect(result.type).toBe(ErrorType.PARSE_ERROR);
    expect(result.message).toBe('Invalid TEI format');
    expect(result.description).toBeDefined();
  });

  test('categorizes network errors', () => {
    const error = new Error('Network request failed');
    const result = categorizeError(error);

    expect(result.type).toBe(ErrorType.NETWORK_ERROR);
    expect(result.message).toBe('Connection failed');
    // Without callback, network errors don't have action
    expect(result.action).toBeUndefined();
  });

  test('categorizes file read errors', () => {
    const error = new Error('Failed to read file');
    const result = categorizeError(error);

    expect(result.type).toBe(ErrorType.FILE_ERROR);
    expect(result.message).toBe('Failed to read file');
  });

  test('categorizes validation errors', () => {
    const error = new Error('Validation failed: missing required tags');
    const result = categorizeError(error);

    expect(result.type).toBe(ErrorType.VALIDATION_ERROR);
    expect(result.message).toBe('Invalid document');
  });

  test('returns unknown error for unrecognized types', () => {
    const error = new Error('Something unexpected happened');
    const result = categorizeError(error);

    expect(result.type).toBe(ErrorType.UNKNOWN_ERROR);
    expect(result.message).toBe('An error occurred');
  });

  test('handles errors with undefined message', () => {
    const error = new Error();
    const result = categorizeError(error);

    expect(result.type).toBe(ErrorType.UNKNOWN_ERROR);
    expect(result.message).toBe('An error occurred');
    expect(result.description).toBe('Please try again.');
  });

  describe('retry callback support', () => {
    test('network errors get action when retry callback provided', () => {
      const error = new Error('Network request failed');
      const retryCallback = jest.fn();
      const result = categorizeError(error, retryCallback);

      expect(result.type).toBe(ErrorType.NETWORK_ERROR);
      expect(result.action).toBeDefined();
      expect(result.action?.label).toBe('Retry');
      expect(result.action?.onClick).toBe(retryCallback);
    });

    test('network errors have no action when retry callback not provided', () => {
      const error = new Error('Network request failed');
      const result = categorizeError(error);

      expect(result.type).toBe(ErrorType.NETWORK_ERROR);
      expect(result.action).toBeUndefined();
    });

    test('parse errors do not get action even with retry callback', () => {
      const error = new Error('XML parse error: unexpected close tag');
      const retryCallback = jest.fn();
      const result = categorizeError(error, retryCallback);

      expect(result.type).toBe(ErrorType.PARSE_ERROR);
      expect(result.action).toBeUndefined();
    });
  });
});
