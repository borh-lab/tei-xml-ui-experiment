# Configurable TEI Schema Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the broken TEI RelaxNG schema integration by implementing configurable schema selection with protocol-based architecture.

**Architecture:**
- **Protocol-first design**: SchemaResolver interface enables composition and testing
- **Explicit constraints**: Allow-list prevents arbitrary file access
- **Value-oriented state**: Immutable SchemaSelection values track state changes
- **Layered approach**: Protocol → Implementation → API → UI

**Tech Stack:**
- `salve-annos` (v1.2.4) - RelaxNG validation
- Next.js API routes
- React hooks (useState, useEffect, useMemo)
- TypeScript with readonly types

---

## Task 1: SchemaResolver Protocol

**Files:**
- Create: `lib/schema/SchemaResolver.ts`

**Step 1: Create the protocol interface**

Create `lib/schema/SchemaResolver.ts`:

```typescript
/**
 * Schema metadata returned to clients
 */
export interface SchemaInfo {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly path: string;
  readonly tags: ReadonlyArray<string>;
}

/**
 * Protocol for resolving schema IDs to file paths
 * Enables different implementations (filesystem, database, remote)
 */
export interface SchemaResolver {
  /**
   * Resolve a schema ID to its file path
   * @param schemaId - Schema identifier (e.g., 'tei-minimal')
   * @returns Absolute file path, or null if not found
   */
  resolve(schemaId: string): string | null;

  /**
   * List all available schemas
   * @returns Readonly array of schema metadata
   */
  list(): ReadonlyArray<SchemaInfo>;

  /**
   * Check if a schema ID exists
   * @param schemaId - Schema identifier
   * @returns true if schema is available
   */
  has(schemaId: string): boolean;
}
```

**Step 2: Run TypeScript check**

Run: `npx tsc --noEmit --pretty lib/schema/SchemaResolver.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add lib/schema/SchemaResolver.ts
git commit -m "feat: add SchemaResolver protocol interface"
```

---

## Task 2: FileSchemaResolver Implementation

**Files:**
- Create: `lib/schema/FileSchemaResolver.ts`
- Test: `tests/unit/file-schema-resolver.test.ts`

**Step 1: Write failing tests**

Create `tests/unit/file-schema-resolver.test.ts`:

```typescript
import { FileSchemaResolver } from '@/lib/schema/FileSchemaResolver';
import { SchemaInfo } from '@/lib/schema/SchemaResolver';

describe('FileSchemaResolver', () => {
  const mockSchemas: Record<string, SchemaInfo> = {
    'test-schema': {
      id: 'test-schema',
      name: 'Test Schema',
      description: 'A test schema',
      path: '/schemas/test.rng',
      tags: ['test']
    }
  };

  it('should resolve known schema ID to path', () => {
    const resolver = new FileSchemaResolver(mockSchemas, new Set(['test-schema']));
    expect(resolver.resolve('test-schema')).toBe('/schemas/test.rng');
  });

  it('should return null for unknown schema ID', () => {
    const resolver = new FileSchemaResolver(mockSchemas, new Set(['test-schema']));
    expect(resolver.resolve('unknown')).toBeNull();
  });

  it('should return null for schema ID not in allow-list', () => {
    const resolver = new FileSchemaResolver(mockSchemas, new Set(['other-schema']));
    expect(resolver.resolve('test-schema')).toBeNull();
  });

  it('should list all schemas', () => {
    const resolver = new FileSchemaResolver(mockSchemas, new Set(['test-schema']));
    const schemas = resolver.list();
    expect(schemas).toHaveLength(1);
    expect(schemas[0].id).toBe('test-schema');
  });

  it('should check if schema exists', () => {
    const resolver = new FileSchemaResolver(mockSchemas, new Set(['test-schema']));
    expect(resolver.has('test-schema')).toBe(true);
    expect(resolver.has('unknown')).toBe(false);
  });

  it('should get schema info', () => {
    const resolver = new FileSchemaResolver(mockSchemas, new Set(['test-schema']));
    const info = resolver.getSchemaInfo('test-schema');
    expect(info).toEqual(mockSchemas['test-schema']);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- file-schema-resolver.test.ts`
Expected: FAIL - "Cannot find module '@/lib/schema/FileSchemaResolver'"

**Step 3: Write minimal implementation**

Create `lib/schema/FileSchemaResolver.ts`:

