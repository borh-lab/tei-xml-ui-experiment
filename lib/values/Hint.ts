// lib/values/Hint.ts
export interface Action {
  readonly type: 'apply-tag' | 'add-attribute' | 'expand-selection';
  readonly tagType?: string;
  readonly attributes?: Record<string, string>;
  readonly label: string;
}

export interface Hint {
  readonly severity: 'valid' | 'warning' | 'invalid';
  readonly message: string;
  readonly code: string;
  readonly suggestedAction?: Action;
}

export function createHint(
  severity: Hint['severity'],
  message: string,
  code: string,
  suggestedAction?: Action
): Hint {
  return { severity, message, code, suggestedAction };
}

export function createValidHint(message: string = 'Ready to apply tag'): Hint {
  return createHint('valid', message, 'VALID');
}

export function createWarningHint(message: string, code: string, suggestedAction?: Action): Hint {
  return createHint('warning', message, code, suggestedAction);
}

export function createInvalidHint(message: string, code: string, suggestedAction?: Action): Hint {
  return createHint('invalid', message, code, suggestedAction);
}

export function getHintClass(hint: Hint): string {
  switch (hint.severity) {
    case 'valid': return 'hint-valid';
    case 'warning': return 'hint-warning';
    case 'invalid': return 'hint-invalid';
  }
}
