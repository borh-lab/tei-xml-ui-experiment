import { AlertCircle, Home } from 'lucide-react';
import Link from 'next/link';

interface DocumentLoadErrorProps {
  error: Error;
  onRetry?: () => void;
}

export default function DocumentLoadError({ error, onRetry }: DocumentLoadErrorProps) {
  return (
    <div className="max-w-md mx-auto mt-8">
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
              Failed to load document
            </h3>
            <p className="text-red-700 dark:text-red-300 text-sm mb-4">
              {error.message}
            </p>

            <div className="flex items-center gap-3">
              {onRetry ? (
                <button
                  onClick={onRetry}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors"
                >
                  Try Again
                </button>
              ) : (
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors"
                >
                  <Home className="w-4 h-4" />
                  Back to Gallery
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
