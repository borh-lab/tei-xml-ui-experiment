'use client';

/**
 * RealTimeHints Component
 *
 * Renders colored outline around selected text based on validation hint.
 * Displays HintTooltip with actions when applicable.
 */

import React, { useEffect, useState, useRef } from 'react';
import type { Hint } from '@/lib/values/Hint';
import type { Selection } from '@/lib/values/Selection';
import { HintTooltip } from './HintTooltip';
import './RealTimeHints.css';

export interface RealTimeHintsProps {
  selection: Selection | null;
  activeTagType: string;
  hint: Hint | null;
  onHintAccepted: (action: Hint['suggestedAction']) => void;
}

export const RealTimeHints = React.memo(
  ({ selection, activeTagType, hint, onHintAccepted }: RealTimeHintsProps) => {
    const [outlinePosition, setOutlinePosition] = useState<{
      x: number;
      y: number;
      width: number;
      height: number;
    } | null>(null);
    const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
    const outlineRef = useRef<HTMLDivElement>(null);

    // Calculate outline position from selection
    useEffect(() => {
      if (!selection || !hint) {
        setOutlinePosition(null);
        setTooltipPosition(null);
        return;
      }

      // Get the current DOM selection to position the outline
      const domSelection = window.getSelection();
      if (!domSelection || domSelection.rangeCount === 0) {
        return;
      }

      const range = domSelection.getRangeAt(0);
      const rects = range.getClientRects();

      if (rects.length === 0) {
        return;
      }

      // Calculate bounding box of all rects
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      for (let i = 0; i < rects.length; i++) {
        const rect = rects[i];
        minX = Math.min(minX, rect.left);
        minY = Math.min(minY, rect.top);
        maxX = Math.max(maxX, rect.right);
        maxY = Math.max(maxY, rect.bottom);
      }

      setOutlinePosition({
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
      });

      // Position tooltip above the outline
      setTooltipPosition({
        x: minX,
        y: minY - 10, // 10px above the outline
      });
    }, [selection, hint]);

    // Get outline color class from hint severity
    const getOutlineClass = () => {
      if (!hint) return '';

      switch (hint.severity) {
        case 'valid':
          return 'outline-green';
        case 'warning':
          return 'outline-yellow';
        case 'invalid':
          return 'outline-red';
      }
    };

    if (!selection || !hint || !outlinePosition) {
      return null;
    }

    return (
      <>
        {/* Colored outline around selection */}
        <div
          ref={outlineRef}
          className={`realtime-hints-outline ${getOutlineClass()} outline-transition`}
          style={{
            position: 'fixed',
            left: outlinePosition.x,
            top: outlinePosition.y,
            width: outlinePosition.width,
            height: outlinePosition.height,
            pointerEvents: 'none',
            zIndex: 999,
          }}
          aria-hidden="true"
        />

        {/* Hint tooltip */}
        {tooltipPosition && (
          <HintTooltip
            hint={hint}
            position={tooltipPosition}
            visible={true}
            onActionClick={onHintAccepted}
          />
        )}
      </>
    );
  }
);

RealTimeHints.displayName = 'RealTimeHints';
