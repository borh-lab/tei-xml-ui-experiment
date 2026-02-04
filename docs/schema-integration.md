# TEI Schema Integration

## Overview

The TEI Dialogue Editor supports configurable schema validation, allowing users to validate documents against different TEI schemas based on their document type and requirements.

## Architecture

The schema integration uses a protocol-based design for flexibility and testability.

### SchemaResolver Protocol

```typescript
interface SchemaResolver {
  resolve(schemaId: string): string | null;
  list(): ReadonlyArray<SchemaInfo>;
  has(schemaId: string): boolean;
}

interface SchemaInfo {
  id: string;
  name: string;
  description: string;
  tags: string[];
}
```

### FileSchemaResolver

The default implementation loads schemas from the `public/schemas/` directory:

```typescript
class FileSchemaResolver implements SchemaResolver {
  resolve(schemaId: string): string | null {
    // Returns file path or null if not found
  }

  list(): ReadonlyArray<SchemaInfo> {
    // Returns all registered schemas
  }

  has(schemaId: string): boolean {
    // Checks if schema ID is registered
  }
}
```

### Security

Schema IDs are constrained to an allow-list to prevent path traversal attacks:

- Only pre-approved schema IDs can be resolved
- Arbitrary file paths are rejected
- API returns 400 error for unknown schemas
- Client-side validation before API calls

## Available Schemas

### TEI Minimal (tei-minimal)

**Location:** `public/schemas/tei-minimal.rng`

**Purpose:** Fast validation for dialogue-heavy documents

**Supported Elements:**

- `sp` - Speech
- `speaker` - Speaker name
- `stage` - Stage directions
- `p` - Paragraphs
- `emph` - Emphasis

**Use Cases:**

- Screenplays
- Dialogue scripts
- Dramatic works
- Performance transcripts

### TEI P5 Complete (tei-all)

**Location:** `public/schemas/tei-all.rng`

**Purpose:** Full TEI P5 validation

**Supported Elements:**

- All standard TEI elements
- Complete TEI P5 vocabulary
- Header elements
- Text structure elements

**Use Cases:**

- Complex TEI documents
- Scholarly editions
- Archival documents
- Standards compliance

### TEI for Novels (tei-novel)

**Location:** `public/schemas/tei-novel.rng`

**Purpose:** Optimized for prose fiction

**Supported Elements:**

- `div` - Divisions
- `p` - Paragraphs
- `quote` - Quotations
- `name` - Character names
- `emph` - Emphasis

**Use Cases:**

- Novels
- Short stories
- Prose fiction
- Narrative works

## State Management

Schema selection uses immutable values for predictability:

### SchemaSelection

```typescript
interface SchemaSelection {
  schemaId: string;
  timestamp: number;
}
```

- **schemaId** - The selected schema identifier
- **timestamp** - When the selection was made (for history)

### SchemaSelectionHistory

```typescript
interface SchemaSelectionHistory {
  current: SchemaSelection;
  previous: SchemaSelection[];
}
```

- **current** - The active schema selection
- **previous** - Last 10 selections (for undo capability)

### Persistence

- Stored in browser's `localStorage`
- Key: `tei-schema-selection`
- Automatically loaded on application start
- Survives page refreshes and browser restarts

## API Endpoints

### GET /api/schemas

Returns list of available schemas.

**Response:**

```json
{
  "schemas": [
    {
      "id": "tei-minimal",
      "name": "TEI Minimal (Dialogue)",
      "description": "Fast validation for dialogue documents",
      "tags": ["dialogue", "minimal"]
    },
    {
      "id": "tei-all",
      "name": "TEI P5 Complete",
      "description": "Full TEI schema with all elements",
      "tags": ["complete", "p5"]
    },
    {
      "id": "tei-novel",
      "name": "TEI for Novels",
      "description": "Optimized for prose fiction",
      "tags": ["novel", "prose"]
    }
  ]
}
```

