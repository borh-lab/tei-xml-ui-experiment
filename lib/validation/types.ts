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
