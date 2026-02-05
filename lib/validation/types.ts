/**
 * Schema-driven validation types
 */

// RelaxNG parser output
export interface ParsedConstraints {
  tags: Record<string, TagConstraint>;
  attributes: Record<string, AttributeConstraint>;
  contentModels: Record<string, ContentModel>;
}

// Tag constraint (from RelaxNG)
export interface TagConstraint {
  tagName: string;
  requiredAttributes: string[];
  optionalAttributes: string[];
  allowedParents: string[];
}

// Attribute constraint
export interface AttributeConstraint {
  name: string;
  type: AttributeType;
  required: boolean;
  allowedValues?: string[];
}

export type AttributeType = 'IDREF' | 'ID' | 'NCName' | 'string' | 'token' | 'enumerated';

// Content model (what tags can contain)
export interface ContentModel {
  textOnly: boolean; // Only text, no child tags
  mixedContent: boolean; // Text + specific child tags
  allowedChildren: string[]; // Tag names that can nest
}

// Entity types for IDREF validation
export type EntityType = 'character' | 'place' | 'organization';

// Entity mapping for IDREF detection
export interface EntityMapping {
  tagName?: string;
  attrName: string;
  entityType: EntityType;
}

// Tag queue types
export interface QueuedTag {
  readonly id: string;
  readonly tagType: string;
  readonly attributes: Record<string, string>;
  readonly passageId: string;
  readonly range: TextRange;
  readonly timestamp: number;
}

export interface TagQueueState {
  readonly pending: QueuedTag[];
  readonly applied: QueuedTag[];
  readonly failed: QueuedTag[];
}

// Validation result with fixes
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  fixes: Fix[];
}

export interface ValidationError {
  type: string;
  attribute?: string;
  value?: string;
  message: string;
  line?: number;
  column?: number;
  context?: string;
}

export interface ValidationWarning {
  type: string;
  message: string;
}

// Auto-fix (data, not function)
export interface Fix {
  type: 'add-attribute' | 'change-attribute' | 'create-entity' | 'expand-selection';
  attribute?: string;
  value?: string;
  entityType?: EntityType;
  entityId?: string;
  suggestedValues?: string[];
  expandedRange?: TextRange;
  label: string;
}

// Text range
export interface TextRange {
  start: number;
  end: number;
}

// Schema cache configuration
export interface SchemaCacheOptions {
  maxSize: number;
  ttl?: number;
}
