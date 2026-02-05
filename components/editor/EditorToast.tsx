'use client';

import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, X, Navigation } from 'lucide-react';

export interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface EditorToastProps {
  toast: ToastState | null;
}

/**
 * Toast notification component with auto-dismiss.
 *
 * Displays success, error, or info messages with appropriate styling.
 */
export function EditorToast({ toast }: EditorToastProps) {
  if (!toast) return null;

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'error':
        return <X className="h-4 w-4 text-red-600" />;
      case 'info':
        return <Navigation className="h-4 w-4 text-blue-600" />;
    }
  };

  const getStyles = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900';
      case 'error':
        return 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900';
      case 'info':
        return 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5">
      <Alert className={'shadow-lg ' + getStyles()}>
        {getIcon()}
        <AlertDescription className="text-sm ml-2">{toast.message}</AlertDescription>
      </Alert>
    </div>
  );
}