```typescript
import { SchemaResolver, SchemaInfo } from './SchemaResolver';

/**
 * Filesystem-based schema resolver with security constraints
 */
export class FileSchemaResolver implements SchemaResolver {
  private readonly schemas: Readonly<Record<string, SchemaInfo>>;
  private readonly allowedIds: ReadonlySet<string>;

  constructor(
    schemas: Record<string, SchemaInfo> = {},
    allowedIds: Set<string> = new Set()
  ) {
    this.schemas = Object.freeze({...schemas});
    this.allowedIds = new ReadonlySet(allowedIds);
  }

  resolve(schemaId: string): string | null {
    if (!this.allowedIds.has(schemaId)) {
      return null;
    }
    const schema = this.schemas[schemaId];
    return schema?.path ?? null;
  }

  list(): ReadonlyArray<SchemaInfo> {
    return Object.values(this.schemas);
  }

  has(schemaId: string): boolean {
    return this.allowedIds.has(schemaId) && schemaId in this.schemas;
  }

  getSchemaInfo(schemaId: string): SchemaInfo | null {
    if (!this.has(schemaId)) {
      return null;
    }
    return this.schemas[schemaId] ?? null;
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- file-schema-resolver.test.ts`
Expected: PASS (all tests)

**Step 5: Commit**

```bash
git add lib/schema/FileSchemaResolver.ts tests/unit/file-schema-resolver.test.ts
git commit -m "feat: add FileSchemaResolver with allow-list constraints"
```

---

## Task 3: Schema Registry with Default Schemas

**Files:**
- Modify: `lib/schema/FileSchemaResolver.ts`

**Step 1: Add default schema registry**

Add to `lib/schema/FileSchemaResolver.ts` after imports:

```typescript
/**
 * Explicit constraint: Only these schema IDs are allowed
 */
const ALLOWED_SCHEMA_IDS = new ReadonlySet([
  'tei-minimal',
  'tei-all',
  'tei-novel'
]);

/**
 * Schema registry: Metadata for known schemas
 */
const SCHEMA_REGISTRY: Readonly<Record<string, SchemaInfo>> = {
  'tei-minimal': {
    id: 'tei-minimal',
    name: 'TEI Minimal (Dialogue)',
    description: 'Core TEI elements for dialogue annotation: sp, speaker, stage',
    path: '/schemas/tei-minimal.rng',
    tags: ['dialogue', 'lightweight', 'fast']
  },
  'tei-all': {
    id: 'tei-all',
    name: 'TEI P5 Complete',
    description: 'Full TEI P5 schema with all standard elements',
    path: '/schemas/tei-all.rng',
    tags: ['complete', 'comprehensive', 'slow']
  },
  'tei-novel': {
    id: 'tei-novel',
    name: 'TEI for Novels',
    description: 'TEI schema optimized for prose fiction',
    path: '/schemas/tei-novel.rng',
    tags: ['novel', 'prose', 'fiction']
  }
} as const;

/**
 * Default resolver instance with standard schemas
 */
export function createDefaultResolver(): FileSchemaResolver {
  return new FileSchemaResolver(SCHEMA_REGISTRY, ALLOWED_SCHEMA_IDS);
}
```

**Step 2: Update constructor defaults**

Modify the constructor in `FileSchemaResolver` class:

```typescript
constructor(
  schemas: Record<string, SchemaInfo> = SCHEMA_REGISTRY,
  allowedIds: Set<string> = ALLOWED_SCHEMA_IDS
) {
  this.schemas = Object.freeze({...schemas});
  this.allowedIds = new ReadonlySet(allowedIds);
}
```

**Step 3: Add test for default resolver**

Add to `tests/unit/file-schema-resolver.test.ts`:

```typescript
import { createDefaultResolver } from '@/lib/schema/FileSchemaResolver';

describe('createDefaultResolver', () => {
  it('should create resolver with standard schemas', () => {
    const resolver = createDefaultResolver();
    expect(resolver.has('tei-minimal')).toBe(true);
    expect(resolver.has('tei-all')).toBe(true);
    expect(resolver.has('tei-novel')).toBe(true);
  });

  it('should not allow arbitrary schema IDs', () => {
    const resolver = createDefaultResolver();
    expect(resolver.has('malicious')).toBe(false);
    expect(resolver.resolve('../../../etc/passwd')).toBeNull();
  });
});
```

**Step 4: Run tests**

Run: `npm test -- file-schema-resolver.test.ts`
Expected: PASS (all tests including new ones)

**Step 5: Commit**

```bash
git add lib/schema/FileSchemaResolver.ts tests/unit/file-schema-resolver.test.ts
git commit -m "feat: add default schema registry with security constraints"
```

---

## Task 4: Schema Selection State Management

**Files:**
- Create: `lib/schema/SchemaSelection.ts`
- Test: `tests/unit/schema-selection.test.ts`

**Step 1: Write failing tests**

Create `tests/unit/schema-selection.test.ts`:

