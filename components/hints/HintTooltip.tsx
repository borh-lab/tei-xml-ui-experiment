'use client';

/**
 * HintTooltip Component
 *
 * Displays validation hints with severity icons and action buttons.
 * Positions near the text selection with appropriate styling.
 */

import React from 'react';
import type { Hint } from '@/lib/values/Hint';
import './HintTooltip.css';

export interface HintTooltipProps {
  hint: Hint;
  position: { x: number; y: number };
  visible: boolean;
  onActionClick?: (action: Hint['suggestedAction']) => void;
}

export const HintTooltip = React.memo(
  ({ hint, position, visible, onActionClick }: HintTooltipProps) => {
    if (!visible) {
      return null;
    }

    const getSeverityIcon = () => {
      switch (hint.severity) {
        case 'valid':
          return (
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          );
        case 'warning':
          return (
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          );
        case 'invalid':
          return (
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          );
      }
    };

    const getSeverityClass = () => {
      switch (hint.severity) {
        case 'valid':
          return 'hint-valid';
        case 'warning':
          return 'hint-warning';
        case 'invalid':
          return 'hint-invalid';
      }
    };

    const getAriaLive = () => {
      return hint.severity === 'invalid' ? 'assertive' : 'polite';
    };

    const handleActionClick = () => {
      if (hint.suggestedAction && onActionClick) {
        onActionClick(hint.suggestedAction);
      }
    };

    return (
      <div
        className={`hint-tooltip ${getSeverityClass()}`}
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          zIndex: 1000,
        }}
        role="tooltip"
        aria-label={`Validation hint: ${hint.message}`}
        aria-live={getAriaLive()}
      >
        <div className="hint-tooltip-content">
          <div className="hint-tooltip-header">
            <span className="hint-tooltip-icon">{getSeverityIcon()}</span>
            <span className="hint-tooltip-message">{hint.message}</span>
          </div>

          {hint.suggestedAction && onActionClick && (
            <button
              className="hint-tooltip-action"
              onClick={handleActionClick}
              type="button"
              aria-label={`Apply action: ${hint.suggestedAction.label}`}
            >
              {hint.suggestedAction.label}
            </button>
          )}
        </div>
      </div>
    );
  }
);

HintTooltip.displayName = 'HintTooltip';
