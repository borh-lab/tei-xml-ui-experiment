# Design: Configurable TEI Schema Integration

**Status:** Design Phase
**Created:** 2025-02-03
**Author:** Claude Code (with Hickey-style review)

## Overview

Fix the broken RelaxNG schema integration where the default schema path `/schemas/tei-all.rng` doesn't exist. The solution makes schemas configurable through a protocol-based architecture, explicit constraints for security, and improved state modeling.

**Key improvements over typical approach:**

- Protocol-based design (SchemaResolver) for composability
- Explicit constraints (schema allow-list) for security
- Value-oriented state modeling for schema selection
- Clear separation of metadata from resolution logic

---

## Architecture

### Component Diagram

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│ ValidationPanel │─────▶│   ValidateAPI    │─────▶│ SchemaResolver  │
│   (UI)          │      │   (protocol)     │      │   (protocol)    │
└─────────────────┘      └──────────────────┘      └─────────────────┘
                                │                         │
                                ▼                         ▼
                         ┌──────────────────┐      ┌─────────────────┐
                         │ ValidationService│      │FileSchemaResolver│
                         │                  │      │   (impl)        │
                         └──────────────────┘      └─────────────────┘
                                │                         │
                                ▼                         ▼
                         ┌──────────────────┐      ┌─────────────────┐
                         │   SchemaLoader   │      │ public/schemas/ │
                         │   (cached)       │      │   *.rng files   │
                         └──────────────────┘      └─────────────────┘
```

---

## Component 1: SchemaResolver Protocol

**File:** `lib/schema/SchemaResolver.ts`

**Purpose:** First-class protocol for schema resolution. Enables composition and testing.

### Interface Definition

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

**Design rationale:**

- **Protocol-first**: Any implementation can work (filesystem, database, remote)
- **Readonly types**: Immutable values, safe to share
- **Composable**: Can wrap with caching, logging, fallback behavior

---

## Component 2: FileSchemaResolver Implementation

**File:** `lib/schema/FileSchemaResolver.ts`

**Purpose:** Filesystem-based schema resolver with explicit constraints.

### Implementation

```typescript
import { SchemaResolver, SchemaInfo } from './SchemaResolver';

/**
 * Explicit constraint: Only these schema IDs are allowed
 * This prevents arbitrary file access and makes debugging easier
 */
const ALLOWED_SCHEMA_IDS = new ReadonlySet(['tei-minimal', 'tei-all', 'tei-novel']);

/**
 * Schema registry: Metadata for known schemas
 * Could be loaded from JSON in the future
 */
const SCHEMA_REGISTRY: Readonly<Record<string, SchemaInfo>> = {
  'tei-minimal': {
    id: 'tei-minimal',
    name: 'TEI Minimal (Dialogue)',
    description: 'Core TEI elements for dialogue annotation: sp, speaker, stage',
    path: '/schemas/tei-minimal.rng',
    tags: ['dialogue', 'lightweight', 'fast'],
  },
  'tei-all': {
    id: 'tei-all',
    name: 'TEI P5 Complete',
    description: 'Full TEI P5 schema with all standard elements',
    path: '/schemas/tei-all.rng',
    tags: ['complete', 'comprehensive', 'slow'],
  },
  'tei-novel': {
    id: 'tei-novel',
    name: 'TEI for Novels',
    description: 'TEI schema optimized for prose fiction',
    path: '/schemas/tei-novel.rng',
    tags: ['novel', 'prose', 'fiction'],
  },
} as const;

/**
 * Filesystem-based schema resolver with security constraints
 *
 * Security: Only resolves schema IDs in the allow-list
 * Simplicity: Pure functions, no mutation
 * Composition: Can be wrapped with caching, logging, etc.
 */
export class FileSchemaResolver implements SchemaResolver {
  private readonly schemas: Readonly<Record<string, SchemaInfo>>;
  private readonly allowedIds: ReadonlySet<string>;

  constructor(
    schemas: Record<string, SchemaInfo> = SCHEMA_REGISTRY,
    allowedIds: Set<string> = ALLOWED_SCHEMA_IDS
  ) {
    // Freeze to prevent mutation
    this.schemas = Object.freeze({ ...schemas });
    this.allowedIds = new ReadonlySet(allowedIds);
  }

