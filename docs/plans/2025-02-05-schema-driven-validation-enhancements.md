# Schema-Driven Validation Enhancements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a comprehensive schema-driven validation system with auto-fix UI and multi-tag workflow for TEI P5 XML editing.

**Architecture:** Four-layer system: (1) RelaxNG parser extracts constraints from schema files, (2) Validation engine checks selections against parsed constraints, (3) Auto-fix system generates actionable error resolutions, (4) Tag queue enables batch tag application without selection loss.

**Tech Stack:** TypeScript, fast-xml-parser (XML parsing), lru-cache (memoization), React (UI), Jest (testing)

---

## Phase 1: Schema Parser (Foundation)

### Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Add dependencies**

```bash
npm install --save fast-xml-parser lru-cache
npm install --save-dev @types/lru-cache
```

**Step 2: Verify installation**

Run: `npm list fast-xml-parser lru-cache`
Expected: Both packages listed with versions

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add fast-xml-parser and lru-cache for schema parsing"
```

---

### Task 2: Create Validation Types

**Files:**
- Create: `lib/validation/types.ts`

**Step 1: Write the type definitions**

```typescript
/**
 * Schema-driven validation types
 */

// RelaxNG parser output
export interface ParsedConstraints {
  tags: Record<string, TagConstraint>
  attributes: Record<string, AttributeConstraint>
  contentModels: Record<string, ContentModel>
}

// Tag constraint (from RelaxNG)
export interface TagConstraint {
  tagName: string
  requiredAttributes: string[]
  optionalAttributes: string[]
  allowedParents: string[]
}

// Attribute constraint
export interface AttributeConstraint {
  name: string
  type: AttributeType
  required: boolean
  allowedValues?: string[]
}

export type AttributeType = 'IDREF' | 'ID' | 'NCName' | 'string' | 'token' | 'enumerated'

// Content model (what tags can contain)
export interface ContentModel {
  textOnly: boolean          // Only text, no child tags
  mixedContent: boolean      // Text + specific child tags
  allowedChildren: string[]  // Tag names that can nest
}

// Entity types for IDREF validation
export type EntityType = 'character' | 'place' | 'organization'

// Validation result with fixes
export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  fixes: Fix[]
}

export interface ValidationError {
  type: string
  attribute?: string
  value?: string
  message: string
}

export interface ValidationWarning {
  type: string
  message: string
}

// Auto-fix (data, not function)
export interface Fix {
  type: 'add-attribute' | 'change-attribute' | 'create-entity' | 'expand-selection'
  attribute?: string
  value?: string
  entityType?: EntityType
  entityId?: string
  suggestedValues?: string[]
  expandedRange?: TextRange
  label: string
}

// Text range
export interface TextRange {
  start: number
  end: number
}
```

**Step 2: Run TypeScript check**

Run: `npx tsc --noEmit lib/validation/types.ts`
Expected: No type errors

**Step 3: Commit**

```bash
git add lib/validation/types.ts
git commit -m "feat: add validation type definitions"
```

---

### Task 3: Create RelaxNG Parser

**Files:**
- Create: `lib/validation/RelaxNGParser.ts`

**Step 1: Write failing test**

```typescript
// tests/validation/RelaxNGParser.test.ts
import { describe, it, expect } from '@jest/globals'
import { RelaxNGParser } from '@/lib/validation/RelaxNGParser'

