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

export function getRecentDocuments(): RecentDocument[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(RECENT_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);

    // Validate and filter old format
    if (!Array.isArray(parsed)) return [];

    // Sort by timestamp descending
    return parsed
      .sort((a: RecentDocument, b: RecentDocument) => b.timestamp - a.timestamp)
      .filter((doc: RecentDocument) => {
        // Only return documents with valid id and title
        return doc.id && doc.title && typeof doc.timestamp === 'number';
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

export function updateDocument(id: string, updates: Partial<RecentDocument>) {
  if (typeof window === 'undefined') return;

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

// Get statistics about recent documents
export function getRecentDocumentsStats() {
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
