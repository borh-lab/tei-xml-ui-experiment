'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { getSelectionRange } from '@/lib/utils/selection';
import { SelectionManager } from '@/lib/selection/SelectionManager';

interface TagToolbarProps {
  onApplyTag: (tag: string, attrs?: Record<string, string>) => void;
}

export function TagToolbar({ onApplyTag }: TagToolbarProps) {
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [visible, setVisible] = useState(false);
  const [selectionManager] = useState(() => new SelectionManager());

  useEffect(() => {
    const handleSelection = () => {
      const range = getSelectionRange();

      if (range && range.text.trim().length > 0) {
        // Calculate position for the toolbar
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();

          // Position toolbar above the selection
          setPosition({
            x: rect.left + rect.width / 2,
            y: rect.top - 50,
          });
          setVisible(true);
        }
      } else {
        setVisible(false);
      }
    };

    // Listen for mouseup and keyup events to detect text selection
    document.addEventListener('mouseup', handleSelection);
    document.addEventListener('keyup', handleSelection);

    // Cleanup event listeners
    return () => {
      document.removeEventListener('mouseup', handleSelection);
      document.removeEventListener('keyup', handleSelection);
    };
  }, [selectionManager]);

  const handleApplyTag = (tag: string, attrs?: Record<string, string>) => {
    onApplyTag(tag, attrs);
    setVisible(false);
  };

  if (!visible) {
    return null;
  }

  return (
    <div
      className="fixed z-50 bg-background border border-border rounded-lg shadow-lg p-2 flex gap-2"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translateX(-50%)',
      }}
    >
      <Button
        size="sm"
        variant="outline"
        onClick={() => handleApplyTag('said', { 'who': '#speaker1' })}
        className="text-xs"
        title="Wrap in said tag (speaker1)"
      >
        &lt;said&gt;
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => handleApplyTag('q')}
        className="text-xs"
        title="Wrap in q tag"
      >
        &lt;q&gt;
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => handleApplyTag('persName')}
        className="text-xs"
        title="Wrap in persName tag"
      >
        &lt;persName&gt;
      </Button>
    </div>
  );
}
