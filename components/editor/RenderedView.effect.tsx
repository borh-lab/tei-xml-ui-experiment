// @ts-nocheck
'use client';

import { RenderedView as EffectRenderedView } from './RenderedView';

/**
 * RenderedView with feature flag support
 *
 * Automatically switches between React and Effect implementations
 * based on feature-useEffectEditor feature flag.
 *
 * For now, defaults to Effect version (already migrated).
 */
export function RenderedViewWrapper(props: any) {
  const useEffectEditor = typeof window !== 'undefined' ? localStorage.getItem('feature-useEffectEditor') === 'true' : false;

  if (useEffectEditor) {
    return <EffectRenderedView {...props} />;
  }

  // Feature flag disabled - show fallback message
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center p-6 bg-muted/50 rounded-lg border border-dashed max-w-md">
        <p className="text-sm text-muted-foreground">
          RenderedView is disabled. Enable useEffectEditor feature flag to use this view.
        </p>
      </div>
    </div>
  );
}

export default RenderedViewWrapper;
