/**
 * Feature Flag System for Effect Migration
 *
 * Allows gradual rollout of Effect-based architecture by toggling
 * between React and Effect implementations at runtime.
 *
 * Usage:
 * 1. Enable feature: localStorage.setItem('feature-useEffectEditor', 'true')
 * 2. Check feature: isFeatureEnabled('useEffectEditor')
 * 3. Disable feature: localStorage.removeItem('feature-useEffectEditor')
 */

// ============================================================================
// Feature Flag Definitions
// ============================================================================

/**
 * All feature flags for Effect migration
 *
 * Flags should be named as "use[Area]" where [Area] is the component
 * or service being migrated.
 */
export const FeatureFlags = {
  /** Use Effect-based DocumentService instead of React DocumentContext */
  useEffectDocument: false,

  /** Use Effect-based StorageService instead of direct localStorage */
  useEffectStorage: false,

  /** Use Effect-based ValidationService instead of React validation */
  useEffectValidation: false,

  /** Use Effect-based AIService instead of React AI providers */
  useEffectAI: false,

  /** Use Effect-based EditorLayout instead of React version */
  useEffectEditor: false,

  /** Use Effect-based ExportButton component */
  useEffectExport: false,

  /** Use Effect-based TagToolbar component */
  useEffectTagToolbar: false,

  /** Use Effect-based RenderedView component */
  useEffectRenderedView: false,
} as const;

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * All available feature flag names
 */
export type FeatureFlag = keyof typeof FeatureFlags;

/**
 * Feature flag state (enabled/disabled)
 */
export type FeatureFlagState = boolean;

// ============================================================================
// Feature Flag Checking
// ============================================================================

/**
 * Check if a feature flag is enabled
 *
 * Priority:
 * 1. localStorage override (for testing/development)
 * 2. Default value from FeatureFlags
 *
 * @param flag - Feature flag name to check
 * @returns true if feature is enabled, false otherwise
 *
 * @example
 * ```ts
 * if (isFeatureEnabled('useEffectEditor')) {
 *   return <EffectEditorLayout />;
 * }
 * return <ReactEditorLayout />;
 * ```
 */
export function isFeatureEnabled(flag: FeatureFlag): FeatureFlagState {
  // Check localStorage for override (browser only)
  if (typeof window !== 'undefined' && window.localStorage) {
    const storedValue = localStorage.getItem(`feature-${flag}`);
    if (storedValue !== null) {
      return storedValue === 'true';
    }
  }

  // Fall back to default value
  return FeatureFlags[flag];
}

/**
 * Enable a feature flag
 *
 * This persists the flag to localStorage, overriding the default value.
 * Use for testing/development only.
 *
 * @param flag - Feature flag to enable
 *
 * @example
 * ```ts
 * enableFeature('useEffectEditor');
 * // Reload page to apply changes
 * window.location.reload();
 * ```
 */
export function enableFeature(flag: FeatureFlag): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem(`feature-${flag}`, 'true');
  }
}

/**
 * Disable a feature flag
 *
 * This persists the flag to localStorage, overriding the default value.
 * Use for testing/development only.
 *
 * @param flag - Feature flag to disable
 *
 * @example
 * ```ts
 * disableFeature('useEffectEditor');
 * // Reload page to apply changes
 * window.location.reload();
 * ```
 */
export function disableFeature(flag: FeatureFlag): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem(`feature-${flag}`, 'false');
  }
}

/**
 * Reset a feature flag to default value
 *
 * Removes the localStorage override, reverting to the default value
 * from FeatureFlags.
 *
 * @param flag - Feature flag to reset
 *
 * @example
 * ```ts
 * resetFeature('useEffectEditor');
 * // Reload page to apply changes
 * window.location.reload();
 * ```
 */
export function resetFeature(flag: FeatureFlag): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.removeItem(`feature-${flag}`);
  }
}

/**
 * Get all feature flag states
 *
 * Returns the current state of all feature flags, including any
 * localStorage overrides.
 *
 * @returns Record of feature flag names to boolean states
 *
 * @example
 * ```ts
 * const flags = getAllFeatureFlags();
 * console.table(flags);
 * // useEffectEditor: true
 * // useEffectStorage: false
 * // ...
 * ```
 */
export function getAllFeatureFlags(): Record<FeatureFlag, FeatureFlagState> {
  const flags = {} as Record<FeatureFlag, FeatureFlagState>;

  for (const flag of Object.keys(FeatureFlags) as FeatureFlag[]) {
    flags[flag] = isFeatureEnabled(flag);
  }

  return flags;
}

