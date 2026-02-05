/**
 * Smart Selection - Parinfer-like XML Tag Boundary Detection
 *
 * Automatically adjusts user selections to maintain valid XML structure.
 * Inspired by Parinfer (https://shaunlebron.github.io/parinfer/)
 *
 * Key principles:
 * 1. Detect existing tag boundaries
 * 2. Snap selections to valid boundaries
 * 3. Maintain proper nesting (no overlapping tags)
 * 4. Minimal adjustments - change as little as possible
 * 5. Schema-aware - validate against TEI P5 constraints
 */

import type { Passage, Tag, TextRange, Character, TEIDocument } from '@/lib/tei/types';
import { SchemaCache } from '@/lib/validation/SchemaCache';
import { Validator } from '@/lib/validation/Validator';
import type { ValidationResult, Fix } from '@/lib/validation/types';

/**
 * Schema constraint definitions for TEI P5 tags
 */
export interface SchemaConstraint {
  tagName: string;
  requiredAttributes: string[];
  optionalAttributes: string[];
  attributeTypes: Record<string, 'IDREF' | 'ID' | 'string' | 'NCName'>;
  allowedParents?: string[];
  allowedChildren?: string[];
  disallowedAncestors?: string[];
}

/**
 * Singleton instances for schema-driven validation
 * Lazy initialization to avoid unnecessary overhead
 */
let schemaCacheInstance: SchemaCache | null = null;
let validatorInstance: Validator | null = null;

/**
 * Get or create the SchemaCache singleton
 */
function getSchemaCache(): SchemaCache {
  if (!schemaCacheInstance) {
    schemaCacheInstance = new SchemaCache({
      maxSize: 10, // Cache up to 10 schemas
      ttl: 1000 * 60 * 5, // 5 minutes
    });
  }
  return schemaCacheInstance;
}

/**
 * Get or create the Validator singleton
 */
function getValidator(): Validator {
  if (!validatorInstance) {
    validatorInstance = new Validator(getSchemaCache());
  }
  return validatorInstance;
}

/**
 * TEI P5 schema constraints for common dialogue tags
 * @deprecated Use the new schema-driven validator instead
 */
export const TEI_P5_CONSTRAINTS: Record<string, SchemaConstraint> = {
  said: {
    tagName: 'said',
    requiredAttributes: ['who'], // @who is required (speaker reference)
    optionalAttributes: ['corresp', 'source'],
    attributeTypes: {
      who: 'IDREF', // Must reference existing character ID
      corresp: 'IDREF',
      source: 'string',
    },
    disallowedAncestors: ['said', 'q'], // Can't nest <said> in <said> or <q>
  },
  q: {
    tagName: 'q',
    requiredAttributes: [],
    optionalAttributes: ['who', 'source', 'rend'],
    attributeTypes: {
      who: 'IDREF',
      source: 'string',
      rend: 'NCName',
    },
    disallowedAncestors: ['q', 'said'], // Can't nest <q> in <q> or <said>
  },
  persName: {
    tagName: 'persName',
    requiredAttributes: ['ref'], // @ref is required
    optionalAttributes: ['role', 'key', 'nymRef'],
    attributeTypes: {
      ref: 'IDREF', // Must reference existing character ID
      role: 'string',
      key: 'string',
      nymRef: 'IDREF',
    },
  },
  speaker: {
    tagName: 'speaker',
    requiredAttributes: [],
    optionalAttributes: ['who'],
    attributeTypes: {
      who: 'IDREF',
    },
  },
  stage: {
    tagName: 'stage',
    requiredAttributes: ['type'],
    optionalAttributes: ['who'],
    attributeTypes: {
      type: 'string',
      who: 'IDREF',
    },
  },
};

/**
 * Tag boundary represents the start or end of a tag in the text
 */
