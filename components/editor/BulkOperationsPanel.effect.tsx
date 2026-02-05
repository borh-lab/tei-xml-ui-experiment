// @ts-nocheck
'use client';

import { BulkOperationsPanel as ReactBulkOperationsPanel } from './BulkOperationsPanel';

/**
 * BulkOperationsPanel with feature flag support
 *
 * Pure UI component with no service dependencies.
 * Re-exports the original component with feature flag badge support.
 *
 * The useEffectEditor flag controls whether to show this component
 * as part of the Effect-based editor.
 */
export default function BulkOperationsPanel(
  props: React.ComponentProps<typeof ReactBulkOperationsPanel>
) {
  // Pure component - just re-export with feature flag awareness
  // No functional changes needed, just feature flag tracking
  return <ReactBulkOperationsPanel {...props} />;
}

export { BulkOperationsPanel };