/**
 * Get all enabled feature flags
 *
 * Returns only the feature flags that are currently enabled.
 *
 * @returns Array of enabled feature flag names
 *
 * @example
 * ```ts
 * const enabled = getEnabledFeatures();
 * console.log('Enabled features:', enabled.join(', '));
 * // "Enabled features: useEffectDocument, useEffectStorage"
 * ```
 */
export function getEnabledFeatures(): FeatureFlag[] {
  return Object.keys(FeatureFlags).filter((flag) =>
    isFeatureEnabled(flag as FeatureFlag)
  ) as FeatureFlag[];
}

// ============================================================================
// Development Utilities
// ============================================================================

/**
 * Enable all Effect features
 *
 * WARNING: This enables ALL Effect features at once.
 * Use with caution - some features may depend on others.
 *
 * @example
 * ```ts
 * enableAllFeatures();
 * window.location.reload();
 * ```
 */
export function enableAllFeatures(): void {
  for (const flag of Object.keys(FeatureFlags) as FeatureFlag[]) {
    enableFeature(flag);
  }
}

/**
 * Disable all Effect features
 *
 * This disables all Effect features, reverting to React implementations.
 *
 * @example
 * ```ts
 * disableAllFeatures();
 * window.location.reload();
 * ```
 */
export function disableAllFeatures(): void {
  for (const flag of Object.keys(FeatureFlags) as FeatureFlag[]) {
    disableFeature(flag);
  }
}

/**
 * Reset all feature flags to defaults
 *
 * Removes all localStorage overrides, reverting all features to
 * their default values from FeatureFlags.
 *
 * @example
 * ```ts
 * resetAllFeatures();
 * window.location.reload();
 * ```
 */
export function resetAllFeatures(): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    for (const flag of Object.keys(FeatureFlags)) {
      localStorage.removeItem(`feature-${flag}`);
    }
  }
}

// ============================================================================
// Debugging
// ============================================================================

/**
 * Log current feature flag state
 *
 * Prints all feature flags and their current states to console.
 * Useful for debugging feature flag issues.
 *
 * @example
 * ```ts
 * logFeatureFlags();
 * // Console output:
 * // Feature Flags:
 * //   useEffectEditor: false (default)
 * //   useEffectStorage: true (override)
 * //   ...
 * ```
 */
export function logFeatureFlags(): void {
  console.group('Feature Flags');

  for (const flag of Object.keys(FeatureFlags) as FeatureFlag[]) {
    const isEnabled = isFeatureEnabled(flag);
    const hasOverride = localStorage.getItem(`feature-${flag}`) !== null;
    const source = hasOverride ? 'override' : 'default';

    console.log(`  ${flag}: ${isEnabled} (${source})`);
  }

  console.groupEnd();
}

/**
 * Create a feature flag debug UI
 *
 * Returns HTML string for a simple debug UI that can be injected
 * into the page for toggling features during development.
 *
 * @example
 * ```ts
 * // In development only
 * if (process.env.NODE_ENV === 'development') {
 *   document.body.insertAdjacentHTML('beforeend', createDebugUI());
 * }
 * ```
 */
export function createDebugUI(): string {
  const flags = Object.keys(FeatureFlags) as FeatureFlag[];

  const checkboxes = flags
    .map(
      (flag) => `
    <label style="display: block; margin: 4px 0;">
      <input type="checkbox" data-feature="${flag}" ${isFeatureEnabled(flag) ? 'checked' : ''}>
      ${flag}
    </label>
  `
    )
    .join('');

  return `
    <div id="feature-flag-debug" style="
      position: fixed;
      bottom: 10px;
      right: 10px;
      background: white;
      border: 1px solid #ccc;
      padding: 10px;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      font-family: monospace;
      font-size: 12px;
      z-index: 9999;
    ">
      <div style="font-weight: bold; margin-bottom: 8px;">
        Feature Flags
      </div>
      ${checkboxes}
      <button data-action="save" style="margin-top: 8px;">Save & Reload</button>
      <button data-action="reset" style="margin-top: 8px;">Reset All</button>
    </div>
    <script>
      (function() {
        const container = document.getElementById('feature-flag-debug');
        container.addEventListener('click', (e) => {
          if (e.target.tagName === 'BUTTON') {
            const action = e.target.dataset.action;
            if (action === 'save') {
              container.querySelectorAll('input[type="checkbox"]')
                .forEach(input => {
                  const flag = input.dataset.feature;
                  localStorage.setItem(\`feature-\${flag}\`, input.checked);
                });
              location.reload();
            } else if (action === 'reset') {
              ${Object.keys(FeatureFlags)
                .map((flag) => `localStorage.removeItem('feature-${flag}');`)
                .join('\n')}
              location.reload();
            }
          }
        });
      })();
    </script>
  `;
}
