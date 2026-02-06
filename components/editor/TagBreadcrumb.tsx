'use client';

import React from 'react';
import { useDocumentV2 } from '@/hooks/useDocumentV2';
import type { DocumentState } from '@/lib/values/DocumentState';
import type { TagInfo } from '@/lib/selection/types';

interface TagBreadcrumbProps {
  initialState?: DocumentState;
}

/**
 * TagBreadcrumb
 *
 * Displays breadcrumb trail of selected tags with navigation.
 * Uses V2 state protocol.
 */
export function TagBreadcrumb({ initialState }: TagBreadcrumbProps) {
  const { state } = useDocumentV2(initialState);
  const [selectedTag, setSelectedTag] = React.useState<TagInfo | null>(null);

  React.useEffect(() => {
    if (state.document) {
      // Could derive from document state
      setSelectedTag(null);
    }
  }, [state.document]);

  if (!selectedTag) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">Tag:</span>
      <span className="font-mono">{selectedTag.type}</span>
      {selectedTag.attributes?.who && (
        <span className="text-muted-foreground">(who: {selectedTag.attributes.who})</span>
      )}
    </div>
  );
}

export default TagBreadcrumb;
