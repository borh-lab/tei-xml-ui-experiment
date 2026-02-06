'use client';

import React from 'react';
import { useDocumentV2 } from '@/hooks/useDocumentV2';
import type { DocumentState } from '@/lib/values/DocumentState';
import type { TagInfo } from '@/lib/selection/types';

/**
 * TagBreadcrumb
 *
 * Displays breadcrumb trail of selected tags with navigation.
 * V2: Uses useDocumentV2 with explicit state protocol.
 */
export interface TagBreadcrumbProps {
  /** Initial document state for testing (enables state injection) */
  initialState?: DocumentState;
}

export function TagBreadcrumb(props: TagBreadcrumbProps) {
  const { state } = useDocumentV2(props.initialState);
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