```typescript
import {
  createSchemaSelection,
  transitionSchemaSelection,
  SchemaSelectionManager
} from '@/lib/schema/SchemaSelection';
import { FileSchemaResolver } from '@/lib/schema/FileSchemaResolver';
import { SchemaInfo } from '@/lib/schema/SchemaResolver';

// Mock localStorage
const mockStorage = {
  getItem: jest.fn(),
  setItem: jest.fn()
};

(global as any).localStorage = mockStorage;

describe('createSchemaSelection', () => {
  it('should create selection with timestamp', () => {
    const selection = createSchemaSelection('tei-minimal');
    expect(selection.schemaId).toBe('tei-minimal');
    expect(selection.timestamp).toBeGreaterThan(0);
    expect(Object.isFrozen(selection)).toBe(true);
  });
});

describe('transitionSchemaSelection', () => {
  it('should create new history state', () => {
    const history = {
      current: createSchemaSelection('tei-minimal'),
      previous: []
    };

    const newHistory = transitionSchemaSelection(history, 'tei-all');

    expect(newHistory.current.schemaId).toBe('tei-all');
    expect(newHistory.previous[0].schemaId).toBe('tei-minimal');
  });

  it('should keep last 10 previous selections', () => {
    let history = {
      current: createSchemaSelection('tei-minimal'),
      previous: []
    };

    // Add 15 selections
    for (let i = 0; i < 15; i++) {
      history = transitionSchemaSelection(history, `schema-${i}`);
    }

    expect(history.previous).toHaveLength(10);
  });
});

describe('SchemaSelectionManager', () => {
  let resolver: FileSchemaResolver;
  let manager: SchemaSelectionManager;

  beforeEach(() => {
    const mockSchemas: Record<string, SchemaInfo> = {
      'tei-minimal': {
        id: 'tei-minimal',
        name: 'TEI Minimal',
        description: 'Test',
        path: '/schemas/tei-minimal.rng',
        tags: []
      }
    };

    resolver = new FileSchemaResolver(mockSchemas, new Set(['tei-minimal']));
    manager = new SchemaSelectionManager(resolver);
    mockStorage.getItem.mockClear();
    mockStorage.setItem.mockClear();
  });

  it('should return default when no stored value', () => {
    mockStorage.getItem.mockReturnValue(null);

    const selection = manager.load();

    expect(selection.schemaId).toBe('tei-minimal');
  });

  it('should load stored selection if valid', () => {
    const stored = JSON.stringify({
      schemaId: 'tei-minimal',
      timestamp: Date.now()
    });
    mockStorage.getItem.mockReturnValue(stored);

    const selection = manager.load();

    expect(selection.schemaId).toBe('tei-minimal');
  });

  it('should return default if stored schema no longer exists', () => {
    const stored = JSON.stringify({
      schemaId: 'deleted-schema',
      timestamp: Date.now()
    });
    mockStorage.getItem.mockReturnValue(stored);

    const selection = manager.load();

    expect(selection.schemaId).toBe('tei-minimal');
  });

  it('should save selection to storage', () => {
    const selection = createSchemaSelection('tei-minimal');
    manager.save(selection);

    expect(mockStorage.setItem).toHaveBeenCalledWith(
      'tei:selected-schema',
      expect.stringContaining('tei-minimal')
    );
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- schema-selection.test.ts`
Expected: FAIL - "Cannot find module '@/lib/schema/SchemaSelection'"

**Step 3: Write implementation**

Create `lib/schema/SchemaSelection.ts`:

```typescript
import { SchemaResolver } from './SchemaResolver';

/**
 * Schema selection state
 * Modeled as a value, not a place
 */
export interface SchemaSelection {
  readonly schemaId: string;
  readonly timestamp: number;
}

/**
 * Schema selection with history
 */
export interface SchemaSelectionHistory {
  readonly current: SchemaSelection;
  readonly previous: ReadonlyArray<SchemaSelection>;
}

/**
 * Create a new schema selection
 */
export function createSchemaSelection(schemaId: string): SchemaSelection {
  return Object.freeze({
    schemaId,
    timestamp: Date.now()
  });
}

/**
 * Transition to a new schema selection
 * Returns new state, doesn't mutate
 */
export function transitionSchemaSelection(
  history: SchemaSelectionHistory,
  newSchemaId: string
): SchemaSelectionHistory {
  const newSelection = createSchemaSelection(newSchemaId);

  return Object.freeze({
    current: newSelection,
    previous: [history.current, ...history.previous.slice(0, 9)]
  });
}

/**
 * Schema selection manager
 */
export class SchemaSelectionManager {
  constructor(
    private readonly resolver: SchemaResolver,
    private readonly storageKey: string = 'tei:selected-schema'
  ) {}

  load(): SchemaSelection {
    const stored = localStorage.getItem(this.storageKey);

    if (!stored) {
      return createSchemaSelection('tei-minimal');
    }

    try {
      const parsed = JSON.parse(stored) as SchemaSelection;

      if (this.resolver.has(parsed.schemaId)) {
        return Object.freeze(parsed);
      }

      return createSchemaSelection('tei-minimal');
    } catch {
      return createSchemaSelection('tei-minimal');
    }
  }

  save(selection: SchemaSelection): SchemaSelection {
    localStorage.setItem(this.storageKey, JSON.stringify(selection));
    return selection;
  }

  transition(
    history: SchemaSelectionHistory,
    newSchemaId: string
  ): SchemaSelectionHistory {
    const newHistory = transitionSchemaSelection(history, newSchemaId);
    this.save(newHistory.current);
    return newHistory;
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- schema-selection.test.ts`
Expected: PASS (all tests)

