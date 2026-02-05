'use client';

import React, { useEffect, useState, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import './ToastWithActions.css';

export interface ToastAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

export interface ToastWithActionsProps {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  actions?: ToastAction[];
  onClose?: () => void;
  autoClose?: boolean;
  duration?: number;
}

/**
 * Toast notification component with action buttons.
 *
 * Displays validation messages with clickable action buttons to apply fixes.
 * Supports auto-close functionality and smooth animations.
 */
export function ToastWithActions({
  message,
  type,
  actions = [],
  onClose,
  autoClose = true,
  duration = 5000,
}: ToastWithActionsProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasClickedAction = useRef(false);

  // Clear timeout and call onClose
  const handleClose = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsExiting(true);
    // Use requestAnimationFrame to ensure state updates are batched properly
    requestAnimationFrame(() => {
      setTimeout(() => {
        setIsVisible(false);
        onClose?.();
      }, 50); // Short delay to ensure animation starts
    });
  };

  // Handle action click - cancels auto-close
  const handleActionClick = (action: ToastAction) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    hasClickedAction.current = true;
    action.onClick();
    // Don't close automatically when action is clicked
    // Let the user decide or wait for manual close
  };

  // Auto-close functionality
  useEffect(() => {
    if (autoClose && !hasClickedAction.current) {
      timeoutRef.current = setTimeout(() => {
        handleClose();
      }, duration);

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }
  }, [autoClose, duration]);

  // Don't render if not visible
  if (!isVisible) {
    return null;
  }

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <span className="toast-icon toast-icon-success">✓</span>;
      case 'error':
        return <span className="toast-icon toast-icon-error">✕</span>;
      case 'warning':
        return <span className="toast-icon toast-icon-warning">⚠</span>;
      case 'info':
        return <span className="toast-icon toast-icon-info">ⓘ</span>;
    }
  };

  const typeClass = `toast-${type}`;

  return (
    <div
      className={cn('toast', typeClass, isExiting && 'toast-exiting')}
      role="alert"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="toast-content">
        <div className="toast-header">
          <div className="toast-icon-wrapper">{getIcon()}</div>
          <p className="toast-message">{message}</p>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={handleClose}
            className="toast-close-button"
            aria-label="Close notification"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>

        {actions.length > 0 && (
          <div className="toast-actions">
            {actions.map((action, index) => (
              <Button
                key={index}
                size="sm"
                variant={action.variant === 'primary' ? 'default' : 'outline'}
                onClick={() => handleActionClick(action)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleActionClick(action);
                  }
                }}
                className="toast-action-button"
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
