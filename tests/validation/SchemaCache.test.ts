import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { SchemaCache } from '@/lib/validation/SchemaCache';

describe('SchemaCache', () => {
  let mockFileReader: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFileReader = jest.fn();
  });

  it('should parse and cache schema file', () => {
    const mockSchema = '<grammar xmlns="http://relaxng.org/ns/structure/1.0"></grammar>';
    mockFileReader.mockReturnValue(mockSchema);

    const cache = new SchemaCache({ maxSize: 10 }, mockFileReader);

    const result1 = cache.get('/test/schema.rng');
    const result2 = cache.get('/test/schema.rng');

    expect(mockFileReader).toHaveBeenCalledTimes(1); // Only read once
    expect(result1).toBeDefined();
    expect(result1).toBe(result2); // Same cached object
  });

  it('should cache multiple different schemas', () => {
    const mockSchema1 = '<grammar xmlns="http://relaxng.org/ns/structure/1.0"><start/></grammar>';
    const mockSchema2 = '<grammar xmlns="http://relaxng.org/ns/structure/1.0"><div/></grammar>';

    mockFileReader.mockImplementation((path: string) => {
      if (path === '/test/schema1.rng') return mockSchema1;
      if (path === '/test/schema2.rng') return mockSchema2;
      return '';
    });

    const cache = new SchemaCache({ maxSize: 10 }, mockFileReader);

    const result1 = cache.get('/test/schema1.rng');
    const result2 = cache.get('/test/schema2.rng');
    const result3 = cache.get('/test/schema1.rng'); // Cache hit

    expect(mockFileReader).toHaveBeenCalledTimes(2); // Each schema read once
    expect(result1).toBeDefined();
    expect(result2).toBeDefined();
    expect(result1).toBe(result3); // Same object from cache
  });

  it('should return cache stats', () => {
    const mockSchema = '<grammar xmlns="http://relaxng.org/ns/structure/1.0"></grammar>';
    mockFileReader.mockReturnValue(mockSchema);

    const cache = new SchemaCache({ maxSize: 10 }, mockFileReader);

    cache.get('/test/schema1.rng');
    cache.get('/test/schema2.rng');
    cache.get('/test/schema1.rng'); // Cache hit

    const stats = cache.getStats();

    expect(stats.size).toBe(2);
    expect(stats).toHaveProperty('size');
  });

  it('should clear cache', () => {
    const mockSchema = '<grammar xmlns="http://relaxng.org/ns/structure/1.0"></grammar>';
    mockFileReader.mockReturnValue(mockSchema);

    const cache = new SchemaCache({ maxSize: 10 }, mockFileReader);

    cache.get('/test/schema.rng');
    expect(cache.getStats().size).toBe(1);

    cache.clear();
    expect(cache.getStats().size).toBe(0);

    cache.get('/test/schema.rng');
    expect(cache.getStats().size).toBe(1);
    expect(mockFileReader).toHaveBeenCalledTimes(2); // Read again after clear
  });
});
