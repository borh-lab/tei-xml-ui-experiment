# Schema-Driven Validation System

Comprehensive guide to the TEI XML validation system that provides real-time schema validation, auto-fix suggestions, and multi-tag workflow.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Usage Guide](#usage-guide)
4. [Extending the System](#extending-the-system)
5. [Migration Guide](#migration-guide)
6. [Testing Guide](#testing-guide)
7. [API Reference](#api-reference)
8. [Feature Flags](#feature-flags)
9. [Troubleshooting](#troubleshooting)

---

## Overview

The validation system is a comprehensive, schema-driven validation engine for TEI P5 XML documents. It provides real-time validation during editing, automatic error detection, actionable fix suggestions, and support for multi-tag batch workflows.

### Key Features

- **Schema-Driven Validation**: Automatically parses RelaxNG schemas to extract constraints
- **Entity-Aware IDREFs**: Validates IDREF attributes against all entity types (characters, places, organizations)
- **Content Model Support**: Validates what tags can contain (text-only, mixed content, allowed children)
- **Auto-Fix UI**: Generates actionable fixes for validation errors with one-click application
- **Multi-Tag Workflow**: Queue-based batch tag application without losing selection
- **Performance Optimized**: LRU caching for parsed schemas, efficient validation algorithms

### Benefits Over Old System

| Feature | Old System | New System |
|---------|-----------|------------|
| Constraint Source | Hardcoded in TypeScript | Parsed from RelaxNG schemas |
| Tag Coverage | 3 tags (`<said>`, `<persName>`, `<q>`) | All tags in schema |
| IDREF Validation | Characters only | All entity types |
| Error Recovery | Error messages only | Actionable fixes |
| Multi-Tag | Lost selection after each tag | Queue-based workflow |
| Schema Updates | Manual code changes | Automatic from schema files |

### System Components

The validation system consists of four main layers:

1. **Schema Parser Layer** - Parses RelaxNG schemas to extract constraints
2. **Validation Engine** - Validates selections against parsed constraints
3. **Auto-Fix System** - Generates actionable fixes for errors
4. **Tag Queue** - Manages batch tag application workflow

---

## Architecture

### High-Level Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Editor UI                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Tag Toolbar  │  │  Queue Panel │  │ Fix Buttons  │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    useEditorState Hook                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ handleApply  │  │  TagQueue    │  │ executeFix   │          │
│  │     Tag      │  │              │  │              │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Validation Layer                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Validator   │  │EntityDetector│  │SchemaDetection│          │
│  └──────┬───────┘  └──────────────┘  └──────────────┘          │
│         │                                                           │
│         ▼                                                           │
│  ┌──────────────┐                                                  │
│  │ SchemaCache  │                                                  │
│  └──────┬───────┘                                                  │
└─────────┼─────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                 Schema Parser Layer                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │RelaxNGParser │  │  .rng Files  │  │ Parsed       │          │
│  │              │  │              │  │Constraints   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

### Key Components

#### 1. RelaxNGParser
**Location**: `/home/bor/Projects/tei-xml/lib/validation/RelaxNGParser.ts`

Parses RelaxNG XML schema files to extract:
- Tag definitions (required/optional attributes)
- Attribute constraints (types, allowed values)
- Content models (text-only, mixed content, allowed children)

```typescript
import { RelaxNGParser } from '@/lib/validation'

const parser = new RelaxNGParser()
const constraints = parser.parse(schemaXML)

// constraints.tags['said'] = {
//   tagName: 'said',
//   requiredAttributes: ['who'],
//   optionalAttributes: ['ana', 'corresp'],
//   allowedParents: []
// }
```

#### 2. SchemaCache
**Location**: `/home/bor/Projects/tei-xml/lib/validation/SchemaCache.ts`

LRU cache for parsed schemas to avoid redundant parsing.

```typescript
import { SchemaCache } from '@/lib/validation'

const cache = new SchemaCache({ maxSize: 10, ttl: 3600000 })
const constraints1 = cache.get('/public/schemas/tei-novel.rng')
const constraints2 = cache.get('/public/schemas/tei-novel.rng') // Cached!
```

#### 3. Validator
**Location**: `/home/bor/Projects/tei-xml/lib/validation/Validator.ts`

Core validation engine that checks tag applications against schema constraints.

```typescript
import { Validator, SchemaCache } from '@/lib/validation'

const cache = new SchemaCache({ maxSize: 10 })
const validator = new Validator(cache)

const result = validator.validate(
  passage,
  { start: 0, end: 10 },
  'said',
  { who: '#char-1' },
  document
)

// result = {
//   valid: true,
//   errors: [],
//   warnings: [],
//   fixes: []
// }
```

#### 4. EntityDetector
**Location**: `/home/bor/Projects/tei-xml/lib/validation/EntityDetector.ts`

Detects which entity type an IDREF attribute references.

```typescript
import { detectEntityTypeFromAttribute, getEntities } from '@/lib/validation'

// Detect entity type from tag and attribute
const entityType = detectEntityTypeFromAttribute('persName', 'ref')
// Returns: 'character'

// Get entities of a type from document
const characters = getEntities(document, 'character')
```

#### 5. TagQueue
**Location**: `/home/bor/Projects/tei-xml/lib/queue/TagQueue.ts`

Manages queue of tags waiting to be applied.

```typescript
import { TagQueue } from '@/lib/queue/TagQueue'

const queue = new TagQueue()

// Add tags to queue
const id1 = queue.add({
  tagType: 'said',
  attributes: { who: '#char-1' },
  passageId: 'passage-0',
  range: { start: 0, end: 10 }
})

const id2 = queue.add({
  tagType: 'persName',
  attributes: { ref: '#char-1' },
  passageId: 'passage-0',
  range: { start: 0, end: 4 }
})

console.log(queue.size) // 2

// Remove a tag
queue.remove(id1)

// Clear all
queue.clear()
```

### Data Flow

```
User Selection
    │
    ▼
[1] Detect Schema Path
    │ (from TEI header)
    ▼
[2] Load Schema (cached)
    │
    ▼
[3] Parse RelaxNG → Extract Constraints
    │
    ▼
[4] Validate Against Constraints
    │
    ├──► Valid? ──► Apply Tag
    │
    └──► Invalid? ──► Generate Fixes
                         │
                         ▼
                    Show Fix UI
                         │
                         ├──► User clicks fix
                         │
                         └──► Execute Fix ──► Apply Tag
```

---

## Usage Guide

### 3.1 Basic Tag Validation

The simplest way to validate a tag before applying it:

```typescript
import { Validator, SchemaCache } from '@/lib/validation'
import type { Passage, TEIDocument } from '@/lib/tei/types'

// Create validator instance
const cache = new SchemaCache({ maxSize: 10 })
const validator = new Validator(cache)

// Validate a tag application
const result = validator.validate(
  passage,                          // Passage containing the selection
  { start: 0, end: 10 },           // Text range
  'said',                          // Tag name
  { who: '#char-1' },             // Attributes
  document                         // TEI document
)

// Check validation result
if (result.valid) {
  console.log('Tag is valid!')
} else {
  console.error('Validation errors:')
  result.errors.forEach(error => {
    console.error(`  - ${error.message}`)
  })

  console.log('Suggested fixes:')
  result.fixes.forEach(fix => {
    console.log(`  - ${fix.label}`)
  })
}
```

#### Example: Validating a `<said>` Tag

```typescript
// Example 1: Valid tag application
const result1 = validator.validate(
  passage,
  { start: 0, end: 10 },
  'said',
  { who: '#john-doe' },
  document
)
// { valid: true, errors: [], warnings: [], fixes: [] }

// Example 2: Missing required attribute
const result2 = validator.validate(
  passage,
  { start: 0, end: 10 },
  'said',
  {}, // No @who attribute
  document
)
// {
//   valid: false,
//   errors: [
//     {
//       type: 'missing-required-attribute',
//       attribute: 'who',
//       message: "Required attribute 'who' is missing"
//     }
//   ],
//   fixes: [
//     {
//       type: 'add-attribute',
//       attribute: 'who',
//       suggestedValues: ['#john-doe', '#jane-smith'],
//       label: 'Add @who with existing character'
//     }
//   ]
// }

// Example 3: Invalid IDREF
const result3 = validator.validate(
  passage,
  { start: 0, end: 10 },
  'said',
  { who: '#nonexistent' },
  document
)
// {
//   valid: false,
//   errors: [
//     {
//       type: 'invalid-idref',
//       attribute: 'who',
//       value: '#nonexistent',
//       message: "Referenced character '#nonexistent' not found"
//     }
//   ],
//   fixes: [
//     {
//       type: 'change-attribute',
//       attribute: 'who',
//       suggestedValues: ['#john-doe', '#jane-smith'],
//       label: 'Change @who to existing character'
//     }
//   ]
// }
```

### 3.2 Schema-Driven Constraints

The validation system automatically parses RelaxNG schemas to extract constraints. This means validation is always in sync with your schema files.

#### How Schema Parsing Works

1. **Schema Detection**: System detects which schema to use based on TEI header

```typescript
import { detectSchemaPath } from '@/lib/validation'

const schemaPath = detectSchemaPath(document)
// Returns: '/public/schemas/tei-novel.rng' (or tei-all.rng, tei-minimal.rng)
```

2. **Schema Caching**: Parsed schemas are cached to avoid redundant parsing

```typescript
import { SchemaCache } from '@/lib/validation'

const cache = new SchemaCache({
  maxSize: 10,        // Maximum number of schemas to cache
  ttl: 3600000        // Time-to-live: 1 hour (optional)
})

// First call: reads and parses schema file
const constraints1 = cache.get('/public/schemas/tei-novel.rng')

// Second call: returns cached result (instant!)
const constraints2 = cache.get('/public/schemas/tei-novel.rng')
```

3. **Constraint Extraction**: RelaxNGParser extracts tag constraints from schema

```typescript
import { RelaxNGParser } from '@/lib/validation'

const parser = new RelaxNGParser()
const constraints = parser.parse(schemaXML)

// Access tag constraints
const saidConstraints = constraints.tags['said']
console.log(saidConstraints.requiredAttributes) // ['who']
console.log(saidConstraints.optionalAttributes) // ['ana', 'corresp', 'rend']

// Access attribute constraints
const whoConstraint = constraints.attributes['said.who']
console.log(whoConstraint.type) // 'IDREF'
console.log(whoConstraint.required) // true
```

#### Adding New Schema Files

To add a new schema file:

1. **Place schema in public directory**:
   ```
   /public/schemas/tei-custom.rng
   ```

2. **Update schema detection** in `/home/bor/Projects/tei-xml/lib/validation/schemaDetection.ts`:
   ```typescript
   export function detectSchemaPath(document: TEIDocument): string {
     const profiles = document.state.teiHeader?.profileDesc?.langUsage || []

     // Add your custom profile
     for (const lang of profiles) {
       if (lang.ident === 'tei-custom') {
         return '/public/schemas/tei-custom.rng'
       }
       // ... existing profiles
     }

     return '/public/schemas/tei-all.rng'
   }
   ```

3. **Set profile in TEI header**:
   ```xml
   <teiHeader>
     <profileDesc>
       <langUsage>
         <language ident="tei-custom">Custom TEI Profile</language>
       </langUsage>
     </profileDesc>
   </teiHeader>
   ```

### 3.3 Entity-Aware IDREFs

The validation system validates IDREF attributes against the correct entity type, not just characters.

#### Supported Entity Types

| Entity Type | Example Tag | Example Attribute | Collection |
|-------------|-------------|-------------------|------------|
| character | `<said>`, `<persName>` | `@who`, `@ref` | `document.state.characters` |
| place | `<placeName>` | `@ref` | `document.state.places` |
| organization | `<orgName>` | `@ref` | `document.state.organizations` |

#### Entity Type Detection

The system automatically detects which entity type to validate against:

```typescript
import { detectEntityTypeFromAttribute } from '@/lib/validation'

// @who always maps to character
detectEntityTypeFromAttribute('said', 'who')
// Returns: 'character'

// @ref on <persName> maps to character
detectEntityTypeFromAttribute('persName', 'ref')
// Returns: 'character'

// @ref on <placeName> maps to place
detectEntityTypeFromAttribute('placeName', 'ref')
// Returns: 'place'

// @ref on <orgName> maps to organization
detectEntityTypeFromAttribute('orgName', 'ref')
// Returns: 'organization'
```

#### Validation Examples

```typescript
// Valid character reference
const result1 = validator.validate(
  passage,
  { start: 0, end: 10 },
  'said',
  { who: '#john-doe' }, // Valid character
  document
)
// valid: true

// Invalid character reference
const result2 = validator.validate(
  passage,
  { start: 0, end: 10 },
  'said',
  { who: '#unknown-char' }, // Doesn't exist
  document
)
// valid: false
// errors: [{ type: 'invalid-idref', message: "Referenced character '#unknown-char' not found" }]

// Valid place reference
const result3 = validator.validate(
  passage,
  { start: 0, end: 10 },
  'placeName',
  { ref: '#london' }, // Valid place
  document
)
// valid: true
```

### 3.4 Auto-Fix UI

When validation fails, the system generates actionable fixes that users can apply with one click.

#### Fix Types

1. **add-attribute**: Add missing required attribute
2. **change-attribute**: Change invalid attribute value
3. **create-entity**: Create new entity (character, place, organization)
4. **expand-selection**: Expand selection to fix content model violation

#### How Fixes Are Generated

```typescript
// Example: Missing @who attribute on <said>
const result = validator.validate(
  passage,
  { start: 0, end: 10 },
  'said',
  {}, // No attributes
  document
)

// Generated fixes:
result.fixes = [
  {
    type: 'add-attribute',
    attribute: 'who',
    suggestedValues: ['#char-1', '#char-2', '#char-3'],
    entityType: 'character',
    label: 'Add @who with existing character'
  },
  {
    type: 'create-entity',
    entityType: 'character',
    attribute: 'who',
    label: 'Create new character for @who'
  }
]
```

#### Applying Fixes in UI

In `useEditorState`, fixes are executed when user clicks fix button:

```typescript
const executeFix = useCallback(async (
  fix: Fix,
  passageId: string,
  range: { start: number; end: number },
  tagType: string
) => {
  switch (fix.type) {
    case 'add-attribute':
      // Re-apply tag with missing attribute
      await addTag(
        passageId,
        range,
        tagType,
        { [fix.attribute]: fix.suggestedValues[0] }
      )
      showToast(`Added @${fix.attribute} to <${tagType}>`, 'success')
      break

    case 'change-attribute':
      // Re-apply tag with corrected value
      await addTag(
        passageId,
        range,
        tagType,
        { [fix.attribute]: fix.suggestedValues[0] }
      )
      showToast(`Changed @${fix.attribute} to valid value`, 'success')
      break

    case 'create-entity':
      // Open entity creation dialog (future feature)
      showToast('Entity creation coming soon', 'info')
      break

    case 'expand-selection':
      // Re-apply tag with expanded selection
      await addTag(passageId, fix.expandedRange, tagType, {})
      showToast(`Expanded selection for <${tagType}>`, 'success')
      break
  }
}, [addTag, showToast])
```

### 3.5 Multi-Tag Workflow

The tag queue allows users to apply multiple tags without losing selection after each application.

#### Enabling Multi-Tag Mode

```typescript
const [multiTagMode, setMultiTagMode] = useState(false)

// Toggle multi-tag mode
<button onClick={() => setMultiTagMode(!multiTagMode)}>
  {multiTagMode ? 'Multi-Tag: ON' : 'Multi-Tag: OFF'}
</button>
```

#### Queuing Tags

When multi-tag mode is enabled, tags are added to queue instead of being applied immediately:

```typescript
import { TagQueue } from '@/lib/queue/TagQueue'

const queue = new TagQueue()

// Add tags to queue
const id1 = queue.add({
  tagType: 'said',
  attributes: { who: '#char-1' },
  passageId: 'passage-0',
  range: { start: 0, end: 10 }
})

const id2 = queue.add({
  tagType: 'persName',
  attributes: { ref: '#char-1' },
  passageId: 'passage-0',
  range: { start: 0, end: 4 }
})

// Get queue state
const state = queue.getState()
console.log(state.pending.length) // 2
```

#### Applying Queued Tags

```typescript
// Apply all queued tags
const applyQueue = async () => {
  let currentDoc = document

  for (const tag of queue.getPending()) {
    // Apply tag
    await addTag(
      tag.passageId,
      tag.range,
      tag.tagType,
      tag.attributes
    )

    // Mark as applied
    queue.markApplied(tag.id)
  }

  showToast(`Applied ${queue.size} tags`, 'success')
}
```

#### Queue Management

```typescript
// Remove a tag from queue
queue.remove(id1)

// Clear all pending tags
queue.clear()

// Retry failed tags
queue.retryFailed()

// Check queue status
console.log(queue.isEmpty()) // false
console.log(queue.size) // 1

// Get state snapshot
const state = queue.getState()
console.log(state.pending) // QueuedTag[]
console.log(state.applied) // QueuedTag[]
console.log(state.failed) // QueuedTag[]
```

---

## Extending the System

### 4.1 Adding New Entity Types

To add a new entity type (e.g., `event`, `item`):

#### Step 1: Update EntityType Type

In `/home/bor/Projects/tei-xml/lib/validation/types.ts`:

```typescript
export type EntityType = 'character' | 'place' | 'organization' | 'event'
```

#### Step 2: Update Entity Mappings

In `/home/bor/Projects/tei-xml/lib/validation/EntityDetector.ts`:

```typescript
const ENTITY_MAPPINGS: EntityMapping[] = [
  // ... existing mappings
  { tagName: 'event', attrName: 'ref', entityType: 'event' },
]
```

#### Step 3: Update getEntities Function

In `/home/bor/Projects/tei-xml/lib/validation/EntityDetector.ts`:

```typescript
export function getEntities(document: TEIDocument, entityType: EntityType) {
  switch (entityType) {
    case 'character':
      return document.state.characters || []
    case 'place':
      return document.state.places || []
    case 'organization':
      return document.state.organizations || []
    case 'event':
      return document.state.events || []
    default:
      return []
  }
}
```

#### Step 4: Add Entity Collection to Document

In `/home/bor/Projects/tei-xml/lib/tei/types.ts`:

```typescript
export interface TEIDocumentState {
  // ... existing fields
  events?: Event[]
}

export interface Event {
  id: string
  name: string
  // ... other fields
}
```

### 4.2 Adding New Validation Rules

To add custom validation rules beyond schema constraints:

#### Step 1: Extend Validator Class

In `/home/bor/Projects/tei-xml/lib/validation/Validator.ts`:

```typescript
export class Validator {
  // ... existing code

  /**
   * Custom validation: Check for co-occurrence constraints
   */
  private checkCooccurrenceConstraints(
    tagName: string,
    attributes: Record<string, string>,
    errors: ValidationError[]
  ): void {
    // Example: @ref and @key are mutually exclusive on <persName>
    if (tagName === 'persName' && attributes.ref && attributes.key) {
      errors.push({
        type: 'cooccurrence-violation',
        message: '@ref and @key are mutually exclusive on <persName>'
      })
    }
  }

  /**
   * Custom validation: Check for required attribute combinations
   */
  private checkRequiredCombinations(
    tagName: string,
    attributes: Record<string, string>,
    errors: ValidationError[]
  ): void {
    // Example: If @source is present, @cert must also be present
    if (attributes.source && !attributes.cert) {
      errors.push({
        type: 'missing-required-combination',
        message: '@source requires @cert to be present'
      })
    }
  }
}
```

#### Step 2: Add Custom Fix Generators

```typescript
/**
 * Generate custom fixes for co-occurrence violations
 */
private generateCooccurrenceFixes(
  tagName: string,
  attributes: Record<string, string>
): Fix[] {
  const fixes: Fix[] = []

  if (tagName === 'persName' && attributes.ref && attributes.key) {
    fixes.push({
      type: 'change-attribute',
      attribute: 'key',
      value: '',
      label: 'Remove @key to keep @ref'
    })

    fixes.push({
      type: 'change-attribute',
      attribute: 'ref',
      value: '',
      label: 'Remove @ref to keep @key'
    })
  }

  return fixes
}
```

### 4.3 Supporting New Schemas

To add support for a new RelaxNG schema:

#### Step 1: Add Schema File

Place schema in public directory:
```
/public/schemas/tei-drama.rng
```

#### Step 2: Update Schema Detection

In `/home/bor/Projects/tei-xml/lib/validation/schemaDetection.ts`:

```typescript
export function detectSchemaPath(document: TEIDocument): string {
  const profiles = document.state.teiHeader?.profileDesc?.langUsage || []

  for (const lang of profiles) {
    // Add your new schema
    if (lang.ident === 'tei-drama') {
      return '/public/schemas/tei-drama.rng'
    }
    // ... existing checks
  }

  return '/public/schemas/tei-all.rng'
}
```

#### Step 3: Test Schema Parsing

Create test in `/home/bor/Projects/tei-xml/tests/validation/RelaxNGParser.test.ts`:

```typescript
describe('RelaxNGParser - Drama Schema', () => {
  it('should parse drama-specific tags', () => {
    const schemaXML = fs.readFileSync('/public/schemas/tei-drama.rng', 'utf-8')
    const parser = new RelaxNGParser()
    const constraints = parser.parse(schemaXML)

    expect(constraints.tags['sp']).toBeDefined()
    expect(constraints.tags['stage']).toBeDefined()
  })
})
```

---

## Migration Guide

### 5.1 From Hardcoded Constraints

The old system used hardcoded constraints in TypeScript:

#### Old Approach

```typescript
// Old: Hardcoded in SmartSelection.ts
export const TEI_P5_CONSTRAINTS: Record<string, SchemaConstraint> = {
  said: {
    requiredAttributes: ['who'],
    optionalAttributes: ['ana', 'corresp', 'rend'],
    // ...
  },
  persName: {
    requiredAttributes: [],
    optionalAttributes: ['ref', 'role', 'key'],
    // ...
  },
  // Only 3 tags supported!
}
```

**Problems**:
- Manual updates required when schema changes
- Limited to 3 tags
- Schema drift between code and actual TEI P5

#### New Approach

```typescript
// New: Parsed from RelaxNG schema
import { Validator, SchemaCache } from '@/lib/validation'

const cache = new SchemaCache({ maxSize: 10 })
const validator = new Validator(cache)

// All tags in schema are automatically supported!
const result = validator.validate(passage, range, 'said', attrs, document)
```

**Benefits**:
- Automatic from schema files
- All tags in schema are supported
- Always in sync with TEI P5

#### Migration Steps

1. **Update imports**:
   ```typescript
   // Old
   import { validateAgainstSchema } from '@/lib/selection/SmartSelection'

   // New
   import { Validator, SchemaCache } from '@/lib/validation'
   ```

2. **Create validator instance**:
   ```typescript
   const cache = new SchemaCache({ maxSize: 10 })
   const validator = new Validator(cache)
   ```

3. **Replace validation calls**:
   ```typescript
   // Old
   const result = validateAgainstSchema(passage, range, tag, attrs, document)

   // New
   const result = validator.validate(passage, range, tag, attrs, document)
   ```

4. **Update result handling**:
   ```typescript
   // Old result format
   {
     valid: boolean,
     reason?: string,
     missingAttributes?: string[],
     invalidAttributes?: Record<string, string>
   }

   // New result format (backward compatible)
   {
     valid: boolean,
     errors: ValidationError[],
     warnings: ValidationWarning[],
     fixes: Fix[]  // NEW: Actionable fixes
   }
   ```

### 5.2 Character-Only IDREFs

The old system only validated IDREFs against characters:

#### Old Approach

```typescript
// Old: Only checked characters
const character = document.state.characters.find(c => c.id === refId)
if (!character) {
  return { valid: false, reason: 'Character not found' }
}
```

**Problems**:
- `<placeName ref="#london">` failed validation
- `<orgName ref="#company">` failed validation
- Only worked for character references

#### New Approach

```typescript
// New: Validates against all entity types
import { detectEntityTypeFromAttribute, getEntities } from '@/lib/validation'

const entityType = detectEntityTypeFromAttribute('placeName', 'ref') // 'place'
const places = getEntities(document, entityType)
const place = places.find(p => p.id === refId)

if (!place) {
  return {
    valid: false,
    errors: [{
      type: 'invalid-idref',
      message: 'Referenced place "#london" not found'
    }],
    fixes: [/* ... */]
  }
}
```

**Benefits**:
- Supports all entity types
- Correct entity type detection
- Works for places, organizations, and future entity types

#### Code Changes Needed

1. **Update validation calls**:
   ```typescript
   // Old
   const isValid = validateIDREF(refId, document.state.characters)

   // New
   const entityType = detectEntityTypeFromAttribute(tagName, attrName)
   const entities = getEntities(document, entityType)
   const isValid = entities.some(e => e.id === refId)
   ```

2. **Update entity collections**:
   ```typescript
   // Make sure document has all entity collections
   document.state.characters // Required
   document.state.places     // Required
   document.state.organizations // Required
   ```

3. **Use new Validator**:
   ```typescript
   // The new Validator handles entity type detection automatically
   const result = validator.validate(passage, range, 'placeName', { ref: '#london' }, document)
   ```

---

## Testing Guide

### Testing Validation Logic

The validation system includes comprehensive test coverage:

```bash
# Run all validation tests
npm test -- tests/validation/

# Run specific test file
npm test -- tests/validation/Validator.test.ts

# Run with coverage
npm test -- --coverage --coverageReporters=text
```

### Test Utilities

#### Creating Mock Documents

```typescript
// tests/helpers/test-helpers.ts
import type { TEIDocument, Passage } from '@/lib/tei/types'

export function createMockDocument(overrides?: Partial<TEIDocument>): TEIDocument {
  return {
    state: {
      teiHeader: {
        profileDesc: {
          langUsage: [{ ident: 'tei-novel' }]
        }
      },
      parsed: {},
      passages: [],
      characters: [
        { id: 'char-1', name: 'John Doe' },
        { id: 'char-2', name: 'Jane Smith' }
      ],
      places: [
        { id: 'place-1', name: 'London' }
      ],
      organizations: [],
      revision: 0
    },
    events: [],
    ...overrides
  }
}

export function createMockPassage(overrides?: Partial<Passage>): Passage {
  return {
    id: 'passage-0',
    content: 'John said hello to Jane.',
    tags: [],
    ...overrides
  }
}
```

#### Writing Validation Tests

```typescript
// tests/validation/Validator.test.ts
import { Validator, SchemaCache } from '@/lib/validation'
import { createMockDocument, createMockPassage } from '../helpers/test-helpers'

describe('Validator - Required Attributes', () => {
  it('should fail when required attribute is missing', () => {
    const document = createMockDocument()
    const passage = createMockPassage()
    const cache = new SchemaCache({ maxSize: 10 })
    const validator = new Validator(cache)

    const result = validator.validate(
      passage,
      { start: 0, end: 10 },
      'said',
      {}, // No @who
      document
    )

    expect(result.valid).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].type).toBe('missing-required-attribute')
    expect(result.errors[0].attribute).toBe('who')
  })

  it('should pass when all required attributes are present', () => {
    const document = createMockDocument()
    const passage = createMockPassage()
    const cache = new SchemaCache({ maxSize: 10 })
    const validator = new Validator(cache)

    const result = validator.validate(
      passage,
      { start: 0, end: 10 },
      'said',
      { who: '#char-1' },
      document
    )

    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })
})
```

### Example Test Cases

#### Test 1: IDREF Validation

```typescript
describe('Validator - IDREF Validation', () => {
  it('should validate character IDREFs', () => {
    const document = createMockDocument({
      state: {
        characters: [{ id: 'john', name: 'John' }]
      }
    })

    const result = validator.validate(
      passage,
      { start: 0, end: 10 },
      'said',
      { who: '#john' },
      document
    )

    expect(result.valid).toBe(true)
  })

  it('should reject invalid character IDREFs', () => {
    const document = createMockDocument({
      state: {
        characters: [{ id: 'john', name: 'John' }]
      }
    })

    const result = validator.validate(
      passage,
      { start: 0, end: 10 },
      'said',
      { who: '#unknown' },
      document
    )

    expect(result.valid).toBe(false)
    expect(result.errors[0].type).toBe('invalid-idref')
  })

  it('should validate place IDREFs', () => {
    const document = createMockDocument({
      state: {
        places: [{ id: 'london', name: 'London' }]
      }
    })

    const result = validator.validate(
      passage,
      { start: 0, end: 10 },
      'placeName',
      { ref: '#london' },
      document
    )

    expect(result.valid).toBe(true)
  })
})
```

#### Test 2: Fix Generation

```typescript
describe('Validator - Fix Generation', () => {
  it('should generate fixes for missing required attributes', () => {
    const document = createMockDocument({
      state: {
        characters: [
          { id: 'char-1', name: 'John' },
          { id: 'char-2', name: 'Jane' }
        ]
      }
    })

    const result = validator.validate(
      passage,
      { start: 0, end: 10 },
      'said',
      {},
      document
    )

    expect(result.fixes).toHaveLength(2)
    expect(result.fixes[0].type).toBe('add-attribute')
    expect(result.fixes[0].attribute).toBe('who')
    expect(result.fixes[0].suggestedValues).toEqual(['#char-1', '#char-2'])
  })

  it('should generate fixes for invalid IDREFs', () => {
    const document = createMockDocument({
      state: {
        characters: [{ id: 'char-1', name: 'John' }]
      }
    })

    const result = validator.validate(
      passage,
      { start: 0, end: 10 },
      'said',
      { who: '#unknown' },
      document
    )

    expect(result.fixes).toHaveLength(1)
    expect(result.fixes[0].type).toBe('change-attribute')
    expect(result.fixes[0].suggestedValues).toEqual(['#char-1'])
  })
})
```

#### Test 3: Schema Cache

```typescript
describe('SchemaCache', () => {
  it('should cache parsed schemas', () => {
    const cache = new SchemaCache({ maxSize: 10 })

    const result1 = cache.get('/public/schemas/tei-novel.rng')
    const result2 = cache.get('/public/schemas/tei-novel.rng')

    // Should return same cached object
    expect(result1).toBe(result2)
  })

  it('should evict least-recently-used schemas when full', () => {
    const cache = new SchemaCache({ maxSize: 2 })

    cache.get('/schemas/schema1.rng')
    cache.get('/schemas/schema2.rng')
    cache.get('/schemas/schema3.rng') // Evicts schema1

    // schema1 should be re-parsed (not cached)
    const stats = cache.getStats()
    expect(stats.size).toBe(2)
  })
})
```

---

## API Reference

### Classes

#### Validator

**Location**: `/home/bor/Projects/tei-xml/lib/validation/Validator.ts`

Main validation engine.

```typescript
class Validator {
  constructor(schemaCache: SchemaCache)

  validate(
    passage: Passage,
    range: TextRange,
    tagName: string,
    attributes: Record<string, string>,
    document: TEIDocument
  ): ValidationResult
}
```

**Methods**:
- `validate()` - Validate a tag application against schema constraints

**Returns**: `ValidationResult`

#### SchemaCache

**Location**: `/home/bor/Projects/tei-xml/lib/validation/SchemaCache.ts`

LRU cache for parsed schemas.

```typescript
class SchemaCache {
  constructor(options: SchemaCacheOptions)

  get(schemaPath: string): ParsedConstraints
  clear(): void
  getStats(): { size: number; count: number }
}
```

**Options**:
```typescript
interface SchemaCacheOptions {
  maxSize: number      // Maximum number of schemas to cache
  ttl?: number         // Time-to-live in milliseconds (optional)
}
```

#### RelaxNGParser

**Location**: `/home/bor/Projects/tei-xml/lib/validation/RelaxNGParser.ts`

Parses RelaxNG XML schemas.

```typescript
class RelaxNGParser {
  constructor()

  parse(schemaXML: string): ParsedConstraints
}
```

**Returns**: `ParsedConstraints`

#### TagQueue

**Location**: `/home/bor/Projects/tei-xml/lib/queue/TagQueue.ts`

Manages queue of tags waiting to be applied.

```typescript
class TagQueue {
  add(tag: Omit<QueuedTag, 'id' | 'timestamp'>): string
  remove(id: string): boolean
  clear(): void
  markApplied(id: string): void
  markFailed(id: string, error: string): void
  getState(): TagQueueState
  isEmpty(): boolean
  get size: number
  getPending(): QueuedTag[]
}
```

### Functions

#### detectSchemaPath

**Location**: `/home/bor/Projects/tei-xml/lib/validation/schemaDetection.ts`

Detects which schema to use based on TEI header.

```typescript
function detectSchemaPath(document: TEIDocument): string
```

**Returns**: Schema file path (e.g., `/public/schemas/tei-novel.rng`)

#### detectEntityTypeFromAttribute

**Location**: `/home/bor/Projects/tei-xml/lib/validation/EntityDetector.ts`

Detects which entity type an IDREF references.

```typescript
function detectEntityTypeFromAttribute(
  tagName: string,
  attrName: string
): EntityType
```

**Returns**: Entity type (`'character' | 'place' | 'organization'`)

#### getEntities

**Location**: `/home/bor/Projects/tei-xml/lib/validation/EntityDetector.ts`

Gets entities of a specific type from document.

```typescript
function getEntities(
  document: TEIDocument,
  entityType: EntityType
): any[]
```

**Returns**: Array of entities (Character[], Place[], Organization[])

### Types

#### ValidationResult

```typescript
interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  fixes: Fix[]
}
```

#### ValidationError

```typescript
interface ValidationError {
  type: string              // Error type ('missing-required-attribute', 'invalid-idref', etc.)
  attribute?: string        // Attribute name (if applicable)
  value?: string            // Invalid value (if applicable)
  message: string           // Human-readable error message
}
```

#### Fix

```typescript
interface Fix {
  type: 'add-attribute' | 'change-attribute' | 'create-entity' | 'expand-selection'
  attribute?: string        // Attribute name to add/change
  value?: string            // New attribute value
  entityType?: EntityType   // Entity type for entity creation
  entityId?: string         // Entity ID for entity creation
  suggestedValues?: string[] // Suggested values for this fix
  expandedRange?: TextRange // Expanded selection range
  label: string             // Human-readable fix label
}
```

#### QueuedTag

```typescript
interface QueuedTag {
  readonly id: string                    // Unique ID
  readonly tagType: string               // Tag name
  readonly attributes: Record<string, string> // Attributes
  readonly passageId: string             // Passage ID
  readonly range: TextRange              // Selection range
  readonly timestamp: number             // When queued
}
```

#### TagQueueState

```typescript
interface TagQueueState {
  readonly pending: QueuedTag[]          // Tags waiting to be applied
  readonly applied: QueuedTag[]          // Tags successfully applied
  readonly failed: QueuedTag[]           // Tags that failed to apply
}
```

---

## Feature Flags

The validation system includes feature flags to allow safe rollout and easy rollback if issues arise in production.

### ENABLE_SCHEMA_DRIVEN_VALIDATION

**Location**: `/home/bor/Projects/tei-xml/lib/validation/index.ts`

**Purpose**: Controls whether the new schema-driven validation system is enabled.

**Default**: `true` (enabled)

**How to Use**:

#### 1. Environment Variable (Recommended for Production)

Set the environment variable before building:

```bash
# Enable schema-driven validation (default)
NEXT_PUBLIC_ENABLE_SCHEMA_DRIVEN_VALIDATION=true

# Disable schema-driven validation (fallback to legacy)
NEXT_PUBLIC_ENABLE_SCHEMA_DRIVEN_VALIDATION=false
```

#### 2. Hardcoded Constant (For Development)

Edit the flag directly in `/home/bor/Projects/tei-xml/lib/validation/index.ts`:

```typescript
export const ENABLE_SCHEMA_DRIVEN_VALIDATION = true;  // Enable
export const ENABLE_SCHEMA_DRIVEN_VALIDATION = false; // Disable
```

#### 3. Runtime Behavior

**When enabled (`true`)**:
- Uses the new `Validator` class with RelaxNG-parsed constraints
- Validates against all tags in the schema
- Provides actionable fixes for validation errors
- Supports all entity types (characters, places, organizations)

**When disabled (`false`)**:
- Falls back to legacy `validateAgainstSchemaLegacy` function
- Uses hardcoded `TEI_P5_CONSTRAINTS` (limited to 3 tags)
- Basic validation without fix suggestions
- Only validates character IDREFs

### When to Disable the Flag

Consider disabling the schema-driven validation if:

1. **Performance Issues**: Schema parsing is causing slowdowns on large documents
2. **Schema Errors**: RelaxNG schema files have parsing errors
3. **Rollback Needed**: Critical bugs are found in the new validation system
4. **Testing**: Need to compare old vs new validation behavior

### How to Check Current Flag Value

```typescript
import { ENABLE_SCHEMA_DRIVEN_VALIDATION } from '@/lib/validation'

if (ENABLE_SCHEMA_DRIVEN_VALIDATION) {
  console.log('Using schema-driven validation')
} else {
  console.log('Using legacy validation')
}
```

### Testing Both Code Paths

The test suite includes tests for both validation paths:

```bash
# Run all validation tests
npm test -- tests/unit/schema-aware-smart-selection.test.ts

# Tests verify both flag states
npm test -- --testNamePattern="Feature Flag"
```

Example test:

```typescript
describe('Feature Flag Tests', () => {
  it('should use schema-driven validation when flag is true', () => {
    const result = validateAgainstSchema(...)
    expect(result.valid).toBe(true)
  })

  it('should fall back to legacy when flag is false', () => {
    // Legacy validation path
    const result = validateAgainstSchema(...)
    expect(result).toBeDefined()
  })
})
```

### Monitoring Flag Status in Production

Add logging to track which validation path is being used:

```typescript
export function validateAgainstSchema(...) {
  if (!ENABLE_SCHEMA_DRIVEN_VALIDATION) {
    console.warn('[Validation] Using legacy validation (flag disabled)')
    return validateAgainstSchemaLegacy(...)
  }

  console.log('[Validation] Using schema-driven validation (flag enabled)')
  // ... new validation logic
}
```

### Feature Flag Best Practices

1. **Default to Enabled**: The flag should default to `true` unless there's a known issue
2. **Test Both Paths**: Ensure both validation modes have test coverage
3. **Monitor Performance**: Track validation time with and without the flag
4. **Document Changes**: Update documentation when changing the default value
5. **Rollback Plan**: Have a plan to quickly disable the flag if critical issues arise

### Impact on Other Components

The feature flag affects:

- `validateAgainstSchema()` in SmartSelection.ts
- `schemaAwareSmartSelection()` in SmartSelection.ts
- Any code that depends on validation results
- Error messages and fix suggestions

Components that are **NOT** affected:

- Tag queue management
- Toast notifications
- Entity panel
- Navigation outline
- Visualization components

---

## Troubleshooting

### Common Issues

#### Issue 1: Feature Flag Not Working

**Symptom**: Changing `ENABLE_SCHEMA_DRIVEN_VALIDATION` has no effect

**Cause**: Module loaded before environment variable was set

**Solution**:

1. Set environment variable **before** starting the dev server:
   ```bash
   export NEXT_PUBLIC_ENABLE_SCHEMA_DRIVEN_VALIDATION=false
   npm run dev
   ```

2. Or modify the flag directly in code:
   ```typescript
   // In lib/validation/index.ts
   export const ENABLE_SCHEMA_DRIVEN_VALIDATION = false
   ```

3. Clear build cache:
   ```bash
   rm -rf .next
   npm run dev
   ```

4. Verify flag value at runtime:
   ```typescript
   console.log('Flag value:', ENABLE_SCHEMA_DRIVEN_VALIDATION)
   ```

#### Issue 2: Schema Parsing Fails

**Symptom**: Validation always returns `{ valid: true }` even for invalid tags

**Cause**: Schema file not found or invalid RelaxNG syntax

**Solution**:

1. Check schema file exists:
   ```bash
   ls -la /public/schemas/tei-novel.rng
   ```

2. Validate schema syntax:
   ```bash
   xmllint --relaxng /public/schemas/tei-novel.rng /path/to/test.xml
   ```

3. Check console for parse errors:
   ```typescript
   try {
     const constraints = parser.parse(schemaXML)
   } catch (error) {
     console.error('Schema parse error:', error)
   }
   ```

4. Verify schema detection:
   ```typescript
   const schemaPath = detectSchemaPath(document)
   console.log('Using schema:', schemaPath)
   ```

#### Issue 2: Entity Not Found Errors

**Symptom**: Valid entity references fail validation

**Cause**: Entity collection missing from document state

**Solution**:

1. Check document state has entity collections:
   ```typescript
   console.log('Characters:', document.state.characters?.length || 0)
   console.log('Places:', document.state.places?.length || 0)
   console.log('Organizations:', document.state.organizations?.length || 0)
   ```

2. Verify entity IDs match:
   ```typescript
   const character = document.state.characters.find(c => c.id === 'char-1')
   console.log('Found character:', character)
   ```

3. Check IDREF format (should have `#` prefix):
   ```typescript
   // Correct
   { who: '#char-1' }

   // Incorrect
   { who: 'char-1' }
   ```

#### Issue 3: Fixes Not Showing in UI

**Symptom**: Validation fails but no fix buttons appear

**Cause**: Fix execution not integrated into UI

**Solution**:

1. Check fixes are generated:
   ```typescript
   const result = validator.validate(...)
   console.log('Fixes:', result.fixes)
   ```

2. Verify fix execution:
   ```typescript
   const executeFix = async (fix: Fix, ...) => {
     console.log('Executing fix:', fix.type)
     // ... fix execution logic
   }
   ```

3. Check toast notifications:
   ```typescript
   showToast('Fix applied successfully', 'success')
   ```

#### Issue 4: Queue Not Applying Tags

**Symptom**: Tags remain in queue after clicking "Apply All"

**Cause**: Queue application logic not implemented or error during application

**Solution**:

1. Check queue state:
   ```typescript
   const state = queue.getState()
   console.log('Pending:', state.pending.length)
   console.log('Applied:', state.applied.length)
   console.log('Failed:', state.failed.length)
   ```

2. Verify tag application:
   ```typescript
   for (const tag of queue.getPending()) {
     try {
       await addTag(tag.passageId, tag.range, tag.tagType, tag.attributes)
       queue.markApplied(tag.id)
     } catch (error) {
       console.error('Failed to apply tag:', tag.id, error)
       queue.markFailed(tag.id, error.message)
     }
   }
   ```

3. Check for validation errors during application:
   ```typescript
   const result = validator.validate(...)
   if (!result.valid) {
     console.error('Validation failed:', result.errors)
   }
   ```

#### Issue 5: Performance on Large Documents

**Symptom**: Validation is slow on documents with many tags

**Cause**: Schema parsing on every validation, large queue, or inefficient validation

**Solution**:

1. Increase schema cache size:
   ```typescript
   const cache = new SchemaCache({ maxSize: 100 }) // Default is 10
   ```

2. Check cache statistics:
   ```typescript
   const stats = cache.getStats()
   console.log('Cache size:', stats.size)
   console.log('Cache count:', stats.count)
   ```

3. Optimize queue application (batch processing):
   ```typescript
   // Apply tags in batches
   const BATCH_SIZE = 10
   for (let i = 0; i < queue.size; i += BATCH_SIZE) {
     const batch = queue.getPending().slice(i, i + BATCH_SIZE)
     await Promise.all(batch.map(tag => applyTag(tag)))
   }
   ```

4. Profile validation performance:
   ```typescript
   const start = performance.now()
   const result = validator.validate(...)
   const duration = performance.now() - start
   console.log(`Validation took ${duration}ms`)
   ```

### Debugging Tips

#### Enable Debug Logging

```typescript
// In Validator.ts
export class Validator {
  private debug: boolean

  constructor(schemaCache: SchemaCache, debug: boolean = false) {
    this.schemaCache = schemaCache
    this.debug = debug
  }

  validate(...) {
    if (this.debug) {
      console.log('[Validator] Validating tag:', tagName)
      console.log('[Validator] Attributes:', attributes)
    }

    const result = /* ... validation logic ... */

    if (this.debug) {
      console.log('[Validator] Result:', result)
    }

    return result
  }
}

// Usage
const validator = new Validator(cache, true) // Enable debug logging
```

#### Inspect Parsed Constraints

```typescript
import { RelaxNGParser } from '@/lib/validation'

const parser = new RelaxNGParser()
const constraints = parser.parse(schemaXML)

// Inspect all tags
console.log('Supported tags:', Object.keys(constraints.tags))

// Inspect specific tag
console.log('Tag constraints:', constraints.tags['said'])
console.log('Attribute constraints:', constraints.attributes['said.who'])
```

#### Trace Validation Flow

```typescript
// Add console.log at each validation step
export class Validator {
  validate(...) {
    console.log('1. Starting validation')

    const schemaPath = detectSchemaPath(document)
    console.log('2. Schema path:', schemaPath)

    const constraints = this.schemaCache.get(schemaPath)
    console.log('3. Constraints loaded:', Object.keys(constraints.tags).length, 'tags')

    const tagConstraint = constraints.tags[tagName]
    console.log('4. Tag constraint:', tagConstraint)

    // ... rest of validation
  }
}
```

### Performance Tuning

#### Schema Cache Optimization

```typescript
// For documents with multiple schemas
const cache = new SchemaCache({
  maxSize: 50,        // Increase cache size
  ttl: 3600000        // Cache for 1 hour
})

// Pre-load frequently used schemas
const commonSchemas = [
  '/public/schemas/tei-novel.rng',
  '/public/schemas/tei-drama.rng',
  '/public/schemas/tei-all.rng'
]

for (const schema of commonSchemas) {
  cache.get(schema) // Pre-load
}
```

#### Queue Batch Processing

```typescript
// Apply queue in batches to avoid blocking UI
const applyQueueBatch = async (batchSize = 5) => {
  const pending = queue.getPending()

  for (let i = 0; i < pending.length; i += batchSize) {
    const batch = pending.slice(i, i + batchSize)

    // Apply batch
    await Promise.all(batch.map(async (tag) => {
      await addTag(tag.passageId, tag.range, tag.tagType, tag.attributes)
      queue.markApplied(tag.id)
    }))

    // Yield to UI thread
    await new Promise(resolve => setTimeout(resolve, 0))
  }

  showToast(`Applied ${pending.length} tags`, 'success')
}
```

---

## Summary

The validation system provides a comprehensive, schema-driven approach to TEI XML validation with:

- **Automatic constraint extraction** from RelaxNG schemas
- **Multi-entity IDREF validation** for characters, places, and organizations
- **Actionable fix suggestions** for common validation errors
- **Queue-based workflow** for batch tag application
- **Performance optimization** through LRU caching

For more information, see:
- [Validation gaps and extensions](/home/bor/Projects/tei-xml/docs/validation-gaps-and-extensions.md)
- [Implementation plan](/home/bor/Projects/tei-xml/docs/plans/2025-02-05-schema-driven-validation-enhancements.md)
- [API documentation](/home/bor/Projects/tei-xml/lib/validation/index.ts)
