'use client';

import React from 'react';
import { useDocumentService } from '@/lib/effect/react/hooks';
import type { TagInfo } from '@/lib/selection/types';
import { isFeatureEnabled } from '@/lib/effect/utils/featureFlags';

/**
 * TagBreadcrumb - Effect-based version
 *
 * Displays breadcrumb trail of selected tags with navigation.
 */
export function EffectTagBreadcrumb() {
  const { document } = useDocumentService();
  const [selectedTag, setSelectedTag] = React.useState<TagInfo | null>(null);

  React.useEffect(() => {
    if (document) {
      // Could derive from document state
      setSelectedTag(null);
    }
  }, [document]);

  if (!selectedTag) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">Tag:</span>
      <span className="font-mono">{selectedTag.tagName}</span>
      {selectedTag.attributes?.who && (
        <span className="text-muted-foreground">(who: {selectedTag.attributes.who})</span>
      )}
    </div>
  );
}

/**
 * TagBreadcrumb with feature flag support
 */
export default function TagBreadcrumb(props: Record<string, unknown>) {
  if (isFeatureEnabled('useEffectTagToolbar')) {
    return <EffectTagBreadcrumb {...props} />;
  }

  // Fall back to React version
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- Dynamic require for feature flag
  const ReactTagBreadcrumb = require('./TagBreadcrumb.react').TagBreadcrumb;
  return <ReactTagBreadcrumb {...props} />;
}
