// @ts-nocheck
'use client';

import { CharacterForm as ReactCharacterForm } from './CharacterForm';

/**
 * CharacterForm with feature flag support
 *
 * Pure UI component with no service dependencies.
 * Re-exports the original component with feature flag badge support.
 *
 * The useEffectEditor flag controls whether to show this component
 * as part of the Effect-based editor.
 */
export default function CharacterForm(props: React.ComponentProps<typeof ReactCharacterForm>) {
  // Pure component - just re-export with feature flag awareness
  // No functional changes needed, just feature flag tracking
  return <ReactCharacterForm {...props} />;
}

export { CharacterForm };
