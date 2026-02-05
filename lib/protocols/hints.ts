import type { Hint, Action } from '@/lib/values/Hint';
import { createValidHint, createWarningHint, createInvalidHint } from '@/lib/values/Hint';
import type { ValidationResult } from '@/lib/validation/types';

export function generateHint(validation: ValidationResult, tagType: string): Hint {
  // Check errors first (highest priority)
  const firstError = validation.errors[0];
  if (firstError) {
    return generateHintFromError(firstError, tagType, validation.fixes);
  }

  // Check warnings
  if (validation.warnings.length > 0) {
    return createWarningHint(validation.warnings[0].message, validation.warnings[0].type);
  }

  // All good - valid hint
  return createValidHint(`Ready to apply <${tagType}> tag`);
}

function generateHintFromError(
  error: import('@/lib/validation/types').ValidationError,
  tagType: string,
  fixes: import('@/lib/validation/types').Fix[]
): Hint {
  switch (error.type) {
    case 'missing-required-attribute':
      return createInvalidHint(
        `Missing required attribute: ${error.attribute}`,
        'MISSING_ATTRIBUTE',
        createFixAction(fixes[0])
      );
    case 'invalid-idref':
      return createInvalidHint(
        `Invalid ${error.attribute} reference: ${error.value}`,
        'INVALID_IDREF',
        createFixAction(fixes[0])
      );
    case 'splits-existing-tag':
      return createInvalidHint(
        'Selection would split an existing tag',
        'SPLITS_TAG',
        { type: 'expand-selection', label: 'Expand selection to include full tag' }
      );
    default:
      return createInvalidHint(error.message || 'Cannot apply tag', error.type || 'UNKNOWN_ERROR');
  }
}

function createFixAction(fix?: import('@/lib/validation/types').Fix): Action | undefined {
  if (!fix) return undefined;
  switch (fix.type) {
    case 'add-attribute':
      return {
        type: 'add-attribute',
        attributes: fix.attribute ? { [fix.attribute]: fix.value || '' } : undefined,
        label: fix.label,
      };
    case 'expand-selection':
      return { type: 'expand-selection', label: fix.label };
    default:
      return undefined;
  }
}

export function getSeverityLevel(hint: Hint): number {
  switch (hint.severity) {
    case 'invalid':
      return 2;
    case 'warning':
      return 1;
    case 'valid':
      return 0;
  }
}