**Step 5: Commit**

```bash
git add lib/schema/SchemaSelection.ts tests/unit/schema-selection.test.ts
git commit -m "feat: add value-oriented schema selection state management"
```

---

## Task 5: Schema Registry API Endpoint

**Files:**
- Create: `app/api/schemas/route.ts`
- Test: `tests/integration/schemas-api.test.ts`

**Step 1: Write failing test**

Create `tests/integration/schemas-api.test.ts`:

```typescript
import { GET } from '@/app/api/schemas/route';

describe('/api/schemas', () => {
  it('should return list of available schemas', async () => {
    const response = await GET();
    const data = await response.json();

    expect(data.schemas).toBeDefined();
    expect(data.schemas.length).toBeGreaterThan(0);
    expect(data.schemas[0]).toHaveProperty('id');
    expect(data.schemas[0]).toHaveProperty('name');
    expect(data.schemas[0]).toHaveProperty('description');
    expect(data.schemas[0]).toHaveProperty('tags');
  });

  it('should not expose schema paths in API response', async () => {
    const response = await GET();
    const data = await response.json();

    expect(data.schemas[0]).not.toHaveProperty('path');
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- schemas-api.test.ts`
Expected: FAIL - "Cannot find module '@/app/api/schemas/route'"

**Step 3: Write implementation**

Create `app/api/schemas/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { createDefaultResolver } from '@/lib/schema/FileSchemaResolver';

const resolver = createDefaultResolver();

export async function GET() {
  try {
    const schemas = resolver.list();

    return NextResponse.json({
      schemas: schemas.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        tags: s.tags
      }))
    });
  } catch (error) {
    console.error('Schema list API error:', error);
    return NextResponse.json(
      { error: 'Failed to list schemas' },
      { status: 500 }
    );
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- schemas-api.test.ts`
Expected: PASS (all tests)

**Step 5: Commit**

```bash
git add app/api/schemas/route.ts tests/integration/schemas-api.test.ts
git commit -m "feat: add schemas registry API endpoint"
```

---

## Task 6: Update Validation API

**Files:**
- Modify: `app/api/validate/route.ts`
- Test: `tests/integration/validate-api-schema.test.ts`

**Step 1: Write failing tests**

Create `tests/integration/validate-api-schema.test.ts`:

```typescript
import { POST } from '@/app/api/validate/route';

// Mock ValidationService
jest.mock('@/lib/validation/ValidationService');

describe('/api/validate with schema selection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should use default schema when none provided', async () => {
    const request = {
      json: async () => ({
        xml: '<TEI></TEI>'
      })
    } as any;

    await POST(request);

    // Verify ValidationService was called with tei-minimal
    const { ValidationService } = require('@/lib/validation/ValidationService');
    expect(ValidationService).toHaveBeenCalledWith(
      expect.objectContaining({
        defaultSchemaPath: '/schemas/tei-minimal.rng'
      })
    );
  });

  it('should return 400 for unknown schema ID', async () => {
    const request = {
      json: async () => ({
        xml: '<TEI></TEI>',
        schemaId: 'unknown-schema'
      })
    } as any;

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Unknown schema');
    expect(data.availableSchemas).toBeDefined();
  });

  it('should use provided schema ID', async () => {
    const request = {
      json: async () => ({
        xml: '<TEI></TEI>',
        schemaId: 'tei-all'
      })
    } as any;

    await POST(request);

    const { ValidationService } = require('@/lib/validation/ValidationService');
    expect(ValidationService).toHaveBeenCalledWith(
      expect.objectContaining({
        defaultSchemaPath: '/schemas/tei-all.rng'
      })
    );
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- validate-api-schema.test.ts`
Expected: FAIL - tests show current implementation doesn't use schema resolver

**Step 3: Modify validation API**

