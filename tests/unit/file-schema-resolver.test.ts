import { FileSchemaResolver, createDefaultResolver } from '@/lib/schema/FileSchemaResolver';
import { SchemaInfo } from '@/lib/schema/SchemaResolver';

describe('FileSchemaResolver', () => {
  const mockSchemas: Record<string, SchemaInfo> = {
    'test-schema': {
      id: 'test-schema',
      name: 'Test Schema',
      description: 'A test schema',
      path: '/schemas/test.rng',
      tags: ['test'],
    },
  };

  it('should resolve known schema ID to path', () => {
    const resolver = new FileSchemaResolver(mockSchemas, new Set(['test-schema']));
    expect(resolver.resolve('test-schema')).toBe('/schemas/test.rng');
  });

  it('should return null for unknown schema ID', () => {
    const resolver = new FileSchemaResolver(mockSchemas, new Set(['test-schema']));
    expect(resolver.resolve('unknown')).toBeNull();
  });

  it('should return null for schema ID not in allow-list', () => {
    const resolver = new FileSchemaResolver(mockSchemas, new Set(['other-schema']));
    expect(resolver.resolve('test-schema')).toBeNull();
  });

  it('should list all schemas', () => {
    const resolver = new FileSchemaResolver(mockSchemas, new Set(['test-schema']));
    const schemas = resolver.list();
    expect(schemas).toHaveLength(1);
    expect(schemas[0].id).toBe('test-schema');
  });

  it('should check if schema exists', () => {
    const resolver = new FileSchemaResolver(mockSchemas, new Set(['test-schema']));
    expect(resolver.has('test-schema')).toBe(true);
    expect(resolver.has('unknown')).toBe(false);
  });

  it('should get schema info', () => {
    const resolver = new FileSchemaResolver(mockSchemas, new Set(['test-schema']));
    const info = resolver.getSchemaInfo('test-schema');
    expect(info).toEqual(mockSchemas['test-schema']);
  });
});

describe('createDefaultResolver', () => {
  it('should create resolver with standard schemas', () => {
    const resolver = createDefaultResolver();
    expect(resolver.has('tei-minimal')).toBe(true);
    expect(resolver.has('tei-all')).toBe(true);
    expect(resolver.has('tei-novel')).toBe(true);
  });

  it('should not allow arbitrary schema IDs', () => {
    const resolver = createDefaultResolver();
    expect(resolver.has('malicious')).toBe(false);
    expect(resolver.resolve('../../../etc/passwd')).toBeNull();
  });
});
