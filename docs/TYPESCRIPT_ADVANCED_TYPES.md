# TypeScript Advanced Types Usage Guide

This guide demonstrates how to use the new TypeScript advanced type utilities in the TEI Dialogue Editor codebase.

## Table of Contents

1. [Type Utilities](#type-utilities)
2. [Type Guards](#type-guards)
3. [Assertion Functions](#assertion-functions)
4. [Pattern Examples](#pattern-examples)
5. [Migration Guide](#migration-guide)

---

## Type Utilities

Location: `lib/types/utils.ts`

### Type Extraction with `infer`

Extract inner types from Promises, arrays, and functions:

```typescript
import { PromiseType, ElementType, ReturnType, Parameters } from '@/types/utils';

// Extract from Promise
type AsyncNum = PromiseType<Promise<number>>; // number

// Extract from arrays
type Items = ElementType<string[]>; // string

// Extract function return type
function foo() { return { x: 1 }; }
type FooReturn = ReturnType<typeof foo>; // { x: number }

// Extract function parameters
function bar(a: string, b: number) {}
type BarParams = Parameters<typeof bar>; // [string, number]
```

### Deep Transformation Types

Apply transformations recursively to nested objects:

```typescript
import { DeepReadonly, DeepPartial, DeepRequired } from '@/types/utils';

interface Config {
  server: {
    host: string;
    port: number;
    ssl: {
      enabled: boolean;
      cert: string;
    };
  };
}

// Make all nested properties readonly
type ReadonlyConfig = DeepReadonly<Config>;
// All nested properties are now readonly

// Make all nested properties optional
type PartialConfig = DeepPartial<Config>;
// server?.ssl?.enabled is valid

// Make all nested properties required
type RequiredConfig = DeepRequired<Config>;
// All nested properties are required
```

### Property Filtering

Filter or pick properties by type:

```typescript
import { PickByType, OmitByType, OptionalPropertyNames, RequiredPropertyNames } from '@/types/utils';

interface Mixed {
  id: number;
  name: string;
  age: number;
  active: boolean;
}

// Pick only string properties
type StringsOnly = PickByType<Mixed, string>;
// { name: string }

// Omit number properties
type NoNumbers = OmitByType<Mixed, number>;
// { name: string; active: boolean }

// Get optional property names
type OptionalKeys = OptionalPropertyNames<{ a: string; b?: number }>;
// "b"

// Get required property names
type RequiredKeys = RequiredPropertyNames<{ a: string; b?: number }>;
// "a"
```

### Conditional Types

Create types based on conditions:

```typescript
import { ValidationResult } from '@/types/utils';

// Conditional validation result
function validate(data: unknown): ValidationResult<true | false> {
  if (isValid(data)) {
    return { valid: true, errors: never as never };
  }
  return { valid: false, errors: ['Invalid data'] };
}

// Type narrowing works
const result = validate(data);
if (result.valid) {
  // TypeScript knows errors doesn't exist here
  console.log('Valid!');
} else {
  // TypeScript knows errors is string[] here
  console.log(result.errors);
}
```

### Branded Types

Prevent mixing different IDs that have the same underlying type:

```typescript
import { Brand, BrandedString, BrandedNumber } from '@/types/utils';

// Create branded types
type UserId = BrandedString<'UserId'>;
type Email = BrandedString<'Email'>;
type Meters = BrandedNumber<'Meters'>;

// Functions that accept branded types
function createUser(id: UserId, email: Email) {
  // ...
}

// This prevents accidentally passing raw strings
createUser('user-123', 'user@example.com'); // Error!
const id = 'user-123' as UserId;
const email = 'user@example.com' as Email;
createUser(id, email); // OK
```

---

## Type Guards

Location: `lib/types/guards.ts`

### Basic Type Guards

Narrow types in conditional blocks:

```typescript
import {
  isTEINode,
  isTag,
  isCharacter,
  isTextRange,
  isValidTextRange
} from '@/types/guards';

function processValue(value: unknown) {
  if (isTEINode(value)) {
    // TypeScript knows value is TEINode here
    console.log(value['#name']);
  }

  if (isTag(value)) {
    // TypeScript knows value is Tag here
    console.log(value.type);
  }

  if (isCharacter(value)) {
    // TypeScript knows value is Character here
    console.log(value.name);
  }
}
```

### Specific Tag Type Guards

Check for specific tag types:

```typescript
import { isSaidTag, isQTag, isEntityTag } from '@/types/guards';

function processTag(tag: Tag) {
  if (isSaidTag(tag)) {
    // TypeScript knows type is 'said' here
    console.log('Speaker tag');
  }

  if (isQTag(tag)) {
    // TypeScript knows type is 'q' here
    console.log('Quotation tag');
  }

  if (isEntityTag(tag)) {
    // TypeScript knows type is persName | placeName | orgName
    console.log('Entity tag');
  }
}
```

### Collection Type Guards

Validate arrays and collections:

```typescript
import { isArrayOf, isTagArray, isCharacterArray, isNonEmpty } from '@/types/guards';

function processArray(value: unknown) {
  // Check if array of specific type
  if (isArrayOf(value, isTag)) {
    // TypeScript knows value is Tag[] here
    value.forEach(tag => console.log(tag.type));
  }

  // Check if non-empty
  const tags = [] as Tag[];
  if (isNonEmpty(tags)) {
    // TypeScript knows tags has at least one element
    const first = tags[0]; // Type is Tag, not Tag | undefined
  }
}
```

### String Guards

Validate string formats:

```typescript
import {
  isNonEmptyString,
  isValidXmlId,
  isCharacterID,
  isPassageID,
  isTagID,
  isUrl
} from '@/types/guards';

function validateString(value: unknown) {
  if (isNonEmptyString(value)) {
    console.log(value.trim().toUpperCase());
  }

  if (isValidXmlId(value)) {
    console.log(`Valid ID: ${value}`);
  }

  if (isCharacterID(value)) {
    // Type narrowed to branded string type
    console.log(`Character ID: ${value}`);
  }

  if (isUrl(value)) {
    // Valid URL
    console.log(`URL: ${value}`);
  }
}
```

---

## Assertion Functions

Location: `lib/types/assertions.ts`

### Basic Assertions

Throw errors when validation fails:

```typescript
import {
  assertIsTEINode,
  assertIsTag,
  assertIsCharacter,
  assertIsNonEmptyString,
  assert
} from '@/types/assertions';

function processTEI(node: unknown) {
  // Throws if not a TEINode
  assertIsTEINode(node, 'Expected TEI element');

  // After assertion, TypeScript knows node is TEINode
  console.log(node['#name']);
}

function validateXML(xml: string) {
  // Throws if not a non-empty string
  assertIsNonEmptyString(xml, 'XML cannot be empty');

  // Continue processing - xml is guaranteed to be string
  return xml.trim();
}

// Simple assertion
function divide(a: number, b: number) {
  assert(b !== 0, 'Cannot divide by zero');
  return a / b;
}
```

### Domain-Specific Assertions

Validate domain rules:

```typescript
import {
  assertIsCharacterID,
  assertIsPassageID,
  assertIsTagID,
  assertIsValidTextRange,
  assertIsValidConfidence,
  assertIsValidProgress
} from '@/types/assertions';

function processEvent(event: { tagId: string }) {
  // Throws if invalid format
  assertIsTagID(event.tagId);

  // Type is narrowed - tagId is guaranteed valid
  console.log(event.tagId);
}

function processRange(range: TextRange) {
  // Throws if invalid range
  assertIsValidTextRange(range);

  // Safe to use range.start and range.end
  const length = range.end - range.start;
}

function processDetection(confidence: number) {
  // Throws if out of range
  assertIsValidConfidence(confidence);

  // Confidence is guaranteed 0-1
  const percentage = confidence * 100;
}

function processProgress(progress: number) {
  // Throws if invalid progress
  assertIsValidProgress(progress);

  // Progress is guaranteed 0-100
  if (progress === 100) {
    console.log('Complete!');
  }
}
```

### Collection Assertions

Validate arrays and objects:

```typescript
import {
  assertIsNonEmpty,
  assertIsDefined,
  assertIsObject,
  assertAll,
  assertOneOf
} from '@/types/assertions';

function processArray<T>(arr: T[]) {
  // Throws if empty
  assertIsNonEmpty(arr, 'Array cannot be empty');

  // arr is guaranteed non-empty
  const first = arr[0]; // Type is T, not T | undefined
}

function processValue(value: string | null) {
  // Throws if null/undefined
  assertIsDefined(value, 'Value is required');

  // value is guaranteed non-null
  console.log(value.toUpperCase());
}

function processOptions(options: unknown) {
  // Throws if not object
  assertIsObject(options);

  // options is guaranteed Record<string, unknown>
  console.log(Object.keys(options));
}

function processChoice(value: string) {
  // Throws if not in allowed values
  assertOneOf(value, ['a', 'b', 'c'] as const);

  // value is guaranteed 'a' | 'b' | 'c'
  console.log(value);
}

// Validate all items in array
function processTags(tags: unknown[]) {
  assertAll(tags, isTag, 'All items must be Tags');

  // tags is guaranteed Tag[]
  tags.forEach(tag => console.log(tag.type));
}
```

---

## Pattern Examples

### Pattern 1: Type-Safe Event Handling

```typescript
import { EventByType, isLoadedEvent, isTagEvent } from '@/lib/tei/types';

function handleEvent(event: DocumentEvent) {
  // Discriminated union narrows type
  switch (event.type) {
    case 'loaded':
      // Type: EventByType<'loaded'>
      console.log(`Loaded: ${event.xml.length} chars`);
      break;

    case 'saidTagAdded':
      // Type: EventByType<'saidTagAdded'>
      console.log(`Added tag: ${event.id}`);
      console.log(`Speaker: ${event.speaker}`);
      break;

    case 'characterUpdated':
      // Type: EventByType<'characterUpdated'>
      console.log(`Updated: ${event.id}`);
      console.log(`Changes:`, Object.keys(event.updates));
      break;
  }

  // Using type guards
  if (isLoadedEvent(event)) {
    // Type narrowed to loaded event
    console.log(event.xml);
  }

  if (isTagEvent(event)) {
    // Type narrowed to tag events
    console.log(`Tag operation: ${event.type}`);
  }
}
```

### Pattern 2: Validation Result with Conditional Types

```typescript
import { ValidationResult, validationSuccess, validationFailure } from '@/lib/ai/types';

function validateDocument(xml: string): ValidationResult<boolean> {
  const errors: string[] = [];

  if (!xml.trim()) {
    errors.push('XML is empty');
  }

  if (!xml.includes('<TEI')) {
    errors.push('Missing TEI root element');
  }

  if (errors.length === 0) {
    return validationSuccess();
  }

  return validationFailure(errors);
}

// Usage with type narrowing
const result = validateDocument(xml);

if (result.valid) {
  // TypeScript knows result.errors doesn't exist
  console.log('Valid!');
} else {
  // TypeScript knows result.errors is string[]
  console.log('Errors:', result.errors);
}
```

### Pattern 3: Detection State with Discriminated Unions

```typescript
import { DetectionState, isDetected, isUncertain, isFailed } from '@/lib/ai/types';

function processDetection(state: DetectionState) {
  // Discriminated union
  switch (state.status) {
    case 'detected':
      // Type: { status: 'detected'; result: DetectionResult }
      console.log(`Detected: ${state.result.speaker}`);
      console.log(`Confidence: ${state.result.confidence}`);
      break;

    case 'uncertain':
      // Type: { status: 'uncertain'; candidates: DetectionResult[] }
      console.log(`Uncertain, ${state.candidates.length} candidates`);
      state.candidates.forEach(c => console.log(`  - ${c.speaker}`));
      break;

    case 'failed':
      // Type: { status: 'failed'; error: string }
      console.log(`Detection failed: ${state.error}`);
      break;
  }

  // Using type guards
  if (isDetected(state)) {
    // Narrowed to detected state
    console.log(state.result.reason);
  }

  if (isUncertain(state)) {
    // Narrowed to uncertain state
    console.log(`Confidence: ${state.confidence}`);
  }

  if (isFailed(state)) {
    // Narrowed to failed state
    console.error(state.error);
  }
}
```

### Pattern 4: Branded IDs for Type Safety

```typescript
import {
  createPassageID,
  createTagID,
  createCharacterID
} from '@/lib/tei/types';

// Create branded IDs (throws if invalid format)
const passageId = createPassageID('passage-abc123');
const tagId = createTagID('tag-def456');
const charId = createCharacterID('char-ghi789');

// Type system prevents mixing IDs up
function addTagToPassage(pid: PassageID, tid: TagID) {
  console.log(`Added ${tid} to ${pid}`);
}

addTagToPassage(passageId, tagId); // OK
addTagToPassage(passageId, passageId); // Error! Type mismatch
```

### Pattern 5: Deep Readonly with Type Utilities

```typescript
import { DeepReadonly, ReadonlyKeys } from '@/types/utils';

interface MutableConfig {
  server: {
    host: string;
    port: number;
  };
  database: {
    url: string;
  };
}

// Make entire config readonly
const config: DeepReadonly<MutableConfig> = {
  server: { host: 'localhost', port: 3000 },
  database: { url: 'postgres://localhost' }
};

// All nested properties are readonly
config.server.host = 'example.com'; // Error!
config.database.url = 'mysql://localhost'; // Error!

// Make specific keys readonly
const user: ReadonlyKeys<{ id: string; name: string; email: string }, 'id'> = {
  id: 'user-123',
  name: 'John',
  email: 'john@example.com'
};

user.id = 'user-456'; // Error! Cannot modify readonly id
user.name = 'Jane'; // OK! name is mutable
```

### Pattern 6: Array Type Guards with Filtering

```typescript
import { isTagArray, isTag, isSaidTag } from '@/types/guards';

function filterSaidTags(items: unknown[]): Tag[] {
  // Type guard validates array
  if (!isTagArray(items)) {
    return [];
  }

  // TypeScript knows items is Tag[]
  return items.filter(isSaidTag);
}

function processMixedArray(arr: unknown[]) {
  // Use reduce with type guard
  const tags = arr.filter(isTag);

  // TypeScript knows tags is Tag[]
  tags.forEach(tag => console.log(tag.type));
}
```

---

## Migration Guide

### Before: Manual Type Assertions

```typescript
// Old way - manual type casting
function processEventOld(event: any) {
  if (event.type === 'characterUpdated') {
    const updates = event.updates as Partial<Omit<Character, 'id' | 'xmlId'>>;
    console.log(Object.keys(updates));
  }
}
```

### After: Type Guards and Inference

```typescript
import { EventByType } from '@/lib/tei/types';

function processEventNew(event: DocumentEvent) {
  if (event.type === 'characterUpdated') {
    // Type inferred automatically
    const updates = event.updates;
    console.log(Object.keys(updates));
  }
}
```

### Before: Manual Validation

```typescript
// Old way - manual checks
function validateProgressOld(progress: any) {
  if (typeof progress !== 'number' || progress < 0 || progress > 100) {
    throw new Error('Invalid progress');
  }
}
```

### After: Assertion Functions

```typescript
import { assertIsValidProgress } from '@/types/assertions';

function validateProgressNew(progress: number) {
  assertIsValidProgress(progress);
  // Progress is guaranteed valid after this line
  console.log(`Progress: ${progress}%`);
}
```

### Before: Loose ID Types

```typescript
// Old way - strings can be mixed up
function addTagOld(tagId: string, passageId: string) {
  console.log(`Adding ${tagId} to ${passageId}`);
}

// Easy to mix up arguments
addTagOld(passageId, tagId); // Wrong order but no error!
```

### After: Branded ID Types

```typescript
import { TagID, PassageID } from '@/lib/tei/types';

function addTagNew(tagId: TagID, passageId: PassageID) {
  console.log(`Adding ${tagId} to ${passageId}`);
}

// Type system prevents mistakes
addTagNew(passageId, tagId); // Error! Type mismatch
```

---

## Best Practices

### 1. Prefer Type Guards Over Type Assertions

```typescript
// ❌ Avoid: type assertions
function process1(value: unknown) {
  const tag = value as Tag;
  console.log(tag.type);
}

// ✅ Prefer: type guards
function process2(value: unknown) {
  if (isTag(value)) {
    console.log(value.type);
  }
}
```

### 2. Use Assertion Functions for Invariants

```typescript
// ❌ Avoid: returning error objects
function validate1(data: unknown): { valid: boolean } {
  if (!isValid(data)) return { valid: false };
  return { valid: true };
}

// ✅ Prefer: assertion functions
function validate2(data: unknown): void {
  assertIsValid(data);
  // Data is guaranteed valid after this point
}
```

### 3. Leverage Conditional Types for State

```typescript
// ❌ Avoid: boolean flags
interface Result1 {
  valid: boolean;
  data?: string;
  error?: string;
}

// ✅ Prefer: discriminated unions
type Result2 =
  | { valid: true; data: string }
  | { valid: false; error: string };
```

### 4. Use Branded Types for Nominal Typing

```typescript
// ❌ Avoid: string types for IDs
function getUser1(id: string) {}

// ✅ Prefer: branded types
type UserId = Brand<string, 'UserId'>;
function getUser2(id: UserId) {}
```

---

## Summary

The new type utilities provide:

1. **Type Extraction**: Extract inner types using `infer`
2. **Deep Transformations**: Recursively transform nested types
3. **Property Filtering**: Pick/omit by type
4. **Conditional Types**: Types based on conditions
5. **Branded Types**: Nominal typing for IDs
6. **Type Guards**: Runtime validation with type narrowing
7. **Assertion Functions**: Throw on validation failure
8. **Discriminated Unions**: Type-safe state machines

These tools reduce duplication, improve type safety, and enable better IDE autocomplete.