Modify `app/api/validate/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { ValidationService } from '@/lib/validation/ValidationService';
import { createDefaultResolver } from '@/lib/schema/FileSchemaResolver';

const resolver = createDefaultResolver();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { xml, schemaId } = body;

    if (!xml) {
      return NextResponse.json(
        { error: 'Missing XML content' },
        { status: 400 }
      );
    }

    // Default to tei-minimal for fast validation
    const effectiveSchemaId = schemaId || 'tei-minimal';

    // Constraint: Validate schema ID
    if (!resolver.has(effectiveSchemaId)) {
      const availableSchemas = resolver.list();
      return NextResponse.json(
        {
          error: `Unknown schema: ${effectiveSchemaId}`,
          availableSchemas: availableSchemas.map(s => s.id)
        },
        { status: 400 }
      );
    }

    // Resolve schema path
    const schemaPath = resolver.resolve(effectiveSchemaId);
    if (!schemaPath) {
      return NextResponse.json(
        { error: `Schema path not found for: ${effectiveSchemaId}` },
        { status: 404 }
      );
    }

    // Validate
    const validationService = new ValidationService({
      defaultSchemaPath: schemaPath,
      enableSuggestions: true,
      maxErrors: 100,
    });

    const result = await validationService.validateDocument(xml, schemaPath);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Validation API error:', error);
    return NextResponse.json(
      {
        valid: false,
        errors: [
          {
            message: `Validation error: ${error instanceof Error ? error.message : String(error)}`,
            severity: 'error',
          },
        ],
        warnings: [],
      },
      { status: 500 }
    );
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- validate-api-schema.test.ts`
Expected: PASS (all tests)

**Step 5: Commit**

```bash
git add app/api/validate/route.ts tests/integration/validate-api-schema.test.ts
git commit -m "feat: update validation API with schema resolver"
```

---

## Task 7: Create TEI Minimal Schema

**Files:**
- Create: `public/schemas/tei-minimal.rng`

**Step 1: Create minimal TEI schema**

Create `public/schemas/tei-minimal.rng`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<grammar xmlns="http://relaxng.org/ns/structure/1.0"
         xmlns:a="http://relaxng.org/ns/compatibility/annotations/1.0"
         ns="http://www.tei-c.org/ns/1.0"
         datatypeLibrary="http://www.w3.org/2001/XMLSchema-datatypes">
  <start>
    <element name="TEI">
      <element name="teiHeader">
        <element name="fileDesc">
          <element name="titleStmt">
            <element name="title">
              <text/>
            </element>
            <optional>
              <element name="author">
                <text/>
              </element>
            </optional>
          </element>
          <element name="publicationStmt">
            <element name="publisher">
              <text/>
            </element>
            <element name="date">
              <data type="string"/>
            </element>
          </element>
          <element name="sourceDesc">
            <element name="p">
              <text/>
            </element>
          </element>
        </element>
      </element>
      <element name="text">
        <element name="body">
          <zeroOrMore>
            <choice>
              <element name="p">
                <zeroOrMore>
                  <choice>
                    <text/>
                    <element name="emph">
                      <text/>
                    </element>
                    <element name="q">
                      <text/>
                    </element>
                  </choice>
                </zeroOrMore>
              </element>
              <element name="sp">
                <element name="speaker">
                  <text/>
                </element>
                <optional>
                  <element name="stage">
                    <text/>
                  </element>
                </optional>
                <zeroOrMore>
                  <choice>
                    <element name="p">
                      <zeroOrMore>
                        <choice>
                          <text/>
                          <element name="emph">
                            <text/>
                          </element>
                        </choice>
                      </zeroOrMore>
                    </element>
                    <element name="l">
                      <text/>
                    </element>
                  </choice>
                </zeroOrMore>
              </element>
            </choice>
          </zeroOrMore>
        </element>
      </element>
    </element>
  </start>
</grammar>
```

**Step 2: Verify file exists**

Run: `ls -la public/schemas/tei-minimal.rng`
Expected: File exists with content

**Step 3: Commit**

```bash
git add public/schemas/tei-minimal.rng
git commit -m "feat: add TEI minimal schema for dialogue"
```

---

## Task 8: Copy TEI All Schema

**Files:**
- Create: `public/schemas/tei-all.rng`

**Step 1: Copy schema from TEI source**

Run: `cp TEI/Documents/GettingStarted/samples/tei_all.rng public/schemas/tei-all.rng`

**Step 2: Verify file copied**

Run: `ls -la public/schemas/tei-all.rng`
Expected: File exists (~612KB)

**Step 3: Commit**

```bash
git add public/schemas/tei-all.rng
git commit -m "feat: add full TEI P5 schema"
```

---

## Task 9: Create TEI Novel Schema

**Files:**
- Create: `public/schemas/tei-novel.rng`

**Step 1: Create novel-focused TEI schema**

Create `public/schemas/tei-novel.rng`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<grammar xmlns="http://relaxng.org/ns/structure/1.0"
         xmlns:a="http://relaxng.org/ns/compatibility/annotations/1.0"
         ns="http://www.tei-c.org/ns/1.0"
         datatypeLibrary="http://www.w3.org/2001/XMLSchema-datatypes">
  <start>
    <element name="TEI">
      <element name="teiHeader">
        <element name="fileDesc">
          <element name="titleStmt">
            <element name="title">
              <text/>
            </element>
            <optional>
              <element name="author">
                <text/>
              </element>
            </optional>
          </element>
          <element name="publicationStmt">
            <element name="publisher">
              <text/>
            </element>
            <element name="date">
              <data type="string"/>
            </element>
          </element>
          <element name="sourceDesc">
            <element name="p">
              <text/>
            </element>
          </element>
        </element>
      </element>
      <element name="text">
        <element name="body">
          <zeroOrMore>
            <choice>
              <element name="div">
                <optional>
                  <attribute name="type">
                    <data type="string"/>
                  </attribute>
                </optional>
                <zeroOrMore>
                  <choice>
                    <element name="head">
                      <text/>
                    </element>
                    <element name="p">
                      <zeroOrMore>
                        <choice>
                          <text/>
                          <element name="emph">
                            <text/>
                          </element>
                          <element name="q">
                            <text/>
                          </element>
                          <element name="name">
                            <text/>
                          </element>
                        </choice>
                      </zeroOrMore>
                    </element>
                    <element name="quote">
                      <element name="p">
                        <text/>
                      </element>
                    </element>
                  </choice>
                </zeroOrMore>
              </element>
              <element name="p">
                <zeroOrMore>
                  <choice>
                    <text/>
                    <element name="emph">
                      <text/>
                    </element>
                    <element name="q">
                      <text/>
                    </element>
                    <element name="name">
                      <text/>
                    </element>
                  </choice>
                </zeroOrMore>
              </element>
            </choice>
          </zeroOrMore>
        </element>
      </element>
    </element>
  </start>
</grammar>
```