export interface TagBoundary {
  position: number;      // Character offset in passage content
  type: 'open' | 'close'; // Opening or closing tag
  tagName: string;        // Name of the tag (e.g., 'persName', 'said')
  tagId?: string;         // ID of the tag if it exists
  isOuter?: boolean;      // Is this the outer boundary of a tag pair
}

/**
 * Selection adjustment result
 */
export interface SelectionAdjustment {
  originalRange: TextRange;
  adjustedRange: TextRange;
  reason: string;
  snappedTo?: {
    start?: TagBoundary;
    end?: TagBoundary;
  };
}

/**
 * Schema validation result
 */
export interface SchemaValidationResult {
  valid: boolean;
  reason?: string;
  missingAttributes?: string[];
  invalidAttributes?: Record<string, string>;
  suggestions?: string[];
}

/**
 * Detect all tag boundaries in a passage
 *
 * @param passage - The passage to analyze
 * @returns Array of tag boundaries sorted by position
 */
export function detectTagBoundaries(passage: Passage): TagBoundary[] {
  const { tags } = passage;
  const boundaries: TagBoundary[] = [];

  for (const tag of tags) {
    // Each tag has both an opening and closing boundary
    boundaries.push({
      position: tag.range.start,
      type: 'open',
      tagName: tag.type,
      tagId: tag.id,
      isOuter: true,
    });

    boundaries.push({
      position: tag.range.end,
      type: 'close',
      tagName: tag.type,
      tagId: tag.id,
      isOuter: true,
    });
  }

  // Sort by position
  return boundaries.sort((a, b) => a.position - b.position);
}

/**
 * Find the nearest tag boundary to a position
 *
 * @param boundaries - Tag boundaries to search
 * @param position - Target position
 * @param type - Prefer 'open' or 'close' boundaries
 * @returns Nearest boundary or undefined
 */
export function findNearestBoundary(
  boundaries: TagBoundary[],
  position: number,
  type?: 'open' | 'close'
): TagBoundary | undefined {
  const filtered = type
    ? boundaries.filter(b => b.type === type)
    : boundaries;

  // Find closest boundary
  let nearest: TagBoundary | undefined;
  let minDistance = Infinity;

  for (const boundary of filtered) {
    const distance = Math.abs(boundary.position - position);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = boundary;
    }
  }

  // Only return if reasonably close (within 10 characters)
  return minDistance <= 10 ? nearest : undefined;
}

/**
 * Check if a selection would split an existing tag
 *
 * @param boundaries - Tag boundaries in the passage
 * @param range - Selection range to check
 * @returns True if selection would split a tag
 */
export function wouldSplitTag(boundaries: TagBoundary[], range: TextRange): boolean {
  const { start, end } = range;

  for (const boundary of boundaries) {
    // Check if boundary is inside selection (not at edges)
    if (boundary.position > start && boundary.position < end) {
      return true;
    }
  }

  return false;
}

/**
 * Find tags that would be overlapped by a selection
 *
 * @param boundaries - Tag boundaries in the passage
 * @param range - Selection range to check
 * @returns Tags that would be overlapped
 */
export function findOverlappingTags(
  boundaries: TagBoundary[],
  range: TextRange
): TagBoundary[] {
  const { start, end } = range;
  const overlapping: TagBoundary[] = [];

  for (const boundary of boundaries) {
    // Tag starts before selection and ends inside/after selection
    if (boundary.type === 'open' && boundary.position < start) {
      const closeBoundary = boundaries.find(
        b => b.tagId === boundary.tagId && b.type === 'close'
      );
      if (closeBoundary && closeBoundary.position > start) {
        overlapping.push(boundary, closeBoundary);
      }
    }
  }

  return overlapping;
}

/**
 * Snap a selection to the nearest valid tag boundaries
 * (Parinfer-like smart adjustment)
 *
 * Strategy:
 * 1. Check if selection would split existing tags
 * 2. If yes, expand to outer boundaries
 * 3. Prefer minimal adjustments
 *
 * @param passage - The passage containing the selection
 * @param range - Original selection range
 * @returns Adjusted selection with reason
 */