  resolve(schemaId: string): string | null {
    // Constraint: Only allow known schema IDs
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

  /**
   * Get metadata for a specific schema
   * Useful for UI display
   */
  getSchemaInfo(schemaId: string): SchemaInfo | null {
    if (!this.has(schemaId)) {
      return null;
    }
    return this.schemas[schemaId] ?? null;
  }
}
```

**Design rationale:**

- **Explicit constraints**: `ALLOWED_SCHEMA_IDS` prevents arbitrary file access
- **Immutable data**: `Readonly` types, `Object.freeze()` prevent mutation
- **Value-oriented**: Returns new values, doesn't mutate internal state
- **Testable**: Can inject custom schemas for testing

---

## Component 3: Schema Registry API Endpoint

**File:** `app/api/schemas/route.ts` (new)

**Purpose:** Expose available schemas to the UI.

### Implementation

```typescript
import { NextResponse } from 'next/server';
import { FileSchemaResolver } from '@/lib/schema/FileSchemaResolver';

// Singleton resolver instance
const resolver = new FileSchemaResolver();

export async function GET() {
  try {
    const schemas = resolver.list();

    return NextResponse.json({
      schemas: schemas.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        tags: s.tags,
      })),
    });
  } catch (error) {
    console.error('Schema list API error:', error);
    return NextResponse.json({ error: 'Failed to list schemas' }, { status: 500 });
  }
}
```

---

## Component 4: Updated Validation API

**File:** `app/api/validate/route.ts` (modified)

### Key Changes

```typescript
import { SchemaResolver, SchemaInfo } from '@/lib/schema/SchemaResolver';
import { FileSchemaResolver } from '@/lib/schema/FileSchemaResolver';
import { ValidationService } from '@/lib/validation/ValidationService';

