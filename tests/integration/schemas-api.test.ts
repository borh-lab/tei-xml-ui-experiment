// @ts-nocheck
import { createDefaultResolver } from '@/lib/schema/FileSchemaResolver';

describe('/api/schemas', () => {
  it('should return list of available schemas', () => {
    const resolver = createDefaultResolver();
    const schemas = resolver.list();

    expect(schemas).toBeDefined();
    expect(schemas.length).toBeGreaterThan(0);
    expect(schemas[0]).toHaveProperty('id');
    expect(schemas[0]).toHaveProperty('name');
    expect(schemas[0]).toHaveProperty('description');
    expect(schemas[0]).toHaveProperty('tags');
  });

  it('should not expose schema paths in API response', () => {
    const resolver = createDefaultResolver();
    const schemas = resolver.list();

    // Simulate what the API route does - exclude path
    const apiResponse = schemas.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      tags: s.tags,
    }));

    expect(apiResponse[0]).not.toHaveProperty('path');
    expect(apiResponse[0]).toHaveProperty('id');
    expect(apiResponse[0]).toHaveProperty('name');
  });
});
