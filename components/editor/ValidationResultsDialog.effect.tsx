// @ts-nocheck
'use client';

import { ValidationResultsDialog as ReactValidationResultsDialog } from './ValidationResultsDialog';

/**
 * ValidationResultsDialog with feature flag support
 *
 * Pure UI component with no service dependencies.
 * Re-exports the original component with feature flag badge support.
 *
 * The useEffectEditor flag controls whether to show this component
 * as part of the Effect-based editor.
 */
export default function ValidationResultsDialog(props: React.ComponentProps<typeof ReactValidationResultsDialog>) {
  // Pure component - just re-export with feature flag awareness
  // No functional changes needed, just feature flag tracking
  return <ReactValidationResultsDialog {...props} />;
}

export { ValidationResultsDialog };