export function snapToTagBoundaries(
  passage: Passage,
  range: TextRange
): SelectionAdjustment {
  const boundaries = detectTagBoundaries(passage);
  const { start, end } = range;

  // Check if selection would split tags
  if (wouldSplitTag(boundaries, range)) {
    // Find overlapping tags
    const overlapping = findOverlappingTags(boundaries, range);

    if (overlapping.length > 0) {
      // Expand to include full tags
      const newStart = Math.min(
        start,
        ...overlapping.filter(b => b.type === 'open').map(b => b.position)
      );
      const newEnd = Math.max(
        end,
        ...overlapping.filter(b => b.type === 'close').map(b => b.position)
      );

      return {
        originalRange: range,
        adjustedRange: { start: newStart, end: newEnd },
        reason: 'Selection expanded to include complete tag(s)',
        snappedTo: {
          start: overlapping.find(b => b.type === 'open' && b.position === newStart),
          end: overlapping.find(b => b.type === 'close' && b.position === newEnd),
        },
      };
    }
  }

  // Snap start to nearest opening boundary (if close)
  const startBoundary = findNearestBoundary(boundaries, start, 'open');
  const endBoundary = findNearestBoundary(boundaries, end, 'close');

  let adjustedStart = start;
  let adjustedEnd = end;
  let reason: string | undefined;
  const snappedTo: SelectionAdjustment['snappedTo'] = {};

  // Only snap if it improves the selection (avoids splitting tags)
  if (startBoundary && Math.abs(startBoundary.position - start) <= 5) {
    // Check if snapping would avoid splitting a tag
    const wouldSplitOriginal = wouldSplitTag(boundaries, range);
    const wouldSplitSnapped = wouldSplitTag(boundaries, {
      start: startBoundary.position,
      end,
    });

    if (!wouldSplitSnapped && wouldSplitOriginal) {
      adjustedStart = startBoundary.position;
      reason = 'Selection snapped to avoid splitting tag';
      snappedTo.start = startBoundary;
    }
  }

  if (endBoundary && Math.abs(endBoundary.position - end) <= 5) {
    const wouldSplitOriginal = wouldSplitTag(boundaries, {
      start,
      end,
    });
    const wouldSplitSnapped = wouldSplitTag(boundaries, {
      start,
      end: endBoundary.position,
    });

    if (!wouldSplitSnapped && wouldSplitOriginal) {
      adjustedEnd = endBoundary.position;
      if (!reason) reason = 'Selection snapped to avoid splitting tag';
      snappedTo.end = endBoundary;
    }
  }

  // Return adjusted or original selection
  if (adjustedStart !== start || adjustedEnd !== end) {
    return {
      originalRange: range,
      adjustedRange: { start: adjustedStart, end: adjustedEnd },
      reason: reason || 'Selection snapped to nearest tag boundary',
      snappedTo,
    };
  }

  // No adjustment needed
  return {
    originalRange: range,
    adjustedRange: range,
    reason: 'Selection is valid',
  };
}

/**
 * Validate if a selection can have a tag applied
 *
 * Checks:
 * 1. Selection doesn't split existing tags
 * 2. Selection doesn't create overlapping same-type tags
 * 3. Selection is within passage bounds
 *
 * @param passage - The passage containing the selection
 * @param range - Selection range to validate
 * @param tagType - Type of tag to apply
 * @returns Validation result
 */
