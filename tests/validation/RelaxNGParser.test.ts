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

  it('should parse attribute data types', () => {
    const schemaXML = `
      <grammar xmlns="http://relaxng.org/ns/structure/1.0">
        <define name="model.sp">
          <element name="sp">
            <attribute name="who">
              <data type="IDREF"/>
            </attribute>
            <attribute name="source">
              <data type="string"/>
            </attribute>
          </element>
        </define>
      </grammar>
    `

    const parser = new RelaxNGParser()
    const constraints = parser.parse(schemaXML)

    expect(constraints.attributes['sp.who'].type).toBe('IDREF')
    expect(constraints.attributes['sp.source'].type).toBe('string')
  })

  it('should parse content models with ref elements', () => {
    const schemaXML = `
      <grammar xmlns="http://relaxng.org/ns/structure/1.0">
        <define name="model.sp">
          <element name="sp">
            <attribute name="who">
              <data type="IDREF"/>
            </attribute>
            <optional>
              <ref name="model.p"/>
            </optional>
          </element>
        </define>
      </grammar>
    `

    const parser = new RelaxNGParser()
    const constraints = parser.parse(schemaXML)

    expect(constraints.contentModels['sp']).toBeDefined()
    expect(constraints.contentModels['sp'].allowedChildren).toContain('model.p')
  })

  it('should parse multiple defines in a schema', () => {
    const schemaXML = `
      <grammar xmlns="http://relaxng.org/ns/structure/1.0">
        <define name="model.persName">
          <element name="persName">
            <attribute name="ref">
              <data type="IDREF"/>
            </attribute>
          </element>
        </define>
        <define name="model.placeName">
          <element name="placeName">
            <attribute name="ref">
              <data type="IDREF"/>
            </attribute>
          </element>
        </define>
      </grammar>
    `

    const parser = new RelaxNGParser()
    const constraints = parser.parse(schemaXML)

    expect(constraints.tags['persName']).toBeDefined()
    expect(constraints.tags['placeName']).toBeDefined()
    expect(Object.keys(constraints.tags)).toHaveLength(2)
  })

  it('should handle empty schemas', () => {
    const schemaXML = `
      <grammar xmlns="http://relaxng.org/ns/structure/1.0">
      </grammar>
    `

    const parser = new RelaxNGParser()
    const constraints = parser.parse(schemaXML)

    expect(Object.keys(constraints.tags)).toHaveLength(0)
    expect(Object.keys(constraints.attributes)).toHaveLength(0)
  })

  it('should parse text-only content models', () => {
    const schemaXML = `
      <grammar xmlns="http://relaxng.org/ns/structure/1.0">
        <define name="model.text">
          <element name="text">
            <text/>
          </element>
        </define>
      </grammar>
    `

    const parser = new RelaxNGParser()
    const constraints = parser.parse(schemaXML)

    expect(constraints.contentModels['text']).toBeDefined()
    expect(constraints.contentModels['text'].textOnly).toBe(true)
  })

  it('should throw error for invalid schema without grammar element', () => {
    const schemaXML = `<root></root>`

    const parser = new RelaxNGParser()

    expect(() => parser.parse(schemaXML)).toThrow('Invalid RelaxNG schema')
  })
})
