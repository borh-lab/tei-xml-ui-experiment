'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ChevronRight } from 'lucide-react';
import { getTagHierarchyFromClick, getTagHierarchyFromSelection, DOMTagInfo } from '@/lib/dom/tag-hierarchy';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TagBreadcrumbProps {
  onTagSelect?: (tagInfo: { tagName: string; attributes: Record<string, string>; element: HTMLElement }) => void;
}

export function TagBreadcrumb({ onTagSelect }: TagBreadcrumbProps) {
  const [tagHierarchy, setTagHierarchy] = useState<DOMTagInfo[]>([]);
  const [selectedTag, setSelectedTag] = useState<DOMTagInfo | null>(null);

  // Update tag hierarchy when selection/click changes
  const updateTagHierarchy = useCallback(() => {
    // Get hierarchy from current selection
    const hierarchy = getTagHierarchyFromSelection();
    setTagHierarchy(hierarchy);

    // Clear selected tag if it's no longer in hierarchy
    if (selectedTag && !hierarchy.some(tag => tag.tagName === selectedTag.tagName)) {
      setSelectedTag(null);
    }
  }, [selectedTag]);

  // Set up event listeners for selection changes
  useEffect(() => {
    // Update hierarchy on click and keyup events
    const handleClick = (e: MouseEvent) => {
      const hierarchy = getTagHierarchyFromClick(e);
      setTagHierarchy(hierarchy);

      // Clear selected tag if it's no longer in hierarchy
      if (selectedTag && !hierarchy.some(tag => tag.tagName === selectedTag.tagName)) {
        setSelectedTag(null);
      }
    };

    document.addEventListener('click', handleClick);
    document.addEventListener('keyup', updateTagHierarchy);

    // Initial update
    updateTagHierarchy();

    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keyup', updateTagHierarchy);
    };
  }, [updateTagHierarchy, selectedTag]);

  // Handle breadcrumb item click
  const handleTagClick = useCallback((tagInfo: DOMTagInfo, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    setSelectedTag(tagInfo);

    if (onTagSelect) {
      onTagSelect({
        tagName: tagInfo.tagName,
        attributes: tagInfo.attributes,
        element: tagInfo.element,
      });
    }

    // Highlight the selected element visually
    if (tagInfo.element) {
      tagInfo.element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      });

      // Add temporary highlight effect
      const element = tagInfo.element;
      element.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
      setTimeout(() => {
        element.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
      }, 1500);
    }
  }, [onTagSelect]);

  // Don't render if no tags in hierarchy
  if (tagHierarchy.length === 0) {
    return null;
  }

  return (
    <div className="border-b bg-muted/30 px-4 py-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground font-medium">Tag Path:</span>
        <Breadcrumb>
          <BreadcrumbList className="gap-1">
            {tagHierarchy.map((tagInfo, index) => {
              const isLast = index === tagHierarchy.length - 1;
              const isSelected = selectedTag?.tagName === tagInfo.tagName;

              return (
                <React.Fragment key={`${tagInfo.tagName}-${index}`}>
                  <BreadcrumbItem>
                    <BreadcrumbLink
                      href="#"
                      onClick={(e) => handleTagClick(tagInfo, e)}
                      className={cn(
                        "inline-flex items-center gap-1.5 text-sm",
                        isLast && "font-medium text-foreground",
                        isSelected && "text-primary"
                      )}
                    >
                      <Badge
                        variant={isSelected ? "default" : "outline"}
                        className="text-xs font-mono"
                      >
                        &lt;{tagInfo.tagName}&gt;
                      </Badge>

                      {/* Show attributes badge if present */}
                      {Object.keys(tagInfo.attributes).length > 0 && (
                        <Badge
                          variant="secondary"
                          className="text-xs"
                          title={JSON.stringify(tagInfo.attributes, null, 2)}
                        >
                          {Object.keys(tagInfo.attributes).length} attr{Object.keys(tagInfo.attributes).length > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </BreadcrumbLink>
                  </BreadcrumbItem>

                  {!isLast && (
                    <BreadcrumbSeparator>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </BreadcrumbSeparator>
                  )}
                </React.Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>

        {/* Show attributes of selected tag */}
        {selectedTag && Object.keys(selectedTag.attributes).length > 0 && (
          <div className="ml-2 flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-muted-foreground">Attributes:</span>
            {Object.entries(selectedTag.attributes).map(([key, value]) => (
              <Badge
                key={key}
                variant="outline"
                className="text-xs font-mono"
              >
                {key}=&quot;{value}&quot;
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