**Step 2: Verify file exists**

Run: `ls -la public/schemas/tei-novel.rng`
Expected: File exists with content

**Step 3: Commit**

```bash
git add public/schemas/tei-novel.rng
git commit -m "feat: add TEI novel schema"
```

---

## Task 10: Update ValidationPanel Component

**Files:**
- Modify: `components/validation/ValidationPanel.tsx`
- Test: `tests/unit/validation-panel-schema.test.tsx`

**Step 1: Write failing tests**

Create `tests/unit/validation-panel-schema.test.tsx`:

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { ValidationPanel } from '@/components/validation/ValidationPanel';

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({
      schemas: [
        {
          id: 'tei-minimal',
          name: 'TEI Minimal',
          description: 'Core TEI for dialogue',
          tags: ['dialogue', 'fast']
        },
        {
          id: 'tei-all',
          name: 'TEI Complete',
          description: 'Full TEI P5',
          tags: ['complete']
        }
      ]
    })
  })
) as any;

describe('ValidationPanel schema selection', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  it('should load available schemas on mount', async () => {
    render(<ValidationPanel />);

    await waitFor(() => {
      expect(screen.getByLabelText(/validation schema/i)).toBeInTheDocument();
    });

    expect(fetch).toHaveBeenCalledWith('/api/schemas');
  });

  it('should display schema selector', async () => {
    render(<ValidationPanel />);

    await waitFor(() => {
      expect(screen.getByLabelText(/validation schema/i)).toBeInTheDocument();
    });

    const selector = screen.getByLabelText(/validation schema/i);
    expect(selector).toHaveValue('tei-minimal'); // default
  });

  it('should show schema description', async () => {
    render(<ValidationPanel />);

    await waitFor(() => {
      expect(screen.getByText(/Core TEI for dialogue/i)).toBeInTheDocument();
    });
  });
});
```

**Step 2: Read current ValidationPanel**

Run: `cat components/validation/ValidationPanel.tsx`

(Review the current implementation to understand structure)

**Step 3: Update ValidationPanel with schema selection**

Modify `components/validation/ValidationPanel.tsx`:

```typescript
// Add imports at top
import { useState, useEffect, useMemo, useCallback } from 'react';
import { SchemaSelectionManager, SchemaSelectionHistory, createSchemaSelection } from '@/lib/schema/SchemaSelection';
import { createDefaultResolver } from '@/lib/schema/FileSchemaResolver';
import { SchemaInfo } from '@/lib/schema/SchemaResolver';

// Add inside component
const resolver = createDefaultResolver();
const selectionManager = new SchemaSelectionManager(resolver);

const [selectionHistory, setSelectionHistory] = useState<SchemaSelectionHistory>(() => ({
  current: selectionManager.load(),
  previous: []
}));
const [availableSchemas, setAvailableSchemas] = useState<SchemaInfo[]>([]);

// Load schemas on mount
useEffect(() => {
  fetch('/api/schemas')
    .then(r => r.json())
    .then(data => setAvailableSchemas(data.schemas))
    .catch(err => console.error('Failed to load schemas:', err));
}, []);

// Handle schema change
const handleSchemaChange = useCallback((newSchemaId: string) => {
  setSelectionHistory(prev => selectionManager.transition(prev, newSchemaId));
}, []);

// Get current schema info
const currentSchema = useMemo(() => {
  return availableSchemas.find(s => s.id === selectionHistory.current.schemaId);
}, [availableSchemas, selectionHistory.current.schemaId]);

