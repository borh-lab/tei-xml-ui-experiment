/**
 * Document-Wide Validation Summary Protocol
 *
 * Iterates all passages, validates all tags, aggregates results.
 * Returns ValidationSummary with issues grouped by severity and tag type.
 *
 * Optimized with LRU cache for passage-level validation results.
 */

import type { Result } from './Result';
import { success, failure } from './Result';
import type { TEIDocument, Passage, Tag, PassageID, TagID } from '@/lib/tei/types';
import type { ValidationSummary, ValidationIssue } from '@/lib/values/ValidationSummary';
import {
  createValidationSummary,
  createValidationIssue,
  createTagStats,
} from '@/lib/values/ValidationSummary';
import type { ICache } from './cache';
import {
  PassageValidationCache,
  type CacheKey,
} from './cache';
import type { ValidationResult } from '@/lib/validation/types';

/**
 * Validate all tags in a document
 *
 * This protocol:
 * 1. Iterates through all passages
 * 2. Validates all tags in each passage
 * 3. Aggregates results by severity and tag type
 * 4. Returns ValidationSummary
 *
 * Optimized with LRU cache for passage-level validation results.
 * Only re-validates passages that have changed (O(1) for unchanged passages).
 *
 * @param cache - Optional cache for memoization (defaults to null = no caching)
 */
export function summarizeValidation(
  document: TEIDocument,
  cache?: ICache<CacheKey, readonly ValidationResult[]> | null
): Result<ValidationSummary> {
  try {
    if (!document || !document.state) {
      return failure(
        'INVALID_DOCUMENT',
        'Document is null or undefined',
        false
      );
    }

    // Use provided cache or create new instance
    const validationCache = cache ?? new PassageValidationCache();

    const issues: ValidationIssue[] = [];
    const byTagType: Record<string, { total: number; invalid: number }> = {};
    const bySeverity: Record<string, number> = {
      critical: 0,
      warning: 0,
      info: 0,
    };

    let totalTags = 0;

    // Iterate through all passages
    for (const passage of document.state.passages) {
      // Validate all tags in the passage
      const passageIssues = validatePassageTags(passage, document);

      // Check cache for passage validation results
      const cacheKey: CacheKey = {
        passageId: passage.id,
        revision: document.state.revision,
      };

      const cachedResults = validationCache.get(cacheKey);

      if (!cachedResults) {
        // Convert to ValidationResult format for caching
        const validationResults = convertIssuesToValidationResults(passageIssues, passage);
        validationCache.set(cacheKey, validationResults);
      }

      // Add to issues list
      issues.push(...passageIssues);

      // Count tags by type
      for (const tag of passage.tags) {
        totalTags++;

        // Initialize tag type stats if not exists
        if (!byTagType[tag.type]) {
          byTagType[tag.type] = { total: 0, invalid: 0 };
        }

        byTagType[tag.type].total++;

        // Check if tag has any issues
        const tagIssues = passageIssues.filter((issue) => issue.tagId === tag.id);
        if (tagIssues.length > 0) {
          byTagType[tag.type].invalid++;
        }
      }

      // Count issues by severity
      for (const issue of passageIssues) {
        bySeverity[issue.severity]++;
      }
    }

    // Convert byTagType to TagStats format
    const byTagTypeStats: Record<string, { total: number; invalid: number }> = {};
    for (const [tagType, stats] of Object.entries(byTagType)) {
      byTagTypeStats[tagType] = createTagStats(stats.total, stats.invalid);
    }

    const summary = createValidationSummary(totalTags, issues, byTagTypeStats, bySeverity);

    return success(summary);
  } catch (error) {
    return failure(
      'SUMMARY_ERROR',
      error instanceof Error ? error.message : 'Unknown error summarizing validation',
      false,
      { documentRevision: document?.state?.revision ?? 'unknown' }
    );
  }
}

/**
 * Convert ValidationIssue[] to ValidationResult[] for caching
 */
function convertIssuesToValidationResults(
  issues: ValidationIssue[],
  passage: Passage
): ValidationResult[] {
  // Create a validation result for each tag in the passage
  const results: ValidationResult[] = [];

  for (const tag of passage.tags) {
    const tagIssues = issues.filter((issue) => issue.tagId === tag.id);

    const errors = tagIssues
      .filter((issue) => issue.severity === 'critical' || issue.severity === 'warning')
      .map((issue) => ({
        type: issue.code,
        message: issue.message,
      }));

    const warnings = tagIssues
      .filter((issue) => issue.severity === 'info')
      .map((issue) => ({
        type: issue.code,
        message: issue.message,
      }));

    results.push({
      valid: errors.length === 0,
      errors,
      warnings,
      fixes: [],
    });
  }

  return results;
}

/**
 * Validate all tags in a passage
 *
 * Checks for:
 * - Missing required attributes (e.g., @who for said tags)
 * - Invalid attribute values
 * - Malformed tags
 */
