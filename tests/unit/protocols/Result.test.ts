import { success, failure, isSuccess, isFailure, map, chain, unwrap, getValueOrDefault } from '@/lib/protocols/Result';

describe('Result type', () => {
  it('should create success', () => {
    const result = success(42);
    expect(isSuccess(result)).toBe(true);
    expect(isFailure(result)).toBe(false);
    if (isSuccess(result)) {
      expect(result.value).toBe(42);
    }
  });

  it('should create failure', () => {
    const result = failure('ERR', 'Error');
    expect(isFailure(result)).toBe(true);
    expect(isSuccess(result)).toBe(false);
    if (isFailure(result)) {
      expect(result.error.code).toBe('ERR');
      expect(result.error.message).toBe('Error');
      expect(result.error.recoverable).toBe(true);
    }
  });

  it('should create failure with context', () => {
    const result = failure('ERR', 'Error', true, { key: 'value' });
    if (isFailure(result)) {
      expect(result.error.context).toEqual({ key: 'value' });
    }
  });

  it('should create unrecoverable failure', () => {
    const result = failure('FATAL', 'Fatal error', false);
    if (isFailure(result)) {
      expect(result.error.recoverable).toBe(false);
    }
  });

  it('should map success', () => {
    const result = success(5);
    const doubled = map(result, (x) => x * 2);
    if (isSuccess(doubled)) {
      expect(doubled.value).toBe(10);
    }
  });

  it('should not map failure', () => {
    const result = failure('ERR', 'Error');
    const mapped = map(result, (x) => x * 2);
    expect(isFailure(mapped)).toBe(true);
    if (isFailure(mapped)) {
      expect(mapped.error.code).toBe('ERR');
    }
  });

  it('should chain results', () => {
    const result = success(5);
    const chained = chain(result, (x) => success(x * 2));
    if (isSuccess(chained)) {
      expect(chained.value).toBe(10);
    }
  });

  it('should break chain on failure', () => {
    const result = failure('ERR', 'Error');
    const chained = chain(result, (x) => success(x * 2));
    expect(isFailure(chained)).toBe(true);
  });

  it('should chain failures', () => {
    const result = success(5);
    const chained = chain(result, () => failure('ERR2', 'Error2'));
    expect(isFailure(chained)).toBe(true);
    if (isFailure(chained)) {
      expect(chained.error.code).toBe('ERR2');
    }
  });

  it('should unwrap success', () => {
    expect(unwrap(success(42))).toBe(42);
  });

  it('should throw on unwrap failure', () => {
    expect(() => unwrap(failure('ERR', 'Error'))).toThrow('Protocol error: Error (ERR)');
  });

  it('should get value or default', () => {
    expect(getValueOrDefault(success(42), 0)).toBe(42);
    expect(getValueOrDefault(failure('ERR', 'Error'), 0)).toBe(0);
  });
});
