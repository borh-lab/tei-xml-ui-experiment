import { generateHint, getSeverityLevel } from '@/lib/protocols/hints';
import type { ValidationResult } from '@/lib/validation/types';

describe('generateHint protocol', () => {
  it('should generate valid hint', () => {
    const validation: ValidationResult = { valid: true, errors: [], warnings: [], fixes: [] };
    const hint = generateHint(validation, 'said');
    expect(hint.severity).toBe('valid');
    expect(hint.message).toContain('Ready to apply');
    expect(hint.code).toBe('VALID');
  });

  it('should generate invalid hint for missing attribute', () => {
    const validation: ValidationResult = {
      valid: false,
      errors: [
        {
          type: 'missing-required-attribute',
          attribute: 'who',
          message: 'Missing who',
        },
      ],
      warnings: [],
      fixes: [{ type: 'add-attribute', attribute: 'who', label: 'Add who' }],
    };
    const hint = generateHint(validation, 'said');
    expect(hint.severity).toBe('invalid');
    expect(hint.code).toBe('MISSING_ATTRIBUTE');
    expect(hint.message).toContain('who');
    expect(hint.suggestedAction).toBeDefined();
  });

  it('should generate invalid hint for invalid idref', () => {
    const validation: ValidationResult = {
      valid: false,
      errors: [
        {
          type: 'invalid-idref',
          attribute: 'who',
          value: 'char-999',
          message: 'Referenced character not found',
        },
      ],
      warnings: [],
      fixes: [{ type: 'change-attribute', attribute: 'who', label: 'Change who' }],
    };
    const hint = generateHint(validation, 'said');
    expect(hint.severity).toBe('invalid');
    expect(hint.code).toBe('INVALID_IDREF');
    expect(hint.message).toContain('char-999');
  });

  it('should generate invalid hint for splits tag error', () => {
    const validation: ValidationResult = {
      valid: false,
      errors: [
        {
          type: 'splits-existing-tag',
          message: 'Selection would split an existing tag',
        },
      ],
      warnings: [],
      fixes: [{ type: 'expand-selection', label: 'Expand selection' }],
    };
    const hint = generateHint(validation, 'said');
    expect(hint.severity).toBe('invalid');
    expect(hint.code).toBe('SPLITS_TAG');
  });

  it('should generate warning hint', () => {
    const validation: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [{ type: 'warning', message: 'This is a warning' }],
      fixes: [],
    };
    const hint = generateHint(validation, 'said');
    expect(hint.severity).toBe('warning');
    expect(hint.code).toBe('warning');
    expect(hint.message).toBe('This is a warning');
  });

  it('should get severity level', () => {
    const validHint = generateHint({ valid: true, errors: [], warnings: [], fixes: [] }, 'said');
    expect(getSeverityLevel(validHint)).toBe(0);

    const invalidHint = generateHint(
      {
        valid: false,
        errors: [{ type: 'missing-required-attribute', attribute: 'who', message: 'Missing' }],
        warnings: [],
        fixes: [],
      },
      'said'
    );
    expect(getSeverityLevel(invalidHint)).toBe(2);
  });
});
