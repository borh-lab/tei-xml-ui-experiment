export interface ProtocolError {
  readonly code: string;
  readonly message: string;
  readonly context?: Record<string, unknown>;
  readonly recoverable: boolean;
}

export type Result<T> =
  | { readonly success: true; readonly value: T }
  | { readonly success: false; readonly error: ProtocolError };

export function success<T>(value: T): Result<T> {
  return { success: true, value };
}

export function failure<T>(
  code: string,
  message: string,
  recoverable: boolean = true,
  context?: Record<string, unknown>
): Result<T> {
  return {
    success: false,
    error: { code, message, context, recoverable },
  };
}

export function isSuccess<T>(result: Result<T>): result is { success: true; value: T } {
  return result.success;
}

export function isFailure<T>(result: Result<T>): result is { success: false; error: ProtocolError } {
  return !result.success;
}

export function map<T, U>(result: Result<T>, fn: (value: T) => U): Result<U> {
  if (isSuccess(result)) return success(fn(result.value));
  return result;
}

export function chain<T, U>(result: Result<T>, fn: (value: T) => Result<U>): Result<U> {
  if (isSuccess(result)) return fn(result.value);
  return result;
}

export function unwrap<T>(result: Result<T>): T {
  if (isSuccess(result)) return result.value;
  throw new Error(`Protocol error: ${result.error.message} (${result.error.code})`);
}

export function getValueOrDefault<T>(result: Result<T>, defaultValue: T): T {
  return isSuccess(result) ? result.value : defaultValue;
}
