// @ts-nocheck
'use client';

import { XMLCodeEditor as ReactXMLCodeEditor } from './XMLCodeEditor';

/**
 * XMLCodeEditor with feature flag support
 *
 * Pure UI component (Monaco editor wrapper) with no service dependencies.
 * Re-exports the original component with feature flag badge support.
 *
 * The useEffectEditor flag controls whether to show this component
 * as part of the Effect-based editor.
 */
export default function XMLCodeEditor(props: React.ComponentProps<typeof ReactXMLCodeEditor>) {
  // Pure component - just re-export with feature flag awareness
  // No functional changes needed, just feature flag tracking
  return <ReactXMLCodeEditor {...props} />;
}

export { XMLCodeEditor };
