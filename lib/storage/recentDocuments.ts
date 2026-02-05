// @ts-nocheck
const RECENT_KEY = 'tei-recent-docs';
const MAX_RECENT = 10;

export interface RecentDocument {
  id: string;
  title: string;
  timestamp: number;
  progress: number; // % tagged
  content?: string; // Optional XML content
  lastModified?: number;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard for RecentDocument objects
 */
export function isRecentDocument(value: unknown): value is RecentDocument {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'title' in value &&
    'timestamp' in value &&
    'progress' in value &&
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.timestamp === 'number' &&
    typeof value.progress === 'number'
  );
}

/**
 * Validate progress percentage
 */
export function isValidProgress(value: number): boolean {
  return typeof value === 'number' && value >= 0 && value <= 100;
}

/**
 * Validate timestamp
 */
export function isValidTimestamp(value: number): boolean {
  return typeof value === 'number' && value > 0 && value <= Date.now();
}

// ============================================================================
// Storage Functions (with type guards)
// ============================================================================

export function getRecentDocuments(): RecentDocument[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(RECENT_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);

    // Use type guard to validate array
    if (!Array.isArray(parsed)) return [];

    // Sort by timestamp descending
    return parsed
      .sort((a: RecentDocument, b: RecentDocument) => b.timestamp - a.timestamp)
      .filter((doc: unknown): doc is RecentDocument => {
        // Use type guard for validation
        if (!isRecentDocument(doc)) return false;

        // Additional validation
        if (!isValidTimestamp(doc.timestamp)) return false;
        if (!isValidProgress(doc.progress)) return false;

        return true;
      });
  } catch (error) {
    console.error('Failed to parse recent documents:', error);
    return [];
  }
}

export function addRecentDocument(doc: RecentDocument) {
  if (typeof window === 'undefined') return;

  const recent = getRecentDocuments();

  // Remove if already exists
  const filtered = recent.filter((d) => d.id !== doc.id);

  // Add to front with current timestamp if not provided
  const newDoc = {
    ...doc,
    timestamp: doc.timestamp || Date.now(),
  };

  // Keep only MAX_RECENT documents
  const updated = [newDoc, ...filtered].slice(0, MAX_RECENT);

  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to save recent documents:', error);
  }
}

export function updateProgress(id: string, progress: number) {
  if (typeof window === 'undefined') return;

  // Validate progress
  if (!isValidProgress(progress)) {
    throw new Error(`Invalid progress value: ${progress}. Must be between 0 and 100.`);
  }

  const recent = getRecentDocuments();
  const doc = recent.find((d) => d.id === id);

  if (doc) {
    doc.progress = progress;
    doc.lastModified = Date.now();

    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
    } catch (error) {
      console.error('Failed to update progress:', error);
    }
  }
}

/**
 * Update document with validation
 * @throws {Error} If updates contain invalid progress value
 */
export function updateDocument(id: string, updates: Partial<RecentDocument>) {
  if (typeof window === 'undefined') return;

  // Validate progress if provided
  if ('progress' in updates && updates.progress !== undefined) {
    if (!isValidProgress(updates.progress)) {
      throw new Error(`Invalid progress value: ${updates.progress}. Must be between 0 and 100.`);
    }
  }

  const recent = getRecentDocuments();
  const index = recent.findIndex((d) => d.id === id);

  if (index !== -1) {
    recent[index] = {
      ...recent[index],
      ...updates,
      lastModified: Date.now(),
    };

    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
    } catch (error) {
      console.error('Failed to update document:', error);
    }
  }
}

export function removeRecentDocument(id: string) {
  if (typeof window === 'undefined') return;

  const recent = getRecentDocuments();
  const filtered = recent.filter((d) => d.id !== id);

  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to remove document:', error);
  }
}

export function clearRecentDocuments() {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(RECENT_KEY);
  } catch (error) {
    console.error('Failed to clear recent documents:', error);
  }
}

export function getRecentDocument(id: string): RecentDocument | null {
  const recent = getRecentDocuments();
  return recent.find((d) => d.id === id) || null;
}

// Helper to format timestamp for display
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 7) {
    return date.toLocaleDateString();
  } else if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else {
    return 'Just now';
  }
}

// ============================================================================
// Statistics Types
// ============================================================================

/**
 * Statistics about recent documents
 */
export interface RecentDocumentsStats {
  readonly total: number;
  readonly completed: number;
  readonly inProgress: number;
  readonly notStarted: number;
  readonly averageProgress: number;
}

// Get statistics about recent documents
export function getRecentDocumentsStats(): RecentDocumentsStats {
  const recent = getRecentDocuments();

  return {
    total: recent.length,
    completed: recent.filter((d) => d.progress === 100).length,
    inProgress: recent.filter((d) => d.progress > 0 && d.progress < 100).length,
    notStarted: recent.filter((d) => d.progress === 0).length,
    averageProgress:
      recent.length > 0 ? recent.reduce((sum, d) => sum + d.progress, 0) / recent.length : 0,
  };
}
