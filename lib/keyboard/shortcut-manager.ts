/**
 * Keyboard Shortcut Manager
 *
 * Value-oriented shortcut registry for keyboard shortcuts.
 * All operations are pure functions that return new values.
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Keyboard shortcut definition
 */
export interface Shortcut {
  readonly key: string; // e.g., "cmd+s", "ctrl+q", "Escape"
  readonly description: string;
  readonly action: () => void;
  readonly condition?: () => boolean; // Optional condition to check before executing
}

/**
 * Shortcut registry as immutable value
 */
export interface ShortcutRegistry {
  readonly shortcuts: readonly Shortcut[];
}

// ============================================================================
// Registry Operations
// ============================================================================

/**
 * Pure function: Create shortcut registry
 *
 * Creates a new shortcut registry with shortcuts sorted by key for
 * predictable matching.
 *
 * @param shortcuts - Optional initial shortcuts
 * @returns New shortcut registry
 */
export function createShortcutRegistry(shortcuts: readonly Shortcut[] = []): ShortcutRegistry {
  // Sort by key for predictable matching (longer keys first for better matching)
  const sorted = [...shortcuts].sort((a, b) => {
    // First sort by length (longer keys first)
    if (b.key.length !== a.key.length) {
      return b.key.length - a.key.length;
    }
    // Then sort alphabetically
    return a.key.localeCompare(b.key);
  });

  return {
    shortcuts: sorted,
  };
}

/**
 * Pure function: Add shortcut to registry
 *
 * @param registry - Current shortcut registry
 * @param shortcut - Shortcut to add
 * @returns New shortcut registry with added shortcut
 */
export function addShortcut(registry: ShortcutRegistry, shortcut: Shortcut): ShortcutRegistry {
  // Check for duplicate key
  if (registry.shortcuts.some((s) => s.key === shortcut.key)) {
    throw new Error(`Shortcut with key "${shortcut.key}" already exists`);
  }

  return createShortcutRegistry([...registry.shortcuts, shortcut]);
}

/**
 * Pure function: Remove shortcut from registry
 *
 * @param registry - Current shortcut registry
 * @param key - Key of shortcut to remove
 * @returns New shortcut registry without the shortcut
 */
export function removeShortcut(registry: ShortcutRegistry, key: string): ShortcutRegistry {
  return {
    shortcuts: registry.shortcuts.filter((s) => s.key !== key),
  };
}

/**
 * Pure function: Match keyboard event to shortcut
 *
 * @param registry - Shortcut registry
 * @param event - Keyboard event to match
 * @returns Matched shortcut or null if no match
 */
export function matchShortcut(registry: ShortcutRegistry, event: KeyboardEvent): Shortcut | null {
  const pressedKey = formatKeyEvent(event);

  for (const shortcut of registry.shortcuts) {
    if (shortcut.key === pressedKey) {
      // Check condition if present
      if (shortcut.condition && !shortcut.condition()) {
        continue; // Condition not met
      }
      return shortcut;
    }
  }

  return null;
}

/**
 * Pure function: Get all shortcuts
 *
 * @param registry - Shortcut registry
 * @returns Array of all shortcuts
 */
export function getShortcuts(registry: ShortcutRegistry): readonly Shortcut[] {
  return registry.shortcuts;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Format keyboard event as shortcut key string
 *
 * Examples:
 * - Ctrl+S → "cmd+s"
 * - Shift+K → "shift+k"
 * - Escape → "Escape"
 *
 * @param event - Keyboard event
 * @returns Formatted key string
 */
export function formatKeyEvent(event: KeyboardEvent): string {
  const parts: string[] = [];

  // Use cmd for both Ctrl and Meta (Command) for cross-platform consistency
  if (event.ctrlKey || event.metaKey) parts.push('cmd');
  if (event.altKey) parts.push('alt');
  if (event.shiftKey) parts.push('shift');

  // Add the key (lowercase for letters, preserve case for special keys)
  const key = event.key;
  if (key.length === 1) {
    parts.push(key.toLowerCase());
  } else {
    // Special keys like Escape, Enter, etc.
    parts.push(key);
  }

  return parts.join('+');
}

/**
 * Parse shortcut key string into components
 *
 * Examples:
 * - "cmd+s" → { cmd: true, shift: false, alt: false, key: "s" }
 * - "shift+Escape" → { cmd: false, shift: true, alt: false, key: "Escape" }
 *
 * @param keyString - Shortcut key string
 * @returns Parsed components
 */
export function parseShortcutKey(keyString: string): {
  cmd: boolean;
  shift: boolean;
  alt: boolean;
  key: string;
} {
  const parts = keyString.split('+').map((p) => p.toLowerCase());

  return {
    cmd: parts.includes('cmd'),
    shift: parts.includes('shift'),
    alt: parts.includes('alt'),
    key: parts.find((p) => !['cmd', 'shift', 'alt'].includes(p)) || '',
  };
}

/**
 * Format shortcut key string for display
 *
 * Examples:
 * - "cmd+s" → "⌘S" (Mac) or "Ctrl+S" (Windows)
 * - "ctrl+q" → "Ctrl+Q"
 *
 * @param keyString - Shortcut key string
 * @param platform - Optional platform hint ('mac', 'windows', 'linux')
 * @returns Formatted display string
 */
export function formatShortcutForDisplay(
  keyString: string,
  platform?: 'mac' | 'windows' | 'linux'
): string {
  const parts = keyString.split('+');
  const modifiers: string[] = [];
  const key = parts[parts.length - 1];

  // Detect platform if not specified
  if (!platform) {
    platform =
      typeof navigator !== 'undefined' && /Mac/.test(navigator.platform) ? 'mac' : 'windows';
  }

  for (const part of parts) {
    const lower = part.toLowerCase();
    if (lower === 'cmd') {
      modifiers.push(platform === 'mac' ? '⌘' : 'Ctrl');
    } else if (lower === 'shift') {
      modifiers.push(platform === 'mac' ? '⇧' : 'Shift');
    } else if (lower === 'alt') {
      modifiers.push(platform === 'mac' ? '⌥' : 'Alt');
    }
  }

  return [...modifiers, key.toUpperCase()].join(platform === 'mac' ? '' : '+');
}
