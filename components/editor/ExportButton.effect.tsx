// @ts-nocheck
'use client';

import { ExportButton as EffectExportButton } from './ExportButton';

/**
 * ExportButton with feature flag support
 *
 * Automatically switches between React and Effect implementations
 * based on feature-useEffectEditor feature flag.
 *
 * For now, defaults to Effect version (already migrated).
 */
export function ExportButtonWrapper() {
  const useEffectEditor = typeof window !== 'undefined'
    ? localStorage.getItem('feature-useEffectEditor') === 'true'
    : false;

  if (useEffectEditor) {
    return <EffectExportButton />;
  }

  // Feature flag disabled - show fallback message
  return (
    <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border border-dashed">
      <div className="text-sm text-muted-foreground">
        ExportButton is disabled. Enable useEffectEditor feature flag to use.
      </div>
    </div>
  );
}

export default ExportButtonWrapper;