### GET /api/schemas/:schemaId

Get schema file content.

**Parameters:**

- `schemaId` - Schema identifier (must be in allow-list)

**Response:**

- Content-Type: `application/xml`
- Body: RelaxNG schema file

**Errors:**

- `400 Bad Request` - Unknown schema ID
- `404 Not Found` - Schema file not found

## Adding New Schemas

To add a new schema to the system:

### Step 1: Create Schema File

Create your `.rng` file in `public/schemas/`:

```bash
public/schemas/tei-custom.rng
```

Example schema structure:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<grammar xmlns="http://relaxng.org/ns/structure/1.0">
  <!-- Your schema rules -->
</grammar>
```

### Step 2: Register Schema

Add to `SCHEMA_REGISTRY` in `lib/schema/FileSchemaResolver.ts`:

```typescript
const SCHEMA_REGISTRY: ReadonlyArray<SchemaInfo> = [
  // ... existing schemas
  {
    id: 'tei-custom',
    name: 'TEI Custom Schema',
    description: 'My custom validation rules',
    tags: ['custom', 'specialized'],
  },
];
```

### Step 3: Add to Allow-List

Add the schema ID to `ALLOWED_SCHEMA_IDS`:

```typescript
const ALLOWED_SCHEMA_IDS: ReadonlySet<string> = new Set([
  // ... existing IDs
  'tei-custom',
]);
```

### Step 4: Restart Application

The new schema will be available in the ValidationPanel dropdown.

## Usage in Components

### ValidationPanel Integration

The ValidationPanel component automatically loads available schemas and manages selection:

```typescript
import { SchemaSelectionManager } from '@/lib/schema/SchemaSelection';
import { createDefaultResolver } from '@/lib/schema/FileSchemaResolver';

const resolver = createDefaultResolver();
const selectionManager = new SchemaSelectionManager(resolver);

// Load schemas from API
const schemas = await fetch('/api/schemas').then((r) => r.json());

// Handle schema changes
const handleSchemaChange = (newSchemaId: string) => {
  setSelectionHistory((prev) => selectionManager.transition(prev, newSchemaId));
};
```

### Validation API Integration

When validating documents, the selected schema is used:

```typescript
// POST /api/validate
{
  "xml": "<?xml version=\"1.0\"...<TEI>...</TEI>",
  "schemaId": "tei-minimal"  // User's selected schema
}
```

The validation endpoint resolves the schema ID to the file path and validates accordingly.

## Testing

### Unit Tests

Schema resolvers are tested in `tests/unit/schema/`:

```bash
npm test -- FileSchemaResolver.test.ts
npm test -- SchemaSelection.test.ts
```

### E2E Tests

Schema selection is tested in E2E suite:

```bash
npm run test:e2e tests/e2e/document-validation.spec.ts
```

## Troubleshooting

### Schema Not Appearing

If a schema doesn't appear in the dropdown:

1. Check the file exists in `public/schemas/`
2. Verify it's in `SCHEMA_REGISTRY`
3. Ensure ID is in `ALLOWED_SCHEMA_IDS`
4. Check browser console for errors
5. Restart the development server

### Validation Errors

If validation fails unexpectedly:

1. Verify schema file is valid RelaxNG
2. Check browser console for detailed errors
3. Test schema with standalone validator
4. Verify schema ID matches between registry and allow-list

### Persistence Issues

If schema selection doesn't persist:

1. Check localStorage is enabled
2. Verify no browser extensions blocking storage
3. Check browser console for storage errors
4. Clear cache and try again

## Future Enhancements

Potential improvements to schema integration:

- **Remote Schemas** - Load schemas from external URLs
- **User-Defined Schemas** - Allow users to upload custom schemas
- **Schema Validation** - Validate schema files themselves
- **Schema Diff** - Show differences between schemas
- **Recommendation Engine** - Suggest schemas based on document content
- **Schema Versioning** - Track schema versions and updates
