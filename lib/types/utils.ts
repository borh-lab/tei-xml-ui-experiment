/**
 * TypeScript Type Utilities
 *
 * Advanced type utilities for type-safe transformations and inference.
 * These utilities complement TypeScript's built-in utility types.
 */

// ============================================================================
// Type Extraction Utilities (using `infer`)
// ============================================================================

/**
 * Extract the resolved type from a Promise
 *
 * @example
 * type AsyncNum = PromiseType<Promise<number>>; // number
 */
export type PromiseType<T> = T extends Promise<infer U> ? U : T;

/**
 * Extract the element type from an array
 *
 * @example
 * type NumArray = ElementType<number[]>; // number
 */
export type ElementType<T> = T extends (infer U)[] ? U : never;

/**
 * Extract the return type of a function
 *
 * @example
 * function foo() { return { x: 1 }; }
 * type FooReturn = ReturnType<typeof foo>; // { x: number }
 */
export type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

/**
 * Extract parameter types from a function
 *
 * @example
 * function foo(a: string, b: number) {}
 * type FooParams = Parameters<typeof foo>; // [string, number]
 */
export type Parameters<T> = T extends (...args: infer P) => any ? P : never;

/**
 * Extract the instance type of a class or constructor
 *
 * @example
 * class Foo { x = 1; }
 * type FooInstance = InstanceType<typeof Foo>; // Foo
 */
export type InstanceType<T> = T extends new (...args: any[]) => infer R ? R : any;

// ============================================================================
// Deep Transformation Types (Mapped Types)
// ============================================================================

/**
 * Deep readonly - makes all nested properties readonly
 *
 * @example
 * type Config = { server: { host: string; port: number } };
 * type ReadonlyConfig = DeepReadonly<Config>;
 * // { readonly server: { readonly host: string; readonly port: number } }
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object
    ? T[P] extends Function
      ? T[P]
      : DeepReadonly<T[P]>
    : T[P];
};

/**
 * Deep partial - makes all nested properties optional
 *
 * @example
 * type Config = { server: { host: string; port: number } };
 * type PartialConfig = DeepPartial<Config>;
 * // { server?: { host?: string; port?: number } }
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object
    ? T[P] extends Array<infer U>
      ? Array<DeepPartial<U>>
      : DeepPartial<T[P]>
    : T[P];
};

/**
 * Deep required - makes all nested properties required
 *
 * @example
 * type Config = { server?: { host?: string } };
 * type RequiredConfig = DeepRequired<Config>;
 * // { server: { host: string } }
 */
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object
    ? T[P] extends Array<infer U>
      ? Array<DeepRequired<U>>
      : DeepRequired<T[P]>
    : T[P];
};

// ============================================================================
// Property Filtering Types (Mapped Types with Key Remapping)
// ============================================================================

/**
 * Get optional property names
 *
 * @example
 * interface Foo { a: string; b?: number; c?: boolean }
 * type OptionalKeys = OptionalPropertyNames<Foo>; // "b" | "c"
 */
export type OptionalPropertyNames<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? K : never;
}[keyof T];

/**
 * Get required property names
 *
 * @example
 * interface Foo { a: string; b?: number; c?: boolean }
 * type RequiredKeys = RequiredPropertyNames<Foo>; // "a"
 */
export type RequiredPropertyNames<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
}[keyof T];

/**
 * Pick only properties of a specific type
 *
 * @example
 * interface Foo { a: string; b: number; c: string; d: boolean }
 * type OnlyStrings = PickByType<Foo, string>; // { a: string; c: string }
 */
export type PickByType<T, U> = {
  [K in keyof T as T[K] extends U ? K : never]: T[K];
};

/**
 * Omit properties of a specific type
 *
 * @example
 * interface Foo { a: string; b: number; c: string; d: boolean }
 * type NoStrings = OmitByType<Foo, string>; // { b: number; d: boolean }
 */
export type OmitByType<T, U> = {
  [K in keyof T as T[K] extends U ? never : K]: T[K];
};

/**
 * Make specific keys readonly
 *
 * @example
 * interface Foo { a: string; b: number; c: boolean }
 * type ReadonlyAB = ReadonlyKeys<Foo, 'a' | 'b'>;
 * // { readonly a: string; readonly b: number; c: boolean }
 */
export type ReadonlyKeys<T, K extends keyof T> = Omit<T, K> & {
  readonly [P in K]: T[P];
};

/**
 * Make specific keys mutable
 *
 * @example
 * interface Foo { readonly a: string; readonly b: number }
 * type MutableAB = MutableKeys<Foo, 'a' | 'b'>;
 * // { a: string; b: number }
 */
export type MutableKeys<T, K extends keyof T> = Omit<T, K> & {
  -readonly [P in K]: T[P];
};

// ============================================================================
// Conditional Types
// ============================================================================

/**
 * Conditional type for extracting the value from a union with null
 *
 * @example
 * type Value = NonNullable<string | null>; // string
 */
export type NonNullable<T> = T extends null | undefined ? never : T;

/**
 * Extract the type from a Promise or regular type
 *
 * @example
 * type A = Awaited<Promise<number>>; // number
 * type B = Awaited<number>; // number
 */
export type Awaited<T> = T extends Promise<infer U> ? Awaited<U> : T;

/**
 * Check if type T is assignable to type U
 *
 * @example
 * type Check = IsAssignable<string, string | number>; // true
 * type NoCheck = IsAssignable<boolean, string>; // false
 */
export type IsAssignable<T, U> = [T] extends [U] ? true : false;

/**
 * Extract the common keys from two types
 *
 * @example
 * type Common = CommonKeys<{ a: 1; b: 2 }, { a: 3; c: 4 }>; // "a"
 */
