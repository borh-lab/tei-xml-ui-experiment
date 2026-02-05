/**
 * RelaxNG Schema Parser
 *
 * Parses RelaxNG XML schemas to extract tag constraints, attribute definitions,
 * and content models for validation.
 */

import { XMLParser } from 'fast-xml-parser'
import type {
  ParsedConstraints,
  TagConstraint,
  AttributeConstraint,
  ContentModel,
  AttributeType
} from './types'

export class RelaxNGParser {
  private parser: XMLParser

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '$',
      textNodeName: '#text',
      ignoreDeclaration: true
    })
  }

  /**
   * Parse RelaxNG schema XML and extract constraints
   */
  parse(schemaXML: string): ParsedConstraints {
    const parsed = this.parser.parse(schemaXML)
    const grammar = parsed.grammar

    if (!grammar) {
      throw new Error('Invalid RelaxNG schema: missing <grammar> element')
    }

    const constraints: ParsedConstraints = {
      tags: {},
      attributes: {},
      contentModels: {}
    }

    // Extract defines (contains tag definitions)
    const defines = this.ensureArray(grammar.define)
    for (const def of defines) {
      this.parseDefine(def, constraints)
    }

    return constraints
  }

  /**
   * Parse a <define> element which contains tag definitions
   */
  private parseDefine(def: Record<string, unknown>, constraints: ParsedConstraints): void {
    const element = def.element
    if (!element) return

    const elements = this.ensureArray(element)
    for (const el of elements) {
      const tagName = el['$name']
      if (!tagName) continue

      const tagConstraint: TagConstraint = {
        tagName,
        requiredAttributes: [],
        optionalAttributes: [],
        allowedParents: []
      }

      // Parse attributes (both required and optional)
      const attributes = this.ensureArray(el.attribute)
      for (const attr of attributes) {
        const attrName = attr['$name']
        if (!attrName) continue

        tagConstraint.requiredAttributes.push(attrName)

        // Extract attribute constraint
        const attrConstraint: AttributeConstraint = {
          name: attrName,
          type: this.extractDataType(attr),
          required: true
        }

        // Check for enumerated values
        if (attr.choice) {
          const values = this.extractEnumValues(attr.choice)
          if (values.length > 0) {
            attrConstraint.type = 'enumerated'
            attrConstraint.allowedValues = values
          }
        }

        constraints.attributes[`${tagName}.${attrName}`] = attrConstraint
      }

      // Parse optional attributes
      const optionals = this.ensureArray(el.optional)
      for (const opt of optionals) {
        const optAttrs = this.ensureArray(opt.attribute)
        for (const attr of optAttrs) {
          const attrName = attr['$name']
          if (!attrName) continue

          tagConstraint.optionalAttributes.push(attrName)

          // Extract optional attribute constraint
          const attrConstraint: AttributeConstraint = {
            name: attrName,
            type: this.extractDataType(attr),
            required: false
          }

          // Check for enumerated values
          if (attr.choice) {
            const values = this.extractEnumValues(attr.choice)
            if (values.length > 0) {
              attrConstraint.type = 'enumerated'
              attrConstraint.allowedValues = values
            }
          }

          constraints.attributes[`${tagName}.${attrName}`] = attrConstraint
        }
      }

      constraints.tags[tagName] = tagConstraint

      // Parse content model (always create one, even if empty)
      const contentModel = this.parseContentModel(el)
      constraints.contentModels[tagName] = contentModel || {
        textOnly: false,
        mixedContent: false,
        allowedChildren: []
      }
    }
  }

  /**
   * Extract data type from attribute definition
   */
  private extractDataType(attr: Record<string, unknown>): AttributeType {
    const data = attr.data
    if (data && data['$type']) {
      const type = data['$type']
      if (type === 'IDREF' || type === 'ID' || type === 'NCName' || type === 'string' || type === 'token') {
        return type
      }
    }
    return 'string' // default
  }

  /**
   * Extract enumerated values from <choice> element
   */
  private extractEnumValues(choice: Record<string, unknown>): string[] {
    const values: string[] = []
    const choices = this.ensureArray(choice.value)
    for (const val of choices) {
      if (val['$id']) {
        values.push(val['$id'])
      }
    }
    return values
  }

  /**
   * Parse content model from element definition
   */
  private parseContentModel(el: Record<string, unknown>): ContentModel | null {
    const model: ContentModel = {
      textOnly: false,
      mixedContent: false,
      allowedChildren: []
    }

    // Check for text-only content
    // fast-xml-parser may represent self-closing <text/> as an object or empty string
    if (el.text !== undefined) {
      model.textOnly = true
      return model
    }

    // Check if element has no children (empty content model)
    // In this case, it might be text-only by default
    const hasContentPatterns = [
      'mixed', 'choice', 'interleave', 'zeroOrMore', 'oneOrMore',
      'optional', 'ref', 'element'
    ].some(key => el[key] !== undefined)

    if (!hasContentPatterns && !el.attribute) {
      // Element with no explicit content model - assume text-only
      model.textOnly = true
      return model
    }

    // Check for mixed content (text + elements)
    if (el.mixed) {
      model.mixedContent = true
      const children = this.extractChildTags(el.mixed)
      model.allowedChildren = children
      return model
    }

    // Check for choice (one of many options)
    if (el.choice) {
      const children = this.extractChildTags(el.choice)
      model.allowedChildren = children
      return model
    }

    // Check for interleave (any order)
    if (el.interleave) {
      const children = this.extractChildTags(el.interleave)
      model.allowedChildren = children
      return model
    }

    // Check for zeroOrMore, oneOrMore, optional
    for (const pattern of ['zeroOrMore', 'oneOrMore', 'optional'] as const) {
      if (el[pattern]) {
        const children = this.extractChildTags(el[pattern])
        model.allowedChildren = children
        return model
      }
    }

    // Check for ref (reference to another pattern)
    if (el.ref) {
      const refs = this.ensureArray(el.ref)
      for (const ref of refs) {
        const name = ref['$name']
        if (name) {
          // Could be a reference to another define
          // For now, just note the reference
          model.allowedChildren.push(name)
        }
      }
      return model
    }

    // No explicit content model found
    return null
  }

  /**
   * Extract child tag names from content model pattern
   */
  private extractChildTags(pattern: Record<string, unknown>): string[] {
    const children: string[] = []

    // Direct ref elements
    if (pattern.ref) {
      const refs = this.ensureArray(pattern.ref)
      for (const ref of refs) {
        const name = ref['$name']
        if (name) {
          children.push(name)
        }
      }
    }

    // Nested elements
    if (pattern.element) {
      const elements = this.ensureArray(pattern.element)
      for (const el of elements) {
        const name = el['$name']
        if (name) {
          children.push(name)
        }
      }
    }

    // Nested patterns (choice, interleave, etc.)
    for (const nested of ['choice', 'interleave', 'zeroOrMore', 'oneOrMore', 'optional'] as const) {
      if (pattern[nested]) {
        const nestedChildren = this.extractChildTags(pattern[nested])
        children.push(...nestedChildren)
      }
    }

    return children
  }

  /**
   * Ensure value is an array (handle single vs multiple elements)
   */
  private ensureArray<T>(value: T | T[] | undefined): T[] {
    if (value === undefined || value === null) {
      return []
    }
    return Array.isArray(value) ? value : [value]
  }
}