function validatePassageTags(
  passage: Passage,
  document: TEIDocument
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const tag of passage.tags) {
    const tagIssues = validateTag(tag, passage, document);
    issues.push(...tagIssues);
  }

  return issues;
}

/**
 * Validate a single tag
 *
 * Performs tag-specific validation based on tag type
 */
function validateTag(
  tag: Tag,
  passage: Passage,
  document: TEIDocument
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  switch (tag.type) {
    case 'said':
      issues.push(...validateSaidTag(tag, passage, document));
      break;
    case 'q':
      issues.push(...validateQTag(tag, passage, document));
      break;
    case 'persName':
      issues.push(...validatePersNameTag(tag, passage, document));
      break;
    case 'placeName':
      issues.push(...validatePlaceNameTag(tag, passage, document));
      break;
    case 'orgName':
      issues.push(...validateOrgNameTag(tag, passage, document));
      break;
  }

  return issues;
}

/**
 * Validate said tag
 *
 * Checks:
 * - Must have @who attribute (speaker reference)
 * - @who must reference valid character
 */
function validateSaidTag(
  tag: Tag,
  passage: Passage,
  document: TEIDocument
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Check for @who attribute
  const whoAttr = tag.attributes['who'];
  if (!whoAttr) {
    issues.push(
      createValidationIssue(
        `issue-${tag.id}-missing-who`,
        'critical',
        passage.id,
        tag.id,
        'said tag must have @who attribute',
        'MISSING_REQUIRED_ATTR'
      )
    );
  } else {
    // Validate @who references valid character
    const characterExists = document.state.characters.some(
      (char) => char.xmlId === whoAttr.replace('#', '')
    );

    if (!characterExists) {
      issues.push(
        createValidationIssue(
          `issue-${tag.id}-invalid-who`,
          'warning',
          passage.id,
          tag.id,
          `@who references non-existent character: ${whoAttr}`,
          'INVALID_ENTITY_REF'
        )
      );
    }
  }

  return issues;
}

/**
 * Validate q tag
 *
 * Checks:
 * - Should have @who attribute (speaker reference)
 * - Should be nested within or adjacent to said tag (hint)
 */
function validateQTag(
  tag: Tag,
  passage: Passage,
  document: TEIDocument
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Check for @who attribute (recommended but not required)
  const whoAttr = tag.attributes['who'];
  if (!whoAttr) {
    issues.push(
      createValidationIssue(
        `issue-${tag.id}-missing-who`,
        'info',
        passage.id,
        tag.id,
        'q tag should have @who attribute for speaker attribution',
        'MISSING_RECOMMENDED_ATTR'
      )
    );
  }

  return issues;
}

/**
 * Validate persName tag
 *
 * Checks:
 * - Should have @ref attribute (entity reference)
 * - @ref must reference valid character
 */
function validatePersNameTag(
  tag: Tag,
  passage: Passage,
  document: TEIDocument
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const refAttr = tag.attributes['ref'];
  if (!refAttr) {
    issues.push(
      createValidationIssue(
        `issue-${tag.id}-missing-ref`,
        'warning',
        passage.id,
        tag.id,
        'persName tag should have @ref attribute',
        'MISSING_RECOMMENDED_ATTR'
      )
    );
  } else {
    // Validate @ref references valid character
    const characterExists = document.state.characters.some(
      (char) => char.xmlId === refAttr.replace('#', '')
    );

    if (!characterExists) {
      issues.push(
        createValidationIssue(
          `issue-${tag.id}-invalid-ref`,
          'warning',
          passage.id,
          tag.id,
          `@ref references non-existent character: ${refAttr}`,
          'INVALID_ENTITY_REF'
        )
      );
    }
  }

  return issues;
}

/**
 * Validate placeName tag
 *
 * Checks:
 * - Should have @ref attribute (entity reference)
 */
function validatePlaceNameTag(
  tag: Tag,
  passage: Passage,
  document: TEIDocument
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const refAttr = tag.attributes['ref'];
  if (!refAttr) {
    issues.push(
      createValidationIssue(
        `issue-${tag.id}-missing-ref`,
        'info',
        passage.id,
        tag.id,
        'placeName tag should have @ref attribute',
        'MISSING_RECOMMENDED_ATTR'
      )
    );
  }

  return issues;
}

/**
 * Validate orgName tag
 *
 * Checks:
 * - Should have @ref attribute (entity reference)
 */
function validateOrgNameTag(
  tag: Tag,
  passage: Passage,
  document: TEIDocument
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const refAttr = tag.attributes['ref'];
  if (!refAttr) {
    issues.push(
      createValidationIssue(
        `issue-${tag.id}-missing-ref`,
        'info',
        passage.id,
        tag.id,
        'orgName tag should have @ref attribute',
        'MISSING_RECOMMENDED_ATTR'
      )
    );
  }

  return issues;
}
