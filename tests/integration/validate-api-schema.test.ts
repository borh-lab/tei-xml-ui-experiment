// @ts-nocheck
import { createDefaultResolver } from '@/lib/schema/FileSchemaResolver';

// Mock ValidationService
jest.mock('@/lib/validation/ValidationService');

describe('/api/validate with schema selection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should use default schema when none provided', async () => {
    const resolver = createDefaultResolver();
    const schemaPath = resolver.resolve('tei-minimal');

    expect(schemaPath).toBe('public/schemas/tei-minimal.rng');
  });

  it('should reject unknown schema ID', () => {
    const resolver = createDefaultResolver();

    expect(resolver.has('unknown-schema')).toBe(false);
    expect(resolver.resolve('unknown-schema')).toBeNull();
  });

  it('should accept valid schema ID', () => {
    const resolver = createDefaultResolver();

    expect(resolver.has('tei-all')).toBe(true);
    expect(resolver.resolve('tei-all')).toBe('public/schemas/tei-all.rng');

    expect(resolver.has('tei-minimal')).toBe(true);
    expect(resolver.resolve('tei-minimal')).toBe('public/schemas/tei-minimal.rng');

    expect(resolver.has('tei-novel')).toBe(true);
    expect(resolver.resolve('tei-novel')).toBe('public/schemas/tei-novel.rng');
  });

  it('should list available schemas', () => {
    const resolver = createDefaultResolver();
    const schemas = resolver.list();

    expect(schemas).toHaveLength(3);
    expect(schemas.map((s) => s.id)).toEqual(['tei-minimal', 'tei-all', 'tei-novel']);
  });
});
