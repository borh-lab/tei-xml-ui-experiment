'use client';

import React from 'react';
import { useDocumentService } from '@/lib/effect/react/hooks';
import type { TagInfo } from '@/lib/selection/types';

interface TagBreadcrumbProps {
  onTagSelect?: (tag: TagInfo) => void;
}

/**
 * TagBreadcrumb
 *
 * Displays breadcrumb trail of selected tags with navigation.
 * Uses Effect-based useDocumentService hook.
 */
export function TagBreadcrumb({ onTagSelect }: TagBreadcrumbProps) {
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
        <span className="text-muted-foreground">
          (who: {selectedTag.attributes.who})
        </span>
      )}
    </div>
  );
}

export default TagBreadcrumb;