// Add schema selector to JSX
{availableSchemas.length > 0 && (
  <div className="schema-selector">
    <label htmlFor="schema-select">Validation Schema</label>
    <select
      id="schema-select"
      value={selectionHistory.current.schemaId}
      onChange={(e) => handleSchemaChange(e.target.value)}
      className="schema-dropdown"
    >
      {availableSchemas.map(schema => (
        <option key={schema.id} value={schema.id}>
          {schema.name}
        </option>
      ))}
    </select>

    {currentSchema && (
      <div className="schema-info">
        <p className="schema-description">{currentSchema.description}</p>
        <div className="schema-tags">
          {currentSchema.tags.map(tag => (
            <span key={tag} className="tag">{tag}</span>
          ))}
        </div>
      </div>
    )}
  </div>
)}

// Update validation call to use schema path
const schemaPath = resolver.resolve(selectionHistory.current.schemaId) || '';
```

**Step 4: Run tests**

Run: `npm test -- validation-panel-schema.test.tsx`
Expected: PASS (tests may need adjustment based on actual component)

**Step 5: Commit**

```bash
git add components/validation/ValidationPanel.tsx tests/unit/validation-panel-schema.test.tsx
git commit -m "feat: add schema selection UI to ValidationPanel"
```

---

## Task 11: Add Styles for Schema Selector

**Files:**
- Modify: `components/validation/ValidationPanel.module.css` (or appropriate CSS file)

**Step 1: Add schema selector styles**

Add to the ValidationPanel styles:

```css
.schema-selector {
  margin-bottom: 1rem;
  padding: 1rem;
  background: var(--background-secondary);
  border-radius: 4px;
}

.schema-selector label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
}

.schema-dropdown {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--background-primary);
  color: var(--text-primary);
  font-size: 0.875rem;
}

.schema-info {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-color);
}

.schema-description {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
}

