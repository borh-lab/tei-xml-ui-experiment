'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ErrorEntry {
  id: string;
  message: string;
  component: string;
  context?: Record<string, unknown>;
  timestamp: number;
  errorType?: string;
}

interface ErrorStats {
  total: number;
  byType: Record<string, number>;
  recentErrors: ErrorEntry[];
  timestamps: number[];
}

interface ErrorContextType {
  logError: (error: Error, component: string, context?: Record<string, unknown>) => void;
  getStats: () => ErrorStats;
  getHistory: () => ErrorEntry[];
  clearHistory: () => void;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

const MAX_ERRORS = 50;

function generateErrorId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function ErrorProvider({ children }: { children: ReactNode }) {
  const [errors, setErrors] = useState<ErrorEntry[]>([]);

  const logError = (error: Error, component: string, context?: Record<string, unknown>) => {
    const errorEntry: ErrorEntry = {
      id: generateErrorId(),
      message: error.message,
      component,
      context,
      timestamp: Date.now(),
      errorType: error.constructor.name,
    };

    setErrors((prevErrors) => {
      const newErrors = [...prevErrors, errorEntry];
      // Keep only last MAX_ERRORS errors
      return newErrors.slice(-MAX_ERRORS);
    });
  };

  const getStats = (): ErrorStats => {
    const byType: Record<string, number> = {};
    const timestamps: number[] = [];

    errors.forEach((error) => {
      // Use error constructor name from the stored errorType
      const typeName = error.errorType || 'Error';
      byType[typeName] = (byType[typeName] || 0) + 1;
      timestamps.push(error.timestamp);
    });

    return {
      total: errors.length,
      byType,
      recentErrors: errors.slice(-10), // Last 10 errors
      timestamps,
    };
  };

  const getHistory = (): ErrorEntry[] => {
    return [...errors];
  };

  const clearHistory = () => {
    setErrors([]);
  };

  // Expose debug endpoint for E2E testing
  if (typeof window !== 'undefined') {
    (window as any).__getErrorStats = getStats;
    (window as any).__getErrorHistory = getHistory;
  }

  return (
    <ErrorContext.Provider value={{ logError, getStats, getHistory, clearHistory }}>
      {children}
    </ErrorContext.Provider>
  );
}

export function useErrorContext() {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useErrorContext must be used within ErrorProvider');
  }
  return context;
}
