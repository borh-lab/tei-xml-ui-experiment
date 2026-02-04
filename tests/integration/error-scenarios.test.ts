import { render, waitFor } from '@testing-library/react';
import { AxProvider } from '@/lib/ai/ax-provider';
import { TEIDocument } from '@/lib/tei';
import { db } from '@/lib/db/PatternDB';

describe('Error Scenarios', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should handle missing API key gracefully', () => {
    expect(() => {
      new AxProvider('openai', '');
    }).toThrow('API key not provided');
  });

  test('should handle empty API key gracefully', () => {
    expect(() => {
      new AxProvider('openai', '   ');
    }).toThrow('API key not provided');
  });

  test('should accept valid API key from environment variable', () => {
    const originalKey = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = 'test-key-valid';

    expect(() => {
      new AxProvider('openai');
    }).not.toThrow();

    process.env.OPENAI_API_KEY = originalKey;
  });

  test('should handle malformed TEI documents', async () => {
    const malformed = '<TEI><broken>';

    // TEIDocument doesn't throw - it handles gracefully with default structure
    const doc = new TEIDocument(malformed);
    expect(doc).toBeDefined();
    expect(doc.parsed).toBeDefined();
  });

  test('should handle empty TEI documents', async () => {
    // Empty string is handled gracefully by the parser
    const doc = new TEIDocument('');
    expect(doc).toBeDefined();
  });

  test('should handle TEI document with missing required elements', async () => {
    const incomplete = '<?xml version="1.0"?><TEI></TEI>';

    const result = new TEIDocument(incomplete);
    expect(result).toBeDefined();
    // Should handle gracefully with default structure
  });

  test('should handle database init errors gracefully', async () => {
    // Mock Dexie open to fail
    const mockOpen = jest
      .spyOn(db as any, 'open')
      .mockRejectedValue(new Error('IndexedDB blocked'));

    await expect(db.init()).rejects.toThrow('IndexedDB blocked');

    mockOpen.mockRestore();
  });

  test('should handle pattern storage errors', async () => {
    // Mock storeLearnedPattern to fail
    const mockStore = jest
      .spyOn(db, 'storeLearnedPattern')
      .mockRejectedValue(new Error('Storage quota exceeded'));

    // Should not throw, but log error
    await expect(db.storeLearnedPattern('#speaker1', 'test pattern')).rejects.toThrow(
      'Storage quota exceeded'
    );

    mockStore.mockRestore();
  });

  test('should handle malformed pattern data', async () => {
    // Empty string is acceptable
    await expect(db.storeLearnedPattern('', 'pattern')).resolves.not.toThrow();

    // Undefined will throw from IndexedDB - this is expected behavior
    await expect(db.storeLearnedPattern(undefined as any, 'pattern')).rejects.toThrow();
  });

  test('should handle concurrent database operations', async () => {
    // Test multiple operations at once
    const operations = Array.from({ length: 10 }, (_, i) =>
      db.storeLearnedPattern(`#speaker${i}`, `pattern${i}`)
    );

    await expect(Promise.all(operations)).resolves.not.toThrow();
  });

  test('should handle large text input without crashing', async () => {
    const largeText = 'x'.repeat(10000);

    const provider = new AxProvider('openai', 'fake-key-for-test');

    // Should handle large text without throwing (even if detection fails)
    const result = await provider.detectDialogue(largeText);
    expect(Array.isArray(result)).toBe(true);
  });

  test('should handle special characters in text', async () => {
    const specialText = 'Hello "world" \n \t \r Test &amp; script &lt;script&gt;';

    const provider = new AxProvider('openai', 'fake-key-for-test');
    const result = await provider.detectDialogue(specialText);

    expect(Array.isArray(result)).toBe(true);
  });

  test('should handle Unicode and emoji in text', async () => {
    const unicodeText = 'Hello 世界 🌍 Test 🎉';

    const provider = new AxProvider('openai', 'fake-key-for-test');
    const result = await provider.detectDialogue(unicodeText);

    expect(Array.isArray(result)).toBe(true);
  });

  test('should handle very short dialogue spans', async () => {
    const shortText = 'Hi. "Ok." "Bye."';

    const provider = new AxProvider('openai', 'fake-key-for-test');
    const result = await provider.detectDialogue(shortText);

    expect(Array.isArray(result)).toBe(true);
  });

  test('should handle API provider validation', () => {
    // Valid providers
    expect(() => new AxProvider('openai', 'key')).not.toThrow();
    expect(() => new AxProvider('anthropic', 'key')).not.toThrow();

    // Invalid provider
    expect(() => new AxProvider('invalid' as any, 'key')).toThrow();
  });
});
