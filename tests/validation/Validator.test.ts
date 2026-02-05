import { describe, it, expect } from '@jest/globals'
import { Validator } from '@/lib/validation/Validator'
import { SchemaCache } from '@/lib/validation/SchemaCache'
import type { TEIDocument, Passage } from '@/lib/tei/types'

// Mock RelaxNG schema for testing
const mockSchemaXML = `
<grammar xmlns="http://relaxng.org/ns/structure/1.0">
  <define name="said">
    <element name="said">
      <attribute name="who"><data type="IDREF"/></attribute>
      <optional>
        <attribute name="aloud"><data type="boolean"/></attribute>
      </optional>
      <text/>
    </element>
  </define>
</grammar>
`

// Mock file reader that returns test schema
const mockFileReader = (path: string, encoding: string) => {
  if (path.includes('tei-all.rng') || path.includes('tei-novel.rng')) {
    return mockSchemaXML
  }
  throw new Error(`File not found: ${path}`)
}

describe('Validator', () => {
  it('should validate required attributes', () => {
    const passage: Passage = {
      id: 'passage-1',
      content: 'John said hello',
      tags: [],
    }

    const document: TEIDocument = {
      state: {
        characters: [{ id: 'char-1', xmlId: 'char-1', name: 'John' }],
        parsed: {},
        passages: [passage],
        revision: 0,
      },
      events: []
    }

    const schemaCache = new SchemaCache({ maxSize: 10 }, mockFileReader)
    const validator = new Validator(schemaCache)

    const result = validator.validate(
      passage,
      { start: 0, end: 4 },
      'said',
      {},  // No attributes provided
      document
    )

    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.message.includes('Required'))).toBe(true)
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
        characters: [{ id: 'char-1', xmlId: 'char-1', name: 'John' }],
        parsed: {},
        passages: [passage],
        revision: 0,
      },
      events: []
    }

    const schemaCache = new SchemaCache({ maxSize: 10 }, mockFileReader)
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

  it('should pass validation with valid attributes', () => {
    const passage: Passage = {
      id: 'passage-1',
      content: 'John said hello',
      tags: [],
    }

    const document: TEIDocument = {
      state: {
        characters: [{ id: 'char-1', xmlId: 'char-1', name: 'John' }],
        parsed: {},
        passages: [passage],
        revision: 0,
      },
      events: []
    }

    const schemaCache = new SchemaCache({ maxSize: 10 }, mockFileReader)
    const validator = new Validator(schemaCache)

    const result = validator.validate(
      passage,
      { start: 0, end: 4 },
      'said',
      { who: '#char-1' },  // Valid reference
      document
    )

    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should generate fixes with suggested entity values', () => {
    const passage: Passage = {
      id: 'passage-1',
      content: 'John said hello',
      tags: [],
    }

    const document: TEIDocument = {
      state: {
        characters: [
          { id: 'char-1', xmlId: 'char-1', name: 'John' },
          { id: 'char-2', xmlId: 'char-2', name: 'Jane' },
        ],
        parsed: {},
        passages: [passage],
        revision: 0,
      },
      events: []
    }

    const schemaCache = new SchemaCache({ maxSize: 10 }, mockFileReader)
    const validator = new Validator(schemaCache)

    const result = validator.validate(
      passage,
      { start: 0, end: 4 },
      'said',
      {},  // Missing required attribute
      document
    )

    expect(result.fixes.length).toBeGreaterThan(0)
    const addAttrFix = result.fixes.find(f => f.type === 'add-attribute')
    expect(addAttrFix).toBeDefined()
    expect(addAttrFix?.suggestedValues).toEqual(['char-1', 'char-2'])
  })

  it('should suggest creating entity when no entities exist', () => {
    const passage: Passage = {
      id: 'passage-1',
      content: 'Someone said hello',
      tags: [],
    }

    const document: TEIDocument = {
      state: {
        characters: [],
        parsed: {},
        passages: [passage],
        revision: 0,
      },
      events: []
    }

    const schemaCache = new SchemaCache({ maxSize: 10 }, mockFileReader)
    const validator = new Validator(schemaCache)

    const result = validator.validate(
      passage,
      { start: 0, end: 7 },
      'said',
      {},  // Missing required attribute
      document
    )

    expect(result.fixes.length).toBeGreaterThan(0)
    const createEntityFix = result.fixes.find(f => f.type === 'create-entity')
    expect(createEntityFix).toBeDefined()
    expect(createEntityFix?.entityType).toBe('character')
  })
})