export type CommonKeys<T, U> = keyof T & keyof U;

/**
 * Extract keys from T that are not in U
 *
 * @example
 * type Diff = DiffKeys<{ a: 1; b: 2 }, { a: 3 }>; // "b"
 */
export type DiffKeys<T, U> = keyof T & Exclude<keyof U, keyof T>;

// ============================================================================
// String Manipulation Types
// ============================================================================

/**
 * Split a string by a delimiter
 *
 * @example
 * type Parts = Split<'a.b.c', '.'>; // ['a', 'b', 'c']
 */
export type Split<S extends string, D extends string> =
  S extends `${infer T}${D}${infer U}` ? [T, ...Split<U, D>] : [S];

/**
 * Join an array of strings with a delimiter
 *
 * @example
 * type Path = Join<['a', 'b', 'c'], '.'>; // 'a.b.c'
 */
export type Join<T extends string[], D extends string> =
  T extends [infer First extends string]
    ? First
    : T extends [infer First extends string, ...infer Rest extends string[]]
      ? `${First}${D}${Join<Rest, D>}`
      : never;

/**
 * Build a dot-notation path type from an object type
 *
 * @example
 * interface Config {
 *   server: { host: string; port: number };
 *   database: { url: string };
 * }
 * type Paths = PathType<Config>;
 * // 'server' | 'database' | 'server.host' | 'server.port' | 'database.url'
 */
export type PathType<T> = T extends object
  ? {
      [K in keyof T]-?: K extends string
        ? K | `${K}.${PathType<T[K]>}`
        : never;
    }[keyof T]
  : never;

// ============================================================================
// Branding for Nominal Typing
// ============================================================================

/**
 * Create a branded type for nominal typing
 *
 * @example
 * type UserId = Brand<string, 'UserId'>;
 * type Email = Brand<string, 'Email'>;
 *
 * function createUser(id: UserId, email: Email) {}
 * createUser('user-123', 'user@example.com'); // Error: strings not branded
 */
export type Brand<T, B> = T & { __brand: B };

/**
 * Create a branded string type
 *
 * @example
 * type UserId = BrandedString<'UserId'>;
 */
export type BrandedString<B> = Brand<string, B>;

/**
 * Create a branded number type
 *
 * @example
 * type Meters = BrandedNumber<'Meters'>;
 */
export type BrandedNumber<B> = Brand<number, B>;

// ============================================================================
// Function Utilities
// ============================================================================

/**
 * Mark certain function parameters as required
 *
 * @example
 * function foo(a: number, b?: string) {}
 * type RequiredB = RequireParams<typeof foo, 'b'>;
 * // (a: number, b: string) => void
 */
export type RequireParams<
  T extends (...args: any[]) => any,
  P extends keyof Parameters<T>
> = (
  ...args: any[]
) => ReturnType<T>;

/**
 * Create a function type with a specific this parameter
 *
 * @example
 * function greet(this: { name: string }) {}
 * type GreetMethod = ThisMethod<typeof greet, { name: string }>;
 */
export type ThisMethod<T, This> = (this: This, ...args: Parameters<T>) => ReturnType<T>;

// ============================================================================
// Validation State Types
// ============================================================================

/**
 * Validation result with conditional success/failure types
 *
 * @example
 * function validate(): ValidationResult<true | false> {
 *   if (valid) return { valid: true };
 *   return { valid: false, errors: [] };
 * }
 */
export type ValidationResult<TValid extends boolean> = TValid extends true
  ? { valid: true; errors: never }
  : { valid: false; errors: string[] };

/**
 * Async state with discriminated union
 *
 * @example
 * type DataState = AsyncState<string, Error>;
 * // { status: 'idle' } | { status: 'loading' } | { status: 'success'; data: string } | { status: 'error'; error: Error }
 */
export type AsyncState<T, E = Error> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: E };

// ============================================================================
// Type Guards and Predicates
// ============================================================================

/**
 * Create a type guard for checking if a value is one of a union
 *
 * @example
 * const isStringOrNumber = createUnionGuard<string | number>(['string', 'number']);
 */
export type UnionGuard<T> = (value: unknown) => value is T;

/**
 * Extract the discriminated field from a union type
 *
 * @example
 * type Event = { type: 'click'; x: number } | { type: 'focus'; y: number };
 * type EventTypes = DiscriminantUnion<Event, 'type'>; // 'click' | 'focus'
 */
export type DiscriminantUnion<T, K extends keyof T> = T[K];

/**
 * Extract members of a union with a specific discriminant value
 *
 * @example
 * type Event = { type: 'click'; x: number } | { type: 'focus'; y: number };
 * type ClickEvent = ExtractByDiscriminant<Event, 'type', 'click'>;
 * // { type: 'click'; x: number }
 */
export type ExtractByDiscriminant<T, K extends keyof T, V> = Extract<
  T,
  Record<K, V>
>;

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Type equality check for type testing
 *
 * @example
 * type Test1 = AssertEqual<string, string>; // true
 * type Test2 = AssertEqual<string, number>; // false (causes error)
 */
export type AssertEqual<T, U> = [T] extends [U]
  ? [U] extends [T]
    ? true
    : false
  : false;

/**
 * Expect a type error (useful for testing)
 *
 * @example
 * type ShouldError = ExpectError<AssertEqual<string, number>>;
 */
export type ExpectError<T extends never> = T;

/**
 * Mark a type as explicitly any for type testing escape hatches
 *
 * @example
 * const unsafe: Any = unsafeOperation();
 */
export type Any = any;

/**
 * Mark a type as explicitly unknown for type-safe escape hatches
 *
 * @example
 * const safer: Unknown = saferOperation();
 */
export type Unknown = unknown;
