import {
  getRecentDocuments,
  addRecentDocument,
  updateProgress,
  updateDocument,
  removeRecentDocument,
  clearRecentDocuments,
  getRecentDocument,
  formatTimestamp,
  getRecentDocumentsStats,
  RecentDocument,
} from '@/lib/storage/recentDocuments';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('Recent Documents Storage', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  const mockDoc: RecentDocument = {
    id: 'doc1',
    title: 'Test Document',
    timestamp: Date.now(),
    progress: 50,
  };

  describe('getRecentDocuments', () => {
    it('should return empty array when no documents stored', () => {
      const result = getRecentDocuments();
      expect(result).toEqual([]);
    });

    it('should return stored documents', () => {
      const docs = [mockDoc];
      localStorage.setItem('tei-recent-docs', JSON.stringify(docs));

      const result = getRecentDocuments();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('doc1');
    });

    it('should sort documents by timestamp descending', () => {
      const oldDoc = { ...mockDoc, id: 'doc1', timestamp: 1000 };
      const newDoc = { ...mockDoc, id: 'doc2', timestamp: 2000 };
      const midDoc = { ...mockDoc, id: 'doc3', timestamp: 1500 };

      localStorage.setItem('tei-recent-docs', JSON.stringify([oldDoc, newDoc, midDoc]));

      const result = getRecentDocuments();
      expect(result[0].id).toBe('doc2');
      expect(result[1].id).toBe('doc3');
      expect(result[2].id).toBe('doc1');
    });

    it('should filter invalid documents', () => {
      const invalidDocs = [
        { id: '', title: 'Invalid', timestamp: Date.now(), progress: 0 },
        { id: 'valid', title: '', timestamp: Date.now(), progress: 0 },
      ];

      localStorage.setItem('tei-recent-docs', JSON.stringify(invalidDocs));

      const result = getRecentDocuments();
      expect(result).toEqual([]);
    });

    it('should handle corrupted data gracefully', () => {
      // Suppress console.error for this test since we're testing error handling
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      localStorage.setItem('tei-recent-docs', 'invalid json');

      const result = getRecentDocuments();
      expect(result).toEqual([]);

      consoleSpy.mockRestore();
    });
  });

  describe('addRecentDocument', () => {
    it('should add document to storage', () => {
      addRecentDocument(mockDoc);

      const result = getRecentDocuments();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('doc1');
    });

    it('should update timestamp if not provided', () => {
      const docWithoutTimestamp = { ...mockDoc, timestamp: 0 };
      const beforeTime = Date.now();

      addRecentDocument(docWithoutTimestamp);

      const result = getRecentDocuments();
      expect(result[0].timestamp).toBeGreaterThanOrEqual(beforeTime);
    });

    it('should move existing document to front', () => {
      const oldDoc = { ...mockDoc, id: 'doc1', timestamp: 1000 };
      const newDoc = { ...mockDoc, id: 'doc2', timestamp: 2000 };

      addRecentDocument(oldDoc);
      addRecentDocument(newDoc);

      // Update doc1 with new timestamp
      addRecentDocument({ ...oldDoc, timestamp: 3000 });

      const result = getRecentDocuments();
      expect(result[0].id).toBe('doc1');
      expect(result[1].id).toBe('doc2');
    });

    it('should limit to MAX_RECENT documents', () => {
      for (let i = 0; i < 15; i++) {
        addRecentDocument({
          ...mockDoc,
          id: `doc${i}`,
          timestamp: Date.now() + i,
        });
      }

      const result = getRecentDocuments();
      expect(result).toHaveLength(10);
    });
  });

  describe('updateProgress', () => {
    it('should update document progress', () => {
      addRecentDocument(mockDoc);
      updateProgress('doc1', 75);

      const result = getRecentDocuments();
      expect(result[0].progress).toBe(75);
    });

    it('should update lastModified timestamp', () => {
      addRecentDocument(mockDoc);
      const beforeTime = Date.now();

      updateProgress('doc1', 75);

      const result = getRecentDocuments();
      expect(result[0].lastModified).toBeGreaterThanOrEqual(beforeTime);
    });

    it('should not update non-existent document', () => {
      addRecentDocument(mockDoc);
      updateProgress('nonexistent', 75);

      const result = getRecentDocuments();
      expect(result).toHaveLength(1);
    });
  });

  describe('updateDocument', () => {
    it('should update document fields', () => {
      addRecentDocument(mockDoc);
      updateDocument('doc1', { title: 'Updated Title' });

      const result = getRecentDocuments();
      expect(result[0].title).toBe('Updated Title');
    });

    it('should preserve existing fields', () => {
      addRecentDocument(mockDoc);
      updateDocument('doc1', { title: 'Updated Title' });

      const result = getRecentDocuments();
      expect(result[0].progress).toBe(50);
    });

    it('should update lastModified timestamp', () => {
      addRecentDocument(mockDoc);
      const beforeTime = Date.now();

      updateDocument('doc1', { title: 'Updated' });

      const result = getRecentDocuments();
      expect(result[0].lastModified).toBeGreaterThanOrEqual(beforeTime);
    });
  });

  describe('removeRecentDocument', () => {
    it('should remove document from storage', () => {
      addRecentDocument(mockDoc);
      removeRecentDocument('doc1');

      const result = getRecentDocuments();
      expect(result).toHaveLength(0);
    });

    it('should handle non-existent document', () => {
      addRecentDocument(mockDoc);
      removeRecentDocument('nonexistent');

      const result = getRecentDocuments();
      expect(result).toHaveLength(1);
    });
  });

  describe('clearRecentDocuments', () => {
    it('should clear all documents', () => {
      addRecentDocument(mockDoc);
      addRecentDocument({ ...mockDoc, id: 'doc2' });

      clearRecentDocuments();

      const result = getRecentDocuments();
      expect(result).toHaveLength(0);
    });
  });

  describe('getRecentDocument', () => {
    it('should return document by id', () => {
      addRecentDocument(mockDoc);
      const result = getRecentDocument('doc1');

      expect(result).toEqual(mockDoc);
    });

    it('should return null for non-existent document', () => {
      addRecentDocument(mockDoc);
      const result = getRecentDocument('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('formatTimestamp', () => {
    it('should format recent time as "Just now"', () => {
      const now = Date.now();
      const result = formatTimestamp(now);
      expect(result).toBe('Just now');
    });

    it('should format minutes ago', () => {
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      const result = formatTimestamp(fiveMinutesAgo);
      expect(result).toBe('5 minutes ago');
    });

    it('should format hours ago', () => {
      const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
      const result = formatTimestamp(twoHoursAgo);
      expect(result).toBe('2 hours ago');
    });

    it('should format days ago', () => {
      const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
      const result = formatTimestamp(threeDaysAgo);
      expect(result).toBe('3 days ago');
    });

    it('should format old dates as locale date string', () => {
      const oldDate = Date.now() - 10 * 24 * 60 * 60 * 1000;
      const result = formatTimestamp(oldDate);
      expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
    });
  });

  describe('getRecentDocumentsStats', () => {
    it('should calculate statistics for empty list', () => {
      const stats = getRecentDocumentsStats();

      expect(stats.total).toBe(0);
      expect(stats.completed).toBe(0);
      expect(stats.inProgress).toBe(0);
      expect(stats.notStarted).toBe(0);
      expect(stats.averageProgress).toBe(0);
    });

    it('should calculate statistics correctly', () => {
      addRecentDocument({ ...mockDoc, id: 'doc1', progress: 100 });
      addRecentDocument({ ...mockDoc, id: 'doc2', progress: 50 });
      addRecentDocument({ ...mockDoc, id: 'doc3', progress: 0 });
      addRecentDocument({ ...mockDoc, id: 'doc4', progress: 25 });

      const stats = getRecentDocumentsStats();

      expect(stats.total).toBe(4);
      expect(stats.completed).toBe(1);
      expect(stats.inProgress).toBe(2); // doc2 (50%) and doc4 (25%)
      expect(stats.notStarted).toBe(1);
      expect(stats.averageProgress).toBe(43.75);
    });
  });
});
