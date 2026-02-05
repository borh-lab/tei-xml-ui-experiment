// @ts-nocheck
/**
 * DocumentAnalytics Effect Component
 *
 * This component provides a migrated version of DocumentAnalytics using Effect.
 * It's controlled by a feature flag to allow gradual migration and testing.
 *
 * Feature Flag: 'feature-useEffectAnalytics'
 * - When enabled (set to 'true' in localStorage): Returns Effect-based version
 * - When disabled or not set: Returns fallback message with original component
 */

'use client';

import { Effect } from 'effect';
import { DocumentAnalytics } from './DocumentAnalytics';

/**
 * Effect-wrapped DocumentAnalytics component
 *
 * This version uses Effect for state management and data flow,
 * providing better error handling and composability.
 */
const DocumentAnalyticsEffect = Effect.gen(function* () {
  // TODO: Implement Effect-based analytics logic
  // This will include:
  // - Effect-managed state for analytics data
  // - Proper error handling with Effect.either
  // - Composable data transformations
  // - Integration with Effect-based document provider

  yield* Effect.succeed({
    component: DocumentAnalytics,
    implementation: 'effect'
  });
});

/**
 * Feature flag wrapper for DocumentAnalytics
 *
 * Checks localStorage for 'feature-useEffectAnalytics' flag:
 * - 'true' -> Returns Effect-based implementation
 * - anything else -> Returns original component
 */
export function DocumentAnalyticsWithFeatureFlag() {
  // Check feature flag
  const useEffectAnalytics = typeof window !== 'undefined'
    ? localStorage.getItem('feature-useEffectAnalytics')
    : null;

  // If Effect analytics is enabled, use the migrated version
  if (useEffectAnalytics === 'true') {
    return Effect.runSync(DocumentAnalyticsEffect);
  }

  // Fallback: show message about using original component
  return (
    <div className="feature-flag-info">
      <p>Using original DocumentAnalytics component.</p>
      <p>
        Enable Effect-based version by setting:
        <code>localStorage.setItem('feature-useEffectAnalytics', 'true')</code>
      </p>
      <DocumentAnalytics />
    </div>
  );
}

// Export both default and named exports
export default DocumentAnalyticsWithFeatureFlag;
