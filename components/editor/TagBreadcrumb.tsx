'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { useDocumentContext } from '@/lib/context/DocumentContext';
import type { TagInfo } from '@/lib/selection/types';

/**
 * TagBreadcrumb
 *
 * Displays breadcrumb trail of selected tags with navigation.
 * Uses Effect-based useDocumentService hook.
 */
export function TagBreadcrumb() {
  const { document } = useDocumentContext();
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
      <Badge variant="outline" className="text-xs">
        Effect-Based
      </Badge>
      <span className="text-muted-foreground">Tag:</span>
      <span className="font-mono">{selectedTag.type}</span>
      {selectedTag.attributes?.who && (
        <span className="text-muted-foreground">(who: {selectedTag.attributes.who})</span>
      )}
    </div>
  );
}

export default TagBreadcrumb;