.schema-tags {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.tag {
  padding: 0.25rem 0.5rem;
  background: var(--accent-primary);
  color: white;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}
```

**Step 2: Commit**

```bash
git add components/validation/ValidationPanel.module.css
git commit -m "style: add schema selector styles"
```

---

## Task 12: E2E Tests for Schema Selection

**Files:**
- Modify: `tests/e2e/document-validation.spec.ts`

**Step 1: Add E2E tests**

Add to `tests/e2e/document-validation.spec.ts`:

```typescript
test.describe('Schema Selection', () => {
  test('should load and display schema selector', async ({ page }) => {
    await page.goto('/editor');
    await uploadFile(page, 'tests/fixtures/valid-test.tei.xml');

    // Open validation panel
    await page.click('[data-testid="validation-panel"]');

    // Verify schema selector exists
    await expect(page.locator('label', { hasText: 'Validation Schema' })).toBeVisible();
    await expect(page.locator('#schema-select')).toBeVisible();
  });

  test('should switch schemas and re-validate', async ({ page }) => {
    await page.goto('/editor');
    await uploadFile(page, 'tests/fixtures/valid-test.tei.xml');

    // Open validation panel
    await page.click('[data-testid="validation-panel"]');

    // Select different schema
    await page.selectOption('#schema-select', 'tei-all');

    // Verify selection persisted
    const selectedValue = await page.locator('#schema-select').inputValue();
    expect(selectedValue).toBe('tei-all');
  });

  test('should persist schema selection across sessions', async ({ page }) => {
    await page.goto('/editor');
    await uploadFile(page, 'tests/fixtures/valid-test.tei.xml');

    // Open validation panel
    await page.click('[data-testid="validation-panel"]');

    // Select schema
    await page.selectOption('#schema-select', 'tei-novel');

    // Reload page
    await page.reload();

    // Verify selection persisted
    await page.click('[data-testid="validation-panel"]');
    const selectedValue = await page.locator('#schema-select').inputValue();
    expect(selectedValue).toBe('tei-novel');
  });
});
```

**Step 2: Run E2E tests**

Run: `npm run test:e2e tests/e2e/document-validation.spec.ts`
Expected: PASS (new tests pass)

**Step 3: Commit**

```bash
git add tests/e2e/document-validation.spec.ts
git commit -m "test: add E2E tests for schema selection"
```

---

## Task 13: Update ValidationService Tests

**Files:**
- Modify: `tests/unit/validation-service.test.ts`

**Step 1: Add tests with different schemas**

Add to existing validation service tests:

```typescript
describe('ValidationService with schema selection', () => {
  it('should validate with tei-minimal schema', async () => {
    const service = new ValidationService({
      defaultSchemaPath: 'tests/fixtures/schemas/test-tei.rng'
    });

    const xml = '<TEI><teiHeader><fileDesc><titleStmt><title>Test</title></titleStmt><publicationStmt><publisher>Test</publisher><date>2024</date></publicationStmt><sourceDesc><p>Test</p></sourceDesc></fileDesc></teiHeader><text><body><p>Content</p></body></text></TEI>';

    const result = await service.validateDocument(xml);

    expect(result.valid).toBe(true);
  });

  it('should return errors for invalid XML', async () => {
    const service = new ValidationService({
      defaultSchemaPath: 'tests/fixtures/schemas/test-tei.rng'
    });

    const xml = '<TEI><invalidElement /></TEI>';

    const result = await service.validateDocument(xml);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
```

**Step 2: Run tests**

Run: `npm test -- validation-service.test.ts`
Expected: PASS (all tests pass)

**Step 3: Commit**

```bash
git add tests/unit/validation-service.test.ts
git commit -m "test: add schema-specific validation tests"
```

---

## Task 14: Documentation

**Files:**
- Modify: `FEATURES.md` (add schema selection section)
- Create: `docs/schema-integration.md` (technical documentation)

**Step 1: Update FEATURES.md**

Add section to `FEATURES.md`:

```markdown
## Schema Selection

The ValidationPanel supports multiple TEI schemas for different document types:

### Available Schemas

- **TEI Minimal (Dialogue)** - Fast validation for dialogue documents
  - Elements: `sp`, `speaker`, `stage`, `p`, `emph`
  - Best for: Dialogue-heavy documents, screenplays

- **TEI P5 Complete** - Full TEI schema
  - All standard TEI elements
  - Best for: Comprehensive validation, complex documents

- **TEI for Novels** - Optimized for prose fiction
  - Elements: `div`, `p`, `quote`, `name`, `emph`
  - Best for: Novels, short stories, prose

### Using Schema Selection

1. Open the ValidationPanel
2. Use the "Validation Schema" dropdown
3. Select your desired schema
4. Selection persists across sessions
```

**Step 2: Create technical documentation**

Create `docs/schema-integration.md`:

```markdown
# TEI Schema Integration

## Architecture

The schema integration uses a protocol-based design for flexibility and testability.

### SchemaResolver Protocol

```typescript
interface SchemaResolver {
  resolve(schemaId: string): string | null;
  list(): ReadonlyArray<SchemaInfo>;
  has(schemaId: string): boolean;
}
```

### Security

Schema IDs are constrained to an allow-list to prevent path traversal:
- Only pre-approved schema IDs can be resolved
- Arbitrary file paths are rejected
- Returns 400 error for unknown schemas

### Adding New Schemas

1. Create `.rng` file in `public/schemas/`
2. Add to `SCHEMA_REGISTRY` in `FileSchemaResolver.ts`
3. Add ID to `ALLOWED_SCHEMA_IDS`
4. Restart application

### State Management

Schema selection uses immutable values:
- `SchemaSelection` - Current selection with timestamp
- `SchemaSelectionHistory` - Tracks last 10 selections
- Persisted to localStorage for convenience
```

**Step 3: Commit**

```bash
git add FEATURES.md docs/schema-integration.md
git commit -m "docs: add schema selection documentation"
```

---

## Task 15: Final Integration Test

**Step 1: Run all tests**

Run: `npm test`
Expected: All tests pass

**Step 2: Run E2E tests**

Run: `npm run test:e2e`
Expected: All E2E tests pass

**Step 3: TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Build verification**

Run: `npm run build`
Expected: Build succeeds

**Step 5: Manual testing checklist**

- [ ] Open ValidationPanel
- [ ] Verify schema dropdown appears
- [ ] Select different schemas
- [ ] Verify validation uses selected schema
- [ ] Reload page and verify selection persists
- [ ] Check browser console for errors

**Step 6: Final commit**

```bash
git add .
git commit -m "feat: complete configurable schema integration

- Protocol-based SchemaResolver for composability
- Security constraints with allow-list
- Value-oriented schema selection state
- UI integration in ValidationPanel
- Three schemas: tei-minimal, tei-all, tei-novel
- Complete test coverage

Fixes broken /schemas/tei-all.rng default path issue."
```

---

## Verification Steps

After implementation:

1. **API endpoints working:**
   ```bash
   curl http://localhost:3000/api/schemas
   curl -X POST http://localhost:3000/api/validate -d '{"xml":"<TEI>...</TEI>","schemaId":"tei-minimal"}'
   ```

2. **Schema files accessible:**
   ```bash
   curl http://localhost:3000/schemas/tei-minimal.rng
   ```

3. **ValidationPanel loads schemas:**
   - Open editor
   - Check ValidationPanel shows dropdown
   - Verify all 3 schemas listed

4. **Schema switching works:**
   - Select different schema
   - Verify validation re-runs
   - Reload and verify selection persists

---

## Rollback Plan

If issues arise:

1. **API issues:** Revert Tasks 5-6, validation API still accepts `schemaPath`
2. **UI issues:** Revert Task 10, ValidationPanel works without schema selector
3. **Schema files:** Delete schemas from `public/schemas/`, old behavior returns
4. **Complete rollback:** Reset to commit before Task 1