export function validateSelection(
  passage: Passage,
  range: TextRange,
  tagType: string
): {
  valid: boolean;
  reason?: string;
  adjustment?: SelectionAdjustment;
} {
  const { content } = passage;
  const { start, end } = range;

  // Check bounds
  if (start < 0 || end > content.length || start >= end) {
    return {
      valid: false,
      reason: 'Selection is out of bounds',
    };
  }

  // Check for existing tags of same type in selection
  const existingSameType = passage.tags.filter(
    t => t.type === tagType && t.range.start >= start && t.range.end <= end
  );

  if (existingSameType.length > 0) {
    return {
      valid: false,
      reason: `Selection already contains ${tagType} tag(s)`,
    };
  }

  // Check if selection would split tags
  const boundaries = detectTagBoundaries(passage);
  if (wouldSplitTag(boundaries, range)) {
    // Try to snap to boundaries
    const adjustment = snapToTagBoundaries(passage, range);

    if (adjustment.adjustedRange.start !== start ||
        adjustment.adjustedRange.end !== end) {
      return {
        valid: false,
        reason: 'Selection would split existing tag(s)',
        adjustment,
      };
    }
  }

  return { valid: true };
}

/**
 * Validate selection against TEI P5 schema constraints
 *
 * Now uses the new schema-driven validator internally while maintaining
 * backward compatibility with the existing function signature.
 *
 * Checks if a tag can be safely applied given:
 * - Required attributes
 * - Attribute value formats
 * - Allowed nesting contexts
 *
 * @param passage - The passage containing the selection
 * @param range - Selection range
 * @param tagType - Type of tag to apply
 * @param providedAttrs - Attributes that will be provided (if any)
 * @param document - Full document (for character ID validation)
 * @returns Schema validation result
 */
export function validateAgainstSchema(
  passage: Passage,
  range: TextRange,
  tagType: string,
  providedAttrs: Record<string, string> = {},
  document?: { state: { characters?: Character[] } }
): SchemaValidationResult {
  // Try to use the new schema-driven validator
  try {
    // Check if document has the required structure for the new Validator
    const teiDoc = document as any;
    const hasTEIHeader = teiDoc?.teiHeader !== undefined;
    const hasText = teiDoc?.text !== undefined;

    // The new Validator requires a proper TEIDocument structure
    // If we don't have it, fall back to legacy validation
    if (!hasTEIHeader || !hasText) {
      return validateAgainstSchemaLegacy(passage, range, tagType, providedAttrs, document);
    }

    // Use the new Validator
    const teiDocument = teiDoc as TEIDocument;
    const validator = getValidator();
    const newResult: ValidationResult = validator.validate(
      passage,
      range,
      tagType,
      providedAttrs,
      teiDocument
    );

    // Map new ValidationResult to old SchemaValidationResult format
    return mapValidationResult(newResult);
  } catch (error) {
    // If schema validation fails (e.g., schema not found, parse error),
    // fall back to legacy constraints
    console.warn('Schema validation failed, falling back to legacy constraints:', error);
    return validateAgainstSchemaLegacy(passage, range, tagType, providedAttrs, document);
  }
}

/**
 * Map new ValidationResult format to old SchemaValidationResult format
 * for backward compatibility
 */
function mapValidationResult(newResult: ValidationResult): SchemaValidationResult {
  if (newResult.valid) {
    return { valid: true };
  }

  const missingAttrs: string[] = [];
  const invalidAttrs: Record<string, string> = {};
  const suggestions: string[] = [];

  // Process errors
  for (const error of newResult.errors) {
    if (error.type === 'missing-required-attribute' && error.attribute) {
      missingAttrs.push(error.attribute);
    } else if (error.type === 'invalid-idref' && error.attribute) {
      invalidAttrs[error.attribute] = error.message;
    } else if (error.type === 'invalid-attribute-value' && error.attribute) {
      invalidAttrs[error.attribute] = error.message;
    }
  }

  // Process fixes to generate suggestions
  for (const fix of newResult.fixes) {
    suggestions.push(fix.label);
    if (fix.type === 'add-attribute' && fix.suggestedValues) {
      if (fix.suggestedValues.length > 0) {
        suggestions.push(`Suggested values: ${fix.suggestedValues.slice(0, 3).join(', ')}${fix.suggestedValues.length > 3 ? '...' : ''}`);
      }
    }
  }

  // Get the first error message as the reason
  const reason = newResult.errors.length > 0 ? newResult.errors[0].message : undefined;

  return {
    valid: false,
    reason,
    missingAttributes: missingAttrs.length > 0 ? missingAttrs : undefined,
    invalidAttributes: Object.keys(invalidAttrs).length > 0 ? invalidAttrs : undefined,
    suggestions: suggestions.length > 0 ? suggestions : undefined,
  };
}

