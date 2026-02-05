// @ts-nocheck
'use client';

import { EditorLayout as ReactEditorLayout } from './EditorLayout';

/**
 * EditorLayout with feature flag support
 *
 * The component already uses Effect services (useDocumentService from @/lib/effect/react/hooks).
 * This is a simple wrapper that enables the component when the feature flag is set.
 *
 * Feature flag: feature-useEffectEditor
 */
export default function EditorLayout(props: any) {
  // Check if Effect version should be used
  const useEffect = typeof window !== 'undefined'
    ? localStorage.getItem('feature-useEffectEditor') === 'true'
    : false;

  if (useEffect) {
    return <ReactEditorLayout {...props} />;
  }

  // Fall back to same implementation (already uses Effect services)
  return <ReactEditorLayout {...props} />;
}

// Also export the Effect version for direct imports
export { EditorLayout as EffectEditorLayout } from './EditorLayout';
