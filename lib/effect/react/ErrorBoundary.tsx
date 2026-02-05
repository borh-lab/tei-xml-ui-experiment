// @ts-nocheck
/**
 * Error Boundary for Effect Components
 *
 * Wraps Effect providers and components to catch errors and provide
 * graceful fallbacks to React implementations.
 *
 * @example
 * ```tsx
 * <EffectErrorBoundary fallback={<ReactVersion />}>
 *   <EffectComponent />
 * </EffectErrorBoundary>
 * ```
 */

'use client';

import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * EffectErrorBoundary
 *
 * Catches errors in Effect components and provides fallback UI.
 * Logs errors to console in development for debugging.
 */
export class EffectErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[EffectErrorBoundary] Caught error:', error);
      console.error('Component stack:', errorInfo.componentStack);
    }

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="p-4 border border-red-300 bg-red-50 rounded-md">
          <h3 className="text-red-800 font-semibold mb-2">
            Effect Component Error
          </h3>
          <p className="text-red-700 text-sm mb-2">
            Something went wrong with the Effect implementation.
          </p>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mt-2">
              <summary className="text-red-900 font-medium cursor-pointer">
                Error Details
              </summary>
              <pre className="mt-2 p-2 bg-red-100 rounded text-xs overflow-auto">
                {this.state.error.toString()}
                {'\n'}
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * withEffectErrorBoundary HOC
 *
 * Higher-order component that wraps a component in an error boundary.
 *
 * @example
 * ```tsx
 * const SafeEffectExportButton = withEffectErrorBoundary(EffectExportButton, {
 *   fallback: <ReactExportButton />,
 * });
 * ```
 */
export function withEffectErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options?: { fallback?: ReactNode; onError?: (error: Error, errorInfo: React.ErrorInfo) => void }
) {
  const WrappedComponent: React.FC<P> = (props) => (
    <EffectErrorBoundary
      fallback={options?.fallback}
      onError={options?.onError}
    >
      <Component {...props} />
    </EffectErrorBoundary>
  );

  WrappedComponent.displayName = `withEffectErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}
