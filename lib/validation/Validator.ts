/**
 * Enhanced Validator
 *
 * Schema-driven validation engine that checks:
 * - Required attributes are present
 * - IDREF attributes reference existing entities
 * - Attribute types are valid
 *
 * Generates actionable fixes for validation errors.
 */

import { SchemaCache } from './SchemaCache'
import { detectSchemaPath } from './schemaDetection'
import { detectEntityTypeFromAttribute, getEntities } from './EntityDetector'
import type {
  ValidationResult,
  ValidationError,
  Fix,
  ParsedConstraints,
  TextRange
} from './types'
import type { TEIDocument, Passage } from '@/lib/tei/types'

export class Validator {
  private schemaCache: SchemaCache

  constructor(schemaCache: SchemaCache) {
    this.schemaCache = schemaCache
  }

  /**
   * Validate a tag application.
   *
   * @param passage - Passage containing the tag
   * @param range - Text range of the tag
   * @param tagName - Tag name (e.g., 'said', 'persName')
   * @param attributes - Attributes to apply
   * @param document - TEI document
   * @returns Validation result with errors, warnings, and fixes
   */
  validate(
    passage: Passage,
    range: TextRange,
    tagName: string,
    attributes: Record<string, string>,
    document: TEIDocument
  ): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: string[] = []
    const fixes: Fix[] = []

    // Get schema constraints
    const schemaPath = detectSchemaPath(document)
    let constraints: ParsedConstraints | null = null

    try {
      constraints = this.schemaCache.get(schemaPath)
    } catch (error) {
      // If schema parsing fails, we can't validate
      console.warn('Failed to load schema:', error)
      return { valid: true, errors: [], warnings: [], fixes: [] }
    }

    // Get tag constraints
    const tagConstraint = constraints.tags[tagName]
    if (!tagConstraint) {
      // Unknown tag - can't validate
      return { valid: true, errors: [], warnings: [], fixes: [] }
    }

    // Check required attributes
    this.checkRequiredAttributes(
      tagName,
      attributes,
      tagConstraint.requiredAttributes,
      document,
      passage,
      range,
      errors,
      fixes
    )

    // Check attribute types (IDREF validation)
    this.checkAttributeTypes(
      tagName,
      attributes,
      constraints,
      document,
      passage,
      range,
      errors,
      fixes
    )

    return {
      valid: errors.length === 0,
      errors,
      warnings: warnings.map(w => ({ type: 'warning', message: w })),
      fixes
    }
  }

  /**
   * Check that all required attributes are present.
   */
  private checkRequiredAttributes(
    tagName: string,
    attributes: Record<string, string>,
    requiredAttributes: string[],
    document: TEIDocument,
    passage: Passage,
    range: TextRange,
    errors: ValidationError[],
    fixes: Fix[]
  ): void {
    for (const attrName of requiredAttributes) {
      if (!attributes[attrName]) {
        // Missing required attribute
        errors.push({
          type: 'missing-required-attribute',
          attribute: attrName,
          message: `Required attribute '${attrName}' is missing`
        })

        // Generate fixes
        const attrFixes = this.generateFixesForMissingAttribute(
          tagName,
          attrName,
          document,
          passage,
          range
        )
        fixes.push(...attrFixes)
      }
    }
  }

  /**
   * Generate fixes for a missing required attribute.
   */
  private generateFixesForMissingAttribute(
    tagName: string,
    attrName: string,
    document: TEIDocument,
    _passage: Passage,
    _range: TextRange
  ): Fix[] {
    const fixes: Fix[] = []

    // Check if this is an IDREF attribute
    const entityType = detectEntityTypeFromAttribute(tagName, attrName)
    const entities = getEntities(document, entityType)

    // If we have entities, suggest them
    if (entities.length > 0) {
      fixes.push({
        type: 'add-attribute',
        attribute: attrName,
        suggestedValues: entities.map(e => e.id),
        entityType,
        label: `Add @${attrName} with existing ${entityType}`
      })
    } else {
      // No entities exist, suggest creating one
      fixes.push({
        type: 'create-entity',
        entityType,
        attribute: attrName,
        label: `Create new ${entityType} for @${attrName}`
      })
    }

    return fixes
  }

  /**
   * Check attribute types (IDREF validation).
   */
  private checkAttributeTypes(
    tagName: string,
    attributes: Record<string, string>,
    constraints: ParsedConstraints,
    document: TEIDocument,
    passage: Passage,
    range: TextRange,
    errors: ValidationError[],
    fixes: Fix[]
  ): void {
    for (const [attrName, attrValue] of Object.entries(attributes)) {
      const attrKey = `${tagName}.${attrName}`
      const attrConstraint = constraints.attributes[attrKey]

      if (!attrConstraint) {
        continue
      }

      // Check IDREF attributes
      if (attrConstraint.type === 'IDREF') {
        this.validateIDREF(
          tagName,
          attrName,
          attrValue,
          document,
          passage,
          range,
          errors,
          fixes
        )
      }

      // Check enumerated values
      if (attrConstraint.type === 'enumerated' && attrConstraint.allowedValues) {
        if (!attrConstraint.allowedValues.includes(attrValue)) {
          errors.push({
            type: 'invalid-attribute-value',
            attribute: attrName,
            value: attrValue,
            message: `Invalid value '${attrValue}' for attribute '${attrName}'. ` +
              `Allowed values: ${attrConstraint.allowedValues.join(', ')}`
          })

          fixes.push({
            type: 'change-attribute',
            attribute: attrName,
            suggestedValues: attrConstraint.allowedValues,
            label: `Change @${attrName} to valid value`
          })
        }
      }
    }
  }

  /**
   * Validate that an IDREF references an existing entity.
   */
  private validateIDREF(
    tagName: string,
    attrName: string,
    attrValue: string,
    _document: TEIDocument,
    _passage: Passage,
    _range: TextRange,
    errors: ValidationError[],
    fixes: Fix[]
  ): void {
    // Strip leading '#' if present
    const referenceId = attrValue.startsWith('#')
      ? attrValue.substring(1)
      : attrValue

    // Detect entity type
    const entityType = detectEntityTypeFromAttribute(tagName, attrName)
    const entities = getEntities(_document, entityType)

    // Check if referenced entity exists
    const exists = entities.some(e => {
      // Check both id and xmlId
      return e.id === referenceId || ('xmlId' in e && e.xmlId === referenceId)
    })

    if (!exists) {
      errors.push({
        type: 'invalid-idref',
        attribute: attrName,
        value: attrValue,
        message: `Referenced ${entityType} '${attrValue}' not found`
      })

      // Suggest existing entities
      if (entities.length > 0) {
        fixes.push({
          type: 'change-attribute',
          attribute: attrName,
          suggestedValues: entities.map(e => `#${e.id}`),
          entityType,
          label: `Change @${attrName} to existing ${entityType}`
        })
      } else {
        // Suggest creating new entity
        fixes.push({
          type: 'create-entity',
          entityType,
          attribute: attrName,
          label: `Create new ${entityType} for @${attrName}`
        })
      }
    }
  }
}