// Singleton resolver
const resolver: SchemaResolver = new FileSchemaResolver();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { xml, schemaId } = body;

    if (!xml) {
      return NextResponse.json({ error: 'Missing XML content' }, { status: 400 });
    }

    // Default to tei-minimal for fast validation
    const effectiveSchemaId = schemaId || 'tei-minimal';

    // Constraint: Validate schema ID before processing
    if (!resolver.has(effectiveSchemaId)) {
      const availableSchemas = resolver.list();
      return NextResponse.json(
        {
          error: `Unknown schema: ${effectiveSchemaId}`,
          availableSchemas: availableSchemas.map((s) => s.id),
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

**Design improvements:**

- **Protocol-based**: Uses `SchemaResolver` interface, not concrete class
- **Explicit validation**: Checks `resolver.has()` before resolving
- **Better errors**: Returns available schemas on 400 error
- **Default changed**: Uses `tei-minimal` (fast) instead of `tei-all` (slow)

---

## Component 5: Schema Selection State Management

**File:** `lib/schema/SchemaSelection.ts` (new)

**Purpose:** Model schema selection as explicit state, not hidden localStorage mutations.

### State Model

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
 * Enables debugging and comparison
 */
export interface SchemaSelectionHistory {
  readonly current: SchemaSelection;
  readonly previous: ReadonlyArray<SchemaSelection>;
}

/**
 * Create a new schema selection
 */
export function createSchemaSelection(schemaId: string): SchemaSelection {
  return {
    schemaId,
    timestamp: Date.now(),
  };
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

  return {
    current: newSelection,
    previous: [history.current, ...history.previous.slice(0, 9)], // Keep last 10
  };
}

/**
 * Schema selection manager
 * Handles persistence and validation
 */
export class SchemaSelectionManager {
  constructor(
    private readonly resolver: SchemaResolver,
    private readonly storageKey: string = 'tei:selected-schema'
  ) {}

  /**
   * Load current selection from storage
   * Validates that schema still exists
   */
  load(): SchemaSelection {
    const stored = localStorage.getItem(this.storageKey);

    if (!stored) {
      // Default to tei-minimal
      return createSchemaSelection('tei-minimal');
    }

    try {
      const parsed = JSON.parse(stored) as SchemaSelection;

      // Validate schema still exists
      if (this.resolver.has(parsed.schemaId)) {
        return parsed;
      }

      // Schema no longer available, reset to default
      return createSchemaSelection('tei-minimal');
    } catch {
      // Invalid data, reset to default
      return createSchemaSelection('tei-minimal');
    }
  }

  /**
   * Save selection to storage
   * Returns new state value
   */
  save(selection: SchemaSelection): SchemaSelection {
    localStorage.setItem(this.storageKey, JSON.stringify(selection));
    return selection;
  }

  /**
   * Transition to new schema
   * Returns new history value
   */
  transition(history: SchemaSelectionHistory, newSchemaId: string): SchemaSelectionHistory {
    const newHistory = transitionSchemaSelection(history, newSchemaId);
    this.save(newHistory.current);
    return newHistory;
  }
}
```

**Design rationale:**

- **Value-oriented**: State is immutable values, not mutable places
- **Explicit time**: History tracks schema changes over time
- **Validation**: Checks schema exists before using it
- **Recoverable**: Gracefully handles invalid stored data

---

## Component 6: ValidationPanel UI Updates

**File:** `components/validation/ValidationPanel.tsx` (modified)

### State Changes

```typescript
import { SchemaSelectionManager, SchemaSelectionHistory } from '@/lib/schema/SchemaSelection';
import { SchemaInfo } from '@/lib/schema/SchemaResolver';

export function ValidationPanel() {
  const [selectionHistory, setSelectionHistory] = useState<SchemaSelectionHistory>(() => ({
    current: selectionManager.load(),
    previous: [],
  }));
  const [availableSchemas, setAvailableSchemas] = useState<SchemaInfo[]>([]);

  // Load available schemas on mount
  useEffect(() => {
    fetch('/api/schemas')
      .then((r) => r.json())
      .then((data) => setAvailableSchemas(data.schemas));
  }, []);

  // Handle schema change
  const handleSchemaChange = useCallback((newSchemaId: string) => {
    const manager = new SchemaSelectionManager(resolver);
    setSelectionHistory((prev) => manager.transition(prev, newSchemaId));
  }, []);

  // Get current schema info
  const currentSchema = useMemo(() => {
    return availableSchemas.find((s) => s.id === selectionHistory.current.schemaId);
  }, [availableSchemas, selectionHistory.current.schemaId]);
}
```

### UI Elements

```jsx
<div className="schema-selector">
  <label>Validation Schema</label>
  <select
    value={selectionHistory.current.schemaId}
    onChange={(e) => handleSchemaChange(e.target.value)}
  >
    {availableSchemas.map((schema) => (
      <option key={schema.id} value={schema.id}>
        {schema.name}
      </option>
    ))}
  </select>

  {currentSchema && (
    <div className="schema-info">
      <p>{currentSchema.description}</p>
      <div className="tags">
        {currentSchema.tags.map((tag) => (
          <span key={tag} className="tag">
            {tag}
          </span>
        ))}
      </div>
    </div>
  )}
</div>
```

---

## Component 7: Schema Files

**Location:** `public/schemas/`

### New Files to Create

1. **`tei-minimal.rng`** (~100 lines)
   - TEI header with basic metadata
   - Text body with paragraphs
   - Dialogue elements: `<sp>`, `<speaker>`, `<stage>`
   - Inline elements: `<emph>`, `<q>`

2. **`tei-novel.rng`** (~200 lines)
   - TEI header for novels
   - Text with `<div>`, `<p>`, `<quote>`
   - Chapter/section structure
   - Narrative elements

3. **`tei-all.rng`**
   - Copy from `TEI/Documents/GettingStarted/samples/tei_all.rng`
   - Full TEI P5 schema (612KB)

---

## Data Flow

```
User opens ValidationPanel
    ↓
GET /api/schemas → returns available schemas
    ↓
Load schema selection from localStorage (via SchemaSelectionManager)
    ↓
Validate with current selection
    ↓
User changes schema dropdown
    ↓
create new SchemaSelection value
    ↓
update state (immutable)
    ↓
save to localStorage
    ↓
re-validate with new schema
```

---

## Error Handling

### Schema Not Found (404)

```json
{
  "error": "Schema path not found for: tei-minimal",
  "availableSchemas": ["tei-all", "tei-novel"]
}
```

### Invalid Schema ID (400)

```json
{
  "error": "Unknown schema: unknown-id",
  "availableSchemas": ["tei-minimal", "tei-all", "tei-novel"]
}
```

### Validation Error (200 with errors)

```json
{
  "valid": false,
  "errors": [
    {
      "message": "Element error at <unknownTag>: unexpected element",
      "line": 42,
      "column": 5,
      "context": "...",
      "severity": "error"
    }
  ]
}
```

---

## Testing Strategy

### Unit Tests

1. **`schema-resolver.test.ts`** (new)
   - Test `resolve()` returns correct paths
   - Test `has()` validates against allow-list
   - Test unknown schema IDs return null
   - Test schema metadata is readonly

2. **`schema-selection.test.ts`** (new)
   - Test `createSchemaSelection()` creates value
   - Test `transitionSchemaSelection()` returns new state
   - Test history maintains last 10 selections
   - Test persistence with mock storage

3. **Update `validation-api.test.ts`**
   - Test with different schema IDs
   - Test error handling for unknown schemas
   - Test default schema fallback

### Integration Tests

1. **Schema selection workflow**
   - Load schemas from API
   - Select different schema
   - Verify validation uses correct schema
   - Verify state persistence

2. **Schema constraint validation**
   - Try to use non-allowed schema ID
   - Verify 400 error returned
   - Verify available schemas listed in error

### E2E Tests

1. **Update `document-validation.spec.ts`**
   - Test validation with schema selection
   - Test schema switching
   - Test error scenarios (missing schema)

---

## Security Considerations

### Path Traversal Prevention

The `ALLOWED_SCHEMA_IDS` constraint prevents path traversal attacks:

```typescript
// ❌ Blocked: Not in allow-list
resolve('../../../etc/passwd') → null

// ✅ Allowed: Known schema
resolve('tei-minimal') → '/schemas/tei-minimal.rng'
```

### Schema File Validation

Before loading schemas:

1. Check schema ID is in allow-list
2. Verify file exists
3. Validate file is readable

---

## Performance Considerations

1. **Schema caching**: `SchemaLoader` already caches parsed schemas
2. **Small default**: Use `tei-minimal` for fast initial validation
3. **Lazy loading**: Only load schema when needed
4. **Registry is static**: No database queries needed

---

## Migration Path

### Phase 1: Protocol Layer (No breaking changes)

1. Add `SchemaResolver` protocol
2. Add `FileSchemaResolver` implementation
3. Add allow-list constraints
4. Update API to use resolver (still supports path-based)

### Phase 2: State Management

1. Add `SchemaSelectionManager`
2. Update ValidationPanel to use new state model
3. Add schema selector UI

### Phase 3: Schema Files

1. Create `tei-minimal.rng`
2. Create `tei-novel.rng`
3. Copy `tei-all.rng` to `public/schemas/`

### Phase 4: Cleanup

1. Update documentation
2. Remove old path-based API (after transition period)
3. Add monitoring for schema usage

---

## Future Enhancements

1. **Dynamic schema loading**: Load schemas from database
2. **Custom schemas**: Allow users to upload custom schemas
3. **Schema versioning**: Track schema versions for reproducibility
4. **Validation comparison**: Compare validation results across schemas
5. **Schema recommendations**: Suggest schema based on document content

---

## Summary of Hickey-Style Improvements

| Principle              | Implementation                                    |
| ---------------------- | ------------------------------------------------- |
| **Simplicity**         | Protocol separates resolution from implementation |
| **Values over Places** | SchemaSelection as immutable values               |
| **Composition**        | SchemaResolver protocol allows any implementation |
| **Time Modeling**      | SchemaSelectionHistory tracks state changes       |
| **Protocols**          | First-class SchemaResolver interface              |
| **Constraints**        | ALLOWED_SCHEMA_IDS prevents arbitrary access      |