describe('RelaxNGParser', () => {
  it('should parse tag definitions from schema', () => {
    const schemaXML = `
      <grammar xmlns="http://relaxng.org/ns/structure/1.0">
        <define name="model.persName">
          <element name="persName">
            <attribute name="ref">
              <data type="IDREF"/>
            </attribute>
            <optional>
              <attribute name="role">
                <data type="string"/>
              </attribute>
            </optional>
          </element>
        </define>
      </grammar>
    `

    const parser = new RelaxNGParser()
    const constraints = parser.parse(schemaXML)

    expect(constraints.tags['persName']).toBeDefined()
    expect(constraints.tags['persName'].requiredAttributes).toEqual(['ref'])
    expect(constraints.tags['persName'].optionalAttributes).toEqual(['role'])
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/validation/RelaxNGParser.test.ts`
Expected: FAIL with "RelaxNGParser is not defined"

**Step 3: Write minimal implementation**

```typescript
// lib/validation/RelaxNGParser.ts
import { XMLParser } from 'fast-xml-parser'
import type { ParsedConstraints, TagConstraint, AttributeConstraint, ContentModel } from './types'

export class RelaxNGParser {
  private parser: XMLParser

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '$',
      textNodeName: '_text',
    })
  }

  parse(schemaXML: string): ParsedConstraints {
    const xml = this.parser.parse(schemaXML)
    const grammar = xml.grammar

    return {
      tags: this.extractTags(grammar),
      attributes: this.extractAttributes(grammar),
      contentModels: this.extractContentModels(grammar),
    }
  }

  private extractTags(grammar: any): Record<string, TagConstraint> {
    const tags: Record<string, TagConstraint> = {}
    const defines = Array.isArray(grammar.define) ? grammar.define : [grammar.define]

    for (const def of defines) {
      if (!def) continue

      const element = def.element
      if (!element) continue

      const tagName = element.$name
      const requiredAttrs: string[] = []
      const optionalAttrs: string[] = []

      // Extract attributes from element
      this.extractElementAttributes(element, requiredAttrs, optionalAttrs)

      tags[tagName] = {
        tagName,
        requiredAttributes: requiredAttrs,
        optionalAttributes: optionalAttrs,
        allowedParents: [],
      }
    }

    return tags
  }

  private extractElementAttributes(
    element: any,
    requiredAttrs: string[],
    optionalAttrs: string[]
  ): void {
    // Direct attributes (required)
    if (element.attribute) {
      const attrs = Array.isArray(element.attribute) ? element.attribute : [element.attribute]
      for (const attr of attrs) {
        if (attr) {
          requiredAttrs.push(attr.$name)
        }
      }
    }

    // Optional attributes
    if (element.optional) {
      const optionals = Array.isArray(element.optional) ? element.optional : [element.optional]
      for (const opt of optionals) {
        if (opt?.attribute) {
          optionalAttrs.push(opt.attribute.$name)
        }
      }
    }
  }

  private extractAttributes(grammar: any): Record<string, AttributeConstraint> {
    const attributes: Record<string, AttributeConstraint> = {}
    const defines = Array.isArray(grammar.define) ? grammar.define : [grammar.define]

    for (const def of defines) {
      this.extractDefineAttributes(def, attributes)
    }

    return attributes
  }

  private extractDefineAttributes(def: any, attributes: Record<string, AttributeConstraint>): void {
    if (!def) return

    // Process element attributes
    if (def.element) {
      this.extractElementAttributesToConstraints(def.element, attributes)
    }

    // Process optional attributes
    if (def.optional?.element) {
      this.extractElementAttributesToConstraints(def.optional.element, attributes)
    }
  }

  private extractElementAttributesToConstraints(
    element: any,
    constraints: Record<string, AttributeConstraint>
  ): void {
    if (!element) return

    // Required attributes
    if (element.attribute) {
      const attrs = Array.isArray(element.attribute) ? element.attribute : [element.attribute]
      for (const attr of attrs) {
        if (attr) {
          constraints[attr.$name] = {
            name: attr.$name,
            type: this.mapDataType(attr.data?.$type),
            required: true,
            allowedValues: this.extractEnumeratedValues(attr),
          }
        }
      }
    }

    // Optional attributes
    if (element.optional) {
      const optionals = Array.isArray(element.optional) ? element.optional : [element.optional]
      for (const opt of optionals) {
        if (opt?.attribute) {
          constraints[opt.attribute.$name] = {
            name: opt.attribute.$name,
            type: this.mapDataType(opt.attribute.data?.$type),
            required: false,
            allowedValues: this.extractEnumeratedValues(opt.attribute),
          }
        }
      }
    }
  }

  private mapDataType(rngType: string): string {
    const typeMap: Record<string, string> = {
      'IDREF': 'IDREF',
      'ID': 'ID',
      'NCName': 'NCName',
      'string': 'string',
      'token': 'token',
    }
    return typeMap[rngType] || 'string'
  }

  private extractEnumeratedValues(attributeNode: any): string[] | undefined {
    // Check for enumerated values in <choice> pattern
    if (attributeNode.choice?.value) {
      const values = Array.isArray(attributeNode.choice.value)
        ? attributeNode.choice.value
        : [attributeNode.choice.value]
      return values.map((v: any) => v._text || v)
    }
    return undefined
  }

  private extractContentModels(grammar: any): Record<string, ContentModel> {
    const models: Record<string, ContentModel> = {}
    const defines = Array.isArray(grammar.define) ? grammar.define : [grammar.define]

    for (const def of defines) {
      if (!def) continue

      const modelName = def.$name
      const element = def.element

      if (element) {
        models[modelName] = this.parseContentModel(element)
      }
    }

    return models
  }

  private parseContentModel(node: any): ContentModel {
    const hasText = this.hasTextContent(node)
    const allowedChildren = this.extractAllowedChildren(node)

    return {
      textOnly: !hasText && allowedChildren.length === 0,
      mixedContent: hasText && allowedChildren.length > 0,
      allowedChildren,
    }
  }

  private hasTextContent(node: any): boolean {
    if (node.text || node._text) return true
    if (node.choice?.text) return true
    if (node.interleave?.text) return true
    return false
  }

  private extractAllowedChildren(node: any): string[] {
    const children: string[] = []

    // Direct <ref> elements
    if (node.ref) {
      const refs = Array.isArray(node.ref) ? node.ref : [node.ref]
      for (const ref of refs) {
        if (ref?.$name) {
          children.push(ref.$name.replace('model.', ''))
        }
      }
    }

    // <choice> containing <ref>
    if (node.choice?.ref) {
      const refs = Array.isArray(node.choice.ref) ? node.choice.ref : [node.choice.ref]
      for (const ref of refs) {
        if (ref?.$name) {
          children.push(ref.$name.replace('model.', ''))
        }
      }
    }

    // <interleave> containing <ref>
    if (node.interleave?.ref) {
      const refs = Array.isArray(node.interleave.ref) ? node.interleave.ref : [node.interleave.ref]
      for (const ref of refs) {
        if (ref?.$name) {
          children.push(ref.$name.replace('model.', ''))
        }
      }
    }

    // <zeroOrMore> containing <choice> or <ref>
    if (node.zeroOrMore) {
      children.push(...this.extractAllowedChildren(node.zeroOrMore))
    }

    // <oneOrMore> containing <choice> or <ref>
    if (node.oneOrMore) {
      children.push(...this.extractAllowedChildren(node.oneOrMore))
    }

    return [...new Set(children)]  // Deduplicate
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/validation/RelaxNGParser.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/validation/RelaxNGParser.ts tests/validation/RelaxNGParser.test.ts
git commit -m "feat: implement RelaxNG schema parser"
```

---

### Task 4: Create Schema Cache

**Files:**
- Create: `lib/validation/SchemaCache.ts`

**Step 1: Write failing test**

```typescript
// tests/validation/SchemaCache.test.ts
import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { SchemaCache } from '@/lib/validation/SchemaCache'
import * as fs from 'fs'

// Mock fs
jest.mock('fs')

describe('SchemaCache', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should parse and cache schema file', () => {
    const mockSchema = '<grammar xmlns="http://relaxng.org/ns/structure/1.0"></grammar>'
    ;(fs.readFileSync as jest.Mock).mockReturnValue(mockSchema)

    const cache = new SchemaCache({ maxSize: 10 })

    const result1 = cache.get('/test/schema.rng')
    const result2 = cache.get('/test/schema.rng')

    expect(fs.readFileSync).toHaveBeenCalledTimes(1)  // Only read once
    expect(result1).toBeDefined()
    expect(result1).toBe(result2)  // Same cached object
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/validation/SchemaCache.test.ts`
Expected: FAIL with "SchemaCache is not defined"

**Step 3: Write minimal implementation**

```typescript
// lib/validation/SchemaCache.ts
import LRU from 'lru-cache'
import { RelaxNGParser } from './RelaxNGParser'
import type { ParsedConstraints } from './types'
import * as fs from 'fs'

interface SchemaCacheOptions {
  maxSize: number
  ttl?: number  // Time to live in milliseconds
}

export class SchemaCache {
  private cache: LRU<string, ParsedConstraints>
  private parser: RelaxNGParser

  constructor(options: SchemaCacheOptions) {
    this.cache = new LRU({
      max: options.maxSize,
      ttl: options.ttl,
    })
    this.parser = new RelaxNGParser()
  }

  get(schemaPath: string): ParsedConstraints {
    // Check cache
    const cached = this.cache.get(schemaPath)
    if (cached) {
      return cached
    }

    // Parse and cache
    const schemaXML = fs.readFileSync(schemaPath, 'utf-8')
    const parsed = this.parser.parse(schemaXML)
    this.cache.set(schemaPath, parsed)

    return parsed
  }

  // Get cache statistics for debugging
  getStats() {
    return {
      size: this.cache.size,
      count: this.cache.calculatedSize,
    }
  }

  // Clear cache (useful for testing)
  clear(): void {
    this.cache.clear()
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/validation/SchemaCache.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/validation/SchemaCache.ts tests/validation/SchemaCache.test.ts
git commit -m "feat: implement LRU cache for parsed schemas"
```

---

### Task 5: Create Schema Detection Utility

**Files:**
- Create: `lib/validation/schemaDetection.ts`

**Step 1: Write failing test**

```typescript
// tests/validation/schemaDetection.test.ts
import { describe, it, expect } from '@jest/globals'
import { detectSchemaPath } from '@/lib/validation/schemaDetection'
import type { TEIDocument } from '@/lib/tei/types'

describe('Schema Detection', () => {
  it('should detect tei-novel schema from profile', () => {
    const document: TEIDocument = {
      state: {
        teiHeader: {
          profileDesc: {
            langUsage: [
              { ident: 'tei-novel' }
            ]
          }
        },
        parsed: {},
        passages: [],
        characters: [],
        revision: 0,
      },
      events: []
    }

    const path = detectSchemaPath(document)
    expect(path).toBe('/public/schemas/tei-novel.rng')
  })

  it('should default to tei-all when no profile specified', () => {
    const document: TEIDocument = {
      state: {
        parsed: {},
        passages: [],
        characters: [],
        revision: 0,
      },
      events: []
    }

    const path = detectSchemaPath(document)
    expect(path).toBe('/public/schemas/tei-all.rng')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/validation/schemaDetection.test.ts`
Expected: FAIL with "detectSchemaPath is not defined"

**Step 3: Write minimal implementation**

```typescript
// lib/validation/schemaDetection.ts
import type { TEIDocument } from '@/lib/tei/types'

export function detectSchemaPath(document: TEIDocument): string {
  const profiles = document.state.teiHeader?.profileDesc?.langUsage || []

  // Check for specific profiles
  for (const lang of profiles) {
    if (lang.ident === 'tei-novel') {
      return '/public/schemas/tei-novel.rng'
    }
    if (lang.ident === 'tei-minimal') {
      return '/public/schemas/tei-minimal.rng'
    }
  }

  // Default to full TEI schema
  return '/public/schemas/tei-all.rng'
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/validation/schemaDetection.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/validation/schemaDetection.ts tests/validation/schemaDetection.test.ts
git commit -m "feat: add schema path detection utility"
```

---

## Phase 2: Enhanced Validation Engine

### Task 6: Create Entity Type Detector

**Files:**
- Create: `lib/validation/EntityDetector.ts`

**Step 1: Write failing test**

```typescript
// tests/validation/EntityDetector.test.ts
import { describe, it, expect } from '@jest/globals'
import { detectEntityTypeFromAttribute, getEntities } from '@/lib/validation/EntityDetector'
import type { TEIDocument } from '@/lib/tei/types'

describe('EntityDetector', () => {
  it('should detect character from @who attribute', () => {
    const entityType = detectEntityTypeFromAttribute('said', 'who')
    expect(entityType).toBe('character')
  })

  it('should detect character from @ref on persName', () => {
    const entityType = detectEntityTypeFromAttribute('persName', 'ref')
    expect(entityType).toBe('character')
  })

  it('should detect place from @ref on placeName', () => {
    const entityType = detectEntityTypeFromAttribute('placeName', 'ref')
    expect(entityType).toBe('place')
  })

  it('should get character entities from document', () => {
    const document: TEIDocument = {
      state: {
        characters: [
          { id: 'char-1', name: 'John' },
          { id: 'char-2', name: 'Jane' },
        ],
        parsed: {},
        passages: [],
        revision: 0,
      },
      events: []
    }

    const entities = getEntities(document, 'character')
    expect(entities).toHaveLength(2)
    expect(entities[0].id).toBe('char-1')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/validation/EntityDetector.test.ts`
Expected: FAIL with "EntityDetector is not defined"

**Step 3: Write minimal implementation**

```typescript
// lib/validation/EntityDetector.ts
import type { TEIDocument } from '@/lib/tei/types'
import type { EntityType } from './types'

// Entity type mapping configuration
interface EntityMapping {
  tagName?: string
  attrName: string
  entityType: EntityType
}

const ENTITY_MAPPINGS: EntityMapping[] = [
  { attrName: 'who', entityType: 'character' },
  { tagName: 'persName', attrName: 'ref', entityType: 'character' },
  { tagName: 'speaker', attrName: 'ref', entityType: 'character' },
  { tagName: 'placeName', attrName: 'ref', entityType: 'place' },
  { tagName: 'orgName', attrName: 'ref', entityType: 'organization' },
]

export function detectEntityTypeFromAttribute(
  tagName: string,
  attrName: string
): EntityType {
  // Find matching mapping
  const mapping = ENTITY_MAPPINGS.find(m =>
    (!m.tagName || m.tagName === tagName) && m.attrName === attrName
  )

  return mapping?.entityType || 'character'  // Default to character
}

export function getEntities(document: TEIDocument, entityType: EntityType): any[] {
  switch (entityType) {
    case 'character':
      return document.state.characters || []
    case 'place':
      return document.state.places || []
    case 'organization':
      return document.state.organizations || []
    default:
      return []
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/validation/EntityDetector.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/validation/EntityDetector.ts tests/validation/EntityDetector.test.ts
git commit -m "feat: implement entity type detection for IDREF validation"
```

---

### Task 7: Create Enhanced Validator

**Files:**
- Create: `lib/validation/Validator.ts`

**Step 1: Write failing test**

```typescript
// tests/validation/Validator.test.ts
import { describe, it, expect } from '@jest/globals'
import { Validator } from '@/lib/validation/Validator'
import { SchemaCache } from '@/lib/validation/SchemaCache'
import type { TEIDocument, Passage } from '@/lib/tei/types'

describe('Validator', () => {
  it('should validate required attributes', () => {
    const passage: Passage = {
      id: 'passage-1',
      content: 'John said hello',
      tags: [],
    }

    const document: TEIDocument = {
      state: {
        characters: [{ id: 'char-1', name: 'John' }],
        parsed: {},
        passages: [passage],
        revision: 0,
      },
      events: []
    }

    const schemaCache = new SchemaCache({ maxSize: 10 })
    const validator = new Validator(schemaCache)

    const result = validator.validate(
      passage,
      { start: 0, end: 4 },
      'said',
      {},  // No attributes provided
      document
    )

    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.message.includes('required'))).toBe(true)
    expect(result.fixes.length).toBeGreaterThan(0)
  })

  it('should validate IDREF references', () => {
    const passage: Passage = {
      id: 'passage-1',
      content: 'John said hello',
      tags: [],
    }

    const document: TEIDocument = {
      state: {
        characters: [{ id: 'char-1', name: 'John' }],
        parsed: {},
        passages: [passage],
        revision: 0,
      },
      events: []
    }

    const schemaCache = new SchemaCache({ maxSize: 10 })
    const validator = new Validator(schemaCache)

    const result = validator.validate(
      passage,
      { start: 0, end: 4 },
      'said',
      { who: '#nonexistent' },  // Invalid reference
      document
    )

    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.message.includes('not found'))).toBe(true)
    expect(result.fixes.length).toBeGreaterThan(0)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/validation/Validator.test.ts`
Expected: FAIL with "Validator is not defined"

**Step 3: Write minimal implementation**

```typescript
// lib/validation/Validator.ts
import type { ParsedConstraints, ValidationResult, Fix, TextRange } from './types'
import type { Passage, TEIDocument } from '@/lib/tei/types'
import { SchemaCache } from './SchemaCache'
import { detectEntityTypeFromAttribute, getEntities } from './EntityDetector'
import { detectSchemaPath } from './schemaDetection'

export class Validator {
  private schemaCache: SchemaCache

  constructor(schemaCache: SchemaCache) {
    this.schemaCache = schemaCache
  }

  validate(
    passage: Passage,
    range: TextRange,
    tagType: string,
    providedAttrs: Record<string, string>,
    document: TEIDocument
  ): ValidationResult {
    // Get schema constraints
    const schemaPath = detectSchemaPath(document)
    const constraints = this.schemaCache.get(schemaPath)

    const errors: ValidationResult['errors'] = []
    const warnings: ValidationResult['warnings'] = []
    const fixes: Fix[] = []

    // Get tag constraint
    const tagConstraint = constraints.tags[tagType]
    if (!tagConstraint) {
      // Unknown tag - no constraints
      return { valid: true, errors: [], warnings: [], fixes: [] }
    }

    // Check 1: Required attributes
    const requiredResult = this.checkRequiredAttributes(
      tagConstraint,
      providedAttrs,
      document
    )
    errors.push(...requiredResult.errors)
    fixes.push(...requiredResult.fixes)

    // Check 2: Attribute types
    const typeResult = this.checkAttributeTypes(
      tagType,
      providedAttrs,
      constraints.attributes,
      document
    )
    errors.push(...typeResult.errors)
    warnings.push(...typeResult.warnings)
    fixes.push(...typeResult.fixes)

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      fixes,
    }
  }

  private checkRequiredAttributes(
    tagConstraint: any,
    providedAttrs: Record<string, string>,
    document: TEIDocument
  ): { errors: ValidationResult['errors'], fixes: Fix[] } {
    const errors: ValidationResult['errors'] = []
    const fixes: Fix[] = []

    for (const required of tagConstraint.requiredAttributes) {
      if (!(required in providedAttrs)) {
        errors.push({
          type: 'missing-attribute',
          attribute: required,
          message: `Tag <${tagConstraint.tagName}> requires attribute: @${required}`,
        })

        // Generate fixes
        const attrFixes = this.generateFixesForMissingAttribute(
          tagConstraint.tagName,
          required,
          document
        )
        fixes.push(...attrFixes)
      }
    }

    return { errors, fixes }
  }

  private generateFixesForMissingAttribute(
    tagName: string,
    attrName: string,
    document: TEIDocument
  ): Fix[] {
    const fixes: Fix[] = []

    // Detect entity type
    const entityType = detectEntityTypeFromAttribute(tagName, attrName)

    // Fix 1: Select from existing entities
    const entities = getEntities(document, entityType)
    for (const entity of entities.slice(0, 3)) {
      fixes.push({
        type: 'add-attribute',
        attribute: attrName,
        value: `#${entity.id}`,
        entityType,
        label: `Set @${attrName} to "${entity.name}"`,
      })
    }

    // Fix 2: Create new entity
    fixes.push({
      type: 'create-entity',
      entityType,
      label: `Create new ${entityType}`,
    })

    return fixes
  }

  private checkAttributeTypes(
    tagType: string,
    providedAttrs: Record<string, string>,
    attrConstraints: Record<string, any>,
    document: TEIDocument
  ): { errors: ValidationResult['errors'], warnings: ValidationResult['warnings'], fixes: Fix[] } {
    const errors: ValidationResult['errors'] = []
    const warnings: ValidationResult['warnings'] = []
    const fixes: Fix[] = []

    for (const [attrName, attrValue] of Object.entries(providedAttrs)) {
      const constraint = attrConstraints[attrName]
      if (!constraint) continue

      if (constraint.type === 'IDREF') {
        const idrefResult = this.validateIDREF(
          attrName,
          attrValue,
          tagType,
          document
        )
        errors.push(...idrefResult.errors)
        fixes.push(...idrefResult.fixes)
      }
    }

    return { errors, warnings, fixes }
  }

  private validateIDREF(
    attrName: string,
    attrValue: string,
    tagName: string,
    document: TEIDocument
  ): { errors: ValidationResult['errors'], fixes: Fix[] } {
    const errors: ValidationResult['errors'] = []
    const fixes: Fix[] = []

    // Strip # prefix
    const refId = attrValue.replace('#', '')

    // Detect entity type
    const entityType = detectEntityTypeFromAttribute(tagName, attrName)

    // Get entities
    const entities = getEntities(document, entityType)

    // Check if reference exists
    const exists = entities.some((e: any) => e.id === refId)

    if (!exists) {
      errors.push({
        type: 'invalid-idref',
        attribute: attrName,
        value: attrValue,
        message: `Referenced ${entityType} "${attrValue}" not found`,
      })

      // Fix 1: Create entity
      fixes.push({
        type: 'create-entity',
        entityType,
        entityId: refId,
        label: `Create ${entityType} "${refId}"`,
      })

      // Fix 2-4: Suggest existing entities
      for (const entity of entities.slice(0, 3)) {
        fixes.push({
          type: 'change-attribute',
          attribute: attrName,
          value: `#${entity.id}`,
          suggestedValues: entities.map((e: any) => `#${e.id}`),
          label: `Use "${entity.name}" instead`,
        })
      }
    }

    return { errors, fixes }
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/validation/Validator.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/validation/Validator.ts tests/validation/Validator.test.ts
git commit -m "feat: implement enhanced validator with IDREF checking"
```

---

### Task 8: Update SmartSelection to Use New Validator

**Files:**
- Modify: `lib/selection/SmartSelection.ts`

**Step 1: Update imports**

```typescript
// Add at top of lib/selection/SmartSelection.ts
import { Validator } from '@/lib/validation/Validator'
import { SchemaCache } from '@/lib/validation/SchemaCache'
```

**Step 2: Create singleton validator instance**

```typescript
// Add after TEI_P5_CONSTRAINTS definition
const schemaCache = new SchemaCache({ maxSize: 10 })
const validator = new Validator(schemaCache)
```

**Step 3: Update validateAgainstSchema to use new validator**

```typescript
// Replace existing validateAgainstSchema function
export function validateAgainstSchema(
  passage: Passage,
  range: TextRange,
  tagType: string,
  providedAttrs: Record<string, string> = {},
  document?: { state: { characters?: Character[] } }
): SchemaValidationResult {
  if (!document) {
    return { valid: true }
  }

  // Use new validator
  const result = validator.validate(
    passage,
    range,
    tagType,
    providedAttrs,
    document as TEIDocument
  )

  // Map to old format for backward compatibility
  return {
    valid: result.valid,
    reason: result.errors[0]?.message,
    missingAttributes: result.errors
      .filter(e => e.type === 'missing-attribute')
      .map(e => e.attribute!),
    invalidAttributes: result.errors
      .filter(e => e.type === 'invalid-idref')
      .reduce((acc, e) => {
        acc[e.attribute!] = e.message
        return acc
      }, {} as Record<string, string>),
    suggestions: result.fixes.map(f => f.label),
    fixes: result.fixes,  // New field
  }
}
```

**Step 4: Run tests**

Run: `npm test -- tests/unit/schema-aware-smart-selection.test.ts`
Expected: PASS (backward compatible)

**Step 5: Commit**

```bash
git add lib/selection/SmartSelection.ts
git commit -m "refactor: use new validator in SmartSelection"
```

---

## Phase 3: Auto-Fix UI

### Task 9: Create ToastWithActions Component

**Files:**
- Create: `components/ui/ToastWithActions.tsx`

**Step 1: Write component**

```typescript
'use client'

import React from 'react'

export interface ToastAction {
  label: string
  action: () => void
}

export interface ToastWithActionsProps {
  message: string
  type: 'error' | 'warning' | 'info' | 'success'
  actions?: ToastAction[]
  onClose: () => void
}

export function ToastWithActions({
  message,
  type,
  actions,
  onClose
}: ToastWithActionsProps) {
  return (
    <div className={`toast toast-${type}`}>
      <span className="toast-message">{message}</span>

      {actions && actions.length > 0 && (
        <div className="toast-actions">
          {actions.map((action, index) => (
            <button
              key={index}
              className="toast-action-button"
              onClick={() => {
                action.action()
                onClose()
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      <button
        className="toast-close"
        onClick={onClose}
        aria-label="Close"
      >
        ×
      </button>
    </div>
  )
}
```

**Step 2: Add styles**

```css
/* components/ui/ToastWithActions.css */
.toast {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.toast-error {
  background-color: #fee;
  border-left: 4px solid #e53e3e;
}

.toast-warning {
  background-color: #fef5e7;
  border-left: 4px solid #f6ad55;
}

.toast-info {
  background-color: #ebf8ff;
  border-left: 4px solid #4299e1;
}

.toast-success {
  background-color: #f0fff4;
  border-left: 4px solid #48bb78;
}

.toast-message {
  flex: 1;
  font-size: 14px;
}

.toast-actions {
  display: flex;
  gap: 8px;
}

.toast-action-button {
  padding: 6px 12px;
  font-size: 13px;
  border: none;
  border-radius: 4px;
  background-color: #4299e1;
  color: white;
  cursor: pointer;
  transition: background-color 0.2s;
}

.toast-action-button:hover {
  background-color: #3182ce;
}

.toast-close {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #718096;
  padding: 0 4px;
}

.toast-close:hover {
  color: #2d3748;
}
```

**Step 3: Commit**

```bash
git add components/ui/ToastWithActions.tsx components/ui/ToastWithActions.css
git commit -m "feat: add toast component with action buttons"
```

---

### Task 10: Update useEditorState to Show Fix Actions

**Files:**
- Modify: `components/editor/hooks/useEditorState.ts`

**Step 1: Update handleApplyTag to use fixes**

```typescript
// In handleApplyTag function, replace schema validation check with:
if (schemaValidation && !schemaValidation.valid) {
  const fixes = (schemaValidation as any).fixes || []

  if (fixes.length > 0) {
    // Show toast with action buttons
    showToastWithActions(
      schemaValidation.reason || 'Invalid tag application',
      'error',
      fixes.slice(0, 3).map(fix => ({
        label: fix.label,
        action: () => executeFix(fix, tag, attrs || {})
      }))
    )
  } else {
    // No fixes available, show regular error
    showToast(schemaValidation.reason || 'Invalid tag application', 'error')
  }

  return
}
```

**Step 2: Add executeFix function**

```typescript
// Add to useEditorState hook
const executeFix = useCallback(async (
  fix: any,
  tagType: string,
  originalAttrs: Record<string, string>
) => {
  switch (fix.type) {
    case 'add-attribute':
    case 'change-attribute':
      const updatedAttrs = {
        ...originalAttrs,
        [fix.attribute]: fix.value,
      }
      await handleApplyTag(tagType, updatedAttrs)
      break

    case 'create-entity':
      // Open entity creator dialog
      // This will be implemented in a separate task
      showToast(`Opening ${fix.entityType} creator...`, 'info')
      break

    case 'expand-selection':
      // Expand selection and re-apply tag
      const expandedRange = fix.expandedRange
      // Selection restoration will be implemented separately
      await handleApplyTag(tagType, originalAttrs)
      break
  }
}, [handleApplyTag, showToast])
```

**Step 3: Add showToastWithActions helper**

```typescript
// Add to useEditorState hook
const showToastWithActions = useCallback((
  message: string,
  type: 'error' | 'warning' | 'info' | 'success',
  actions?: Array<{ label: string; action: () => void }>
) => {
  // Use your existing toast system to show ToastWithActions component
  // Implementation depends on your toast manager
  console.log('Toast with actions:', { message, type, actions })

  // For now, show as regular toast
  showToast(message, type)

  // TODO: Integrate with ToastWithActions component
}, [showToast])
```

**Step 4: Run tests**

Run: `npm test -- tests/unit/`
Expected: PASS

**Step 5: Commit**

```bash
git add components/editor/hooks/useEditorState.ts
git commit -m "feat: integrate fix actions in editor hook"
```

---

## Phase 4: Multi-Tag Workflow

### Task 11: Create Tag Queue State Management

**Files:**
- Create: `lib/queue/TagQueue.ts`

**Step 1: Write failing test**

```typescript
// tests/queue/TagQueue.test.ts
import { describe, it, expect } from '@jest/globals'
import { TagQueue } from '@/lib/queue/TagQueue'
import type { TEIDocument } from '@/lib/tei/types'

describe('TagQueue', () => {
  it('should add tags to queue', () => {
    const document: TEIDocument = {
      state: {
        parsed: {},
        passages: [],
        characters: [],
        revision: 0,
      },
      events: []
    }

    const queue = new TagQueue(document)

    queue.add('said', { who: '#char-1' }, { start: 0, end: 10 })
    queue.add('persName', { ref: '#char-1' }, { start: 0, end: 4 })

    expect(queue.pending).toHaveLength(2)
    expect(queue.pending[0].tag).toBe('said')
  })

  it('should remove tag from queue', () => {
    const document: TEIDocument = {
      state: {
        parsed: {},
        passages: [],
        characters: [],
        revision: 0,
      },
      events: []
    }

    const queue = new TagQueue(document)

    queue.add('said', { who: '#char-1' }, { start: 0, end: 10 })
    queue.add('persName', { ref: '#char-1' }, { start: 0, end: 4 })

    queue.remove(0)

    expect(queue.pending).toHaveLength(1)
    expect(queue.pending[0].tag).toBe('persName')
  })

  it('should clear queue', () => {
    const document: TEIDocument = {
      state: {
        parsed: {},
        passages: [],
        characters: [],
        revision: 0,
      },
      events: []
    }

    const queue = new TagQueue(document)

    queue.add('said', { who: '#char-1' }, { start: 0, end: 10 })
    queue.clear()

    expect(queue.pending).toHaveLength(0)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/queue/TagQueue.test.ts`
Expected: FAIL with "TagQueue is not defined"

**Step 3: Write minimal implementation**

```typescript
// lib/queue/TagQueue.ts
import type { TEIDocument, TextRange } from '@/lib/tei/types'

export interface PendingTag {
  tag: string
  attrs: Record<string, string>
  range: TextRange
  timestamp: number
}

export class TagQueue {
  private _document: TEIDocument
  private _pending: PendingTag[] = []

  constructor(document: TEIDocument) {
    this._document = document
  }

  get pending(): PendingTag[] {
    return [...this._pending]  // Return copy
  }

  get document(): TEIDocument {
    return this._document
  }

  add(tag: string, attrs: Record<string, string>, range: TextRange): void {
    const pendingTag: PendingTag = {
      tag,
      attrs,
      range,
      timestamp: Date.now(),
    }

    this._pending.push(pendingTag)
  }

  remove(index: number): void {
    if (index >= 0 && index < this._pending.length) {
      this._pending.splice(index, 1)
    }
  }

  clear(): void {
    this._pending = []
  }

  isEmpty(): boolean {
    return this._pending.length === 0
  }

  get size(): number {
    return this._pending.length
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/queue/TagQueue.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/queue/TagQueue.ts tests/queue/TagQueue.test.ts
git commit -m "feat: implement tag queue state management"
```

---

### Task 12: Create Tag Queue Panel Component

**Files:**
- Create: `components/queue/TagQueuePanel.tsx`

**Step 1: Write component**

```typescript
'use client'

import React from 'react'
import type { PendingTag } from '@/lib/queue/TagQueue'

export interface TagQueuePanelProps {
  pending: PendingTag[]
  onRemove: (index: number) => void
  onApply: () => void
  onClear: () => void
}

export function TagQueuePanel({
  pending,
  onRemove,
  onApply,
  onClear
}: TagQueuePanelProps) {
  if (pending.length === 0) {
    return null
  }

  return (
    <div className="tag-queue-panel">
      <div className="tag-queue-header">
        <h3>Pending Tags ({pending.length})</h3>
        <button
          className="clear-button"
          onClick={onClear}
        >
          Clear All
        </button>
      </div>

      <div className="tag-queue-items">
        {pending.map((pending, index) => (
          <div key={index} className="tag-queue-item">
            <span className="tag-name">&lt;{pending.tag}&gt;</span>

            {Object.keys(pending.attrs).length > 0 && (
              <span className="tag-attrs">
                {Object.entries(pending.attrs).map(([k, v]) => (
                  <span key={k} className="tag-attr">
                    {k}="{v}"
                  </span>
                ))}
              </span>
            )}

            <button
              className="remove-button"
              onClick={() => onRemove(index)}
              aria-label="Remove tag"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <div className="tag-queue-actions">
        <button
          className="apply-button"
          onClick={onApply}
        >
          Apply All Tags
        </button>
      </div>
    </div>
  )
}
```

**Step 2: Add styles**

```css
/* components/queue/TagQueuePanel.css */
.tag-queue-panel {
  background-color: #f7fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.tag-queue-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.tag-queue-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.clear-button {
  padding: 4px 12px;
  font-size: 12px;
  border: 1px solid #cbd5e0;
  border-radius: 4px;
  background-color: white;
  cursor: pointer;
}

.clear-button:hover {
  background-color: #edf2f7;
}

.tag-queue-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.tag-queue-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background-color: white;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
}

.tag-name {
  font-family: monospace;
  font-weight: 600;
  color: #2d3748;
}

.tag-attrs {
  display: flex;
  gap: 8px;
  flex: 1;
}

.tag-attr {
  font-family: monospace;
  font-size: 12px;
  color: #4a5568;
}

.remove-button {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #a0aec0;
  padding: 0 4px;
}

.remove-button:hover {
  color: #e53e3e;
}

.tag-queue-actions {
  display: flex;
  justify-content: flex-end;
}

.apply-button {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  background-color: #48bb78;
  color: white;
  font-weight: 600;
  cursor: pointer;
}

.apply-button:hover {
  background-color: #38a169;
}
```

**Step 3: Commit**

```bash
git add components/queue/TagQueuePanel.tsx components/queue/TagQueuePanel.css
git commit -m "feat: add tag queue panel component"
```

---

### Task 13: Integrate Tag Queue into useEditorState

**Files:**
- Modify: `components/editor/hooks/useEditorState.ts`

**Step 1: Add queue state**

```typescript
// Add to useEditorState hook imports
import { TagQueue } from '@/lib/queue/TagQueue'

// Add state in useEditorState function
const [tagQueue, setTagQueue] = useState<TagQueue | null>(null)
const [multiTagMode, setMultiTagMode] = useState(false)
```

**Step 2: Add queue operations**

```typescript
// Add to useEditorState hook
const initQueue = useCallback(() => {
  if (!document) return
  setTagQueue(new TagQueue(document))
}, [document])

// Initialize queue when document changes
useEffect(() => {
  initQueue()
}, [initQueue])

const addToQueue = useCallback((
  tag: string,
  attrs: Record<string, string>,
  range: TextRange
) => {
  if (!tagQueue) return

  tagQueue.add(tag, attrs, range)
  setTagQueue(new TagQueue(document))  // Force re-render
  showToast(`Added &lt;${tag}&gt; to queue`, 'info')
}, [tagQueue, document, showToast])

const removeFromQueue = useCallback((index: number) => {
  if (!tagQueue) return

  tagQueue.remove(index)
  setTagQueue(new TagQueue(document))
}, [tagQueue, document])

const clearQueue = useCallback(() => {
  if (!tagQueue) return

  tagQueue.clear()
  setTagQueue(new TagQueue(document))
}, [tagQueue, document])

const applyQueue = useCallback(async () => {
  if (!tagQueue || tagQueue.isEmpty()) return

  let currentDoc = document

  for (const pendingTag of tagQueue.pending) {
    // Apply each tag
    const program = addTag(
      currentDoc,
      'passage-0',  // TODO: get passage ID from range
      pendingTag.range,
      pendingTag.tag,
      pendingTag.attrs
    )

    currentDoc = await runEffectAsyncOrFail(program)
  }

  // Update document
  const xml = serializeDocument(currentDoc)
  await updateDocument(xml)

  // Clear queue
  clearQueue()
  showToast(`Applied ${tagQueue.size} tags`, 'success')
}, [tagQueue, document, addTag, updateDocument, clearQueue, showToast])
```

**Step 3: Update handleApplyTag to use queue**

```typescript
// Update handleApplyTag to check multi-tag mode
const handleApplyTag = useCallback(async (
  tag: string,
  attrs?: Record<string, string>
) => {
  // ... existing validation code ...

  // After validation passes:
  if (multiTagMode) {
    // Add to queue
    addToQueue(tag, attrs || {}, adjustment.adjustedRange)
  } else {
    // Apply immediately
    await applyTag(tag, attrs || {}, adjustment.adjustedRange)
  }
}, [multiTagMode, addToQueue, applyTag])
```

**Step 4: Add queue and mode toggle to return value**

```typescript
// Add to return object of useEditorState
return {
  // ... existing returns ...
  tagQueue,
  multiTagMode,
  setMultiTagMode,
  addToQueue,
  removeFromQueue,
  clearQueue,
  applyQueue,
}
```

**Step 5: Run tests**

Run: `npm test -- tests/unit/`
Expected: PASS

**Step 6: Commit**

```bash
git add components/editor/hooks/useEditorState.ts
git commit -m "feat: integrate tag queue into editor state"
```

---

### Task 14: Add Multi-Tag Mode Toggle to UI

**Files:**
- Modify: `components/editor/EditorLayout.tsx` (or appropriate toolbar component)

**Step 1: Add toggle button**

```typescript
// Add to editor toolbar
<button
  className={multiTagMode ? 'active' : ''}
  onClick={() => setMultiTagMode(!multiTagMode)}
  title="Enable multi-tag mode to apply multiple tags at once"
>
  {multiTagMode ? 'Multi-Tag: ON' : 'Multi-Tag: OFF'}
</button>
```

**Step 2: Add TagQueuePanel to layout**

```typescript
// Add TagQueuePanel to editor layout
{tagQueue && !tagQueue.isEmpty() && (
  <TagQueuePanel
    pending={tagQueue.pending}
    onRemove={removeFromQueue}
    onApply={applyQueue}
    onClear={clearQueue}
  />
)}
```

**Step 3: Add styles for multi-tag mode**

```css
/* Multi-tag mode toggle styles */
button.active {
  background-color: #48bb78;
  color: white;
}
```

**Step 4: Test manually**

Run: `npm run dev`
Expected: Toggle button switches multi-tag mode on/off

**Step 5: Commit**

```bash
git add components/editor/EditorLayout.tsx
git commit -m "feat: add multi-tag mode toggle to editor UI"
```

---

## Phase 5: Documentation and Finalization

### Task 15: Create Validation Module Exports

**Files:**
- Create: `lib/validation/index.ts`

**Step 1: Create public API**

```typescript
// lib/validation/index.ts
export { RelaxNGParser } from './RelaxNGParser'
export { SchemaCache } from './SchemaCache'
export { Validator } from './Validator'
export { detectEntityTypeFromAttribute, getEntities } from './EntityDetector'
export { detectSchemaPath } from './schemaDetection'

export type {
  ParsedConstraints,
  TagConstraint,
  AttributeConstraint,
  ContentModel,
  AttributeType,
  EntityType,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  Fix,
  TextRange,
} from './types'
```

**Step 2: Commit**

```bash
git add lib/validation/index.ts
git commit -m "docs: export public API for validation module"
```

---

### Task 16: Create Comprehensive Documentation

**Files:**
- Create: `docs/validation-system.md`

**Step 1: Write documentation**

```markdown
# Schema-Driven Validation System

## Overview

The validation system provides real-time TEI P5 schema validation during XML editing, with automatic error detection and fix suggestions.

## Architecture

### 1. Schema Parser Layer

Parses RelaxNG schema files to extract tag constraints:

```typescript
import { RelaxNGParser } from '@/lib/validation'

const parser = new RelaxNGParser()
const constraints = parser.parse(schemaXML)
```

### 2. Validation Engine

Validates selections against parsed constraints:

```typescript
import { Validator, SchemaCache } from '@/lib/validation'

const cache = new SchemaCache({ maxSize: 10 })
const validator = new Validator(cache)

const result = validator.validate(
  passage,
  range,
  'said',
  { who: '#char-1' },
  document
)
```

### 3. Auto-Fix System

Generates actionable fixes for validation errors:

```typescript
if (!result.valid) {
  result.fixes.forEach(fix => {
    console.log(`${fix.label}: ${fix.type}`)
  })
}
```

### 4. Multi-Tag Workflow

Queue-based batch tag application:

```typescript
const queue = new TagQueue(document)
queue.add('said', { who: '#char-1' }, { start: 0, end: 10 })
queue.add('persName', { ref: '#char-1' }, { start: 0, end: 4 })

// Apply all at once
for (const tag of queue.pending) {
  applyTag(tag.tag, tag.attrs, tag.range)
}
```

## Usage

### Basic Validation

```typescript
import { validateAgainstSchema } from '@/lib/selection/SmartSelection'

const result = validateAgainstSchema(
  passage,
  { start: 0, end: 10 },
  'said',
  { who: '#char-1' },
  document
)

if (!result.valid) {
  console.error(result.reason)
  console.log('Fixes:', result.fixes)
}
```

### Entity Type Detection

The system automatically detects which entity type an IDREF references:

- `@who` → character
- `@ref` on `<persName>` → character
- `@ref` on `<placeName>` → place
- `@ref` on `<orgName>` → organization

## Testing

Run validation tests:

```bash
npm test -- tests/validation/
npm test -- tests/queue/
npm test -- tests/unit/schema-aware-smart-selection.test.ts
```

## Extending

### Adding New Entity Types

1. Add entity collection to document state
2. Update `getEntities()` in `EntityDetector.ts`
3. Add mapping in `ENTITY_MAPPINGS`

### Adding New Schema Constraints

Constraints are automatically extracted from RelaxNG schemas. No code changes needed.

## Migration from Old System

The new validation system is backward compatible. Existing code continues to work:

```typescript
// Old API still works
const result = validateAgainstSchema(passage, range, 'said', attrs, document)

// New fields available
result.fixes  // Array of actionable fixes
```

Enable new features by using fixes:

```typescript
if (!result.valid && result.fixes) {
  // Show fix buttons in UI
  showFixButtons(result.fixes)
}
```
```

**Step 2: Commit**

```bash
git add docs/validation-system.md
git commit -m "docs: add comprehensive validation system documentation"
```

---

### Task 17: Run Full Test Suite

**Step 1: Run all tests**

```bash
npm test -- --no-coverage
```

Expected: All tests pass (~210 tests total)

**Step 2: Check test coverage**

```bash
npm test -- --coverage --coverageReporters=text
```

Expected: >90% coverage for new validation code

**Step 3: Fix any failing tests**

If any tests fail, debug and fix them.

**Step 4: Commit**

```bash
git add .
git commit -m "test: ensure all tests pass after implementation"
```

---

### Task 18: Create Feature Flag

**Files:**
- Modify: `lib/validation/index.ts`

**Step 1: Add feature flag**

```typescript
// lib/validation/index.ts
export const ENABLE_SCHEMA_DRIVEN_VALIDATION = true

// Or read from environment
export const ENABLE_SCHEMA_DRIVEN_VALIDATION =
  process.env.NEXT_PUBLIC_ENABLE_SCHEMA_VALIDATION !== 'false'
```

**Step 2: Update useEditorState to check flag**

```typescript
// In useEditorState, conditionally use new validator
if (ENABLE_SCHEMA_DRIVEN_VALIDATION) {
  // Use new validator with fixes
} else {
  // Use old validator
}
```

**Step 3: Commit**

```bash
git add lib/validation/index.ts components/editor/hooks/useEditorState.ts
git commit -m "feat: add feature flag for schema-driven validation"
```

---

### Task 19: Performance Testing

**Step 1: Create performance test**

```typescript
// tests/performance/validation-performance.test.ts
import { describe, it, expect } from '@jest/globals'
import { SchemaCache } from '@/lib/validation/SchemaCache'

describe('Validation Performance', () => {
  it('should cache parsed schemas', () => {
    const cache = new SchemaCache({ maxSize: 10 })

    const start1 = performance.now()
    cache.get('/public/schemas/tei-all.rng')
    const time1 = performance.now() - start1

    const start2 = performance.now()
    cache.get('/public/schemas/tei-all.rng')
    const time2 = performance.now() - start2

    expect(time2).toBeLessThan(time1 / 10)  // Cache should be 10x faster
  })

  it('should handle large documents efficiently', () => {
    const cache = new SchemaCache({ maxSize: 10 })
    const validator = new Validator(cache)

    // Create large passage with many tags
    const passage = createLargePassage(1000)  // 1000 tags

    const start = performance.now()
    const result = validator.validate(
      passage,
      { start: 0, end: 100 },
      'said',
      { who: '#char-1' },
      document
    )
    const time = performance.now() - start

    expect(result.valid).toBeDefined()
    expect(time).toBeLessThan(100)  // Should complete in <100ms
  })
})
```

**Step 2: Run performance tests**

```bash
npm test -- tests/performance/
```

**Step 3: Optimize if needed**

If performance is poor, consider:
- Increasing cache size
- Lazy loading of schema files
- Optimizing parser logic

**Step 4: Commit**

```bash
git add tests/performance/validation-performance.test.ts
git commit -m "test: add validation performance tests"
```

---

### Task 20: Final Integration Test

**Step 1: Create E2E test**

```typescript
// tests/integration/schema-validation-flow.test.ts
import { describe, it, expect } from '@jest/globals'
import { render, screen, fireEvent } from '@testing-library/react'
import { Editor } from '@/components/editor/Editor'

describe('Schema Validation Flow', () => {
  it('should guide user through fixing validation error', async () => {
    render(<Editor document={testDocument} />)

    // Select text
    fireEvent.mouseUp(screen.getByText('John said hello'))

    // Click said button (no @who provided)
    fireEvent.click(screen.getByText('<said>'))

    // Should show error with fix buttons
    await screen.findByText('Missing required attribute: who')

    // Click fix button
    fireEvent.click(screen.getByText('Set @who to "John"'))

    // Tag should be applied
    expect(screen.getByText('Applied <said who="#char-1">')).toBeInTheDocument()
  })

  it('should support multi-tag workflow', async () => {
    render(<Editor document={testDocument} />)

    // Enable multi-tag mode
    fireEvent.click(screen.getByText(/Multi-Tag/))

    // Apply first tag
    fireEvent.mouseUp(screen.getByText('John said hello'))
    fireEvent.click(screen.getByText('<said>'))

    // Should show queue
    expect(screen.getByText('Pending Tags (1)')).toBeInTheDocument()

    // Apply second tag
    fireEvent.mouseUp(screen.getByText('John'))
    fireEvent.click(screen.getByText('<persName>'))

    // Should show queue with 2 tags
    expect(screen.getByText('Pending Tags (2)')).toBeInTheDocument()

    // Apply all
    fireEvent.click(screen.getByText('Apply All Tags'))

    // Should show success
    await screen.findByText('Applied 2 tags')
  })
})
```

**Step 2: Run integration test**

```bash
npm test -- tests/integration/schema-validation-flow.test.ts
```

**Step 3: Commit**

```bash
git add tests/integration/schema-validation-flow.test.ts
git commit -m "test: add end-to-end validation flow tests"
```

---

### Task 21: Final Polish and Code Review

**Step 1: Run linter**

```bash
npm run lint
```

**Step 2: Fix any lint issues**

**Step 3: Check TypeScript**

```bash
npx tsc --noEmit
```

**Step 4: Format code**

```bash
npm run format
```

**Step 5: Final commit**

```bash
git add .
git commit -m "style: final polish and code formatting"
```

---

## Summary

This implementation plan covers:

1. **Schema Parser** - RelaxNG parsing with LRU caching
2. **Validation Engine** - Enhanced validation with entity-aware IDREF checking
3. **Auto-Fix System** - Actionable error resolutions
4. **Multi-Tag Workflow** - Queue-based batch tag application

**Total Effort:** ~21 tasks across 4 phases, estimated 12-15 days

**Key Files Created:**
- `lib/validation/` - Schema parsing and validation
- `lib/queue/TagQueue.ts` - Queue state management
- `components/ui/ToastWithActions.tsx` - Fix UI
- `components/queue/TagQueuePanel.tsx` - Queue UI
- `tests/validation/` - Comprehensive test coverage

**Backward Compatibility:** All changes are backward compatible. Existing code continues to work without modifications.
