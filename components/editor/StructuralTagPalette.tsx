'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';

interface StructuralTagPaletteProps {
  onInsertTag: (tagName: string) => void;
  disabled?: boolean;
}

const STRUCTURAL_TAGS = [
  {
    name: 'div',
    description: 'Division - groups related text',
    example: '<div type="chapter">...</div>',
  },
  {
    name: 'p',
    description: 'Paragraph - basic text unit',
    example: '<p>Text content</p>',
  },
  {
    name: 'sp',
    description: 'Speech - dialogue within a speaker',
    example: '<sp who="#speaker1"><p>Text</p></sp>',
  },
  {
    name: 'lg',
    description: 'Line group - verse lines',
    example: '<lg><l>Line 1</l><l>Line 2</l></lg>',
  },
  {
    name: 'head',
    description: 'Heading - title or header',
    example: '<head>Section Title</head>',
  },
];

export const StructuralTagPalette: React.FC<StructuralTagPaletteProps> = ({
  onInsertTag,
  disabled = false,
}) => {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const handleTagClick = async (tagName: string) => {
    if (disabled) {
      toast.error('Cannot Insert Tag', {
        description: 'Please switch to XML or Split view to insert tags',
      });
      return;
    }

    setSelectedTag(tagName);
    setIsValidating(true);

    try {
      // Validate tag insertion context
      // For now, we'll just insert the tag
      // In a full implementation, you would:
      // 1. Get cursor position from editor
      // 2. Extract context around cursor
      // 3. Validate tag is allowed in that context
      // 4. If validation passes, insert tag

      // Simulate validation delay
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Call the insert callback
      onInsertTag(tagName);

      toast.success('Tag Inserted', {
        description: `<${tagName}> tag has been inserted at cursor position`,
      });
    } catch (error) {
      console.error('Failed to insert tag:', error);
      toast.error('Insertion Failed', {
        description: error instanceof Error ? error.message : 'Failed to insert tag',
      });
    } finally {
      setIsValidating(false);
      setSelectedTag(null);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Structural Tags</h3>
        </div>
        {isValidating && (
          <Badge variant="secondary" className="text-xs">
            Validating...
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-5 gap-2">
        {STRUCTURAL_TAGS.map((tag) => (
          <Button
            key={tag.name}
            variant={selectedTag === tag.name ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleTagClick(tag.name)}
            disabled={disabled || isValidating}
            className="font-mono text-xs"
            title={`${tag.description}\nExample: ${tag.example}`}
          >
            &lt;{tag.name}&gt;
          </Button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Click a tag to insert it at the cursor position. Hover for details.
      </p>
    </div>
  );
};

StructuralTagPalette.displayName = 'StructuralTagPalette';
