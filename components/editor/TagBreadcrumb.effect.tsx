// @ts-nocheck
'use client';

import { TagBreadcrumb as EffectTagBreadcrumb } from './TagBreadcrumb';

/**
 * TagBreadcrumb with feature flag support
 *
 * Automatically switches between React and Effect implementations
 * based on feature-useEffectEditor feature flag.
 *
 * For now, defaults to Effect version (already migrated).
 */
export function TagBreadcrumbWrapper(props: any) {
  const useEffectEditor = typeof window !== 'undefined' ? localStorage.getItem('feature-useEffectEditor') === 'true' : false;

  if (useEffectEditor) {
    return <EffectTagBreadcrumb {...props} />;
  }

  // Feature flag disabled - show fallback message
  return (
    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded border border-dashed text-sm text-muted-foreground">
      TagBreadcrumb is disabled. Enable useEffectEditor feature flag to use.
    </div>
  );
}

export default TagBreadcrumbWrapper;