/**
 * Legacy validation using hardcoded TEI_P5_CONSTRAINTS
 * @deprecated Use the new schema-driven validator instead
 */
function validateAgainstSchemaLegacy(
  passage: Passage,
  range: TextRange,
  tagType: string,
  providedAttrs: Record<string, string> = {},
  document?: { state: { characters?: Character[] } }
): SchemaValidationResult {
  // Get schema constraints for this tag
  const constraints = TEI_P5_CONSTRAINTS[tagType];
  if (!constraints) {
    // Unknown tag - assume it's valid (no constraints defined)
    return { valid: true };
  }

  const errors: string[] = [];
  const warnings: string[] = [];
  const missingAttrs: string[] = [];
  const suggestions: string[] = [];
  const invalidAttrs: Record<string, string> = {};

  // Check required attributes
  for (const required of constraints.requiredAttributes) {
    if (!(required in providedAttrs)) {
      missingAttrs.push(required);
    }
  }

  if (missingAttrs.length > 0) {
    errors.push(
      `Tag <${tagType}> requires attribute(s): ${missingAttrs.join(', ')}`
    );

    // Generate helpful suggestions
    if (tagType === 'said' && missingAttrs.includes('who')) {
      suggestions.push('Select a character speaker from the entity panel');
      if (document?.state?.characters?.length) {
        const charNames = document.state.characters
          .map(c => c.name)
          .slice(0, 3)
          .join(', ');
        if (charNames) {
          suggestions.push(`Available speakers: ${charNames}...`);
        }
      }
    }

    if (tagType === 'persName' && missingAttrs.includes('ref')) {
      suggestions.push('Select a character reference from the entity panel');
      if (document?.state?.characters?.length) {
        const charNames = document.state.characters
          .map(c => c.name)
          .slice(0, 3)
          .join(', ');
        if (charNames) {
          suggestions.push(`Available characters: ${charNames}...`);
        }
      }
    }
  }

  // Check if provided attributes have correct format
  for (const [attr, value] of Object.entries(providedAttrs)) {
    const attrType = constraints.attributeTypes[attr];
    if (!attrType) continue;

    if (attrType === 'IDREF') {
      // Check if referenced ID exists
      if (attr === 'who' || attr === 'ref') {
        const charId = value.replace('#', '');
        const character = document?.state?.characters?.find(c => c.id === charId);

        if (!character) {
          invalidAttrs[attr] = `Referenced character "${value}" not found`;
          suggestions.push(`Create character "${charId}" first, or select existing character`);
        }
      }
    }
  }

  // Check nesting context (disallowed ancestors)
  if (constraints.disallowedAncestors && constraints.disallowedAncestors.length > 0) {
    const overlappingTags = passage.tags.filter(
      t => t.range.start <= range.start && t.range.end >= range.end
    );

    for (const tag of overlappingTags) {
      if (constraints.disallowedAncestors.includes(tag.type)) {
        errors.push(
          `Tag <${tagType}> cannot be nested inside <${tag.type}>`
        );
        suggestions.push(`Apply <${tagType}> outside of the <${tag.type}> tag`);
      }
    }
  }

  // Return validation result
  if (errors.length > 0 || Object.keys(invalidAttrs).length > 0) {
    return {
      valid: false,
      reason: errors[0],
      missingAttributes: missingAttrs,
      invalidAttributes: invalidAttrs,
      suggestions,
    };
  }

  return {
    valid: true,
  };
}

/**
 * Parinfer-like smart selection adjustment
 *
 * Automatically adjusts selection to maintain valid XML structure,
 * similar to how Parinfer maintains balanced parentheses.
 *
 * @param passage - The passage containing the selection
 * @param range - User's selected range
 * @param tagType - Type of tag being applied
 * @returns Adjusted selection with explanation
 */
export function smartSelectionAdjust(
  passage: Passage,
  range: TextRange,
  tagType?: string
): SelectionAdjustment {
  // First, validate the selection
  const validation = tagType
    ? validateSelection(passage, range, tagType)
    : { valid: true };

  if (validation.valid) {
    // Selection is valid, but check if we can improve it
    const boundaries = detectTagBoundaries(passage);

    // Snap to boundaries if it creates a cleaner selection
    const startBoundary = findNearestBoundary(boundaries, range.start, 'open');
    const endBoundary = findNearestBoundary(boundaries, range.end, 'close');

    if (startBoundary && endBoundary) {
      const snapStart = Math.abs(startBoundary.position - range.start) <= 3;
      const snapEnd = Math.abs(endBoundary.position - range.end) <= 3;

      if (snapStart || snapEnd) {
        return {
          originalRange: range,
          adjustedRange: {
            start: snapStart ? startBoundary.position : range.start,
            end: snapEnd ? endBoundary.position : range.end,
          },
          reason: 'Selection snapped to tag boundaries for cleaner markup',
          snappedTo: {
            start: snapStart ? startBoundary : undefined,
            end: snapEnd ? endBoundary : undefined,
          },
        };
      }
    }

    // No adjustment needed
    return {
      originalRange: range,
      adjustedRange: range,
      reason: 'Selection is valid',
    };
  }

  // Selection is invalid, return suggested adjustment
  if (validation.adjustment) {
    return validation.adjustment;
  }

  // Default: try to snap to boundaries
  return snapToTagBoundaries(passage, range);
}

/**
 * Schema-aware smart selection (combines structural + schema validation)
 *
 * Validates both:
 * 1. Structural integrity (tag boundaries, nesting)
 * 2. Schema constraints (required attributes, IDREFs, nesting rules)
 *
 * @param passage - The passage containing the selection
 * @param range - User's selected range
 * @param tagType - Type of tag to apply
 * @param providedAttrs - Attributes that will be provided (if any)
 * @param document - Full document (for character/entity validation)
 * @returns Enhanced selection adjustment with schema validation
 */
export function schemaAwareSmartSelection(
  passage: Passage,
  range: TextRange,
  tagType: string,
  providedAttrs: Record<string, string> = {},
  document?: { state: { characters?: Character[] } }
): SelectionAdjustment & SchemaValidationResult {
  // Step 1: Structural validation (existing logic)
  const structuralValidation = validateSelection(passage, range, tagType);

  if (!structuralValidation.valid) {
    return {
      ...structuralValidation.adjustment || snapToTagBoundaries(passage, range),
      valid: false,
      reason: structuralValidation.reason,
    };
  }

  // Step 2: Schema validation (new)
  const schemaValidation = validateAgainstSchema(
    passage,
    range,
    tagType,
    providedAttrs,
    document
  );

  if (!schemaValidation.valid) {
    // Schema validation failed - still adjust range structurally if needed
    const adjustment = snapToTagBoundaries(passage, range);

    return {
      ...adjustment,
      valid: false,
      reason: schemaValidation.reason || adjustment.reason,
      missingAttributes: schemaValidation.missingAttributes,
      invalidAttributes: schemaValidation.invalidAttributes,
      suggestions: schemaValidation.suggestions,
    };
  }

  // Both validations passed
  return {
    originalRange: range,
    adjustedRange: range,
    reason: 'Selection is valid (structurally and for schema)',
    valid: true,
  };
}
